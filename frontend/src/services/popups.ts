import api from "./api";
import { STORAGE_KEYS } from "../utils/storageKeys";

/**
 * پاپ‌آپ‌های تبلیغاتی فروشگاه.
 *
 * فهرست از `/popups` می‌آید (فقط پاپ‌آپ‌های فعالِ داخل بازهٔ زمانی). انتخاب
 * «کدام پاپ‌آپ برای این بازدیدکننده و در این صفحه نمایش داده شود» سمت مرورگر
 * انجام می‌شود: هدف‌گیری صفحه/دستگاه + قاعدهٔ تکرار (هر نشست، روزی یک‌بار،
 * هفتگی، یک‌بار برای همیشه). کش مثل استوری‌ها stale-while-revalidate است تا
 * باز شدن سایت هیچ درخواست اضافه‌ای به مسیر رندر اضافه نکند.
 */
export type PopupTheme = "light" | "dark" | "brand";
export type PopupLayout = "center" | "bottom" | "corner";
export type PopupImagePosition = "top" | "side";
export type PopupDevice = "all" | "desktop" | "mobile";
export type PopupFrequency = "always" | "session" | "daily" | "weekly" | "once";
export type PopupPage = "home" | "products" | "product" | "cart" | "checkout";

export interface StorefrontPopupRecord {
  id: number;
  title: string;
  badge: string;
  description: string;
  image: string;
  image_alt: string;
  theme: PopupTheme;
  layout: PopupLayout;
  image_position: PopupImagePosition;
  cta_text: string;
  cta_link: string;
  secondary_text: string;
  secondary_link: string;
  coupon_code: string;
  display_pages: PopupPage[];
  devices: PopupDevice;
  delay_seconds: number;
  auto_close_seconds: number;
  frequency: PopupFrequency;
  ends_at: string | null;
  countdown_to: string | null;
  close_on_backdrop: boolean;
  show_close: boolean;
}

interface PopupCache {
  data: StorefrontPopupRecord[];
  savedAt: number;
}

/** مدتی که دادهٔ کش‌شده بدون درخواست نمایش داده می‌شود. */
const CACHE_TTL = 60 * 60 * 1000;

/** بعد از این مدت داده فوراً می‌آید و در پس‌زمینه تازه می‌شود. */
const REVALIDATE_AFTER = 2 * 60 * 1000;

/** عمر رکورد «بسته‌شده» تا کلید ذخیره‌سازی بی‌نهایت رشد نکند. */
const SEEN_TTL = 90 * 24 * 60 * 60 * 1000;

let memoryCache: PopupCache | null = null;
let inFlightRequest: Promise<StorefrontPopupRecord[]> | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function toNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNullableIso(value: unknown): string | null {
  const raw = text(value);

  if (raw === "") {
    return null;
  }

  const parsed = Date.parse(raw);

  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
}

function normalizePopup(raw: unknown): StorefrontPopupRecord | null {
  if (!isRecord(raw)) {
    return null;
  }

  const id = Number(raw.id);

  if (!Number.isFinite(id)) {
    return null;
  }

  const title = text(raw.title);
  const description = text(raw.description);
  const image = text(raw.image);

  // پاپ‌آپ بدون هیچ محتوایی رندر نمی‌شود (همان قاعدهٔ سمت سرور).
  if (title === "" && description === "" && image === "") {
    return null;
  }

  const pages = Array.isArray(raw.display_pages)
    ? (raw.display_pages.filter(
        (page): page is PopupPage =>
          typeof page === "string" &&
          (["home", "products", "product", "cart", "checkout"] as string[]).includes(
            page,
          ),
      ) as PopupPage[])
    : [];

  return {
    id,
    title,
    badge: text(raw.badge),
    description,
    image,
    image_alt: text(raw.image_alt),
    theme: oneOf(raw.theme, ["light", "dark", "brand"] as const, "light"),
    layout: oneOf(raw.layout, ["center", "bottom", "corner"] as const, "center"),
    image_position: oneOf(raw.image_position, ["top", "side"] as const, "top"),
    cta_text: text(raw.cta_text),
    cta_link: text(raw.cta_link),
    secondary_text: text(raw.secondary_text),
    secondary_link: text(raw.secondary_link),
    coupon_code: text(raw.coupon_code),
    display_pages: pages,
    devices: oneOf(raw.devices, ["all", "desktop", "mobile"] as const, "all"),
    delay_seconds: Math.min(Math.max(toNumber(raw.delay_seconds, 0), 0), 30),
    auto_close_seconds: Math.min(Math.max(toNumber(raw.auto_close_seconds, 0), 0), 120),
    frequency: oneOf(
      raw.frequency,
      ["always", "session", "daily", "weekly", "once"] as const,
      "session",
    ),
    ends_at: toNullableIso(raw.ends_at),
    countdown_to: toNullableIso(raw.countdown_to),
    close_on_backdrop: raw.close_on_backdrop !== false,
    show_close: raw.show_close !== false,
  };
}

function normalize(raw: unknown): StorefrontPopupRecord[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map(normalizePopup)
    .filter((popup): popup is StorefrontPopupRecord => popup !== null);
}

function readStoredCache(): PopupCache | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.storefrontPopups);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as PopupCache;

    if (!isRecord(parsed) || typeof parsed.savedAt !== "number") {
      return null;
    }

    if (Date.now() - parsed.savedAt >= CACHE_TTL) {
      window.localStorage.removeItem(STORAGE_KEYS.storefrontPopups);
      return null;
    }

    return { data: normalize(parsed.data), savedAt: parsed.savedAt };
  } catch {
    return null;
  }
}

function writeStoredCache(cache: PopupCache): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      STORAGE_KEYS.storefrontPopups,
      JSON.stringify(cache),
    );
  } catch {
    // نادیده گرفتن خطای Storage (مثلاً حالت ناشناس)
  }
}

/** آخرین فهرست کش‌شده (بدون درخواست شبکه)؛ برای مقدار اولیهٔ رندر. */
export function getCachedPopups(): StorefrontPopupRecord[] {
  if (memoryCache === null) {
    memoryCache = readStoredCache();
  }

  return memoryCache?.data ?? [];
}

/** فهرست پاپ‌آپ‌ها را از سرور می‌خواند (با کش و ادغام درخواست‌های هم‌زمان). */
export function fetchPopups(
  options: { force?: boolean } = {},
): Promise<StorefrontPopupRecord[]> {
  const cached = getCachedPopups();
  const isFresh =
    memoryCache !== null && Date.now() - memoryCache.savedAt < REVALIDATE_AFTER;

  if (!options.force && memoryCache !== null && isFresh) {
    return Promise.resolve(cached);
  }

  if (inFlightRequest !== null) {
    return inFlightRequest;
  }

  inFlightRequest = api
    .get("/popups")
    .then((response) => {
      const popups = normalize(response.data?.data);

      memoryCache = { data: popups, savedAt: Date.now() };
      writeStoredCache(memoryCache);

      return popups;
    })
    .catch((error) => {
      console.error("دریافت پاپ‌آپ‌ها ناموفق بود:", error);

      if (memoryCache !== null) {
        return memoryCache.data;
      }

      memoryCache = { data: [], savedAt: Date.now() };

      return [];
    })
    .finally(() => {
      inFlightRequest = null;
    });

  return inFlightRequest;
}

/** پاک‌کردن کش پاپ‌آپ‌ها. */
export function invalidatePopupsCache(): void {
  memoryCache = null;

  try {
    window.localStorage.removeItem(STORAGE_KEYS.storefrontPopups);
  } catch {
    // نادیده گرفتن خطای Storage
  }
}

/**
 * صفحهٔ منطقی مسیر جاری برای هدف‌گیری پاپ‌آپ.
 * مسیرهای ناشناخته null برمی‌گردانند (پاپ‌آپ‌های هدف‌دار آنجا نمایش داده نمی‌شوند).
 */
export function popupPageForPath(pathname: string): PopupPage | null {
  const path = pathname.replace(/\/+$/, "") || "/";

  if (path === "/") return "home";
  if (path === "/products") return "products";
  if (path.startsWith("/product/")) return "product";
  if (path === "/cart") return "cart";
  if (path.startsWith("/checkout")) return "checkout";

  return null;
}

/** آیا این پاپ‌آپ برای صفحهٔ جاری هدف‌گذاری شده است؟ */
export function isPopupForPage(
  popup: StorefrontPopupRecord,
  page: PopupPage | null,
): boolean {
  // فهرست خالی یعنی «همهٔ صفحه‌ها».
  if (popup.display_pages.length === 0) {
    return true;
  }

  return page !== null && popup.display_pages.includes(page);
}

/** آیا این پاپ‌آپ برای عرض صفحهٔ فعلی (دستگاه) مناسب است؟ */
export function isPopupForDevice(
  popup: StorefrontPopupRecord,
  isMobileViewport: boolean,
): boolean {
  if (popup.devices === "all") {
    return true;
  }

  return popup.devices === "mobile" ? isMobileViewport : !isMobileViewport;
}

interface PopupSeenEntry {
  at: number;
  session: string;
}

type PopupSeenMap = Record<string, PopupSeenEntry>;

/** فاصلهٔ زمانی مجاز برای تکرار هر قاعده (قاعده‌های تمام‌شده اینجا نیستند). */
const FREQUENCY_WINDOW: Partial<Record<PopupFrequency, number>> = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
};

/**
 * شناسهٔ نشست فعلی مرورگر.
 *
 * با بستن تب و باز کردن تب جدید، sessionStorage پاک می‌شود و پاپ‌آپ‌های
 * «هر نشست یک‌بار» دوباره نمایش داده می‌شوند.
 */
function currentSessionId(): string {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    const existing = window.sessionStorage.getItem(STORAGE_KEYS.popupsSession);

    if (existing) {
      return existing;
    }

    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    window.sessionStorage.setItem(STORAGE_KEYS.popupsSession, id);

    return id;
  } catch {
    return "";
  }
}

function readSeenMap(): PopupSeenMap {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.popupsSeen);

    if (!raw) {
      return {};
    }

    const parsed: unknown = JSON.parse(raw);

    if (!isRecord(parsed)) {
      return {};
    }

    const now = Date.now();
    const seen: PopupSeenMap = {};

    Object.entries(parsed).forEach(([key, value]) => {
      if (!isRecord(value)) {
        return;
      }

      const at = typeof value.at === "number" ? value.at : 0;

      // رکوردهای خیلی قدیمی پاک می‌شوند تا کلید ذخیره‌سازی بزرگ نشود.
      if (!Number.isFinite(at) || now - at >= SEEN_TTL) {
        return;
      }

      seen[key] = {
        at,
        session: typeof value.session === "string" ? value.session : "",
      };
    });

    return seen;
  } catch {
    return {};
  }
}

function writeSeenMap(map: PopupSeenMap): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEYS.popupsSeen, JSON.stringify(map));
  } catch {
    // نادیده گرفتن خطای Storage
  }
}

/** آیا قاعدهٔ تکرار اجازهٔ نمایش این پاپ‌آپ را می‌دهد؟ */
export function shouldShowPopup(popup: StorefrontPopupRecord): boolean {
  if (popup.frequency === "always") {
    return true;
  }

  const record = readSeenMap()[String(popup.id)];

  if (!record) {
    return true;
  }

  if (popup.frequency === "once") {
    return false;
  }

  if (popup.frequency === "session") {
    return record.session !== currentSessionId();
  }

  const windowMs = FREQUENCY_WINDOW[popup.frequency] ?? 0;

  return Date.now() - record.at >= windowMs;
}

/** ثبت «بسته شد» تا طبق قاعدهٔ frequency دوباره مزاحم نشود. */
export function markPopupDismissed(popup: StorefrontPopupRecord): void {
  if (typeof window === "undefined") {
    return;
  }

  const map = readSeenMap();
  map[String(popup.id)] = { at: Date.now(), session: currentSessionId() };
  writeSeenMap(map);
}

/**
 * اولین پاپ‌آپ واجد شرایط برای مسیر و دستگاه جاری.
 * ترتیب فهرست همان اولویت sort_order سرور است.
 */
export function pickPopup(
  popups: StorefrontPopupRecord[],
  pathname: string,
  options: { isMobileViewport: boolean },
): StorefrontPopupRecord | null {
  const page = popupPageForPath(pathname);
  const now = Date.now();

  for (const popup of popups) {
    if (!isPopupForPage(popup, page) || !isPopupForDevice(popup, options.isMobileViewport)) {
      continue;
    }

    // محافظت سمت کلاینت در برابر کش قدیمی: کمپین منقضی نمایش داده نمی‌شود.
    if (popup.ends_at !== null && Date.parse(popup.ends_at) <= now) {
      continue;
    }

    if (shouldShowPopup(popup)) {
      return popup;
    }
  }

  return null;
}

/** میلی‌ثانیهٔ باقی‌مانده تا زمان شمارش معکوس (یا 0). */
export function remainingMs(iso: string | null, now: number = Date.now()): number {
  if (iso === null) {
    return 0;
  }

  const target = Date.parse(iso);

  return Number.isNaN(target) ? 0 : Math.max(target - now, 0);
}

// __MORE__

