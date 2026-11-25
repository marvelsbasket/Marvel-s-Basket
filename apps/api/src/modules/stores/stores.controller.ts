import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { QueryCatalogProductsDto } from '../products/dto';
import { ProductsService } from '../products/products.service';
import { QueryNearbyStoresDto } from './dto';
import { StoresService } from './stores.service';

@ApiTags('Storefront — Stores Discovery (Public)')
@Controller('stores')
export class StoresController {
  constructor(
    private readonly storesService: StoresService,
    private readonly productsService: ProductsService,
  ) {}

  @Public()
  @Get('nearby')
  @ApiOperation({
    summary: 'Discover eligible stores serving the customer location',
    description:
      'Matches active approved stores by postal code service area or Haversine delivery radius.',
  })
  @ApiResponse({ status: 200, description: 'List of nearby serviceable stores' })
  @ResponseMessage('Nearby stores retrieved successfully')
  async getNearbyStores(@Query() query: QueryNearbyStoresDto) {
    return this.storesService.findNearbyStores(query);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({
    summary: 'Retrieve public seller storefront details, categories, and operational status',
  })
  @ApiResponse({ status: 200, description: 'Storefront details' })
  @ApiResponse({ status: 404, description: 'Store not found' })
  @ResponseMessage('Storefront retrieved successfully')
  async getStoreBySlug(
    @Param('slug') slug: string,
    @Query('latitude') latitude?: string,
    @Query('longitude') longitude?: string,
  ) {
    const lat = latitude ? Number(latitude) : undefined;
    const lng = longitude ? Number(longitude) : undefined;
    return this.storesService.getPublicStoreBySlug(slug, {
      latitude: lat !== undefined && Number.isFinite(lat) ? lat : undefined,
      longitude: lng !== undefined && Number.isFinite(lng) ? lng : undefined,
    });
  }

  @Public()
  @Get(':slug/products')
  @ApiOperation({
    summary: 'List products listed specifically by this store with local selling prices and stock',
  })
  @ApiResponse({ status: 200, description: 'Store-specific product listings' })
  @ResponseMessage('Store products retrieved successfully')
  async getStoreProducts(@Param('slug') slug: string, @Query() query: QueryCatalogProductsDto) {
    const store = await this.storesService.getPublicStoreBySlug(slug);
    return this.productsService.getCatalogProducts({
      ...query,
      storeId: store.id,
      onlyStoreListed: true,
    });
  }
}
