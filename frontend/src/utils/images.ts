/**
 * آدرس‌دهی متمرکز به فایل‌های ذخیره‌شده در بک‌اند (پوشه storage).
 *
 * آدرس پایه از VITE_API_URL خوانده می‌شود؛ بنابراین در محیط تولید فقط با
 * تنظیم همان متغیر محیطی، همه لینک‌های تصویر به دامنه واقعی منتقل می‌شوند.
 * پیش از این، آدرس بک‌اند در چند فایل به‌صورت هاردکد تکرار شده بود.
 */

const DEFAULT_API_URL = "http://127.0.0.1:8000/api/v1";

const configuredApiUrl = (
  import.meta.env.VITE_API_URL as string | undefined
)?.trim();

/** ریشه بک‌اند بدون مسیر /api و /api/v1 (برای ساخت لینک فایل‌ها) */
export const API_ORIGIN = (configuredApiUrl || DEFAULT_API_URL)
  .replace(/\/+$/, "")
  .replace(/\/api(\/v\d+)?$/i, "");

/**
 * مسیر ذخیره‌شده در دیتابیس را به URL قابل استفاده در <img> تبدیل می‌کند.
 *
 * - مسیرهای مطلق (http/https) و data URL بدون تغییر برگردانده می‌شوند.
 * - مسیرهای `/storage/...` و `storage/...` و مسیرهای خام پشتیبانی می‌شوند.
 */
export function getStorageUrl(path?: string | null): string | null {
  const value = path?.trim();

  if (!value) {
    return null;
  }

  if (/^https?:\/\//i.test(value) || value.startsWith("data:")) {
    return value;
  }

  if (value.startsWith("/storage/")) {
    return `${API_ORIGIN}${value}`;
  }

  if (/^storage\//i.test(value)) {
    return `${API_ORIGIN}/${value}`;
  }

  if (value.startsWith("/")) {
    return `${API_ORIGIN}${value}`;
  }

  return `${API_ORIGIN}/storage/${value.replace(/^\/+/, "")}`;
}
