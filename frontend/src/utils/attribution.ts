import { STORAGE_KEYS } from "./storageKeys";

/**
 * انتساب سفارش به کمپین (فاز ۱.۳ نقشهٔ راه آنالیتیکس).
 *
 * UTM اولین لینک ورودی در `sessionStorage` نگه داشته می‌شود (انتساب
 * اول-تماس در یک نشست) و هنگام تسویه با سفارش ارسال می‌شود. اعتبارسنجی و
 * پاک‌سازی نهایی سمت سرور انجام می‌شود (`OrderController::sanitizeAttribution`)؛
 * اینجا فقط خواندن، برش زدن و نگهداری است تا payload سبک بماند.
 */

export interface OrderAttribution {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  referrer?: string;
}

/** نگاشت پارامتر آدرس به نام فیلد payload. */
const UTM_PARAMS: Array<[string, keyof OrderAttribution]> = [
  ["utm_source", "source"],
  ["utm_medium", "medium"],
  ["utm_campaign", "campaign"],
  ["utm_content", "content"],
  ["utm_term", "term"],
];

/** متن ساده و کوتاه؛ کنترل‌کاراکترها با فاصله جایگزین می‌شوند. */
function clean(value: string | null | undefined, limit: number): string {
  return (value ?? "")
    .replace(/\p{C}/gu, " ")
    .trim()
    .slice(0, limit);
}

function sessionStore(): Storage | null {
  if (typeof window === "undefined") return null;

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** آیا آدرس ارجاع‌دهنده از همین سایت نیست؟ (ارجاع داخلی ارزش انتساب ندارد) */
function isExternalReferrer(referrer: string): boolean {
  if (referrer === "" || typeof window === "undefined") return false;

  try {
    return new URL(referrer).origin !== window.location.origin;
  } catch {
    return false;
  }
}

/**
 * UTMهای آدرس فعلی را در نشست ذخیره می‌کند (در `AnalyticsTracker` با هر
 * تغییر مسیر صدا زده می‌شود). ورودی بدون UTM انتساب قبلی همین نشست را پاک
 * نمی‌کند؛ فقط اگر هنوز هیچ انتسابی ثبت نشده باشد ارجاع‌دهندهٔ بیرونی به‌تنهایی
 * نگه داشته می‌شود.
 */
export function captureAttribution(): void {
  const store = sessionStore();

  if (!store || typeof window === "undefined") return;

  try {
    const params = new URLSearchParams(window.location.search);
    const found: OrderAttribution = {};

    for (const [param, field] of UTM_PARAMS) {
      const value = clean(params.get(param), 180);

      if (value !== "") found[field] = value;
    }

    const hasUtm = Object.keys(found).length > 0;
    const referrer = clean(document.referrer, 500);

    if (hasUtm) {
      if (isExternalReferrer(referrer)) found.referrer = referrer;

      store.setItem(STORAGE_KEYS.attribution, JSON.stringify(found));

      return;
    }

    if (store.getItem(STORAGE_KEYS.attribution) === null && isExternalReferrer(referrer)) {
      store.setItem(STORAGE_KEYS.attribution, JSON.stringify({ referrer }));
    }
  } catch {
    // انتساب نباید هیچ‌وقت جلوی خرید را بگیرد.
  }
}

/**
 * انتساب ذخیره‌شدهٔ نشست؛ فقط کلیدهای مجاز و مقدارهای غیرخالی برمی‌گردند و
 * اگر چیزی ثبت نشده باشد `null` است تا payload سفارش تمیز بماند.
 */
export function readAttribution(): OrderAttribution | null {
  const store = sessionStore();

  if (!store) return null;

  try {
    const stored = store.getItem(STORAGE_KEYS.attribution);

    if (!stored) return null;

    const parsed: unknown = JSON.parse(stored);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }

    const attribution: OrderAttribution = {};

    for (const [, field] of UTM_PARAMS) {
      const value = (parsed as Record<string, unknown>)[field];

      if (typeof value === "string" && value.trim() !== "") {
        attribution[field] = value.trim().slice(0, 180);
      }
    }

    const referrer = (parsed as Record<string, unknown>).referrer;

    if (typeof referrer === "string" && referrer.trim() !== "") {
      attribution.referrer = referrer.trim().slice(0, 500);
    }

    return Object.keys(attribution).length > 0 ? attribution : null;
  } catch {
    return null;
  }
}
