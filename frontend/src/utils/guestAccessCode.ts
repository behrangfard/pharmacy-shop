import { toEnglishDigits } from "./jalali";

/**
 * کد پیگیری مهمان — هم‌راستا با `App\Support\GuestAccessCode` در بک‌اند.
 *
 * کد ۸ کاراکتری است و برای خوانایی به شکل «ABCD-2345» نمایش داده می‌شود.
 * ورودی مشتری ممکن است خط تیره/فاصله، حروف کوچک یا ارقام فارسی داشته باشد؛
 * پیش از ارسال به سرور همه نرمال می‌شوند (سرور هم مستقل همین کار را می‌کند).
 */
export const GUEST_ACCESS_CODE_LENGTH = 8;

/** فقط حروف/ارقام لاتین و بزرگ، بدون خط تیره و فاصله. */
export function normalizeGuestAccessCode(input: string): string {
  return toEnglishDigits(input)
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
}

/** نمایش خوانا: ABCD-2345 */
export function formatGuestAccessCode(code: string): string {
  return (
    normalizeGuestAccessCode(code)
      .match(/.{1,4}/g)
      ?.join("-") ?? ""
  );
}

/** آیا ورودی به اندازهٔ یک کد کامل (۸ کاراکتر) هست؟ */
export function isCompleteGuestAccessCode(code: string): boolean {
  return normalizeGuestAccessCode(code).length === GUEST_ACCESS_CODE_LENGTH;
}
