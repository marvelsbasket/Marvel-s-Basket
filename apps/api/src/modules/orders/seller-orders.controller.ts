import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRoleType } from '@prisma/client';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { SellerOrdersService } from './seller-orders.service';
import { QueryOrdersDto, RejectOrderDto } from './dto/orders.dto';

@ApiTags('Seller Orders & Fulfillment')
@ApiBearerAuth('JWT')
@Roles(UserRoleType.SELLER, UserRoleType.ADMIN, UserRoleType.SUPER_ADMIN)
@Controller('seller/orders')
export class SellerOrdersController {
  constructor(private readonly sellerOrdersService: SellerOrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List orders belonging to the authenticated seller store' })
  @ResponseMessage('Seller orders retrieved')
  async listOrders(@CurrentUser('id') userId: string, @Query() query: QueryOrdersDto) {
    return this.sellerOrdersService.listSellerOrders(userId, query);
  }

  @Get(':orderId')
  @ApiOperation({ summary: 'Get store-scoped order details for fulfillment' })
  @ResponseMessage('Seller order detail retrieved')
  async getOrderDetail(@CurrentUser('id') userId: string, @Param('orderId') orderId: string) {
    return this.sellerOrdersService.getSellerOrderDetail(userId, orderId);
  }

  @Post(':orderId/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept a PENDING order (PENDING -> CONFIRMED)' })
  @ResponseMessage('Order accepted')
  async acceptOrder(@CurrentUser('id') userId: string, @Param('orderId') orderId: string) {
    return this.sellerOrdersService.acceptOrder(userId, orderId);
  }

  @Post(':orderId/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject an order with a mandatory reason and restore stock' })
  @ResponseMessage('Order rejected')
  async rejectOrder(
    @CurrentUser('id') userId: string,
    @Param('orderId') orderId: string,
    @Body() dto: RejectOrderDto,
  ) {
    return this.sellerOrdersService.rejectOrder(userId, orderId, dto);
  }

  @Post(':orderId/pack')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a CONFIRMED order as PACKED' })
  @ResponseMessage('Order marked as packed')
  async packOrder(@CurrentUser('id') userId: string, @Param('orderId') orderId: string) {
    return this.sellerOrdersService.packOrder(userId, orderId);
  }

  @Post(':orderId/dispatch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dispatch a PACKED order (PACKED -> OUT_FOR_DELIVERY)' })
  @ResponseMessage('Order dispatched for delivery')
  async dispatchOrder(@CurrentUser('id') userId: string, @Param('orderId') orderId: string) {
    return this.sellerOrdersService.dispatchOrder(userId, orderId);
  }
}
