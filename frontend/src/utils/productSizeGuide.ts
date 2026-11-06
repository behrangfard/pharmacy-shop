/**
 * «راهنمای سایز اختصاصی محصول».
 *
 * این راهنما برای هر محصول جداست (نه راهنمای عمومی سایت در
 * src/data/sizeGuide.ts) و از پنل مدیریت، داخل فرم همان محصول ویرایش
 * می‌شود. ساختار داده با جدول product_size_guides در بک‌اند یکی است.
 */

export type ProductSizeGuideUnit = "cm" | "inch" | "none";

export interface ProductSizeGuideStep {
  /** عنوان مرحله؛ مثل «دور سینه» */
  title: string;
  /** توضیح مرحله */
  description: string;
}

export interface ProductSizeGuideSpec {
  /** نام مشخصه؛ مثل «قد لباس» */
  label: string;
  /** مقدار مشخصه؛ مثل «۷۵ سانتی‌متر» */
  value: string;
}

export interface ProductSizeGuide {
  is_enabled: boolean;
  /** عنوان دلخواه راهنما؛ خالی یعنی عنوان پیش‌فرض */
  title: string;
  /** توضیح کوتاه بالای جدول */
  intro: string;
  unit: ProductSizeGuideUnit;
  /** مسیر تصویر «نحوهٔ اندازه‌گیری» */
  measure_image: string;
  measure_steps: ProductSizeGuideStep[];
  /** سرستون‌های جدول سایز */
  columns: string[];
  /** سطرهای جدول سایز؛ هر سطر هم‌طول ستون‌ها است */
  rows: string[][];
  /** ابعاد و مشخصات ثابت لباس */
  specs: ProductSizeGuideSpec[];
  /** توصیه انتخاب سایز */
  fit_note: string;
  /** یادداشت پایانی */
  note: string;
  /** نکته‌های کوتاه */
  tips: string[];
}

export const PRODUCT_SIZE_GUIDE_UNIT_LABELS: Record<
  ProductSizeGuideUnit,
  string
> = {
  cm: "سانتی‌متر",
  inch: "اینچ",
  none: "",
};

export const PRODUCT_SIZE_GUIDE_UNIT_OPTIONS: Array<{
  value: ProductSizeGuideUnit;
  label: string;
}> = [
  { value: "cm", label: "سانتی‌متر" },
  { value: "inch", label: "اینچ" },
  { value: "none", label: "بدون واحد" },
];

/** ستون‌های پیشنهادی برای شروع کار در پنل مدیریت */
export const DEFAULT_PRODUCT_SIZE_GUIDE_COLUMNS = [
  "سایز",
  "دور سینه",
  "دور کمر",
  "دور باسن",
];

/** راهنمای خالی؛ برای فرم محصول جدید */
export function emptyProductSizeGuide(): ProductSizeGuide {
  return {
    is_enabled: true,
    title: "",
    intro: "",
    unit: "cm",
    measure_image: "",
    measure_steps: [],
    columns: [...DEFAULT_PRODUCT_SIZE_GUIDE_COLUMNS],
    rows: [],
    specs: [],
    fit_note: "",
    note: "",
    tips: [],
  };
}

function toText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);

  return "";
}

function toTextArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value.map(toText).filter((item) => item !== "");
}

function toUnit(value: unknown): ProductSizeGuideUnit {
  if (value === "inch" || value === "none" || value === "cm") {
    return value;
  }

  return "cm";
}

/**
 * دادهٔ خام API را به ساختار راهنما تبدیل می‌کند؛ بدون هیچ فیلتری.
 *
 * در پنل مدیریت استفاده می‌شود چون مدیر باید راهنمای خاموش یا نیمه‌خالی را
 * هم ببیند و ویرایش کند.
 */
export function parseProductSizeGuide(
  raw: unknown,
): ProductSizeGuide | null {
  if (!raw || typeof raw !== "object") return null;

  const data = raw as Record<string, unknown>;

  /*
   * ستون‌های بی‌عنوان حذف می‌شوند، اما سلول متناظرشان هم از هر سطر حذف
   * می‌شود تا داده‌ها جابه‌جا نشوند (همان قاعدهٔ بک‌اند).
   */
  const rawColumns = Array.isArray(data.columns) ? data.columns : [];
  const keptIndexes: number[] = [];
  const columns: string[] = [];

  rawColumns.forEach((column, index) => {
    const value = toText(column);

    if (value !== "") {
      keptIndexes.push(index);
      columns.push(value);
    }
  });

  const rows: string[][] = [];

  if (columns.length > 0 && Array.isArray(data.rows)) {
    data.rows.forEach((row) => {
      if (!Array.isArray(row)) return;

      const cells = keptIndexes.map((index) => toText(row[index]));

      if (cells.join("") === "") return;

      rows.push(cells);
    });
  }

  const steps: ProductSizeGuideStep[] = [];

  if (Array.isArray(data.measure_steps)) {
    data.measure_steps.forEach((step) => {
      if (!step || typeof step !== "object") return;

      const entry = step as Record<string, unknown>;
      const title = toText(entry.title);
      const description = toText(entry.description);

      if (title === "" && description === "") return;

      steps.push({ title, description });
    });
  }

  const specs: ProductSizeGuideSpec[] = [];

  if (Array.isArray(data.specs)) {
    data.specs.forEach((spec) => {
      if (!spec || typeof spec !== "object") return;

      const entry = spec as Record<string, unknown>;
      const label = toText(entry.label);
      const value = toText(entry.value);

      if (label === "" && value === "") return;

      specs.push({ label, value });
    });
  }

  const guide: ProductSizeGuide = {
    is_enabled: data.is_enabled === undefined ? true : Boolean(data.is_enabled),
    title: toText(data.title),
    intro: toText(data.intro),
    unit: toUnit(data.unit),
    measure_image: toText(data.measure_image),
    measure_steps: steps,
    columns,
    rows,
    specs,
    fit_note: toText(data.fit_note),
    note: toText(data.note),
    tips: toTextArray(data.tips),
  };

  return guide;
}

/**
 * راهنمای قابل نمایش در صفحهٔ محصول.
 *
 * اگر راهنما خاموش باشد یا هیچ محتوایی نداشته باشد `null` برمی‌گردد تا
 * صفحهٔ محصول به راهنمای سایز عمومی برگردد.
 */
export function normalizeProductSizeGuide(
  raw: unknown,
): ProductSizeGuide | null {
  const guide = parseProductSizeGuide(raw);

  if (!guide || !guide.is_enabled || !hasProductSizeGuideContent(guide)) {
    return null;
  }

  return guide;
}

/** آیا راهنما چیزی برای نمایش دارد؟ */
export function hasProductSizeGuideContent(guide: ProductSizeGuide): boolean {
  return (
    (guide.columns.length > 0 && guide.rows.length > 0) ||
    guide.title !== "" ||
    guide.intro !== "" ||
    guide.measure_image !== "" ||
    guide.fit_note !== "" ||
    guide.note !== "" ||
    guide.measure_steps.length > 0 ||
    guide.specs.length > 0 ||
    guide.tips.length > 0
  );
}

/**
 * یکسان‌سازی برچسب سایز برای مقایسهٔ نام تنوع با ستون اول جدول.
 * مثال: «سایز ۷۵B» و «75b» هر دو به «75b» تبدیل می‌شوند.
 */
export function normalizeSizeLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/سایز|size/gi, "")
    .replace(/[\s\u200c\u200d\-_/\\]+/g, "");
}

/** آیا این سطر جدول به سایز انتخاب‌شده مربوط است؟ */
export function sizeGuideRowMatchesSize(
  row: string[],
  sizeName?: string | null,
): boolean {
  if (!sizeName) return false;

  const label = normalizeSizeLabel(row[0] ?? "");
  const target = normalizeSizeLabel(sizeName);

  if (label === "" || target === "") return false;

  return label === target || label.includes(target) || target.includes(label);
}

/** سطر متناظر با سایز انتخاب‌شده؛ برای نمایش خلاصهٔ اندازه‌ها. */
export function findSizeGuideRow(
  guide: ProductSizeGuide,
  sizeName?: string | null,
): string[] | null {
  if (!sizeName) return null;

  return (
    guide.rows.find((row) => sizeGuideRowMatchesSize(row, sizeName)) ?? null
  );
}

/** برچسب واحد برای نمایش کنار جدول (خالی = بدون برچسب) */
export function productSizeGuideUnitLabel(
  unit: ProductSizeGuideUnit,
): string {
  return PRODUCT_SIZE_GUIDE_UNIT_LABELS[unit];
}
