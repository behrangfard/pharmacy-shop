/**
 * آدرس‌دهی متمرکز به فایل‌های ذخیره‌شده در بک‌اند (پوشه storage).
 *
 * آدرس پایه در `utils/apiOrigin.ts` تعیین می‌شود (بر پایهٔ `VITE_API_URL`)؛
 * بنابراین در محیط تولید فقط با تنظیم همان متغیر محیطی، همه لینک‌های تصویر به
 * دامنه واقعی منتقل می‌شوند و برای تست روی شبکهٔ محلی هم خودکار هم‌تراز می‌شوند.
 * پیش از این، آدرس بک‌اند در چند فایل به‌صورت هاردکد تکرار شده بود.
 */

import { API_ORIGIN } from "./apiOrigin";

export { API_ORIGIN };

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

  /**
   * تصاویر آمادهٔ خودِ سایت (پوشهٔ frontend/public/images) در بک‌اند وجود
   * ندارند؛ پس نباید با API_ORIGIN ترکیب شوند. مسیر را همان‌طور نسبی برمی‌گردانیم
   * تا از دامنهٔ فرانت‌اند سرو شود. (مثلاً بنری که روی تصویر پیش‌فرض هیرو ساخته
   * می‌شود.)
   */
  if (/^\/?images\//i.test(value)) {
    return value.startsWith("/") ? value : `/${value}`;
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
