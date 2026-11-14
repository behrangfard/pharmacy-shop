import api from "./api";
import { STORAGE_KEYS } from "../utils/storageKeys";

/**
 * تنظیمات هدر و فوتر سایت.
 *
 * همهٔ مقادیر از پنل مدیران (بخش «هدر و فوتر») می‌آیند؛ مقدار خالی در هر فیلد
 * یعنی کامپوننت همان متن پیش‌فرض خودش را نشان دهد. کش مثل تنظیمات فروشگاه
 * است: حافظه → localStorage → شبکه (stale-while-revalidate).
 */
export interface HeaderFooterLink {
  label: string;
  url: string;
}

/**
 * آیکن‌های مجاز ردیف‌های ستون «خدمات مشتریان» فوتر.
 * هماهنگ با `SERVICE_ICONS` در `backend/app/Http/Controllers/Api/
 * HeaderFooterController.php`؛ آیکن تازه باید در هر دو جا اضافه شود.
 */
export const FOOTER_SERVICE_ICONS = [
  { value: "shopping-bag", label: "سبد خرید" },
  { value: "truck", label: "ارسال" },
  { value: "headset", label: "پشتیبانی" },
  { value: "package-check", label: "سفارش‌ها" },
  { value: "phone", label: "تلفن" },
  { value: "mail", label: "ایمیل" },
  { value: "map-pin", label: "نشانی" },
  { value: "shield-check", label: "اعتماد و مجوز" },
  { value: "sparkles", label: "ویژه" },
  { value: "heart", label: "علاقه‌مندی" },
  { value: "credit-card", label: "پرداخت" },
  { value: "gift", label: "هدیه" },
  { value: "help-circle", label: "پرسش متداول" },
  { value: "file-text", label: "مقاله و راهنما" },
  { value: "wallet", label: "کیف پول" },
  { value: "rotate-ccw", label: "بازگشت کالا" },
] as const;

/** نام آیکن مجاز برای ردیف‌های «خدمات مشتریان». */
export type FooterServiceIcon = (typeof FOOTER_SERVICE_ICONS)[number]["value"];

/**
 * رفتار ردیف:
 * - `none`: فقط متن راهنما (غیرکلیک‌پذیر)
 * - `url`: بازکردن نشانی/تلفن/ایمیل
 * - `support`: بازکردن پنجرهٔ چت پشتیبانی سایت
 */
export type FooterServiceAction = "none" | "url" | "support";

/** یک ردیف ستون «خدمات مشتریان» فوتر. */
export interface FooterServiceItem {
  title: string;
  description: string;
  icon: FooterServiceIcon;
  action: FooterServiceAction;
  url: string;
}

/** بیشینهٔ تعداد ردیف‌های «خدمات مشتریان» (هماهنگ با بک‌اند). */
export const FOOTER_SERVICES_MAX = 8;


export interface HeaderFooterSettings {
  store_name: string;
  header_logo_text: string;
  header_tagline: string;
  header_show_search: boolean;
  header_cta_enabled: boolean;
  header_cta_label: string;
  header_cta_url: string;
  header_cta_new_tab: boolean;
  footer_about_title: string;
  footer_about_text: string;
  footer_highlight_title: string;
  footer_highlight_text: string;
  footer_copyright: string;
  footer_quick_links: HeaderFooterLink[];
  /** عنوان ستون «خدمات مشتریان»؛ خالی یعنی همان عنوان پیش‌فرض. */
  footer_services_title: string;
  /** ردیف‌های ستون «خدمات مشتریان» (قابل ویرایش از پنل). */
  footer_services: FooterServiceItem[];
  /** نمایش ردیف‌های خودکار تلفن، ایمیل و نشانی زیر ردیف‌های بالا. */
  footer_show_contact: boolean;
}

export const DEFAULT_HEADER_FOOTER: HeaderFooterSettings = {
  store_name: "بهرنگ شاپ",
  header_logo_text: "بهرنگ شاپ",
  header_tagline: "",
  header_show_search: true,
  header_cta_enabled: false,
  header_cta_label: "تخفیف‌های امروز",
  header_cta_url: "/products",
  header_cta_new_tab: false,
  footer_about_title: "",
  footer_about_text:
    "تلاش ما ارائه تجربه‌ای ساده، سریع و مطمئن برای خرید لباس زیر باکیفیت و راحت است. می‌خواهیم انتخاب محصولات موردنیازتان تجربه‌ای دلنشین و آسان باشد.",
  footer_highlight_title: "خریدی آسان و دلنشین",
  footer_highlight_text:
    "از انتخاب محصول تا ثبت سفارش، تجربه‌ای ساده و راحت داشته باشید.",
  footer_copyright: "",
  footer_quick_links: [
    { label: "فروشگاه", url: "/products" },
    { label: "ست لباس زیر", url: "/products?category=lingerie-sets" },
    { label: "لباس خواب", url: "/products?category=sleepwear" },
    { label: "مشاهده محصولات", url: "/products" },
    { label: "راهنمای انتخاب سایز", url: "/size-guide" },
    { label: "مقالات و راهنمای خرید", url: "/articles" },
  ],
  footer_services_title: "",
  footer_services: [
    {
      title: "راهنمای خرید",
      description: "انتخاب و ثبت سفارش محصولات",
      icon: "shopping-bag",
      action: "none",
      url: "",
    },
    {
      title: "روش‌های ارسال",
      description: "اطلاعات ارسال سفارش‌ها",
      icon: "truck",
      action: "none",
      url: "",
    },
    {
      title: "پشتیبانی",
      description: "همراه شما در مسیر خرید",
      icon: "headset",
      action: "support",
      url: "",
    },
    {
      title: "حساب کاربری و سفارش‌ها",
      description: "",
      icon: "package-check",
      action: "url",
      url: "/account",
    },
  ],
  footer_show_contact: true,
};

/** بیشینهٔ تعداد لینک سریع فوتر (هماهنگ با بک‌اند). */
export const HEADER_FOOTER_QUICK_LINKS_MAX = 12;

interface HeaderFooterCache {
  data: HeaderFooterSettings;
  savedAt: number;
}

const CACHE_TTL = 6 * 60 * 60 * 1000;
const REVALIDATE_AFTER = 5 * 60 * 1000;

let memoryCache: HeaderFooterCache | null = null;
let inFlightRequest: Promise<HeaderFooterSettings> | null = null;

const listeners = new Set<(settings: HeaderFooterSettings) => void>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function text(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() !== "" ? value : fallback;
}

function bool(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}

function normalizeQuickLinks(raw: unknown): HeaderFooterLink[] {
  if (!Array.isArray(raw)) return [];

  const links: HeaderFooterLink[] = [];

  for (const item of raw) {
    if (!isRecord(item)) continue;

    const label = typeof item.label === "string" ? item.label.trim() : "";
    const url = typeof item.url === "string" ? item.url.trim() : "";

    if (!label || !url) continue;

    links.push({ label, url });

    if (links.length >= HEADER_FOOTER_QUICK_LINKS_MAX) break;
  }

  return links;
}

const SERVICE_ICON_VALUES = FOOTER_SERVICE_ICONS.map((icon) => icon.value);

/** ردیف‌های «خدمات مشتریان» را از پاسخ API پاک‌سازی می‌کند. */
function normalizeServices(raw: unknown): FooterServiceItem[] {
  if (!Array.isArray(raw)) return [];

  const items: FooterServiceItem[] = [];

  for (const item of raw) {
    if (!isRecord(item)) continue;

    const title = typeof item.title === "string" ? item.title.trim() : "";

    if (!title) continue;

    const icon = SERVICE_ICON_VALUES.includes(
      item.icon as FooterServiceIcon,
    )
      ? (item.icon as FooterServiceIcon)
      : "sparkles";

    const action: FooterServiceAction =
      item.action === "url" || item.action === "support"
        ? item.action
        : "none";

    items.push({
      title,
      description:
        typeof item.description === "string" ? item.description.trim() : "",
      icon,
      action,
      url: typeof item.url === "string" ? item.url.trim() : "",
    });

    if (items.length >= FOOTER_SERVICES_MAX) break;
  }

  return items;
}

function normalize(raw: unknown): HeaderFooterSettings {
  const source = isRecord(raw) ? raw : {};

  return {
    store_name: text(source.store_name, DEFAULT_HEADER_FOOTER.store_name),
    header_logo_text: text(
      source.header_logo_text,
      DEFAULT_HEADER_FOOTER.header_logo_text,
    ),
    header_tagline: text(source.header_tagline, ""),
    header_show_search: source.header_show_search === undefined
      ? DEFAULT_HEADER_FOOTER.header_show_search
      : bool(source.header_show_search),
    header_cta_enabled: bool(source.header_cta_enabled),
    header_cta_label: text(
      source.header_cta_label,
      DEFAULT_HEADER_FOOTER.header_cta_label,
    ),
    header_cta_url: text(source.header_cta_url, DEFAULT_HEADER_FOOTER.header_cta_url),
    header_cta_new_tab: bool(source.header_cta_new_tab),
    footer_about_title: text(source.footer_about_title, ""),
    footer_about_text: text(
      source.footer_about_text,
      DEFAULT_HEADER_FOOTER.footer_about_text,
    ),
    footer_highlight_title: text(
      source.footer_highlight_title,
      DEFAULT_HEADER_FOOTER.footer_highlight_title,
    ),
    footer_highlight_text: text(
      source.footer_highlight_text,
      DEFAULT_HEADER_FOOTER.footer_highlight_text,
    ),
    footer_copyright: text(source.footer_copyright, ""),
    footer_quick_links: normalizeQuickLinks(
      source.footer_quick_links ?? DEFAULT_HEADER_FOOTER.footer_quick_links,
    ),
    footer_services_title: text(source.footer_services_title, ""),
    footer_services: normalizeServices(
      source.footer_services ?? DEFAULT_HEADER_FOOTER.footer_services,
    ),
    footer_show_contact:
      source.footer_show_contact === undefined
        ? DEFAULT_HEADER_FOOTER.footer_show_contact
        : bool(source.footer_show_contact),
  };
}

function readStoredCache(): HeaderFooterCache | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.storefrontHeaderFooter);

    if (!raw) return null;

    const parsed = JSON.parse(raw) as HeaderFooterCache;

    if (!parsed?.data || typeof parsed.savedAt !== "number") {
      return null;
    }

    if (Date.now() - parsed.savedAt >= CACHE_TTL) {
      return null;
    }

    return { data: normalize(parsed.data), savedAt: parsed.savedAt };
  } catch {
    return null;
  }
}

function writeStoredCache(cache: HeaderFooterCache): void {
  try {
    window.localStorage.setItem(
      STORAGE_KEYS.storefrontHeaderFooter,
      JSON.stringify(cache),
    );
  } catch {
    // در صورت در دسترس نبودن Storage، کش حافظه‌ای کافی است.
  }
}

function notify(settings: HeaderFooterSettings): void {
  listeners.forEach((listener) => listener(settings));
}

/** آخرین تنظیمات شناخته‌شده (کش حافظه/مرورگر یا پیش‌فرض) بدون درخواست شبکه. */
export function readCachedHeaderFooter(): HeaderFooterSettings {
  if (memoryCache) return memoryCache.data;

  const stored = readStoredCache();

  if (stored) {
    memoryCache = stored;
    return stored.data;
  }

  return DEFAULT_HEADER_FOOTER;
}

export async function fetchHeaderFooter(
  force = false,
): Promise<HeaderFooterSettings> {
  const cached = memoryCache ?? readStoredCache();
  const isFresh =
    cached !== null && Date.now() - cached.savedAt < REVALIDATE_AFTER;

  if (!force && isFresh) {
    return cached.data;
  }

  if (inFlightRequest) {
    return inFlightRequest;
  }

  inFlightRequest = api
    .get("/header-footer")
    .then((response) => {
      const settings = normalize(response.data?.data);
      const cache: HeaderFooterCache = { data: settings, savedAt: Date.now() };

      memoryCache = cache;
      writeStoredCache(cache);
      notify(settings);

      return settings;
    })
    .catch((error) => {
      console.error("Failed to load header/footer settings:", error);

      const fallback = cached?.data ?? DEFAULT_HEADER_FOOTER;
      memoryCache = memoryCache ?? { data: fallback, savedAt: Date.now() };

      return fallback;
    })
    .finally(() => {
      inFlightRequest = null;
    });

  return inFlightRequest;
}

export function invalidateHeaderFooterCache(): void {
  memoryCache = null;

  try {
    window.localStorage.removeItem(STORAGE_KEYS.storefrontHeaderFooter);
  } catch {
    // نادیده گرفتن خطای Storage
  }
}

export function subscribeHeaderFooter(
  listener: (settings: HeaderFooterSettings) => void,
): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

