import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { Check, Copy, X } from "lucide-react";

import {
  fetchPopups,
  getCachedPopups,
  markPopupDismissed,
  pickPopup,
  remainingMs,
  type PopupLayout,
  type PopupTheme,
  type StorefrontPopupRecord,
} from "../services/popups";
import { getStorageUrl } from "../utils/images";

/**
 * نمایش پاپ‌آپ تبلیغاتی در فروشگاه.
 *
 * این کامپوننت یک‌بار در Layout سوار می‌شود و با تغییر مسیر بررسی می‌کند آیا
 * پاپ‌آپ واجد شرایطی (صفحه/دستگاه/قاعدهٔ تکرار) وجود دارد یا نه. تأخیر باز
 * شدن، بستن با Esc/کلیک روی پس‌زمینه، بستن خودکار، شمارش معکوس و کپی کد
 * تخفیف همه از تنظیمات همان پاپ‌آپ در پنل مدیریت می‌آید.
 */

const THEME_CLASSES: Record<
  PopupTheme,
  {
    panel: string;
    muted: string;
    badge: string;
    primary: string;
    secondary: string;
    coupon: string;
  }
> = {
  light: {
    panel: "bg-white text-ink",
    muted: "text-muted",
    badge: "bg-brand-100 text-brand-700",
    primary: "bg-brand-500 text-white hover:bg-brand-700",
    secondary: "text-muted hover:bg-cream",
    coupon: "border-brand-250 bg-cream text-brand-700",
  },
  dark: {
    panel: "bg-[#16241c] text-white",
    muted: "text-white/70",
    badge: "bg-white/15 text-white",
    primary: "bg-white text-ink hover:bg-white/90",
    secondary: "text-white/80 hover:bg-white/10",
    coupon: "border-white/30 bg-white/10 text-white",
  },
  brand: {
    panel: "bg-brand-500 text-white",
    muted: "text-white/75",
    badge: "bg-white/20 text-white",
    primary: "bg-white text-brand-700 hover:bg-white/90",
    secondary: "text-white/85 hover:bg-white/10",
    coupon: "border-white/40 bg-white/15 text-white",
  },
};

const LAYOUT_WRAPPER: Record<PopupLayout, string> = {
  center: "items-center justify-center p-4",
  bottom: "items-end justify-center p-0 sm:p-6",
  corner: "items-end justify-start p-4 sm:items-end sm:justify-end",
};

const LAYOUT_PANEL: Record<PopupLayout, string> = {
  center: "max-w-md rounded-3xl",
  bottom: "max-w-lg rounded-t-3xl sm:rounded-3xl",
  corner: "max-w-sm rounded-2xl",
};

/** دستگاهی که کاربر با آن آمده است (آستانهٔ ۷۶۸px مثل Tailwind md). */
function isMobileViewport(): boolean {
  return typeof window !== "undefined" && window.innerWidth < 768;
}

/** عدد فارسی دو رقمی برای شمارش معکوس. */
function pad(value: number): string {
  return value.toLocaleString("fa-IR", { minimumIntegerDigits: 2 });
}

/** متن شمارش معکوس: روز/ساعت/دقیقه/ثانیه (بخش‌های صفر حذف می‌شوند). */
function countdownLabel(ms: number): string {
  const total = Math.floor(ms / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  if (days > 0) {
    return `${days.toLocaleString("fa-IR")} روز و ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function StorefrontPopup() {
  const location = useLocation();
  const [popup, setPopup] = useState<StorefrontPopupRecord | null>(null);
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  /** شناسهٔ پاپ‌آپی که در همین بارگذاری صفحه نمایش داده شد. */
  const shownRef = useRef<number | null>(null);

  const theme = THEME_CLASSES[popup?.theme ?? "light"];
  const imageUrl = useMemo(
    () => (popup?.image ? getStorageUrl(popup.image) : null),
    [popup?.image],
  );

  const close = () => {
    if (popup) {
      markPopupDismissed(popup);
    }

    setVisible(false);
    setOpen(false);
  };

  /*
   * با هر تغییر مسیر: از کش فوراً تصمیم می‌گیریم و سپس فهرست تازه را هم
   * بررسی می‌کنیم. تأخیر باز شدن طبق تنظیم پاپ‌آپ اعمال می‌شود.
   */
  useEffect(() => {
    let cancelled = false;
    let showTimer: number | null = null;
    let scheduled = false;

    setOpen(false);
    setVisible(false);
    setPopup(null);

    const consider = (list: StorefrontPopupRecord[]) => {
      if (cancelled || scheduled) {
        return;
      }

      const candidate = pickPopup(list, location.pathname, {
        isMobileViewport: isMobileViewport(),
      });

      if (candidate === null || shownRef.current === candidate.id) {
        return;
      }

      scheduled = true;

      showTimer = window.setTimeout(
        () => {
          if (cancelled) {
            return;
          }

          shownRef.current = candidate.id;
          setPopup(candidate);
          setCopied(false);
          setImageFailed(false);
          setNow(Date.now());
          setOpen(true);
        },
        Math.max(candidate.delay_seconds, 0) * 1000,
      );
    };

    const cached = getCachedPopups();

    if (cached.length > 0) {
      consider(cached);
    }

    void fetchPopups().then(consider);

    return () => {
      cancelled = true;

      if (showTimer !== null) {
        window.clearTimeout(showTimer);
      }
    };
  }, [location.pathname]);

  // انیمیشن ورود: پنل ابتدا نامرئی است و در فریم بعد ظاهر می‌شود.
  useEffect(() => {
    if (!open) {
      return;
    }

    const frame = window.requestAnimationFrame(() => setVisible(true));

    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  // شمارش معکوس و بستن خودکار.
  useEffect(() => {
    if (!open || popup === null) {
      return;
    }

    let autoTimer: number | null = null;
    let ticker: number | null = null;

    if (popup.countdown_to !== null) {
      ticker = window.setInterval(() => setNow(Date.now()), 1000);
    }

    if (popup.auto_close_seconds > 0) {
      autoTimer = window.setTimeout(close, popup.auto_close_seconds * 1000);
    }

    return () => {
      if (autoTimer !== null) {
        window.clearTimeout(autoTimer);
      }

      if (ticker !== null) {
        window.clearInterval(ticker);
      }
    };
    // close به popup وابسته است و با تغییر popup تازه می‌شود.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, popup]);

  // بستن با Esc + قفل اسکرول پشت پاپ‌آپ.
  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open || popup === null) {
    return null;
  }

  const countdown = remainingMs(popup.countdown_to, now);
  const isExternal = (href: string) =>
    /^(https?:)?\/\//i.test(href) || /^[a-z]+:/i.test(href);
  const hasImage = imageUrl !== null && !imageFailed;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(popup.coupon_code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // در مرورگرهای بدون دسترسی کلیپ‌بورد، کد همچنان قابل انتخاب است.
    }
  };

  const primaryLabel = popup.cta_text || "مشاهده";
  const hasActions =
    popup.cta_text !== "" || popup.secondary_text !== "" || popup.coupon_code !== "";

  const actionClass = `inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-black transition ${theme.primary}`;
  const secondaryClass = `inline-flex h-10 w-full items-center justify-center rounded-xl text-xs font-bold transition ${theme.secondary}`;

  const overlay = (
    <div
      className={`fixed inset-0 z-[95] flex bg-ink/50 backdrop-blur-sm transition-opacity duration-200 ${
        LAYOUT_WRAPPER[popup.layout]
      } ${visible ? "opacity-100" : "opacity-0"}`}
      onClick={() => {
        if (popup.close_on_backdrop) {
          close();
        }
      }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={popup.title || popup.badge || "پیشنهاد ویژه"}
        onClick={(event) => event.stopPropagation()}
        className={`relative w-full overflow-hidden shadow-2xl transition-all duration-200 ${
          LAYOUT_PANEL[popup.layout]
        } ${theme.panel} ${
          visible
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-2 scale-95 opacity-0"
        }`}
      >
        {popup.show_close && (
          <button
            type="button"
            onClick={close}
            aria-label="بستن پاپ‌آپ"
            className={`absolute left-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full backdrop-blur transition ${theme.secondary}`}
          >
            <X size={16} />
          </button>
        )}

        <div
          className={
            hasImage && popup.image_position === "side"
              ? "sm:grid sm:grid-cols-[38%_1fr] sm:items-stretch"
              : ""
          }
        >
          {imageUrl && !imageFailed && (
            <img
              src={imageUrl}
              alt={popup.image_alt || popup.title}
              onError={() => setImageFailed(true)}
              loading="lazy"
              className={
                popup.image_position === "side"
                  ? "h-40 w-full object-cover sm:h-full sm:min-h-[220px]"
                  : "max-h-52 w-full object-cover"
              }
            />
          )}

          <div className="p-5 sm:p-6">
            {popup.badge && (
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black ${theme.badge}`}
              >
                {popup.badge}
              </span>
            )}

            {popup.title && (
              <h2 className="mt-2.5 text-lg font-black leading-7 sm:text-xl">
                {popup.title}
              </h2>
            )}

            {popup.description && (
              <p className={`mt-2 text-[13px] leading-6 ${theme.muted}`}>
                {popup.description}
              </p>
            )}

            {countdown > 0 && (
              <div
                className={`mt-3 rounded-xl border px-3 py-2 text-center ${theme.coupon}`}
              >
                <span className="block text-[10px] font-bold opacity-80">
                  پایان پیشنهاد تا
                </span>
                <span
                  dir="ltr"
                  className="mt-0.5 block text-sm font-black tracking-wider"
                >
                  {countdownLabel(countdown)}
                </span>
              </div>
            )}

            {popup.coupon_code && (
              <div
                className={`mt-3 flex items-center justify-between gap-2 rounded-xl border border-dashed px-3 py-2 ${theme.coupon}`}
              >
                <span dir="ltr" className="text-sm font-black tracking-[0.2em]">
                  {popup.coupon_code}
                </span>

                <button
                  type="button"
                  onClick={() => void handleCopy()}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold transition hover:bg-white/10"
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? "کپی شد" : "کپی کد"}
                </button>
              </div>
            )}

            {hasActions && (
              <div className="mt-4 space-y-2">
                {popup.cta_text !== "" &&
                  (popup.cta_link !== "" && !isExternal(popup.cta_link) ? (
                    <Link to={popup.cta_link} onClick={close} className={actionClass}>
                      {primaryLabel}
                    </Link>
                  ) : popup.cta_link !== "" ? (
                    <a
                      href={popup.cta_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={close}
                      className={actionClass}
                    >
                      {primaryLabel}
                    </a>
                  ) : (
                    <button type="button" onClick={close} className={actionClass}>
                      {primaryLabel}
                    </button>
                  ))}

                {popup.secondary_text !== "" &&
                  (popup.secondary_link !== "" &&
                  !isExternal(popup.secondary_link) ? (
                    <Link
                      to={popup.secondary_link}
                      onClick={close}
                      className={secondaryClass}
                    >
                      {popup.secondary_text}
                    </Link>
                  ) : popup.secondary_link !== "" ? (
                    <a
                      href={popup.secondary_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={close}
                      className={secondaryClass}
                    >
                      {popup.secondary_text}
                    </a>
                  ) : (
                    <button type="button" onClick={close} className={secondaryClass}>
                      {popup.secondary_text}
                    </button>
                  ))}

                {popup.cta_text === "" && popup.secondary_text === "" && (
                  <button type="button" onClick={close} className={actionClass}>
                    متوجه شدم
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}

export default StorefrontPopup;
