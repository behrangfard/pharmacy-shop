import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  MapPin,
  Package,
  Receipt,
  Truck,
  XCircle,
} from "lucide-react";

import api from "../services/api";

type OrderItem = {
  id: number;
  product_id?: number;
  variant_id?: number | null;
  product_name?: string;
  variant_name?: string | null;
  sku?: string | null;
  name?: string;
  quantity: number;
  unit_price?: string | number;
  total_price?: string | number;
  price?: string | number;
  total?: string | number;
  product?: {
    name?: string;
    title?: string;
    image?: string;
    images?: { path?: string; url?: string }[];
  } | null;
  variant?: {
    name?: string;
    sku?: string | null;
    image?: string | null;
  } | null;
};

type Order = {
  id: number;
  order_number: string;
  subtotal: string | number;
  shipping_cost: string | number;
  discount: string | number;
  tax_percent?: string | number;
  tax_amount?: string | number;
  total: string | number;
  status: string;
  payment_status: string;
  recipient_name: string;
  phone: string;
  address: string;
  postal_code: string;
  notes?: string | null;
  created_at: string;
  items: OrderItem[];
};

const formatPrice = (value: number) =>
  new Intl.NumberFormat("fa-IR").format(value);

const formatDate = (value: string) => {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const orderStatusLabels: Record<string, string> = {
  pending: "در انتظار بررسی",
  processing: "در حال پردازش",
  completed: "تکمیل‌شده",
  shipped: "ارسال‌شده",
  delivered: "تحویل‌شده",
  cancelled: "لغوشده",
  canceled: "لغوشده",
  refunded: "مستردشده",
};

const paymentStatusLabels: Record<string, string> = {
  unpaid: "پرداخت‌نشده",
  paid: "پرداخت‌شده",
  pending: "در انتظار پرداخت",
  failed: "پرداخت ناموفق",
  refunded: "مستردشده",
};

const getImageUrl = (path?: string | null) => {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;

  const cleanPath = path.replace(/^\/+/, "");

  return cleanPath.startsWith("storage/")
    ? `/${cleanPath}`
    : `/storage/${cleanPath}`;
};

const getItemName = (item: OrderItem) =>
  item.product_name ||
  item.name ||
  item.product?.name ||
  item.product?.title ||
  "محصول";

const getItemImage = (item: OrderItem) =>
  getImageUrl(
    item.variant?.image ||
      item.product?.image ||
      item.product?.images?.[0]?.url ||
      item.product?.images?.[0]?.path,
  );

export default function OrderDetail() {
  const { orderNumber } = useParams<{ orderNumber: string }>();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const fetchOrder = async () => {
      if (!orderNumber) {
        setError("شماره سفارش مشخص نیست.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await api.get(
          `/orders/${encodeURIComponent(orderNumber)}`,
        );

        const payload = response.data?.data ?? response.data;
        const orderData = payload?.order ?? payload;

        if (!orderData?.order_number) {
          throw new Error("اطلاعات سفارش دریافت نشد.");
        }

        if (active) {
          setOrder(orderData as Order);
        }
      } catch (err: any) {
        if (active) {
          setError(
            err?.response?.data?.message ||
              err?.message ||
              "دریافت اطلاعات سفارش ناموفق بود.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void fetchOrder();

    return () => {
      active = false;
    };
  }, [orderNumber]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center" dir="rtl">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
        <p className="text-slate-600">در حال دریافت اطلاعات سفارش...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center" dir="rtl">
        <div className="rounded-2xl border border-red-100 bg-red-50 p-6">
          <XCircle className="mx-auto mb-3 h-10 w-10 text-red-500" />

          <h1 className="mb-2 text-xl font-bold text-slate-900">
            دریافت سفارش ناموفق بود
          </h1>

          <p className="mb-5 text-sm text-red-700">{error}</p>

          <Link
            to="/account"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-700"
          >
            <ArrowRight size={18} />
            بازگشت به حساب کاربری
          </Link>
        </div>
      </div>
    );
  }

  const subtotal = Number(order.subtotal ?? 0);
  const discount = Number(order.discount ?? 0);
  const shippingCost = Number(order.shipping_cost ?? 0);
  const taxPercent = Number(order.tax_percent ?? 0);
  const taxAmount = Number(order.tax_amount ?? 0);
  const total = Number(order.total ?? 0);

  const orderStatus =
    orderStatusLabels[order.status] || order.status || "نامشخص";

  const paymentStatus =
    paymentStatusLabels[order.payment_status] ||
    order.payment_status ||
    "نامشخص";

  const isCancelled =
    order.status === "cancelled" || order.status === "canceled";

  const isPaid = order.payment_status === "paid";

  return (
    <main className="min-h-screen bg-slate-50 py-8 sm:py-12" dir="rtl">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Link
          to="/account"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950"
        >
          <ArrowRight size={18} />
          بازگشت به حساب کاربری
        </Link>

        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
              <Receipt size={18} />
              جزئیات سفارش
            </div>

            <h1 className="text-2xl font-black text-slate-950 sm:text-3xl">
              سفارش {order.order_number}
            </h1>

            <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
              <CalendarDays size={16} />
              {formatDate(order.created_at)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${
                isCancelled
                  ? "bg-red-100 text-red-700"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              {isCancelled ? <XCircle size={16} /> : <Package size={16} />}
              {orderStatus}
            </span>

            <span
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${
                isPaid
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {isPaid ? <CheckCircle2 size={16} /> : <Clock size={16} />}
              {paymentStatus}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
                <h2 className="text-lg font-bold text-slate-900">
                  محصولات سفارش
                </h2>
              </div>

              {!order.items?.length ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  محصولی برای این سفارش ثبت نشده است.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {order.items.map((item, index) => {
                    const name = getItemName(item);
                    const imageUrl = getItemImage(item);
                    const quantity = Number(item.quantity ?? 0);

                    const unitPrice = Number(
                      item.unit_price ?? item.price ?? 0,
                    );

                    const lineTotal =
                      item.total_price != null
                        ? Number(item.total_price)
                        : item.total != null
                          ? Number(item.total)
                          : unitPrice * quantity;

                    const variantName = item.variant_name || item.variant?.name;

                    const itemSku = item.sku || item.variant?.sku;

                    return (
                      <div
                        key={item.id ?? `${name}-${index}`}
                        className="flex items-center gap-4 p-4 sm:p-5"
                      >
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={name}
                              className="h-full w-full object-cover"
                              onError={(event) => {
                                event.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <Package size={28} className="text-slate-400" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="line-clamp-2 font-bold text-slate-900">
                            {name}
                          </h3>

                          {variantName && (
                            <p className="mt-2 text-sm font-semibold text-emerald-700">
                              تنوع: {variantName}
                            </p>
                          )}

                          {itemSku && (
                            <p
                              className="mt-1 text-xs text-slate-400"
                              dir="ltr"
                            >
                              SKU: {itemSku}
                            </p>
                          )}

                          <p className="mt-2 text-sm text-slate-500">
                            تعداد: {formatPrice(quantity)}
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            قیمت واحد: {formatPrice(unitPrice)} تومان
                          </p>
                        </div>

                        <div className="shrink-0 text-left">
                          <p className="font-black text-slate-900">
                            {formatPrice(lineTotal)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">تومان</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100">
                  <MapPin size={21} className="text-slate-700" />
                </div>

                <div>
                  <h2 className="font-bold text-slate-900">
                    اطلاعات گیرنده و ارسال
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    اطلاعات ثبت‌شده برای این سفارش
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="mb-1 text-xs text-slate-500">نام گیرنده</p>
                  <p className="font-bold text-slate-900">
                    {order.recipient_name || "—"}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="mb-1 text-xs text-slate-500">شماره تماس</p>
                  <p className="font-bold text-slate-900" dir="ltr">
                    {order.phone || "—"}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4 sm:col-span-2">
                  <p className="mb-1 text-xs text-slate-500">نشانی</p>
                  <p className="leading-7 text-slate-800">
                    {order.address || "—"}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="mb-1 text-xs text-slate-500">کد پستی</p>
                  <p className="font-bold text-slate-900">
                    {order.postal_code || "—"}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="mb-1 text-xs text-slate-500">هزینه ارسال</p>
                  <p className="font-bold text-slate-900">
                    {shippingCost === 0
                      ? "رایگان"
                      : `${formatPrice(shippingCost)} تومان`}
                  </p>
                </div>
              </div>

              {order.notes && (
                <div className="mt-4 rounded-xl border border-slate-200 p-4">
                  <p className="mb-1 text-xs text-slate-500">توضیحات سفارش</p>
                  <p className="text-sm leading-7 text-slate-700">
                    {order.notes}
                  </p>
                </div>
              )}
            </section>
          </div>

          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100">
                <Receipt size={21} className="text-slate-700" />
              </div>

              <div>
                <h2 className="font-bold text-slate-900">خلاصه پرداخت</h2>
                <p className="mt-1 text-xs text-slate-500">
                  جزئیات مبالغ سفارش
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-500">مبلغ کالاها</span>
                <span className="whitespace-nowrap font-semibold text-slate-900">
                  {formatPrice(subtotal)} تومان
                </span>
              </div>

              {discount > 0 && (
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-emerald-700">تخفیف</span>
                  <span className="whitespace-nowrap font-bold text-emerald-700">
                    − {formatPrice(discount)} تومان
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-500">هزینه ارسال</span>
                <span className="whitespace-nowrap font-semibold text-slate-900">
                  {shippingCost === 0
                    ? "رایگان"
                    : `${formatPrice(shippingCost)} تومان`}
                </span>
              </div>

              {taxAmount > 0 && (
                <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-amber-800">
                      ارزش افزوده ({formatPrice(taxPercent)}٪)
                    </span>
                    <span className="whitespace-nowrap font-bold text-amber-900">
                      {formatPrice(taxAmount)} تومان
                    </span>
                  </div>
                </div>
              )}

              <div className="border-t border-dashed border-slate-200 pt-4">
                <div className="rounded-xl bg-slate-900 p-4 text-white">
                  <p className="text-sm text-slate-300">مبلغ نهایی سفارش</p>

                  <p className="mt-2 text-2xl font-black">
                    {formatPrice(total)}
                    <span className="mr-2 text-sm font-medium text-slate-300">
                      تومان
                    </span>
                  </p>

                  <p className="mt-2 text-xs leading-6 text-slate-300">
                    مبلغ نهایی مطابق اطلاعات ثبت‌شده برای این سفارش است.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-slate-200 p-4">
              <div className="flex items-start gap-3">
                {isPaid ? (
                  <CheckCircle2
                    size={20}
                    className="mt-0.5 shrink-0 text-emerald-600"
                  />
                ) : (
                  <Clock size={20} className="mt-0.5 shrink-0 text-amber-600" />
                )}

                <div>
                  <p className="font-bold text-slate-900">وضعیت پرداخت</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {isPaid
                      ? "پرداخت این سفارش با موفقیت ثبت شده است."
                      : "وضعیت پرداخت این سفارش هنوز پرداخت‌شده نیست."}
                  </p>
                </div>
              </div>
            </div>

            <Link
              to="/products"
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-800 transition hover:bg-slate-50"
            >
              <Truck size={18} />
              ادامه خرید
            </Link>
          </aside>
        </div>
      </div>
    </main>
  );
}
