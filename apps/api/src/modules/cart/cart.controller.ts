import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CartService } from './cart.service';
import {
  AddCartItemDto,
  ApplyStoreSwitchDto,
  CompareStoreSwitchDto,
  SyncCartDto,
  UpdateCartItemDto,
} from './dto';

@ApiTags('Shopping Basket (Cart)')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @ApiBearerAuth('JWT')
  @Get()
  @ApiOperation({ summary: 'Retrieve authenticated customer basket with live prices & stock' })
  @ApiResponse({ status: 200, description: 'Basket state retrieved' })
  @ResponseMessage('Basket retrieved successfully')
  async getCart(@CurrentUser('id') userId: string) {
    return this.cartService.getCart(userId);
  }

  @ApiBearerAuth('JWT')
  @Post('items')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add or increment item in basket (single-store boundary enforced)' })
  @ApiResponse({ status: 200, description: 'Item added to basket' })
  @ApiResponse({
    status: 409,
    description: 'Insufficient stock or store switch confirmation required',
  })
  @ResponseMessage('Basket updated successfully')
  async addItem(@CurrentUser('id') userId: string, @Body() dto: AddCartItemDto) {
    return this.cartService.addItem(userId, dto);
  }

  @ApiBearerAuth('JWT')
  @Patch('items/:itemId')
  @ApiOperation({ summary: 'Update quantity of a basket item' })
  @ResponseMessage('Basket item updated successfully')
  async updateItemQuantity(
    @CurrentUser('id') userId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItemQuantity(userId, itemId, dto);
  }

  @ApiBearerAuth('JWT')
  @Delete('items/:itemId')
  @ApiOperation({ summary: 'Remove a single item from basket' })
  @ResponseMessage('Basket item removed')
  async removeItem(@CurrentUser('id') userId: string, @Param('itemId') itemId: string) {
    return this.cartService.removeItem(userId, itemId);
  }

  @ApiBearerAuth('JWT')
  @Delete()
  @ApiOperation({ summary: 'Clear all items from basket' })
  @ResponseMessage('Basket cleared successfully')
  async clearCart(@CurrentUser('id') userId: string) {
    return this.cartService.clearCart(userId);
  }

  @Public()
  @Post('compare-store')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Compare current basket items against a target store/location before switching',
  })
  @ResponseMessage('Store comparison completed')
  async compareStoreSwitch(@Body() dto: CompareStoreSwitchDto) {
    return this.cartService.compareStoreSwitch(dto);
  }

  @ApiBearerAuth('JWT')
  @Post('apply-store-switch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Apply confirmed location/store switch to authenticated basket' })
  @ResponseMessage('Basket updated for new store')
  async applyStoreSwitch(@CurrentUser('id') userId: string, @Body() dto: ApplyStoreSwitchDto) {
    return this.cartService.applyStoreSwitch(userId, dto);
  }

  @ApiBearerAuth('JWT')
  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sync guest localStorage basket into authenticated database cart' })
  @ResponseMessage('Basket synchronized')
  async syncGuestCart(@CurrentUser('id') userId: string, @Body() dto: SyncCartDto) {
    return this.cartService.syncGuestCart(userId, dto);
  }
}
