import { CheckCircle2, Clock3, Package, Truck, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { getStorageUrl } from "./images";

/**
 * توابع نمایش سفارش مشتری (فهرست «سفارش‌های من»).
 *
 * قبلاً این توابع داخل `pages/Account.tsx` تعریف شده بودند؛ چون فهرست سفارش‌ها
 * به صفحهٔ مستقل `/account/orders` منتقل شد، به `utils` آمد تا یک منبع واحد
 * برای برچسب‌ها، رنگ وضعیت و قواعد «ادامهٔ پرداخت / لغو سفارش» باشد.
 */

/** تصویری که API برای هر محصول برمی‌گرداند. */
export type OrderItemImage = {
  path: string;
  is_primary?: boolean;
  sort_order?: number;
};

/** اطلاعات محصول داخل قلم سفارش (فقط چیزی که برای نام و تصویر لازم است). */
export type OrderItemProduct = {
  name?: string;
  thumbnail?: string | null;
  images?: OrderItemImage[];
};

/** یک قلم سفارش در پاسخ فهرست سفارش‌ها. */
export type OrderItem = {
  id: number;
  product_name: string;
  quantity: number | string;
  product?: OrderItemProduct | null;
};

/**
 * شکل سفارش در فهرست «سفارش‌های من».
 * فقط فیلدهایی که کارت فهرست نشان می‌دهد نگه داشته شده‌اند.
 */
export type OrderSummary = {
  id: number;
  order_number: string;
  subtotal: string | number;
  shipping_cost: string | number;
  discount: string | number;
  total: string | number;
  status: string;
  payment_status: string;
  payment_method?: string | null;
  created_at: string;
  items: OrderItem[];
};

/** رنگ و آیکن نشان وضعیت سفارش (نوار کناری و چیپ کارت). */
export type OrderStatusStyle = {
  wrapper: string;
  accent: string;
  icon: LucideIcon;
};

/** وضعیت‌هایی که یعنی سفارش لغو شده است (API هر دو املا را داده است). */
const CANCELLED_STATUSES = ["cancelled", "canceled"];

/** مبلغ را با جداکنندهٔ هزارگان فارسی و بدون واحد پول برمی‌گرداند. */
export function formatOrderPrice(
  value: string | number | null | undefined,
): string {
  const amount = Number(value ?? 0);

  if (!Number.isFinite(amount)) {
    return "۰";
  }

  return amount.toLocaleString("fa-IR");
}

/** تاریخ سفارش را به شمسی کوتاه تبدیل می‌کند و برای مقدار نامعتبر «—» می‌دهد. */
export function formatOrderDate(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("fa-IR");
}

/** برچسب فارسی وضعیت سفارش. */
export function orderStatusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "در انتظار بررسی";

    case "processing":
      return "در حال پردازش";

    case "shipped":
      return "ارسال شده";

    case "delivered":
      return "تحویل شده";

    case "cancelled":
    case "canceled":
      return "لغو شده";

    default:
      return status;
  }
}

/** برچسب فارسی وضعیت پرداخت. */
export function paymentStatusLabel(status: string): string {
  switch (status) {
    case "paid":
      return "پرداخت شده";

    case "pending":
    case "unpaid":
      return "پرداخت نشده";

    case "failed":
      return "پرداخت ناموفق";

    case "refunded":
      return "مسترد شده";

    default:
      return status;
  }
}

/** رنگ چیپ و نوار کناری کارت سفارش بر اساس وضعیت سفارش. */
export function orderStatusStyle(status: string): OrderStatusStyle {
  switch (status) {
    case "pending":
      return {
        wrapper: "bg-gold-50 text-gold border-gold-100",
        accent: "bg-gold",
        icon: Clock3,
      };

    case "processing":
      return {
        wrapper: "bg-brand-50 text-brand-700 border-brand-200",
        accent: "bg-brand-500",
        icon: Package,
      };

    case "shipped":
      return {
        wrapper: "bg-brand-100 text-brand-700 border-brand-250",
        accent: "bg-brand-500",
        icon: Truck,
      };

    case "delivered":
      return {
        wrapper: "bg-brand-50 text-stock-700 border-brand-200",
        accent: "bg-stock",
        icon: CheckCircle2,
      };

    case "cancelled":
    case "canceled":
      return {
        wrapper: "bg-blush-50 text-discount border-blush-200",
        accent: "bg-discount",
        icon: XCircle,
      };

    default:
      return {
        wrapper: "bg-cream text-muted border-line",
        accent: "bg-muted-soft",
        icon: Package,
      };
  }
}

/** کلاس‌های چیپ وضعیت پرداخت. */
export function paymentStatusStyle(status: string): string {
  switch (status) {
    case "paid":
      return "bg-brand-50 text-stock-700 border-brand-200";

    case "failed":
      return "bg-blush-50 text-discount border-blush-200";

    case "refunded":
      return "bg-brand-100 text-brand-700 border-brand-250";

    default:
      return "bg-cream text-muted border-line";
  }
}

/**
 * تصویر کوچک کارت سفارش: اول تصویر شاخص محصول، بعد اولین تصویر بر اساس
 * `sort_order`؛ اگر محصولی تصویر نداشته باشد `null` برمی‌گردد.
 */
export function orderThumbnail(
  order: Pick<OrderSummary, "items">,
): string | null {
  const firstItem = order.items?.[0];

  if (!firstItem) {
    return null;
  }

  if (firstItem.product?.thumbnail) {
    return getStorageUrl(firstItem.product.thumbnail);
  }

  const images = firstItem.product?.images ?? [];

  if (images.length === 0) {
    return null;
  }

  const primaryImage = images.find((image) => image.is_primary);

  const selectedImage =
    primaryImage ??
    [...images].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0];

  return getStorageUrl(selectedImage?.path);
}

/** مجموع تعداد کالاهای سفارش. */
export function orderItemCount(order: Pick<OrderSummary, "items">): number {
  return (
    order.items?.reduce((sum, item) => sum + Number(item.quantity), 0) ?? 0
  );
}

/**
 * سفارش پرداخت‌نشده (و لغو‌نشده) می‌تواند مرحلهٔ پرداخت را ادامه دهد؛ همان
 * شرطی که سرور در `pay()` بررسی می‌کند. سفارش «پرداخت در محل» پرداخت آنلاین
 * ندارد.
 */
export function canContinuePayment(
  order: Pick<OrderSummary, "payment_status" | "payment_method" | "status">,
): boolean {
  return (
    order.payment_status === "unpaid" &&
    order.payment_method !== "cod" &&
    !CANCELLED_STATUSES.includes(order.status)
  );
}

/** لغو سفارش توسط مشتری فقط تا پیش از ارسال و برای سفارش پرداخت‌نشده. */
export function canCancelCustomerOrder(
  order: Pick<OrderSummary, "payment_status" | "status">,
): boolean {
  return (
    order.payment_status !== "paid" &&
    !["shipped", "delivered", ...CANCELLED_STATUSES].includes(order.status)
  );
}
