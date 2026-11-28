import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseMessage } from '../../../common/decorators/response-message.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { DeliveryService } from '../delivery.service';

@ApiTags('Customer — Delivery Tracking')
@ApiBearerAuth('JWT-auth')
@Controller('customer/orders/:orderId/delivery')
export class CustomerDeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Get()
  @ApiOperation({ summary: 'Get delivery details for an authenticated customer order' })
  @ResponseMessage('Delivery retrieved')
  async getDelivery(
    @CurrentUser('id') userId: string,
    @Param('orderId') orderId: string,
  ) {
    return this.deliveryService.getCustomerDelivery(userId, orderId);
  }

  @Get('tracking')
  @ApiOperation({ summary: 'Get delivery milestone tracking for an authenticated customer order' })
  @ResponseMessage('Delivery tracking retrieved')
  async getTracking(
    @CurrentUser('id') userId: string,
    @Param('orderId') orderId: string,
  ) {
    return this.deliveryService.getCustomerDeliveryTracking(userId, orderId);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get delivery status history for an authenticated customer order' })
  @ResponseMessage('Delivery history retrieved')
  async getHistory(
    @CurrentUser('id') userId: string,
    @Param('orderId') orderId: string,
  ) {
    return this.deliveryService.getCustomerDeliveryHistory(userId, orderId);
  }
}
