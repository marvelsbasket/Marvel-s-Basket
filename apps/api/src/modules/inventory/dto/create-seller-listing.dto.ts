import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { SellerProductStatus } from '@prisma/client';

export class CreateSellerListingDto {
  @ApiProperty({
    description: 'Master product UUID',
    example: 'bb65eb2c-b34d-4f67-a8a6-f9221eabdd27',
  })
  @IsUUID('4')
  productId!: string;

  @ApiProperty({
    description: 'Master product variant UUID',
    example: '5783cedc-af1b-4da0-8708-7dddf0020de5',
  })
  @IsUUID('4')
  variantId!: string;

  @ApiProperty({
    description: 'Store-specific selling price (must be <= variant MRP)',
    example: 45.0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Type(() => Number)
  sellingPrice!: number;

  @ApiPropertyOptional({ description: 'Initial stock on hand quantity', example: 50, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  initialStock?: number = 0;

  @ApiPropertyOptional({
    description: 'Alert threshold for low stock warning',
    example: 5,
    default: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  lowStockThreshold?: number = 5;

  @ApiPropertyOptional({ description: 'Store-specific SKU barcode', example: 'STORE-MILK-500' })
  @IsOptional()
  @IsString()
  sellerSku?: string;

  @ApiPropertyOptional({ enum: SellerProductStatus, default: SellerProductStatus.ACTIVE })
  @IsOptional()
  @IsEnum(SellerProductStatus)
  status?: SellerProductStatus = SellerProductStatus.ACTIVE;
}
