import { useEffect } from "react";

import { usePublicBannerFonts } from "../hooks/useBannerFonts";
import {
  bannerFontPreloadUrls,
  bannerFontsCss,
  bannerFontStylesheetUrls,
  type BannerFontRecord,
} from "../utils/bannerFonts";

/**
 * تزریق فونت‌های سفارشی بنر در فروشگاه.
 *
 * فونت‌های بارگذاری‌شده با `@font-face` و نشانی‌های بیرونی CSS (مثل گوگل
 * فونت) با تگ link در head اضافه می‌شوند تا لایه‌های متن بتوانند از فونت
 * دلخواه مدیر استفاده کنند. تزریق در head انجام می‌شود تا نشانه‌گذاری صفحه
 * (که برای سئو مهم است) تمیز بماند.
 */
interface BannerFontStylesProps {
  /** فهرست آماده (در پنل مدیریت از API مدیران پر می‌شود). */
  fonts?: BannerFontRecord[];
}

const STYLE_ELEMENT_ID = "banner-custom-fonts";

function BannerFontStyles({ fonts }: BannerFontStylesProps) {
  const publicFonts = usePublicBannerFonts();
  const list = fonts ?? publicFonts;

  const css = bannerFontsCss(list);
  // رشتهٔ پایدار به‌جای آرایه تا افکت فقط با تغییر واقعی اجرا شود.
  const stylesheets = bannerFontStylesheetUrls(list).join("|");

  /*
   * پیش‌بارگذاری فایل فونت‌های بارگذاری‌شده (فقط woff2) تا متن بنر بدون
   * پرش (CLS) و با تأخیر کمتر رندر شود. برای فایل روی دامنهٔ دیگر، مرورگر
   * بدون crossorigin حتی فایل را دور می‌ریزد.
   */
  const preloads = bannerFontPreloadUrls(list)
    .filter((href) => href.toLowerCase().endsWith(".woff2"))
    .join("|");

  useEffect(() => {
    const existing = document.getElementById(STYLE_ELEMENT_ID);

    if (!css) {
      existing?.remove();

      return;
    }

    const element =
      existing instanceof HTMLStyleElement
        ? existing
        : document.createElement("style");

    if (!(existing instanceof HTMLStyleElement)) {
      element.id = STYLE_ELEMENT_ID;
      document.head.appendChild(element);
    }

    element.textContent = css;
  }, [css]);

  useEffect(() => {
    if (!stylesheets) return;

    stylesheets.split("|").forEach((href) => {
      const alreadyLoaded = Array.from(
        document.head.querySelectorAll<HTMLLinkElement>("link[data-banner-font]"),
      ).some((link) => link.dataset.bannerFont === href);

      if (alreadyLoaded) return;

      const link = document.createElement("link");

      link.rel = "stylesheet";
      link.href = href;
      link.dataset.bannerFont = href;
      document.head.appendChild(link);
    });
  }, [stylesheets]);

  useEffect(() => {
    if (!preloads) return;

    preloads.split("|").forEach((href) => {
      const alreadyLoaded = Array.from(
        document.head.querySelectorAll<HTMLLinkElement>(
          "link[data-banner-font-preload]",
        ),
      ).some((link) => link.dataset.bannerFontPreload === href);

      if (alreadyLoaded) return;

      const link = document.createElement("link");

      link.rel = "preload";
      link.as = "font";
      link.type = "font/woff2";
      link.crossOrigin = "anonymous";
      link.href = href;
      link.dataset.bannerFontPreload = href;
      document.head.appendChild(link);
    });
  }, [preloads]);

  return null;
}

export default BannerFontStyles;
