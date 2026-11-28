import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PaymentMethod, PaymentStatus, Prisma, RefundStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PaginatedRefundsResponse, RefundSummaryItem } from '@marvels-basket/shared';
import * as crypto from 'crypto';
import { PrismaService } from '../../../database/prisma.service';
import { RazorpayService } from '../gateways/razorpay/razorpay.service';
import { RazorpayRefundEntity } from '../gateways/razorpay/razorpay.types';
import {
  CAPTURED_PAYMENT_STATUSES,
  paiseToRupees,
  rupeesToPaise,
} from '../payment-state-machine';
import { CreateRefundDto, QueryRefundsDto } from '../dto/payments.dto';
import { mapRefundSummary } from '../payments.mapper';

@Injectable()
export class RefundsService {
  private readonly logger = new Logger(RefundsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly razorpayService: RazorpayService,
  ) {}

  private generateRefundNumber(): string {
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randPart = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `RF-${datePart}-${randPart}`;
  }

  private mapGatewayRefundStatus(status: string): RefundStatus {
    switch (status) {
      case 'processed':
        return RefundStatus.PROCESSED;
      case 'failed':
        return RefundStatus.FAILED;
      case 'pending':
      default:
        return RefundStatus.PROCESSING;
    }
  }

  /**
   * Initiates a full or partial refund for a captured Razorpay payment.
   * Uses X-Refund-Idempotency and database locking/constraints to prevent
   * concurrent duplicate refunds or exceeding the captured amount.
   */
  async createRefund(
    adminUserId: string,
    paymentId: string,
    dto: CreateRefundDto,
  ): Promise<RefundSummaryItem> {
    const idempotencyKey =
      dto.idempotencyKey?.trim() || `rf_${crypto.randomUUID().replace(/-/g, '')}`;

    if (idempotencyKey.length < 10 || !/^[a-zA-Z0-9_-]+$/.test(idempotencyKey)) {
      throw new BadRequestException({
        code: 'INVALID_REFUND_IDEMPOTENCY_KEY',
        message:
          'Refund idempotency key must be at least 10 characters and contain only letters, numbers, hyphens, and underscores.',
      });
    }

    // 1. Idempotency check
    const existingByKey = await this.prisma.refund.findUnique({
      where: { idempotencyKey },
      include: { order: { select: { orderNumber: true } } },
    });
    if (existingByKey) {
      return mapRefundSummary(existingByKey);
    }

    // 2. Validate payment eligibility & remaining refundable balance atomically
    const { refund, providerPaymentId, amountPaise } = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: {
          order: true,
          refunds: {
            where: { status: { in: [RefundStatus.PENDING, RefundStatus.PROCESSING, RefundStatus.PROCESSED, RefundStatus.COMPLETED] } },
          },
        },
      });

      if (!payment) {
        throw new NotFoundException('Payment not found.');
      }

      if (payment.paymentMethod !== PaymentMethod.RAZORPAY || !payment.providerPaymentId) {
        throw new BadRequestException({
          code: 'PAYMENT_NOT_REFUNDABLE_VIA_GATEWAY',
          message: 'Only captured Razorpay payments with a valid gateway payment ID can be refunded.',
        });
      }

      if (!CAPTURED_PAYMENT_STATUSES.has(payment.status)) {
        throw new ConflictException({
          code: 'PAYMENT_NOT_CAPTURED',
          message: `Cannot refund a payment in ${payment.status} status.`,
        });
      }

      const capturedPaise = rupeesToPaise(
        Number(payment.capturedAmount) > 0 ? Number(payment.capturedAmount) : Number(payment.amount),
      );
      const committedRefundPaise = payment.refunds.reduce(
        (sum, r) => sum + Math.round(Number(r.amount) * 100),
        0,
      );
      const remainingPaise = capturedPaise - committedRefundPaise;

      if (remainingPaise <= 0) {
        throw new ConflictException({
          code: 'NO_REFUNDABLE_BALANCE',
          message: 'This payment has already been fully refunded or has pending refunds covering the full amount.',
        });
      }

      const requestedPaise =
        dto.amount !== undefined ? rupeesToPaise(dto.amount) : remainingPaise;

      if (requestedPaise > remainingPaise) {
        throw new BadRequestException({
          code: 'REFUND_EXCEEDS_BALANCE',
          message: `Requested refund (₹${paiseToRupees(requestedPaise).toFixed(2)}) exceeds remaining refundable balance (₹${paiseToRupees(remainingPaise).toFixed(2)}).`,
        });
      }

      const createdRefund = await tx.refund.create({
        data: {
          orderId: payment.orderId,
          paymentId: payment.id,
          refundNumber: this.generateRefundNumber(),
          idempotencyKey,
          amount: new Decimal(paiseToRupees(requestedPaise)),
          reason: dto.reason.trim(),
          status: RefundStatus.PENDING,
          speedRequested: dto.speed || 'normal',
          requestedBy: adminUserId,
          approvedBy: adminUserId,
        },
        include: { order: { select: { orderNumber: true } } },
      });

      return {
        refund: createdRefund,
        providerPaymentId: payment.providerPaymentId,
        amountPaise: requestedPaise,
      };
    });

    // 3. Call Razorpay Refund API outside DB transaction with X-Refund-Idempotency
    let rpRefund: RazorpayRefundEntity;
    try {
      rpRefund = await this.razorpayService.createRefund(
        providerPaymentId,
        {
          amount: amountPaise,
          speed: dto.speed || 'normal',
          receipt: refund.refundNumber,
          notes: {
            internalRefundId: refund.id,
            refundNumber: refund.refundNumber,
            orderId: refund.orderId,
            reason: dto.reason.trim().slice(0, 200),
          },
        },
        idempotencyKey,
      );
    } catch (err) {
      // Mark internal refund FAILED if gateway rejected/failed so balance is freed cleanly
      await this.prisma.refund.update({
        where: { id: refund.id },
        data: {
          status: RefundStatus.FAILED,
          failureReason: (err as Error).message,
        },
      });
      throw err;
    }

    // 4. Sync refund & payment state atomically
    const updated = await this.syncGatewayRefund(rpRefund, 'API_REFUND_CREATE', refund.id);
    return mapRefundSummary(updated);
  }

  /**
   * Synchronizes a Razorpay refund entity with internal Refund, Payment, and Order states.
   * Called both after createRefund and from refund.* webhooks.
   */
  async syncGatewayRefund(
    rpRefund: RazorpayRefundEntity,
    source: string,
    knownRefundId?: string,
  ) {
    const newStatus = this.mapGatewayRefundStatus(rpRefund.status);
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      let refund = knownRefundId
        ? await tx.refund.findUnique({
            where: { id: knownRefundId },
            include: { order: { select: { orderNumber: true } } },
          })
        : await tx.refund.findFirst({
            where: { providerRefundId: rpRefund.id },
            include: { order: { select: { orderNumber: true } } },
          });

      if (!refund && rpRefund.notes?.internalRefundId) {
        refund = await tx.refund.findUnique({
          where: { id: rpRefund.notes.internalRefundId },
          include: { order: { select: { orderNumber: true } } },
        });
      }

      if (!refund) {
        // Unsolicited refund created directly from Razorpay Dashboard -> create record if payment exists
        const payment = await tx.payment.findFirst({
          where: { providerPaymentId: rpRefund.payment_id },
        });
        if (!payment) {
          this.logger.warn(
            `Received refund ${rpRefund.id} for unknown providerPaymentId ${rpRefund.payment_id}`,
          );
          return null;
        }
        refund = await tx.refund.create({
          data: {
            orderId: payment.orderId,
            paymentId: payment.id,
            refundNumber: this.generateRefundNumber(),
            amount: new Decimal(paiseToRupees(rpRefund.amount)),
            reason: 'Dashboard-initiated refund synced via Razorpay webhook',
            status: newStatus,
            providerRefundId: rpRefund.id,
            speedRequested: rpRefund.speed_requested || 'normal',
            speedProcessed: rpRefund.speed_processed || null,
            gatewayStatus: rpRefund.status,
            requestedBy: payment.orderId, // system fallback
            processedAt: newStatus === RefundStatus.PROCESSED ? now : null,
          },
          include: { order: { select: { orderNumber: true } } },
        });
      } else {
        // Do not downgrade PROCESSED/COMPLETED refund
        if (
          refund.status === RefundStatus.PROCESSED ||
          refund.status === RefundStatus.COMPLETED
        ) {
          return refund;
        }

        refund = await tx.refund.update({
          where: { id: refund.id },
          data: {
            providerRefundId: rpRefund.id,
            status: newStatus,
            speedProcessed: rpRefund.speed_processed || refund.speedProcessed,
            gatewayStatus: rpRefund.status,
            processedAt: newStatus === RefundStatus.PROCESSED ? now : refund.processedAt,
          },
          include: { order: { select: { orderNumber: true } } },
        });
      }

      await tx.refundTransaction.create({
        data: {
          refundId: refund.id,
          providerTransactionId: rpRefund.id,
          amount: new Decimal(paiseToRupees(rpRefund.amount)),
          status: `${source}:${rpRefund.status}`,
          providerPayload: rpRefund as unknown as Prisma.InputJsonValue,
        },
      });

      // Recompute total processed refunds on this payment
      const payment = await tx.payment.findUniqueOrThrow({
        where: { id: refund.paymentId },
        include: {
          refunds: {
            where: { status: { in: [RefundStatus.PROCESSED, RefundStatus.COMPLETED] } },
          },
        },
      });

      const processedPaise = payment.refunds.reduce(
        (sum, r) => sum + Math.round(Number(r.amount) * 100),
        0,
      );
      const capturedPaise = rupeesToPaise(
        Number(payment.capturedAmount) > 0 ? Number(payment.capturedAmount) : Number(payment.amount),
      );

      let nextPaymentStatus = payment.status;
      if (processedPaise >= capturedPaise && processedPaise > 0) {
        nextPaymentStatus = PaymentStatus.REFUNDED;
      } else if (processedPaise > 0) {
        nextPaymentStatus = PaymentStatus.PARTIALLY_REFUNDED;
      } else if (newStatus === RefundStatus.PROCESSING) {
        nextPaymentStatus = PaymentStatus.REFUND_PENDING;
      }

      if (
        nextPaymentStatus !== payment.status ||
        Number(payment.refundedAmount) !== paiseToRupees(processedPaise)
      ) {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: nextPaymentStatus,
            refundedAmount: new Decimal(paiseToRupees(processedPaise)),
          },
        });

        if (nextPaymentStatus !== payment.status) {
          await tx.paymentStatusHistory.create({
            data: {
              paymentId: payment.id,
              previousStatus: payment.status,
              newStatus: nextPaymentStatus,
              source,
              providerPaymentId: rpRefund.payment_id,
              note: `Refund ${refund.refundNumber} (${rpRefund.id}) -> ${rpRefund.status}`,
            },
          });
        }

        await tx.order.update({
          where: { id: payment.orderId },
          data: { paymentStatus: nextPaymentStatus },
        });
      }

      return refund;
    });
  }

  async listAdminRefunds(query: QueryRefundsDto): Promise<PaginatedRefundsResponse> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.RefundWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.orderId ? { orderId: query.orderId } : {}),
      ...(query.paymentId ? { paymentId: query.paymentId } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.refund.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { order: { select: { orderNumber: true } } },
      }),
      this.prisma.refund.count({ where }),
    ]);

    return {
      items: items.map(mapRefundSummary),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async getAdminRefundDetail(refundId: string): Promise<RefundSummaryItem> {
    const refund = await this.prisma.refund.findUnique({
      where: { id: refundId },
      include: { order: { select: { orderNumber: true } } },
    });
    if (!refund) {
      throw new NotFoundException('Refund not found.');
    }
    return mapRefundSummary(refund);
  }
}
