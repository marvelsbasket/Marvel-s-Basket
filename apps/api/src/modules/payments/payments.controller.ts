import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto, VerifyPaymentDto } from './dto/payments.dto';

@ApiTags('Customer Payments')
@ApiBearerAuth('JWT-auth')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initiate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Initiate or resume Razorpay payment for a checkout session or order' })
  @ResponseMessage('Payment initiated successfully')
  async initiatePayment(
    @CurrentUser('id') userId: string,
    @Body() dto: InitiatePaymentDto,
  ) {
    return this.paymentsService.initiatePayment(userId, dto);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify Razorpay Checkout signature and synchronize payment state' })
  @ResponseMessage('Payment verified')
  async verifyPayment(
    @CurrentUser('id') userId: string,
    @Body() dto: VerifyPaymentDto,
  ) {
    return this.paymentsService.verifyCheckoutPayment(userId, dto);
  }

  @Get(':paymentId/status')
  @ApiOperation({ summary: 'Get verified payment status for an authenticated customer' })
  @ResponseMessage('Payment status retrieved')
  async getPaymentStatus(
    @CurrentUser('id') userId: string,
    @Param('paymentId') paymentId: string,
  ) {
    return this.paymentsService.getCustomerPaymentStatus(userId, paymentId);
  }
}
