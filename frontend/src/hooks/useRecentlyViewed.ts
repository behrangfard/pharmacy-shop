import { useCallback, useEffect, useState } from "react";

import {
  clearRecentlyViewed,
  readRecentlyViewed,
  RECENTLY_VIEWED_EVENT,
  removeRecentlyViewed,
  type RecentlyViewedProduct,
} from "../services/recentlyViewed";
import { STORAGE_KEYS } from "../utils/storageKeys";

/**
 * بازدیدهای اخیر با همگام‌سازی زنده.
 *
 * هر جایی از برنامه که محصولی ثبت شود (صفحهٔ محصول)، لیست همهٔ ریل‌های
 * بازدیدهای اخیر بدون رفرش صفحه تازه می‌شود. تغییر localStorage در تب‌های
 * دیگر مرورگر هم با رویداد `storage` منعکس می‌گردد.
 */
export function useRecentlyViewed() {
  const [items, setItems] = useState<RecentlyViewedProduct[]>(
    readRecentlyViewed,
  );

  useEffect(() => {
    const sync = () => setItems(readRecentlyViewed());

    const handleStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === STORAGE_KEYS.recentlyViewed) {
        sync();
      }
    };

    // مقدار اولیه ممکن است پیش از ثبت اثر (hydration) تغییر کرده باشد.
    sync();

    window.addEventListener(RECENTLY_VIEWED_EVENT, sync);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(RECENTLY_VIEWED_EVENT, sync);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const remove = useCallback((id: number) => {
    setItems(removeRecentlyViewed(id));
  }, []);

  const clear = useCallback(() => {
    clearRecentlyViewed();
    setItems([]);
  }, []);

  return { items, remove, clear };
}

export default useRecentlyViewed;
