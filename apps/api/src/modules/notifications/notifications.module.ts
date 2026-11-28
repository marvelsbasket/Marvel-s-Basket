import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NOTIFICATIONS_QUEUE } from './notifications.constants';
import {
  AdminNotificationsController,
  NotificationsController,
  ResendWebhookController,
  SellerNotificationsController,
} from './notifications.controller';
import { NotificationsDispatcher } from './notifications.dispatcher';
import { NotificationOutboxWorker } from './notifications.outbox.worker';
import { NotificationPreferencesService } from './notifications.preferences.service';
import { NotificationsProcessor } from './notifications.processor';
import { NotificationsService } from './notifications.service';
import { ResendWebhookService } from './resend-webhook.service';

@Global()
@Module({
  imports: [
    BullModule.registerQueue({
      name: NOTIFICATIONS_QUEUE,
    }),
  ],
  controllers: [
    NotificationsController,
    SellerNotificationsController,
    AdminNotificationsController,
    ResendWebhookController,
  ],
  providers: [
    NotificationPreferencesService,
    NotificationsDispatcher,
    NotificationsService,
    NotificationsProcessor,
    NotificationOutboxWorker,
    ResendWebhookService,
  ],
  exports: [NotificationsService, NotificationPreferencesService],
})
export class NotificationsModule {}
