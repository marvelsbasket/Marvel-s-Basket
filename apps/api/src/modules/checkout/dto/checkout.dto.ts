import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class ExpectedItemPriceDto {
  @ApiProperty()
  @IsUUID()
  sellerProductId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity?: number;
}

export class PrepareCheckoutDto {
  @ApiProperty({ description: 'Selected CustomerAddress UUID' })
  @IsUUID()
  addressId!: string;

  @ApiPropertyOptional({ description: 'Optional coupon code override' })
  @IsOptional()
  @IsString()
  couponCode?: string | null;

  @ApiPropertyOptional({ description: 'Optional idempotency key for safe retries' })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @ApiPropertyOptional({
    type: [ExpectedItemPriceDto],
    description: 'Item prices previously shown to customer to detect price changes',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExpectedItemPriceDto)
  expectedItemPrices?: ExpectedItemPriceDto[];
}

export class CancelCheckoutDto {
  @ApiPropertyOptional({ description: 'Specific CheckoutSession UUID to cancel' })
  @IsOptional()
  @IsUUID()
  checkoutSessionId?: string;
}
