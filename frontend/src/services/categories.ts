import api from "./api";
import { STORAGE_KEYS } from "../utils/storageKeys";

/**
 * دسته‌بندی‌های فروشگاه در چند لایه کش می‌شوند تا منوی بالای سایت
 * (و فیلترهای صفحهٔ محصولات) بدون معطلی و بدون نمایش اسکلت لودینگ
 * نمایش داده شوند:
 *
 *  1. کش حافظه‌ای (سطح ماژول) → بین جابه‌جایی صفحات همان تب
 *  2. localStorage با عمر طولانی → بین تب‌ها و بازدیدهای بعدی
 *  3. درخواست شبکه با حالت stale-while-revalidate → دادهٔ تازه در پس‌زمینه
 *
 * پیش از این از sessionStorage با عمر ۵ دقیقه استفاده می‌شد؛ در هر تب
 * جدید کش خالی بود و منو تا پایان درخواست API اسکلت نشان می‌داد.
 */
export interface StorefrontCategory {
  id: number;
  name: string;
  slug: string;
  parent_id?: number | null;
  is_active?: boolean;
  sort_order?: number;
  products_count?: number;
  children?: StorefrontCategory[];
}

interface CategoryCache {
  data: StorefrontCategory[];
  savedAt: number;
}

/** مدتی که دادهٔ کش‌شده بدون هیچ درخواستی نمایش داده می‌شود. */
const CACHE_TTL = 6 * 60 * 60 * 1000;

/** بعد از این مدت، داده فوراً نمایش داده می‌شود و در پس‌زمینه تازه می‌شود. */
const REVALIDATE_AFTER = 5 * 60 * 1000;

/** کلید نسخهٔ قدیمی (sessionStorage) برای مهاجرت یک‌بارهٔ کش. */
const LEGACY_SESSION_KEY = "storefront_categories_cache";

let memoryCache: CategoryCache | null = null;
let inFlightRequest: Promise<StorefrontCategory[]> | null = null;

function isCacheValid(cache: CategoryCache | null): cache is CategoryCache {
  return (
    cache !== null &&
    Array.isArray(cache.data) &&
    typeof cache.savedAt === "number" &&
    Date.now() - cache.savedAt < CACHE_TTL
  );
}

function writeStoredCache(cache: CategoryCache): void {
  try {
    window.localStorage.setItem(STORAGE_KEYS.storefrontCategories, JSON.stringify(cache));
  } catch {
    // در صورت پر بودن یا در دسترس نبودن Storage، کش حافظه‌ای کافی است.
  }
}

function readLegacySessionCache(): CategoryCache | null {
  try {
    const raw = window.sessionStorage.getItem(LEGACY_SESSION_KEY);

    if (!raw) return null;

    const legacy = JSON.parse(raw) as {
      data?: StorefrontCategory[];
      expiresAt?: number;
    };

    window.sessionStorage.removeItem(LEGACY_SESSION_KEY);

    if (!Array.isArray(legacy.data) || legacy.data.length === 0) {
      return null;
    }

    const migrated: CategoryCache = { data: legacy.data, savedAt: Date.now() };
    writeStoredCache(migrated);

    return migrated;
  } catch {
    return null;
  }
}

function readStoredCache(): CategoryCache | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.storefrontCategories);

    if (raw) {
      const parsed = JSON.parse(raw) as CategoryCache;

      if (isCacheValid(parsed)) {
        return parsed;
      }

      window.localStorage.removeItem(STORAGE_KEYS.storefrontCategories);
    }
  } catch {
    // دادهٔ خراب یا دسترسی نداشتن به Storage نباید مانع نمایش منو شود.
  }

  return readLegacySessionCache();
}

/**
 * آخرین دسته‌بندی‌های کش‌شده را برمی‌گرداند (بدون هیچ درخواست شبکه‌ای).
 * برای مقدار اولیهٔ state استفاده می‌شود تا منو بلافاصله رندر شود.
 */
export function getCachedCategories(): StorefrontCategory[] | null {
  if (memoryCache === null) {
    memoryCache = readStoredCache();
  }

  return memoryCache?.data ?? null;
}

function normalizeResponse(payload: unknown): StorefrontCategory[] {
  const unwrapped =
    (payload as { data?: unknown })?.data ?? payload;

  if (Array.isArray(unwrapped)) {
    return unwrapped as StorefrontCategory[];
  }

  const nested = (unwrapped as { data?: unknown })?.data;

  return Array.isArray(nested) ? (nested as StorefrontCategory[]) : [];
}

/**
 * فهرست دسته‌بندی‌ها را برمی‌گرداند. اگر کش تازه باشد بدون درخواست شبکه
 * پاسخ می‌دهد؛ درخواست‌های هم‌زمان هم ادغام می‌شوند تا فقط یک بار به API
 * زده شود (منو و صفحهٔ محصولات هر دو از همین تابع استفاده می‌کنند).
 */
export function fetchCategories(
  options: { force?: boolean } = {},
): Promise<StorefrontCategory[]> {
  const cached = getCachedCategories();
  const isFresh =
    memoryCache !== null && Date.now() - memoryCache.savedAt < REVALIDATE_AFTER;

  if (!options.force && cached !== null && isFresh) {
    return Promise.resolve(cached);
  }

  if (inFlightRequest !== null) {
    return inFlightRequest;
  }

  inFlightRequest = api
    .get("/categories")
    .then((response) => {
      const data = normalizeResponse(response.data);

      if (data.length === 0 && cached !== null) {
        return cached;
      }

      memoryCache = { data, savedAt: Date.now() };
      writeStoredCache(memoryCache);

      return data;
    })
    .catch((error) => {
      if (cached !== null) {
        // در خطای شبکه، دادهٔ قبلی نمایش داده می‌شود تا منو خالی نشود.
        return cached;
      }

      throw error;
    })
    .finally(() => {
      inFlightRequest = null;
    });

  return inFlightRequest;
}

/** درخواست را در اولین لحظهٔ اجرای برنامه آغاز می‌کند. */
export function prefetchCategories(): void {
  void fetchCategories().catch(() => {
    // خطای پیش‌بارگذاری بی‌صدا نادیده گرفته می‌شود؛ منو خودش دوباره تلاش می‌کند.
  });
}
