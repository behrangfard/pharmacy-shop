import { STORAGE_KEYS } from "./storageKeys";

/**
 * حالت روشن/تاریک فروشگاه (Dark Mode).
 *
 * محور جداگانه‌ای از «تم رنگ» (`data-theme="sage|ocean"`) است: تم، پالت سبز یا
 * سرمه‌ای را عوض می‌کند و حالت تاریک همان پالت را برای محیط کم‌نور برمی‌گرداند.
 * پیاده‌سازی صفت `data-mode="dark"` را روی <html> می‌گذارد؛ بلوک CSS داخل
 * `index.css` فقط متغیرهای `@theme` را داخل `.sf-theme` (پوستهٔ فروشگاه)
 * بازتعریف می‌کند تا پنل مدیریت دست‌نخورده بماند.
 *
 * اولویت انتخاب: پارامتر `?mode=` آدرس ← انتخاب ذخیره‌شده ← تنظیم سیستم‌عامل.
 * تا وقتی کاربر خودش انتخاب نکند، تغییر تنظیم سیستم‌عامل هم زنده دنبال می‌شود.
 */
export type ColorMode = "light" | "dark";

export const COLOR_MODE_ATTRIBUTE = "data-mode";

/** پارامتر آدرس برای تست/اشتراک لینک حالت تاریک (مثل ?mode=dark). */
export const COLOR_MODE_QUERY_PARAM = "mode";

/** رنگ نوار بالای مرورگر موبایل در هر حالت. */
const THEME_COLOR: Record<ColorMode, string> = {
  light: "#faf9f4",
  dark: "#0f1713",
};

function isColorMode(value: string | null): value is ColorMode {
  return value === "light" || value === "dark";
}

/** حالت ذخیره‌شده در مرورگر (یا null اگر کاربر انتخابی نداشته باشد). */
export function readStoredColorMode(): ColorMode | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(
      STORAGE_KEYS.storefrontColorMode,
    );

    return isColorMode(stored) ? stored : null;
  } catch {
    return null;
  }
}

/** حالت درخواستی از پارامتر آدرس (مثل ?mode=dark). */
export function readColorModeFromQuery(): ColorMode | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const value = new URLSearchParams(window.location.search).get(
      COLOR_MODE_QUERY_PARAM,
    );

    return isColorMode(value) ? value : null;
  } catch {
    return null;
  }
}

/** حالت ترجیحی سیستم‌عامل؛ اگر پرسشی ممکن نباشد، روشن. */
export function systemColorMode(): ColorMode {
  if (typeof window === "undefined" || !window.matchMedia) {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/** حالت فعال فعلی بر اساس صفت data-mode روی <html>. */
export function currentColorMode(): ColorMode {
  if (typeof document === "undefined") {
    return "light";
  }

  const attribute = document.documentElement.getAttribute(
    COLOR_MODE_ATTRIBUTE,
  );

  return attribute === "dark" ? "dark" : "light";
}

/**
 * اعمال حالت روی صفحه.
 *
 * برای حالت روشن صفت حذف می‌شود تا استایل پیش‌فرض (بدون صفت) برقرار بماند.
 * `color-scheme` عمداً روی <html> ست نمی‌شود؛ فقط داخل `.sf-theme` (CSS) تا
 * کنترل‌های بومی پنل مدیریت پس از فعال‌کردن حالت تاریکِ فروشگاه تیره نشوند.
 */
export function applyColorMode(mode: ColorMode): void {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;

  if (mode === "dark") {
    root.setAttribute(COLOR_MODE_ATTRIBUTE, "dark");
  } else {
    root.removeAttribute(COLOR_MODE_ATTRIBUTE);
  }

  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", THEME_COLOR[mode]);
}

/** اعمال و ذخیرهٔ حالت انتخاب‌شده توسط کاربر. */
export function setColorMode(mode: ColorMode): void {
  applyColorMode(mode);

  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEYS.storefrontColorMode, mode);
  } catch {
    /* ذخیره‌سازی مسدود است؛ حالت فقط برای همین نشست اعمال می‌شود. */
  }
}

/** جابه‌جایی بین روشن و تاریک (برای دکمهٔ هدر). */
export function toggleColorMode(): ColorMode {
  const next: ColorMode = currentColorMode() === "dark" ? "light" : "dark";

  setColorMode(next);

  return next;
}

let systemListenerBound = false;

/**
 * تعیین و اعمال حالت در شروع اجرای برنامه.
 *
 * اگر کاربر هنوز انتخابی نکرده باشد، تا پایان نشست تنظیم سیستم‌عامل زنده دنبال
 * می‌شود؛ اولین انتخاب کاربر با ذخیره در localStorage این دنبال‌کردن را متوقف
 * می‌کند.
 */
export function initColorMode(): ColorMode {
  const fromQuery = readColorModeFromQuery();

  if (fromQuery) {
    setColorMode(fromQuery);

    return fromQuery;
  }

  const stored = readStoredColorMode();
  const mode = stored ?? systemColorMode();

  applyColorMode(mode);

  if (!stored && !systemListenerBound && typeof window !== "undefined") {
    systemListenerBound = true;

    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", () => {
        if (readStoredColorMode() === null) {
          applyColorMode(systemColorMode());
        }
      });
  }

  return mode;
}
