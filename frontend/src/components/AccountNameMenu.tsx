import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ChevronDown,
  ChevronLeft,
  Package,
  User,
  UserCircle2,
} from "lucide-react";

type AccountNameMenuVariant = "page" | "header" | "icon";

type AccountNameMenuProps = {
  /** نام صاحب حساب که برچسب دکمهٔ منو را می‌سازد. */
  name: string;
  /**
   * ظاهر دکمهٔ منو:
   * - `page`: نام بزرگ در سربرگ کارت پروفایل صفحهٔ `/account` (پیش‌فرض).
   * - `header`: آواتار + نام در هدر سایت (دسکتاپ).
   * - `icon`: فقط آیکن کاربر در هدر سایت (موبایل).
   */
  variant?: AccountNameMenuVariant;
};

/**
 * نام صاحب حساب به‌صورت منوی بازشو.
 *
 * با کلیک روی نام، دو میان‌بر نشان داده می‌شود: «سفارش‌های من»
 * (`/account/orders`) و «حساب کاربری من» (`/account`). منو با کلیک بیرون،
 * کلید Escape یا تغییر مسیر بسته می‌شود (همان الگوی `HeaderSearch.tsx`).
 * این کامپوننت هم در هدر سایت (دسکتاپ با نام، موبایل با آیکن) و هم در سربرگ
 * کارت پروفایل صفحهٔ `/account` استفاده می‌شود.
 */
function AccountNameMenu({ name, variant = "page" }: AccountNameMenuProps) {
  const [open, setOpen] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);

  // ممکن است دو نمونه از این منو در یک صفحه باشد (هدر + کارت پروفایل)؛ شناسهٔ
  // aria-controls باید یکتا بماند.
  const menuId = useId();

  const location = useLocation();

  // بستن منو با کلیک بیرون از آن.
  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  // بستن منو با کلید Escape.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // با رفتن به صفحهٔ دیگر، منو باز نمی‌ماند.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const isIcon = variant === "icon";

  // در هدر سایت دکمهٔ آیکن سمت چپ هدر می‌نشیند؛ منو باید به سمت راست (داخل
  // صفحه) باز شود، پس لبهٔ چپ منو به دکمه می‌چسبد. در حالت‌های نام‌دار، دکمه
  // سمت راست است و منو به سمت چپ باز می‌شود.
  const menuAlignClass = isIcon ? "start-0" : "end-0";

  const triggerClass = [
    "group flex items-center rounded-xl text-right transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
    variant === "page" ? "gap-2" : "",
    variant === "header" ? "gap-2 text-ink-soft hover:text-plum-500" : "",
    isIcon ? "shrink-0 justify-center p-1.5 text-ink-soft hover:text-plum-500" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-label="منوی حساب کاربری"
        title="میان‌برهای حساب کاربری"
        className={triggerClass}
      >
        {variant === "page" && (
          <>
            <span className="text-xl font-black text-ink transition-colors group-hover:text-brand-600">
              {name}
            </span>

            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-soft transition-colors ${
                open
                  ? "bg-brand-50 text-brand-600"
                  : "bg-cream group-hover:bg-brand-50 group-hover:text-brand-600"
              }`}
            >
              <ChevronDown
                size={16}
                aria-hidden="true"
                className={`transition-transform ${open ? "rotate-180" : ""}`}
              />
            </span>
          </>
        )}

        {variant === "header" && (
          <>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600">
              <User size={20} aria-hidden="true" />
            </span>

            <span className="whitespace-nowrap font-bold">{name}</span>

            <ChevronDown
              size={16}
              aria-hidden="true"
              className={`shrink-0 text-muted-soft transition-transform ${
                open ? "rotate-180" : ""
              }`}
            />
          </>
        )}

        {isIcon && <User size={22} aria-hidden="true" />}
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          className={`absolute ${menuAlignClass} top-full z-40 mt-2 w-64 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-line bg-white text-right shadow-lg`}
        >
          <Link
            to="/account/orders"
            role="menuitem"
            className="flex items-center gap-3 px-4 py-3 text-right transition-colors hover:bg-brand-50 focus-visible:bg-brand-50 focus-visible:outline-none"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Package size={18} aria-hidden="true" />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block text-sm font-black text-ink">
                سفارش‌های من
              </span>

              <span className="mt-0.5 block truncate text-xs text-muted-soft">
                پیگیری، فاکتور و جزئیات سفارش‌ها
              </span>
            </span>

            <ChevronLeft
              size={16}
              aria-hidden="true"
              className="shrink-0 text-muted-soft"
            />
          </Link>

          <Link
            to="/account"
            role="menuitem"
            className="flex items-center gap-3 border-t border-line px-4 py-3 text-right transition-colors hover:bg-brand-50 focus-visible:bg-brand-50 focus-visible:outline-none"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cream text-ink-soft">
              <UserCircle2 size={18} aria-hidden="true" />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block text-sm font-black text-ink">
                حساب کاربری من
              </span>

              <span className="mt-0.5 block truncate text-xs text-muted-soft">
                اطلاعات حساب، آدرس‌ها و رمز عبور
              </span>
            </span>

            <ChevronLeft
              size={16}
              aria-hidden="true"
              className="shrink-0 text-muted-soft"
            />
          </Link>
        </div>
      )}
    </div>
  );
}

export default AccountNameMenu;
