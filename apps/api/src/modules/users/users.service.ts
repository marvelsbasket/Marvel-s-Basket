import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationChannel, UserStatus } from '@prisma/client';
import {
  AccountOverviewResponse,
  AccountPreferencesResponse,
  CustomerProfileResponse,
} from '@marvels-basket/shared';
import { PrismaService } from '../../database/prisma.service';
import { UpdatePreferencesDto, UpdateProfileDto } from './dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves the current customer profile.
   * Strictly isolated to the authenticated user ID.
   */
  async getMe(userId: string): Promise<CustomerProfileResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      include: {
        customerProfile: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user || user.status === UserStatus.DELETED) {
      throw new NotFoundException('Customer account not found');
    }

    return {
      id: user.customerProfile?.id ?? user.id,
      userId: user.id,
      name: user.name,
      email: user.email ?? '',
      phone: user.phone,
      avatarUrl: user.customerProfile?.avatarUrl ?? null,
      dateOfBirth: user.customerProfile?.dateOfBirth
        ? user.customerProfile.dateOfBirth.toISOString().split('T')[0]
        : null,
      isEmailVerified: user.emailVerifiedAt !== null,
      emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.toISOString() : null,
      status: user.status,
      roles: user.userRoles.map((ur) => ur.role.name),
      createdAt: user.createdAt.toISOString(),
    };
  }

  /**
   * Updates the current customer's personal details.
   * Prevents unauthorized modifications to sensitive fields (role, email, verification status, internal status).
   */
  async updateMe(userId: string, dto: UpdateProfileDto): Promise<CustomerProfileResponse> {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      include: { customerProfile: true },
    });

    if (!existing || existing.status === UserStatus.DELETED) {
      throw new NotFoundException('Customer account not found');
    }

    if (existing.status === UserStatus.SUSPENDED || existing.status === UserStatus.BLOCKED) {
      throw new BadRequestException('Account is not eligible for profile modifications');
    }

    const birthDate =
      dto.dateOfBirth !== undefined
        ? dto.dateOfBirth
          ? new Date(dto.dateOfBirth)
          : null
        : undefined;

    await this.prisma.$transaction(async (tx) => {
      // 1. Update User basic information if name is provided
      if (dto.name) {
        await tx.user.update({
          where: { id: userId },
          data: { name: dto.name },
        });
      }

      // 2. Upsert CustomerProfile if avatar or date of birth is modified
      if (dto.avatarUrl !== undefined || birthDate !== undefined) {
        await tx.customerProfile.upsert({
          where: { userId },
          create: {
            userId,
            avatarUrl: dto.avatarUrl ?? null,
            dateOfBirth: birthDate ?? null,
          },
          update: {
            ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
            ...(birthDate !== undefined && { dateOfBirth: birthDate }),
          },
        });
      }
    });

    this.logger.log(`Customer profile updated successfully for user ${userId}`);
    return this.getMe(userId);
  }

  /**
   * Retrieves high-level account status and metadata.
   */
  async getAccountOverview(userId: string): Promise<AccountOverviewResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      include: {
        _count: {
          select: {
            addresses: true,
          },
        },
      },
    });

    if (!user || user.status === UserStatus.DELETED) {
      throw new NotFoundException('Customer account not found');
    }

    return {
      userId: user.id,
      name: user.name,
      email: user.email ?? '',
      phone: user.phone,
      status: user.status,
      isEmailVerified: user.emailVerifiedAt !== null,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
      totalAddresses: user._count.addresses,
    };
  }

  /**
   * Retrieves notification and communication preferences for the authenticated customer.
   */
  async getPreferences(userId: string): Promise<AccountPreferencesResponse> {
    const preferences = await this.prisma.notificationPreference.findMany({
      where: { userId },
    });

    const prefMap = new Map(preferences.map((p) => [p.channel, p.isEnabled]));

    return {
      emailNotifications: prefMap.get(NotificationChannel.EMAIL) ?? true,
      smsNotifications: prefMap.get(NotificationChannel.SMS) ?? true,
      pushNotifications: prefMap.get(NotificationChannel.PUSH) ?? true,
      inAppNotifications: prefMap.get(NotificationChannel.IN_APP) ?? true,
      promotionalEmails: prefMap.get('EMAIL' as NotificationChannel) ?? true,
    };
  }

  /**
   * Updates notification and communication preferences.
   */
  async updatePreferences(
    userId: string,
    dto: UpdatePreferencesDto,
  ): Promise<AccountPreferencesResponse> {
    const updates: Array<{ channel: NotificationChannel; isEnabled: boolean }> = [];

    if (dto.emailNotifications !== undefined) {
      updates.push({ channel: NotificationChannel.EMAIL, isEnabled: dto.emailNotifications });
    }
    if (dto.smsNotifications !== undefined) {
      updates.push({ channel: NotificationChannel.SMS, isEnabled: dto.smsNotifications });
    }
    if (dto.pushNotifications !== undefined) {
      updates.push({ channel: NotificationChannel.PUSH, isEnabled: dto.pushNotifications });
    }
    if (dto.inAppNotifications !== undefined) {
      updates.push({ channel: NotificationChannel.IN_APP, isEnabled: dto.inAppNotifications });
    }

    if (updates.length > 0) {
      await this.prisma.$transaction(
        updates.map((update) =>
          this.prisma.notificationPreference.upsert({
            where: {
              userId_channel: {
                userId,
                channel: update.channel,
              },
            },
            create: {
              userId,
              channel: update.channel,
              isEnabled: update.isEnabled,
            },
            update: {
              isEnabled: update.isEnabled,
            },
          }),
        ),
      );
    }

    return this.getPreferences(userId);
  }

  /**
   * Deactivates the customer account.
   * Marks status as INACTIVE and revokes all active sessions.
   */
  async deactivateAccount(userId: string): Promise<{ success: boolean; message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException('Customer account not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { status: UserStatus.INACTIVE },
      });

      // Revoke all active sessions
      await tx.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });

    this.logger.warn(`Customer account deactivated for user ${userId}`);
    return {
      success: true,
      message: 'Account has been deactivated. Active sessions have been terminated.',
    };
  }
}
