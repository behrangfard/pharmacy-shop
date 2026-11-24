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

/* ---------------------------------------------------------------------------
 * رویدادهای فروش GA4 (فاز ۱.۲ نقشهٔ راه)
 *
 * قیمت‌های فروشگاه به تومان ذخیره می‌شوند و GA4 برای `currency: "IRR"`
 * انتظار ریال دارد؛ تبدیل فقط همین‌جا (یک ضریب) انجام می‌شود تا بقیهٔ کد
 * از این قاعده بی‌خبر بماند.
 * ------------------------------------------------------------------------- */

/** هر تومان = ۱۰ ریال (واحد پایهٔ گزارش GA4). */
export const TOMAN_TO_RIAL = 10;

/** واحد پول رویدادهای تجارت الکترونیک. */
export const ANALYTICS_CURRENCY = "IRR";

/** تبدیل مبلغ تومانی به ریال برای پارامترهای GA4. */
export function toRial(toman: number): number {
  return Number.isFinite(toman) ? Math.round(toman * TOMAN_TO_RIAL) : 0;
}

export interface AnalyticsItem {
  id: number | string;
  name: string;
  /** قیمت واحد به تومان (همان مبلغی که مشتری می‌پردازد). */
  price: number;
  quantity?: number;
  /** نام تنوع/سایز؛ اگر محصول تنوع دارد. */
  variant?: string | null;
}

/** ردیف سبد خرید (`CartItem`) را به آیتم GA4 تبدیل می‌کند. */
export interface CartAnalyticsItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  variant_name?: string | null;
}

export function cartAnalyticsItems(
  items: CartAnalyticsItem[],
): AnalyticsItem[] {
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    price: Number(item.price ?? 0),
    quantity: Number(item.quantity ?? 1),
    variant: item.variant_name ?? null,
  }));
}

/** تبدیل آیتم‌ها به قالب `items` استاندارد GA4 (قیمت ریالی). */
function toGaItems(items: AnalyticsItem[]): Array<Record<string, unknown>> {
  return items.map((item) => ({
    item_id: String(item.id),
    item_name: item.name,
    ...(item.variant ? { item_variant: item.variant } : {}),
    price: toRial(item.price),
    quantity: item.quantity ?? 1,
  }));
}

/** ارزش کل آیتم‌ها به ریال. */
function itemsValue(items: AnalyticsItem[]): number {
  return toRial(
    items.reduce(
      (sum, item) => sum + Number(item.price ?? 0) * (item.quantity ?? 1),
      0,
    ),
  );
}

/** `view_item`: نمایش صفحهٔ یک محصول. */
export function trackViewItem(item: AnalyticsItem): void {
  trackEvent("view_item", {
    currency: ANALYTICS_CURRENCY,
    value: itemsValue([item]),
    items: toGaItems([item]),
  });
}

/** `view_item_list`: نمایش فهرست محصولات (هر بار لود یا صفحه‌بندی). */
export function trackViewItemList(
  items: AnalyticsItem[],
  listName: string,
): void {
  if (items.length === 0) return;

  trackEvent("view_item_list", {
    item_list_name: listName,
    items: toGaItems(items),
  });
}

/** `add_to_cart` / `remove_from_cart` برای یک قلم. */
export function trackCartChange(
  event: "add_to_cart" | "remove_from_cart",
  item: AnalyticsItem,
): void {
  trackEvent(event, {
    currency: ANALYTICS_CURRENCY,
    value: itemsValue([item]),
    items: toGaItems([item]),
  });
}

/** `begin_checkout`: ورود به صفحهٔ تسویه با سبد فعلی. */
export function trackBeginCheckout(
  items: AnalyticsItem[],
  couponCode?: string | null,
): void {
  trackEvent("begin_checkout", {
    currency: ANALYTICS_CURRENCY,
    value: itemsValue(items),
    items: toGaItems(items),
    ...(couponCode ? { coupon: couponCode } : {}),
  });
}

/**
 * `add_shipping_info` و `add_payment_info`: انتخاب روش ارسال/پرداخت در تسویه.
 * GA4 برای این دو رویداد به‌ترتیب `shipping_tier` و `payment_type` می‌خواهد.
 */
export function trackCheckoutOption(
  event: "add_shipping_info" | "add_payment_info",
  items: AnalyticsItem[],
  method: string,
  couponCode?: string | null,
): void {
  trackEvent(event, {
    currency: ANALYTICS_CURRENCY,
    value: itemsValue(items),
    items: toGaItems(items),
    ...(event === "add_shipping_info"
      ? { shipping_tier: method }
      : { payment_type: method }),
    ...(couponCode ? { coupon: couponCode } : {}),
  });
}

/**
 * `purchase`: سفارش نهایی. `transaction_id` همان شمارهٔ سفارش است تا GA4
 * رویداد تکراری (رفرش یا بازگشت به صفحه) را حذف کند.
 *
 * سفارش «پرداخت در محل» در لحظهٔ ثبت `purchase` می‌شود؛ سفارش آنلاین پس از
 * موفقیت پرداخت (صفحهٔ پرداخت) — هم‌راستا با وضعیت واقعی سفارش.
 */
export function trackPurchase(order: {
  orderNumber: string;
  totalToman: number;
  items: AnalyticsItem[];
  shippingToman?: number;
  couponCode?: string | null;
}): void {
  trackEvent("purchase", {
    transaction_id: order.orderNumber,
    currency: ANALYTICS_CURRENCY,
    value: toRial(order.totalToman),
    ...(order.shippingToman !== undefined && order.shippingToman > 0
      ? { shipping: toRial(order.shippingToman) }
      : {}),
    ...(order.couponCode ? { coupon: order.couponCode } : {}),
    items: toGaItems(order.items),
  });
}

/** `refund`: لغو سفارش توسط مشتری (فقط برای سفارش‌های همین مرورگر). */
export function trackRefund(refund: {
  orderNumber: string;
  totalToman?: number;
}): void {
  trackEvent("refund", {
    transaction_id: refund.orderNumber,
    ...(refund.totalToman !== undefined
      ? { currency: ANALYTICS_CURRENCY, value: toRial(refund.totalToman) }
      : {}),
  });
}
