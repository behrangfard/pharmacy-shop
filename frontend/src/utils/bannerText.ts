/**
 * متن لایه‌ای روی بنر.
 *
 * قاعدهٔ اصلی: متن بنر داخل خود تصویر پخته نمی‌شود؛ تصویر بدون متن بارگذاری
 * می‌شود و متن به‌صورت HTML واقعی روی آن نمایش داده می‌شود تا موتور جستجو و
 * screen reader آن را بخوانند. هر لایه موقعیت درصدی (نسبت به عرض/ارتفاع بنر)،
 * فونت، رنگ، ترازبندی و سایهٔ خودش را دارد.
 *
 * اندازه‌ها با واحد `cqw` رندر می‌شوند (درصدی از عرض ظرف بنر). بنابراین متن
 * دقیقاً همراه تصویر بزرگ و کوچک می‌شود و پیش‌نمایش پنل هم همان چیزی است که
 * کاربر در سایت می‌بیند. ظرف بنر باید `container-type: inline-size` داشته
 * باشد؛ کامپوننت BannerTextLayers این را تنظیم می‌کند.
 */

import type { CSSProperties } from "react";

export type BannerTextTag = "h1" | "h2" | "h3" | "h4" | "p" | "span" | "div";

export type BannerTextAlign = "right" | "center" | "left" | "justify";

export type BannerTextShadow = "none" | "soft" | "medium" | "strong";

export type BannerTextScrim = "none" | "light" | "medium" | "dark";

export type BannerTextViewport = "desktop" | "mobile";

/** حداکثر لایه‌های متن هر بنر (هم‌راستا با App\Support\BannerText در بک‌اند). */
export const BANNER_TEXT_MAX_LAYERS = 12;

export const BANNER_TEXT_TAGS: BannerTextTag[] = [
  "h1",
  "h2",
  "h3",
  "h4",
  "p",
  "span",
  "div",
];

export const BANNER_TEXT_ALIGNS: BannerTextAlign[] = [
  "right",
  "center",
  "left",
  "justify",
];

export const BANNER_TEXT_SHADOWS: BannerTextShadow[] = [
  "none",
  "soft",
  "medium",
  "strong",
];

export const BANNER_TEXT_SCRIMS: BannerTextScrim[] = [
  "none",
  "light",
  "medium",
  "dark",
];

export const BANNER_TEXT_WEIGHTS = [
  100, 200, 300, 400, 500, 600, 700, 800, 900,
] as const;

export const BANNER_TEXT_TAG_LABELS: Record<BannerTextTag, string> = {
  h1: "تیتر اصلی (h1)",
  h2: "تیتر دوم (h2)",
  h3: "تیتر سوم (h3)",
  h4: "تیتر چهارم (h4)",
  p: "پاراگراف (p)",
  span: "متن ساده (span)",
  div: "بلوک (div)",
};

export const BANNER_TEXT_ALIGN_LABELS: Record<BannerTextAlign, string> = {
  right: "راست‌چین",
  center: "وسط‌چین",
  left: "چپ‌چین",
  justify: "هم‌تراز",
};

export const BANNER_TEXT_SHADOW_LABELS: Record<BannerTextShadow, string> = {
  none: "بدون سایه",
  soft: "سایهٔ نرم",
  medium: "سایهٔ متوسط",
  strong: "سایهٔ قوی",
};

export const BANNER_TEXT_SCRIM_LABELS: Record<BannerTextScrim, string> = {
  none: "بدون پرده",
  light: "پردهٔ روشن",
  medium: "پردهٔ متوسط",
  dark: "پردهٔ تیره",
};

const BANNER_TEXT_SHADOW_CSS: Record<BannerTextShadow, string> = {
  none: "none",
  soft: "0 1px 2px rgba(0, 0, 0, 0.35)",
  medium: "0 2px 8px rgba(0, 0, 0, 0.45)",
  strong: "0 4px 18px rgba(0, 0, 0, 0.65)",
};

/** کلاس پردهٔ تیره پشت متن برای خوانایی روی تصویرهای شلوغ. */
export const BANNER_TEXT_SCRIM_CLASS: Record<BannerTextScrim, string> = {
  none: "",
  light: "bg-white/20",
  medium: "bg-black/35",
  dark: "bg-black/60",
};

/**
 * فونت‌های آمادهٔ همیشه‌موجود. فونت‌های سفارشی (فایل بارگذاری‌شده یا نشانی
 * بیرونی) از کتابخانهٔ فونت بنرها می‌آیند و در پنل کنار همین‌ها می‌نشینند.
 */
export const BANNER_FONT_PRESETS = [
  { family: "Vazirmatn", label: "وزیرمتن (فونت سایت)" },
  { family: "Tahoma", label: "تاهوما" },
  { family: "Arial", label: "آریال" },
  { family: "Georgia", label: "جورجیا (لاتین)" },
  { family: "Impact", label: "ایمپکت (لاتین)" },
] as const;

/** عرض مرجع طراحی؛ اندازه‌ها بر مبنای این عرض نوشته می‌شوند. */
const DESKTOP_REFERENCE_WIDTH = 1440;

/** عرض مرجع موبایل؛ فقط وقتی اندازهٔ موبایل جدا ثبت شده باشد. */
const MOBILE_REFERENCE_WIDTH = 390;

export interface BannerTextLayer {
  id: string;
  text: string;
  tag: BannerTextTag;
  /** موقعیت افقی لبهٔ چپ کادر متن (درصد از عرض بنر). */
  x: number;
  /** موقعیت عمودی بالای کادر متن (درصد از ارتفاع بنر). */
  y: number;
  x_mobile: number | null;
  y_mobile: number | null;
  width: number;
  width_mobile: number | null;
  align: BannerTextAlign;
  font_family: string | null;
  font_size: number;
  font_size_mobile: number | null;
  font_weight: number;
  line_height: number;
  letter_spacing: number;
  color: string;
  italic: boolean;
  uppercase: boolean;
  shadow: BannerTextShadow;
  background: string | null;
  background_opacity: number;
  padding_x: number;
  padding_y: number;
  radius: number;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;

  return Math.min(max, Math.max(min, value));
}

function coerceNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed)) return fallback;

  return clamp(parsed, min, max);
}

function coerceNullableNumber(
  value: unknown,
  min: number,
  max: number,
): number | null {
  if (value === null || value === undefined || value === "") return null;

  const parsed = typeof value === "number" ? value : Number(value);

  return Number.isFinite(parsed) ? clamp(parsed, min, max) : null;
}

function coerceEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function coerceWeight(value: unknown): number {
  const parsed = Number(value);

  return (BANNER_TEXT_WEIGHTS as readonly number[]).includes(parsed)
    ? parsed
    : 700;
}

function coerceColor(value: unknown, fallback: string | null): string | null {
  if (typeof value !== "string") return fallback;

  const candidate = value.trim().toLowerCase();

  return /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(candidate)
    ? candidate
    : fallback;
}

/** لایهٔ پیش‌فرض برای دکمهٔ «افزودن متن». */
export function emptyBannerTextLayer(index = 1): BannerTextLayer {
  return {
    id: `layer-${index}`,
    text: "متن دلخواه",
    tag: "p",
    x: 8,
    y: 30,
    x_mobile: null,
    y_mobile: null,
    width: 50,
    width_mobile: null,
    align: "right",
    font_family: null,
    font_size: 32,
    font_size_mobile: null,
    font_weight: 700,
    line_height: 1.5,
    letter_spacing: 0,
    color: "#ffffff",
    italic: false,
    uppercase: false,
    shadow: "soft",
    background: null,
    background_opacity: 1,
    padding_x: 0,
    padding_y: 0,
    radius: 0,
  };
}

/** یک لایهٔ خام (از API یا فرم) را به ساختار کامل و امن تبدیل می‌کند. */
export function sanitizeBannerTextLayer(
  value: unknown,
  index = 0,
): BannerTextLayer {
  const raw = (value ?? {}) as Record<string, unknown>;
  const fallback = emptyBannerTextLayer(index + 1);

  return {
    id:
      typeof raw.id === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(raw.id.trim())
        ? raw.id.trim()
        : fallback.id,
    text: typeof raw.text === "string" ? raw.text : "",
    tag: coerceEnum(raw.tag, BANNER_TEXT_TAGS, "p"),
    x: coerceNumber(raw.x, fallback.x, 0, 100),
    y: coerceNumber(raw.y, fallback.y, 0, 100),
    x_mobile: coerceNullableNumber(raw.x_mobile, 0, 100),
    y_mobile: coerceNullableNumber(raw.y_mobile, 0, 100),
    width: coerceNumber(raw.width, fallback.width, 5, 100),
    width_mobile: coerceNullableNumber(raw.width_mobile, 5, 100),
    align: coerceEnum(raw.align, BANNER_TEXT_ALIGNS, "right"),
    font_family:
      typeof raw.font_family === "string" &&
      /^[A-Za-z0-9 _-]{1,60}$/.test(raw.font_family.trim())
        ? raw.font_family.trim()
        : null,
    font_size: coerceNumber(raw.font_size, fallback.font_size, 8, 160),
    font_size_mobile: coerceNullableNumber(raw.font_size_mobile, 8, 120),
    font_weight: coerceWeight(raw.font_weight),
    line_height: coerceNumber(raw.line_height, 1.5, 0.8, 3),
    letter_spacing: coerceNumber(raw.letter_spacing, 0, -5, 20),
    color: coerceColor(raw.color, "#ffffff") ?? "#ffffff",
    italic: Boolean(raw.italic),
    uppercase: Boolean(raw.uppercase),
    shadow: coerceEnum(raw.shadow, BANNER_TEXT_SHADOWS, "soft"),
    background: coerceColor(raw.background, null),
    background_opacity: coerceNumber(raw.background_opacity, 1, 0, 1),
    padding_x: coerceNumber(raw.padding_x, 0, 0, 80),
    padding_y: coerceNumber(raw.padding_y, 0, 0, 80),
    radius: coerceNumber(raw.radius, 0, 0, 200),
  };
}

/** فهرست لایه‌های ذخیره‌شدهٔ بنر (همیشه آرایه‌ای امن). */
export function sanitizeBannerTextLayers(value: unknown): BannerTextLayer[] {
  if (!Array.isArray(value)) return [];

  return value
    .slice(0, BANNER_TEXT_MAX_LAYERS)
    .map((layer, index) => sanitizeBannerTextLayer(layer, index));
}

/** لایه‌ای که متن ندارد رندر نمی‌شود. */
export function isRenderableTextLayer(layer: BannerTextLayer): boolean {
  return layer.text.trim().length > 0;
}

/** رنگ هگز (#rgb/#rrggbb/#rrggbbaa) به rgba برای پس‌زمینهٔ کادر متن. */
export function hexToRgba(hex: string, alpha = 1): string {
  const normalized = hex.trim().replace(/^#/, "");

  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((part) => `${part}${part}`)
          .join("")
      : normalized;

  if (!/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(expanded)) {
    return `rgba(0, 0, 0, ${clamp(alpha, 0, 1)})`;
  }

  const red = parseInt(expanded.slice(0, 2), 16);
  const green = parseInt(expanded.slice(2, 4), 16);
  const blue = parseInt(expanded.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${clamp(alpha, 0, 1)})`;
}

/**
 * استایل یک لایه روی تصویر.
 *
 * اندازه‌ها به `cqw` تبدیل می‌شوند تا با عرض بنر مقیاس بگیرند: اندازه‌های
 * دسکتاپ بر مبنای عرض ۱۴۴۰ و اندازه‌های موبایل (وقتی جدا ثبت شده باشند) بر
 * مبنای عرض ۳۹۰ نوشته می‌شوند.
 */
export function bannerTextLayerStyle(
  layer: BannerTextLayer,
  viewport: BannerTextViewport = "desktop",
): CSSProperties {
  const isMobile = viewport === "mobile";
  const hasMobileSize = isMobile && layer.font_size_mobile !== null;

  const reference = hasMobileSize
    ? MOBILE_REFERENCE_WIDTH
    : DESKTOP_REFERENCE_WIDTH;

  const unit = 100 / reference;

  const x = isMobile ? layer.x_mobile ?? layer.x : layer.x;
  const y = isMobile ? layer.y_mobile ?? layer.y : layer.y;
  const width = isMobile ? layer.width_mobile ?? layer.width : layer.width;
  const fontSize = hasMobileSize
    ? layer.font_size_mobile ?? layer.font_size
    : layer.font_size;

  return {
    left: `${clamp(x, 0, 100)}%`,
    top: `${clamp(y, 0, 100)}%`,
    width: `${clamp(width, 5, 100)}%`,
    textAlign: layer.align,
    fontFamily: layer.font_family
      ? `"${layer.font_family}", Vazirmatn, Tahoma, Arial, sans-serif`
      : undefined,
    fontSize: `${(fontSize * unit).toFixed(3)}cqw`,
    fontWeight: layer.font_weight,
    lineHeight: layer.line_height,
    letterSpacing: `${(layer.letter_spacing * unit).toFixed(3)}cqw`,
    color: layer.color,
    fontStyle: layer.italic ? "italic" : "normal",
    textTransform: layer.uppercase ? "uppercase" : "none",
    textShadow: BANNER_TEXT_SHADOW_CSS[layer.shadow],
    padding: `${(layer.padding_y * unit).toFixed(3)}cqw ${(
      layer.padding_x * unit
    ).toFixed(3)}cqw`,
    borderRadius: `${(layer.radius * unit).toFixed(3)}cqw`,
    background: layer.background
      ? hexToRgba(layer.background, layer.background_opacity)
      : undefined,
  };
}

