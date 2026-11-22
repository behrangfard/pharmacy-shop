import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * مدیریت اسکرول در ناوبری سمت کلاینت (کل فروشگاه و پنل).
 *
 * - رفتن به صفحهٔ تازه (کلیک روی لینک/منو): از بالای همان صفحه.
 * - برگشت با دکمهٔ Back (یا رفتن به جلو با Forward): همان جایی که کاربر قبلاً
 *   بود، نه از بالای صفحه.
 *
 * بدون این کامپوننت مسیریابی سمت کلاینت موقعیت اسکرول صفحهٔ قبلی را نگه
 * می‌دارد؛ اگر صفحهٔ جدید کوتاه‌تر باشد مرورگر آن عدد را تا انتهای صفحه
 * محدود می‌کند و در نتیجه صفحه از پایین باز می‌شود و کاربر باید دستی
 * به بالا اسکرول کند.
 */

/** مهلت تلاش برای بازگردانی؛ صفحه‌هایی که داده‌شان دیر می‌رسد تا این مدت دوباره تلاش می‌شوند. */
const RESTORE_TIMEOUT_MS = 2000;

/**
 * اسکرول پرشی به موقعیت مشخص.
 *
 * `behavior: "auto"` برای اسکرول پرشی است؛ اگر استایل صفحه `scroll-behavior`
 * نرم داشته باشد اسکرول نرم کاربر را گیج می‌کند.
 */
function jumpTo(top: number) {
  window.scrollTo({ top, left: 0, behavior: "auto" });
  document.documentElement.scrollTop = top;
  document.body.scrollTop = top;
}

/** موقعیت فعلی اسکرول سند (در بعضی مرورگرها فقط یکی از این سه مقدار به‌روز است). */
function readScrollY(): number {
  return Math.max(
    window.scrollY || 0,
    document.documentElement.scrollTop || 0,
    document.body.scrollTop || 0,
  );
}

function ScrollToTop() {
  const { pathname, hash, key } = useLocation();
  const navigationType = useNavigationType();

  /** آخرین موقعیت اسکرول هر ورودی تاریخچه، با کلید همان ورودی. */
  const positions = useRef(new Map<string, number>());
  /** کلید ورودی تاریخچهٔ فعلی؛ موقعیت‌ها با همین کلید ذخیره می‌شوند. */
  const currentKey = useRef<string>("");
  /** فریم در انتظار ذخیره (throttle با requestAnimationFrame). */
  const pendingSave = useRef(0);
  /** هنگام بازگردانی، موقعیت‌های میانی نباید به‌عنوان موقعیت کاربر ذخیره شوند. */
  const restoring = useRef(false);
  /** هر ناوبری تازه، بازگردانی در جریان را باطل می‌کند. */
  const navigationId = useRef(0);

  /**
   * بازگردانی خودکار مرورگر خاموش می‌شود تا خودمان موقعیت‌ها را مدیریت کنیم:
   * مرورگر پیش از رندر شدن صفحهٔ مقصد (و پیش از رسیدن داده‌های async) تلاش
   * می‌کند و روی صفحهٔ کوتاه در جای اشتباه می‌نشیند.
   */
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  /** آخرین موقعیت اسکرول صفحهٔ فعلی را برای همان ورودی تاریخچه نگه می‌دارد. */
  useEffect(() => {
    const onScroll = () => {
      if (pendingSave.current) {
        return;
      }

      pendingSave.current = requestAnimationFrame(() => {
        pendingSave.current = 0;

        if (!restoring.current) {
          positions.current.set(currentKey.current, readScrollY());
        }
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);

      if (pendingSave.current) {
        cancelAnimationFrame(pendingSave.current);
        pendingSave.current = 0;
      }
    };
  }, []);

  useEffect(() => {
    const id = ++navigationId.current;
    const entryKey = key || pathname;

    // فریم ذخیرهٔ صفحهٔ قبلی نباید با کلید ورودی تازه ثبت شود.
    if (pendingSave.current) {
      cancelAnimationFrame(pendingSave.current);
      pendingSave.current = 0;
    }

    currentKey.current = entryKey;

    const hashTarget = hash ? document.getElementById(hash.slice(1)) : null;

    if (hashTarget) {
      restoring.current = false;
      hashTarget.scrollIntoView({ block: "start" });

      return;
    }

    // فقط برگشت/جلوی مرورگر موقعیت قبلی را بازمی‌گرداند؛ رفتن به صفحهٔ تازه
    // همیشه از بالاست.
    const saved =
      navigationType === "POP" ? positions.current.get(entryKey) : undefined;

    if (!saved) {
      restoring.current = false;
      jumpTo(0);

      return;
    }

    restoring.current = true;

    const deadline = performance.now() + RESTORE_TIMEOUT_MS;
    let frame = 0;
    let stopped = false;

    const stop = () => {
      if (stopped) {
        return;
      }

      stopped = true;

      if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }

      restoring.current = false;
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("keydown", stop);
    };

    /**
     * صفحهٔ مقصد ممکن است داده‌اش را دیرتر بیاورد و ارتفاعش هنوز کم باشد؛ پس
     * تا رسیدن به موقعیت هدف (یا پایان مهلت) روی هر فریم دوباره تلاش می‌شود.
     */
    const step = () => {
      frame = 0;

      if (stopped || id !== navigationId.current) {
        stop();

        return;
      }

      jumpTo(saved);

      if (Math.abs(readScrollY() - saved) < 2 || performance.now() > deadline) {
        stop();

        return;
      }

      frame = requestAnimationFrame(step);
    };

    // اگر کاربر خودش شروع به اسکرول کرد، بازگردانی رها شود تا با او کشمکش نکند.
    window.addEventListener("wheel", stop, { passive: true });
    window.addEventListener("touchstart", stop, { passive: true });
    window.addEventListener("keydown", stop);

    frame = requestAnimationFrame(step);

    return stop;
  }, [key, pathname, hash, navigationType]);

  return null;
}

export default ScrollToTop;
