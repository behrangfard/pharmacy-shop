import { useEffect, useState } from "react";

/**
 * پاسخ زندهٔ یک media query مرورگر.
 *
 * چرا: بخش‌های صفحهٔ اصلی (هیرو دسکتاپ/موبایل، بنر چندستونه) قبلاً هر دو در
 * DOM رندر می‌شدند و فقط با کلاس‌های `hidden md:block` پنهان می‌شدند؛ یعنی
 * متن/تیتر تکراری در DOM می‌ماند (مشکل سئو) و هر دو کاروسل هم در حافظه
 * می‌نشستند. با این هوک فقط بخش مربوط به نمای فعلی رندر می‌شود.
 *
 * مقدار اولیه همگام خوانده می‌شود تا در دسکتاپ اولین رنگ‌آمیزی هم درست باشد
 * (بدون پرش چیدمان). در محیط بدون `window` (تست/SSR) `false` است.
 */
export function useMediaQuery(query: string, fallback = false): boolean {
  const read = (): boolean => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return fallback;
    }

    return window.matchMedia(query).matches;
  };

  const [matches, setMatches] = useState<boolean>(read);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia(query);

    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // مقدار فعلی هم دوباره خوانده می‌شود تا بین رندر و افکت عقب نماند.
    setMatches(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);

      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    // Safari قدیمی‌تر: API قدیمی addListener.
    mediaQuery.addListener(handleChange);

    return () => mediaQuery.removeListener(handleChange);
  }, [query]);

  return matches;
}

/** آستانهٔ دسکتاپ؛ هم‌راستا با کلاس‌های `md:` تیلویند (۷۶۸px). */
export const DESKTOP_MEDIA_QUERY = "(min-width: 768px)";

export default useMediaQuery;
