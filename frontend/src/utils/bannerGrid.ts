/**
 * چیدمان «بخش بنرهای چندستونهٔ صفحهٔ اول».
 *
 * مدیر در پنل بنرها چیدمان این بخش را انتخاب می‌کند و تعداد بنر نمایش‌داده‌شده
 * از روی همان چیدمان تعیین می‌شود:
 * - one         : یک بنر تمام‌عرض
 * - two         : دو بنر کنار هم
 * - three       : سه بنر در یک ردیف
 * - three_split : دو بنر روی هم سمت راست، یک بنر بلند سمت چپ
 * - four        : چهار بنر (چهارستونه در دسکتاپ)
 *
 * بنرهای این بخش همچنان با position=home_grid ذخیره می‌شوند؛ فقط بنرهای اول
 * (بر اساس «ترتیب نمایش») به تعداد اسلات چیدمان دیده می‌شوند و بقیه ذخیره
 * می‌مانند.
 *
 * کلاس‌های Tailwind این فایل به‌صورت رشتهٔ کامل نوشته شده‌اند تا اسکنر
 * Tailwind آن‌ها را تولید کند.
 */

import type { CSSProperties } from "react";

import {
  filterBannersForViewport,
  type BannerPosition,
  type BannerViewport,
  type StorefrontBanner,
} from "./banners";

export type BannerSectionLayout = "one" | "two" | "three" | "three_split" | "four";

/**
 * نحوهٔ جاگیری تصویر در کادر بنر:
 * - contain (پیش‌فرض): تصویر کامل و بدون برش دیده می‌شود و بزرگ‌تر از اندازهٔ
 *   اصلی خودش کشیده نمی‌شود؛ بنابراین کیفیت پایین نمی‌آید.
 * - cover: کادر را پر می‌کند و بخشی از تصویر بریده می‌شود.
 */
export type BannerSectionFit = "contain" | "cover";

/**
 * انیمیشن هاور بنرهای دسکتاپ (بنر بالای صفحه و بنر وسط صفحه).
 * - none      : بدون انیمیشن
 * - zoom      : بزرگ‌نمایی ملایم تصویر
 * - lift      : بالا آمدن کادر همراه با سایه
 * - zoom_lift : بزرگ‌نمایی + بالا آمدن
 * - shine     : درخشش نور روی بنر
 */
export type BannerSectionAnimation =
  | "none"
  | "zoom"
  | "lift"
  | "zoom_lift"
  | "shine";

export const DEFAULT_BANNER_ANIMATION: BannerSectionAnimation = "none";

/** گزینه‌های انیمیشن برای دکمه‌های پنل مدیریت. */
export const BANNER_SECTION_ANIMATIONS: {
  value: BannerSectionAnimation;
  label: string;
  hint: string;
}[] = [
  {
    value: "none",
    label: "بدون انیمیشن",
    hint: "بنر روی هاور ثابت می‌ماند",
  },
  {
    value: "zoom",
    label: "بزرگ‌نمایی",
    hint: "تصویر داخل کادر کمی بزرگ‌تر می‌شود",
  },
  {
    value: "lift",
    label: "بالا آمدن",
    hint: "کادر کمی بالا می‌رود و سایه می‌گیرد",
  },
  {
    value: "zoom_lift",
    label: "بزرگ‌نمایی + بالا",
    hint: "ترکیب بزرگ‌نمایی تصویر و بالا آمدن کادر",
  },
  {
    value: "shine",
    label: "درخشش نور",
    hint: "یک نور ملایم روی بنر رد می‌شود",
  },
];

/** موقعیت بنرهای بخش چندستونه. */
export const HOME_GRID_POSITION = "home_grid" as const;

/** موقعیت اسلایدر اصلی صفحهٔ اول. */
export const HOME_HERO_POSITION = "home_hero" as const;

/** بنر بالای صفحهٔ اول در موبایل (مستقل از هیرو). */
export const HOME_MOBILE_TOP_POSITION = "home_mobile_top" as const;

/** بنر وسط صفحهٔ اول در موبایل (مستقل از بخش چندستونه). */
export const HOME_MOBILE_MIDDLE_POSITION = "home_mobile_middle" as const;

/**
 * ظاهر مشترک همهٔ بنرها (اسلایدر هیرو، بخش چندستونه و نوار بنرهای کوتاه).
 *
 * فقط یک تنظیم دارد: گردی گوشهٔ کادر بنر به پیکسل (`radius`). صفر یعنی گوشهٔ
 * تیز. رنگ پس‌زمینه‌ای پشت بنرها وجود ندارد؛ اگر تصویر باریک‌تر از صفحه باشد،
 * اطرافش همان پس‌زمینهٔ صفحه دیده می‌شود و نوار رنگی نمی‌افتد.
 */
export interface BannerAppearance {
  radius: number;
}

export const DEFAULT_BANNER_RADIUS = 16;

export const MAX_BANNER_RADIUS = 48;

/** گردی‌های پیشنهادی برای دکمه‌های سریع پنل (پیکسل). */
export const BANNER_RADIUS_PRESETS: number[] = [0, 8, 12, 16, 24, 32];

/** گردی گوشهٔ بنر؛ مقدار نامعتبر به پیش‌فرض و خارج از محدوده به نزدیک‌ترین حد. */
export function normalizeBannerRadius(value: unknown): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_BANNER_RADIUS;
  }

  return Math.min(Math.max(Math.round(parsed), 0), MAX_BANNER_RADIUS);
}

/** استایل درون‌خطی گردی گوشه؛ چون مقدار از پنل می‌آید و کلاس ثابت نیست. */
export function bannerRadiusStyle(radius: number): CSSProperties {
  return { borderRadius: `${normalizeBannerRadius(radius)}px` };
}

export interface BannerSectionConfig {
  position: BannerPosition;
  layout: BannerSectionLayout;
  title: string | null;
  subtitle: string | null;
  /** تعداد بنر قابل نمایش در این چیدمان. */
  slots: number;
  /** سقف تعداد تصاویر بخش؛ ۰ یعنی محدودیتی نیست (اسلایدر هیرو). */
  image_count: number;
  /** حداکثر ارتفاع بنر در دسکتاپ (پیکسل)؛ ۰ یعنی ارتفاع طبیعی تصویر. */
  height_desktop: number;
  /** حداکثر ارتفاع بنر در موبایل (پیکسل)؛ ۰ یعنی ارتفاع طبیعی تصویر. */
  height_mobile: number;
  /** جاگیری تصویر در کادر (بدون برش/زوم به‌صورت پیش‌فرض). */
  fit: BannerSectionFit;
  /** گردی گوشهٔ کادر بنرهای همین بخش (پیکسل). */
  radius: number;
  /** انیمیشن هاور بنرهای همین بخش (فقط بخش‌های دسکتاپ). */
  animation: BannerSectionAnimation;
  is_active: boolean;
}

/**
 * گردی گوشهٔ مؤثر یک بخش.
 * نبودِ تنظیمات بخش (نصب قدیمی/خطای API) یا مقدار نامعتبر یعنی استفاده از
 * پیش‌فرض سراسری سایت.
 */
export function bannerSectionRadius(
  section: BannerSectionConfig | null | undefined,
  fallback: number = DEFAULT_BANNER_RADIUS,
): number {
  return section ? normalizeBannerRadius(section.radius) : normalizeBannerRadius(fallback);
}



interface BannerSectionLayoutOption {
  value: BannerSectionLayout;
  label: string;
  hint: string;
  slots: number;
  /** پیش‌نمایش کوچک در پنل مدیریت. */
  preview: { container: string; slots: string[] };
}

export const BANNER_SECTION_LAYOUTS: BannerSectionLayoutOption[] = [
  {
    value: "one",
    label: "یک بنر تمام‌عرض",
    hint: "یک تصویر عریض در تمام عرض صفحه",
    slots: 1,
    preview: { container: "grid-cols-1 grid-rows-1", slots: [""] },
  },
  {
    value: "two",
    label: "دو بنر کنار هم",
    hint: "دو بنر هم‌عرض در یک ردیف",
    slots: 2,
    preview: { container: "grid-cols-2 grid-rows-1", slots: ["", ""] },
  },
  {
    value: "three",
    label: "سه بنر در یک ردیف",
    hint: "سه بنر هم‌عرض کنار هم",
    slots: 3,
    preview: { container: "grid-cols-3 grid-rows-1", slots: ["", "", ""] },
  },
  {
    value: "three_split",
    label: "دو بنر راست، یکی چپ",
    hint: "سمت راست دو بنر روی هم و سمت چپ یک بنر بلند",
    slots: 3,
    preview: {
      container: "grid-cols-2 grid-rows-2",
      slots: [
        "col-start-1 row-start-1",
        "col-start-1 row-start-2",
        "col-start-2 row-start-1 row-span-2",
      ],
    },
  },
  {
    value: "four",
    label: "چهار بنر",
    hint: "چهار بنر در یک ردیف (در موبایل تک‌ستونه)",
    slots: 4,
    preview: { container: "grid-cols-4 grid-rows-1", slots: ["", "", "", ""] },
  },
];

/** کلاس تصویر داخل کاشی‌های بخش چندستونه (پرکردن کاشی با برش). */
export const BANNER_GRID_IMAGE_CLASS = "absolute inset-0 h-full w-full object-cover";

export function normalizeBannerSectionLayout(
  value: unknown,
): BannerSectionLayout {
  return BANNER_SECTION_LAYOUTS.some((option) => option.value === value)
    ? (value as BannerSectionLayout)
    : "two";
}

/** جاگیری تصویر؛ مقدار ناشناخته به contain (بدون برش و بدون زوم) برمی‌گردد. */
export function normalizeBannerSectionFit(value: unknown): BannerSectionFit {
  return value === "cover" ? "cover" : "contain";
}

/** انیمیشن هاور؛ مقدار ناشناخته/خالی یعنی «بدون انیمیشن». */
export function normalizeBannerSectionAnimation(
  value: unknown,
): BannerSectionAnimation {
  return BANNER_SECTION_ANIMATIONS.some((option) => option.value === value)
    ? (value as BannerSectionAnimation)
    : DEFAULT_BANNER_ANIMATION;
}

/**
 * کلاس انیمیشن روی «کادر» بنر (بالا آمدن + سایه).
 * کادر در صفحهٔ اول همیشه `group` و `overflow-hidden` دارد.
 *
 * کادر دقیقاً به اندازهٔ خود بنر است (عرض سکشن را پر نمی‌کند) و پس‌زمینه‌ای
 * ندارد؛ بنابراین سایه فقط دور بنر می‌افتد و اطرافش خالی از رنگ می‌ماند.
 */
export function bannerFrameAnimationClass(
  animation: BannerSectionAnimation,
): string {
  if (animation === "lift" || animation === "zoom_lift") {
    return "transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl motion-reduce:transform-none motion-reduce:transition-none";
  }

  return "";
}

/**
 * کلاس انیمیشن روی «تصویر» بنر (بزرگ‌نمایی ملایم).
 * تصویر داخل کادرِ `overflow-hidden` است؛ پس برش و گردی گوشه حفظ می‌شود.
 */
export function bannerImageAnimationClass(
  animation: BannerSectionAnimation,
): string {
  if (animation === "zoom" || animation === "zoom_lift") {
    return "transition-transform duration-500 ease-out group-hover:scale-[1.04] motion-reduce:transform-none motion-reduce:transition-none";
  }

  return "";
}

/**
 * لایهٔ «درخشش نور» که روی بنر رد می‌شود (فقط وقتی انیمیشن shine انتخاب شده
 * است). این لایه باید داخل کادرِ `group overflow-hidden` رندر شود.
 */
export const BANNER_SHINE_CLASS =
  "pointer-events-none absolute inset-y-0 -left-full w-full bg-gradient-to-r from-transparent via-white/35 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[200%] motion-reduce:hidden";
/**
 * پس‌زمینهٔ همهٔ بخش‌های بنر در صفحهٔ اول (هیرو، نوار بنرهای کوتاه و بخش
 * چندستونه).
 *
 * بنرها روی هیچ رنگ یا کارتی نمی‌نشینند؛ سطح پشت آن‌ها رنگ‌نخورده (سفید) است
 * تا سایهٔ هاور فقط دور خود بنر دیده شود و به سکشن اطراف نچسبد. اگر روزی
 * خواستید بنر روی همان پس‌زمینهٔ صفحه بنشیند، فقط همین یک مقدار را به
 * `bg-transparent` تغییر دهید؛ هیچ کلاس رنگ دیگری در بخش‌های بنر نیست.
 *
 * کلاس باید به‌صورت رشتهٔ کامل نوشته شود تا اسکنر Tailwind آن را تولید کند.
 */
export const BANNER_SECTION_SURFACE_CLASS = "bg-white";



/**
 * ارتفاع‌های پیشنهادی بنر هیرو (پیکسل).
 * صفر یعنی «ارتفاع طبیعی تصویر»؛ در این حالت تصویر کوچک بزرگ‌نمایی نمی‌شود.
 */
export const BANNER_HERO_HEIGHT_PRESETS: number[] = [0, 260, 360, 480, 600];

/**
 * ارتفاع‌های پیشنهادی بنرهای موبایل (پیکسل).
 * صفر یعنی «ارتفاع طبیعی تصویر».
 */
export const BANNER_MOBILE_HEIGHT_PRESETS: number[] = [0, 140, 180, 240, 320];

const MAX_SECTION_IMAGES = 12;
const MAX_SECTION_HEIGHT = 1200;

/** عدد صحیح نامنفی از پاسخ API؛ مقدار نامعتبر صفر (یعنی خودکار) می‌شود. */
function toCount(value: unknown): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) return 0;

  return Math.min(Math.round(parsed), MAX_SECTION_IMAGES);
}

function toHeight(value: unknown): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) return 0;

  return Math.min(Math.round(parsed), MAX_SECTION_HEIGHT);
}


export function bannerSectionLayoutOption(
  layout: BannerSectionLayout,
): BannerSectionLayoutOption {
  return (
    BANNER_SECTION_LAYOUTS.find((option) => option.value === layout) ??
    BANNER_SECTION_LAYOUTS[1]
  );
}

export function bannerSectionSlots(layout: BannerSectionLayout): number {
  return bannerSectionLayoutOption(layout).slots;
}

/**
 * کلاس ظرف گرید.
 * برای دسکتاپ و موبایل دو گرید جدا رندر می‌شود (مثل اسلایدر هیرو)؛ بنابراین
 * کلاس‌های دسکتاپ بدون پیشوند `md:` نوشته می‌شوند و ظرف دسکتاپ با
 * `hidden md:grid` فقط در همان نما دیده می‌شود.
 */
export function bannerGridContainerClass(
  layout: BannerSectionLayout,
  viewport: BannerViewport,
): string {
  if (viewport === "mobile") {
    return "grid-cols-1 gap-3";
  }

  const columns: Record<BannerSectionLayout, string> = {
    one: "grid-cols-1",
    two: "grid-cols-2",
    three: "grid-cols-3",
    three_split: "grid-cols-2",
    four: "grid-cols-4",
  };

  return `gap-4 ${columns[layout]}`;
}

/**
 * کلاس هر کاشی: نسبت تصویر و (در چیدمان سه‌تایی نامتقارن) جای آن در گرید.
 * ترتیب ستون‌ها RTL است؛ ستون ۱ سمت راست است.
 */
export function bannerGridTileClass(
  layout: BannerSectionLayout,
  index: number,
  viewport: BannerViewport,
): string {
  if (viewport === "mobile") {
    return "aspect-[16/9]";
  }

  if (layout === "three_split") {
    if (index === 2) {
      // بنر بلند سمت چپ که ارتفاع دو ردیف را می‌گیرد.
      return "col-start-2 row-start-1 row-span-2";
    }

    return index === 1
      ? "col-start-1 row-start-2 aspect-[16/9]"
      : "col-start-1 row-start-1 aspect-[16/9]";
  }

  const aspect: Record<Exclude<BannerSectionLayout, "three_split">, string> = {
    one: "aspect-[16/6]",
    two: "aspect-[16/10]",
    three: "aspect-[4/3]",
    four: "aspect-[4/3]",
  };

  return aspect[layout];
}

/**
 * بنرهای قابل نمایش در این بخش برای یک نما.
 * بنر بدون تصویر همان نما کنار گذاشته می‌شود (تصویر دسکتاپ جای موبایل را
 * نمی‌گیرد) و فقط به تعداد اسلات چیدمان بنر برمی‌گردد.
 */
export function selectSectionBanners(
  banners: StorefrontBanner[],
  section: BannerSectionConfig | null | undefined,
  viewport: BannerViewport,
): StorefrontBanner[] {
  if (!section || !section.is_active) {
    return [];
  }

  return filterBannersForViewport(banners, viewport).slice(
    0,
    bannerSectionSlots(section.layout),
  );
}

/**
 * بنرهای اسلایدر هیرو برای یک نما.
 *
 * - بخش خاموش یعنی هیچ اسلایدی نمایش داده نشود.
 * - نبودِ ردیف تنظیمات (نصب قدیمی/خطای API) یعنی همهٔ بنرها نمایش داده شوند.
 * - `image_count` سقف تعداد اسلایدهاست (۰ = همه) و بر اساس «ترتیب نمایش» است.
 */
export function selectHeroBanners(
  banners: StorefrontBanner[],
  section: BannerSectionConfig | null | undefined,
  viewport: BannerViewport,
): StorefrontBanner[] {
  if (section && !section.is_active) {
    return [];
  }

  const list = filterBannersForViewport(banners, viewport);
  const limit = section?.image_count ?? 0;

  return limit > 0 ? list.slice(0, limit) : list;
}


function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function cleanText(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

/**
 * ظاهر بنرها را از پاسخ API عمومی (`/banners` → appearance) می‌خواند.
 * نبودِ مقدار یعنی نصب قدیمی/خطای API؛ در این حالت پیش‌فرض پروژه استفاده
 * می‌شود تا بنرها بدون گردی ناگهانی تغییر شکل ندهند.
 */
export function parseBannerAppearance(raw: unknown): BannerAppearance {
  if (!isRecord(raw) || !isRecord(raw.appearance)) {
    return { radius: DEFAULT_BANNER_RADIUS };
  }

  return { radius: normalizeBannerRadius(raw.appearance.radius) };
}

/**
 * بخش چندستونه را از پاسخ API عمومی (/banners → sections) می‌خواند.
 */
export function parseBannerSection(
  raw: unknown,
  position: BannerPosition = HOME_GRID_POSITION,
): BannerSectionConfig | null {
  if (!Array.isArray(raw)) {
    return null;
  }

  const item = raw.find(
    (entry) => isRecord(entry) && entry.position === position,
  );

  if (!isRecord(item)) {
    return null;
  }

  const layout = normalizeBannerSectionLayout(item.layout);

  return {
    position,
    layout,
    slots: bannerSectionSlots(layout),
    title: cleanText(item.title),
    subtitle: cleanText(item.subtitle),
    image_count: toCount(item.image_count),
    height_desktop: toHeight(item.height_desktop),
    height_mobile: toHeight(item.height_mobile),
    fit: normalizeBannerSectionFit(item.fit),
    radius: normalizeBannerRadius(item.radius),
    animation: normalizeBannerSectionAnimation(item.animation),
    is_active: item.is_active !== false,
  };
}
