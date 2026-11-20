import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const EmptyToUndefined = () =>
  Transform(({ value }) => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed === '' ? undefined : trimmed;
    }
    return value;
  });

export class CreateSellerApplicationDto {
  @ApiPropertyOptional({
    description: 'Proposed store or trade name',
    example: 'Gupta Daily Mart',
  })
  @IsOptional()
  @EmptyToUndefined()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  storeDisplayName?: string;

  @ApiPropertyOptional({
    description: 'Primary product category',
    example: 'GROCERY',
  })
  @IsOptional()
  @EmptyToUndefined()
  @IsString()
  storeCategory?: string;
}
