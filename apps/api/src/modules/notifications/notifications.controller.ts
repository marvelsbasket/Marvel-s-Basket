import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { UserRoleType } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, Roles } from '../auth/decorators';
import {
  AdminDeliveriesQueryDto,
  ListNotificationsQueryDto,
  UpdateNotificationPreferencesDto,
} from './dto/notifications.dto';
import { NotificationPreferencesService } from './notifications.preferences.service';
import { NotificationsService } from './notifications.service';
import { ResendWebhookEventPayload, ResendWebhookService } from './resend-webhook.service';

@Controller({ path: 'notifications', version: '1' })
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly preferencesService: NotificationPreferencesService,
  ) {}

  @Get()
  listMyNotifications(
    @CurrentUser('id') userId: string,
    @Query() query: ListNotificationsQueryDto,
  ) {
    return this.notificationsService.listUserNotifications(userId, query);
  }

  @Get('unread-count')
  getUnreadCount(@CurrentUser('id') userId: string) {
    return this.notificationsService.getUnreadCount(userId);
  }

  @Patch(':id/read')
  markAsRead(
    @CurrentUser('id') userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.notificationsService.markAsRead(userId, id);
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  markAllAsRead(@CurrentUser('id') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @Delete(':id')
  dismissNotification(
    @CurrentUser('id') userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.notificationsService.dismissNotification(userId, id);
  }

  @Get('preferences')
  getPreferences(@CurrentUser('id') userId: string) {
    return this.preferencesService.getPreferences(userId);
  }

  @Patch('preferences')
  updatePreferences(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    return this.preferencesService.updatePreferences(userId, dto);
  }
}

@Controller({ path: 'seller/notifications', version: '1' })
@Roles(UserRoleType.SELLER)
export class SellerNotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly preferencesService: NotificationPreferencesService,
  ) {}

  @Get()
  listSellerNotifications(
    @CurrentUser('id') userId: string,
    @Query() query: ListNotificationsQueryDto,
  ) {
    return this.notificationsService.listUserNotifications(userId, query);
  }

  @Get('unread-count')
  getUnreadCount(@CurrentUser('id') userId: string) {
    return this.notificationsService.getUnreadCount(userId);
  }

  @Patch(':id/read')
  markAsRead(
    @CurrentUser('id') userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.notificationsService.markAsRead(userId, id);
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  markAllAsRead(@CurrentUser('id') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @Get('preferences')
  getPreferences(@CurrentUser('id') userId: string) {
    return this.preferencesService.getPreferences(userId);
  }

  @Patch('preferences')
  updatePreferences(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    return this.preferencesService.updatePreferences(userId, dto);
  }
}

@Controller({ path: 'admin/notifications', version: '1' })
@Roles(UserRoleType.ADMIN, UserRoleType.SUPER_ADMIN)
export class AdminNotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('deliveries')
  listDeliveries(@Query() query: AdminDeliveriesQueryDto) {
    return this.notificationsService.adminListDeliveries(query);
  }

  @Get('outbox')
  listOutbox(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.notificationsService.adminListOutbox(
      Math.max(1, Number(page) || 1),
      Math.min(50, Math.max(1, Number(limit) || 25)),
    );
  }

  @Get('health')
  getHealth() {
    return this.notificationsService.adminGetHealth();
  }

  @Get('events')
  getEventCatalog() {
    return this.notificationsService.getEventCatalog();
  }

  @Post('deliveries/:id/retry')
  @HttpCode(HttpStatus.OK)
  retryDelivery(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.notificationsService.adminRetryDelivery(id);
  }
}

@Controller({ path: 'webhooks/resend', version: '1' })
export class ResendWebhookController {
  constructor(private readonly webhookService: ResendWebhookService) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('svix-id') svixId: string | undefined,
    @Headers('svix-timestamp') svixTimestamp: string | undefined,
    @Headers('svix-signature') svixSignature: string | undefined,
    @Body() body: ResendWebhookEventPayload,
  ) {
    const rawBody = req.rawBody ?? JSON.stringify(body);
    this.webhookService.verifySignature({
      rawBody,
      svixId,
      svixTimestamp,
      svixSignature,
    });
    return this.webhookService.processWebhookEvent(body);
  }
}
