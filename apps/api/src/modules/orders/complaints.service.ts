import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { OrderComplaintCategory, OrderComplaintStatus, OrderStatus, Prisma } from '@prisma/client';
import { OrderComplaintItem } from '@marvels-basket/shared';
import { PrismaService } from '../../database/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateComplaintDto, QueryComplaintsDto, ReviewComplaintDto } from './dto/orders.dto';

@Injectable()
export class ComplaintsService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly cloudinaryService?: CloudinaryService,
  ) {}

  private mapComplaint(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    c: any,
  ): OrderComplaintItem {
    return {
      id: c.id,
      orderId: c.orderId,
      orderNumber: c.order?.orderNumber,
      orderItemId: c.orderItemId || null,
      customerId: c.customerId,
      category: c.category,
      status: c.status,
      description: c.description,
      evidenceUrls: Array.isArray(c.evidenceUrls) ? c.evidenceUrls : [],
      adminNote: c.adminNote || null,
      reviewedBy: c.reviewedBy || null,
      reviewedAt: c.reviewedAt ? new Date(c.reviewedAt).toISOString() : null,
      resolvedAt: c.resolvedAt ? new Date(c.resolvedAt).toISOString() : null,
      createdAt: new Date(c.createdAt).toISOString(),
    };
  }

  private async getComplaintWindowHours(isPerishable: boolean): Promise<number | null> {
    const key = isPerishable
      ? 'perishable_complaint_window_hours'
      : 'packaged_complaint_window_hours';
    const setting = await this.prisma.platformSetting.findUnique({ where: { key } });
    if (setting && typeof setting.value === 'number' && setting.value > 0) {
      return setting.value;
    }
    // Proposed business baseline: 4h perishable, 48h packaged
    return isPerishable ? 4 : 48;
  }

  async submitComplaint(
    userId: string,
    orderId: string,
    dto: CreateComplaintDto,
    files?: Express.Multer.File[],
  ): Promise<OrderComplaintItem> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, customerId: userId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException({
        code: 'COMPLAINT_NOT_ELIGIBLE',
        message: 'Complaints can only be submitted after an order has been delivered.',
      });
    }

    if (dto.orderItemId) {
      const ownsItem = order.items.some((i) => i.id === dto.orderItemId);
      if (!ownsItem) {
        throw new BadRequestException('Selected item does not belong to this order.');
      }
    }

    const isPerishable =
      dto.isPerishable ?? dto.category === OrderComplaintCategory.SPOILED_PERISHABLE;
    const windowHours = await this.getComplaintWindowHours(isPerishable);
    const deliveredAt = order.deliveredAt || order.updatedAt;
    if (windowHours !== null) {
      const elapsedHours = (Date.now() - new Date(deliveredAt).getTime()) / (1000 * 60 * 60);
      if (elapsedHours > windowHours) {
        throw new BadRequestException({
          code: 'COMPLAINT_WINDOW_EXPIRED',
          message: `The ${windowHours}-hour reporting window for this ${
            isPerishable ? 'perishable' : 'packaged'
          } issue has expired.`,
        });
      }
    }

    const evidenceUrls: string[] = [];
    const evidencePublicIds: string[] = [];
    if (files && files.length > 0 && this.cloudinaryService) {
      for (const file of files.slice(0, 3)) {
        const uploaded = await this.cloudinaryService.uploadPrivateDocument(file, {
          folder: `orders/complaints/${order.id}`,
        });
        evidenceUrls.push(uploaded.secureUrl);
        evidencePublicIds.push(uploaded.publicId);
      }
    }

    const created = await this.prisma.orderComplaint.create({
      data: {
        orderId: order.id,
        orderItemId: dto.orderItemId || null,
        customerId: userId,
        category: dto.category,
        status: OrderComplaintStatus.OPEN,
        description: dto.description.trim(),
        evidenceUrls: evidenceUrls as Prisma.InputJsonValue,
        evidencePublicIds: evidencePublicIds as Prisma.InputJsonValue,
      },
      include: { order: { select: { orderNumber: true } } },
    });

    return this.mapComplaint(created);
  }

  async listOrderComplaints(userId: string, orderId: string): Promise<OrderComplaintItem[]> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, customerId: userId },
    });
    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    const complaints = await this.prisma.orderComplaint.findMany({
      where: { orderId, customerId: userId },
      orderBy: { createdAt: 'desc' },
      include: { order: { select: { orderNumber: true } } },
    });

    return complaints.map((c) => this.mapComplaint(c));
  }

  async adminListComplaints(query: QueryComplaintsDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderComplaintWhereInput = {
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.orderComplaint.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { order: { select: { orderNumber: true } } },
      }),
      this.prisma.orderComplaint.count({ where }),
    ]);

    return {
      items: items.map((c) => this.mapComplaint(c)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async adminGetComplaint(complaintId: string): Promise<OrderComplaintItem> {
    const complaint = await this.prisma.orderComplaint.findUnique({
      where: { id: complaintId },
      include: { order: { select: { orderNumber: true } } },
    });
    if (!complaint) {
      throw new NotFoundException('Complaint not found.');
    }
    return this.mapComplaint(complaint);
  }

  async adminReviewComplaint(
    adminUserId: string,
    complaintId: string,
    dto: ReviewComplaintDto,
  ): Promise<OrderComplaintItem> {
    const complaint = await this.prisma.orderComplaint.findUnique({
      where: { id: complaintId },
    });
    if (!complaint) {
      throw new NotFoundException('Complaint not found.');
    }

    const now = new Date();
    const updated = await this.prisma.orderComplaint.update({
      where: { id: complaintId },
      data: {
        status: dto.status,
        adminNote: dto.adminNote?.trim() || complaint.adminNote,
        reviewedBy: adminUserId,
        reviewedAt: now,
        resolvedAt:
          dto.status === OrderComplaintStatus.RESOLVED ||
          dto.status === OrderComplaintStatus.APPROVED ||
          dto.status === OrderComplaintStatus.REJECTED
            ? now
            : null,
      },
      include: { order: { select: { orderNumber: true } } },
    });

    return this.mapComplaint(updated);
  }
}
