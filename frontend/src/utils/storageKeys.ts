/**
 * کلیدهای ذخیره‌سازی محلی مرورگر.
 *
 * نام کلیدها با برند فروشگاه («بهرنگ شاپ») هم‌راستا شده است. کلیدهای
 * قدیمی (pharmacy-shop-*) برای جلوگیری از خروج کاربران و از دست رفتن
 * سبد خرید، یک‌بار به کلیدهای جدید مهاجرت داده می‌شوند.
 */
export const STORAGE_KEYS = {
  token: "behrang-shop-token",
  user: "behrang-shop-user",
  adminToken: "behrang-shop-admin-token",
  adminUser: "behrang-shop-admin-user",
  cart: "behrang-shop-cart",
} as const;

const LEGACY_STORAGE_KEYS: Record<string, string> = {
  [STORAGE_KEYS.token]: "pharmacy-shop-token",
  [STORAGE_KEYS.user]: "pharmacy-shop-user",
  [STORAGE_KEYS.adminToken]: "pharmacy-shop-admin-token",
  [STORAGE_KEYS.adminUser]: "pharmacy-shop-admin-user",
  [STORAGE_KEYS.cart]: "pharmacy-shop-cart",
};

/**
 * مقادیر کلیدهای قدیمی را به کلیدهای جدید منتقل می‌کند.
 * این تابع باید یک‌بار در ابتدای اجرای برنامه فراخوانی شود.
 */
export function migrateLegacyStorage(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    Object.entries(LEGACY_STORAGE_KEYS).forEach(([newKey, legacyKey]) => {
      const legacyValue = window.localStorage.getItem(legacyKey);

      if (legacyValue === null) {
        return;
      }

      if (window.localStorage.getItem(newKey) === null) {
        window.localStorage.setItem(newKey, legacyValue);
      }

      window.localStorage.removeItem(legacyKey);
    });
  } catch (error) {
    console.error("Storage migration error:", error);
  }
}