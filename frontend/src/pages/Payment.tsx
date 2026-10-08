import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  CreditCard,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ShoppingBag,
  Clock3,
  ChevronLeft,
  ReceiptText,
} from "lucide-react";

import Layout from "../components/Layout";
import { useCart } from "../context/CartContext";
import api from "../services/api";

type OrderData = {
  id?: number;
  order_number: string;
  subtotal: string | number;
  shipping_cost: string | number;
  discount: string | number;
  total: string | number;
  payment_status: string;
  status: string;
};

function Payment() {
  const { orderNumber } = useParams();
  const navigate = useNavigate();
  const { clearCart } = useCart();

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orderNumber) {
      setError("شماره سفارش مشخص نیست.");
      setLoading(false);
      return;
    }

    const loadOrder = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await api.get(`/orders/${orderNumber}`);

        const data =
          response.data?.data ?? response.data?.order ?? response.data;

        setOrder(data);
      } catch (error: any) {
        console.error("Payment order error:", error);

        setError(
          error?.response?.data?.message ??
            "دریافت اطلاعات سفارش با خطا مواجه شد.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [orderNumber]);

  const formatPrice = (value: string | number) => {
    const numericValue = Number(value);

    if (Number.isNaN(numericValue)) {
      return "۰";
    }

    return numericValue.toLocaleString("fa-IR");
  };

  const getPaymentStatus = (status: string) => {
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
  };

  const handlePayment = async () => {
    if (!orderNumber) {
      return;
    }

    setPaying(true);
    setError("");

    try {
      await api.post(`/orders/${orderNumber}/pay`);

      clearCart();

      navigate(`/account/orders/${orderNumber}`);
    } catch (error: any) {
      console.error("Payment error:", error);

      setError(
        error?.response?.data?.message ??
          "پرداخت سفارش با خطا مواجه شد. لطفاً دوباره تلاش کنید.",
      );
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-10 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Loader2 size={28} className="animate-spin" />
            </div>

            <h1 className="text-xl font-black text-slate-900 mt-5">
              در حال دریافت اطلاعات سفارش
            </h1>

            <p className="text-slate-500 mt-2">لطفاً چند لحظه صبر کنید...</p>
          </div>
        </main>
      </Layout>
    );
  }

  if (error && !order) {
    return (
      <Layout>
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <Link
            to="/account"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition-colors"
          >
            <ArrowRight size={17} />
            بازگشت به حساب کاربری
          </Link>

          <div className="mt-6 bg-white rounded-3xl border border-red-100 shadow-sm p-8 sm:p-10 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
              <AlertCircle size={30} />
            </div>

            <h1 className="text-2xl font-black text-slate-900 mt-5">
              خطا در دریافت سفارش
            </h1>

            <p className="text-red-600 mt-3 font-bold">{error}</p>

            <Link
              to="/account"
              className="inline-flex items-center justify-center gap-2 mt-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 font-bold transition"
            >
              مشاهده سفارش‌ها
              <ChevronLeft size={18} />
            </Link>
          </div>
        </main>
      </Layout>
    );
  }

  if (!order) {
    return null;
  }

  const subtotal = Number(order.subtotal ?? 0);
  const shippingCost = Number(order.shipping_cost ?? 0);
  const discount = Number(order.discount ?? 0);
  const total = Number(order.total ?? 0);

  const alreadyPaid = order.payment_status === "paid";

  return (
    <Layout>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-8">
          <Link
            to="/account"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition-colors"
          >
            <ArrowRight size={17} />
            بازگشت به حساب کاربری
          </Link>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-5">
            پرداخت سفارش
          </h1>

          <p className="text-slate-500 mt-2">تکمیل پرداخت و ثبت نهایی سفارش</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 sm:p-7">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 pb-6 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <ReceiptText size={27} />
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">شماره سفارش</p>

                    <p className="font-black text-blue-600 mt-1" dir="ltr">
                      {order.order_number}
                    </p>
                  </div>
                </div>

                <div
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-full border text-xs font-bold ${
                    alreadyPaid
                      ? "bg-green-50 text-green-700 border-green-100"
                      : "bg-amber-50 text-amber-700 border-amber-100"
                  }`}
                >
                  {alreadyPaid ? (
                    <CheckCircle2 size={15} />
                  ) : (
                    <Clock3 size={15} />
                  )}

                  {getPaymentStatus(order.payment_status)}
                </div>
              </div>

              {error && (
                <div className="mt-5 flex items-start gap-3 rounded-xl bg-red-50 border border-red-100 text-red-600 p-4 text-sm font-bold">
                  <AlertCircle size={19} className="flex-shrink-0 mt-0.5" />

                  <span>{error}</span>
                </div>
              )}

              {alreadyPaid ? (
                <div className="mt-7 rounded-2xl bg-green-50 border border-green-100 p-6 text-center">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-green-100 text-green-600 flex items-center justify-center">
                    <CheckCircle2 size={30} />
                  </div>

                  <h2 className="text-xl font-black text-green-800 mt-4">
                    این سفارش قبلاً پرداخت شده است
                  </h2>

                  <p className="text-sm text-green-700 mt-2">
                    پرداخت این سفارش با موفقیت انجام شده است.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/account/orders/${order.order_number}`)
                    }
                    className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 hover:bg-green-700 text-white px-6 py-3 font-bold transition"
                  >
                    مشاهده جزئیات سفارش
                    <ChevronLeft size={18} />
                  </button>
                </div>
              ) : (
                <div className="mt-7">
                  <div className="rounded-2xl bg-blue-50 border border-blue-100 p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 rounded-xl bg-white text-blue-600 flex items-center justify-center flex-shrink-0">
                        <CreditCard size={22} />
                      </div>

                      <div>
                        <h2 className="font-black text-blue-900">
                          پرداخت آنلاین
                        </h2>

                        <p className="text-sm text-blue-700 mt-1 leading-6">
                          برای تکمیل سفارش، مبلغ نهایی را پرداخت کنید.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 grid sm:grid-cols-3 gap-3">
                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
                      <p className="text-xs text-slate-400">مبلغ کالاها</p>

                      <p className="font-bold text-slate-800 mt-1">
                        {formatPrice(subtotal)}
                      </p>

                      <p className="text-xs text-slate-400 mt-1">تومان</p>
                    </div>

                    <div className="rounded-xl bg-red-50 border border-red-100 p-4">
                      <p className="text-xs text-red-500">تخفیف</p>

                      <p className="font-bold text-red-600 mt-1">
                        {discount > 0
                          ? `- ${formatPrice(discount)}`
                          : "بدون تخفیف"}
                      </p>

                      <p className="text-xs text-red-400 mt-1">تومان</p>
                    </div>

                    <div className="rounded-xl bg-green-50 border border-green-100 p-4">
                      <p className="text-xs text-green-600">هزینه ارسال</p>

                      <p className="font-bold text-green-700 mt-1">
                        {shippingCost === 0
                          ? "رایگان"
                          : formatPrice(shippingCost)}
                      </p>

                      {shippingCost > 0 && (
                        <p className="text-xs text-green-500 mt-1">تومان</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 sm:p-7">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center">
                  <ShoppingBag size={22} />
                </div>

                <div>
                  <h2 className="text-lg font-black">اطلاعات پرداخت</h2>

                  <p className="text-sm text-slate-500 mt-1">
                    پرداخت امن سفارش از طریق درگاه
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-sm text-slate-600 leading-7">
                <p>
                  پس از انتخاب گزینه پرداخت، سفارش شما به‌عنوان پرداخت‌شده ثبت
                  خواهد شد.
                </p>

                <p>اطلاعات سفارش شما در حساب کاربری قابل مشاهده خواهد بود.</p>
              </div>

              <div className="mt-5 flex items-center gap-2 text-xs text-slate-400">
                <ShieldCheck size={16} />
                پرداخت امن و ثبت اطلاعات سفارش
              </div>
            </section>
          </div>

          <div>
            <section className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 sm:p-6 lg:sticky lg:top-6">
              <div className="flex items-center gap-3 pb-5 border-b border-slate-100">
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <CreditCard size={22} />
                </div>

                <div>
                  <h2 className="font-black text-lg">خلاصه پرداخت</h2>

                  <p className="text-xs text-slate-500 mt-1">
                    مبلغ قابل پرداخت
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-slate-500">مبلغ کالاها</span>

                  <span className="font-bold text-slate-800">
                    {formatPrice(subtotal)}
                  </span>
                </div>

                {discount > 0 && (
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-red-500">تخفیف</span>

                    <span className="font-bold text-red-600">
                      - {formatPrice(discount)}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-slate-500">ارسال</span>

                  <span className="font-bold text-green-600">
                    {shippingCost === 0 ? "رایگان" : formatPrice(shippingCost)}
                  </span>
                </div>
              </div>

              <div className="mt-5 pt-5 border-t border-slate-100">
                <div
                  className="rounded-xl bg-blue-50 border border-blue-100 p-4"
                  style={{
                    direction: "ltr",
                    textAlign: "left",
                  }}
                >
                  <p className="text-xs text-blue-500">مبلغ نهایی</p>

                  <p className="text-2xl font-black text-blue-700 mt-1 whitespace-nowrap">
                    {formatPrice(total)}
                  </p>

                  <p className="text-xs text-blue-500 mt-1">تومان</p>
                </div>
              </div>

              {!alreadyPaid && (
                <button
                  type="button"
                  onClick={handlePayment}
                  disabled={paying}
                  className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white py-3.5 font-black transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {paying ? (
                    <>
                      <Loader2 size={19} className="animate-spin" />
                      در حال پرداخت...
                    </>
                  ) : (
                    <>
                      <CreditCard size={19} />
                      پرداخت {formatPrice(total)} تومان
                    </>
                  )}
                </button>
              )}

              <Link
                to="/account"
                className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 font-bold transition"
              >
                بازگشت به حساب کاربری
                <ArrowRight size={17} />
              </Link>
            </section>
          </div>
        </div>
      </main>
    </Layout>
  );
}

export default Payment;
