import { useEffect, useState } from "react";

import { Link, useNavigate, useParams } from "react-router-dom";

import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Loader2,
  XCircle,
} from "lucide-react";

import Layout from "../components/Layout";

import Button from "../components/Button";

import api from "../services/api";

import { useCart } from "../context/CartContext";

interface OrderData {
  order_number: string;
  subtotal: number;
  shipping_cost: number;
  discount: number;
  total: number;
  payment_status: string;
  status: string;
}

interface OrderResponse {
  success: boolean;
  message?: string;
  data?: OrderData;
}

export default function Payment() {
  const { orderNumber } = useParams<{
    orderNumber: string;
  }>();

  const navigate = useNavigate();

  const { clearCart } = useCart();

  const [order, setOrder] = useState<OrderData | null>(null);

  const [loading, setLoading] = useState(true);

  const [paying, setPaying] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderNumber) {
        setError("شماره سفارش نامعتبر است.");
        setLoading(false);
        return;
      }

      try {
        const response = await api.get<OrderResponse>(`/orders/${orderNumber}`);

        if (response.data?.success && response.data.data) {
          setOrder(response.data.data);
        } else {
          setError("اطلاعات سفارش پیدا نشد.");
        }
      } catch (err: any) {
        if (err?.response?.status === 401) {
          navigate("/login");
          return;
        }

        if (err?.response?.status === 404) {
          setError("سفارش موردنظر پیدا نشد.");
        } else {
          setError(
            err?.response?.data?.message || "خطا در دریافت اطلاعات سفارش.",
          );
        }
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderNumber, navigate]);

  const handlePayment = async () => {
    if (!orderNumber) {
      setError("شماره سفارش نامعتبر است.");
      return;
    }

    if (paying) {
      return;
    }

    setPaying(true);

    setError("");

    try {
      const response = await api.post<OrderResponse>(
        `/orders/${orderNumber}/pay`,
      );

      if (!response.data?.success) {
        setError(response.data?.message || "پرداخت انجام نشد.");
        return;
      }

      clearCart();

      navigate(`/account/orders/${orderNumber}`);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        navigate("/login");
        return;
      }

      setError(err?.response?.data?.message || "خطایی هنگام پرداخت رخ داد.");
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="flex items-center gap-3 text-gray-600">
            <Loader2 className="w-6 h-6 animate-spin" />

            <span>در حال دریافت اطلاعات سفارش...</span>
          </div>
        </div>
      </Layout>
    );
  }

  if (error && !order) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center transition-all duration-200 hover:shadow-md">
            <div className="transition-transform duration-200 hover:scale-105">
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            </div>

            <h1 className="text-xl font-bold text-gray-900 mb-3">خطا</h1>

            <p className="text-gray-600 mb-6">{error}</p>

            <Button
              type="button"
              variant="primary"
              size="md"
              icon={<ArrowRight size={18} />}
              onClick={() => navigate("/account")}
            >
              بازگشت به حساب کاربری
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-[70vh] bg-gray-50 py-10 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-md">
            {/* Header */}

            <div className="bg-blue-600 text-white px-6 py-8 text-center">
              <div className="transition-transform duration-300 hover:scale-110">
                <CreditCard className="w-12 h-12 mx-auto mb-3" />
              </div>

              <h1 className="text-2xl font-bold mb-2">درگاه پرداخت آزمایشی</h1>

              <p className="text-blue-100">
                این صفحه برای تست فرآیند پرداخت فروشگاه است.
              </p>
            </div>

            <div className="p-6">
              {error && (
                <div className="mb-5 rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 animate-pulse">
                  {error}
                </div>
              )}

              {order && (
                <div className="space-y-5">
                  {/* Order Number */}

                  <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-4 transition-all duration-200 hover:px-1">
                    <span className="text-gray-500">شماره سفارش</span>

                    <span
                      className="font-bold text-gray-900 text-left"
                      style={{
                        direction: "ltr",
                        textAlign: "left",
                      }}
                    >
                      {order.order_number}
                    </span>
                  </div>

                  {/* Price Summary */}

                  <div className="bg-gray-50 rounded-xl p-5 space-y-4 transition-all duration-200 hover:bg-gray-100 hover:shadow-sm">
                    {/* مبلغ کالاها */}

                    <div className="flex items-center justify-between gap-4 text-sm transition-transform duration-150 hover:translate-x-[-2px]">
                      <span className="text-gray-500">مبلغ کالاها</span>

                      <span
                        className="font-medium text-gray-800 text-left whitespace-nowrap"
                        style={{
                          direction: "ltr",
                          textAlign: "left",
                        }}
                      >
                        {Number(order.subtotal).toLocaleString("fa-IR")} تومان
                      </span>
                    </div>

                    {/* هزینه ارسال */}

                    <div className="flex items-center justify-between gap-4 text-sm transition-transform duration-150 hover:translate-x-[-2px]">
                      <span className="text-gray-500">هزینه ارسال</span>

                      <span
                        className={`font-medium text-left whitespace-nowrap ${
                          Number(order.shipping_cost) === 0
                            ? "text-green-600"
                            : "text-gray-800"
                        }`}
                        style={{
                          direction: "ltr",
                          textAlign: "left",
                        }}
                      >
                        {Number(order.shipping_cost) === 0
                          ? "رایگان"
                          : `${Number(order.shipping_cost).toLocaleString(
                              "fa-IR",
                            )} تومان`}
                      </span>
                    </div>

                    {/* تخفیف */}

                    {Number(order.discount) > 0 && (
                      <div className="flex items-center justify-between gap-4 text-sm transition-transform duration-150 hover:translate-x-[-2px]">
                        <span className="text-gray-500">تخفیف</span>

                        <span
                          className="font-bold text-red-500 text-left whitespace-nowrap"
                          style={{
                            direction: "ltr",
                            textAlign: "left",
                          }}
                        >
                          - {Number(order.discount).toLocaleString("fa-IR")}{" "}
                          تومان
                        </span>
                      </div>
                    )}

                    {/* مبلغ نهایی */}

                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-bold text-gray-800">
                          مبلغ قابل پرداخت
                        </span>

                        <span
                          className="text-2xl font-black text-blue-600 text-left whitespace-nowrap transition-transform duration-200 hover:scale-105"
                          style={{
                            direction: "ltr",
                            textAlign: "left",
                          }}
                        >
                          {Number(order.total).toLocaleString("fa-IR")} تومان
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Payment */}

                  <div className="pt-2">
                    {order.payment_status === "paid" ? (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
                        <div className="transition-transform duration-300 hover:scale-110">
                          <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
                        </div>

                        <h2 className="font-bold text-green-700 mb-2">
                          این سفارش قبلاً پرداخت شده است
                        </h2>

                        <Link
                          to={`/account/orders/${order.order_number}`}
                          className="inline-flex items-center gap-2 mt-3 text-green-700 font-medium transition-all duration-150 hover:text-green-800 hover:gap-3 active:scale-95"
                        >
                          مشاهده جزئیات سفارش
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        onClick={handlePayment}
                        disabled={paying}
                        loading={paying}
                        variant="success"
                        size="lg"
                        fullWidth
                        icon={!paying ? <CheckCircle2 size={20} /> : undefined}
                      >
                        {paying
                          ? "در حال پردازش پرداخت..."
                          : `پرداخت ${Number(order.total).toLocaleString(
                              "fa-IR",
                            )} تومان`}
                      </Button>
                    )}
                  </div>

                  {/* Back */}

                  <div className="text-center pt-2">
                    <Link
                      to="/account"
                      className="inline-flex items-center justify-center text-gray-500 hover:text-gray-700 text-sm transition-all duration-150 hover:-translate-x-0.5 active:scale-95"
                    >
                      انصراف و بازگشت به حساب کاربری
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
