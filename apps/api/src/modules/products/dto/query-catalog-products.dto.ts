import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
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
  @Transform(({ value }) =>
    value === 'true' || value === true ? true : value === 'false' ? false : undefined,
  )
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({
    description: 'Return only products currently in stock at the resolved store',
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' || value === true ? true : value === 'false' ? false : undefined,
  )
  @IsBoolean()
  inStockOnly?: boolean;

  @ApiPropertyOptional({
    description: 'Return only products actively listed by the specified store',
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' || value === true ? true : value === 'false' ? false : undefined,
  )
  @IsBoolean()
  onlyStoreListed?: boolean;

  @ApiPropertyOptional({
    description: 'Sort order for product discovery',
    enum: ['relevance', 'popular', 'price_asc', 'price_desc', 'discount_desc', 'newest'],
    default: 'relevance',
  })
  @IsOptional()
  @IsString()
  sort?: 'relevance' | 'popular' | 'price_asc' | 'price_desc' | 'discount_desc' | 'newest' =
    'relevance';

  @ApiPropertyOptional({
    description: 'Explicit store UUID or slug to scope inventory & selling prices',
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

  @ApiPropertyOptional({ description: 'Customer latitude for location store resolution' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ description: 'Customer longitude for location store resolution' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

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
