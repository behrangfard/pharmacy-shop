import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  ShoppingBag,
} from "lucide-react";

import Layout from "../components/Layout";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

type CheckoutForm = {
  firstName: string;
  lastName: string;
  phone: string;
  province: string;
  city: string;
  address: string;
  postalCode: string;
};

function Checkout() {
  const navigate = useNavigate();

  const { items, cartTotal } = useCart();
  const { user } = useAuth();

  const [form, setForm] = useState<CheckoutForm>({
    firstName: "",
    lastName: "",
    phone: "",
    province: "",
    city: "",
    address: "",
    postalCode: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const cartOriginalTotal = useMemo(() => {
    return items.reduce(
      (total, item) =>
        total +
        (item.originalPrice ?? item.price) *
          item.quantity,
      0
    );
  }, [items]);

  const cartDiscount = Math.max(
    0,
    cartOriginalTotal - cartTotal
  );

  const handleChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");

    if (!user) {
      navigate("/login");
      return;
    }

    if (items.length === 0) {
      setError("سبد خرید شما خالی است.");
      return;
    }

    if (
      !form.firstName.trim() ||
      !form.lastName.trim() ||
      !form.phone.trim() ||
      !form.province.trim() ||
      !form.city.trim() ||
      !form.address.trim()
    ) {
      setError(
        "لطفاً تمام اطلاعات ضروری را وارد کنید."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/orders", {
        recipient_name: `${form.firstName.trim()} ${form.lastName.trim()}`,
        phone: form.phone.trim(),
        address: `${form.province.trim()}، ${form.city.trim()}، ${form.address.trim()}`,
        postal_code:
          form.postalCode.trim() || null,
        notes: null,

        // قیمت را از فرانت‌اند ارسال نمی‌کنیم.
        // Backend قیمت و تخفیف واقعی را محاسبه می‌کند.
        items: items.map((item) => ({
          product_id: item.id,
          quantity: item.quantity,
        })),
      });

      const orderNumber =
        response?.data?.data?.order_number;

      if (!orderNumber) {
        setError(
          "سفارش ایجاد شد اما شماره سفارش دریافت نشد."
        );
        return;
      }

      navigate(`/payment/${orderNumber}`);
    } catch (error: any) {
      console.error(
        "Checkout error:",
        error
      );

      if (
        error?.response?.status === 401
      ) {
        navigate("/login");
        return;
      }

      if (
        error?.response?.status === 422
      ) {
        const errors =
          error?.response?.data?.errors;

        if (
          errors &&
          typeof errors === "object"
        ) {
          const firstKey =
            Object.keys(errors)[0];

          const firstMessage =
            errors[firstKey];

          if (
            Array.isArray(firstMessage) &&
            firstMessage.length > 0
          ) {
            setError(
              String(firstMessage[0])
            );
          } else {
            setError(
              "اطلاعات واردشده معتبر نیست."
            );
          }
        } else {
          setError(
            error?.response?.data?.message ||
              "اطلاعات سفارش معتبر نیست."
          );
        }

        return;
      }

      setError(
        error?.response?.data?.message ||
          "ثبت سفارش با خطا مواجه شد. لطفاً دوباره تلاش کنید."
      );
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="text-center">
            <ShoppingBag className="w-16 h-16 mx-auto text-gray-300 mb-4" />

            <h1 className="text-2xl font-bold text-gray-800 mb-3">
              سبد خرید شما خالی است
            </h1>

            <p className="text-gray-500 mb-6">
              برای ادامه خرید، ابتدا محصولی به سبد خرید اضافه کنید.
            </p>

            <Link
              to="/products"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition"
            >
              مشاهده محصولات
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-8">
          <Link
            to="/"
            className="hover:text-blue-600"
          >
            خانه
          </Link>

          <span>/</span>

          <Link
            to="/cart"
            className="hover:text-blue-600"
          >
            سبد خرید
          </Link>

          <span>/</span>

          <span className="text-gray-800">
            تکمیل سفارش
          </span>
        </div>

        <h1 className="text-3xl font-bold text-gray-800 mb-8">
          تکمیل سفارش
        </h1>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* اطلاعات گیرنده */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-6">
                  اطلاعات گیرنده
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* نام */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      نام
                    </label>

                    <input
                      type="text"
                      name="firstName"
                      value={form.firstName}
                      onChange={handleChange}
                      placeholder="نام"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* نام خانوادگی */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      نام خانوادگی
                    </label>

                    <input
                      type="text"
                      name="lastName"
                      value={form.lastName}
                      onChange={handleChange}
                      placeholder="نام خانوادگی"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* موبایل */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      شماره موبایل
                    </label>

                    <input
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="09xxxxxxxxx"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* استان */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      استان
                    </label>

                    <input
                      type="text"
                      name="province"
                      value={form.province}
                      onChange={handleChange}
                      placeholder="استان"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* شهر */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      شهر
                    </label>

                    <input
                      type="text"
                      name="city"
                      value={form.city}
                      onChange={handleChange}
                      placeholder="شهر"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* کد پستی */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      کد پستی
                    </label>

                    <input
                      type="text"
                      name="postalCode"
                      value={form.postalCode}
                      onChange={handleChange}
                      placeholder="کد پستی"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* آدرس */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      آدرس کامل
                    </label>

                    <textarea
                      name="address"
                      value={form.address}
                      onChange={handleChange}
                      rows={4}
                      placeholder="آدرس کامل محل تحویل..."
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                </div>

                {/* خطا */}
                {error && (
                  <div className="mt-6 rounded-xl bg-red-50 border border-red-100 text-red-700 px-4 py-3 text-sm">
                    {error}
                  </div>
                )}
              </div>
            </div>

            {/* خلاصه سفارش */}
            <div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-6">
                <h2 className="text-xl font-bold text-gray-800 mb-6">
                  خلاصه سفارش
                </h2>

                <div className="space-y-5 mb-6">
                  {items.map((item) => {
                    const originalPrice =
                      item.originalPrice ??
                      item.price;

                    const discountPercent =
                      item.discountPercent ?? 0;

                    const itemTotal =
                      item.price *
                      item.quantity;

                    return (
                      <div
                        key={item.id}
                        className="border-b border-gray-100 pb-4 last:border-0 last:pb-0"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-800">
                              {item.name}
                            </p>

                            <p className="text-xs text-gray-500 mt-1">
                              تعداد:{" "}
                              {item.quantity.toLocaleString(
                                "fa-IR"
                              )}
                            </p>
                          </div>

                          <div className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                            {itemTotal.toLocaleString(
                              "fa-IR"
                            )}{" "}
                            تومان
                          </div>
                        </div>

                        {discountPercent > 0 &&
                          originalPrice >
                            item.price && (
                            <div className="mt-2 flex items-center gap-2">
                              <span className="text-xs text-gray-400 line-through">
                                {originalPrice.toLocaleString(
                                  "fa-IR"
                                )}{" "}
                                تومان
                              </span>

                              <span className="text-xs font-bold text-red-500">
                                {discountPercent.toLocaleString(
                                  "fa-IR"
                                )}
                                ٪ تخفیف
                              </span>
                            </div>
                          )}
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-gray-100 pt-5 space-y-4">
                  <div className="flex items-center justify-between text-gray-600">
                    <span>
                      مبلغ کالاها
                    </span>

                    <span>
                      {cartOriginalTotal.toLocaleString(
                        "fa-IR"
                      )}{" "}
                      تومان
                    </span>
                  </div>

                  {cartDiscount > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">
                        تخفیف
                      </span>

                      <span className="text-red-500 font-medium">
                        -{" "}
                        {cartDiscount.toLocaleString(
                          "fa-IR"
                        )}{" "}
                        تومان
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-gray-600">
                    <span>
                      هزینه ارسال
                    </span>

                    <span className="text-green-600 font-medium">
                      رایگان
                    </span>
                  </div>

                  <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
                    <span className="font-bold text-gray-800">
                      مبلغ قابل پرداخت
                    </span>

                    <span className="text-xl font-bold text-blue-600">
                      {Number(
                        cartTotal
                      ).toLocaleString(
                        "fa-IR"
                      )}{" "}
                      تومان
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-6 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      در حال ثبت سفارش...
                    </>
                  ) : (
                    <>
                      ادامه و پرداخت
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>

                <Link
                  to="/cart"
                  className="w-full mt-3 flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
                >
                  بازگشت به سبد خرید
                </Link>

                <div className="mt-5 flex items-start gap-3 text-xs text-gray-500 bg-gray-50 rounded-xl p-4">
                  <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />

                  <p>
                    پس از ثبت سفارش، به صفحه پرداخت آزمایشی منتقل خواهید شد.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
}

export default Checkout;