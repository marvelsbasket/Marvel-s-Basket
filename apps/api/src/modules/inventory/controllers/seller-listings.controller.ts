import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRoleType } from '@prisma/client';
import { SellerListingsService } from '../services/seller-listings.service';
import {
  CreateSellerListingDto,
  QuerySellerListingsDto,
  UpdateListingPriceDto,
  UpdateListingStatusDto,
  UpdateSellerListingDto,
} from '../dto';

@ApiTags('Seller Product Listings')
@ApiBearerAuth('JWT')
@Controller('seller')
export class SellerListingsController {
  constructor(private readonly listingsService: SellerListingsService) {}

  @Get('catalog/products')
  @Roles(UserRoleType.SELLER, UserRoleType.ADMIN, UserRoleType.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Browse platform-approved master catalog products and variants to list',
  })
  @ApiResponse({ status: 200, description: 'Master catalog products retrieved' })
  async browseCatalog(
    @CurrentUser('id') userId: string,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('brandId') brandId?: string,
    @Query('storeId') storeId?: string,
  ) {
    return this.listingsService.browseMasterCatalog(userId, {
      search,
      categoryId,
      brandId,
      storeId,
    });
  }

  @Post('stores/:storeId/listings')
  @Roles(UserRoleType.SELLER, UserRoleType.ADMIN, UserRoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Add a master catalog product variant to store listings' })
  @ApiResponse({ status: 201, description: 'Listing created successfully' })
  async createListing(
    @CurrentUser('id') userId: string,
    @Param('storeId') storeId: string,
    @Body() dto: CreateSellerListingDto,
  ) {
    return this.listingsService.createListing(userId, storeId, dto);
  }

  @Get('stores/:storeId/listings')
  @Roles(UserRoleType.SELLER, UserRoleType.ADMIN, UserRoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all product listings for the store with search & filters' })
  @ApiResponse({ status: 200, description: 'Store listings retrieved' })
  async getListings(
    @CurrentUser('id') userId: string,
    @Param('storeId') storeId: string,
    @Query() query: QuerySellerListingsDto,
  ) {
    return this.listingsService.getListings(userId, storeId, query);
  }

  @Get('stores/:storeId/listings/:listingId')
  @Roles(UserRoleType.SELLER, UserRoleType.ADMIN, UserRoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Retrieve specific store listing by ID' })
  @ApiResponse({ status: 200, description: 'Listing details retrieved' })
  async getListingById(
    @CurrentUser('id') userId: string,
    @Param('storeId') storeId: string,
    @Param('listingId') listingId: string,
  ) {
    return this.listingsService.getListingById(userId, storeId, listingId);
  }

  @Patch('stores/:storeId/listings/:listingId')
  @Roles(UserRoleType.SELLER, UserRoleType.ADMIN, UserRoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update listing metadata (price, SKU, low stock threshold, status)' })
  @ApiResponse({ status: 200, description: 'Listing updated successfully' })
  async updateListing(
    @CurrentUser('id') userId: string,
    @Param('storeId') storeId: string,
    @Param('listingId') listingId: string,
    @Body() dto: UpdateSellerListingDto,
  ) {
    return this.listingsService.updateListing(userId, storeId, listingId, dto);
  }

  @Patch('stores/:storeId/listings/:listingId/price')
  @Roles(UserRoleType.SELLER, UserRoleType.ADMIN, UserRoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update store selling price with strict MRP ceiling check' })
  @ApiResponse({ status: 200, description: 'Price updated successfully' })
  async updateListingPrice(
    @CurrentUser('id') userId: string,
    @Param('storeId') storeId: string,
    @Param('listingId') listingId: string,
    @Body() dto: UpdateListingPriceDto,
  ) {
    return this.listingsService.updateListingPrice(userId, storeId, listingId, dto);
  }

  @Patch('stores/:storeId/listings/:listingId/status')
  @Roles(UserRoleType.SELLER, UserRoleType.ADMIN, UserRoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update listing status (ACTIVE, PAUSED, OUT_OF_STOCK, DISABLED)' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  async updateListingStatus(
    @CurrentUser('id') userId: string,
    @Param('storeId') storeId: string,
    @Param('listingId') listingId: string,
    @Body() dto: UpdateListingStatusDto,
  ) {
    return this.listingsService.updateListingStatus(userId, storeId, listingId, dto);
  }
}
