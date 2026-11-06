import api from "./api";

/**
 * گزینه‌های فیلتر فهرست محصولات (از endpoint `/products/filters`).
 *
 * شمار هر گروه با فیلترهای فعالِ «بقیهٔ» گروه‌ها حساب می‌شود؛ بنابراین
 * گزینه‌های بی‌نتیجه صفر برمی‌گردند و بازهٔ قیمت روی نتایج فعلی می‌افتد.
 */
export interface BrandFacet {
  slug: string;
  name: string;
  count: number;
}

export interface CategoryFacet {
  slug: string;
  name: string;
  count: number;
}

export interface SizeFacet {
  value: string;
  count: number;
}

export interface ProductFilterFacets {
  total: number;
  price: { min: number | null; max: number | null };
  brands: BrandFacet[];
  categories: CategoryFacet[];
  sizes: SizeFacet[];
}

export const EMPTY_FACETS: ProductFilterFacets = {
  total: 0,
  price: { min: null, max: null },
  brands: [],
  categories: [],
  sizes: [],
};

/** مدت نمایش دادهٔ کش‌شده بدون درخواست تازه. */
const CACHE_TTL = 2 * 60 * 1000;

interface CacheEntry {
  data: ProductFilterFacets;
  savedAt: number;
}

const memoryCache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<ProductFilterFacets>>();

/**
 * کلید کش از پارامترهای فیلتر؛ ترتیب کلیدها یکسان می‌شود تا درخواست‌های
 * با پارامترهای جابه‌جا یک کش مشترک داشته باشند.
 */
export function facetsCacheKey(
  params: Record<string, string | number>,
): string {
  return Object.entries(params)
    .filter(([, value]) => value !== "" && value !== undefined && value !== null)
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join("&");
}

function normalizeResponse(payload: unknown): ProductFilterFacets {
  const unwrapped = (payload as { data?: unknown })?.data;
  const data = (unwrapped as ProductFilterFacets | undefined) ?? null;

  if (!data || typeof data !== "object") {
    return EMPTY_FACETS;
  }

  return {
    total: Number(data.total ?? 0) || 0,
    price: {
      min: data.price?.min === null || data.price?.min === undefined ? null : Number(data.price.min),
      max: data.price?.max === null || data.price?.max === undefined ? null : Number(data.price.max),
    },
    brands: Array.isArray(data.brands) ? data.brands : [],
    categories: Array.isArray(data.categories) ? data.categories : [],
    sizes: Array.isArray(data.sizes) ? data.sizes : [],
  };
}

/**
 * گزینه‌های فیلتر را برمی‌گرداند؛ درخواست‌های هم‌زمان با همان پارامترها
 * ادغام می‌شوند و پاسخ برای مدت کوتاهی در حافظه می‌ماند.
 */
export function fetchProductFilters(
  params: Record<string, string | number>,
): Promise<ProductFilterFacets> {
  const key = facetsCacheKey(params);
  const cached = memoryCache.get(key);

  if (cached && Date.now() - cached.savedAt < CACHE_TTL) {
    return Promise.resolve(cached.data);
  }

  const pending = inFlightRequests.get(key);

  if (pending) {
    return pending;
  }

  const request = api
    .get("/products/filters", { params })
    .then((response) => {
      const data = normalizeResponse(response.data);
      memoryCache.set(key, { data, savedAt: Date.now() });

      return data;
    })
    .finally(() => {
      inFlightRequests.delete(key);
    });

  inFlightRequests.set(key, request);

  return request;
}
