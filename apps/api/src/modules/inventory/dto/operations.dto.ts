import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CartItemRevalidationDto {
  @ApiPropertyOptional({ description: 'Store listing UUID (optional if variantId is provided)' })
  @IsOptional()
  @IsUUID('4')
  listingId?: string;

  @ApiProperty({ description: 'Master product variant UUID' })
  @IsUUID('4')
  variantId!: string;

  @ApiProperty({ description: 'Customer requested quantity', example: 2 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity!: number;

  @ApiProperty({
    description: 'Unit price previously presented to customer in basket',
    example: 45.0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  unitPrice!: number;
}

export class RevalidateCartDto {
  @ApiProperty({ description: 'Store UUID where order is being placed' })
  @IsUUID('4')
  storeId!: string;

  @ApiProperty({ type: [CartItemRevalidationDto], description: 'Items in customer cart' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemRevalidationDto)
  items!: CartItemRevalidationDto[];
}

export class StockReservationItemDto {
  @ApiPropertyOptional({ description: 'Listing UUID' })
  @IsOptional()
  @IsUUID('4')
  listingId?: string;

  @ApiPropertyOptional({ description: 'Master product variant UUID' })
  @IsOptional()
  @IsUUID('4')
  variantId?: string;

  @ApiProperty({ description: 'Quantity to reserve', example: 2 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity!: number;
}

export class CreateStockReservationDto {
  @ApiProperty({ description: 'Store UUID' })
  @IsUUID('4')
  storeId!: string;

  @ApiProperty({ type: [StockReservationItemDto], description: 'Items to reserve atomically' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => StockReservationItemDto)
  items!: StockReservationItemDto[];

  @ApiProperty({ description: 'Unique checkout session identifier', example: 'chk_sess_9a8b7c' })
  @IsNotEmpty()
  @IsString()
  checkoutSessionId!: string;

  @ApiPropertyOptional({ description: 'Cart UUID' })
  @IsOptional()
  @IsUUID('4')
  cartId?: string;

  @ApiPropertyOptional({ description: 'Reservation TTL in minutes (default: 10)', default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  @Type(() => Number)
  ttlMinutes?: number = 10;

  @ApiProperty({ description: 'Unique idempotency key for this reservation attempt' })
  @IsNotEmpty()
  @IsString()
  idempotencyKey!: string;
}

export class CommitReservationDto {
  @ApiProperty({ description: 'Checkout session ID associated with reservation' })
  @IsNotEmpty()
  @IsString()
  checkoutSessionId!: string;

  @ApiPropertyOptional({ description: 'Created Order UUID to link' })
  @IsOptional()
  @IsUUID('4')
  orderId?: string;

  @ApiProperty({ description: 'Idempotency key to prevent double commit' })
  @IsNotEmpty()
  @IsString()
  idempotencyKey!: string;
}

export class ReleaseReservationDto {
  @ApiProperty({ description: 'Checkout session ID to release' })
  @IsNotEmpty()
  @IsString()
  checkoutSessionId!: string;

  @ApiPropertyOptional({
    description: 'Reason for releasing reservation',
    example: 'Payment cancelled by user',
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: 'Idempotency key' })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class PickerShortageWriteOffDto {
  @ApiProperty({ description: 'Store UUID' })
  @IsUUID('4')
  storeId!: string;

  @ApiProperty({ description: 'Listing UUID where shortage was discovered' })
  @IsUUID('4')
  listingId!: string;

  @ApiProperty({ description: 'Missing or damaged quantity during picking', example: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  shortageQuantity!: number;

  @ApiPropertyOptional({ description: 'Order ID affected by picker shortage' })
  @IsOptional()
  @IsUUID('4')
  orderId?: string;

  @ApiProperty({
    description: 'Reason/details from picker',
    example: 'Item burst/leaking on store shelf',
  })
  @IsNotEmpty()
  @IsString()
  reason!: string;

  @ApiProperty({ description: 'Picker or warehouse associate identifier' })
  @IsNotEmpty()
  @IsString()
  pickerId!: string;

  @ApiProperty({ description: 'Unique idempotency key for this write-off' })
  @IsNotEmpty()
  @IsString()
  idempotencyKey!: string;
}
