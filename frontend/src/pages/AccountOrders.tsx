import { useEffect, useState } from "react";

import { Link } from "react-router-dom";

import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  CreditCard,
  Loader2,
  Package,
  RefreshCw,
  XCircle,
} from "lucide-react";

import Layout from "../components/Layout";
import { usePrivatePageMeta } from "../hooks/usePageMeta";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import {
  canCancelCustomerOrder,
  canContinuePayment,
  formatOrderDate,
  formatOrderPrice,
  orderItemCount,
  orderStatusLabel,
  orderStatusStyle,
  orderThumbnail,
  paymentStatusLabel,
  paymentStatusStyle,
  type OrderSummary,
} from "../utils/orderDisplay";

/**
 * صفحهٔ «سفارش‌های من» (`/account/orders`).
 *
 * این بخش قبلاً پایینِ صفحهٔ `/account` بود؛ چون صفحهٔ حساب را طولانی می‌کرد،
 * به صفحهٔ مستقل منتقل شد. کارت‌ها در دو ستون (از `md` به بالا) چیده می‌شوند
 * تا فهرست بلند بدون اسکرول زیاد دیده شود؛ در موبایل تک‌ستونه‌اند.
 *
 * لغو سفارش همان قاعدهٔ سرور را رعایت می‌کند (`canCancelCustomerOrder`) و
 * «ادامهٔ پرداخت» فقط برای سفارش آنلاین پرداخت‌نشده نمایش داده می‌شود.
 */
function AccountOrders() {
  usePrivatePageMeta("سفارش‌های من", "/account/orders");

  const { user } = useAuth();

  const [orders, setOrders] = useState<OrderSummary[]>([]);

  const [ordersLoading, setOrdersLoading] = useState(true);

  const [ordersError, setOrdersError] = useState("");

  const [cancellingOrderNumber, setCancellingOrderNumber] = useState<
    string | null
  >(null);

  // با هر بار «تلاش دوباره» افکت دوباره اجرا می‌شود.
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!user) {
      return;
    }

    let cancelled = false;

    const loadOrders = async () => {
      setOrdersLoading(true);
      setOrdersError("");

      try {
        const response = await api.get("/orders");

        const data =
          response.data?.data ?? response.data?.orders ?? response.data ?? [];

        if (!cancelled) {
          setOrders(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Orders error:", error);

        if (!cancelled) {
          setOrdersError("دریافت سفارش‌ها با خطا مواجه شد.");
        }
      } finally {
        if (!cancelled) {
          setOrdersLoading(false);
        }
      }
    };

    loadOrders();

    return () => {
      cancelled = true;
    };
  }, [user, reloadKey]);

  const handleCancelOrder = async (orderNumber: string) => {
    if (!window.confirm("آیا از لغو این سفارش اطمینان دارید؟")) {
      return;
    }

    setCancellingOrderNumber(orderNumber);

    try {
      await api.post(`/orders/${orderNumber}/cancel`);

      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.order_number === orderNumber
            ? { ...order, status: "cancelled" }
            : order,
        ),
      );

      window.alert("سفارش با موفقیت لغو شد.");
    } catch (error: any) {
      console.error("Cancel order error:", error);

      window.alert(
        error?.response?.data?.message ??
          "لغو سفارش انجام نشد. لطفاً دوباره تلاش کنید.",
      );
    } finally {
      setCancellingOrderNumber(null);
    }
  };

  if (!user) {
    return (
      <Layout>
        <main className="max-w-4xl mx-auto px-6 py-16">
          <div className="bg-white rounded-3xl border border-line shadow-sm p-10 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <Package size={30} />
            </div>

            <h1 className="text-2xl font-black mt-5">ورود به حساب کاربری</h1>

            <p className="text-muted mt-2">
              برای مشاهدهٔ سفارش‌ها، ابتدا وارد شوید.
            </p>

            <Link
              to="/login"
              className="inline-flex mt-6 bg-brand-600 text-white px-6 py-3 rounded-xl font-bold"
            >
              ورود به حساب
            </Link>
          </div>
        </main>
      </Layout>
    );
  }

  return (
    <Layout>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <Link
          to="/account"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-brand-600 transition-colors"
        >
          <ArrowRight size={17} />
          بازگشت به حساب کاربری
        </Link>

        <div className="mt-5 mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-ink">
              سفارش‌های من
            </h1>

            <p className="text-muted mt-2">
              تاریخچهٔ خریدها؛ برای جزئیات، فاکتور یا پیگیری، روی هر سفارش
              بزنید.
            </p>
          </div>

          {!ordersLoading && !ordersError && orders.length > 0 && (
            <span className="inline-flex items-center gap-2 self-start rounded-full bg-brand-50 px-3.5 py-1.5 text-sm font-black text-brand-600 sm:self-auto">
              <Package size={16} aria-hidden="true" />
              {orders.length.toLocaleString("fa-IR")} سفارش
            </span>
          )}
        </div>

        {ordersLoading && (
          <div className="py-16 text-center">
            <Loader2
              size={32}
              className="mx-auto animate-spin text-brand-600"
              aria-hidden="true"
            />

            <p className="mt-4 text-muted">در حال دریافت سفارش‌ها...</p>
          </div>
        )}

        {!ordersLoading && ordersError && (
          <div className="rounded-2xl border border-blush-100 bg-blush-50 p-6 text-center">
            <p className="text-discount">{ordersError}</p>

            <button
              type="button"
              onClick={() => setReloadKey((key) => key + 1)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-ink-soft transition hover:bg-cream"
            >
              <RefreshCw size={16} aria-hidden="true" />
              تلاش دوباره
            </button>
          </div>
        )}

        {!ordersLoading && !ordersError && orders.length === 0 && (
          <div className="rounded-3xl border border-line bg-white p-10 text-center shadow-sm">
            <Package
              size={48}
              className="mx-auto text-line-strong"
              aria-hidden="true"
            />

            <h2 className="mt-4 font-black">هنوز سفارشی ثبت نکرده‌اید</h2>

            <p className="mt-2 text-sm text-muted">
              با انتخاب محصولات، اولین سفارش خود را ثبت کنید.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/products"
                className="inline-flex rounded-xl bg-brand-600 px-6 py-3 font-bold text-white transition hover:bg-brand-700"
              >
                مشاهده محصولات
              </Link>

              <Link
                to="/track-order"
                className="inline-flex rounded-xl border border-line px-6 py-3 font-bold text-ink-soft transition hover:bg-cream"
              >
                پیگیری سفارش مهمان
              </Link>
            </div>
          </div>
        )}

        {/* دو ستون از تبلت به بالا تا فهرست سفارش‌ها اسکرول زیادی نسازد. */}
        {!ordersLoading && !ordersError && orders.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                cancelling={cancellingOrderNumber === order.order_number}
                onCancel={handleCancelOrder}
              />
            ))}
          </div>
        )}
      </main>
    </Layout>
  );
}

type OrderCardProps = {
  order: OrderSummary;
  /** آیا درخواست لغو همین سفارش در جریان است؟ */
  cancelling: boolean;
  onCancel: (orderNumber: string) => void;
};

/**
 * کارت یک سفارش در فهرست «سفارش‌های من».
 *
 * برای اینکه در دو ستون هم جا شود، چیدمان فشرده است: تصویر کالا، شمارهٔ سفارش،
 * چیپ وضعیت، مبلغ نهایی، وضعیت پرداخت و یک ردیف اکشن (ادامهٔ پرداخت/لغو).
 */
function OrderCard({ order, cancelling, onCancel }: OrderCardProps) {
  const statusStyle = orderStatusStyle(order.status);

  const StatusIcon = statusStyle.icon;

  const orderImage = orderThumbnail(order);

  const itemCount = orderItemCount(order);

  const firstItem = order.items?.[0];

  const firstItemName =
    firstItem?.product?.name ?? firstItem?.product_name ?? "محصول سفارش";

  const extraItems = Math.max((order.items?.length ?? 0) - 1, 0);

  const total = Number(order.total ?? 0);

  const shippingCost = Number(order.shipping_cost ?? 0);

  const discount = Number(order.discount ?? 0);

  /* همان قواعدی که سرور برای ادامهٔ پرداخت و لغو سفارش بررسی می‌کند. */
  const canPay = canContinuePayment(order);

  const canCancel = canCancelCustomerOrder(order);

  return (
    <article className="relative flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-sm transition-shadow hover:shadow-md">
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 right-0 w-1.5 ${statusStyle.accent}`}
      />

      <Link
        to={`/account/orders/${order.order_number}`}
        className="group flex-1 p-4 pr-5"
      >
        <div className="flex items-start gap-3">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-line bg-cream">
            {orderImage ? (
              <img
                src={orderImage}
                alt={firstItemName}
                className="h-full w-full object-contain p-1"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-line-strong">
                <Package size={24} aria-hidden="true" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-black text-brand-600" dir="ltr">
                {order.order_number}
              </p>

              <span
                className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-bold ${statusStyle.wrapper}`}
              >
                <StatusIcon size={12} aria-hidden="true" />
                {orderStatusLabel(order.status)}
              </span>
            </div>

            <p className="mt-1 truncate text-sm text-muted">
              {firstItemName}
              {extraItems > 0 &&
                ` و ${extraItems.toLocaleString("fa-IR")} کالای دیگر`}
            </p>

            <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-soft">
              <CalendarDays size={13} aria-hidden="true" />
              {formatOrderDate(order.created_at)}

              <span aria-hidden="true">·</span>

              {itemCount.toLocaleString("fa-IR")} کالا
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-brand-100 bg-brand-50 px-3 py-2">
          <span className="text-[11px] text-brand-500">مبلغ نهایی</span>

          <span className="whitespace-nowrap text-sm font-black text-brand-700">
            {formatOrderPrice(total)} تومان
          </span>
        </div>

        <p className="mt-2 truncate text-[11px] text-muted-soft">
          {shippingCost === 0
            ? "ارسال رایگان"
            : `هزینهٔ ارسال: ${formatOrderPrice(shippingCost)} تومان`}

          {discount > 0 && ` · تخفیف: ${formatOrderPrice(discount)} تومان`}
        </p>

        <div className="mt-2 flex items-center justify-between gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-bold ${paymentStatusStyle(
              order.payment_status,
            )}`}
          >
            <CreditCard size={12} aria-hidden="true" />
            {paymentStatusLabel(order.payment_status)}
          </span>

          <span className="text-[11px] text-muted-soft">
            {order.payment_method === "cod" ? "پرداخت در محل" : "پرداخت آنلاین"}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5 text-xs font-bold text-muted transition-colors group-hover:text-brand-600">
          <span>مشاهده جزئیات سفارش</span>

          <ChevronLeft
            size={16}
            aria-hidden="true"
            className="transition-transform group-hover:-translate-x-1"
          />
        </div>
      </Link>

      {(canPay || canCancel) && (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-cream px-4 py-2.5">
          {canPay && (
            <Link
              to={`/payment/${encodeURIComponent(order.order_number)}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3 py-2 text-xs font-black text-white transition hover:bg-brand-700"
            >
              <CreditCard size={14} aria-hidden="true" />
              ادامهٔ پرداخت
            </Link>
          )}

          {canCancel && (
            <button
              type="button"
              onClick={() => onCancel(order.order_number)}
              disabled={cancelling}
              className="inline-flex items-center gap-1.5 rounded-xl border border-blush-200 px-3 py-2 text-xs font-bold text-discount transition hover:bg-blush-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cancelling ? (
                <Loader2
                  size={14}
                  className="animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <XCircle size={14} aria-hidden="true" />
              )}

              {cancelling ? "در حال لغو..." : "لغو سفارش"}
            </button>
          )}
        </div>
      )}
    </article>
  );
}

export default AccountOrders;
