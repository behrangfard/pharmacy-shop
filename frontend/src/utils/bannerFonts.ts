/**
 * کتابخانهٔ فونت بنرها.
 *
 * فونت‌های سفارشی مدیر (فایل بارگذاری‌شده یا نشانی بیرونی) با `@font-face`
 * تزریق می‌شوند تا لایه‌های متن بنر با همان فونت رندر شوند. فایل فونت‌های
 * بارگذاری‌شده از مسیر API سرو می‌شود (هدر CORS) و نشانی‌های بیرونی که CSS
 * هستند با تگ link بارگذاری می‌شوند.
 */

export type BannerFontSource = "upload" | "url";

export interface BannerFontRecord {
  id: number;
  name: string;
  family: string;
  source: BannerFontSource;
  weight: number;
  style: "normal" | "italic";
  format: string | null;
  file_url: string | null;
  external_url: string | null;
  is_stylesheet: boolean;
  is_active: boolean;
}

/** نگاشت پسوند فونت به مقدار format() در CSS. */
const FONT_FORMAT_CSS: Record<string, string> = {
  woff2: "woff2",
  woff: "woff",
  ttf: "truetype",
  otf: "opentype",
};

/**
 * فهرست فونت‌های دریافتی از API را به رکوردهای امن تبدیل می‌کند.
 * رکوردهای بدون family معتبر یا بدون نشانی، حذف می‌شوند.
 */
export function sanitizeBannerFonts(value: unknown): BannerFontRecord[] {
  if (!Array.isArray(value)) return [];

  const fonts: BannerFontRecord[] = [];

  value.forEach((item) => {
    if (!item || typeof item !== "object") return;

    const raw = item as Record<string, unknown>;
    const family =
      typeof raw.family === "string" ? raw.family.trim() : "";

    const id = Number(raw.id);
    const fileUrl = typeof raw.file_url === "string" ? raw.file_url : null;
    const externalUrl =
      typeof raw.external_url === "string" ? raw.external_url : null;

    if (!family || !Number.isFinite(id) || !/^[A-Za-z0-9 _-]{1,60}$/.test(family)) {
      return;
    }

    if (!fileUrl && !externalUrl) return;

    fonts.push({
      id,
      name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : family,
      family,
      source: raw.source === "url" ? "url" : "upload",
      weight: Number.isFinite(Number(raw.weight)) ? Number(raw.weight) : 400,
      style: raw.style === "italic" ? "italic" : "normal",
      format: typeof raw.format === "string" ? raw.format : null,
      file_url: fileUrl,
      external_url: externalUrl,
      is_stylesheet: Boolean(raw.is_stylesheet),
      is_active: raw.is_active === undefined ? true : Boolean(raw.is_active),
    });
  });

  return fonts;
}

/** قاعدهٔ @font-face یک فونت؛ اگر فونتی برای تزریق نداشته باشد null. */
export function bannerFontFaceCss(font: BannerFontRecord): string | null {
  if (font.is_stylesheet) return null;

  const url = font.file_url ?? font.external_url;

  if (!url) return null;

  const format = font.format ? FONT_FORMAT_CSS[font.format] : undefined;

  const source = format
    ? `url(${JSON.stringify(url)}) format("${format}")`
    : `url(${JSON.stringify(url)})`;

  return [
    "@font-face{",
    `font-family:${JSON.stringify(font.family)};`,
    `src:${source};`,
    `font-weight:${font.weight};`,
    `font-style:${font.style};`,
    "font-display:swap;",
    "}",
  ].join("");
}

/** همهٔ قاعده‌های @font-face برای فهرست فونت‌ها. */
export function bannerFontsCss(fonts: BannerFontRecord[]): string {
  return fonts
    .map((font) => bannerFontFaceCss(font))
    .filter((rule): rule is string => Boolean(rule))
    .join("\n");
}

/** نشانی استایل‌شیت‌های بیرونی (مثل گوگل فونت) که باید با link بارگذاری شوند. */
export function bannerFontStylesheetUrls(fonts: BannerFontRecord[]): string[] {
  const urls = fonts
    .filter((font) => font.is_stylesheet)
    .map((font) => font.external_url)
    .filter((url): url is string => Boolean(url));

  return Array.from(new Set(urls));
}

/** پیش‌بارگذاری فونت‌های بارگذاری‌شده برای کاهش پرش متن. */
export function bannerFontPreloadUrls(fonts: BannerFontRecord[]): string[] {
  const urls = fonts
    .filter((font) => !font.is_stylesheet)
    .map((font) => font.file_url)
    .filter((url): url is string => Boolean(url));

  return Array.from(new Set(urls));
}

/** فهرست یکتای خانواده‌های فونت (برای انتخابگر فونت در پنل). */
export function uniqueBannerFontFamilies(
  fonts: BannerFontRecord[],
): string[] {
  return Array.from(new Set(fonts.map((font) => font.family)));
}
