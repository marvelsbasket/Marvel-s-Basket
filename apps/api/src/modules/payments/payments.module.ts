import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../../database/prisma.module';
import { StoresModule } from '../stores/stores.module';
import { InventoryModule } from '../inventory/inventory.module';
import { OrdersModule } from '../orders/orders.module';
import { RazorpayClient } from './gateways/razorpay/razorpay.client';
import { RazorpayService } from './gateways/razorpay/razorpay.service';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaymentWebhookController } from './webhooks/payment-webhook.controller';
import { PAYMENT_WEBHOOKS_QUEUE, WebhookService } from './webhooks/webhook.service';
import { WebhookProcessor } from './webhooks/webhook.processor';
import { RefundsService } from './refunds/refunds.service';
import { AdminPaymentsController } from './refunds/admin-payments.controller';
import { PaymentReconciliationService } from './reconciliation/payment-reconciliation.service';

@Module({
  imports: [
    PrismaModule,
    StoresModule,
    InventoryModule,
    forwardRef(() => OrdersModule),
    BullModule.registerQueue({ name: PAYMENT_WEBHOOKS_QUEUE }),
  ],
  controllers: [PaymentsController, PaymentWebhookController, AdminPaymentsController],
  providers: [
    RazorpayClient,
    RazorpayService,
    PaymentsService,
    WebhookService,
    WebhookProcessor,
    RefundsService,
    PaymentReconciliationService,
  ],
  exports: [PaymentsService, RefundsService, PaymentReconciliationService],
})
export class PaymentsModule {}
