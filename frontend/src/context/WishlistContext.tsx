import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "./AuthContext";
import {
  addGuestWishlistItem,
  addWishlistItem,
  fetchWishlist,
  readGuestWishlist,
  removeGuestWishlistItem,
  removeWishlistItem,
  syncGuestWishlist,
  type WishlistEntry,
  type WishlistProduct,
} from "../services/wishlist";

interface WishlistContextType {
  entries: WishlistEntry[];
  /** شناسهٔ محصولات ذخیره‌شده برای وضعیت سریع قلب‌ها. */
  productIds: Set<number>;
  count: number;
  loading: boolean;
  /** پیام خطای آخرین عملیات (دریافت یا تغییر)؛ برای نمایش به کاربر. */
  error: string | null;
  isWishlisted: (productId: number) => boolean;
  /** افزودن/حذف محصول؛ مقدار بازگشتی وضعیت نهایی است. */
  toggle: (product: WishlistProduct) => Promise<boolean>;
  remove: (productId: number) => Promise<void>;
  refresh: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(
  undefined,
);

function WishlistProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();

  // تا پیش از مشخص شدن وضعیت ورود، علاقه‌مندی‌های مهمان نمایش داده می‌شوند
  // تا قلب‌ها در اولین رندر هم درست باشند.
  const [entries, setEntries] = useState<WishlistEntry[]>(readGuestWishlist);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());

  // درخواست همگام‌سازی فقط یک‌بار برای هر ورود انجام می‌شود.
  const syncedUserId = useRef<number | null>(null);

  const load = useCallback(async () => {
    if (authLoading) {
      return;
    }

    if (!user) {
      syncedUserId.current = null;
      setEntries(readGuestWishlist());
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (syncedUserId.current !== user.id) {
        await syncGuestWishlist();
        syncedUserId.current = user.id;
      }

      setEntries(await fetchWishlist());
    } catch (loadError) {
      console.error("Wishlist load error:", loadError);
      setError(
        "دریافت علاقه‌مندی‌ها از سرور انجام نشد. لطفاً اتصال اینترنت را بررسی و دوباره تلاش کنید.",
      );
    } finally {
      setLoading(false);
    }
  }, [authLoading, user]);

  useEffect(() => {
    load();
  }, [load]);

  const productIds = useMemo(
    () => new Set(entries.map((entry) => entry.product_id)),
    [entries],
  );

  const isWishlisted = useCallback(
    (productId: number) => productIds.has(productId),
    [productIds],
  );

  const toggle = useCallback(
    async (product: WishlistProduct) => {
      const productId = product.id;
      const wasWishlisted = productIds.has(productId);
      const nextState = !wasWishlisted;

      // به‌روزرسانی خوش‌بینانه تا کلیک فوری حس شود.
      const previousEntries = entries;

      setEntries((current) => {
        if (wasWishlisted) {
          return current.filter((entry) => entry.product_id !== productId);
        }

        return [
          {
            product_id: productId,
            product,
            created_at: new Date().toISOString(),
          },
          ...current,
        ];
      });

      setPendingIds((current) => new Set(current).add(productId));

      try {
        if (user) {
          if (wasWishlisted) {
            await removeWishlistItem(productId);
          } else {
            await addWishlistItem(productId);
          }
        } else if (wasWishlisted) {
          removeGuestWishlistItem(productId);
        } else {
          addGuestWishlistItem(product);
        }

        return nextState;
      } catch (toggleError) {
        console.error("Wishlist toggle error:", toggleError);
        setEntries(previousEntries);
        setError("ثبت علاقه‌مندی انجام نشد. لطفاً یک‌بار دیگر تلاش کنید.");
        throw toggleError;
      } finally {
        setPendingIds((current) => {
          const next = new Set(current);
          next.delete(productId);
          return next;
        });
      }
    },
    [entries, productIds, user],
  );

  const remove = useCallback(
    async (productId: number) => {
      const entry = entries.find((item) => item.product_id === productId);

      if (!entry) {
        return;
      }

      await toggle(entry.product);
    },
    [entries, toggle],
  );

  const value = useMemo<WishlistContextType>(
    () => ({
      entries,
      productIds,
      count: entries.length,
      loading,
      error,
      isWishlisted,
      toggle,
      remove,
      refresh: load,
    }),
    [entries, productIds, loading, error, isWishlisted, toggle, remove, load],
  );

  // pendingIds در وضعیت دکمه‌ها استفاده نمی‌شود ولی نگه‌داشتن آن باعث
  // می‌شود رندرهای هم‌زمان با یک کلیک دوباره اجرا شوند.
  void pendingIds;

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);

  if (!context) {
    throw new Error("useWishlist must be used within WishlistProvider");
  }

  return context;
}

export default WishlistProvider;
