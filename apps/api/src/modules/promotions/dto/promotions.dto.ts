import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
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
import { DiscountType, SellerDiscountStatus } from '@prisma/client';

export class CreateSellerDiscountDto {
  @ApiProperty({ description: 'SellerProduct listing UUID owned by the seller' })
  @IsUUID()
  sellerProductId!: string;

  @ApiPropertyOptional({ description: 'Optional promotional label (e.g., Weekend Fresh Deal)' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ enum: DiscountType })
  @IsEnum(DiscountType)
  discountType!: DiscountType;

  @ApiProperty({ description: 'Percentage (1-90) or flat INR amount' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  discountValue!: number;

  @ApiProperty({ description: 'ISO 8601 start timestamp' })
  @IsDateString()
  startsAt!: string;

  @ApiProperty({ description: 'ISO 8601 expiry timestamp' })
  @IsDateString()
  expiresAt!: string;

  @ApiPropertyOptional({ default: true, description: 'Publish immediately as ACTIVE/SCHEDULED' })
  @IsOptional()
  @IsBoolean()
  publishImmediately?: boolean = true;
}

export class UpdateSellerDiscountDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ enum: DiscountType })
  @IsOptional()
  @IsEnum(DiscountType)
  discountType?: DiscountType;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  discountValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class QuerySellerDiscountsDto {
  @ApiPropertyOptional({ enum: SellerDiscountStatus })
  @IsOptional()
  @IsEnum(SellerDiscountStatus)
  status?: SellerDiscountStatus;

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

export class CreateCouponDto {
  @ApiProperty({ description: 'Unique uppercase coupon code' })
  @IsString()
  @MinLength(3)
  code!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: DiscountType })
  @IsEnum(DiscountType)
  discountType!: DiscountType;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  discountValue!: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  minimumOrderAmount?: number = 0;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  maximumDiscount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  usageLimit?: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  perUserLimit?: number = 1;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  firstOrderOnly?: boolean = false;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isStackableWithSellerDiscount?: boolean = true;

  @ApiProperty()
  @IsDateString()
  startsAt!: string;

  @ApiProperty()
  @IsDateString()
  expiresAt!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}

export class UpdateCouponDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: DiscountType })
  @IsOptional()
  @IsEnum(DiscountType)
  discountType?: DiscountType;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  discountValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  minimumOrderAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  maximumDiscount?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  usageLimit?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  perUserLimit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  firstOrderOnly?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isStackableWithSellerDiscount?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class QueryCouponsDto {
  @ApiPropertyOptional()
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
