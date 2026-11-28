import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { BypassTransform } from '../../../common/decorators/bypass-transform.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { WebhookService } from './webhook.service';

@ApiTags('Payment Webhooks')
@Controller('payments/webhooks')
export class PaymentWebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post('razorpay')
  @Public()
  @BypassTransform()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive and verify Razorpay webhook events' })
  async handleRazorpayWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-razorpay-signature') signature?: string,
    @Headers('x-razorpay-event-id') eventId?: string,
  ) {
    if (!req.rawBody) {
      throw new BadRequestException({
        code: 'RAW_BODY_MISSING',
        message: 'Raw webhook request body is required for signature verification.',
      });
    }

    return this.webhookService.ingestRazorpayWebhook({
      rawBody: req.rawBody,
      signature,
      eventId,
    });
  }
}
