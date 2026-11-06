import { useCallback, useEffect, useState } from "react";

import { adminApi, api } from "../services/api";
import { getAdminErrorMessage } from "../utils/adminFormat";
import {
  sanitizeBannerFonts,
  type BannerFontRecord,
} from "../utils/bannerFonts";

/**
 * فونت‌های سفارشی بنر.
 *
 * - `usePublicBannerFonts`: فهرست فونت‌های فعال برای فروشگاه (یک‌بار در کل
 *   عمر صفحه دریافت می‌شود تا هر بنر درخواست تکراری نفرستد).
 * - `useAdminBannerFonts`: کتابخانهٔ فونت در پنل مدیران (افزودن/حذف/وضعیت).
 */

let publicCache: BannerFontRecord[] | null = null;
let publicRequest: Promise<BannerFontRecord[]> | null = null;

/** فونت‌های فعال فروشگاه (کش‌شده در حافظهٔ صفحه). */
export async function fetchPublicBannerFonts(): Promise<BannerFontRecord[]> {
  if (publicCache !== null) return publicCache;
  if (publicRequest !== null) return publicRequest;

  publicRequest = api
    .get("/banner-fonts")
    .then((response) => {
      const fonts = sanitizeBannerFonts(response.data?.data);

      publicCache = fonts;

      return fonts;
    })
    .catch((error) => {
      // فونت‌ها اختیاری هستند؛ خطای دریافت نباید صفحه را خراب کند.
      console.error("BANNER FONTS API ERROR:", error);

      publicCache = publicCache ?? [];

      return publicCache;
    })
    .finally(() => {
      publicRequest = null;
    });

  return publicRequest;
}

export function usePublicBannerFonts(): BannerFontRecord[] {
  const [fonts, setFonts] = useState<BannerFontRecord[]>(() => publicCache ?? []);

  useEffect(() => {
    let active = true;

    void fetchPublicBannerFonts().then((next) => {
      if (active) setFonts(next);
    });

    return () => {
      active = false;
    };
  }, []);

  return fonts;
}

export interface UseAdminBannerFontsResult {
  fonts: BannerFontRecord[];
  loading: boolean;
  error: string;
  reload: () => Promise<void>;
  /** ثبت فونت جدید (فایل بارگذاری‌شده یا نشانی بیرونی) با FormData. */
  createFont: (payload: FormData) => Promise<BannerFontRecord | null>;
  deleteFont: (font: BannerFontRecord) => Promise<boolean>;
  toggleFont: (
    font: BannerFontRecord,
    isActive: boolean,
  ) => Promise<BannerFontRecord | null>;
}

export function useAdminBannerFonts(): UseAdminBannerFontsResult {
  const [fonts, setFonts] = useState<BannerFontRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await adminApi.get("/admin/banner-fonts");

      setFonts(sanitizeBannerFonts(response.data?.data));
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const createFont = useCallback(
    async (payload: FormData): Promise<BannerFontRecord | null> => {
      try {
        const response = await adminApi.post("/admin/banner-fonts", payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        await reload();

        return sanitizeBannerFonts([response.data?.data])[0] ?? null;
      } catch (err) {
        setError(getAdminErrorMessage(err));

        return null;
      }
    },
    [reload],
  );

  const deleteFont = useCallback(
    async (font: BannerFontRecord): Promise<boolean> => {
      try {
        await adminApi.delete(`/admin/banner-fonts/${font.id}`);

        // کش عمومی صفحه هم پاک می‌شود تا فروشگاه فونت حذف‌شده را نخواهد.
        publicCache = null;

        await reload();

        return true;
      } catch (err) {
        setError(getAdminErrorMessage(err));

        return false;
      }
    },
    [reload],
  );

  const toggleFont = useCallback(
    async (
      font: BannerFontRecord,
      isActive: boolean,
    ): Promise<BannerFontRecord | null> => {
      try {
        const response = await adminApi.patch(
          `/admin/banner-fonts/${font.id}/status`,
          { is_active: isActive },
        );

        publicCache = null;

        await reload();

        return sanitizeBannerFonts([response.data?.data])[0] ?? null;
      } catch (err) {
        setError(getAdminErrorMessage(err));

        return null;
      }
    },
    [reload],
  );

  return { fonts, loading, error, reload, createFont, deleteFont, toggleFont };
}
