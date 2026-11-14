import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  Printer,
} from "lucide-react";

import api from "../services/api";
import { useStoreSettings } from "../hooks/useStoreSettings";
import { usePrivatePageMeta } from "../hooks/usePageMeta";
import { formatJalaliDateTime } from "../utils/jalali";
import { STORAGE_KEYS } from "../utils/storageKeys";

type OrderItem = {
  id: number;
  product_name?: string;
  variant_name?: string | null;
  color_name?: string | null;
  pack_colors?: { name?: string; color?: string }[] | null;
  sku?: string | null;
  quantity: number;
  unit_price?: string | number;
  total_price?: string | number;
  variant?: { name?: string; sku?: string | null } | null;
};

type Order = {
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
  payment_method?: string | null;
  paid_at?: string | null;
  recipient_name: string;
  phone: string;
  address: string;
  postal_code?: string | null;
  shipping_method?: string | null;
  tracking_code?: string | null;
  notes?: string | null;
  created_at: string;
  items: OrderItem[];
};

const formatPrice = (value: number) => new Intl.NumberFormat("fa-IR").format(value);

const toNumber = (value: string | number | null | undefined) => Number(value ?? 0) || 0;

const formatDate = (value?: string | null) => {
  if (!value) return "—";

  return formatJalaliDateTime(value, { withTime: true }) || value;
};

const orderStatusLabels: Record<string, string> = {
  pending: "در انتظار بررسی",
  processing: "در حال پردازش",
  shipped: "ارسال‌شده",
  delivered: "تحویل‌شده",
  completed: "تکمیل‌شده",
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

const paymentMethodLabels: Record<string, string> = {
  online: "پرداخت آنلاین",
  cod: "پرداخت در محل (هنگام تحویل)",
};

/**
 * فاکتور/رسید چاپی سفارش برای مشتری.
 *
 * این صفحه بدون هدر و فوتر سایت رندر می‌شود تا خروجی چاپ تمیز باشد. دکمهٔ
 * «چاپ / ذخیره PDF» از چاپ مرورگر استفاده می‌کند؛ در پنجرهٔ چاپ با انتخاب
 * مقصد «Save as PDF» فایل PDF هم گرفته می‌شود (بدون نیاز به کتابخانهٔ PDF).
 * اطلاعات مالیاتی (در صورت فعال بودن) و کد کالا برای انبار در همین فاکتور
 * می‌آید.
 */
function InvoiceView() {
  const { orderNumber = "" } = useParams();
  const settings = useStoreSettings();

  // مهمان هم با شناسهٔ پایدار مرورگر فاکتور سفارش خودش را می‌بیند.
  const isAuthenticated = Boolean(localStorage.getItem(STORAGE_KEYS.token));
  const backTarget = isAuthenticated
    ? `/account/orders/${encodeURIComponent(orderNumber)}`
    : `/track-order?order=${encodeURIComponent(orderNumber)}`;

  usePrivatePageMeta("فاکتور سفارش", "/account");

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    if (orderNumber.trim() === "") {
      setLoading(false);
      setError("شماره سفارش مشخص نیست.");
      return () => {
        active = false;
      };
    }

    setLoading(true);
    setError("");

    api
      .get(`/orders/${encodeURIComponent(orderNumber)}`)
      .then((response) => {
        if (!active) return;

        const payload = response.data?.data ?? response.data;
        const data = payload?.order ?? payload;

        if (!data?.order_number) {
          throw new Error("اطلاعات سفارش دریافت نشد.");
        }

        setOrder(data as Order);
      })
      .catch((err) => {
        if (!active) return;

        setError(
          err?.response?.status === 401
            ? "برای دیدن این فاکتور باید وارد حساب شوید یا از همان مرورگری استفاده کنید که سفارش را ثبت کرده‌اید."
            : err?.response?.data?.message ||
                err?.message ||
                "دریافت فاکتور ناموفق بود.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [orderNumber]);

  const printInvoice = () => window.print();

  const isCod = order?.payment_method === "cod";
  const isPaid = order?.payment_status === "paid";

  return (
    <div dir="rtl" className="min-h-screen bg-cream px-4 py-6">
      {/* نوار فرمان روی صفحه؛ در حالت چاپ پنهان می‌شود */}
      <div className="mx-auto mb-3 flex max-w-3xl flex-wrap items-center justify-between gap-3">
        <Link
          to={backTarget}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-700 transition-colors hover:text-brand-600"
        >
          <ArrowRight size={15} aria-hidden="true" />
          {isAuthenticated ? "بازگشت به سفارش" : "بازگشت به رهگیری سفارش"}
        </Link>

        <button
          type="button"
          onClick={printInvoice}
          disabled={!order}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Printer size={16} aria-hidden="true" />
          چاپ / ذخیره PDF
        </button>
      </div>

      <p className="mx-auto mb-4 max-w-3xl text-[11px] leading-6 text-muted">
        در پنجرهٔ چاپ، مقصد را «Save as PDF» انتخاب کنید تا نسخهٔ PDF فاکتور
        ذخیره شود.
      </p>

      {loading && (
        <div className="mx-auto max-w-3xl rounded-2xl border border-line bg-white p-8 text-center text-sm font-bold text-muted">
          در حال دریافت فاکتور...
        </div>
      )}

      {!loading && error && (
        <div
          role="alert"
          className="mx-auto max-w-3xl rounded-2xl border border-blush-100 bg-blush-50 p-6 text-center"
        >
          <FileText
            size={26}
            className="mx-auto mb-3 text-discount"
            aria-hidden="true"
          />
          <p className="text-sm font-bold text-discount">{error}</p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Link
              to="/login"
              className="rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-black text-white transition hover:bg-brand-700"
            >
              ورود به حساب کاربری
            </Link>
            <Link
              to={`/track-order?order=${encodeURIComponent(orderNumber)}`}
              className="rounded-xl border border-line px-4 py-2.5 text-xs font-bold text-ink-soft transition hover:bg-cream"
            >
              رهگیری سفارش
            </Link>
          </div>
        </div>
      )}

      {!loading && order && (
        <div id="invoice-print-area" className="invoice-print mx-auto max-w-3xl">
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <div>
              <h2>{settings.store_name}</h2>

              <p style={{ margin: 0, color: "#6b7280", fontSize: 12 }}>
                {settings.store_slogan}
              </p>

              {settings.store_address && (
                <p
                  style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 12 }}
                >
                  {settings.store_address}
                </p>
              )}
            </div>

            <div
              style={{
                marginInlineStart: "auto",
                color: "#4b5563",
                fontSize: 12,
                lineHeight: 2,
                textAlign: "left",
              }}
            >
              <div style={{ fontWeight: 800, color: "#111827", fontSize: 13 }}>
                فاکتور فروش / رسید سفارش
              </div>

              {settings.store_phone && (
                <div>
                  تلفن: <span dir="ltr">{settings.store_phone}</span>
                </div>
              )}

              {settings.store_email && (
                <div>
                  ایمیل: <span dir="ltr">{settings.store_email}</span>
                </div>
              )}
            </div>
          </div>

          <div className="invoice-print-meta">
            <span>
              شماره فاکتور: <strong dir="ltr">{order.order_number}</strong>
            </span>
            <span>تاریخ صدور: {formatDate(order.created_at)}</span>
            <span>
              وضعیت سفارش: {orderStatusLabels[order.status] ?? order.status}
            </span>
            <span>
              روش پرداخت:{" "}
              {paymentMethodLabels[order.payment_method ?? "online"]}
            </span>
            <span>
              وضعیت پرداخت:{" "}
              {paymentStatusLabels[order.payment_status] ?? order.payment_status}
              {isPaid && order.paid_at ? ` (${formatDate(order.paid_at)})` : ""}
            </span>
            {order.tracking_code && (
              <span>
                کد رهگیری: <span dir="ltr">{order.tracking_code}</span>
              </span>
            )}
          </div>

          <div className="invoice-print-meta">
            <span>گیرنده: {order.recipient_name}</span>
            <span>
              تلفن: <span dir="ltr">{order.phone}</span>
            </span>
            <span>نشانی: {order.address}</span>
            {order.postal_code && (
              <span>
                کد پستی: <span dir="ltr">{order.postal_code}</span>
              </span>
            )}
            {order.shipping_method && (
              <span>روش ارسال: {order.shipping_method}</span>
            )}
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>کد کالا</th>
                <th>شرح کالا</th>
                <th>تعداد</th>
                <th>قیمت واحد</th>
                <th>جمع</th>
              </tr>
            </thead>

            <tbody>
              {order.items?.map((item, index) => {
                const packColors =
                  Array.isArray(item.pack_colors) && item.pack_colors.length > 0
                    ? item.pack_colors
                        .map((entry) => `${entry.name}: ${entry.color}`)
                        .join(" · ")
                    : null;

                const description = [
                  item.product_name,
                  item.variant_name,
                  item.color_name ? `رنگ: ${item.color_name}` : null,
                  packColors,
                ]
                  .filter(Boolean)
                  .join(" — ");

                const unitPrice = toNumber(item.unit_price);
                const lineTotal =
                  toNumber(item.total_price) || unitPrice * item.quantity;

                return (
                  <tr key={item.id}>
                    <td>{index + 1}</td>
                    <td dir="ltr" style={{ textAlign: "right" }}>
                      {item.sku || item.variant?.sku || "—"}
                    </td>
                    <td>{description || "کالا"}</td>
                    <td>{formatPrice(item.quantity)}</td>
                    <td>{formatPrice(unitPrice)}</td>
                    <td>{formatPrice(lineTotal)}</td>
                  </tr>
                );
              })}

              {(!order.items || order.items.length === 0) && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center" }}>
                    کالایی برای این سفارش ثبت نشده است.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="invoice-print-totals">
            <span>
              جمع کالاها: {formatPrice(toNumber(order.subtotal))} تومان
            </span>

            {toNumber(order.discount) > 0 && (
              <span>
                تخفیف
                {order.coupon_code ? ` (${order.coupon_code})` : ""}: −{" "}
                {formatPrice(toNumber(order.discount))} تومان
              </span>
            )}

            <span>
              هزینهٔ ارسال:{" "}
              {toNumber(order.shipping_cost) === 0
                ? "رایگان"
                : `${formatPrice(toNumber(order.shipping_cost))} تومان`}
            </span>

            {toNumber(order.tax_amount) > 0 && (
              <span>
                مالیات ({formatPrice(toNumber(order.tax_percent))}٪):{" "}
                {formatPrice(toNumber(order.tax_amount))} تومان
              </span>
            )}

            <strong>
              مبلغ نهایی: {formatPrice(toNumber(order.total))} تومان
            </strong>

            {isCod && !isPaid && (
              <span style={{ color: "#96702c", fontWeight: 700 }}>
                مبلغ قابل پرداخت در محل:{" "}
                {formatPrice(toNumber(order.total))} تومان
              </span>
            )}
          </div>

          {order.notes && (
            <div style={{ marginTop: 12, fontSize: 12, color: "#4b5563" }}>
              <strong>یادداشت سفارش:</strong> {order.notes}
            </div>
          )}
          <div className="invoice-print-footer">
            <div>
              مهلت مرجوعی: تا {settings.return_policy_days} روز پس از تحویل،
              مطابق صفحهٔ «شرایط مرجوعی و بازگشت کالا» در سایت.
            </div>
            <div>
              این فاکتور به‌صورت خودکار توسط {settings.store_name} صادر شده
              است و برای پیگیری سفارش و امور مالیاتی معتبر است.
            </div>
            <div>
              پشتیبانی: {settings.store_phone}
              {settings.store_email ? ` — ${settings.store_email}` : ""}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 24,
                marginTop: 22,
                color: "#4b5563",
              }}
            >
              <span>امضای فروشنده</span>
              <span>مهر فروشگاه</span>
              <span>امضای گیرنده</span>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && !order && (
        <div className="mx-auto flex max-w-3xl items-center justify-center gap-2 rounded-2xl border border-line bg-white p-8 text-sm font-bold text-muted">
          {isPaid ? (
            <CheckCircle2 size={18} className="text-stock" aria-hidden="true" />
          ) : (
            <Clock size={18} className="text-gold" aria-hidden="true" />
          )}
          فاکتوری برای نمایش وجود ندارد.
        </div>
      )}
    </div>
  );
}

export default InvoiceView;
