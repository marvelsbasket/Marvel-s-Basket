import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { PaymentStatus, RefundStatus } from '@prisma/client';

export class InitiatePaymentDto {
  @ApiPropertyOptional({ description: 'Active CheckoutSession UUID (for new checkout payment)' })
  @IsOptional()
  @IsUUID()
  checkoutSessionId?: string;

  @ApiPropertyOptional({ description: 'Existing unpaid Order UUID (for payment retry)' })
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiPropertyOptional({ description: 'Idempotency key to prevent duplicate payment initiation' })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @ApiPropertyOptional({ description: 'Optional delivery instructions when creating order from session' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class VerifyPaymentDto {
  @ApiProperty({ description: 'Internal Order UUID' })
  @IsUUID()
  orderId!: string;

  @ApiProperty({ description: 'Razorpay Order ID returned by Checkout' })
  @IsString()
  @MinLength(4)
  razorpayOrderId!: string;

  @ApiProperty({ description: 'Razorpay Payment ID returned by Checkout' })
  @IsString()
  @MinLength(4)
  razorpayPaymentId!: string;

  @ApiProperty({ description: 'Razorpay HMAC-SHA256 signature returned by Checkout' })
  @IsString()
  @MinLength(10)
  razorpaySignature!: string;
}

export class CreateRefundDto {
  @ApiPropertyOptional({
    description: 'Refund amount in INR. Omit for full refund of remaining refundable balance.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount?: number;

  @ApiProperty({ description: 'Reason for issuing the refund' })
  @IsString()
  @MinLength(3)
  reason!: string;

  @ApiPropertyOptional({ enum: ['normal', 'optimum'], default: 'normal' })
  @IsOptional()
  @IsIn(['normal', 'optimum'])
  speed?: 'normal' | 'optimum' = 'normal';

  @ApiPropertyOptional({ description: 'Optional idempotency key for safe refund retries' })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class QueryPaymentsDto {
  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional({ description: 'Filter by Order ID' })
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiPropertyOptional({ description: 'Search by order number, provider order/payment ID' })
  @IsOptional()
  @IsString()
  search?: string;

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

export class QueryRefundsDto {
  @ApiPropertyOptional({ enum: RefundStatus })
  @IsOptional()
  @IsEnum(RefundStatus)
  status?: RefundStatus;

  @ApiPropertyOptional({ description: 'Filter by Order ID' })
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiPropertyOptional({ description: 'Filter by Payment ID' })
  @IsOptional()
  @IsUUID()
  paymentId?: string;

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
