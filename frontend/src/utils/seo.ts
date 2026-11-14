/**
 * مدیریت متا تگ‌های صفحه (سئو).
 *
 * سایت یک SPA است؛ بنابراین عنوان، توضیحات، canonical و تگ‌های اشتراک‌گذاری
 * برای هر مسیر باید در زمان اجرا نوشته شوند. این ماژول تنها جایی است که
 * مستقیماً به `document.head` دست می‌زند تا رفتار همهٔ صفحات یکسان بماند:
 * - عنوان و توضیحات همیشه به‌روز می‌شوند (بدون تکرار/جمع‌شدن تگ‌ها).
 * - canonical و og:url بر پایهٔ نشانی واقعی صفحه ساخته می‌شوند.
 * - دادهٔ ساختاریافته (JSON-LD) در یک اسکریپت واحد نگه‌داری می‌شود و با
 *   تغییر صفحه پاک می‌شود تا دادهٔ محصول قبلی روی صفحهٔ بعدی نماند.
 */

export const SITE_NAME = "بهرنگ شاپ";

export const SITE_TAGLINE = "فروشگاه آنلاین لباس زیر زنانه";

export const DEFAULT_TITLE = `${SITE_NAME} | ${SITE_TAGLINE}`;

export const DEFAULT_DESCRIPTION =
  "خرید آنلاین لباس زیر زنانه، ست، سوتین، شورت و لباس خواب از بهرنگ شاپ؛ " +
  "ارسال سریع به سراسر ایران، تضمین اصالت کالا و پشتیبانی واقعی.";

/** تصویر پیش‌فرض اشتراک‌گذاری (نسخهٔ فشرده در پوشهٔ public فرانت‌اند). */
const DEFAULT_IMAGE = "/images/og-default.jpg";

/** تگ robots برای صفحه‌هایی که نباید ایندکس شوند. */
export const NO_INDEX_ROBOTS = "noindex, follow";

export const INDEX_ROBOTS = "index, follow";

export type PageMetaType = "website" | "product" | "article";

export interface PageMeta {
  /** عنوان کامل صفحه (بدون نام فروشگاه هم می‌تواند باشد؛ بهتر است کامل باشد). */
  title?: string | null;
  /** توضیحات؛ بیش از ۱۶۰ نویسه به‌صورت خودکار کوتاه می‌شود. */
  description?: string | null;
  /** مسیر صفحه برای canonical و og:url (مثل `/product/abc`). */
  path?: string | null;
  image?: string | null;
  type?: PageMetaType;
  /** مقدار پیش‌فرض «index, follow»؛ برای صفحه‌های خصوصی NO_INDEX_ROBOTS بدهید. */
  robots?: string | null;
  publishedTime?: string | null;
  modifiedTime?: string | null;
  /** دادهٔ ساختاریافته (یک یا آرایه‌ای از آبجکت‌های schema.org). */
  jsonLd?: unknown;
}

/** ریشهٔ سایت؛ با VITE_SITE_URL قابل تنظیم است (برای محیط تولید مهم است). */
function siteOrigin(): string {
  const configured = (import.meta.env.VITE_SITE_URL as string | undefined)?.trim();

  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "";
}

/** مسیر نسبی را به نشانی مطلق تبدیل می‌کند (canonical/og باید مطلق باشد). */
export function absoluteUrl(path?: string | null): string {
  const value = path?.trim();

  if (!value) return siteOrigin();

  if (/^https?:\/\//i.test(value)) return value;

  const origin = siteOrigin();
  const suffix = value.startsWith("/") ? value : `/${value}`;

  return `${origin}${suffix}`;
}

/** کوتاه‌کردن متن تا طول پیشنهادی نتایج گوگل. */
export function truncateText(
  value: string | null | undefined,
  max = 160,
): string {
  const text = (value ?? "").replace(/\s+/g, " ").trim();

  if (text.length <= max) return text;

  return `${text.slice(0, max - 1).trimEnd()}…`;
}

/** حذف تگ‌های HTML از توضیحات محصول/مقاله پیش از استفاده در متا. */
export function plainText(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const JSON_LD_ID = "page-json-ld";

/** ساخت/به‌روزرسانی یک متا تگ؛ با محتوای خالی حذف می‌شود. */
function upsertMeta(
  attribute: "name" | "property",
  key: string,
  content: string | null,
): void {
  if (typeof document === "undefined") return;

  const existing = document.head.querySelector<HTMLMetaElement>(
    `meta[${attribute}="${key}"]`,
  );

  if (!content) {
    existing?.remove();
    return;
  }

  const element = existing ?? document.createElement("meta");

  if (!existing) {
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }

  element.setAttribute("content", content);
}

/** ساخت/به‌روزرسانی یک link در head (مثل canonical)؛ با مقدار خالی حذف می‌شود. */
function upsertLink(rel: string, href: string | null): void {
  if (typeof document === "undefined") return;

  const existing = document.head.querySelector<HTMLLinkElement>(
    `link[rel="${rel}"]`,
  );

  if (!href) {
    existing?.remove();
    return;
  }

  const element = existing ?? document.createElement("link");

  if (!existing) {
    element.rel = rel;
    document.head.appendChild(element);
  }

  element.href = href;
}

/** مسیر فعلی (با پارامترها) برای canonical پیش‌فرض. */
function currentPath(): string {
  if (typeof window === "undefined") return "/";

  return `${window.location.pathname}${window.location.search}`;
}

/**
 * نوشتن متای صفحه در head. هر صفحه فقط باید `usePageMeta` را صدا بزند؛
 * این تابع همهٔ تگ‌های لازم (عنوان، توضیحات، canonical، og، twitter، JSON-LD)
 * را هم‌زمان به‌روز می‌کند.
 */
export function applyPageMeta(meta: PageMeta): void {
  if (typeof document === "undefined") return;

  const title = meta.title?.trim() || DEFAULT_TITLE;
  const description = truncateText(
    plainText(meta.description) || DEFAULT_DESCRIPTION,
    165,
  );
  const canonical = absoluteUrl(meta.path ?? currentPath());
  const image = absoluteUrl(meta.image?.trim() || DEFAULT_IMAGE);
  const robots = meta.robots?.trim() || INDEX_ROBOTS;
  const type = meta.type ?? "website";

  document.title = title;

  upsertMeta("name", "description", description);
  upsertMeta("name", "robots", robots);

  upsertMeta("property", "og:title", title);
  upsertMeta("property", "og:description", description);
  upsertMeta("property", "og:type", type);
  upsertMeta("property", "og:url", canonical);
  upsertMeta("property", "og:image", image);
  upsertMeta("property", "og:site_name", SITE_NAME);
  upsertMeta("property", "og:locale", "fa_IR");

  upsertMeta("name", "twitter:card", "summary_large_image");
  upsertMeta("name", "twitter:title", title);
  upsertMeta("name", "twitter:description", description);
  upsertMeta("name", "twitter:image", image);

  upsertMeta("property", "article:published_time", meta.publishedTime ?? null);
  upsertMeta("property", "article:modified_time", meta.modifiedTime ?? null);

  upsertLink("canonical", canonical);

  const existing = document.getElementById(JSON_LD_ID);

  if (!meta.jsonLd) {
    existing?.remove();
    return;
  }

  const script =
    existing instanceof HTMLScriptElement
      ? existing
      : document.createElement("script");

  if (!(existing instanceof HTMLScriptElement)) {
    script.type = "application/ld+json";
    script.id = JSON_LD_ID;
    document.head.appendChild(script);
  }

  script.textContent = JSON.stringify(meta.jsonLd);
}
