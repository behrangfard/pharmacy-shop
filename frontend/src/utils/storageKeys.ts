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
  /** علاقه‌مندی‌های مهمان؛ پس از ورود به حساب به سرور منتقل می‌شود. */
  wishlist: "behrang-shop-wishlist",
  /** کش فهرست دسته‌بندی‌های فروشگاه برای رندر فوری منو. */
  storefrontCategories: "behrang-shop-storefront-categories",
  /** کش فهرست برندهای فروشگاه برای فیلتر صفحهٔ محصولات. */
  storefrontBrands: "behrang-shop-storefront-brands",
  /** کش تنظیمات عمومی فروشگاه (تماس، ارسال، مالیات). */
  storefrontSettings: "behrang-shop-storefront-settings",
  /** کش نوار اطلاع‌رسانی بالای هدر (متن/تصویر/ویدیوهای تبلیغاتی). */
  storefrontAnnouncementBar: "behrang-shop-storefront-announcement-bar",
  /** کش نشان‌های اعتماد و مجوزهای فوتر (اینماد، ساماندهی و ...). */
  storefrontTrustBadges: "behrang-shop-storefront-trust-badges",
  /** کش فهرست صفحات ثابت سایت (درباره ما، قوانین و ...) برای لینک‌های فوتر. */
  storefrontPages: "behrang-shop-storefront-pages",
  /** توکن گفتگوی پشتیبانی مهمان (چت فروشگاه). */
  supportConversation: "behrang-shop-support-conversation",
  /** آخرین پیام دیده‌شدهٔ گفتگوی پشتیبانی (برای نشانگر پیام جدید). */
  supportLastSeen: "behrang-shop-support-last-seen",
  /** چیدمان شخصی‌سازی‌شدهٔ منوی سایدبار پنل مدیریت (ترتیب + پین). */
  adminSidebar: "behrang-shop-admin-sidebar",
  /** تم انتخاب‌شدهٔ فروشگاه برای پیش‌نمایش پالت رنگ (sage/ocean). */
  storefrontTheme: "behrang-shop-storefront-theme",
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