import { STORAGE_KEYS } from "./storageKeys";

/**
 * تم‌های ظاهری فروشگاه.
 *
 * رنگ‌های فروشگاه از توکن‌های `@theme` در index.css می‌آیند؛ بنابراین تم
 * جایگزین فقط با ست‌کردن صفت `data-theme` روی <html> فعال می‌شود و هیچ
 * کلاسی در کامپوننت‌ها تغییر نمی‌کند.
 *
 * - `sage` (پیش‌فرض): سبز مریم‌گلی + کرم + صورتی/یاسی؛ صفت data-theme ست
 *   نمی‌شود تا خروجی HTML ساده بماند.
 * - `ocean`: سرمه‌ای #002941 + آبی پاستلی #b6dfed + کورال #fd6e6e.
 */
export type StorefrontTheme = "sage" | "ocean";

export interface StorefrontThemeOption {
  value: StorefrontTheme;
  label: string;
  hint: string;
  /** رنگ‌های نمونه برای پیش‌نمایش کوچک در سوییچ تم. */
  swatches: string[];
}

export const DEFAULT_THEME: StorefrontTheme = "sage";

export const STOREFRONT_THEMES: StorefrontThemeOption[] = [
  {
    value: "sage",
    label: "سبز مریم‌گلی",
    hint: "تم فعلی: کرم، سبز و یاسی",
    swatches: ["#faf9f4", "#4f7754", "#a2657b"],
  },
  {
    value: "ocean",
    label: "اقیانوس",
    hint: "سرمه‌ای، آبی پاستلی و کورال",
    swatches: ["#b6dfed", "#002941", "#fd6e6e"],
  },
];

/** پارامتر آدرس برای انتخاب تم بدون ذخیره‌سازی قبلی (مثل ?theme=ocean). */
export const THEME_QUERY_PARAM = "theme";

function isStorefrontTheme(value: string | null): value is StorefrontTheme {
  return value === "sage" || value === "ocean";
}

/** تم ذخیره‌شده در مرورگر (یا null اگر کاربر انتخابی نداشته باشد). */
export function readStoredTheme(): StorefrontTheme | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEYS.storefrontTheme);

    return isStorefrontTheme(stored) ? stored : null;
  } catch {
    return null;
  }
}

/** تم درخواستی از پارامتر آدرس (مثل ?theme=ocean). */
export function readThemeFromQuery(): StorefrontTheme | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const value = new URLSearchParams(window.location.search).get(
      THEME_QUERY_PARAM
    );

    return isStorefrontTheme(value) ? value : null;
  } catch {
    return null;
  }
}

/** تم فعال فعلی بر اساس صفت data-theme روی <html>. */
export function currentTheme(): StorefrontTheme {
  if (typeof document === "undefined") {
    return DEFAULT_THEME;
  }

  const attribute = document.documentElement.getAttribute("data-theme");

  return isStorefrontTheme(attribute) ? attribute : DEFAULT_THEME;
}

/**
 * اعمال تم روی صفحه.
 *
 * برای تم پیش‌فرض صفت حذف می‌شود تا فقط با بلوک `@theme` اصلی رندر شود.
 */
export function applyTheme(theme: StorefrontTheme): void {
  if (typeof document === "undefined") {
    return;
  }

  if (theme === DEFAULT_THEME) {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", theme);
  }
}

/** اعمال و ذخیرهٔ تم انتخاب‌شده توسط کاربر. */
export function setTheme(theme: StorefrontTheme): void {
  applyTheme(theme);

  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEYS.storefrontTheme, theme);
  } catch {
    /* ذخیره‌سازی مسدود است؛ تم فقط برای همین نشست اعمال می‌شود. */
  }
}

/**
 * تعیین و اعمال تم در شروع اجرای برنامه.
 *
 * اولویت: پارامتر ?theme= آدرس ← انتخاب ذخیره‌شده ← تم پیش‌فرض.
 * اگر تم از آدرس آمده باشد همان‌جا ذخیره می‌شود تا با حذف پارامتر هم بماند.
 */
export function initTheme(): StorefrontTheme {
  const fromQuery = readThemeFromQuery();

  if (fromQuery) {
    setTheme(fromQuery);

    return fromQuery;
  }

  const theme = readStoredTheme() ?? DEFAULT_THEME;

  applyTheme(theme);

  return theme;
}
