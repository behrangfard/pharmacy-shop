import { adminApi } from "./api";

/** نوع اعلان‌های زنگولهٔ پنل؛ سرور می‌تواند نوع جدید هم اضافه کند. */
export type AdminNotificationType =
  | "order"
  | "order_status"
  | "support"
  | "return"
  | (string & {});

export interface AdminNotification {
  id: number;
  type: AdminNotificationType;
  title: string;
  body: string | null;
  url: string | null;
  meta: Record<string, unknown>;
  read: boolean;
  created_at: string | null;
}

export interface AdminNotificationFeed {
  unread_count: number;
  items: AdminNotification[];
}

const toCount = (value: unknown): number => {
  const count = Number(value);

  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
};

const normalizeItem = (item: AdminNotification): AdminNotification => ({
  ...item,
  meta: item.meta && typeof item.meta === "object" ? item.meta : {},
  read: Boolean(item.read),
});

/** آخرین اعلان‌ها و تعداد خوانده‌نشده‌ها برای زنگولهٔ پنل. */
export const fetchAdminNotifications =
  async (): Promise<AdminNotificationFeed> => {
    const response = await adminApi.get("/admin/notifications");
    const data = response.data?.data;

    return {
      unread_count: toCount(data?.unread_count),
      items: Array.isArray(data?.items)
        ? (data.items as AdminNotification[]).map(normalizeItem)
        : [],
    };
  };

/** خوانده‌شده علامت زدن یک اعلان و دریافت شمارندهٔ تازه. */
export const markAdminNotificationRead = async (
  id: number,
): Promise<{ unread_count: number }> => {
  const response = await adminApi.post(
    `/admin/notifications/${encodeURIComponent(id)}/read`,
  );

  return { unread_count: toCount(response.data?.data?.unread_count) };
};

/** خوانده‌شده علامت زدن همهٔ اعلان‌ها. */
export const markAllAdminNotificationsRead =
  async (): Promise<{ unread_count: number }> => {
    const response = await adminApi.post("/admin/notifications/read-all");

    return { unread_count: toCount(response.data?.data?.unread_count) };
  };
