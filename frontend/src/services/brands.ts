import api from "./api";
import { STORAGE_KEYS } from "../utils/storageKeys";

/**
 * برندهای فروشگاه برای فیلتر صفحهٔ محصولات.
 *
 * مثل دسته‌بندی‌ها در دو لایه کش می‌شوند (حافظه + localStorage) تا فهرست
 * برندها بدون معطلی نمایش داده شود و در بازدید بعدی هم درخواست تکراری
 * زده نشود.
 */
export interface StorefrontBrand {
  id: number;
  name: string;
  slug: string;
  logo?: string | null;
  is_active?: boolean;
  sort_order?: number;
  products_count?: number;
}

interface BrandCache {
  data: StorefrontBrand[];
  savedAt: number;
}

/** مدتی که دادهٔ کش‌شده بدون هیچ درخواستی نمایش داده می‌شود. */
const CACHE_TTL = 6 * 60 * 60 * 1000;

/** بعد از این مدت، داده فوراً نمایش داده می‌شود و در پس‌زمینه تازه می‌شود. */
const REVALIDATE_AFTER = 5 * 60 * 1000;

let memoryCache: BrandCache | null = null;
let inFlightRequest: Promise<StorefrontBrand[]> | null = null;

function isCacheValid(cache: BrandCache | null): cache is BrandCache {
  return (
    cache !== null &&
    Array.isArray(cache.data) &&
    typeof cache.savedAt === "number" &&
    Date.now() - cache.savedAt < CACHE_TTL
  );
}

function writeStoredCache(cache: BrandCache): void {
  try {
    window.localStorage.setItem(
      STORAGE_KEYS.storefrontBrands,
      JSON.stringify(cache),
    );
  } catch {
    // در صورت پر بودن یا در دسترس نبودن Storage، کش حافظه‌ای کافی است.
  }
}

function readStoredCache(): BrandCache | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.storefrontBrands);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as BrandCache;

    if (isCacheValid(parsed)) {
      return parsed;
    }

    window.localStorage.removeItem(STORAGE_KEYS.storefrontBrands);
  } catch {
    // دادهٔ خراب یا دسترسی نداشتن به Storage نباید مانع نمایش فیلترها شود.
  }

  return null;
}

/**
 * آخرین برندهای کش‌شده را برمی‌گرداند (بدون درخواست شبکه‌ای).
 * برای مقدار اولیهٔ state استفاده می‌شود تا فیلتر برند بلافاصله رندر شود.
 */
export function getCachedBrands(): StorefrontBrand[] | null {
  if (memoryCache === null) {
    memoryCache = readStoredCache();
  }

  return memoryCache?.data ?? null;
}

function normalizeResponse(payload: unknown): StorefrontBrand[] {
  const unwrapped = (payload as { data?: unknown })?.data ?? payload;

  if (Array.isArray(unwrapped)) {
    return unwrapped as StorefrontBrand[];
  }

  const nested = (unwrapped as { data?: unknown })?.data;

  return Array.isArray(nested) ? (nested as StorefrontBrand[]) : [];
}

/**
 * فهرست برندهای فروشگاه را برمی‌گرداند. اگر کش تازه باشد بدون درخواست
 * شبکه پاسخ می‌دهد و درخواست‌های هم‌زمان ادغام می‌شوند.
 */
export function fetchBrands(
  options: { force?: boolean } = {},
): Promise<StorefrontBrand[]> {
  const cached = getCachedBrands();
  const isFresh =
    memoryCache !== null && Date.now() - memoryCache.savedAt < REVALIDATE_AFTER;

  if (!options.force && cached !== null && isFresh) {
    return Promise.resolve(cached);
  }

  if (inFlightRequest !== null) {
    return inFlightRequest;
  }

  inFlightRequest = api
    .get("/brands")
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
        // در خطای شبکه، فهرست قبلی نمایش داده می‌شود تا فیلتر خالی نشود.
        return cached;
      }

      throw error;
    })
    .finally(() => {
      inFlightRequest = null;
    });

  return inFlightRequest;
}
