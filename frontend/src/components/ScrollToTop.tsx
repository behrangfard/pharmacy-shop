import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * با باز شدن هر صفحه، اسکرول را به بالای صفحه برمی‌گرداند.
 *
 * بدون این کامپوننت مسیریابی سمت کلاینت موقعیت اسکرول صفحهٔ قبلی را نگه
 * می‌دارد؛ اگر صفحهٔ جدید کوتاه‌تر باشد مرورگر آن عدد را تا انتهای صفحه
 * محدود می‌کند و در نتیجه صفحه از پایین باز می‌شود و کاربر باید دستی
 * به بالا اسکرول کند.
 */
function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    // بعد از رفرش یا بازگشت با دکمهٔ مرورگر، خود مرورگر موقعیت قبلی را
    // بازنمی‌گرداند تا صفحهٔ تازه از بالای خودش دیده شود.
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useEffect(() => {
    const hashTarget = hash ? document.getElementById(hash.slice(1)) : null;

    if (hashTarget) {
      hashTarget.scrollIntoView({ block: "start" });

      return;
    }

    // behavior: "auto" برای اسکرول پرشی است؛ اگر استایل صفحه scroll-behavior
    // نرم داشته باشد اسکرول نرم کاربر را گیج می‌کند.
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname, hash]);

  return null;
}

export default ScrollToTop;
