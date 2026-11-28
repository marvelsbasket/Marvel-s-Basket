import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PaymentReconciliationResponse, PaymentStatusType } from '@marvels-basket/shared';
import { PrismaService } from '../../../database/prisma.service';
import { RazorpayService } from '../gateways/razorpay/razorpay.service';
import { PaymentsService } from '../payments.service';
import { CAPTURED_PAYMENT_STATUSES, paiseToRupees } from '../payment-state-machine';

@Injectable()
export class PaymentReconciliationService {
  private readonly logger = new Logger(PaymentReconciliationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly razorpayService: RazorpayService,
    private readonly paymentsService: PaymentsService,
  ) {}

  /**
   * Reconciles an internal Payment against live Razorpay API state.
   * Never overwrites a newer valid state with an older response.
   */
  async reconcilePayment(
    paymentId: string,
    actorId?: string,
    source = 'MANUAL_ADMIN',
  ): Promise<PaymentReconciliationResponse> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found.');
    }

    if (payment.paymentMethod !== PaymentMethod.RAZORPAY || !payment.providerOrderId) {
      return {
        paymentId: payment.id,
        orderId: payment.orderId,
        orderNumber: payment.order.orderNumber,
        previousStatus: payment.status as PaymentStatusType,
        newStatus: payment.status as PaymentStatusType,
        gatewayStatus: payment.gatewayStatus,
        expectedAmount: Number(payment.amount),
        gatewayAmount: null,
        discrepancyDetected: false,
        discrepancyReason: null,
        resolutionAction: 'NO_GATEWAY_ORDER_TO_RECONCILE',
        reconciledAt: new Date().toISOString(),
      };
    }

    const rpPayments = await this.razorpayService.fetchOrderPayments(payment.providerOrderId);
    const captured = rpPayments.find((p) => p.status === 'captured');
    const authorized = rpPayments.find((p) => p.status === 'authorized');
    const failed = rpPayments.find((p) => p.status === 'failed');
    const bestMatch = captured || authorized || failed || rpPayments[0] || null;

    const previousStatus = payment.status;
    let newStatus = payment.status;
    let discrepancyDetected = false;
    let discrepancyReason: string | null = null;
    let resolutionAction: string | null = 'IN_SYNC';
    const gatewayAmount = bestMatch ? paiseToRupees(bestMatch.amount) : null;

    if (bestMatch) {
      if (bestMatch.status === 'captured' && !CAPTURED_PAYMENT_STATUSES.has(payment.status)) {
        discrepancyDetected = true;
        discrepancyReason = `Gateway shows captured (${bestMatch.id}) while internal status was ${payment.status}.`;
        const confirmed = await this.paymentsService.confirmCapturedPayment({
          paymentId: payment.id,
          providerPaymentId: bestMatch.id,
          amountPaise: bestMatch.amount,
          currency: bestMatch.currency,
          method: bestMatch.method || 'razorpay',
          gatewayStatus: bestMatch.status,
          source: `RECONCILIATION:${source}`,
          rawPayload: bestMatch as unknown as Record<string, unknown>,
        });
        newStatus = confirmed.status as PaymentStatus;
        resolutionAction = 'SYNCED_TO_CAPTURED';
      } else if (
        bestMatch.status === 'authorized' &&
        (payment.status === PaymentStatus.CREATED || payment.status === PaymentStatus.PENDING)
      ) {
        await this.paymentsService.markPaymentAuthorized({
          paymentId: payment.id,
          providerPaymentId: bestMatch.id,
          method: bestMatch.method || 'razorpay',
          gatewayStatus: bestMatch.status,
          source: `RECONCILIATION:${source}`,
          rawPayload: bestMatch as unknown as Record<string, unknown>,
        });
        newStatus = PaymentStatus.AUTHORIZED;
        resolutionAction = 'SYNCED_TO_AUTHORIZED';
      } else if (
        bestMatch.status === 'failed' &&
        !CAPTURED_PAYMENT_STATUSES.has(payment.status) &&
        payment.status !== PaymentStatus.FAILED
      ) {
        await this.paymentsService.markPaymentFailed({
          paymentId: payment.id,
          providerPaymentId: bestMatch.id,
          gatewayStatus: bestMatch.status,
          failureCode: bestMatch.error_code,
          failureReason: bestMatch.error_description || bestMatch.error_reason,
          source: `RECONCILIATION:${source}`,
          rawPayload: bestMatch as unknown as Record<string, unknown>,
        });
        newStatus = PaymentStatus.FAILED;
        resolutionAction = 'SYNCED_TO_FAILED';
      }
    }

    // Check order vs payment sync invariant
    if (CAPTURED_PAYMENT_STATUSES.has(newStatus) && payment.order.paymentStatus === PaymentStatus.PENDING) {
      discrepancyDetected = true;
      discrepancyReason = 'Payment is captured/refunded but Order.paymentStatus is still PENDING.';
    }

    const log = await this.prisma.paymentReconciliationLog.create({
      data: {
        paymentId: payment.id,
        orderId: payment.orderId,
        actorId: actorId || null,
        source,
        previousStatus,
        newStatus,
        gatewayStatus: bestMatch?.status || payment.gatewayStatus,
        expectedAmount: payment.amount,
        gatewayAmount: gatewayAmount !== null ? new Decimal(gatewayAmount) : null,
        discrepancyDetected,
        discrepancyReason,
        resolutionAction,
      },
    });

    this.logger.log(
      `Reconciled payment ${payment.id} (${previousStatus} -> ${newStatus}, discrepancy=${discrepancyDetected})`,
    );

    return {
      paymentId: payment.id,
      orderId: payment.orderId,
      orderNumber: payment.order.orderNumber,
      previousStatus: previousStatus as PaymentStatusType,
      newStatus: newStatus as PaymentStatusType,
      gatewayStatus: bestMatch?.status || payment.gatewayStatus,
      expectedAmount: Number(payment.amount),
      gatewayAmount,
      discrepancyDetected,
      discrepancyReason,
      resolutionAction,
      reconciledAt: log.createdAt.toISOString(),
    };
  }
}
