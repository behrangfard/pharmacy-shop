import api from "./api";

/**
 * صفحهٔ «روش‌های ارسال و اطلاعات ارسال» (مسیر سایت: /shipping-info).
 *
 * متن‌ها از پنل مدیریت (بخش ارسال و حمل‌ونقل ← تب «صفحهٔ ارسال») می‌آیند و
 * فهرست روش‌ها از روش‌های ارسال فعال فروشگاه ساخته می‌شود؛ بنابراین هر
 * تغییر هزینه/زمان تحویل در همان بخش، روی این صفحه دیده می‌شود.
 */
export interface ShippingInfoMethod {
  id: number;
  name: string;
  carrier: string | null;
  description: string | null;
  /** هزینهٔ پایهٔ روش (تومان). */
  base_cost: number;
  /** هزینهٔ هر کیلوگرم اضافه (تومان)؛ صفر یعنی بدون هزینهٔ وزنی. */
  cost_per_kg: number;
  /** مبلغی که از آن به بعد ارسال این روش رایگان می‌شود. */
  free_over_amount: number | null;
  min_days: number | null;
  max_days: number | null;
  /** متن آمادهٔ زمان تحویل (مثلاً «۲ تا ۴ روز کاری»). */
  delivery: string | null;
  is_express: boolean;
}

export interface ShippingInfoSettings {
  title: string;
  intro: string;
  /** نکته‌های «اطلاعات ارسال»؛ هر عضو یک نکته. */
  notes: string[];
  /** متن تکمیلی با نشانه‌گذاری سبک RichTextContent (## / ### / - / > / **). */
  content: string;
  /** نمایش هزینهٔ روش‌ها روی صفحه. */
  show_costs: boolean;
  methods: ShippingInfoMethod[];
  free_shipping: {
    enabled: boolean;
    /** حداقل مبلغ خرید برای ارسال رایگان (تومان). */
    threshold: number;
  };
  shipping_note: string;
  support_note: string;
  store_phone: string;
  store_working_hours: string;
}

/**
 * پیش‌فرض‌های صفحه؛ همان مقادیر پیش‌فرض بک‌اند (StoreSetting::DEFAULTS).
 * فقط وقتی به کار می‌روند که API در دسترس نباشد.
 */
export const DEFAULT_SHIPPING_INFO: ShippingInfoSettings = {
  title: "روش‌های ارسال و اطلاعات ارسال",
  intro:
    "سفارش‌های شما با بسته‌بندی ایمن و محرمانه ارسال می‌شود. در این صفحه روش‌های ارسال، هزینه و زمان تقریبی تحویل را می‌بینید؛ هزینهٔ نهایی هنگام ثبت سفارش و بر اساس مقصد و وزن مرسوله محاسبه می‌شود.",
  notes: [],
  content: "",
  show_costs: true,
  methods: [],
  free_shipping: { enabled: false, threshold: 0 },
  shipping_note: "",
  support_note: "همراه شما در مسیر خرید",
  store_phone: "",
  store_working_hours: "",
};

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function number(value: unknown, fallback = 0): number {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function bool(value: unknown, fallback = false): boolean {
  if (value === undefined || value === null) return fallback;

  return value === true || value === 1 || value === "1";
}

function normalizeNotes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((note) => (typeof note === "string" ? note.trim() : ""))
    .filter((note) => note !== "")
    .slice(0, 10);
}

function normalizeMethod(source: unknown, index: number): ShippingInfoMethod {
  const item = (source ?? {}) as Record<string, unknown>;

  return {
    id: number(item.id, index + 1),
    name: text(item.name, "").trim(),
    carrier: text(item.carrier, "").trim() || null,
    description: text(item.description, "").trim() || null,
    base_cost: number(item.base_cost),
    cost_per_kg: number(item.cost_per_kg),
    free_over_amount: nullableNumber(item.free_over_amount),
    min_days: nullableNumber(item.min_days),
    max_days: nullableNumber(item.max_days),
    delivery: text(item.delivery, "").trim() || null,
    is_express: bool(item.is_express),
  };
}

function normalizeMethods(value: unknown): ShippingInfoMethod[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => normalizeMethod(item, index))
    .filter((method) => method.name !== "");
}

/** تبدیل پاسخ خام API به شکل قابل استفادهٔ صفحه. */
export function normalizeShippingInfo(source: unknown): ShippingInfoSettings {
  const raw = (source ?? {}) as Record<string, unknown>;
  const freeShipping = (raw.free_shipping ?? {}) as Record<string, unknown>;

  return {
    title: text(raw.title, DEFAULT_SHIPPING_INFO.title).trim() ||
      DEFAULT_SHIPPING_INFO.title,
    intro: text(raw.intro, ""),
    notes: normalizeNotes(raw.notes),
    content: text(raw.content, ""),
    show_costs: bool(raw.show_costs, DEFAULT_SHIPPING_INFO.show_costs),
    methods: normalizeMethods(raw.methods),
    free_shipping: {
      enabled: bool(freeShipping.enabled),
      threshold: number(freeShipping.threshold),
    },
    shipping_note: text(raw.shipping_note, ""),
    support_note: text(raw.support_note, DEFAULT_SHIPPING_INFO.support_note),
    store_phone: text(raw.store_phone, ""),
    store_working_hours: text(raw.store_working_hours, ""),
  };
}

/** گرفتن محتوای صفحهٔ روش‌های ارسال؛ در خطا پیش‌فرض برمی‌گردد تا صفحه خالی نماند. */
export async function fetchShippingInfo(): Promise<ShippingInfoSettings> {
  try {
    const response = await api.get("/shipping-info");

    return normalizeShippingInfo(response.data?.data);
  } catch (error) {
    console.error("Failed to load shipping info:", error);

    return DEFAULT_SHIPPING_INFO;
  }
}
