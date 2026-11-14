import { STORAGE_KEYS } from "../utils/storageKeys";

/**
 * تاریخچهٔ جست‌وجوهای کاربر.
 *
 * عبارت‌ها فقط در مرورگر خود کاربر ذخیره می‌شوند (بدون ارسال به سرور) و
 * در کادر جست‌وجوی هدر به‌عنوان پیشنهاد سریع نمایش داده می‌شوند. تعدادشان
 * کم نگه داشته می‌شود تا لیست کشویی شلوغ نشود.
 */

const SEARCH_HISTORY_KEY = STORAGE_KEYS.searchHistory;

/** حداکثر عبارت نگه‌داری‌شده در تاریخچه. */
export const SEARCH_HISTORY_LIMIT = 6;

/** رویدادی که پس از هر تغییر تاریخچه روی window منتشر می‌شود. */
export const SEARCH_HISTORY_EVENT = "behrang:search-history";

function notify(): void {
  window.dispatchEvent(new Event(SEARCH_HISTORY_EVENT));
}

/**
 * خواندن تاریخچه با پاک‌سازی دادهٔ خراب؛ عبارت‌های تکراری و خالی حذف
 * می‌شوند تا لیست همیشه قابل نمایش باشد.
 */
export function readSearchHistory(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(SEARCH_HISTORY_KEY);

    if (!stored) {
      return [];
    }

    const parsed: unknown = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [];
    }

    const seen = new Set<string>();
    const terms: string[] = [];

    parsed.forEach((item) => {
      if (typeof item !== "string") {
        return;
      }

      const term = item.trim();

      if (term === "" || seen.has(term)) {
        return;
      }

      seen.add(term);
      terms.push(term);
    });

    return terms.slice(0, SEARCH_HISTORY_LIMIT);
  } catch {
    return [];
  }
}

function writeSearchHistory(terms: string[]): void {
  try {
    window.localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(terms));
  } catch (error) {
    console.error("Search history storage error:", error);
  }

  notify();
}

/**
 * ثبت یک عبارت در ابتدای تاریخچه (عبارت‌های کوتاه‌تر از دو نویسه نادیده
 * گرفته می‌شوند چون جست‌وجوی واقعی هم با آن‌ها اجرا نمی‌شود).
 */
export function rememberSearch(term: string): string[] {
  const value = term.trim();

  if (value.length < 2) {
    return readSearchHistory();
  }

  const next = [
    value,
    ...readSearchHistory().filter((item) => item !== value),
  ].slice(0, SEARCH_HISTORY_LIMIT);

  writeSearchHistory(next);

  return next;
}

/** حذف یک عبارت از تاریخچه؛ لیست جدید برگردانده می‌شود. */
export function forgetSearch(term: string): string[] {
  const next = readSearchHistory().filter((item) => item !== term);

  writeSearchHistory(next);

  return next;
}

/** پاک کردن کامل تاریخچهٔ جست‌وجو. */
export function clearSearchHistory(): void {
  try {
    window.localStorage.removeItem(SEARCH_HISTORY_KEY);
  } catch (error) {
    console.error("Search history storage error:", error);
  }

  notify();
}
