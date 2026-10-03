import { useEffect, useState } from "react";

import { Link, useParams } from "react-router-dom";

import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Package,
  Truck,
  XCircle,
} from "lucide-react";

import Layout from "../components/Layout";
import Button from "../components/Button";
import api from "../services/api";

interface ProductImage {
  id: number;
  path: string;
  alt?: string | null;
}

interface Product {
  id: number;
  name: string;
  slug: string;
  price: number;
  images?: ProductImage[];
}

interface OrderItem {
  id: number;
  product_id: number;
  product_name: string;
  sku?: string | null;
  quantity: number;
  unit_price: number | string;
  total_price: number | string;
  product?: Product;
}

interface Order {
  id: number;
  order_number: string;
  subtotal: number | string;
  shipping_cost: number | string;
  discount: number | string;
  total: number | string;
  status: string;
  payment_status: string;
  recipient_name: string;
  phone: string;
  address: string;
  postal_code?: string | null;
  notes?: string | null;
  created_at: string;
  items: OrderItem[];
}

interface OrderResponse {
  success: boolean;
  message?: string;
  data?: Order;
}

export default function OrderDetail() {
  const { orderNumber } = useParams<{
    orderNumber: string;
  }>();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");
  const [cancelMessage, setCancelMessage] = useState("");

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
        setError("");
      } else {
        setError("اطلاعات سفارش پیدا نشد.");
      }
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setError("برای مشاهده سفارش ابتدا وارد حساب کاربری شوید.");
      } else if (err?.response?.status === 404) {
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

  useEffect(() => {
    fetchOrder();
  }, [orderNumber]);

  const formatPrice = (price: number | string | null | undefined) => {
    const numericPrice = Number(price ?? 0);

    if (Number.isNaN(numericPrice)) {
      return "۰ تومان";
    }

    return `${numericPrice.toLocaleString("fa-IR")} تومان`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "در انتظار بررسی";

      case "processing":
        return "در حال پردازش";

      case "shipped":
        return "ارسال شده";

      case "delivered":
        return "تحویل داده شده";

      case "cancelled":
        return "لغو شده";

      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock3 className="w-5 h-5" />;

      case "processing":
        return <Package className="w-5 h-5" />;

      case "shipped":
        return <Truck className="w-5 h-5" />;

      case "delivered":
        return <CheckCircle2 className="w-5 h-5" />;

      case "cancelled":
        return <XCircle className="w-5 h-5" />;

      default:
        return <Package className="w-5 h-5" />;
    }
  };

  const getPaymentLabel = (status: string) => {
    switch (status) {
      case "paid":
        return "پرداخت شده";

      case "unpaid":
        return "پرداخت نشده";

      case "failed":
        return "پرداخت ناموفق";

      case "refunded":
        return "مبلغ بازپرداخت شده";

      default:
        return status;
    }
  };

  const canCancelOrder =
    order !== null &&
    order.payment_status === "unpaid" &&
    !["shipped", "delivered", "cancelled"].includes(order.status);

  const handleCancelOrder = async () => {
    if (!orderNumber || !order || !canCancelOrder || cancelling) {
      return;
    }

    const confirmed = window.confirm(
      "آیا مطمئن هستید که می‌خواهید این سفارش را لغو کنید؟",
    );

    if (!confirmed) {
      return;
    }

    setCancelling(true);
    setCancelMessage("");
    setError("");

    try {
      const response = await api.post<OrderResponse>(
        `/orders/${orderNumber}/cancel`,
      );

      if (response.data?.success) {
        setCancelMessage(response.data.message || "سفارش با موفقیت لغو شد.");

        if (response.data.data) {
          setOrder(response.data.data);
        } else {
          await fetchOrder();
        }
      } else {
        setError(response.data?.message || "لغو سفارش انجام نشد.");
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "خطایی هنگام لغو سفارش رخ داد.");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="flex items-center gap-3 text-gray-600">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />

            <span>در حال دریافت اطلاعات سفارش...</span>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !order) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center transition-all duration-300 hover:shadow-md">
            <div className="transition-transform duration-200 hover:scale-110">
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            </div>

            <h1 className="text-xl font-bold text-gray-900 mb-3">
              سفارش پیدا نشد
            </h1>

            <p className="text-gray-600 mb-6">
              {error || "امکان دریافت اطلاعات سفارش وجود ندارد."}
            </p>

            <Button
              type="button"
              variant="primary"
              size="md"
              icon={<ArrowRight size={18} />}
              onClick={() => window.location.assign("/account")}
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
      <div className="bg-gray-50 min-h-screen py-8 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <Link
                to="/account"
                className="inline-flex items-center gap-2 text-gray-500 hover:text-blue-600 mb-3 transition-all duration-150 hover:gap-3 active:scale-95"
              >
                <ArrowRight className="w-4 h-4" />
                بازگشت به سفارش‌ها
              </Link>

              <h1 className="text-2xl font-bold text-gray-900">جزئیات سفارش</h1>

              <p className="text-gray-500 mt-1">سفارش {order.order_number}</p>
            </div>

            <div className="text-sm text-gray-500">
              تاریخ ثبت: {formatDate(order.created_at)}
            </div>
          </div>

          {/* Messages */}
          {cancelMessage && (
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 mb-6 animate-pulse">
              {cancelMessage}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-6 animate-pulse">
              {error}
            </div>
          )}

          {/* Status */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6 transition-all duration-300 hover:shadow-md">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-4 bg-gray-50 rounded-xl p-4 transition-all duration-200 hover:bg-gray-100 hover:shadow-sm hover:-translate-y-0.5">
                <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center transition-transform duration-200 hover:scale-110">
                  {getStatusIcon(order.status)}
                </div>

                <div>
                  <p className="text-sm text-gray-500">وضعیت سفارش</p>

                  <p className="font-bold text-gray-900 mt-1">
                    {getStatusLabel(order.status)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-gray-50 rounded-xl p-4 transition-all duration-200 hover:bg-gray-100 hover:shadow-sm hover:-translate-y-0.5">
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition-transform duration-200 hover:scale-110 ${
                    order.payment_status === "paid"
                      ? "bg-green-100 text-green-600"
                      : "bg-yellow-100 text-yellow-600"
                  }`}
                >
                  {order.payment_status === "paid" ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <Clock3 className="w-5 h-5" />
                  )}
                </div>

                <div>
                  <p className="text-sm text-gray-500">وضعیت پرداخت</p>

                  <p className="font-bold text-gray-900 mt-1">
                    {getPaymentLabel(order.payment_status)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Products */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 transition-all duration-300 hover:shadow-md">
              <h2 className="text-lg font-bold text-gray-900 mb-5">
                محصولات سفارش
              </h2>

              <div className="space-y-4">
                {order.items?.map((item) => {
                  const imagePath = item.product?.images?.[0]?.path;

                  const imageUrl = imagePath
                    ? imagePath.startsWith("http")
                      ? imagePath
                      : `http://127.0.0.1:8000/storage/${imagePath.replace(
                          /^\/+/,
                          "",
                        )}`
                    : null;

                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 border-b border-gray-100 pb-4 last:border-0 last:pb-0 rounded-xl p-2 -m-2 transition-all duration-200 hover:bg-gray-50 hover:shadow-sm"
                    >
                      <div className="w-20 h-20 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={
                              item.product?.images?.[0]?.alt ||
                              item.product?.name ||
                              item.product_name ||
                              "محصول"
                            }
                            className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                            onError={(event) => {
                              console.error("IMAGE LOAD ERROR:", imageUrl);

                              event.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <Package className="w-8 h-8" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate transition-colors duration-200 hover:text-blue-600">
                          {item.product?.name || item.product_name || "محصول"}
                        </h3>

                        <p className="text-sm text-gray-500 mt-1">
                          تعداد: {item.quantity}
                        </p>

                        <p className="text-sm text-gray-500">
                          قیمت واحد: {formatPrice(item.unit_price)}
                        </p>
                      </div>

                      <div className="font-bold text-gray-900 whitespace-nowrap transition-transform duration-200 hover:scale-105">
                        {formatPrice(item.total_price)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-fit transition-all duration-300 hover:shadow-md">
              <h2 className="text-lg font-bold text-gray-900 mb-5">
                خلاصه سفارش
              </h2>

              <div className="space-y-4 text-sm">
                <div className="flex justify-between transition-transform duration-150 hover:translate-x-[-2px]">
                  <span className="text-gray-500">مبلغ کالاها</span>

                  <span className="font-medium">
                    {formatPrice(order.subtotal)}
                  </span>
                </div>

                <div className="flex justify-between transition-transform duration-150 hover:translate-x-[-2px]">
                  <span className="text-gray-500">هزینه ارسال</span>

                  <span className="font-medium">
                    {formatPrice(order.shipping_cost)}
                  </span>
                </div>

                {Number(order.discount) > 0 && (
                  <div className="flex justify-between text-green-600 transition-transform duration-150 hover:translate-x-[-2px]">
                    <span>تخفیف</span>

                    <span>- {formatPrice(order.discount)}</span>
                  </div>
                )}

                <div className="border-t border-gray-100 pt-4 flex justify-between items-center">
                  <span className="font-bold text-gray-900">مبلغ نهایی</span>

                  <span className="text-xl font-bold text-blue-600 transition-transform duration-200 hover:scale-105">
                    {formatPrice(order.total)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Receiver Information */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mt-6 transition-all duration-300 hover:shadow-md">
            <h2 className="text-lg font-bold text-gray-900 mb-5">
              اطلاعات گیرنده
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="transition-transform duration-150 hover:translate-x-[-2px]">
                <p className="text-sm text-gray-500 mb-1">نام گیرنده</p>

                <p className="font-medium text-gray-900">
                  {order.recipient_name}
                </p>
              </div>

              <div className="transition-transform duration-150 hover:translate-x-[-2px]">
                <p className="text-sm text-gray-500 mb-1">شماره تماس</p>

                <p className="font-medium text-gray-900">{order.phone}</p>
              </div>

              {order.postal_code && (
                <div className="transition-transform duration-150 hover:translate-x-[-2px]">
                  <p className="text-sm text-gray-500 mb-1">کد پستی</p>

                  <p className="font-medium text-gray-900">
                    {order.postal_code}
                  </p>
                </div>
              )}

              <div className="md:col-span-2 transition-transform duration-150 hover:translate-x-[-2px]">
                <p className="text-sm text-gray-500 mb-1">آدرس</p>

                <p className="font-medium text-gray-900 leading-7">
                  {order.address}
                </p>
              </div>

              {order.notes && (
                <div className="md:col-span-2 transition-transform duration-150 hover:translate-x-[-2px]">
                  <p className="text-sm text-gray-500 mb-1">توضیحات سفارش</p>

                  <p className="font-medium text-gray-900 leading-7">
                    {order.notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <Button
              type="button"
              variant="outline"
              size="md"
              fullWidth
              icon={<ArrowRight size={19} />}
              onClick={() => window.location.assign("/account")}
            >
              سفارش‌های من
            </Button>

            {canCancelOrder && (
              <Button
                type="button"
                onClick={handleCancelOrder}
                disabled={cancelling}
                loading={cancelling}
                variant="danger"
                size="md"
                fullWidth
                icon={!cancelling ? <XCircle size={19} /> : undefined}
              >
                {cancelling ? "در حال لغو سفارش..." : "لغو سفارش"}
              </Button>
            )}

            <Button
              type="button"
              variant="primary"
              size="md"
              fullWidth
              onClick={() => window.location.assign("/products")}
            >
              ادامه خرید
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
