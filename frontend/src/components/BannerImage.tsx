import { useEffect, useState } from "react";

import {
  bannerImageAlt,
  hasDesktopImage,
  hasMobileImage,
  type BannerViewport,
  type StorefrontBanner,
} from "../utils/banners";
import { getStorageUrl } from "../utils/images";

interface BannerImageProps {
  banner: StorefrontBanner;
  /** کلاس تصویر در نمای دسکتاپ (از ۷۶۸ پیکسل به بالا). */
  desktopClassName: string;
  /** کلاس تصویر در نمای موبایل (زیر ۷۶۸ پیکسل). */
  mobileClassName: string;
  /**
   * کدام تصویر رندر شود:
   * - `auto` (پیش‌فرض): هر دو تگ رندر می‌شوند و با کلاس‌های `md:hidden` /
   *   `hidden md:block` فقط یکی دیده می‌شود.
   * - `desktop` یا `mobile`: فقط تصویر همان نما (وقتی والد بر اساس نما فیلتر
   *   شده است؛ مثل اسلایدرهای جدا برای موبایل و دسکتاپ).
   */
  view?: BannerViewport | "auto";
  alt?: string;
  loading?: "eager" | "lazy";
  /**
   * اولویت دانلود مرورگر؛ تصویر اول اسلایدر (LCP صفحهٔ اصلی) باید `high`
   * باشد تا دیرتر از بقیهٔ تصاویر دانلود نشود.
   */
  fetchPriority?: "high" | "low" | "auto";
}

/** با تغییر نشانی، حالت «تصویر خراب» ریست می‌شود. */
function useBrokenSource(source: string | null): [boolean, () => void] {
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [source]);

  return [broken, () => setBroken(true)];
}

/**
 * تصویر بنر با تفکیک کامل نمای موبایل و دسکتاپ.
 *
 * - نمای دسکتاپ (≥ ۷۶۸px): همیشه `banner.image`
 * - نمای موبایل (< ۷۶۸px): فقط `banner.mobile_image`
 *
 * اگر تصویر یک نما ثبت نشده یا فایلش بارگذاری نشد، همان نما خالی می‌ماند و
 * هیچ‌گاه تصویر نمای دیگر جای آن گذاشته نمی‌شود.
 */
function BannerImage({
  banner,
  desktopClassName,
  mobileClassName,
  view = "auto",
  alt,
  loading = "lazy",
  fetchPriority,
}: BannerImageProps) {
  const desktopSource = hasDesktopImage(banner)
    ? getStorageUrl(banner.image)
    : null;
  const mobileSource = hasMobileImage(banner)
    ? getStorageUrl(banner.mobile_image)
    : null;

  const [desktopBroken, markDesktopBroken] = useBrokenSource(desktopSource);
  const [mobileBroken, markMobileBroken] = useBrokenSource(mobileSource);

  // متن جایگزین از فیلد alt مدیر می‌آید (سئو) و در نبود آن از عنوان بنر.
  const label = alt?.trim() || bannerImageAlt(banner);

  const desktopImage =
    desktopSource && !desktopBroken ? (
      <img
        src={desktopSource}
        alt={label}
        loading={loading}
        fetchPriority={fetchPriority}
        decoding="async"
        onError={markDesktopBroken}
        className={
          view === "auto" ? `${desktopClassName} hidden md:block` : desktopClassName
        }
      />
    ) : null;

  const mobileImage =
    mobileSource && !mobileBroken ? (
      <img
        src={mobileSource}
        alt={label}
        loading={loading}
        fetchPriority={fetchPriority}
        decoding="async"
        onError={markMobileBroken}
        className={
          view === "auto" ? `${mobileClassName} md:hidden` : mobileClassName
        }
      />
    ) : null;

  if (view === "desktop") {
    return desktopImage;
  }

  if (view === "mobile") {
    return mobileImage;
  }

  return (
    <>
      {mobileImage}
      {desktopImage}
    </>
  );
}

export default BannerImage;
