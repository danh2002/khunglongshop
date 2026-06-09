import { 
  NotificationFilters, 
  NotificationResponse, 
  NotificationCreateInput,
  BulkActionPayload 
} from '@/types/notification';

export function buildNotificationListPath(filters: NotificationFilters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, value.toString());
    }
  });

  const queryString = params.toString();
  return `/api/notifications${queryString ? `?${queryString}` : ''}`;
}

async function notificationRequest<T>(endpoint: string, init?: RequestInit): Promise<T> {
  const response = await fetch(endpoint, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message =
      payload?.error?.message ||
      payload?.error ||
      `Notification request failed (${response.status})`;
    throw new Error(message);
  }

  return response.json();
}

export const notificationApi = {
  /**
   * Get user notifications with filtering and pagination
   */
  async getUserNotifications(
    filters: NotificationFilters = {}
  ): Promise<NotificationResponse> {
    return notificationRequest<NotificationResponse>(buildNotificationListPath(filters));
  },

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(): Promise<{ unreadCount: number }> {
    return notificationRequest('/api/notifications/unread-count');
  },

  /**
   * Create a new notification
   */
  async createNotification(data: NotificationCreateInput) {
    return notificationRequest('/api/notifications', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Mark notification as read/unread
   */
  async updateNotification(id: string, isRead: boolean) {
    return notificationRequest(`/api/notifications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isRead }),
    });
  },

  /**
   * Bulk mark notifications as read
   */
  async bulkMarkAsRead(payload: BulkActionPayload) {
    return notificationRequest('/api/notifications/mark-read', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Delete single notification
   */
  async deleteNotification(id: string) {
    return notificationRequest(`/api/notifications/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Bulk delete notifications
   */
  async bulkDeleteNotifications(payload: BulkActionPayload) {
    return notificationRequest('/api/notifications/bulk', {
      method: 'DELETE',
      body: JSON.stringify(payload),
    });
  }
};
