import api from "./api";
import { STORAGE_KEYS } from "../utils/storageKeys";

/**
 * نوار اطلاع‌رسانی بالای هدر (تبلیغات و تخفیف‌های روزانه).
 *
 * تنظیمات ظاهری (ارتفاع، رنگ، سرعت تعویض) و آیتم‌ها (متن/تصویر/ویدیو) همه از
 * پنل مدیران می‌آیند؛ هیچ مقدار ثابتی در فرانت‌اند نیست. تا نوار در پنل
 * «فعال» نشود و آیتمی نداشته باشد، هیچ چیزی بالای هدر رندر نمی‌شود.
 *
 * کش مثل دسته‌بندی‌ها و تنظیمات فروشگاه است: حافظه → localStorage → شبکه
 * (stale-while-revalidate) تا نوار در اولین رندر هم بدون پرش چیدمان ظاهر شود.
 */
export type AnnouncementBarItemType = "text" | "image" | "video";

export type AnnouncementBarAnimation = "fade" | "slide" | "none";

export interface AnnouncementBarItem {
  id: number;
  type: AnnouncementBarItemType;
  /** متن اطلاع‌رسانی (برای آیتم متنی). */
  text: string | null;
  /** مسیر فایل تصویر یا ویدیو (برای آیتم تصویری/ویدیویی). */
  image: string | null;
  /** لینک مقصد؛ خالی یعنی آیتم کلیک‌پذیر نیست. */
  link: string | null;
  open_in_new_tab: boolean;
}

export interface AnnouncementBarConfig {
  enabled: boolean;
  /** ارتفاع نوار در دسکتاپ (پیکسل). */
  height: number;
  /** ارتفاع نوار در موبایل (پیکسل). */
  mobileHeight: number;
  backgroundColor: string;
  textColor: string;
  fontSize: number;
  /** فاصلهٔ تعویض آیتم‌ها (ثانیه). */
  interval: number;
  animation: AnnouncementBarAnimation;
  items: AnnouncementBarItem[];
}

export const DEFAULT_ANNOUNCEMENT_BAR: AnnouncementBarConfig = {
  enabled: false,
  height: 44,
  mobileHeight: 40,
  backgroundColor: "#385e3e",
  textColor: "#f7f8f2",
  fontSize: 13,
  interval: 6,
  animation: "fade",
  items: [],
};

interface AnnouncementBarCache {
  data: AnnouncementBarConfig;
  savedAt: number;
}

/** مدتی که دادهٔ کش‌شده بدون هیچ درخواستی نمایش داده می‌شود. */
const CACHE_TTL = 6 * 60 * 60 * 1000;

/** بعد از این مدت داده فوراً نمایش داده می‌شود و در پس‌زمینه تازه می‌شود. */
const REVALIDATE_AFTER = 2 * 60 * 1000;

let memoryCache: AnnouncementBarCache | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toNumber(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(Math.round(parsed), min), max);
}

function toColor(value: unknown, fallback: string): string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value.trim())
    ? value.trim()
    : fallback;
}

function toType(value: unknown): AnnouncementBarItemType {
  return value === "image" || value === "video" ? value : "text";
}

function normalizeItem(raw: unknown): AnnouncementBarItem | null {
  if (!isRecord(raw)) {
    return null;
  }

  const id = Number(raw.id);

  if (!Number.isFinite(id)) {
    return null;
  }

  const type = toType(raw.type);
  const text = typeof raw.text === "string" ? raw.text.trim() : "";
  const image = typeof raw.image === "string" ? raw.image.trim() : "";

  // آیتم بدون محتوای قابل نمایش (متن خالی یا فایل ثبت‌نشده) نادیده گرفته
  // می‌شود تا نوار هرگز خالی یا شکسته رندر نشود.
  if (type === "text" ? text === "" : image === "") {
    return null;
  }

  const link =
    typeof raw.link === "string" && raw.link.trim() !== ""
      ? raw.link.trim()
      : null;

  return {
    id,
    type,
    text: text === "" ? null : text,
    image: image === "" ? null : image,
    link,
    open_in_new_tab: raw.open_in_new_tab === true,
  };
}

function normalize(raw: unknown): AnnouncementBarConfig {
  const source = isRecord(raw) ? raw : {};
  const rawItems = Array.isArray(source.items) ? source.items : [];

  const items = rawItems
    .map(normalizeItem)
    .filter((item): item is AnnouncementBarItem => item !== null);

  return {
    enabled: source.enabled === true,
    height: toNumber(source.height, DEFAULT_ANNOUNCEMENT_BAR.height, 24, 120),
    mobileHeight: toNumber(
      source.mobile_height,
      DEFAULT_ANNOUNCEMENT_BAR.mobileHeight,
      24,
      120,
    ),
    backgroundColor: toColor(
      source.background_color,
      DEFAULT_ANNOUNCEMENT_BAR.backgroundColor,
    ),
    textColor: toColor(source.text_color, DEFAULT_ANNOUNCEMENT_BAR.textColor),
    fontSize: toNumber(source.font_size, DEFAULT_ANNOUNCEMENT_BAR.fontSize, 9, 24),
    interval: toNumber(source.interval, DEFAULT_ANNOUNCEMENT_BAR.interval, 2, 60),
    animation:
      source.animation === "slide" || source.animation === "none"
        ? source.animation
        : "fade",
    items,
  };
}

let inFlightRequest: Promise<AnnouncementBarConfig> | null = null;

function writeStoredCache(cache: AnnouncementBarCache): void {
  try {
    window.localStorage.setItem(
      STORAGE_KEYS.storefrontAnnouncementBar,
      JSON.stringify(cache),
    );
  } catch {
    // در دسترس نبودن Storage مانع نمایش نوار نمی‌شود؛ کش حافظه‌ای کافی است.
  }
}

function readStoredCache(): AnnouncementBarCache | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(
      STORAGE_KEYS.storefrontAnnouncementBar,
    );

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as AnnouncementBarCache;

    if (!isRecord(parsed) || typeof parsed.savedAt !== "number") {
      return null;
    }

    if (Date.now() - parsed.savedAt >= CACHE_TTL) {
      window.localStorage.removeItem(STORAGE_KEYS.storefrontAnnouncementBar);
      return null;
    }

    return { data: normalize(parsed.data), savedAt: parsed.savedAt };
  } catch {
    return null;
  }
}

/**
 * آخرین نوار کش‌شده (بدون درخواست شبکه)؛ برای مقدار اولیهٔ رندر.
 */
export function getCachedAnnouncementBar(): AnnouncementBarConfig | null {
  if (memoryCache === null) {
    memoryCache = readStoredCache();
  }

  return memoryCache?.data ?? null;
}

/**
 * نوار اطلاع‌رسانی را از سرور می‌خواند (با کش و ادغام درخواست‌های هم‌زمان).
 */
export function fetchAnnouncementBar(
  options: { force?: boolean } = {},
): Promise<AnnouncementBarConfig> {
  const cached = getCachedAnnouncementBar();
  const isFresh =
    memoryCache !== null && Date.now() - memoryCache.savedAt < REVALIDATE_AFTER;

  if (!options.force && cached !== null && isFresh) {
    return Promise.resolve(cached);
  }

  if (inFlightRequest !== null) {
    return inFlightRequest;
  }

  inFlightRequest = api
    .get("/announcement-bar")
    .then((response) => {
      const config = normalize(response.data?.data);

      memoryCache = { data: config, savedAt: Date.now() };
      writeStoredCache(memoryCache);

      return config;
    })
    .catch((error) => {
      console.error("دریافت نوار اطلاع‌رسانی ناموفق بود:", error);

      if (cached !== null) {
        return cached;
      }

      memoryCache = { data: DEFAULT_ANNOUNCEMENT_BAR, savedAt: Date.now() };

      return DEFAULT_ANNOUNCEMENT_BAR;
    })
    .finally(() => {
      inFlightRequest = null;
    });

  return inFlightRequest;
}

/** پاک‌کردن کش نوار (مثلاً بعد از تغییر تنظیمات در پنل مدیران). */
export function invalidateAnnouncementBarCache(): void {
  memoryCache = null;

  try {
    window.localStorage.removeItem(STORAGE_KEYS.storefrontAnnouncementBar);
  } catch {
    // نادیده گرفتن خطای Storage
  }
}

