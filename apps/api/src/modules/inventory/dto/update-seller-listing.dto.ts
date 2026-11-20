import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { SellerProductStatus } from '@prisma/client';

export class UpdateSellerListingDto {
  @ApiPropertyOptional({ description: 'Updated store selling price (<= MRP)', example: 48.0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Type(() => Number)
  sellingPrice?: number;

  @ApiPropertyOptional({ description: 'Store SKU code' })
  @IsOptional()
  @IsString()
  sellerSku?: string;

  @ApiPropertyOptional({ enum: SellerProductStatus })
  @IsOptional()
  @IsEnum(SellerProductStatus)
  status?: SellerProductStatus;

  @ApiPropertyOptional({ description: 'Low stock warning threshold', example: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  lowStockThreshold?: number;
}

export class UpdateListingPriceDto {
  @ApiPropertyOptional({ description: 'Updated store selling price', example: 42.5 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Type(() => Number)
  sellingPrice!: number;
}

export class UpdateListingStatusDto {
  @ApiPropertyOptional({
    enum: SellerProductStatus,
    description: 'New listing status: ACTIVE, PAUSED, OUT_OF_STOCK, or DISABLED',
  })
  @IsEnum(SellerProductStatus)
  status!: SellerProductStatus;

  @ApiPropertyOptional({
    description: 'Reason for status transition',
    example: 'Temporary stock stockout',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class QuerySellerListingsDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Search by product name, SKU, or brand' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by category UUID' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ enum: SellerProductStatus })
  @IsOptional()
  @IsEnum(SellerProductStatus)
  status?: SellerProductStatus;

  @ApiPropertyOptional({
    description: 'Filter only low stock listings (available <= lowStockThreshold)',
  })
  @IsOptional()
  @Type(() => Boolean)
  isLowStock?: boolean;

  @ApiPropertyOptional({ description: 'Filter only out of stock listings (available === 0)' })
  @IsOptional()
  @Type(() => Boolean)
  isOutOfStock?: boolean;
}
