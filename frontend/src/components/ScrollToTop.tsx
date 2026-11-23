import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * مدیریت اسکرول در ناوبری سمت کلاینت (کل فروشگاه و پنل).
 *
 * - رفتن به صفحهٔ تازه (کلیک روی لینک/منو): از بالای همان صفحه.
 * - برگشت با دکمهٔ Back (یا رفتن به جلو با Forward): همان جایی که کاربر قبلاً
 *   بود، نه از بالای صفحه.
 * - بازگردانی نرم است: فقط رو به پایین دنبال می‌شود، با آستانهٔ چند پیکسل و با
 *   خاموش‌کردن anchor مرورگر، تا صفحه «بالا-پایین» نپرد.
 *
 * بدون این کامپوننت مسیریابی سمت کلاینت موقعیت اسکرول صفحهٔ قبلی را نگه
 * می‌دارد؛ اگر صفحهٔ جدید کوتاه‌تر باشد مرورگر آن عدد را تا انتهای صفحه
 * محدود می‌کند و در نتیجه صفحه از پایین باز می‌شود و کاربر باید دستی
 * به بالا اسکرول کند.
 */

/**
 * پنجرهٔ بازگردانی: تا این مدت، هدفِ «قابل‌دسترس» دنبال می‌شود.
 *
 * صفحهٔ مقصد معمولاً اول اسکلتون/محتوای موقت نشان می‌دهد و بعد محتوای واقعی
 * جایش را می‌گیرد؛ ارتفاع سند در این فاصله عوض می‌شود. برای همین بازگردانی
 * یک‌باره کافی نیست — ولی دنبال‌کردن هم باید یک‌جهته (رو به پایین) و با
 * آستانه باشد تا صفحه نلرزد.
 */
const RESTORE_WINDOW_MS = 4000;

/** چند فریم بدون تغییر ارتفاع سند = چیدمان آرام شده است (~۳۰۰ms). */
const SETTLE_FRAMES = 18;

/**
 * آستانهٔ حرکت: اختلاف‌های کمتر از این مقدار نادیده گرفته می‌شوند.
 *
 * چیدمان صفحه موقع بازگردانی چند پیکسل جابه‌جا می‌شود (تصویر/فونت/نوار اسکرول)؛
 * اصلاح همین چند پیکسل، همان لرزش «بالا-پایین» است که کاربر می‌دید.
 */
const JUMP_THRESHOLD_PX = 4;

/**
 * اسکرول پرشی به موقعیت مشخص.
 *
 * `behavior: "instant"` است نه `"auto"`: مقدار `"auto"` از `scroll-behavior` CSS
 * صفحه تبعیت می‌کند و اگر جایی نرم تعریف شده باشد، هر اصلاح به یک انیمیشن تبدیل
 * می‌شود؛ نتیجه‌اش لرزش است. فقط وقتی مقدار مستقیم جا نیفتاد، `scrollTop` را
 * دستی می‌گذاریم.
 */
function jumpTo(top: number) {
  window.scrollTo({ top, left: 0, behavior: "instant" });

  if (Math.abs(readScrollY() - top) >= 1) {
    document.documentElement.scrollTop = top;
    document.body.scrollTop = top;
  }
}

/** موقعیت فعلی اسکرول سند؛ `scrollY` مرجع اصلی است و بقیه فقط fallback‌اند. */
function readScrollY(): number {
  if (typeof window.scrollY === "number") {
    return window.scrollY;
  }

  return Math.max(
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
  /** کلید ورودی قبلی؛ برای انتقال موقعیت وقتی آدرسِ همان صفحه بازنویسی می‌شود. */
  const previousKey = useRef("");
  /** مسیر قبلی؛ برای تشخیص «بازنویسی آدرس در همان صفحه» از «رفتن به صفحهٔ تازه». */
  const previousPathname = useRef("");
  /** تا این زمان، یک REPLACE در همان مسیر ادامهٔ بازگردانی جاری شمرده می‌شود. */
  const restoreUntil = useRef(0);

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
    /*
     * بعضی صفحه‌ها بعد از mount آدرس را با `replace` بازنویسی می‌کنند (مثلاً
     * نرمال‌سازی پارامترهای فیلتر در `/products`)؛ این کار کلید ورودی تاریخچه را
     * عوض می‌کند و موقعیت ذخیره‌شده یتیم می‌ماند. اگر همین حالا بازگردانی در
     * جریان باشد، این REPLACE «همان صفحه» است و نباید پرش به بالا اجرا شود.
     */
    const samePageReplace =
      navigationType === "REPLACE" && previousPathname.current === pathname;
    const previousEntryKey = previousKey.current;
    const entryKey = key || pathname;

    previousKey.current = entryKey;
    previousPathname.current = pathname;

    // فریم ذخیرهٔ صفحهٔ قبلی نباید با کلید ورودی تازه ثبت شود.
    if (pendingSave.current) {
      cancelAnimationFrame(pendingSave.current);
      pendingSave.current = 0;
    }

    currentKey.current = entryKey;

    const hashTarget = hash ? document.getElementById(hash.slice(1)) : null;

    if (hashTarget) {
      restoring.current = false;
      restoreUntil.current = 0;
      hashTarget.scrollIntoView({ block: "start" });

      return;
    }

    // فقط برگشت/جلوی مرورگر موقعیت قبلی را بازمی‌گرداند؛ رفتن به صفحهٔ تازه
    // همیشه از بالاست.
    let saved =
      navigationType === "POP" ? positions.current.get(entryKey) : undefined;

    /*
     * بازنویسی آدرس در همان صفحه، درست بعد از بازگشت: موقعیت ورودی قبلی به کلید
     * تازه منتقل می‌شود تا بازگردانی ادامه پیدا کند و ورودی جدید هم موقعیتش را
     * برای Backهای بعدی داشته باشد.
     */
    if (
      saved === undefined &&
      samePageReplace &&
      previousEntryKey &&
      performance.now() < restoreUntil.current
    ) {
      const carried = positions.current.get(previousEntryKey);

      if (carried !== undefined) {
        saved = carried;
        positions.current.set(entryKey, carried);
        positions.current.delete(previousEntryKey);
      }
    }

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

    if (saved === undefined) {
      restoring.current = false;
      restoreUntil.current = 0;
      jumpTo(0);

      return;
    }

    /** از این‌جا به بعد مقدار قطعی است؛ داخل توابع بسته هم عدد می‌ماند. */
    const restoreTo = saved;

    restoring.current = true;

    const startedAt = performance.now();
    const deadline = startedAt + RESTORE_WINDOW_MS;

    // تا این زمان، REPLACE در همین مسیر «ادامهٔ بازگردانی» شمرده می‌شود.
    restoreUntil.current = deadline;
    let frame = 0;
    let stopped = false;
    let lastHeight = -1;
    let stableFrames = 0;
    /** آخرین موقعیتی که خودمان اعمال کردیم؛ تا تغییر معنادار بعدی نوشتنی نداریم. */
    let applied = -1;

    /*
     * در حین بازگردانی، «anchor» خودکار مرورگر خاموش می‌ماند: وقتی محتوای بالای
     * صفحه می‌رسد (تصویر/فونت)، مرورگر خودش موقعیت را جابه‌جا می‌کرد و ما هر فریم
     * پسش می‌زدیم — منبع اصلی لرزش صفحه. بعد از پایان، مقدار قبلی برمی‌گردد.
     */
    const root = document.documentElement;
    const previousAnchor = root.style.overflowAnchor;

    root.style.overflowAnchor = "none";

    /** برای برداشتن شنونده‌ها؛ بعد از تعریف `stop` مقدار می‌گیرد. */
    let abort: (() => void) | null = null;

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
      if (abort) {
        window.removeEventListener("wheel", abort);
        window.removeEventListener("touchstart", abort);
        window.removeEventListener("keydown", abort);
      }

      root.style.overflowAnchor = previousAnchor;
    };

    /** بلندترین موقعیتی که صفحهٔ فعلی اجازه می‌دهد. */
    const maxScroll = () => Math.max(0, documentHeight() - window.innerHeight);

    /**
     * تا آرام شدن چیدمان، بازگردانی فقط «رو به پایین» است.
     *
     * وقتی محتوای واقعی می‌رسد ارتفاع سند زیاد می‌شود و هدفِ قابل‌دسترس بزرگ‌تر
     * می‌شود؛ همان را می‌رویم. اصلاح رو به بالا انجام نمی‌شود، چون با جابه‌جایی
     * طبیعی چیدمان کشمکش می‌کرد و صفحه را «بالا-پایین» می‌پراند؛ اختلاف‌های زیر
     * `JUMP_THRESHOLD_PX` هم نادیده می‌مانند تا هیچ نوشتنی انجام نشود.
     */
    const step = () => {
      frame = 0;

      if (stopped || id !== navigationId.current) {
        stop();

        return;
      }

      const height = documentHeight();

      if (height === lastHeight) {
        stableFrames += 1;
      } else {
        lastHeight = height;
        stableFrames = 0;
      }

      const target = Math.min(restoreTo, maxScroll());

      if (applied < 0 || target - applied >= JUMP_THRESHOLD_PX) {
        jumpTo(target);
        applied = target;
      }

      const settled =
        // تا وقتی fallback صفحه (Suspense) روی صفحه است، چیدمان «آرام» نیست:
        // ارتفاع فعلی مال صفحهٔ لودینگ است و اعتماد به آن باعث پرش بعدی می‌شد.
        !document.querySelector("[data-route-fallback]") &&
        stableFrames >= SETTLE_FRAMES &&
        // صفحهٔ کوتاه‌تر: `target` خودش همان انتهای ممکن است، پس یکی‌اند.
        Math.abs(readScrollY() - target) < JUMP_THRESHOLD_PX;

      if (settled || performance.now() > deadline) {
        restoreUntil.current = 0;
        stop();

        return;
      }

      frame = requestAnimationFrame(step);
    };

    /*
     * اگر کاربر خودش شروع به اسکرول کرد، بازگردانی رها می‌شود تا با او کشمکش
     * نکند؛ آخرین موقعیت هم دیگر «ادامهٔ بازگردانی» شمرده نمی‌شود.
     */
    abort = () => {
      restoreUntil.current = 0;
      stop();
    };

    window.addEventListener("wheel", abort, { passive: true });
    window.addEventListener("touchstart", abort, { passive: true });
    window.addEventListener("keydown", abort);

    frame = requestAnimationFrame(step);

    return stop;
  }, [key, pathname, hash, navigationType]);

  return null;
}

export default ScrollToTop;
