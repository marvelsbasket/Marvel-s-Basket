import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRoleType } from '@prisma/client';
import { InventoryService } from '../services/inventory.service';
import { AdjustStockDto, QueryInventoryHistoryDto } from '../dto';

@ApiTags('Seller Store Inventory')
@ApiBearerAuth('JWT')
@Controller('seller/stores/:storeId/inventory')
export class SellerInventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @Roles(UserRoleType.SELLER, UserRoleType.ADMIN, UserRoleType.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Retrieve store inventory overview metrics (total, low stock, out of stock, reserved)',
  })
  @ApiResponse({ status: 200, description: 'Inventory overview metrics retrieved' })
  async getOverview(@CurrentUser('id') userId: string, @Param('storeId') storeId: string) {
    return this.inventoryService.getInventoryOverview(userId, storeId);
  }

  @Get(':listingId')
  @Roles(UserRoleType.SELLER, UserRoleType.ADMIN, UserRoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Retrieve stock state and recent ledger for a specific listing' })
  @ApiResponse({ status: 200, description: 'Listing inventory details retrieved' })
  async getListingInventory(
    @CurrentUser('id') userId: string,
    @Param('storeId') storeId: string,
    @Param('listingId') listingId: string,
  ) {
    return this.inventoryService.getListingInventory(userId, storeId, listingId);
  }

  @Post(':listingId/adjustments')
  @Roles(UserRoleType.SELLER, UserRoleType.ADMIN, UserRoleType.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Apply an auditable stock adjustment (restock, reduction, write-off, correction)',
  })
  @ApiResponse({ status: 201, description: 'Stock adjusted and ledger entry recorded' })
  async adjustStock(
    @CurrentUser('id') userId: string,
    @Param('storeId') storeId: string,
    @Param('listingId') listingId: string,
    @Body() dto: AdjustStockDto,
  ) {
    return this.inventoryService.adjustStock(userId, storeId, listingId, dto);
  }

  @Get(':listingId/history')
  @Roles(UserRoleType.SELLER, UserRoleType.ADMIN, UserRoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Retrieve full audit adjustment history ledger for a listing' })
  @ApiResponse({ status: 200, description: 'Inventory adjustment history retrieved' })
  async getHistory(
    @CurrentUser('id') userId: string,
    @Param('storeId') storeId: string,
    @Param('listingId') listingId: string,
    @Query() query: QueryInventoryHistoryDto,
  ) {
    return this.inventoryService.getInventoryHistory(userId, storeId, listingId, query);
  }

  @Post('reconcile')
  @Roles(UserRoleType.SELLER, UserRoleType.ADMIN, UserRoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Run inventory ledger reconciliation against physical stock on hand' })
  @ApiResponse({ status: 200, description: 'Reconciliation results generated' })
  async reconcileInventory(
    @CurrentUser('id') userId: string,
    @Param('storeId') storeId: string,
    @Query('listingId') listingId?: string,
  ) {
    return this.inventoryService.reconcileInventory(userId, storeId, listingId);
  }
}
