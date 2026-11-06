/**
 * منطق مشترک بنرهای فروشگاه: تیپ داده، لینک مقصد و تصمیم نمایش در هر نما.
 *
 * قاعدهٔ اصلی این ماژول:
 * تصویر دسکتاپ (`image`) و تصویر موبایل (`mobile_image`) دو فیلد کاملاً مستقل
 * هستند. بنر در هر نما فقط با تصویر همان نما نمایش داده می‌شود؛ اگر تصویر
 * موبایل ثبت نشده باشد، تصویر دسکتاپ جای آن نمی‌نشیند و بنر در موبایل دیده
 * نمی‌شود. (خواستهٔ مدیر: تغییر تصویر دسکتاپ نباید روی موبایل اثر بگذارد.)
 */

import {
  sanitizeBannerTextLayers,
  type BannerTextLayer,
  type BannerTextScrim,
} from "./bannerText";

export type BannerPosition = "home_hero" | "home_strip" | "products_top";

export interface StorefrontBanner {
  id: number;
  title: string | null;
  subtitle: string | null;
  /** تصویر دسکتاپ (از ۷۶۸ پیکسل به بالا). */
  image: string | null;
  /** تصویر موبایل (زیر ۷۶۸ پیکسل)؛ اختیاری و مستقل از تصویر دسکتاپ. */
  mobile_image: string | null;
  /** متن جایگزین تصویر برای سئو و screen reader. */
  image_alt?: string | null;
  /** پردهٔ تیره پشت متن (none | light | medium | dark). */
  text_scrim?: string | null;
  /** لایه‌های متن مدیریت‌شده روی بنر (JSON از API). */
  text_layers?: unknown;
  link: string | null;
  button_label: string | null;
  position: BannerPosition;
}

export type BannerViewport = "desktop" | "mobile";

export function hasDesktopImage(
  banner: Pick<StorefrontBanner, "image">,
): boolean {
  return Boolean(banner.image?.trim());
}

export function hasMobileImage(
  banner: Pick<StorefrontBanner, "mobile_image">,
): boolean {
  return Boolean(banner.mobile_image?.trim());
}

/** لینک مقصد بنر؛ بنر بدون لینک به فهرست محصولات می‌رود. */
export function bannerTarget(banner: Pick<StorefrontBanner, "link">): string {
  const target = banner.link?.trim();

  return target && target.length > 0 ? target : "/products";
}

/**
 * لایه‌های متن مدیریت‌شدهٔ بنر.
 * اگر مدیر متنی اضافه نکرده باشد، آرایهٔ خالی برمی‌گردد و متن قدیمی
 * (title/subtitle) نمایش داده می‌شود.
 */
export function bannerTextLayers(
  banner: Pick<StorefrontBanner, "text_layers">,
): BannerTextLayer[] {
  return sanitizeBannerTextLayers(banner.text_layers);
}

export function hasBannerTextLayers(
  banner: Pick<StorefrontBanner, "text_layers">,
): boolean {
  return bannerTextLayers(banner).length > 0;
}

/** متن جایگزین تصویر: alt ثبت‌شده، وگرنه عنوان بنر. */
export function bannerImageAlt(
  banner: Pick<StorefrontBanner, "image_alt" | "title">,
): string {
  const alt = banner.image_alt?.trim();

  if (alt) return alt;

  const title = banner.title?.trim();

  return title && title.length > 0 ? title : "بنر فروشگاه";
}

/** پردهٔ تیره پشت متن؛ مقدار ناشناخته به none برمی‌گردد. */
export function bannerTextScrim(
  banner: Pick<StorefrontBanner, "text_scrim">,
): BannerTextScrim {
  const scrim = banner.text_scrim?.trim().toLowerCase();

  return scrim === "light" || scrim === "medium" || scrim === "dark"
    ? scrim
    : "none";
}

export function isExternalBannerLink(target: string): boolean {
  return /^https?:\/\//i.test(target);
}

/** فهرست بنرهای یک نما؛ بنر بدون تصویر آن نما حذف می‌شود. */
export function filterBannersForViewport(
  banners: StorefrontBanner[],
  viewport: BannerViewport,
): StorefrontBanner[] {
  return banners.filter((banner) =>
    viewport === "mobile" ? hasMobileImage(banner) : hasDesktopImage(banner),
  );
}

/**
 * کلاس پنهان‌کردن یک بنر (یا کل یک بخش) در نمایی که تصویرش را ندارد.
 * - هر دو تصویر: بدون کلاس (در هر دو نما دیده می‌شود)
 * - فقط دسکتاپ: `hidden md:block`
 * - فقط موبایل: `md:hidden`
 * - هیچ‌کدام: `hidden`
 */
export function viewportVisibilityClass(
  hasDesktop: boolean,
  hasMobile: boolean,
): string {
  if (hasDesktop && hasMobile) return "";
  if (hasDesktop) return "hidden md:block";
  if (hasMobile) return "md:hidden";

  return "hidden";
}

/** همان کلاس بالا، بر اساس تصاویر خودِ بنر. */
export function bannerViewportClass(banner: StorefrontBanner): string {
  return viewportVisibilityClass(hasDesktopImage(banner), hasMobileImage(banner));
}
