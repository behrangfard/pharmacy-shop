/**
 * تبدیل و قالب‌بندی تاریخ شمسی (جلالی) بدون هیچ وابستگی بیرونی.
 *
 * الگوریتم تبدیل بر پایهٔ محاسبات عددی تقویم جلالی است؛ بنابراین نمایش تاریخ
 * به تقویم داخلی مرورگر (که در بعضی نسخه‌ها میلادی است) وابسته نیست و در همهٔ
 * دستگاه‌ها یکسان است.
 */

export const JALALI_MONTH_NAMES = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
] as const;

/** سرستون‌های تقویم؛ هفتهٔ ایرانی از شنبه شروع می‌شود (ستون صفرم). */
export const JALALI_WEEKDAY_SHORT = ["ش", "ی", "د", "س", "چ", "پ", "ج"] as const;

export const JALALI_WEEKDAY_NAMES = [
  "شنبه",
  "یکشنبه",
  "دوشنبه",
  "سه‌شنبه",
  "چهارشنبه",
  "پنجشنبه",
  "جمعه",
] as const;

export interface JalaliDate {
  jy: number;
  jm: number;
  jd: number;
}

export interface JalaliDateTime extends JalaliDate {
  hour: number;
  minute: number;
}

function div(a: number, b: number): number {
  return Math.trunc(a / b);
}

function mod(a: number, b: number): number {
  return a - Math.trunc(a / b) * b;
}

/** تاریخ میلادی → شمسی (ماه‌ها و روزها یک‌پایه هستند). */
export function gregorianToJalali(
  gy: number,
  gm: number,
  gd: number,
): JalaliDate {
  const daysInMonth = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

  let jy = gy <= 1600 ? 0 : 979;
  const year = gy <= 1600 ? gy - 621 : gy - 1600;
  const gy2 = gm > 2 ? year + 1 : year;

  let days =
    365 * year +
    div(gy2 + 3, 4) -
    div(gy2 + 99, 100) +
    div(gy2 + 399, 400) -
    80 +
    gd +
    daysInMonth[gm - 1];

  jy += 33 * div(days, 12053);
  days = mod(days, 12053);

  jy += 4 * div(days, 1461);
  days = mod(days, 1461);

  if (days > 365) {
    jy += div(days - 1, 365);
    days = mod(days - 1, 365);
  }

  const jm = days < 186 ? 1 + div(days, 31) : 7 + div(days - 186, 30);
  const jd = 1 + (days < 186 ? mod(days, 31) : mod(days - 186, 30));

  return { jy, jm, jd };
}

/** تاریخ شمسی → میلادی (ماه‌ها و روزها یک‌پایه هستند). */
export function jalaliToGregorian(
  jy: number,
  jm: number,
  jd: number,
): { gy: number; gm: number; gd: number } {
  let gy = jy <= 979 ? 621 : 1600;
  const year = jy <= 979 ? jy : jy - 979;

  let days =
    365 * year +
    div(year, 33) * 8 +
    div(mod(year, 33) + 3, 4) +
    78 +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);

  gy += 400 * div(days, 146097);
  days = mod(days, 146097);

  if (days > 36524) {
    days -= 1;
    gy += 100 * div(days, 36524);
    days = mod(days, 36524);

    if (days >= 365) {
      days += 1;
    }
  }

  gy += 4 * div(days, 1461);
  days = mod(days, 1461);

  if (days > 365) {
    gy += div(days - 1, 365);
    days = mod(days - 1, 365);
  }

  const isLeap = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
  const monthLengths = [
    0,
    31,
    isLeap ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];

  let gd = days + 1;
  let gm = 1;

  while (gm < 12 && gd > monthLengths[gm]) {
    gd -= monthLengths[gm];
    gm += 1;
  }

  return { gy, gm, gd };
}

/** شمار روزهای یک ماه شمسی (با تبدیل دقیق و بدون تقریب). */
export function jalaliMonthLength(jy: number, jm: number): number {
  const start = jalaliToGregorian(jy, jm, 1);
  const nextJy = jm === 12 ? jy + 1 : jy;
  const nextJm = jm === 12 ? 1 : jm + 1;
  const end = jalaliToGregorian(nextJy, nextJm, 1);

  const startTime = Date.UTC(start.gy, start.gm - 1, start.gd);
  const endTime = Date.UTC(end.gy, end.gm - 1, end.gd);

  return Math.round((endTime - startTime) / 86_400_000);
}

/** شمارهٔ ستون روز در تقویم هفت‌ستونه (۰ = شنبه ... ۶ = جمعه). */
export function jalaliWeekdayIndex(jy: number, jm: number, jd: number): number {
  const { gy, gm, gd } = jalaliToGregorian(jy, jm, jd);

  return (new Date(gy, gm - 1, gd).getDay() + 1) % 7;
}

export function jalaliMonthName(jm: number): string {
  return JALALI_MONTH_NAMES[jm - 1] ?? "";
}

export function toPersianDigits(value: string | number): string {
  const digits = "۰۱۲۳۴۵۶۷۸۹";

  return String(value).replace(/[0-9]/g, (digit) => digits[Number(digit)]);
}

export function toEnglishDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

/** تاریخ امروز در تقویم شمسی. */
export function todayJalali(): JalaliDate {
  const now = new Date();

  return gregorianToJalali(
    now.getFullYear(),
    now.getMonth() + 1,
    now.getDate(),
  );
}

/**
 * رشتهٔ ورودی تاریخ (قالب `YYYY-MM-DDTHH:mm` یا ISO کامل) را به اجزای شمسی
 * تبدیل می‌کند. ورودی نامعتبر `null` برمی‌گرداند.
 */
export function parseDateTimeInput(
  value: string | null | undefined,
): JalaliDateTime | null {
  if (!value) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(
    value.trim(),
  );

  if (!match) return null;

  const gy = Number(match[1]);
  const gm = Number(match[2]);
  const gd = Number(match[3]);

  if (!gm || gm > 12 || !gd || gd > 31) {
    return null;
  }

  const { jy, jm, jd } = gregorianToJalali(gy, gm, gd);

  return {
    jy,
    jm,
    jd,
    hour: match[4] ? Number(match[4]) : 0,
    minute: match[5] ? Number(match[5]) : 0,
  };
}

/**
 * اجزای تاریخ شمسی را به رشتهٔ استاندارد ورودی‌های تاریخ
 * (`YYYY-MM-DDTHH:mm`) که API انتظار دارد تبدیل می‌کند.
 */
export function toDateTimeInputValue(parts: JalaliDateTime): string {
  const { gy, gm, gd } = jalaliToGregorian(parts.jy, parts.jm, parts.jd);
  const pad = (part: number) => String(part).padStart(2, "0");

  return (
    `${gy}-${pad(gm)}-${pad(gd)}` + `T${pad(parts.hour)}:${pad(parts.minute)}`
  );
}

/**
 * نمایش خوانای تاریخ شمسی برای کاربر؛ مثلاً «۱۲ مرداد ۱۴۰۳، ساعت ۱۴:۳۰».
 */
export function formatJalaliDisplay(
  value: string | null | undefined,
  options: { withTime?: boolean; withWeekday?: boolean } = {},
): string {
  const parts = parseDateTimeInput(value);

  if (!parts) return "";

  const weekday = options.withWeekday
    ? `${JALALI_WEEKDAY_NAMES[jalaliWeekdayIndex(parts.jy, parts.jm, parts.jd)]} `
    : "";

  const base = `${toPersianDigits(parts.jd)} ${
    JALALI_MONTH_NAMES[parts.jm - 1]
  } ${toPersianDigits(parts.jy)}`;

  const time = options.withTime
    ? `، ساعت ${toPersianDigits(
        String(parts.hour).padStart(2, "0"),
      )}:${toPersianDigits(String(parts.minute).padStart(2, "0"))}`
    : "";

  return `${weekday}${base}${time}`;
}

/** نمایش کوتاه عددی تاریخ شمسی؛ مثلاً «۱۴۰۳/۰۵/۱۲». */
export function formatJalaliShort(value: string | null | undefined): string {
  const parts = parseDateTimeInput(value);

  if (!parts) return "";

  const pad = (part: number) => toPersianDigits(String(part).padStart(2, "0"));

  return `${toPersianDigits(parts.jy)}/${pad(parts.jm)}/${pad(parts.jd)}`;
}

/**
 * اجزای شمسی یک «زمان واقعی» (رشتهٔ ISO سرور) با تبدیل به وقت محلی دستگاه.
 *
 * `parseDateTimeInput` رشته را همان‌طور که هست می‌خواند و برای ورودی دستی و
 * تاریخ‌های بدون ساعت درست است؛ اما زمان‌های ISO سرور (UTC) باید اول به وقت
 * محلی تبدیل شوند، وگرنه ساعت و حتی روز نمایش‌داده‌شده جابه‌جا می‌شود.
 */
export function toJalaliDateTime(
  value: string | null | undefined,
): JalaliDateTime | null {
  if (!value) return null;

  const raw = value.trim();

  // تاریخ بدون ساعت (تاریخ تولد، فیلتر «از تاریخ/تا تاریخ» و ...): بدون
  // جابه‌جایی منطقهٔ زمانی خوانده می‌شود تا روز عوض نشود.
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return parseDateTimeInput(raw);
  }

  // مقادیر «فقط تاریخ» که سرور نیمه‌شب UTC ذخیره می‌کند (مثل تاریخ تحویل
  // مورد انتظار) هم نباید جابه‌جا شوند؛ ساعتِ ۰۰:۰۰ نشانهٔ تاریخ خالی است، نه
  // یک رویداد واقعی.
  if (/^\d{4}-\d{2}-\d{2}[T ]00:00(:00)?(?:\.\d+)?(?:Z|[+-]00:00)?$/.test(raw)) {
    return parseDateTimeInput(raw.slice(0, 10));
  }

  const date = new Date(raw);

  if (Number.isNaN(date.getTime())) {
    return parseDateTimeInput(raw);
  }

  const { jy, jm, jd } = gregorianToJalali(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
  );

  return { jy, jm, jd, hour: date.getHours(), minute: date.getMinutes() };
}

/**
 * نمایش خوانای تاریخ شمسی برای زمان واقعی سرور؛ مثلاً
 * «۱۲ مرداد ۱۴۰۳، ساعت ۱۴:۳۰». ورودی نامعتبر → رشتهٔ خالی.
 */
export function formatJalaliDateTime(
  value: string | null | undefined,
  options: { withTime?: boolean; withWeekday?: boolean } = {},
): string {
  const parts = toJalaliDateTime(value);

  if (!parts) return "";

  const weekday = options.withWeekday
    ? `${JALALI_WEEKDAY_NAMES[jalaliWeekdayIndex(parts.jy, parts.jm, parts.jd)]} `
    : "";

  const base = `${toPersianDigits(parts.jd)} ${
    JALALI_MONTH_NAMES[parts.jm - 1]
  } ${toPersianDigits(parts.jy)}`;

  const time = options.withTime
    ? `، ساعت ${toPersianDigits(
        String(parts.hour).padStart(2, "0"),
      )}:${toPersianDigits(String(parts.minute).padStart(2, "0"))}`
    : "";

  return `${weekday}${base}${time}`;
}

/** نمایش کوتاه عددی تاریخ شمسی برای زمان واقعی؛ مثلاً «۱۴۰۳/۰۵/۱۲». */
export function formatJalaliDateTimeShort(
  value: string | null | undefined,
): string {
  const parts = toJalaliDateTime(value);

  if (!parts) return "";

  const pad = (part: number) => toPersianDigits(String(part).padStart(2, "0"));

  return `${toPersianDigits(parts.jy)}/${pad(parts.jm)}/${pad(parts.jd)}`;
}

