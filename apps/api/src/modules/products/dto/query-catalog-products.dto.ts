import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { FoodPreference } from '@prisma/client';

export class QueryCatalogProductsDto {
  @ApiPropertyOptional({
    description: 'Free-text search query across product names, brands, tags, and synonyms',
    example: 'milk',
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({
    description: 'Category slug or UUID',
    example: 'dairy-bakery',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Category UUID or slug alias',
    example: 'dairy-bakery',
  })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Subcategory slug or UUID',
    example: 'milk-cream',
  })
  @IsOptional()
  @IsString()
  subcategory?: string;

  @ApiPropertyOptional({
    description: 'Subcategory UUID or slug alias',
    example: 'milk-cream',
  })
  @IsOptional()
  @IsString()
  subcategoryId?: string;

  @ApiPropertyOptional({
    description: 'Brand slug, name, or UUID filter',
    example: 'amul',
  })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({
    description: 'Brand UUID or slug alias',
    example: 'amul',
  })
  @IsOptional()
  @IsString()
  brandId?: string;

  @ApiPropertyOptional({
    description: 'Food preference filter (VEG, NON_VEG, VEGAN, NA)',
    enum: FoodPreference,
  })
  @IsOptional()
  @IsEnum(FoodPreference)
  foodPreference?: FoodPreference;

  @ApiPropertyOptional({
    description: 'Minimum store selling price in INR',
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({
    description: 'Maximum store selling price in INR',
    example: 500,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({
    description: 'Minimum discount percentage (e.g. 10 for 10% OFF or more)',
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  minDiscount?: number;

  @ApiPropertyOptional({
    description: 'Filter only featured products for homepage sections',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({
    description: 'Sort order for product discovery',
    enum: ['relevance', 'price_asc', 'price_desc', 'discount_desc', 'newest'],
    default: 'relevance',
  })
  @IsOptional()
  @IsString()
  sort?: 'relevance' | 'price_asc' | 'price_desc' | 'discount_desc' | 'newest' = 'relevance';

  @ApiPropertyOptional({
    description: 'Explicit store UUID to scope inventory & selling prices',
  })
  @IsOptional()
  @IsString()
  storeId?: string;

  @ApiPropertyOptional({
    description: 'Customer delivery postal code to resolve local serviceable store',
    example: '560038',
  })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
