import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class AddCartItemDto {
  @ApiProperty({ description: 'Store listing UUID (SellerProduct.id)' })
  @IsUUID()
  sellerProductId!: string;

  @ApiProperty({ description: 'Desired quantity', default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  quantity: number = 1;

  @ApiPropertyOptional({
    description: 'Set true after customer confirms clearing items from a different store',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  confirmStoreSwitch?: boolean;
}

export class UpdateCartItemDto {
  @ApiProperty({ description: 'New quantity (0 removes the item)' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(99)
  quantity!: number;
}

export class CompareBasketItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sellerProductId?: string;

  @ApiProperty()
  @IsString()
  variantId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  packSize?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CompareStoreSwitchDto {
  @ApiPropertyOptional({ description: 'Target store UUID or slug' })
  @IsOptional()
  @IsString()
  targetStoreId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currentStoreId?: string;

  @ApiProperty({ type: [CompareBasketItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompareBasketItemDto)
  items!: CompareBasketItemDto[];
}

export class ApplyStoreSwitchDto {
  @ApiPropertyOptional({
    description: 'Target store UUID (null if switching to unserviceable area)',
  })
  @IsOptional()
  @IsString()
  targetStoreId?: string | null;
}

export class SyncCartItemDto {
  @ApiProperty()
  @IsUUID()
  sellerProductId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  quantity!: number;
}

export class SyncCartDto {
  @ApiProperty({ type: [SyncCartItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncCartItemDto)
  items!: SyncCartItemDto[];
}

export class ApplyCouponDto {
  @ApiProperty({ description: 'Platform coupon code' })
  @IsString()
  code!: string;
}

export class SwitchStoreDto {
  @ApiProperty({ description: 'Store listing UUID (SellerProduct.id) from the new store' })
  @IsUUID()
  sellerProductId!: string;

  @ApiProperty({ description: 'Desired quantity', default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  quantity: number = 1;
}
