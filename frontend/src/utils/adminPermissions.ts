import type { AuthUser } from "../context/AuthContext";

/**
 * کلیدهای مجوز پنل مدیریت.
 *
 * این مقادیر باید با App\Support\AdminRole در بک‌اند یکسان باشند؛ منبع
 * نهاییِ تصمیم‌گیری همیشه پاسخ سرور (user.permissions) است.
 */
export const ADMIN_PERMISSIONS = {
  dashboard: "dashboard.view",
  products: "products.manage",
  categories: "categories.manage",
  brands: "brands.manage",
  banners: "banners.manage",
  pages: "pages.manage",
  articles: "articles.manage",
  reviews: "reviews.manage",
  orders: "orders.manage",
  returns: "returns.manage",
  coupons: "coupons.manage",
  customers: "customers.manage",
  messaging: "messaging.manage",
  reports: "reports.view",
  settings: "settings.manage",
  admins: "admins.manage",
} as const;

export type AdminPermission =
  (typeof ADMIN_PERMISSIONS)[keyof typeof ADMIN_PERMISSIONS];

export const ADMIN_ROLE_LABELS: Record<string, string> = {
  super_admin: "مدیر ارشد",
  product_manager: "مدیر محصولات",
  order_manager: "مدیر سفارش‌ها",
  support: "پشتیبانی",
};

/**
 * برچسب فارسی نقش مدیر؛ اگر سرور برچسب داده باشد همان اولویت دارد.
 */
export function adminRoleLabel(user: AuthUser | null | undefined): string {
  if (!user) return "مدیر فروشگاه";

  if (user.admin_role_label) return user.admin_role_label;

  if (user.admin_role && ADMIN_ROLE_LABELS[user.admin_role]) {
    return ADMIN_ROLE_LABELS[user.admin_role];
  }

  return user.role === "admin" ? "مدیر فروشگاه" : "کاربر";
}

/**
 * آیا این کاربر مجوز مشخصی دارد؟
 *
 * بدون مجوز (permission) فقط نقش مدیر بررسی می‌شود.
 */
export function hasAdminPermission(
  user: AuthUser | null | undefined,
  permission?: string,
): boolean {
  if (!user || user.role !== "admin") return false;
  if (!permission) return true;

  return Array.isArray(user.permissions)
    ? user.permissions.includes(permission)
    : false;
}
