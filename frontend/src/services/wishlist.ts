import api from "./api";
import { STORAGE_KEYS } from "../utils/storageKeys";

const WISHLIST_STORAGE_KEY = STORAGE_KEYS.wishlist;

export interface WishlistProductImage {
  id: number;
  path: string;
  alt?: string | null;
  sort_order?: number;
  is_primary?: boolean;
}

/**
 * تنوع فعال محصول (سایز/رنگ). فقط سایز و موجودی برای کارت محصول لازماند.
 */
export interface WishlistProductVariant {
  id: number;
  name: string;
  size?: string | null;
  stock?: number | null;
  is_active?: boolean | null;
}

/**
 * شکل محصولی که کارت محصول برای نمایش لازم دارد. همین ساختار در پاسخ
 * سرور (علاقه‌مندی‌های کاربر) و در حافظهٔ مهمان ذخیره می‌شود.
 */
export interface WishlistProduct {
  id: number;
  name: string;
  slug: string;
  price: string | number;
  compare_price?: string | number | null;
  discount_percent?: string | number | null;
  short_description?: string | null;
  description?: string | null;
  stock: number;
  thumbnail?: string | null;
  is_taxable?: boolean | number | null;
  images?: WishlistProductImage[];
  /** تنوع‌های فعال محصول؛ منبع چیپ سایز روی کارت. */
  variants?: WishlistProductVariant[];
  category?: { id: number; name: string; slug: string } | null;
  brand?: { id: number; name: string; slug: string } | null;
}

export interface WishlistEntry {
  product_id: number;
  product: WishlistProduct;
  created_at?: string | null;
}

function isValidProduct(value: unknown): value is WishlistProduct {
  if (!value || typeof value !== "object") {
    return false;
  }

  const product = value as Partial<WishlistProduct>;

  return (
    typeof product.id === "number" &&
    typeof product.name === "string" &&
    typeof product.slug === "string"
  );
}

/**
 * ورودی‌های ذخیره‌شده را پاک‌سازی می‌کند تا دادهٔ خراب صفحه را نشکند.
 */
function normalizeEntries(value: unknown): WishlistEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<number>();
  const entries: WishlistEntry[] = [];

  value.forEach((item) => {
    if (!item || typeof item !== "object") {
      return;
    }

    const entry = item as Partial<WishlistEntry>;

    if (!isValidProduct(entry.product) || seen.has(entry.product.id)) {
      return;
    }

    seen.add(entry.product.id);
    entries.push({
      product_id: entry.product.id,
      product: entry.product,
      created_at: entry.created_at ?? null,
    });
  });

  return entries;
}

/**
 * علاقه‌مندی‌های مهمان: برای اینکه صفحه بدون ورود هم قابل استفاده باشد،
 * تصویر کوچکی از محصول در مرورگر نگه داشته می‌شود (مثل سبد خرید) و پس از
 * ورود، شناسه‌ها به سرور منتقل می‌شوند.
 */
export function readGuestWishlist(): WishlistEntry[] {
  try {
    const stored = localStorage.getItem(WISHLIST_STORAGE_KEY);

    if (!stored) {
      return [];
    }

    return normalizeEntries(JSON.parse(stored));
  } catch {
    return [];
  }
}

function writeGuestWishlist(entries: WishlistEntry[]): void {
  try {
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    console.error("Wishlist storage error:", error);
  }
}

export function addGuestWishlistItem(product: WishlistProduct): void {
  const entries = readGuestWishlist();

  if (entries.some((entry) => entry.product_id === product.id)) {
    return;
  }

  writeGuestWishlist([
    { product_id: product.id, product, created_at: new Date().toISOString() },
    ...entries,
  ]);
}

export function removeGuestWishlistItem(productId: number): void {
  writeGuestWishlist(
    readGuestWishlist().filter((entry) => entry.product_id !== productId),
  );
}

export function clearGuestWishlist(): void {
  try {
    localStorage.removeItem(WISHLIST_STORAGE_KEY);
  } catch {
    // خطای ذخیره‌سازی نباید جریان ورود را متوقف کند.
  }
}

/**
 * فهرست علاقه‌مندی‌های کاربر وارد‌شده.
 */
export async function fetchWishlist(): Promise<WishlistEntry[]> {
  const response = await api.get("/wishlist");
  const items = response.data?.data?.items;

  if (!Array.isArray(items)) {
    return [];
  }

  return normalizeEntries(
    items.map((item: { product?: unknown; created_at?: string | null }) => ({
      product_id:
        item?.product && typeof item.product === "object"
          ? (item.product as WishlistProduct).id
          : 0,
      product: item?.product,
      created_at: item?.created_at ?? null,
    })),
  );
}

export async function addWishlistItem(productId: number): Promise<void> {
  await api.post("/wishlist", { product_id: productId });
}

export async function removeWishlistItem(productId: number): Promise<void> {
  await api.delete(`/wishlist/${productId}`);
}

/**
 * علاقه‌مندی‌های مهمان را بعد از ورود به حساب روی سرور می‌نویسد و سپس
 * نسخهٔ محلی را پاک می‌کند. خطای یک محصول مانع انتقال بقیه نمی‌شود.
 */
export async function syncGuestWishlist(): Promise<void> {
  const entries = readGuestWishlist();

  if (entries.length === 0) {
    return;
  }

  await Promise.all(
    entries.map(async (entry) => {
      try {
        await addWishlistItem(entry.product_id);
      } catch (error) {
        console.error("Wishlist sync error:", error);
      }
    }),
  );

  clearGuestWishlist();
}
