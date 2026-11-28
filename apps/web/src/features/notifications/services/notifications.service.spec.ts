import { NotificationsService } from './notifications.service';
import { apiClient } from '@/lib/api/client';

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('NotificationsService (Web)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches customer unread count and marks all notifications read', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({ data: { unreadCount: 4 } });
    (apiClient.post as jest.Mock).mockResolvedValue({ data: { updatedCount: 4 } });

    const count = await NotificationsService.getUnreadCount('customer');
    const updated = await NotificationsService.markAllAsRead('customer');

    expect(count).toBe(4);
    expect(updated).toBe(4);
    expect(apiClient.get).toHaveBeenCalledWith('/notifications/unread-count');
    expect(apiClient.post).toHaveBeenCalledWith('/notifications/read-all', {});
  });
});
