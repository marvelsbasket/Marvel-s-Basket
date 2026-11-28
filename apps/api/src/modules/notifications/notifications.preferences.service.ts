import { Injectable } from '@nestjs/common';
import { NotificationChannel, NotificationType } from '@prisma/client';
import {
  NotificationCategoryPreferenceItem,
  NotificationPreferencesResponse,
} from '@marvels-basket/shared';
import { PrismaService } from '../../database/prisma.service';
import { UpdateNotificationPreferencesDto } from './dto/notifications.dto';

const MANDATORY_CATEGORIES: ReadonlySet<NotificationType> = new Set([
  NotificationType.ACCOUNT,
  NotificationType.PAYMENT,
  NotificationType.REFUND,
]);

const CONFIGURABLE_CATEGORIES: NotificationType[] = [
  NotificationType.ORDER,
  NotificationType.DELIVERY,
  NotificationType.PAYMENT,
  NotificationType.REFUND,
  NotificationType.REVIEW,
  NotificationType.PROMOTION,
  NotificationType.ACCOUNT,
  NotificationType.SYSTEM,
];

@Injectable()
export class NotificationPreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  async getPreferences(userId: string): Promise<NotificationPreferencesResponse> {
    const [channelPrefs, categoryPrefs] = await Promise.all([
      this.prisma.notificationPreference.findMany({ where: { userId } }),
      this.prisma.notificationCategoryPreference.findMany({ where: { userId } }),
    ]);

    const channelMap = new Map(channelPrefs.map((p) => [p.channel, p.isEnabled]));
    const catMap = new Map(
      categoryPrefs.map((p) => [`${p.channel}:${p.category}`, p.isEnabled]),
    );

    const channels = {
      inApp: channelMap.get(NotificationChannel.IN_APP) ?? true,
      email: channelMap.get(NotificationChannel.EMAIL) ?? true,
      sms: channelMap.get(NotificationChannel.SMS) ?? false,
      push: channelMap.get(NotificationChannel.PUSH) ?? false,
    };

    const categories: NotificationCategoryPreferenceItem[] = [];
    for (const category of CONFIGURABLE_CATEGORIES) {
      const isMandatory = MANDATORY_CATEGORIES.has(category);
      for (const channel of [NotificationChannel.IN_APP, NotificationChannel.EMAIL]) {
        const stored = catMap.get(`${channel}:${category}`);
        categories.push({
          category,
          channel,
          isEnabled: isMandatory ? true : (stored ?? true),
          isMandatory,
        });
      }
    }

    return { channels, categories };
  }

  async updatePreferences(
    userId: string,
    dto: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreferencesResponse> {
    const ops: Array<Promise<unknown>> = [];

    const channelEntries: Array<[NotificationChannel, boolean | undefined]> = [
      [NotificationChannel.IN_APP, dto.inApp],
      [NotificationChannel.EMAIL, dto.email],
      [NotificationChannel.SMS, dto.sms],
      [NotificationChannel.PUSH, dto.push],
    ];

    for (const [channel, isEnabled] of channelEntries) {
      if (isEnabled !== undefined) {
        ops.push(
          this.prisma.notificationPreference.upsert({
            where: { userId_channel: { userId, channel } },
            create: { userId, channel, isEnabled },
            update: { isEnabled },
          }),
        );
      }
    }

    if (dto.categories && dto.categories.length > 0) {
      for (const item of dto.categories) {
        // Mandatory security/financial categories cannot be disabled.
        const effectiveEnabled = MANDATORY_CATEGORIES.has(item.category)
          ? true
          : item.isEnabled;
        ops.push(
          this.prisma.notificationCategoryPreference.upsert({
            where: {
              userId_channel_category: {
                userId,
                channel: item.channel,
                category: item.category,
              },
            },
            create: {
              userId,
              channel: item.channel,
              category: item.category,
              isEnabled: effectiveEnabled,
            },
            update: { isEnabled: effectiveEnabled },
          }),
        );
      }
    }

    if (ops.length > 0) {
      await Promise.all(ops);
    }

    return this.getPreferences(userId);
  }

  /**
   * Evaluates whether a specific channel should deliver for a user + category.
   * Mandatory events bypass optional user opt-outs.
   */
  async isChannelAllowedForUser(params: {
    userId: string;
    channel: NotificationChannel;
    category: NotificationType;
    isMandatory: boolean;
  }): Promise<boolean> {
    if (params.isMandatory) {
      return true;
    }

    const [channelPref, categoryPref] = await Promise.all([
      this.prisma.notificationPreference.findUnique({
        where: {
          userId_channel: { userId: params.userId, channel: params.channel },
        },
      }),
      this.prisma.notificationCategoryPreference.findUnique({
        where: {
          userId_channel_category: {
            userId: params.userId,
            channel: params.channel,
            category: params.category,
          },
        },
      }),
    ]);

    if (channelPref && !channelPref.isEnabled) {
      return false;
    }
    if (categoryPref && !categoryPref.isEnabled) {
      return false;
    }
    return true;
  }
}
