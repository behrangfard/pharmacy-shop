/**
 * آدرس‌دهی متمرکز به API بک‌اند.
 *
 * مقدار پایه از `VITE_API_URL` خوانده می‌شود (به‌همراه مسیر نسخه). اگر همین
 * سایت روی شبکهٔ محلی با IP کامپیوتر باز شود (مثلاً از گوشی که به همان مودم
 * وصل است) و مقدار `VITE_API_URL` روی localhost تنظیم شده باشد، نام میزبان
 * به‌صورت خودکار با نام میزبان فعلیِ صفحه عوض می‌شود تا هم درخواست‌های API و
 * هم آدرس تصاویر به همان کامپیوتر برسند. پس برای تست روی موبایل لازم نیست
 * چیزی در `.env` تغییر کند؛ فقط کافی است سرورها روی شبکه باز باشند.
 */

const DEFAULT_API_URL = "http://127.0.0.1:8000/api/v1";

/** میزبان‌هایی که فقط از همان کامپیوتر (loopback) در دسترس‌اند. */
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

function isLoopback(hostname: string): boolean {
  return LOOPBACK_HOSTS.has(hostname.trim().toLowerCase());
}

function configuredApiUrl(): string {
  return (
    (import.meta.env.VITE_API_URL as string | undefined)?.trim() ||
    DEFAULT_API_URL
  );
}

/**
 * اگر صفحه از میزبان غیرلوکال (IP شبکهٔ محلی یا دامنه) باز شده باشد و آدرس
 * API روی لوکال تنظیم شده باشد، میزبان API را با میزبان صفحه هم‌تراز می‌کند
 * و پورت و مسیر تنظیم‌شده را دست‌نخورده نگه می‌دارد.
 */
function alignHostWithPage(url: string): string {
  if (typeof window === "undefined") {
    return url;
  }

  const pageHost = window.location.hostname;

  if (!pageHost || isLoopback(pageHost)) {
    return url;
  }

  try {
    const parsed = new URL(url);

    if (isLoopback(parsed.hostname)) {
      parsed.hostname = pageHost;
    }

    return parsed.toString();
  } catch {
    // مقدارهای نسبی یا نامعتبر همان‌طور که هستند استفاده می‌شوند.
    return url;
  }
}

/** آدرس کامل API به‌همراه مسیر نسخه (بدون اسلش انتهایی). */
export const API_BASE_URL = alignHostWithPage(configuredApiUrl()).replace(
  /\/+$/,
  "",
);

/** ریشهٔ بک‌اند بدون مسیر /api و /api/v1 (برای ساخت لینک فایل‌های storage). */
export const API_ORIGIN = API_BASE_URL.replace(/\/api(\/v\d+)?$/i, "");
