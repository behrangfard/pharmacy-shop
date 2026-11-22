import { useEffect, useLayoutEffect, useRef } from "react";
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

/**
 * پنجرهٔ بازگردانی: تا این مدت موقعیت هدف پیوسته اعمال می‌شود.
 *
 * صفحهٔ مقصد معمولاً اول اسکلتون/محتوای موقت نشان می‌دهد و بعد محتوای واقعی
 * جایش را می‌گیرد؛ ارتفاع سند در این فاصله عوض می‌شود و مرورگر موقعیت اسکرول
 * را به انتهای صفحهٔ کوتاه‌تر «قُلِنج» می‌دهد. برای همین بازگردانی یک‌باره
 * کافی نیست.
 */
const RESTORE_WINDOW_MS = 4000;

/** چند فریم بدون تغییر ارتفاع سند = چیدمان آرام شده است (~۳۰۰ms). */
const SETTLE_FRAMES = 18;

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

  useLayoutEffect(() => {
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

    /*
     * گزارش تشخیصی در حالت توسعه: با دیدن این خط در Console مرورگر می‌شود فهمید
     * بازگردانی چرا انجام نشده (نوع ناوبری، کلید ورودی، موقعیت ذخیره‌شده).
     */
    if (import.meta.env.DEV) {
      console.debug("[scroll]", {
        type: navigationType,
        key: entryKey,
        saved,
        y: readScrollY(),
        height: document.documentElement.scrollHeight,
      });
    }

    if (!saved) {
      restoring.current = false;
      jumpTo(0);

      return;
    }

    restoring.current = true;

    const startedAt = performance.now();
    const deadline = startedAt + RESTORE_WINDOW_MS;
    let frame = 0;
    let stopped = false;
    let lastHeight = -1;
    let stableFrames = 0;

    /** ارتفاع سند برای تشخیص «آرام شدن» چیدمان (محتوا که می‌رسد عوض می‌شود). */
    const documentHeight = () =>
      Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight,
      );

    const stop = () => {
      if (stopped) {
        return;
      }

      stopped = true;

      if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }

      /*
       * اینجا موقعیت ذخیره نمی‌شود: هنگام پاک شدن این افکت، DOM صفحهٔ بعدی جای
       * صفحهٔ فعلی نشسته است و خواندن موقعیت، عدد قُلِنج‌شده (اشتباه) می‌دهد.
       */
      restoring.current = false;

      if (import.meta.env.DEV) {
        console.debug("[scroll] stop", {
          key: entryKey,
          target: saved,
          y: readScrollY(),
          ms: Math.round(performance.now() - startedAt),
        });
      }
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("keydown", stop);
    };

    /**
     * تا آرام شدن چیدمان، موقعیت هدف هر فریم دوباره اعمال می‌شود؛ نه فقط تا
     * اولین رسیدن. اگر صفحه اول بلند باشد و بعد کوتاه شود، «رسیدن» موقتی است و
     * مرورگر موقعیت را جابه‌جا می‌کند — همان پرشی که کاربر می‌دید.
     */
    const step = () => {
      frame = 0;

      if (stopped || id !== navigationId.current) {
        stop();

        return;
      }

      if (Math.abs(readScrollY() - saved) >= 2) {
        jumpTo(saved);
      }

      const height = documentHeight();

      if (height === lastHeight) {
        stableFrames += 1;
      } else {
        lastHeight = height;
        stableFrames = 0;
      }

      const settled =
        // تا وقتی fallback صفحه (Suspense) روی صفحه است، چیدمان «آرام» نیست:
        // ارتفاع فعلی مال صفحهٔ لودینگ است و اعتماد به آن باعث پرش بعدی می‌شد.
        !document.querySelector("[data-route-fallback]") &&
        stableFrames >= SETTLE_FRAMES &&
        (Math.abs(readScrollY() - saved) < 2 ||
          // صفحهٔ مقصد کوتاه‌تر از موقعیت قبلی است؛ تا انتهای ممکن می‌رویم.
          readScrollY() >= height - window.innerHeight - 2);

      if (settled || performance.now() > deadline) {
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
