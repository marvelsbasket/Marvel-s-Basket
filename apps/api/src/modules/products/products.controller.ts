import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { QueryCatalogProductsDto } from './dto';
import { ProductsService } from './products.service';

@ApiTags('Catalog — Storefront Products (Public)')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Discover and filter products scoped to customer location and serviceable store',
    description:
      'Returns active master catalog products with store-specific selling prices and stock levels resolved from the customer location.',
  })
  @ApiResponse({ status: 200, description: 'Paginated product cards' })
  @ResponseMessage('Products retrieved successfully')
  async getCatalogProducts(@Query() query: QueryCatalogProductsDto) {
    return this.productsService.getCatalogProducts(query);
  }

  @Public()
  @Get('search/suggestions')
  @ApiOperation({
    summary: 'Autocomplete search suggestions across products, brands, and categories',
  })
  @ApiResponse({ status: 200, description: 'Search suggestions' })
  @ResponseMessage('Search suggestions retrieved')
  async getSearchSuggestions(@Query('q') q: string) {
    return this.productsService.getSearchSuggestions(q || '');
  }

  @Public()
  @Get(':slug')
  @ApiOperation({
    summary: 'Retrieve single product details by slug with store-specific pricing and stock',
  })
  @ApiResponse({ status: 200, description: 'Detailed product information' })
  @ApiResponse({ status: 404, description: 'Product not found or unavailable' })
  @ResponseMessage('Product details retrieved successfully')
  async getProductBySlug(
    @Param('slug') slug: string,
    @Query('storeId') storeId?: string,
    @Query('postalCode') postalCode?: string,
  ) {
    return this.productsService.getProductBySlug(slug, { storeId, postalCode });
  }
}
