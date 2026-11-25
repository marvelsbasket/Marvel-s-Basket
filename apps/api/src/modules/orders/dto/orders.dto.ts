import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import {
  OrderComplaintCategory,
  OrderComplaintStatus,
  OrderStatus,
  PaymentMethod,
} from '@prisma/client';

export class CreateOrderDto {
  @ApiProperty({ description: 'Active CheckoutSession UUID from Phase 11' })
  @IsUUID()
  checkoutSessionId!: string;

  @ApiPropertyOptional({ enum: PaymentMethod, default: PaymentMethod.COD })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod = PaymentMethod.COD;

  @ApiPropertyOptional({ description: 'Idempotency key to prevent duplicate order creation' })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @ApiPropertyOptional({ description: 'Verified payment reference ID (required for RAZORPAY)' })
  @IsOptional()
  @IsString()
  paymentReferenceId?: string;

  @ApiPropertyOptional({ description: 'Customer delivery instructions' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class QueryOrdersDto {
  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ description: 'Search by order number or store/customer name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by seller ID (Admin only)' })
  @IsOptional()
  @IsUUID()
  sellerId?: string;

  @ApiPropertyOptional({ description: 'Filter by customer ID (Admin only)' })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Filter from ISO date' })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter to ISO date' })
  @IsOptional()
  @IsString()
  dateTo?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class CancelOrderDto {
  @ApiProperty({ description: 'Reason for cancelling the order' })
  @IsString()
  @MinLength(3)
  reason!: string;
}

export class RejectOrderDto {
  @ApiProperty({ description: 'Reason for rejecting the order' })
  @IsString()
  @MinLength(3)
  reason!: string;
}

export class AdminInterveneOrderDto {
  @ApiProperty({ enum: OrderStatus })
  @IsEnum(OrderStatus)
  targetStatus!: OrderStatus;

  @ApiProperty({ description: 'Mandatory audit reason for admin intervention' })
  @IsString()
  @MinLength(3)
  reason!: string;
}

export class CreateComplaintDto {
  @ApiPropertyOptional({ description: 'Affected OrderItem UUID (optional for order-level issues)' })
  @IsOptional()
  @IsUUID()
  orderItemId?: string;

  @ApiProperty({ enum: OrderComplaintCategory })
  @IsEnum(OrderComplaintCategory)
  category!: OrderComplaintCategory;

  @ApiProperty({ description: 'Detailed description of the issue' })
  @IsString()
  @MinLength(10)
  description!: string;

  @ApiPropertyOptional({ description: 'Whether the affected item is perishable' })
  @IsOptional()
  @IsBoolean()
  isPerishable?: boolean;
}

export class QueryComplaintsDto {
  @ApiPropertyOptional({ enum: OrderComplaintStatus })
  @IsOptional()
  @IsEnum(OrderComplaintStatus)
  status?: OrderComplaintStatus;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class ReviewComplaintDto {
  @ApiProperty({ enum: OrderComplaintStatus })
  @IsEnum(OrderComplaintStatus)
  status!: OrderComplaintStatus;

  @ApiPropertyOptional({ description: 'Admin/support review note' })
  @IsOptional()
  @IsString()
  adminNote?: string;
}
