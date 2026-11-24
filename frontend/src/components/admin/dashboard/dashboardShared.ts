import type { CSSProperties } from "react";
import {
  Boxes,
  CircleHelp,
  Globe,
  Package,
  Phone,
  ShoppingCart,
  Store,
  Tags,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type SalesTrendRange = "7d" | "30d" | "12m";

export interface SalesTrendPoint {
  key: string;
  date: string;
  sales: number | string;
  orders: number;
}

export interface SalesTrendSummary {
  total_sales: number | string;
  total_orders: number;
  previous_total_sales: number | string;
  change_percent: number | null;
  average_sales: number | string;
  average_order: number | string;
  peak: SalesTrendPoint | null;
}

export interface SalesTrendData {
  range: SalesTrendRange;
  granularity: "day" | "month";
  start_date: string;
  end_date: string;
  points: SalesTrendPoint[];
  summary: SalesTrendSummary;
}

export const salesTrendRanges: { value: SalesTrendRange; label: string; caption: string }[] = [
  { value: "7d", label: "۷ روز", caption: "هفت روز اخیر" },
  { value: "30d", label: "۳۰ روز", caption: "سی روز اخیر" },
  { value: "12m", label: "۱۲ ماه", caption: "دوازده ماه اخیر" },
];

export interface SalesChannelItem {
  channel: string;
  label: string;
  orders: number;
  sales: number | string;
  percentage: number;
}

export interface DashboardData {
  products: { total: number; active: number };
  users: { total: number };
  orders: {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    cancelled: number;
  };
  payments: { paid: number; unpaid: number };
  low_stock?: {
    products: number;
    variants: number;
    out_of_stock: number;
    low_stock: number;
    total: number;
    threshold: number;
  };
  sales: {
    total: number | string;
    current_week: number | string;
    previous_week: number | string;
    change_percent: number | null;
    week_starts_at?: string;
    next_week_starts_at?: string;
    channels?: SalesChannelItem[];
  };
}

export interface QuickLinkItem {
  to: string;
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  background: string;
  action: string;
}

export interface StatItem {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
  color: string;
  background: string;
}

export interface OrderStatusItem {
  label: string;
  value: number;
  color: string;
  background: string;
  icon: LucideIcon;
}

export const formatNumber = (value: string | number | null | undefined) =>
  new Intl.NumberFormat("fa-IR").format(Number(value) || 0);

export const formatPrice = (value: string | number | null | undefined) =>
  `${formatNumber(value)} تومان`;

/** خلاصه‌سازی مبلغ برای برچسب‌های محور نمودار. */
export const formatCompactPrice = (value: number) => {
  const amount = Number.isFinite(value) ? value : 0;
  const formatDecimal = (input: number) =>
    new Intl.NumberFormat("fa-IR", {
      maximumFractionDigits: input >= 10 ? 0 : 1,
    }).format(input);

  if (amount >= 1_000_000_000)
    return `${formatDecimal(amount / 1_000_000_000)} میلیارد`;
  if (amount >= 1_000_000) return `${formatDecimal(amount / 1_000_000)} میلیون`;
  if (amount >= 1_000) return `${formatDecimal(amount / 1_000)} هزار`;

  return formatNumber(amount);
};

/** تاریخ «YYYY-MM-DD» یا «YYYY-MM» را بدون جابه‌جایی منطقه زمانی پارس می‌کند. */
export const parseDateValue = (value: string) => {
  const [year, month, day] = value.split("-").map((part) => Number(part));

  return new Date(year || 1970, (month || 1) - 1, day || 1);
};

export const faWeekdayFormat = new Intl.DateTimeFormat("fa-IR", { weekday: "long" });
export const faDayMonthFormat = new Intl.DateTimeFormat("fa-IR", {
  day: "numeric",
  month: "long",
});
export const faMonthFormat = new Intl.DateTimeFormat("fa-IR", { month: "long" });
export const faMonthYearFormat = new Intl.DateTimeFormat("fa-IR", {
  month: "long",
  year: "numeric",
});
export const faFullDateFormat = new Intl.DateTimeFormat("fa-IR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

export const pageStyle: CSSProperties = {
  width: "100%",
  maxWidth: "none",
  minWidth: 0,
  boxSizing: "border-box",
};

export const quickLinks: QuickLinkItem[] = [
  {
    to: "/admin/products",
    title: "مدیریت محصولات",
    description: "محصولات، قیمت‌ها و موجودی فروشگاه را مدیریت کن.",
    icon: Package,
    color: "#c96548",
    background: "#fff0eb",
    action: "مشاهده محصولات",
  },
  {
    to: "/admin/inventory",
    title: "موجودی و انبار",
    description: "کالاهای رو به اتمام، آستانهٔ هشدار و شمارش انبار را مدیریت کن.",
    icon: Boxes,
    color: "#b47b3c",
    background: "#fbf2e5",
    action: "بررسی موجودی",
  },
  {
    to: "/admin/categories",
    title: "دسته‌بندی‌ها",
    description: "ساختار دسته‌بندی محصولات فروشگاه را سامان بده.",
    icon: Tags,
    color: "#397c91",
    background: "#eaf3f5",
    action: "مدیریت دسته‌بندی‌ها",
  },
  {
    to: "/admin/orders",
    title: "مدیریت سفارش‌ها",
    description: "سفارش‌های مشتریان و وضعیت پردازش آن‌ها را پیگیری کن.",
    icon: ShoppingCart,
    color: "#54785a",
    background: "#edf4e9",
    action: "مشاهده سفارش‌ها",
  },
];

export const channelPresentation: Record<
  string,
  { label: string; icon: LucideIcon; color: string; background: string }
> = {
  website: {
    label: "وب‌سایت",
    icon: Globe,
    color: "#397c91",
    background: "#eaf3f5",
  },
  instagram: {
    label: "اینستاگرام",
    icon: Globe,
    color: "#b65d8b",
    background: "#faedf4",
  },
  phone: {
    label: "تلفنی",
    icon: Phone,
    color: "#b47b3c",
    background: "#fbf2e5",
  },
  in_person: {
    label: "حضوری",
    icon: Store,
    color: "#54785a",
    background: "#edf4e9",
  },
  other: {
    label: "سایر",
    icon: CircleHelp,
    color: "#858d98",
    background: "#f0f2f4",
  },
};
