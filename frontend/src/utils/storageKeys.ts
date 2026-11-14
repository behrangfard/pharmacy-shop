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
  /** کش متن‌ها و لینک‌های هدر و فوتر (لوگو، CTA، درباره، لینک‌های سریع). */
  storefrontHeaderFooter: "behrang-shop-storefront-header-footer",
  /** کش نوار اطلاع‌رسانی بالای هدر (متن/تصویر/ویدیوهای تبلیغاتی). */
  storefrontAnnouncementBar: "behrang-shop-storefront-announcement-bar",
  /** کش نشان‌های اعتماد و مجوزهای فوتر (اینماد، ساماندهی و ...). */
  storefrontTrustBadges: "behrang-shop-storefront-trust-badges",
  /** کش استوری‌های صفحهٔ اول (دایره‌های بالای دسته‌بندی‌ها). */
  storefrontStories: "behrang-shop-storefront-stories",
  /** استوری‌هایی که کاربر دیده است (برای خاکستری شدن حلقهٔ دایره). */
  storiesSeen: "behrang-shop-stories-seen",
  /** کش پاپ‌آپ‌های فعال فروشگاه (فهرست + زمان‌بندی). */
  storefrontPopups: "behrang-shop-storefront-popups",
  /** پاپ‌آپ‌هایی که کاربر بسته است (برای قاعدهٔ تکرار). */
  popupsSeen: "behrang-shop-popups-seen",
  /** شناسهٔ نشست جاری مرورگر برای قاعدهٔ «هر نشست یک‌بار». */
  popupsSession: "behrang-shop-popups-session",
  /** کش فهرست صفحات ثابت سایت (درباره ما، قوانین و ...) برای لینک‌های فوتر. */
  storefrontPages: "behrang-shop-storefront-pages",
  /** توکن گفتگوی پشتیبانی مهمان (چت فروشگاه). */
  supportConversation: "behrang-shop-support-conversation",
  /** آخرین پیام دیده‌شدهٔ گفتگوی پشتیبانی (برای نشانگر پیام جدید). */
  supportLastSeen: "behrang-shop-support-last-seen",
  /** چیدمان شخصی‌سازی‌شدهٔ منوی سایدبار پنل مدیریت (ترتیب + پین). */
  adminSidebar: "behrang-shop-admin-sidebar",
  /** چیدمان شخصی‌سازی‌شدهٔ صفحهٔ «نمای کلی» پنل مدیریت (ترتیب + بخش‌های پنهان). */
  adminDashboard: "behrang-shop-admin-dashboard",
  /** تم انتخاب‌شدهٔ فروشگاه برای پیش‌نمایش پالت رنگ (sage/ocean). */
  storefrontTheme: "behrang-shop-storefront-theme",
  /** عبارت‌های جست‌وجوی اخیر کاربر (پیشنهادهای کادر جست‌وجوی هدر). */
  searchHistory: "behrang-shop-search-history",
  /** محصولاتی که کاربر اخیراً دیده است (ریل «بازدیدهای اخیر»). */
  recentlyViewed: "behrang-shop-recently-viewed",
  /** شناسهٔ پایدار مرورگر مهمان برای ثبت سفارش بدون حساب (Idempotency). */
  guestToken: "behrang-shop-guest-token",
  /** زمان بستن پیشنهاد نصب اپلیکیشن (PWA) تا دوباره مزاحم نشود. */
  pwaInstallDismissed: "behrang-shop-pwa-install-dismissed",
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