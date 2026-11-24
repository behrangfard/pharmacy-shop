import { api } from "./api";

/**
 * سرویس ریدایرکت‌های ۳۰۱ (بخش «سلامت سئو»).
 *
 * نقشهٔ ریدایرکت‌ها از API خوانده و در حافظهٔ ماژول کش می‌شود تا در هر
 * جابه‌جایی دوباره نگیرد؛ همان پاسخ در زمان build هم برای نوشتن فایل
 * ریدایرکت هاست استفاده می‌شود.
 */

export type RedirectRule = {
  from: string;
  to: string;
};

const CACHE_TTL_MS = 5 * 60 * 1000;

let cachedRules: RedirectRule[] | null = null;
let cachedAt = 0;
let inFlight: Promise<RedirectRule[]> | null = null;

/**
 * یکدست‌سازی مسیر برای مقایسه؛ مثل نسخهٔ سرور (Redirect::normalizePath):
 * بدون کوئری/هش، با «/» شروع و بدون «/» پایانی (به‌جز ریشه).
 */
export function normalizePathname(value: string): string {
  const path = value.split(/[?#]/)[0]?.trim() ?? "";
  const withLeading = path.startsWith("/") ? path : `/${path}`;

  return withLeading === "/" ? "/" : withLeading.replace(/\/+$/, "");
}

/** یافتن ریدایرکت متناظر با مسیر فعلی. */
export function findRedirectRule(
  rules: RedirectRule[],
  pathname: string,
): RedirectRule | undefined {
  const path = normalizePathname(pathname);

  return rules.find((rule) => normalizePathname(rule.from) === path);
}

export async function fetchRedirectRules(
  force = false,
): Promise<RedirectRule[]> {
  if (!force && cachedRules && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedRules;
  }

  if (!force && inFlight) return inFlight;

  inFlight = api
    .get("/seo/redirects")
    .then((response) => {
      const data = response.data?.data;
      const rules = Array.isArray(data)
        ? data.filter(
            (rule): rule is RedirectRule =>
              typeof rule?.from === "string" &&
              rule.from !== "" &&
              typeof rule?.to === "string" &&
              rule.to !== "",
          )
        : [];

      cachedRules = rules;
      cachedAt = Date.now();

      return rules;
    })
    .catch((error) => {
      // نبود نقشهٔ ریدایرکت هرگز نباید مسیر فعلی کاربر را بشکند.
      console.error("Redirect rules fetch error:", error);

      return cachedRules ?? [];
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

/** پاک‌کردن کش ماژول (برای تست‌ها). */
export function clearRedirectRulesCache(): void {
  cachedRules = null;
  cachedAt = 0;
}

/** ثبت یک بار استفاده از ریدایرکت (شمارندهٔ جدول پنل). خطاها بی‌صدا می‌مانند. */
export function reportRedirectHit(pathname: string): void {
  void api.post("/seo/redirects/hit", { path: pathname }).catch(() => {});
}
