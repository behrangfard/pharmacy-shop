import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  MapPin,
  Phone,
  User,
  Mail,
  ShoppingBag,
  CreditCard,
  Loader2,
  ChevronLeft,
  ShieldCheck,
  Truck,
  AlertCircle,
} from "lucide-react";

import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import api from "../services/api";

function Checkout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, cartTotal } = useCart();

  const [firstName, setFirstName] = useState(user?.name ?? "");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [vatEnabled, setVatEnabled] = useState(false);
  const [vatPercent, setVatPercent] = useState(0);

  useEffect(() => {
    let active = true;

    const loadTaxSettings = async () => {
      try {
        const response = await api.get("/store-settings/tax");
        const settings = response.data?.data;

        if (active && settings) {
          setVatEnabled(settings.vat_enabled === true);
          setVatPercent(
            Math.min(Math.max(Number(settings.vat_percent) || 0, 0), 100),
          );
        }
      } catch (error) {
        console.error("Failed to load tax settings:", error);
      }
    };

    void loadTaxSettings();

    return () => {
      active = false;
    };
  }, []);

  const formatPrice = (value: string | number) => {
    const numericValue = Number(value);

    if (Number.isNaN(numericValue)) {
      return "۰";
    }

    return numericValue.toLocaleString("fa-IR");
  };

  const shippingCost = 0;

  const cartOriginalTotal = useMemo(() => {
    return items.reduce((total, item) => {
      const originalPrice = item.originalPrice ?? item.price;
      return total + originalPrice * item.quantity;
    }, 0);
  }, [items]);

  const cartDiscount = useMemo(() => {
    return Math.max(0, cartOriginalTotal - Number(cartTotal ?? 0));
  }, [cartOriginalTotal, cartTotal]);

  const taxableAmount = Math.max(0, Number(cartTotal ?? 0) + shippingCost);

  const taxAmount = useMemo(() => {
    return vatEnabled ? Math.round(taxableAmount * vatPercent) / 100 : 0;
  }, [taxableAmount, vatEnabled, vatPercent]);

  const finalTotal = useMemo(() => {
    return taxableAmount + taxAmount;
  }, [taxableAmount, taxAmount]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (items.length === 0) {
      setError("سبد خرید شما خالی است.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const orderItems = items.map((item: any) => ({
        product_id: item.product_id ?? item.product?.id ?? item.id,
        quantity: Number(item.quantity),
      }));

      const fullAddress = [province, city, address].filter(Boolean).join("، ");

      const response = await api.post("/orders", {
        recipient_name: `${firstName} ${lastName}`.trim(),
        phone,
        address: fullAddress,
        postal_code: postalCode,
        notes: null,
        items: orderItems,
      });

      const order =
        response.data?.data ?? response.data?.order ?? response.data;

      const orderNumber = order?.order_number ?? response.data?.order_number;

      if (!orderNumber) {
        throw new Error("شماره سفارش دریافت نشد.");
      }

      navigate(`/payment/${orderNumber}`);
    } catch (error: any) {
      console.error("Checkout error:", error);

      const responseErrors = error?.response?.data?.errors;

      if (responseErrors) {
        const firstError = Object.values(responseErrors)
          .flat()
          .find((message) => typeof message === "string");

        setError(
          typeof firstError === "string"
            ? firstError
            : "اطلاعات واردشده صحیح نیست.",
        );
      } else {
        setError(
          error?.response?.data?.message ??
            "ثبت سفارش با خطا مواجه شد. لطفاً دوباره تلاش کنید.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <Layout>
        <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
          <Link
            to="/cart"
            className="inline-flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-purple-600"
          >
            <ArrowRight size={17} />
            بازگشت به سبد خرید
          </Link>

          <div className="mt-6 rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-sm sm:p-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-50 text-purple-600">
              <ShoppingBag size={30} />
            </div>

            <h1 className="mt-5 text-2xl font-black text-slate-900">
              سبد خرید شما خالی است
            </h1>

            <p className="mt-2 text-slate-500">
              برای ادامه خرید، ابتدا محصولی به سبد خرید اضافه کنید.
            </p>

            <Link
              to="/products"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-6 py-3 font-bold text-white transition-colors hover:bg-purple-700"
            >
              مشاهده محصولات
              <ChevronLeft size={18} />
            </Link>
          </div>
        </main>
      </Layout>
    );
  }

  return (
    <Layout>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8">
          <Link
            to="/cart"
            className="inline-flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-purple-600"
          >
            <ArrowRight size={17} />
            بازگشت به سبد خرید
          </Link>

          <h1 className="mt-5 text-2xl font-black text-slate-900 sm:text-3xl">
            تکمیل سفارش
          </h1>

          <p className="mt-2 text-slate-500">
            اطلاعات ارسال سفارش خود را وارد کنید.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-7">
              <div className="mb-7 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                  <MapPin size={24} />
                </div>

                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    اطلاعات گیرنده
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    اطلاعات لازم برای ارسال سفارش
                  </p>
                </div>
              </div>

              {error && (
                <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600">
                  <AlertCircle size={19} className="mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    نام
                  </label>

                  <div className="relative">
                    <User
                      size={18}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="text"
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                      required
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-11 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    نام خانوادگی
                  </label>

                  <div className="relative">
                    <User
                      size={18}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="text"
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                      required
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-11 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    شماره موبایل
                  </label>

                  <div className="relative">
                    <Phone
                      size={18}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      required
                      dir="ltr"
                      placeholder="09123456789"
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-11 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    استان
                  </label>
                  <input
                    type="text"
                    value={province}
                    onChange={(event) => setProvince(event.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    شهر
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    آدرس کامل
                  </label>
                  <textarea
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    required
                    rows={4}
                    className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                    placeholder="آدرس دقیق محل تحویل سفارش"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    کد پستی
                  </label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(event) => setPostalCode(event.target.value)}
                    required
                    maxLength={10}
                    dir="ltr"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                  />
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-green-600">
                  <Truck size={24} />
                </div>

                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    روش ارسال
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    ارسال سفارش برای شما
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-purple-200 bg-purple-50 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-black text-purple-900">ارسال معمولی</p>
                    <p className="mt-1 text-sm text-purple-700">
                      ارسال سفارش به آدرس ثبت‌شده
                    </p>
                  </div>

                  <div className="text-sm font-black text-green-600">
                    رایگان
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6 lg:sticky lg:top-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                  <ShoppingBag size={22} />
                </div>

                <div>
                  <h2 className="text-lg font-black">خلاصه سفارش</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {items.length.toLocaleString("fa-IR")} محصول
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-slate-500">مبلغ کالاها</span>
                  <span className="font-bold text-slate-800">
                    {formatPrice(cartOriginalTotal)} تومان
                  </span>
                </div>

                {cartDiscount > 0 && (
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-slate-500">تخفیف</span>
                    <span className="font-bold text-green-600">
                      - {formatPrice(cartDiscount)} تومان
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-slate-500">هزینه ارسال</span>
                  <span className="font-bold text-green-600">رایگان</span>
                </div>

                {vatEnabled && (
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-slate-500">
                      ارزش افزوده ({formatPrice(vatPercent)}٪)
                    </span>
                    <span className="font-bold text-slate-800">
                      {formatPrice(taxAmount)} تومان
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-5 border-t border-slate-100 pt-5">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs text-slate-400">مبلغ نهایی</p>
                    <p className="mt-1 text-2xl font-black text-purple-700">
                      {formatPrice(finalTotal)}
                    </p>
                  </div>
                  <span className="mb-1 text-sm text-slate-500">تومان</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-3.5 font-black text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 size={19} className="animate-spin" />
                    در حال ثبت سفارش...
                  </>
                ) : (
                  <>
                    <CreditCard size={19} />
                    ادامه و پرداخت
                  </>
                )}
              </button>

              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
                <ShieldCheck size={15} />
                اطلاعات شما با امنیت کامل ثبت می‌شود.
              </div>
            </section>

            <Link
              to="/cart"
              className="block rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:border-purple-100 hover:bg-purple-50"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-slate-600">
                  بازگشت و ویرایش سبد خرید
                </span>
                <ChevronLeft
                  size={18}
                  className="text-slate-400 transition-colors hover:text-purple-600"
                />
              </div>
            </Link>
          </div>
        </form>
      </main>
    </Layout>
  );
}

export default Checkout;
