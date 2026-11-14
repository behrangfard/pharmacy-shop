import { STORAGE_KEYS } from "../utils/storageKeys";

/**
 * «بازدیدهای اخیر» فروشگاه.
 *
 * هر محصولی که صفحه‌اش باز شود، به‌صورت یک عکس فوری سبک در حافظهٔ مرورگر
 * ذخیره می‌شود تا بدون درخواست به سرور، ریل بازدیدهای اخیر در صفحهٔ اصلی و
 * صفحهٔ محصول نمایش داده شود. ذخیره‌سازی محلی است و به حساب کاربر وابسته
 * نیست (مهمان هم بازدیدهایش را می‌بیند).
 */

const RECENTLY_VIEWED_KEY = STORAGE_KEYS.recentlyViewed;

/** حداکثر محصول نگه‌داری‌شده؛ بیشتر از این، ریل بی‌فایده و حافظه‌بَر است. */
export const RECENTLY_VIEWED_LIMIT = 12;

/** رویدادی که پس از هر تغییر لیست روی window منتشر می‌شود. */
export const RECENTLY_VIEWED_EVENT = "behrang:recently-viewed";

/** تصویر محصول؛ همان شکلی که API می‌فرستد. */
export interface RecentlyViewedImage {
  id?: number;
  path: string;
  alt?: string | null;
  sort_order?: number | null;
  is_primary?: boolean | null;
}

/**
 * محصولی که برای ثبت بازدید کافی است. کارت محصول، صفحهٔ محصول و مودال
 * نمایش سریع هر سه این فیلدها را دارند؛ بقیه اختیاری‌اند.
 */
export interface RecentlyViewedSource {
  id: number;
  name: string;
  slug: string;
  price: string | number;
  compare_price?: string | number | null;
  discount_percent?: string | number | null;
  thumbnail?: string | null;
  short_description?: string | null;
  stock?: number | string | null;
  images?: RecentlyViewedImage[] | null;
}

/** عکس فوری ذخیره‌شدهٔ یک محصول بازدیدشده. */
export interface RecentlyViewedProduct {
  id: number;
  name: string;
  slug: string;
  price: number;
  compare_price: number | null;
  discount_percent: number;
  thumbnail: string | null;
  short_description: string | null;
  stock: number;
  /** زمان آخرین بازدید (ISO) برای مرتب‌سازی و کلید یکتا. */
  viewed_at: string;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** مسیر تصویر اصلی محصول؛ اول تصویر is_primary و بعد اولین تصویر. */
function primaryImagePath(
  images: RecentlyViewedImage[] | null | undefined,
): string | null {
  if (!Array.isArray(images)) {
    return null;
  }

  const usable = images.filter(
    (image) => image && typeof image.path === "string" && image.path.trim() !== "",
  );

  const primary = usable.find((image) => image.is_primary) ?? usable[0];

  return primary ? primary.path : null;
}

/** تبدیل محصول به عکس فوری قابل ذخیره؛ ورودی نامعتبر null می‌دهد. */
export function toRecentlyViewedProduct(
  source: RecentlyViewedSource,
): RecentlyViewedProduct | null {
  if (
    !source ||
    !isFiniteNumber(source.id) ||
    typeof source.name !== "string" ||
    typeof source.slug !== "string"
  ) {
    return null;
  }

  const price = Number(source.price);
  const comparePrice = Number(source.compare_price);
  const discount = Number(source.discount_percent);

  return {
    id: source.id,
    name: source.name,
    slug: source.slug,
    price: Number.isFinite(price) ? price : 0,
    compare_price:
      source.compare_price !== null &&
      source.compare_price !== undefined &&
      Number.isFinite(comparePrice) &&
      comparePrice > 0
        ? comparePrice
        : null,
    discount_percent:
      source.discount_percent !== null &&
      source.discount_percent !== undefined &&
      Number.isFinite(discount)
        ? Math.min(Math.max(discount, 0), 100)
        : 0,
    thumbnail: primaryImagePath(source.images) ?? source.thumbnail ?? null,
    short_description: source.short_description ?? null,
    stock: Number(source.stock ?? 0) || 0,
    viewed_at: new Date().toISOString(),
  };
}

/** پاک‌سازی دادهٔ ذخیره‌شده تا ورودی خراب باعث خطای رندر نشود. */
function normalizeStored(value: unknown): RecentlyViewedProduct[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<number>();
  const items: RecentlyViewedProduct[] = [];

  value.forEach((item) => {
    if (!item || typeof item !== "object") {
      return;
    }

    const candidate = item as Partial<RecentlyViewedProduct>;

    if (
      !isFiniteNumber(candidate.id) ||
      typeof candidate.name !== "string" ||
      typeof candidate.slug !== "string" ||
      seen.has(candidate.id)
    ) {
      return;
    }

    seen.add(candidate.id);

    items.push({
      id: candidate.id,
      name: candidate.name,
      slug: candidate.slug,
      price: Number(candidate.price) || 0,
      compare_price: Number(candidate.compare_price) || null,
      discount_percent: Number(candidate.discount_percent) || 0,
      thumbnail:
        typeof candidate.thumbnail === "string" ? candidate.thumbnail : null,
      short_description:
        typeof candidate.short_description === "string"
          ? candidate.short_description
          : null,
      stock: Number(candidate.stock) || 0,
      viewed_at:
        typeof candidate.viewed_at === "string"
          ? candidate.viewed_at
          : new Date().toISOString(),
    });
  });

  return items.slice(0, RECENTLY_VIEWED_LIMIT);
}

/** خواندن بازدیدهای اخیر (تازه‌ترین محصول اول). */
export function readRecentlyViewed(): RecentlyViewedProduct[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(RECENTLY_VIEWED_KEY);

    if (!stored) {
      return [];
    }

    return normalizeStored(JSON.parse(stored));
  } catch {
    return [];
  }
}

function writeRecentlyViewed(items: RecentlyViewedProduct[]): void {
  try {
    window.localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(items));
  } catch (error) {
    console.error("Recently viewed storage error:", error);
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(RECENTLY_VIEWED_EVENT));
  }
}

/**
 * ثبت بازدید یک محصول؛ اگر قبلاً دیده شده بود به ابتدای لیست منتقل می‌شود
 * (بدون تکرار). لیست جدید برگردانده می‌شود.
 */
export function recordProductView(
  source: RecentlyViewedSource,
): RecentlyViewedProduct[] {
  const snapshot = toRecentlyViewedProduct(source);

  if (!snapshot) {
    return readRecentlyViewed();
  }

  const next = [
    snapshot,
    ...readRecentlyViewed().filter((item) => item.id !== snapshot.id),
  ].slice(0, RECENTLY_VIEWED_LIMIT);

  writeRecentlyViewed(next);

  return next;
}

/** حذف یک محصول از بازدیدهای اخیر. */
export function removeRecentlyViewed(id: number): RecentlyViewedProduct[] {
  const next = readRecentlyViewed().filter((item) => item.id !== id);

  writeRecentlyViewed(next);

  return next;
}

/** پاک کردن کامل بازدیدهای اخیر. */
export function clearRecentlyViewed(): void {
  try {
    window.localStorage.removeItem(RECENTLY_VIEWED_KEY);
  } catch (error) {
    console.error("Recently viewed storage error:", error);
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(RECENTLY_VIEWED_EVENT));
  }
}
