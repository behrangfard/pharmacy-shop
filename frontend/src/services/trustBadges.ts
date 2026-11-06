import api from "./api";
import { STORAGE_KEYS } from "../utils/storageKeys";

/**
 * نشان‌های اعتماد و مجوزهای فروشگاه (اینماد، ساماندهی، نمادهای صنفی و ...).
 *
 * این نشان‌ها در فوتر سایت (سمت چپ، پایین صفحه) نمایش داده می‌شوند و کامل از
 * پنل مدیران (/admin/trust-badges) مدیریت می‌شوند؛ هیچ نشان یا آدرسی در
 * فرانت‌اند ثابت نیست. اگر مدیر هیچ نشانی ثبت نکرده باشد، آرایه خالی برمی‌گردد
 * و فوتر آن ناحیه را رندر نمی‌کند.
 *
 * کش مثل تنظیمات فروشگاه و نوار اطلاع‌رسانی است: حافظه → localStorage → شبکه
 * (stale-while-revalidate) تا نشان‌ها از اولین رندر بدون پرش چیدمان بیایند.
 */
export interface TrustBadge {
  id: number;
  /** عنوان کوتاه نشان؛ برای alt تصویر و برچسب زیر آن. */
  title: string;
  /** مسیر تصویر نشان (storage یا /images/...) */
  image: string;
  /** آدرس صفحهٔ مجوز؛ خالی یعنی نشان کلیک‌پذیر نیست. */
  link: string | null;
  open_in_new_tab: boolean;
}

interface TrustBadgeCache {
  data: TrustBadge[];
  savedAt: number;
}

/** مدتی که دادهٔ کش‌شده بدون هیچ درخواستی نمایش داده می‌شود. */
const CACHE_TTL = 6 * 60 * 60 * 1000;

/** بعد از این مدت داده فوراً نمایش داده می‌شود و در پس‌زمینه تازه می‌شود. */
const REVALIDATE_AFTER = 5 * 60 * 1000;

let memoryCache: TrustBadgeCache | null = null;
let inFlightRequest: Promise<TrustBadge[]> | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeBadge(raw: unknown): TrustBadge | null {
  if (!isRecord(raw)) {
    return null;
  }

  const id = Number(raw.id);
  const image = typeof raw.image === "string" ? raw.image.trim() : "";

  // نشان بدون تصویر در فوتر رندر نمی‌شود.
  if (!Number.isFinite(id) || image === "") {
    return null;
  }

  const link = typeof raw.link === "string" ? raw.link.trim() : "";

  return {
    id,
    title: typeof raw.title === "string" ? raw.title.trim() : "",
    image,
    link: link === "" ? null : link,
    open_in_new_tab: raw.open_in_new_tab !== false,
  };
}

function normalize(raw: unknown): TrustBadge[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map(normalizeBadge)
    .filter((badge): badge is TrustBadge => badge !== null);
}

function readStoredCache(): TrustBadgeCache | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.storefrontTrustBadges);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as TrustBadgeCache;

    if (!isRecord(parsed) || typeof parsed.savedAt !== "number") {
      return null;
    }

    if (Date.now() - parsed.savedAt >= CACHE_TTL) {
      window.localStorage.removeItem(STORAGE_KEYS.storefrontTrustBadges);
      return null;
    }

    return { data: normalize(parsed.data), savedAt: parsed.savedAt };
  } catch {
    return null;
  }
}

function writeStoredCache(cache: TrustBadgeCache): void {
  try {
    window.localStorage.setItem(
      STORAGE_KEYS.storefrontTrustBadges,
      JSON.stringify(cache),
    );
  } catch {
    // در دسترس نبودن Storage مانع نمایش نشان‌ها نمی‌شود.
  }
}

/**
 * آخرین فهرست کش‌شده (بدون درخواست شبکه)؛ برای مقدار اولیهٔ رندر.
 */
export function getCachedTrustBadges(): TrustBadge[] {
  if (memoryCache === null) {
    memoryCache = readStoredCache();
  }

  return memoryCache?.data ?? [];
}

/**
 * فهرست نشان‌ها را از سرور می‌خواند (با کش و ادغام درخواست‌های هم‌زمان).
 */
export function fetchTrustBadges(
  options: { force?: boolean } = {},
): Promise<TrustBadge[]> {
  const cached = getCachedTrustBadges();
  const isFresh =
    memoryCache !== null && Date.now() - memoryCache.savedAt < REVALIDATE_AFTER;

  if (!options.force && memoryCache !== null && isFresh) {
    return Promise.resolve(cached);
  }

  if (inFlightRequest !== null) {
    return inFlightRequest;
  }

  inFlightRequest = api
    .get("/trust-badges")
    .then((response) => {
      const badges = normalize(response.data?.data);

      memoryCache = { data: badges, savedAt: Date.now() };
      writeStoredCache(memoryCache);

      return badges;
    })
    .catch((error) => {
      console.error("دریافت نشان‌های اعتماد ناموفق بود:", error);

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

/** پاک‌کردن کش نشان‌ها (مثلاً بعد از تغییر در پنل مدیران). */
export function invalidateTrustBadgesCache(): void {
  memoryCache = null;

  try {
    window.localStorage.removeItem(STORAGE_KEYS.storefrontTrustBadges);
  } catch {
    // نادیده گرفتن خطای Storage
  }
}
