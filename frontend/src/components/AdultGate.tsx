import { Link } from "react-router-dom";
import { Lock, ShieldAlert, Undo2 } from "lucide-react";

import { ADULT_MIN_AGE } from "../utils/adultGate";

interface Props {
  /** توضیح کوتاه دربارهٔ چیزی که پشت این دروازه است (نام محصول یا بخش). */
  title?: string;
  /** مسیر بازگشت؛ پیش‌فرض صفحهٔ اصلی فروشگاه. */
  backTo?: string;
  /** برچسب دکمهٔ بازگشت. */
  backLabel?: string;
  /** با تأیید کاربر فراخوانی می‌شود (ثبت تأیید در همان مرورگر). */
  onConfirm: () => void;
}

/**
 * دروازهٔ سنی بخش ویژهٔ بزرگسالان.
 *
 * یک مرحلهٔ تأیید پیش از نمایش هر محتوای ۱۸+ است: تا وقتی کاربر دکمهٔ
 * «بالای ۱۸ سال هستم» را نزده، نه محصولی رندر می‌شود و نه درخواستی به سرور
 * برای آن محتوا فرستاده می‌شود.
 */
function AdultGate({
  title,
  backTo = "/",
  backLabel = "بازگشت به فروشگاه",
  onConfirm,
}: Props) {
  return (
    <div className="min-h-[70vh] bg-gradient-to-b from-slate-900 via-slate-900 to-rose-950 px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-rose-400/40 bg-rose-500/15 text-rose-300">
          <Lock size={28} aria-hidden="true" />
        </div>

        <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-rose-400/40 bg-rose-500/10 px-4 py-1.5 text-xs font-black text-rose-200">
          <ShieldAlert size={14} aria-hidden="true" />
          محتوای ویژهٔ بزرگسالان — {ADULT_MIN_AGE.toLocaleString("fa-IR")}+
        </span>

        <h1 className="mt-5 text-2xl font-black leading-9 text-white sm:text-3xl">
          ورود به بخش ویژهٔ بزرگسالان
        </h1>

        {title && (
          <p className="mt-2 text-sm font-bold text-rose-200">{title}</p>
        )}

        <p className="mt-4 max-w-xl text-sm leading-8 text-slate-200">
          این بخش شامل محصولات و پوشاک بزرگسالان است و ممکن است برای همه
          مناسب نباشد. برای ورود باید تأیید کنید که سن شما{" "}
          {ADULT_MIN_AGE.toLocaleString("fa-IR")} سال یا بیشتر است و مشاهدهٔ
          این محتوا را به‌اختیار خودتان انتخاب می‌کنید.
        </p>

        <ul className="mt-5 w-full max-w-xl space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-start text-xs leading-7 text-slate-200 sm:text-[13px]">
          <li>
            این محصولات فقط در همین بخش نمایش داده می‌شوند و در فهرست
            عمومی، جست‌وجو و صفحهٔ اصلی فروشگاه دیده نمی‌شوند.
          </li>
          <li>
            اگر سن شما کمتر از {ADULT_MIN_AGE.toLocaleString("fa-IR")} سال است،
            لطفاً از این صفحه خارج شوید.
          </li>
          <li>
            تأیید شما فقط در همین مرورگر ذخیره می‌شود و هر زمان با دکمهٔ
            «خروج از بخش ویژه» پاک خواهد شد.
          </li>
        </ul>

        <div className="mt-7 flex w-full flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onConfirm}
            className="
              inline-flex items-center justify-center gap-2 rounded-2xl
              bg-rose-600 px-6 py-3.5 text-sm font-black text-white
              transition-colors hover:bg-rose-700
              focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-rose-300
            "
          >
            <Lock size={17} aria-hidden="true" />
            بله، سن من {ADULT_MIN_AGE.toLocaleString("fa-IR")} سال یا بیشتر است
          </button>

          <Link
            to={backTo}
            className="
              inline-flex items-center justify-center gap-2 rounded-2xl
              border border-white/25 px-6 py-3.5 text-sm font-bold
              text-white transition-colors hover:bg-white/10
              focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-white/40
            "
          >
            <Undo2 size={17} aria-hidden="true" />
            {backLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default AdultGate;
