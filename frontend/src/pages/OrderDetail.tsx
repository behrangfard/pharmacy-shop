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
  const { orderNumber } = useParams<{ orderNumber: string }>();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
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

        console.log("ORDER API:", response.data);

        if (response.data?.success && response.data.data) {
          setOrder(response.data.data);
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

  if (loading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
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
          <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />

            <h1 className="text-xl font-bold text-gray-900 mb-3">
              سفارش پیدا نشد
            </h1>

            <p className="text-gray-600 mb-6">
              {error || "امکان دریافت اطلاعات سفارش وجود ندارد."}
            </p>

            <Link
              to="/account"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition"
            >
              <ArrowRight className="w-5 h-5" />
              بازگشت به حساب کاربری
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-gray-50 min-h-screen py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <Link
                to="/account"
                className="inline-flex items-center gap-2 text-gray-500 hover:text-blue-600 mb-3"
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

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-4 bg-gray-50 rounded-xl p-4">
                <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                  {getStatusIcon(order.status)}
                </div>

                <div>
                  <p className="text-sm text-gray-500">وضعیت سفارش</p>

                  <p className="font-bold text-gray-900 mt-1">
                    {getStatusLabel(order.status)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-gray-50 rounded-xl p-4">
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center ${
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-5">
                محصولات سفارش
              </h2>

              <div className="space-y-4">
                {order.items?.map((item) => {
                  const imagePath = item.product?.images?.[0]?.path;

                  const imageUrl = imagePath
                    ? imagePath.startsWith("http")
                      ? imagePath
                      : `http://127.0.0.1:8000/storage/${imagePath}`
                    : null;

                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 border-b border-gray-100 pb-4 last:border-0 last:pb-0"
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
                            className="w-full h-full object-cover"
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
                        <h3 className="font-semibold text-gray-900 truncate">
                          {item.product?.name || item.product_name || "محصول"}
                        </h3>

                        <p className="text-sm text-gray-500 mt-1">
                          تعداد: {item.quantity}
                        </p>

                        <p className="text-sm text-gray-500">
                          قیمت واحد: {formatPrice(item.unit_price)}
                        </p>
                      </div>

                      <div className="font-bold text-gray-900 whitespace-nowrap">
                        {formatPrice(item.total_price)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-fit">
              <h2 className="text-lg font-bold text-gray-900 mb-5">
                خلاصه سفارش
              </h2>

              <div className="space-y-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">مبلغ کالاها</span>

                  <span className="font-medium">
                    {formatPrice(order.subtotal)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">هزینه ارسال</span>

                  <span className="font-medium">
                    {formatPrice(order.shipping_cost)}
                  </span>
                </div>

                {Number(order.discount) > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>تخفیف</span>

                    <span>- {formatPrice(order.discount)}</span>
                  </div>
                )}

                <div className="border-t border-gray-100 pt-4 flex justify-between items-center">
                  <span className="font-bold text-gray-900">مبلغ نهایی</span>

                  <span className="text-xl font-bold text-blue-600">
                    {formatPrice(order.total)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mt-6">
            <h2 className="text-lg font-bold text-gray-900 mb-5">
              اطلاعات گیرنده
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <p className="text-sm text-gray-500 mb-1">نام گیرنده</p>

                <p className="font-medium text-gray-900">
                  {order.recipient_name}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-1">شماره تماس</p>

                <p className="font-medium text-gray-900">{order.phone}</p>
              </div>

              {order.postal_code && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">کد پستی</p>

                  <p className="font-medium text-gray-900">
                    {order.postal_code}
                  </p>
                </div>
              )}

              <div className="md:col-span-2">
                <p className="text-sm text-gray-500 mb-1">آدرس</p>

                <p className="font-medium text-gray-900 leading-7">
                  {order.address}
                </p>
              </div>

              {order.notes && (
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-500 mb-1">توضیحات سفارش</p>

                  <p className="font-medium text-gray-900 leading-7">
                    {order.notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <Link
              to="/account"
              className="flex-1 inline-flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 font-medium py-3 rounded-xl hover:bg-gray-50 transition"
            >
              <ArrowRight className="w-5 h-5" />
              سفارش‌های من
            </Link>

            <Link
              to="/products"
              className="flex-1 inline-flex items-center justify-center bg-blue-600 text-white font-medium py-3 rounded-xl hover:bg-blue-700 transition"
            >
              ادامه خرید
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
