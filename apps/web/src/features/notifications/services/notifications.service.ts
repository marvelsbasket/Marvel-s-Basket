import {
  NotificationCategoryType,
  NotificationChannelType,
  NotificationDeliveryStatusType,
  NotificationItem,
  NotificationPreferencesResponse,
  PaginatedAdminDeliveriesResponse,
  PaginatedAdminOutboxResponse,
  PaginatedNotificationsResponse,
  AdminNotificationHealthResponse,
} from '@marvels-basket/shared';
import { apiClient } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';

export class NotificationsService {
  static async list(
    scope: 'customer' | 'seller' = 'customer',
    params?: { type?: NotificationCategoryType; unreadOnly?: boolean; page?: number; limit?: number },
  ): Promise<PaginatedNotificationsResponse> {
    const url = scope === 'seller' ? ENDPOINTS.SELLER_NOTIFICATIONS.LIST : ENDPOINTS.NOTIFICATIONS.LIST;
    const res = await apiClient.get<PaginatedNotificationsResponse>(url, { params });
    return res.data!;
  }

  static async getUnreadCount(scope: 'customer' | 'seller' = 'customer'): Promise<number> {
    const url =
      scope === 'seller'
        ? ENDPOINTS.SELLER_NOTIFICATIONS.UNREAD_COUNT
        : ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT;
    const res = await apiClient.get<{ unreadCount: number }>(url);
    return res.data?.unreadCount ?? 0;
  }

  static async markAsRead(
    id: string,
    scope: 'customer' | 'seller' = 'customer',
  ): Promise<NotificationItem> {
    const url =
      scope === 'seller'
        ? ENDPOINTS.SELLER_NOTIFICATIONS.MARK_READ(id)
        : ENDPOINTS.NOTIFICATIONS.MARK_READ(id);
    const res = await apiClient.patch<NotificationItem>(url, {});
    return res.data!;
  }

  static async markAllAsRead(scope: 'customer' | 'seller' = 'customer'): Promise<number> {
    const url =
      scope === 'seller'
        ? ENDPOINTS.SELLER_NOTIFICATIONS.READ_ALL
        : ENDPOINTS.NOTIFICATIONS.READ_ALL;
    const res = await apiClient.post<{ updatedCount: number }>(url, {});
    return res.data?.updatedCount ?? 0;
  }

  static async dismiss(id: string): Promise<void> {
    await apiClient.delete(ENDPOINTS.NOTIFICATIONS.DISMISS(id));
  }

  static async getPreferences(
    scope: 'customer' | 'seller' = 'customer',
  ): Promise<NotificationPreferencesResponse> {
    const url =
      scope === 'seller'
        ? ENDPOINTS.SELLER_NOTIFICATIONS.PREFERENCES
        : ENDPOINTS.NOTIFICATIONS.PREFERENCES;
    const res = await apiClient.get<NotificationPreferencesResponse>(url);
    return res.data!;
  }

  static async updatePreferences(
    payload: {
      inApp?: boolean;
      email?: boolean;
      sms?: boolean;
      push?: boolean;
      categories?: Array<{
        category: NotificationCategoryType;
        channel: NotificationChannelType;
        isEnabled: boolean;
      }>;
    },
    scope: 'customer' | 'seller' = 'customer',
  ): Promise<NotificationPreferencesResponse> {
    const url =
      scope === 'seller'
        ? ENDPOINTS.SELLER_NOTIFICATIONS.PREFERENCES
        : ENDPOINTS.NOTIFICATIONS.PREFERENCES;
    const res = await apiClient.patch<NotificationPreferencesResponse>(url, payload);
    return res.data!;
  }

  static async adminListDeliveries(params?: {
    channel?: NotificationChannelType;
    status?: NotificationDeliveryStatusType;
    eventKey?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedAdminDeliveriesResponse> {
    const res = await apiClient.get<PaginatedAdminDeliveriesResponse>(
      ENDPOINTS.ADMIN_NOTIFICATIONS.DELIVERIES,
      { params },
    );
    return res.data!;
  }

  static async adminListOutbox(page = 1, limit = 25): Promise<PaginatedAdminOutboxResponse> {
    const res = await apiClient.get<PaginatedAdminOutboxResponse>(
      ENDPOINTS.ADMIN_NOTIFICATIONS.OUTBOX,
      { params: { page, limit } },
    );
    return res.data!;
  }

  static async adminGetHealth(): Promise<AdminNotificationHealthResponse> {
    const res = await apiClient.get<AdminNotificationHealthResponse>(
      ENDPOINTS.ADMIN_NOTIFICATIONS.HEALTH,
    );
    return res.data!;
  }

  static async adminRetryDelivery(id: string): Promise<void> {
    await apiClient.post(ENDPOINTS.ADMIN_NOTIFICATIONS.RETRY_DELIVERY(id), {});
  }
}
