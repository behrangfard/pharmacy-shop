/**
 * قواعد نمایش «سلامت متا» در صفحهٔ سلامت سئو پنل.
 *
 * حد آستانه‌ها با سمت سرور (AdminSeoController) هم‌راستا هستند:
 * عنوان متا حداکثر ۶۰ و توضیح متا حداکثر ۱۶۰ کاراکتر.
 */

export const SEO_META_LIMITS = {
  titleMax: 60,
  descriptionMax: 160,
} as const;

export type SeoMetaStatus = "missing" | "long" | "good";

export type SeoIssueCode =
  | "missing_title"
  | "missing_description"
  | "long_title"
  | "long_description"
  | "duplicate_title";

export const SEO_ISSUE_LABELS: Record<SeoIssueCode, string> = {
  missing_title: "عنوان سئو ندارد",
  missing_description: "توضیح سئو ندارد",
  long_title: "عنوان بلند (بیش از ۶۰)",
  long_description: "توضیح بلند (بیش از ۱۶۰)",
  duplicate_title: "عنوان تکراری",
};

/**
 * وضعیت یک فیلد متا برای رنگ‌بندی جدول.
 */
export function seoMetaStatus(
  value: string | null | undefined,
  kind: "title" | "description",
): SeoMetaStatus {
  const text = (value ?? "").trim();

  if (text === "") return "missing";

  const max =
    kind === "title"
      ? SEO_META_LIMITS.titleMax
      : SEO_META_LIMITS.descriptionMax;

  return text.length > max ? "long" : "good";
}

/** طول متن برای نمایش در ستون «طول»؛ فاصله‌های ابتدا/انتها حساب نمی‌شود. */
export function seoMetaLength(value: string | null | undefined): number {
  return (value ?? "").trim().length;
}

/**
 * متن پیش‌نمایش نتیجهٔ گوگل: اگر متا خالی باشد متن جایگزین می‌آید و متن
 * بلند با «…» کوتاه می‌شود (گوگل هم همین کار را می‌کند).
 */
export function seoPreviewText(
  value: string | null | undefined,
  fallback: string,
  limit: number,
): string {
  const text = (value ?? "").trim() || fallback.trim();

  if (text.length <= limit) return text;

  return `${text.slice(0, limit).trimEnd()}…`;
}
