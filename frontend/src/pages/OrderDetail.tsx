import { useEffect, useState } from "react";

import { Link, useParams } from "react-router-dom";

import {
  ArrowRight,
  Package,
  Loader2,
  CalendarDays,
  CreditCard,
  Truck,
  Clock3,
  CheckCircle2,
  XCircle,
  MapPin,
  Phone,
  User,
  Tag,
  ShoppingBag,
  ChevronLeft,
  ReceiptText,
} from "lucide-react";

import Layout from "../components/Layout";

import api from "../services/api";

type ProductImage = {
  id: number;
  path: string;
  alt?: string | null;
  sort_order?: number;
  is_primary?: boolean;
};

type Product = {
  id: number;
  name: string;
  slug: string;
  thumbnail?: string | null;
  images?: ProductImage[];
};

type OrderItem = {
  id: number;
  product_id: number;
  product_name: string;
  sku?: string | null;
  quantity: number;
  unit_price: string | number;
  total_price: string | number;
  product?: Product | null;
};

type Order = {
  id: number;
  order_number: string;
  subtotal: string | number;
  shipping_cost: string | number;
  discount: string | number;
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

type OrderResponse = {
  data?: Order;
  order?: Order;
};

function OrderDetail() {
  const { orderNumber } = useParams<{ orderNumber: string }>();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelMessage, setCancelMessage] = useState("");
  const [cancelError, setCancelError] = useState("");

  useEffect(() => {
    if (!orderNumber) {
      setError("شماره سفارش نامعتبر است.");
      setLoading(false);
      return;
    }

    const loadOrder = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await api.get(`/orders/${orderNumber}`);

        const responseData = response.data as OrderResponse | Order;

        const data =
          (responseData as OrderResponse)?.data ??
          (responseData as OrderResponse)?.order ??
          responseData;

        if (!data || !("order_number" in data)) {
          setError("اطلاعات سفارش پیدا نشد.");
          return;
        }

        setOrder(data as Order);
      } catch (requestError) {
        console.error("Order detail error:", requestError);
        setError("دریافت اطلاعات سفارش با خطا مواجه شد.");
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

  const formatDate = (value: string) => {
    return new Date(value).toLocaleDateString("fa-IR");
  };

  const formatDateTime = (value: string) => {
    return new Date(value).toLocaleString("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStorageUrl = (path?: string | null) => {
    if (!path) {
      return null;
    }

    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }

    const cleanPath = path.replace(/^\/+/, "");

    return `http://127.0.0.1:8000/storage/${cleanPath}`;
  };

  const getProductImage = (item: OrderItem) => {
    if (item.product?.thumbnail) {
      return getStorageUrl(item.product.thumbnail);
    }

    const images = item.product?.images ?? [];

    if (images.length === 0) {
      return null;
    }

    const primaryImage = images.find((image) => image.is_primary);

    const selectedImage =
      primaryImage ??
      [...images].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0];

    return getStorageUrl(selectedImage?.path);
  };

  const getOrderStatus = (status: string) => {
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
        return "لغو شده";

      default:
        return status;
    }
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

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "pending":
        return {
          wrapper: "bg-amber-50 text-amber-700 border-amber-100",
          icon: Clock3,
        };

      case "processing":
        return {
          wrapper: "bg-blue-50 text-blue-700 border-blue-100",
          icon: Package,
        };

      case "shipped":
        return {
          wrapper: "bg-indigo-50 text-indigo-700 border-indigo-100",
          icon: Truck,
        };

      case "delivered":
        return {
          wrapper: "bg-green-50 text-green-700 border-green-100",
          icon: CheckCircle2,
        };

      case "cancelled":
        return {
          wrapper: "bg-red-50 text-red-700 border-red-100",
          icon: XCircle,
        };

      default:
        return {
          wrapper: "bg-slate-50 text-slate-600 border-slate-100",
          icon: Package,
        };
    }
  };

  const getPaymentStyle = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-50 text-green-700 border-green-100";

      case "failed":
        return "bg-red-50 text-red-700 border-red-100";

      case "refunded":
        return "bg-purple-50 text-purple-700 border-purple-100";

      default:
        return "bg-slate-50 text-slate-600 border-slate-100";
    }
  };

  const canCancelOrder = (status: string) => {
    return status === "pending";
  };

  const canPayOrder = (currentOrder: Order) => {
    return (
      currentOrder.payment_status !== "paid" &&
      currentOrder.status !== "cancelled"
    );
  };

  const handleCancelOrder = async () => {
    if (!order) {
      return;
    }

    const confirmed = window.confirm(
      "آیا مطمئن هستید که می‌خواهید این سفارش را لغو کنید؟",
    );

    if (!confirmed) {
      return;
    }

    setCancelLoading(true);
    setCancelMessage("");
    setCancelError("");

    try {
      const response = await api.post(`/orders/${order.order_number}/cancel`);

      const updatedOrder = response.data?.data ?? response.data?.order ?? null;

      if (updatedOrder) {
        setOrder(updatedOrder);
      } else {
        setOrder({
          ...order,
          status: "cancelled",
        });
      }

      setCancelMessage("سفارش با موفقیت لغو شد.");
    } catch (requestError: any) {
      console.error("Cancel order error:", requestError);

      setCancelError(
        requestError?.response?.data?.message ??
          "لغو سفارش انجام نشد. لطفاً دوباره تلاش کنید.",
      );
    } finally {
      setCancelLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-10 text-center">
            <Loader2 size={38} className="mx-auto animate-spin text-blue-600" />

            <p className="mt-5 text-slate-500">
              در حال دریافت اطلاعات سفارش...
            </p>
          </div>
        </main>
      </Layout>
    );
  }

  if (error || !order) {
    return (
      <Layout>
        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 sm:p-10 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-red-50 text-red-500 flex items-center justify-center">
              <XCircle size={30} />
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-5">
              سفارش پیدا نشد
            </h1>

            <p className="text-slate-500 mt-2">
              {error || "اطلاعات این سفارش در دسترس نیست."}
            </p>

            <Link
              to="/account"
              className="inline-flex items-center gap-2 mt-6 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition"
            >
              <ArrowRight size={18} />
              بازگشت به حساب کاربری
            </Link>
          </div>
        </main>
      </Layout>
    );
  }

  const statusStyle = getStatusStyle(order.status);
  const StatusIcon = statusStyle.icon;

  const subtotal = Number(order.subtotal ?? 0);
  const discount = Number(order.discount ?? 0);
  const shippingCost = Number(order.shipping_cost ?? 0);
  const total = Number(order.total ?? 0);

  const itemCount =
    order.items?.reduce((sum, item) => sum + Number(item.quantity), 0) ?? 0;

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

          <div className="mt-5 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
            <div>
              <p className="text-sm text-slate-400">جزئیات سفارش</p>

              <h1
                className="text-2xl sm:text-3xl font-black text-slate-900 mt-2"
                dir="ltr"
              >
                {order.order_number}
              </h1>

              <p className="text-slate-500 mt-2">
                ثبت شده در {formatDateTime(order.created_at)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold ${statusStyle.wrapper}`}
              >
                <StatusIcon size={14} />
                {getOrderStatus(order.status)}
              </span>

              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold ${getPaymentStyle(
                  order.payment_status,
                )}`}
              >
                <CreditCard size={13} />
                {getPaymentStatus(order.payment_status)}
              </span>
            </div>
          </div>
        </div>

        {cancelMessage && (
          <div className="mb-6 bg-green-50 text-green-700 rounded-2xl border border-green-100 p-4 text-sm font-bold">
            {cancelMessage}
          </div>
        )}

        {cancelError && (
          <div className="mb-6 bg-red-50 text-red-600 rounded-2xl border border-red-100 p-4 text-sm font-bold">
            {cancelError}
          </div>
        )}

        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 sm:p-7">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Package size={24} />
              </div>

              <div>
                <h2 className="text-xl font-black text-slate-900">
                  اقلام سفارش
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  {itemCount.toLocaleString("fa-IR")} کالا در این سفارش
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {order.items.map((item) => {
                const imageUrl = getProductImage(item);
                const unitPrice = Number(item.unit_price ?? 0);
                const itemTotal = Number(item.total_price ?? 0);

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 sm:p-5 hover:border-blue-200 hover:bg-blue-50/30 transition"
                  >
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white border border-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={
                              item.product?.name ??
                              item.product_name ??
                              "محصول سفارش"
                            }
                            className="w-full h-full object-contain p-2"
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <Package size={30} className="text-slate-300" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                          <div className="min-w-0">
                            {item.product?.slug ? (
                              <Link
                                to={`/product/${item.product.slug}`}
                                className="font-black text-slate-900 hover:text-blue-600 transition-colors"
                              >
                                {item.product.name}
                              </Link>
                            ) : (
                              <p className="font-black text-slate-900">
                                {item.product_name}
                              </p>
                            )}

                            {item.sku && (
                              <p
                                className="text-xs text-slate-400 mt-2"
                                dir="ltr"
                              >
                                SKU: {item.sku}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 px-3 py-1.5 text-xs font-bold">
                              <ShoppingBag size={13} />
                              تعداد:{" "}
                              {Number(item.quantity).toLocaleString("fa-IR")}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
                          <div className="rounded-xl bg-white border border-slate-100 p-4">
                            <p className="text-xs text-slate-400 mb-1">
                              نهایی قیمت واحد
                            </p>

                            <p
                              className="font-bold text-slate-700 whitespace-nowrap"
                              dir="ltr"
                            >
                              {formatPrice(unitPrice)} تومان
                            </p>
                          </div>

                          <div className="rounded-xl bg-white border border-slate-100 p-4">
                            <p className="text-xs text-slate-400 mb-1">
                              مجموع این کالا
                            </p>

                            <p
                              className="font-black text-blue-700 whitespace-nowrap"
                              dir="ltr"
                            >
                              {formatPrice(itemTotal)} تومان
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 sm:p-7">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <User size={24} />
                </div>

                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    اطلاعات گیرنده
                  </h2>

                  <p className="text-sm text-slate-500 mt-1">
                    اطلاعات ارسال سفارش
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0">
                    <User size={18} className="text-slate-500" />
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">نام گیرنده</p>

                    <p className="font-bold text-slate-800 mt-1">
                      {order.recipient_name}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0">
                    <Phone size={18} className="text-slate-500" />
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">شماره تماس</p>

                    <p className="font-bold text-slate-800 mt-1" dir="ltr">
                      {order.phone}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0">
                    <MapPin size={18} className="text-slate-500" />
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">آدرس</p>

                    <p className="font-bold text-slate-800 mt-1 leading-7">
                      {order.address}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0">
                    <ReceiptText size={18} className="text-slate-500" />
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">کد پستی</p>

                    <p className="font-bold text-slate-800 mt-1" dir="ltr">
                      {order.postal_code}
                    </p>
                  </div>
                </div>

                {order.notes && (
                  <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4">
                    <p className="text-xs text-amber-600 font-bold mb-2">
                      توضیحات سفارش
                    </p>

                    <p className="text-sm text-amber-800 leading-6">
                      {order.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 sm:p-7">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <CreditCard size={24} />
                </div>

                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    خلاصه پرداخت
                  </h2>

                  <p className="text-sm text-slate-500 mt-1">
                    جزئیات مبلغ سفارش
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div
                  className="rounded-xl bg-slate-50 border border-slate-100 p-4"
                  style={{
                    direction: "ltr",
                    textAlign: "left",
                  }}
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-slate-500">مبلغ کالاها</span>

                    <span className="font-bold text-slate-800 whitespace-nowrap">
                      {formatPrice(subtotal)} تومان
                    </span>
                  </div>
                </div>

                {discount > 0 && (
                  <div
                    className="rounded-xl bg-red-50 border border-red-100 p-4"
                    style={{
                      direction: "ltr",
                      textAlign: "left",
                    }}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="flex items-center gap-1.5 text-sm text-red-500">
                        <Tag size={14} />
                        تخفیف
                      </span>

                      <span className="font-black text-red-600 whitespace-nowrap">
                        - {formatPrice(discount)} تومان
                      </span>
                    </div>
                  </div>
                )}

                <div
                  className="rounded-xl bg-slate-50 border border-slate-100 p-4"
                  style={{
                    direction: "ltr",
                    textAlign: "left",
                  }}
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-slate-500">هزینه ارسال</span>

                    <span className="font-bold text-slate-800 whitespace-nowrap">
                      {shippingCost === 0
                        ? "رایگان"
                        : `${formatPrice(shippingCost)} تومان`}
                    </span>
                  </div>
                </div>

                <div
                  className="rounded-xl bg-blue-50 border border-blue-100 p-5 mt-4"
                  style={{
                    direction: "ltr",
                    textAlign: "left",
                  }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <p className="text-xs text-blue-500 mb-1">
                        مبلغ نهایی سفارش
                      </p>

                      <p className="text-2xl font-black text-blue-700 whitespace-nowrap">
                        {formatPrice(total)} تومان
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 text-sm text-slate-500">
                      <CreditCard size={16} />
                      {getPaymentStatus(order.payment_status)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 sm:p-7">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center">
                    <CalendarDays size={24} />
                  </div>

                  <div>
                    <h2 className="text-xl font-black text-slate-900">
                      وضعیت سفارش
                    </h2>

                    <p className="text-sm text-slate-500 mt-1">
                      وضعیت فعلی سفارش شما
                    </p>
                  </div>
                </div>
              </div>

              <div
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold ${statusStyle.wrapper}`}
              >
                <StatusIcon size={17} />
                {getOrderStatus(order.status)}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div
                className={`rounded-2xl border p-4 ${
                  order.status === "pending"
                    ? "bg-amber-50 border-amber-100"
                    : "bg-slate-50 border-slate-100"
                }`}
              >
                <Clock3
                  size={20}
                  className={
                    order.status === "pending"
                      ? "text-amber-600"
                      : "text-slate-400"
                  }
                />

                <p className="text-xs text-slate-400 mt-3">ثبت سفارش</p>

                <p className="font-bold text-slate-800 mt-1 text-sm">
                  انجام شده
                </p>
              </div>

              <div
                className={`rounded-2xl border p-4 ${
                  order.status === "processing"
                    ? "bg-blue-50 border-blue-100"
                    : "bg-slate-50 border-slate-100"
                }`}
              >
                <Package
                  size={20}
                  className={
                    order.status === "processing"
                      ? "text-blue-600"
                      : "text-slate-400"
                  }
                />

                <p className="text-xs text-slate-400 mt-3">پردازش</p>

                <p className="font-bold text-slate-800 mt-1 text-sm">
                  {order.status === "processing" ? "در حال انجام" : "در انتظار"}
                </p>
              </div>

              <div
                className={`rounded-2xl border p-4 ${
                  order.status === "shipped"
                    ? "bg-indigo-50 border-indigo-100"
                    : "bg-slate-50 border-slate-100"
                }`}
              >
                <Truck
                  size={20}
                  className={
                    order.status === "shipped"
                      ? "text-indigo-600"
                      : "text-slate-400"
                  }
                />

                <p className="text-xs text-slate-400 mt-3">ارسال</p>

                <p className="font-bold text-slate-800 mt-1 text-sm">
                  {order.status === "shipped" ? "ارسال شده" : "در انتظار"}
                </p>
              </div>

              <div
                className={`rounded-2xl border p-4 ${
                  order.status === "delivered"
                    ? "bg-green-50 border-green-100"
                    : "bg-slate-50 border-slate-100"
                }`}
              >
                <CheckCircle2
                  size={20}
                  className={
                    order.status === "delivered"
                      ? "text-green-600"
                      : "text-slate-400"
                  }
                />

                <p className="text-xs text-slate-400 mt-3">تحویل</p>

                <p className="font-bold text-slate-800 mt-1 text-sm">
                  {order.status === "delivered" ? "تحویل شده" : "در انتظار"}
                </p>
              </div>
            </div>
          </div>

          {canPayOrder(order) && (
            <div className="bg-blue-50 rounded-3xl border border-blue-100 p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="font-black text-blue-700">پرداخت سفارش</h3>

                  <p className="text-sm text-blue-600 mt-1 leading-6">
                    این سفارش هنوز پرداخت نشده است. برای تکمیل سفارش، پرداخت را
                    انجام دهید.
                  </p>
                </div>

                <Link
                  to={`/payment/${order.order_number}`}
                  className="inline-flex w-full sm:w-[180px] h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 text-white px-5 font-bold hover:bg-blue-700 transition flex-shrink-0"
                >
                  <CreditCard size={18} />
                  پرداخت سفارش
                </Link>
              </div>
            </div>
          )}

          {canCancelOrder(order.status) && (
            <div className="bg-red-50 rounded-3xl border border-red-100 p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="font-black text-red-700">لغو سفارش</h3>

                  <p className="text-sm text-red-600 mt-1 leading-6">
                    اگر دیگر به این سفارش نیاز ندارید، می‌توانید آن را لغو کنید.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCancelOrder}
                  disabled={cancelLoading}
                  className="inline-flex w-full sm:w-[180px] h-12 items-center justify-center gap-2 rounded-xl bg-red-600 text-white px-5 font-bold hover:bg-red-700 transition disabled:opacity-60 flex-shrink-0"
                >
                  {cancelLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      در حال لغو...
                    </>
                  ) : (
                    <>
                      <XCircle size={18} />
                      لغو سفارش
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          <Link
            to="/account"
            className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-600 hover:bg-blue-50 hover:border-blue-100 hover:text-blue-600 transition"
          >
            <span>بازگشت به سفارش‌های من</span>
            <ChevronLeft size={18} />
          </Link>
        </div>
      </main>
    </Layout>
  );
}

export default OrderDetail;
