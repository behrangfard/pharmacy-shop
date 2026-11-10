import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  MapPin,
  Package,
  Receipt,
  RotateCcw,
  Truck,
  XCircle,
} from "lucide-react";

import api from "../services/api";
import { usePrivatePageMeta } from "../hooks/usePageMeta";
import { formatJalaliDateTime } from "../utils/jalali";

type OrderItem = {
  id: number;
  product_id?: number;
  variant_id?: number | null;
  product_name?: string;
  variant_name?: string | null;
  /** رنگ انتخاب‌شدهٔ محصول در زمان ثبت سفارش */
  color_name?: string | null;
  /** رنگ هر قطعهٔ پک در زمان ثبت سفارش */
  pack_colors?: { name?: string; color?: string }[] | null;
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
  coupon_code?: string | null;
  coupon_discount?: string | number;
  tax_percent?: string | number;
  tax_amount?: string | number;
  total: string | number;
  status: string;
  payment_status: string;
  recipient_name: string;
  phone: string;
  address: string;
  postal_code: string;
  shipping_method?: string | null;
  tracking_code?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  notes?: string | null;
  created_at: string;
  items: OrderItem[];
  return_request?: {
    id: number;
    status: string;
    reason: string;
    admin_note?: string | null;
    refund_amount?: string | number | null;
    created_at?: string;
  } | null;
};

const formatPrice = (value: number) =>
  new Intl.NumberFormat("fa-IR").format(value);

const formatDate = (value: string) => {
  if (!value) return "—";

  // تاریخ شمسی مستقل از تقویم مرورگر؛ زمان UTC سرور به وقت محلی تبدیل می‌شود.
  return formatJalaliDateTime(value, { withTime: true }) || value;
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

const returnStatusLabels: Record<string, string> = {
  pending: "در انتظار بررسی",
  approved: "تأییدشده",
  rejected: "ردشده",
  refunded: "بازپرداخت‌شده",
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
  usePrivatePageMeta("جزئیات سفارش", "/order");

  const { orderNumber } = useParams<{ orderNumber: string }>();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [returnReason, setReturnReason] = useState("");
  const [returnDescription, setReturnDescription] = useState("");
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [returnError, setReturnError] = useState("");
  const [returnSuccess, setReturnSuccess] = useState("");

  async function submitReturnRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!order || returnSubmitting) return;

    if (!returnReason.trim()) {
      setReturnError("دلیل مرجوعی را بنویسید.");
      return;
    }

    setReturnSubmitting(true);
    setReturnError("");
    setReturnSuccess("");

    try {
      const response = await api.post(
        `/orders/${encodeURIComponent(order.order_number)}/returns`,
        {
          reason: returnReason.trim(),
          description: returnDescription.trim() || null,
        },
      );

      const created = response.data?.data;

      setOrder((current) =>
        current ? { ...current, return_request: created } : current,
      );

      setReturnSuccess(response.data?.message ?? "درخواست مرجوعی ثبت شد.");
      setReturnReason("");
      setReturnDescription("");
    } catch (err: any) {
      setReturnError(
        err?.response?.data?.message ?? "ثبت درخواست مرجوعی ناموفق بود.",
      );
    } finally {
      setReturnSubmitting(false);
    }
  }

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
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-line border-t-ink" />
        <p className="text-muted">در حال دریافت اطلاعات سفارش...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center" dir="rtl">
        <div className="rounded-2xl border border-blush-100 bg-blush-50 p-6">
          <XCircle className="mx-auto mb-3 h-10 w-10 text-discount" />

          <h1 className="mb-2 text-xl font-bold text-ink">
            دریافت سفارش ناموفق بود
          </h1>

          <p className="mb-5 text-sm text-discount">{error}</p>

          <Link
            to="/account"
            className="inline-flex items-center gap-2 rounded-xl bg-ink px-5 py-3 text-sm font-bold text-white hover:bg-ink-soft"
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

  /*
   * سفارشی که پرداختش انجام نشده و لغو هم نشده باید بتواند مرحلهٔ پرداخت را
   * ادامه دهد؛ این همان شرطی است که سرور در pay() بررسی می‌کند.
   */
  const isOutstandingPayment =
    order.payment_status === "unpaid" &&
    !["cancelled", "canceled"].includes(order.status);

  return (
    <main className="min-h-screen bg-cream py-8 sm:py-12" dir="rtl">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Link
          to="/account"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-ink"
        >
          <ArrowRight size={18} />
          بازگشت به حساب کاربری
        </Link>

        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-muted">
              <Receipt size={18} />
              جزئیات سفارش
            </div>

            <h1 className="text-2xl font-black text-ink sm:text-3xl">
              سفارش {order.order_number}
            </h1>

            <p className="mt-2 flex items-center gap-2 text-sm text-muted">
              <CalendarDays size={16} />
              {formatDate(order.created_at)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${
                isCancelled
                  ? "bg-blush-100 text-discount"
                  : "bg-brand-100 text-brand-700"
              }`}
            >
              {isCancelled ? <XCircle size={16} /> : <Package size={16} />}
              {orderStatus}
            </span>

            <span
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${
                isPaid
                  ? "bg-brand-100 text-stock-700"
                  : "bg-gold-100 text-gold"
              }`}
            >
              {isPaid ? <CheckCircle2 size={16} /> : <Clock size={16} />}
              {paymentStatus}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
              <div className="border-b border-line px-5 py-4 sm:px-6">
                <h2 className="text-lg font-bold text-ink">
                  محصولات سفارش
                </h2>
              </div>

              {!order.items?.length ? (
                <div className="p-8 text-center text-sm text-muted">
                  محصولی برای این سفارش ثبت نشده است.
                </div>
              ) : (
                <div className="divide-y divide-line">
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
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-line">
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
                            <Package size={28} className="text-muted-soft" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="line-clamp-2 font-bold text-ink">
                            {name}
                          </h3>

                          {variantName && (
                            <p className="mt-2 text-sm font-semibold text-stock-700">
                              تنوع: {variantName}
                            </p>
                          )}

                          {item.color_name && (
                            <p className="mt-1.5 text-sm font-semibold text-brand-700">
                              رنگ: {item.color_name}
                            </p>
                          )}

                          {Array.isArray(item.pack_colors) &&
                            item.pack_colors.length > 0 && (
                              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-brand-700">
                                <span className="font-bold">
                                  رنگ اجزای پک:
                                </span>

                                {item.pack_colors.map((entry, colorIndex) => (
                                  <span
                                    key={`${entry.name}-${entry.color}-${colorIndex}`}
                                    className="rounded-md bg-brand-50 px-2 py-0.5"
                                  >
                                    {entry.name}: <b>{entry.color}</b>
                                  </span>
                                ))}
                              </div>
                            )}

                          {itemSku && (
                            <p
                              className="mt-1 text-xs text-muted-soft"
                              dir="ltr"
                            >
                              SKU: {itemSku}
                            </p>
                          )}

                          <p className="mt-2 text-sm text-muted">
                            تعداد: {formatPrice(quantity)}
                          </p>

                          <p className="mt-1 text-sm text-muted">
                            قیمت واحد: {formatPrice(unitPrice)} تومان
                          </p>
                        </div>

                        <div className="shrink-0 text-left">
                          <p className="font-black text-ink">
                            {formatPrice(lineTotal)}
                          </p>
                          <p className="mt-1 text-xs text-muted">تومان</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-line">
                  <MapPin size={21} className="text-ink-soft" />
                </div>

                <div>
                  <h2 className="font-bold text-ink">
                    اطلاعات گیرنده و ارسال
                  </h2>
                  <p className="mt-1 text-xs text-muted">
                    اطلاعات ثبت‌شده برای این سفارش
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-cream p-4">
                  <p className="mb-1 text-xs text-muted">نام گیرنده</p>
                  <p className="font-bold text-ink">
                    {order.recipient_name || "—"}
                  </p>
                </div>

                <div className="rounded-xl bg-cream p-4">
                  <p className="mb-1 text-xs text-muted">شماره تماس</p>
                  <p className="font-bold text-ink" dir="ltr">
                    {order.phone || "—"}
                  </p>
                </div>

                <div className="rounded-xl bg-cream p-4 sm:col-span-2">
                  <p className="mb-1 text-xs text-muted">نشانی</p>
                  <p className="leading-7 text-ink">
                    {order.address || "—"}
                  </p>
                </div>

                <div className="rounded-xl bg-cream p-4">
                  <p className="mb-1 text-xs text-muted">کد پستی</p>
                  <p className="font-bold text-ink">
                    {order.postal_code || "—"}
                  </p>
                </div>

                <div className="rounded-xl bg-cream p-4">
                  <p className="mb-1 text-xs text-muted">هزینه ارسال</p>
                  <p className="font-bold text-ink">
                    {shippingCost === 0
                      ? "رایگان"
                      : `${formatPrice(shippingCost)} تومان`}
                  </p>
                </div>

                {order.shipping_method && (
                  <div className="rounded-xl bg-cream p-4">
                    <p className="mb-1 text-xs text-muted">روش ارسال</p>
                    <p className="font-bold text-ink">
                      {order.shipping_method}
                    </p>
                  </div>
                )}

                {order.tracking_code && (
                  <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
                    <p className="mb-1 text-xs text-stock-700">
                      کد رهگیری مرسوله
                    </p>
                    <p
                      className="font-black text-stock-700"
                      dir="ltr"
                    >
                      {order.tracking_code}
                    </p>
                  </div>
                )}

                {order.shipped_at && (
                  <div className="rounded-xl bg-cream p-4">
                    <p className="mb-1 text-xs text-muted">تاریخ ارسال</p>
                    <p className="font-bold text-ink">
                      {formatDate(order.shipped_at)}
                    </p>
                  </div>
                )}

                {order.delivered_at && (
                  <div className="rounded-xl bg-cream p-4">
                    <p className="mb-1 text-xs text-muted">تاریخ تحویل</p>
                    <p className="font-bold text-ink">
                      {formatDate(order.delivered_at)}
                    </p>
                  </div>
                )}
              </div>

              {order.notes && (
                <div className="mt-4 rounded-xl border border-line p-4">
                  <p className="mb-1 text-xs text-muted">توضیحات سفارش</p>
                  <p className="text-sm leading-7 text-ink-soft">
                    {order.notes}
                  </p>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold-50 text-gold">
                  <RotateCcw size={21} />
                </div>

                <div>
                  <h2 className="font-bold text-ink">
                    مرجوعی و بازپرداخت
                  </h2>
                  <p className="mt-1 text-xs text-muted">
                    درخواست مرجوعی برای سفارش‌های تحویل‌شده و پرداخت‌شده فعال
                    است.
                  </p>
                </div>
              </div>

              {order.return_request ? (
                <div className="rounded-xl border border-line bg-cream p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-bold text-ink">
                      درخواست مرجوعی شما ثبت شده است
                    </span>

                    <span className="rounded-full bg-gold-100 px-3 py-1 text-xs font-bold text-gold">
                      {returnStatusLabels[order.return_request.status] ??
                        order.return_request.status}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-muted">
                    دلیل: {order.return_request.reason}
                  </p>

                  {order.return_request.admin_note && (
                    <p className="mt-2 rounded-lg bg-white p-3 text-xs leading-6 text-muted">
                      پاسخ پشتیبانی: {order.return_request.admin_note}
                    </p>
                  )}

                  {order.return_request.refund_amount && (
                    <p className="mt-2 text-xs font-bold text-stock-700">
                      مبلغ بازپرداخت:{" "}
                      {formatPrice(Number(order.return_request.refund_amount))}{" "}
                      تومان
                    </p>
                  )}
                </div>
              ) : order.status === "delivered" &&
                order.payment_status === "paid" ? (
                <form onSubmit={submitReturnRequest} className="space-y-3">
                  <div>
                    <label
                      htmlFor="return-reason"
                      className="mb-1.5 block text-xs font-bold text-ink-soft"
                    >
                      دلیل مرجوعی *
                    </label>

                    <input
                      id="return-reason"
                      value={returnReason}
                      onChange={(event) => setReturnReason(event.target.value)}
                      maxLength={255}
                      placeholder="مثال: سایز نامناسب"
                      className="w-full rounded-xl border border-line px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="return-description"
                      className="mb-1.5 block text-xs font-bold text-ink-soft"
                    >
                      توضیحات (اختیاری)
                    </label>

                    <textarea
                      id="return-description"
                      value={returnDescription}
                      onChange={(event) =>
                        setReturnDescription(event.target.value)
                      }
                      rows={3}
                      maxLength={2000}
                      className="w-full resize-none rounded-xl border border-line px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                    />
                  </div>

                  {returnError && (
                    <p className="text-xs font-bold text-discount">
                      {returnError}
                    </p>
                  )}

                  {returnSuccess && (
                    <p className="text-xs font-bold text-stock-700">
                      {returnSuccess}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={returnSubmitting}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {returnSubmitting ? "در حال ثبت..." : "ثبت درخواست مرجوعی"}
                  </button>
                </form>
              ) : (
                <p className="rounded-xl bg-cream p-4 text-sm text-muted">
                  پس از تحویل و پرداخت کامل سفارش، امکان ثبت درخواست مرجوعی
                  فراهم می‌شود.
                </p>
              )}
            </section>
          </div>

          <aside className="h-fit rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-line">
                <Receipt size={21} className="text-ink-soft" />
              </div>

              <div>
                <h2 className="font-bold text-ink">خلاصه پرداخت</h2>
                <p className="mt-1 text-xs text-muted">
                  جزئیات مبالغ سفارش
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted">مبلغ کالاها</span>
                <span className="whitespace-nowrap font-semibold text-ink">
                  {formatPrice(subtotal)} تومان
                </span>
              </div>

              {discount > 0 && (
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-stock-700">
                    تخفیف
                    {order.coupon_code ? ` (${order.coupon_code})` : ""}
                  </span>
                  <span className="whitespace-nowrap font-bold text-stock-700">
                    − {formatPrice(discount)} تومان
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted">هزینه ارسال</span>
                <span className="whitespace-nowrap font-semibold text-ink">
                  {shippingCost === 0
                    ? "رایگان"
                    : `${formatPrice(shippingCost)} تومان`}
                </span>
              </div>

              {taxAmount > 0 && (
                <div className="rounded-xl border border-gold-100 bg-gold-50 p-4">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-gold">
                      ارزش افزوده ({formatPrice(taxPercent)}٪)
                    </span>
                    <span className="whitespace-nowrap font-bold text-gold">
                      {formatPrice(taxAmount)} تومان
                    </span>
                  </div>
                </div>
              )}

              <div className="border-t border-dashed border-line pt-4">
                <div className="rounded-xl bg-ink p-4 text-white">
                  <p className="text-sm text-line-strong">مبلغ نهایی سفارش</p>

                  <p className="mt-2 text-2xl font-black">
                    {formatPrice(total)}
                    <span className="mr-2 text-sm font-medium text-line-strong">
                      تومان
                    </span>
                  </p>

                  <p className="mt-2 text-xs leading-6 text-line-strong">
                    مبلغ نهایی مطابق اطلاعات ثبت‌شده برای این سفارش است.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-line p-4">
              <div className="flex items-start gap-3">
                {isPaid ? (
                  <CheckCircle2
                    size={20}
                    className="mt-0.5 shrink-0 text-stock"
                  />
                ) : (
                  <Clock size={20} className="mt-0.5 shrink-0 text-gold" />
                )}

                <div>
                  <p className="font-bold text-ink">وضعیت پرداخت</p>
                  <p className="mt-1 text-sm leading-6 text-muted">
                    {isPaid
                      ? "پرداخت این سفارش با موفقیت ثبت شده است."
                      : "وضعیت پرداخت این سفارش هنوز پرداخت‌شده نیست."}
                  </p>
                </div>
              </div>
            </div>

            {/*
             * وقتی سفارش هنوز پرداخت نشده، «ادامه خرید» کاربر را به مرحلهٔ
             * پرداخت همین سفارش می‌برد تا خرید را کامل کند؛ در غیر این صورت
             * به فهرست محصولات می‌رود تا خرید تازه‌ای شروع شود.
             */}
            {isOutstandingPayment ? (
              <>
                <Link
                  to={`/payment/${encodeURIComponent(order.order_number)}`}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-brand-700 hover:shadow-md active:scale-[0.99]"
                >
                  <CreditCard size={18} />
                  ادامه خرید و پرداخت
                </Link>

                <p className="mt-2 text-center text-xs leading-6 text-muted">
                  این سفارش هنوز پرداخت نشده است؛ برای تکمیل خرید، مرحلهٔ
                  پرداخت را انجام دهید.
                </p>

                <Link
                  to="/products"
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-line px-4 py-2.5 text-xs font-bold text-ink-soft transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                >
                  <Truck size={16} />
                  مشاهدهٔ محصولات فروشگاه
                </Link>
              </>
            ) : (
              <Link
                to="/products"
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-line-strong px-4 py-3 text-sm font-bold text-ink transition hover:bg-cream"
              >
                <Truck size={18} />
                ادامه خرید
              </Link>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
