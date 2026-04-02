import { apiClient } from "@/service/api/apiClient";
import { apiConfig } from "@/service/constants/apiConfig";

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "BOOKING" | "PAYMENT" | "REVIEW" | "HOMESTAY" | "SUPPORT" | "SYSTEM";
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "PAID";
  isRead: boolean;
  relatedId?: string;
  relatedType?: string;
  createdAt: string;
  updatedAt: string;
}

/** Khớp FE notification settings (emailNotif / pushNotif / smsNotif) */
export interface NotificationPreferences {
  emailNotif: boolean;
  pushNotif: boolean;
  smsNotif: boolean;
}

const mapNotification = (item: any): Notification => ({
  id: String(item.id ?? ""),
  title: item.title ?? "",
  message: item.content ?? item.message ?? "",
  type: item.type ?? "SYSTEM",
  status: item.status ?? "PENDING",
  isRead: item.isRead || false,
  relatedId: item.relatedId,
  relatedType: item.relatedType,
  createdAt: item.createdAt ?? "",
  updatedAt: item.updatedAt ?? item.createdAt ?? "",
});

export const notificationService = {
  async getNotifications(
    limit: number = 20,
    offset: number = 0,
  ): Promise<Notification[]> {
    const res = await apiClient.get<any>(
      `${apiConfig.endpoints.notifications.list}?limit=${limit}&offset=${offset}`,
    );
    const list = Array.isArray(res?.data)
      ? res.data
      : Array.isArray(res)
        ? res
        : [];
    return list.map(mapNotification);
  },

  async getUnreadCount(): Promise<number> {
    const res = await apiClient.get<any>(
      apiConfig.endpoints.notifications.unreadCount,
    );
    const raw = res?.data ?? res ?? 0;
    return typeof raw === "number" ? raw : raw?.count ?? 0;
  },

  /** PUT /api/notifications/{id}/read — FE */
  async markAsRead(notificationId: string): Promise<{ success: boolean }> {
    await apiClient.put<any>(
      apiConfig.endpoints.notifications.markRead(notificationId),
      {},
    );
    return { success: true };
  },

  /** PUT /api/notifications/read-all */
  async markAllAsRead(): Promise<{ success: boolean }> {
    await apiClient.put<any>(
      apiConfig.endpoints.notifications.markAllRead,
      {},
    );
    return { success: true };
  },

  async deleteNotification(
    notificationId: string,
  ): Promise<{ success: boolean }> {
    await apiClient.delete<any>(
      apiConfig.endpoints.notifications.delete(notificationId),
    );
    return { success: true };
  },

  /** GET /api/notifications/settings */
  async getPreferences(): Promise<NotificationPreferences> {
    const res = await apiClient.get<any>(
      apiConfig.endpoints.notifications.settings,
    );
    const data = res?.data ?? res ?? {};
    return {
      emailNotif: data.emailNotif ?? data.emailNotifications ?? true,
      pushNotif: data.pushNotif ?? data.pushNotifications ?? true,
      smsNotif: data.smsNotif ?? data.smsNotifications ?? false,
    };
  },

  /** PUT /api/notifications/settings */
  async updatePreferences(
    preferences: Partial<NotificationPreferences>,
  ): Promise<NotificationPreferences> {
    const res = await apiClient.put<any>(
      apiConfig.endpoints.notifications.settings,
      preferences,
    );
    const data = res?.data ?? res ?? {};
    return {
      emailNotif: data.emailNotif ?? true,
      pushNotif: data.pushNotif ?? true,
      smsNotif: data.smsNotif ?? false,
    };
  },
};
