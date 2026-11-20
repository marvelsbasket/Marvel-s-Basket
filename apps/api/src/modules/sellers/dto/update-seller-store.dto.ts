import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

export class UpdateSellerStoreDto {
  @ApiPropertyOptional({ description: 'Store display name' })
  @IsOptional()
  @IsString()
  storeDisplayName?: string;

  @ApiPropertyOptional({ description: 'Opening time (HH:MM)' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Opening time must be in HH:MM format' })
  openingTime?: string;

  @ApiPropertyOptional({ description: 'Closing time (HH:MM)' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Closing time must be in HH:MM format' })
  closingTime?: string;

  @ApiPropertyOptional({ description: 'Weekly off days' })
  @IsOptional()
  @IsString()
  weeklyOffDays?: string;

  @ApiPropertyOptional({ description: 'Delivery service radius in km' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(30)
  serviceRadiusKm?: number;

  @ApiPropertyOptional({ description: 'Order preparation time in minutes' })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(120)
  preparationTime?: number;

  @ApiPropertyOptional({ description: 'Storefront photo URL' })
  @IsOptional()
  @IsString()
  storefrontPhotoUrl?: string;

  @ApiPropertyOptional({ description: 'Store interior photo URL' })
  @IsOptional()
  @IsString()
  storeInteriorPhotoUrl?: string;
}
