import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * مدیریت اسکرول در ناوبری سمت کلاینت (کل فروشگاه و پنل).
 *
 * - رفتن به صفحهٔ تازه (کلیک روی لینک/منو): از بالای همان صفحه.
 * - برگشت با دکمهٔ Back (یا رفتن به جلو با Forward): همان جایی که کاربر قبلاً
 *   بود، نه از بالای صفحه.
 * - بازگردانی یک‌جهته و با آستانهٔ چند پیکسل است تا صفحه «بالا-پایین» نپرد، و
 *   تا وقتی ارتفاع صفحهٔ مقصد به ارتفاع دفعهٔ قبل نرسیده عجله نمی‌کند (محتوا
 *   async می‌رسد و ارتفاعِ اولیهٔ صفحه کوتاه است).
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

/** چند میلی‌ثانیه بدون تغییر ارتفاع سند = چیدمان آرام شده است. */
const SETTLE_MS = 300;

/**
 * مهلت صبر برای رسیدن ارتفاع صفحه به ارتفاع دفعهٔ قبل.
 *
 * صفحهٔ مقصد (مثلاً صفحهٔ اصلی فروشگاه) بخش‌هایش را async می‌گیرد؛ تا رسیدن
 * داده، ارتفاع سند کوتاه است و موقعیت ذخیره‌شده حتی قابل‌دسترس نیست. اگر در
 * همان حال «تمام‌شده» حساب کنیم، بعد از رسیدن محتوا صفحه نزدیک بالا می‌ماند —
 * همان برگشتِ ناخواسته به بالای صفحه. پس تا این مدت منتظر می‌مانیم.
 */
const CONTENT_WAIT_MS = 2000;

/**
 * ارتفاع صفحه باید حداقل این نسبت از ارتفاع دفعهٔ قبل باشد تا «محتوا برگشته»
 * شمرده شود. رواداری کم است چون ارتفاع سند مستقل از ارتفاع ویوپورت است و هر
 * تفاوت محسوس یعنی بخشی از محتوا (مثلاً بنرهای بالای صفحهٔ اصلی) هنوز نرسیده
 * است؛ نوشتنِ زودهنگام در آن حالت موقعیت را جلو می‌اندازد.
 */
const HEIGHT_READY_RATIO = 0.96;

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

/**
 * ارتفاع سند؛ با آن تشخیص می‌دهیم محتوای صفحهٔ مقصد برگشته است یا نه.
 * (محتوا که می‌رسد ارتفاع عوض می‌شود.)
 */
function documentHeight(): number {
  return Math.max(
    document.documentElement.scrollHeight,
    document.body.scrollHeight,
  );
}

/**
 * بلندترین موقعیتی که صفحهٔ فعلی اجازه می‌دهد.
 *
 * در محیط بدون چیدمان (jsdom در تست) ارتفاع سند صفر است؛ آن‌جا محدودیتی
 * نمی‌گذاریم تا مقدار هدف مستقیم اعمال شود.
 */
function maxScroll(): number {
  const height = documentHeight();

  return height > 0 ? Math.max(0, height - window.innerHeight) : Infinity;
}

/** موقعیت اسکرول یک ورودی تاریخچه، همراه ارتفاع سند در همان لحظه. */
type SavedPosition = { y: number; height: number };

function ScrollToTop() {
  const { pathname, hash, key } = useLocation();
  const navigationType = useNavigationType();

  /** آخرین موقعیت اسکرول هر ورودی تاریخچه، با کلید همان ورودی. */
  const positions = useRef(new Map<string, SavedPosition>());
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
          positions.current.set(currentKey.current, {
            y: readScrollY(),
            height: documentHeight(),
          });
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
    /** موقعیت ذخیره‌شدهٔ همین ورودی (همراه ارتفاع سند در همان لحظه). */
    let savedEntry =
      navigationType === "POP" ? positions.current.get(entryKey) : undefined;

    /*
     * بازنویسی آدرس در همان صفحه، درست بعد از بازگشت: موقعیت ورودی قبلی به کلید
     * تازه منتقل می‌شود تا بازگردانی ادامه پیدا کند و ورودی جدید هم موقعیتش را
     * برای Backهای بعدی داشته باشد.
     */
    if (
      savedEntry === undefined &&
      samePageReplace &&
      previousEntryKey &&
      performance.now() < restoreUntil.current
    ) {
      const carried = positions.current.get(previousEntryKey);

      if (carried) {
        savedEntry = carried;
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
        saved: savedEntry?.y,
        savedHeight: savedEntry?.height,
        y: readScrollY(),
        height: document.documentElement.scrollHeight,
      });
    }

    if (!savedEntry) {
      restoring.current = false;
      restoreUntil.current = 0;
      jumpTo(0);

      return;
    }

    /** از این‌جا به بعد مقدار قطعی است؛ داخل توابع بسته هم عدد می‌ماند. */
    const restoreTo = savedEntry.y;
    /** ارتفاعی که صفحهٔ مقصد باید به آن برگردد تا محتوایش کامل باشد. */
    const restoreHeight = savedEntry.height;

    restoring.current = true;

    const startedAt = performance.now();
    const deadline = startedAt + RESTORE_WINDOW_MS;

    // تا این زمان، REPLACE در همین مسیر «ادامهٔ بازگردانی» شمرده می‌شود.
    restoreUntil.current = deadline;
    let frame = 0;
    let stopped = false;
    let lastHeight = -1;
    /** آخرین بار که ارتفاع سند عوض شد؛ مبنای تشخیص «آرام شدن» چیدمان. */
    let lastChangedAt = performance.now();
    /** آخرین موقعیتی که خودمان اعمال کردیم؛ تا تغییر معنادار بعدی نوشتنی نداریم. */
    let applied = -1;

    /*
     * «anchor» خودکار مرورگر روشن می‌ماند: اگر محتوایی بالای ناحیهٔ دید برسد،
     * مرورگر خودش موقعیت را نگه می‌دارد تا محتوا نپرد. ما هم فقط زمانی
     * می‌نویسیم که هدفِ قابل‌دسترس بزرگ‌تر شده باشد، پس با هم کشمکش نمی‌کنند.
     */

    /** برای برداشتن شنونده‌ها؛ بعد از تعریف `stop` مقدار می‌گیرد. */
    let abort: (() => void) | null = null;

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
          target: restoreTo,
          height: documentHeight(),
          y: readScrollY(),
          ms: Math.round(performance.now() - startedAt),
        });
      }
      if (abort) {
        window.removeEventListener("wheel", abort);
        window.removeEventListener("touchstart", abort);
        window.removeEventListener("keydown", abort);
      }
    };

    /**
     * بازگردانی تا آماده شدن صفحهٔ مقصد: یک‌جهته، با آستانه، و بدون عجله.
     *
     * تا وقتی موقعیت ذخیره‌شده در ارتفاع فعلی سند قابل‌دسترس نیست، نوشتنی
     * انجام نمی‌شود (محتوا هنوز نرسیده). وقتی رسید، یک‌بار به هدف می‌رویم.
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

      const now = performance.now();
      const height = documentHeight();

      if (height !== lastHeight) {
        lastHeight = height;
        lastChangedAt = now;
      }

      const quietFor = now - lastChangedAt;
      /* ارتفاع صفحه به ارتفاع دفعهٔ قبل برگشته است؟ یعنی محتوا کامل شده. */
      const heightReady =
        restoreHeight <= 0 || height >= restoreHeight * HEIGHT_READY_RATIO;

      /*
       * نوشتن مستقیم روی `restoreTo` فقط وقتی مجاز است که محتوای صفحه برگشته
       * باشد. اگر زودتر بنویسیم، بخش‌هایی که هنوز نیامده‌اند بعداً «بالای» ناحیهٔ
       * دید جا می‌گیرند و anchor مرورگر برای ثابت نگه‌داشتن محتوا اسکرول را به
       * اندازهٔ همان بخش‌ها جابه‌جا می‌کند؛ نتیجه: موقعیت نهایی از موقعیت واقعی
       * کاربر جلو می‌زند (لاگ: هدف ۲۴۴۲، پایان ۴۰۷۵).
       */
      const contentReady = heightReady || quietFor >= CONTENT_WAIT_MS;
      const available = maxScroll();

      if (contentReady) {
        const target = Math.min(restoreTo, available);

        if (applied < 0 || target - applied >= JUMP_THRESHOLD_PX) {
          jumpTo(target);
          applied = target;
        }
      }

      const settled =
        // تا وقتی fallback صفحه (Suspense) روی صفحه است، چیدمان «آرام» نیست:
        // ارتفاع فعلی مال صفحهٔ لودینگ است و اعتماد به آن باعث پرش بعدی می‌شد.
        !document.querySelector("[data-route-fallback]") &&
        quietFor >= SETTLE_MS &&
        (heightReady
          ? applied >= 0 ||
            // anchor مرورگر خودش ما را جای درست گذاشته است.
            readScrollY() >= restoreTo - JUMP_THRESHOLD_PX
          : // ارتفاع برنگشته و مدت‌ها هم ثابت مانده: صفحه واقعاً همین قد است.
            quietFor >= CONTENT_WAIT_MS);

      if (settled || now > deadline) {
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
