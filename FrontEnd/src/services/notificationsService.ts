import { apiClient } from "./apiClient";

export interface NotificationDto {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

class NotificationsService {
  /**
   * Get all notifications for the current user
   */
  async getNotifications(): Promise<NotificationDto[]> {
    return apiClient.get<NotificationDto[]>("/notifications");
  }

  /**
   * Get unread notifications count
   */
  async getUnreadCount(): Promise<{ count: number }> {
    return apiClient.get<{ count: number }>("/notifications/unread-count");
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(id: string): Promise<void> {
    return apiClient.put(`/notifications/${id}/read`);
  }

  /**
   * Create a notification (mostly used by backend, but exposed if needed)
   */
  async createNotification(data: {
    userId: string;
    title: string;
    message: string;
    type: string;
  }): Promise<void> {
    return apiClient.post("/notifications", data);
  }
}

export const notificationsService = new NotificationsService();
export default notificationsService;
