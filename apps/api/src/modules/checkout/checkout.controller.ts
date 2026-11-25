import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CheckoutService } from './checkout.service';
import { CancelCheckoutDto, PrepareCheckoutDto } from './dto/checkout.dto';

@ApiTags('Checkout & Reservations')
@ApiBearerAuth('JWT')
@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post('prepare')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Validate basket, store hours, MOV, delivery fee, and coupons, and atomically reserve inventory for 15 minutes',
  })
  @ApiResponse({ status: 200, description: 'Checkout prepared and inventory reserved' })
  @ApiResponse({ status: 409, description: 'Insufficient stock or price change detected' })
  @ResponseMessage('Checkout prepared and items reserved for 15 minutes')
  async prepareCheckout(@CurrentUser('id') userId: string, @Body() dto: PrepareCheckoutDto) {
    return this.checkoutService.prepareCheckout(userId, dto);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Retrieve validated checkout summary and remaining reservation time' })
  @ApiQuery({ name: 'sessionId', required: false, description: 'Optional CheckoutSession UUID' })
  @ResponseMessage('Checkout summary retrieved')
  async getCheckoutSummary(
    @CurrentUser('id') userId: string,
    @Query('sessionId') sessionId?: string,
  ) {
    return this.checkoutService.getCheckoutSummary(userId, sessionId);
  }

  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel active checkout and immediately release inventory reservation' })
  @ResponseMessage('Checkout cancelled and reservation released')
  async cancelCheckout(@CurrentUser('id') userId: string, @Body() dto: CancelCheckoutDto) {
    return this.checkoutService.cancelCheckout(userId, dto);
  }
}
