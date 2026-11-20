import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSellerApplicationDto {
  @ApiPropertyOptional({
    description: 'Proposed store or trade name',
    example: 'Gupta Daily Mart',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  storeDisplayName?: string;

  @ApiPropertyOptional({
    description: 'Primary product category',
    example: 'GROCERY',
  })
  @IsOptional()
  @IsString()
  storeCategory?: string;
}
