import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ProductStatus } from '@prisma/client';

export class UpdateProductStatusDto {
  @ApiProperty({
    description: 'Target product publication status',
    enum: ProductStatus,
    example: ProductStatus.ACTIVE,
  })
  @IsEnum(ProductStatus)
  status!: ProductStatus;

  @ApiPropertyOptional({
    description: 'Administrative reason or audit note for status transition',
    example: 'Published after verifying mandatory MRP, primary variant, and FSSAI declarations.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
