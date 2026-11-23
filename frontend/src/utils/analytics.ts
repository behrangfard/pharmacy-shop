/**
 * پوستهٔ آنالیتیکس سایت (GA4 / Google Tag Manager).
 *
 * چرا فایل جدا و نه اسکریپت داخل `index.html`؟
 * - سایت SPA است؛ با تغییر مسیر صفحه reload نمی‌شود، پس `page_view` باید هنگام
 *   تغییر مسیر دستی فرستاده شود (به همین دلیل `send_page_view` خاموش است).
 * - تا وقتی شناسه‌ای تنظیم نشده باشد، هیچ اسکریپتی دانلود و هیچ درخواستی ارسال
 *   نمی‌شود؛ محیط توسعه و بیلدهای بدون شناسه دست‌نخورده می‌مانند.
 * - همهٔ رویدادها از یک در می‌روند؛ افزودن تحلیل داخلی یا ابزار دوم فقط همین
 *   فایل را عوض می‌کند.
 *
 * شناسه‌ها از `frontend/.env` خوانده می‌شوند:
 * - `VITE_GA4_ID`  شناسهٔ Measurement ID (مثل `G-XXXXXXX`)
 * - `VITE_GTM_ID`  شناسهٔ کانتینر GTM (مثل `GTM-XXXXXXX`)
 *
 * ⚠ فقط یکی از این دو: اگر GTM تنظیم شده باشد، GA4 از داخل همان کانتینر
 * مدیریت می‌شود و gtag مستقیم بارگذاری نمی‌شود تا هر بازدید دو بار شمرده نشود.
 * در آن حالت رویدادها به `dataLayer` پوش می‌شوند (کار GTM).
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function readId(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export const GA4_ID = readId(import.meta.env.VITE_GA4_ID);

export const GTM_ID = readId(import.meta.env.VITE_GTM_ID);

/** آیا آنالیتیکس پیکربندی شده است؟ بدون آن، همهٔ توابع این فایل بی‌اثرند. */
export const analyticsConfigured = Boolean(GA4_ID || GTM_ID);

/** وقتی GTM هست، GA4 مستقیم بارگذاری نمی‌شود (جلوگیری از شمارش دوباره). */
const useGtm = Boolean(GTM_ID);

let initialized = false;

/** افزودن اسکریپت به head؛ اجرای دوباره تگ تکراری نمی‌سازد. */
function loadScript(src: string, id: string): void {
  if (document.getElementById(id)) return;

  const script = document.createElement("script");

  script.id = id;
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

/**
 * آماده‌سازی آنالیتیکس. یک بار در `App` (از `AnalyticsTracker`) صدا زده
 * می‌شود و صدا زدن دوباره بی‌خطر است.
 */
export function initAnalytics(): void {
  if (initialized || !analyticsConfigured) return;
  if (typeof window === "undefined" || typeof document === "undefined") return;

  initialized = true;
  window.dataLayer = window.dataLayer ?? [];

  if (useGtm) {
    // همان ابتدای اسنیپت رسمی GTM؛ خود کانتینر بقیه را می‌چیند.
    window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
    loadScript(
      `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(GTM_ID)}`,
      "gtm-loader",
    );

    return;
  }

  window.gtag =
    window.gtag ??
    function gtag(...args: unknown[]) {
      window.dataLayer?.push(args);
    };

  loadScript(
    `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA4_ID)}`,
    "ga4-loader",
  );

  window.gtag("js", new Date());
  // page_view را خودمان با هر تغییر مسیر می‌فرستیم (AnalyticsTracker).
  window.gtag("config", GA4_ID, { send_page_view: false });
}

/**
 * ارسال یک رویداد. نام و پارامترها همان طرح GA4 هستند
 * (`add_to_cart`, `begin_checkout`, `purchase`, …).
 */
export function trackEvent(
  name: string,
  params: Record<string, unknown> = {},
): void {
  if (!analyticsConfigured || typeof window === "undefined") return;

  initAnalytics();

  if (useGtm) {
    window.dataLayer?.push({ event: name, ...params });

    return;
  }

  window.gtag?.("event", name, params);
}

/** ثبت بازدید صفحه در SPA (مسیر جاری + عنوان فعلی صفحه). */
export function trackPageView(path: string, title?: string): void {
  if (typeof window === "undefined") return;

  const page = path.trim() || "/";

  trackEvent("page_view", {
    page_path: page,
    page_location: `${window.location.origin}${page}`,
    page_title: title?.trim() || document.title,
  });
}
