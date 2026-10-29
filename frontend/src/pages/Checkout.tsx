import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  MapPin,
  Phone,
  User,
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

const CHECKOUT_KEY_STORAGE = "checkout_idempotency_key";
const CHECKOUT_FINGERPRINT_STORAGE = "checkout_fingerprint";

type CheckoutItem = {
  product_id: number;
  quantity: number;
};

type CheckoutPayload = {
  recipient_name: string;
  phone: string;
  address: string;
  postal_code: string;
  notes: null;
  items: CheckoutItem[];
};

function Checkout() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { items, cartTotal, clearCart } = useCart();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submissionUncertain, setSubmissionUncertain] = useState(false);

  const submitLock = useRef(false);
  const idempotencyKeyRef = useRef<string | null>(null);
  const nameInitialized = useRef(false);

  const [vatEnabled, setVatEnabled] = useState(false);
  const [vatPercent, setVatPercent] = useState(0);

  // نام کاربر پس از بارگذاری اطلاعات حساب مقداردهی اولیه می‌شود.
  // اگر کاربر نام را خودش ویرایش کرده باشد، آن را بازنویسی نمی‌کنیم.
  useEffect(() => {
    if (authLoading || !user || nameInitialized.current) {
      return;
    }

    const fullName = typeof user.name === "string" ? user.name.trim() : "";

    if (fullName) {
      const parts = fullName.split(/\s+/);
      setFirstName(parts[0] ?? "");
      setLastName(parts.slice(1).join(" "));
    }

    nameInitialized.current = true;
  }, [authLoading, user]);

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

    if (!Number.isFinite(numericValue)) {
      return "۰";
    }

    return numericValue.toLocaleString("fa-IR");
  };

  const shippingCost = 0;

  const cartOriginalTotal = useMemo(() => {
    return items.reduce((total, item) => {
      const originalPrice = item.originalPrice ?? item.price;
      return total + Number(originalPrice) * item.quantity;
    }, 0);
  }, [items]);

  const cartDiscount = useMemo(() => {
    return Math.max(0, cartOriginalTotal - Number(cartTotal ?? 0));
  }, [cartOriginalTotal, cartTotal]);

  const taxableAmount = useMemo(() => {
    const taxableProductsTotal = items.reduce((total, item) => {
      if (item.is_taxable !== true) return total;

      return total + Number(item.price) * Number(item.quantity);
    }, 0);

    return Math.max(0, taxableProductsTotal + shippingCost);
  }, [items, shippingCost]);

  const taxAmount = useMemo(() => {
    return vatEnabled ? Math.round((taxableAmount * vatPercent) / 100) : 0;
  }, [taxableAmount, vatEnabled, vatPercent]);

  const finalTotal = useMemo(() => {
    return Math.max(0, Number(cartTotal ?? 0) + shippingCost + taxAmount);
  }, [cartTotal, shippingCost, taxAmount]);

  const getCheckoutFingerprint = (payload: CheckoutPayload) => {
    const normalizedItems = [...payload.items].sort(
      (a, b) => a.product_id - b.product_id,
    );

    return JSON.stringify({
      userId: user?.id ?? null,
      recipient_name: payload.recipient_name,
      phone: payload.phone,
      address: payload.address,
      postal_code: payload.postal_code,
      notes: payload.notes,
      items: normalizedItems,
    });
  };

  const getIdempotencyKey = (fingerprint: string) => {
    const savedFingerprint = sessionStorage.getItem(
      CHECKOUT_FINGERPRINT_STORAGE,
    );
    const savedKey = sessionStorage.getItem(CHECKOUT_KEY_STORAGE);

    if (savedFingerprint === fingerprint && savedKey) {
      idempotencyKeyRef.current = savedKey;
      return savedKey;
    }

    if (!globalThis.crypto?.randomUUID) {
      throw new Error("مرورگر شما از ساخت کلید امن درخواست پشتیبانی نمی‌کند.");
    }

    const newKey = globalThis.crypto.randomUUID();

    sessionStorage.setItem(CHECKOUT_FINGERPRINT_STORAGE, fingerprint);
    sessionStorage.setItem(CHECKOUT_KEY_STORAGE, newKey);
    idempotencyKeyRef.current = newKey;

    return newKey;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (authLoading) {
      setError("لطفاً تا بررسی وضعیت حساب کاربری صبر کنید.");
      return;
    }

    if (!user) {
      setError("برای ادامه خرید ابتدا وارد حساب کاربری خود شوید.");
      return;
    }

    if (submitLock.current || loading) {
      return;
    }

    if (submissionUncertain) {
      setError(
        "وضعیت سفارش قبلی هنوز مشخص نیست. صفحه را تازه‌سازی کنید " +
          "و پیش از ارسال مجدد، سفارش‌های خود را بررسی کنید.",
      );
      return;
    }

    if (items.length === 0) {
      setError("سبد خرید شما خالی است.");
      return;
    }

    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !phone.trim() ||
      !province.trim() ||
      !city.trim() ||
      !address.trim() ||
      !postalCode.trim()
    ) {
      setError("لطفاً تمام اطلاعات گیرنده و آدرس را تکمیل کنید.");
      return;
    }

    const orderItems: CheckoutItem[] = items.map((item) => ({
      product_id: Number(item.product_id ?? item.product?.id ?? item.id),
      quantity: Number(item.quantity),
    }));

    if (
      orderItems.some(
        (item) =>
          !Number.isInteger(item.product_id) ||
          item.product_id < 1 ||
          !Number.isInteger(item.quantity) ||
          item.quantity < 1,
      )
    ) {
      setError("اطلاعات محصولات سبد خرید معتبر نیست.");
      return;
    }

    submitLock.current = true;
    setLoading(true);
    setError("");

    let orderCreatedOrUnknown = false;

    try {
      const fullAddress = [province, city, address]
        .map((part) => part.trim())
        .filter(Boolean)
        .join("، ");

      const payload: CheckoutPayload = {
        recipient_name: `${firstName.trim()} ${lastName.trim()}`,
        phone: phone.trim(),
        address: fullAddress,
        postal_code: postalCode.trim(),
        notes: null,
        items: orderItems,
      };

      const fingerprint = getCheckoutFingerprint(payload);
      const idempotencyKey = getIdempotencyKey(fingerprint);

      const response = await api.post("/orders", payload, {
        headers: {
          "Idempotency-Key": idempotencyKey,
        },
      });

      const order =
        response.data?.data ?? response.data?.order ?? response.data;

      const orderNumber = order?.order_number ?? response.data?.order_number;

      orderCreatedOrUnknown = true;

      if (!orderNumber) {
        setSubmissionUncertain(true);
        setError(
          "پاسخ سرور دریافت شد، اما شماره سفارش مشخص نیست. " +
            "برای جلوگیری از ثبت تکراری، کلید درخواست حفظ شده است. " +
            "ابتدا سفارش‌های خود را بررسی کنید.",
        );
        return;
      }

      clearCart();

      sessionStorage.removeItem(CHECKOUT_KEY_STORAGE);
      sessionStorage.removeItem(CHECKOUT_FINGERPRINT_STORAGE);
      idempotencyKeyRef.current = null;

      navigate(`/payment/${encodeURIComponent(orderNumber)}`);
    } catch (error: any) {
      console.error("Checkout error:", error);

      const status = error?.response?.status;
      const responseErrors = error?.response?.data?.errors;

      if (!error?.response || status >= 500) {
        orderCreatedOrUnknown = true;
        setSubmissionUncertain(true);

        setError(
          "پاسخ قطعی از سرور دریافت نشد و ممکن است سفارش ثبت شده باشد. " +
            "پیش از هر تلاش مجدد، سفارش‌های خود را بررسی کنید. " +
            "کلید درخواست حفظ شده است تا از ثبت تکراری جلوگیری شود.",
        );
      } else if (status === 401) {
        setError(
          "نشست ورود شما معتبر نیست. لطفاً دوباره وارد حساب کاربری شوید.",
        );
      } else if (status === 409) {
        setError(
          error?.response?.data?.message ??
            "درخواست با اطلاعات سفارش قبلی تطابق ندارد. " +
              "اطلاعات سفارش را بررسی کنید.",
        );
      } else if (responseErrors) {
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
            "ثبت سفارش انجام نشد. لطفاً اطلاعات را بررسی کنید.",
        );
      }
    } finally {
      setLoading(false);

      if (!orderCreatedOrUnknown) {
        submitLock.current = false;
      }
    }
  };

  if (items.length === 0) {
    return (
      <Layout>
        <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
          <Link
            to="/cart"
            className="inline-flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-[#385e3e]"
          >
            <ArrowRight size={17} />
            بازگشت به سبد خرید
          </Link>

          <div className="mt-6 rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-sm sm:p-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e8efe2] text-[#537653]">
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
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-[#648767] px-6 py-3 font-bold text-white transition-colors hover:bg-[#385e3e]"
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
      <main dir="rtl" className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8">
          <Link
            to="/cart"
            className="inline-flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-[#385e3e]"
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

        {!authLoading && !user && (
          <section
            role="status"
            className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <User size={22} />
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="text-base font-black text-slate-900">
                  برای ادامه خرید وارد حساب شوید
                </h2>

                <p className="mt-2 text-sm leading-7 text-slate-600">
                  برای ثبت و پیگیری سفارش، وارد حساب کاربری خود شوید یا یک حساب
                  جدید ایجاد کنید. پس از ورود می‌توانید به همین صفحه برگردید.
                </p>

                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    to="/login"
                    state={{ from: "/checkout" }}
                    className="inline-flex items-center justify-center rounded-xl bg-[#648767] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#385e3e]"
                  >
                    ورود به حساب
                  </Link>

                  <Link
                    to="/register"
                    state={{ from: "/checkout" }}
                    className="inline-flex items-center justify-center rounded-xl border border-[#d9e6d5] bg-white px-5 py-2.5 text-sm font-bold text-[#385e3e] transition hover:bg-[#f0f3e9]"
                  >
                    ایجاد حساب کاربری
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

        {authLoading && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <Loader2 size={18} className="animate-spin" />
            در حال بررسی وضعیت حساب کاربری...
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-7">
              <div className="mb-7 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#e8efe2] text-[#537653]">
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
                <div
                  role="alert"
                  className="mb-6 flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600"
                >
                  <AlertCircle size={19} className="mt-0.5 flex-shrink-0" />
                  <span className="flex-1">{error}</span>

                  {error.includes("دوباره وارد") && (
                    <Link
                      to="/login"
                      state={{ from: "/checkout" }}
                      className="shrink-0 underline"
                    >
                      ورود
                    </Link>
                  )}
                </div>
              )}

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="checkout-first-name"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    نام
                  </label>
                  <div className="relative">
                    <User
                      size={18}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      id="checkout-first-name"
                      type="text"
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                      autoComplete="given-name"
                      required
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-11 outline-none transition focus:border-[#648767] focus:ring-2 focus:ring-[#e8efe2]"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="checkout-last-name"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    نام خانوادگی
                  </label>
                  <div className="relative">
                    <User
                      size={18}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      id="checkout-last-name"
                      type="text"
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                      autoComplete="family-name"
                      required
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-11 outline-none transition focus:border-[#648767] focus:ring-2 focus:ring-[#e8efe2]"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="checkout-phone"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    شماره موبایل
                  </label>
                  <div className="relative">
                    <Phone
                      size={18}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      id="checkout-phone"
                      type="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      autoComplete="tel"
                      required
                      dir="ltr"
                      placeholder="09123456789"
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-11 outline-none transition focus:border-[#648767] focus:ring-2 focus:ring-[#e8efe2]"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="checkout-province"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    استان
                  </label>
                  <input
                    id="checkout-province"
                    type="text"
                    value={province}
                    onChange={(event) => setProvince(event.target.value)}
                    autoComplete="address-level1"
                    required
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[#648767] focus:ring-2 focus:ring-[#e8efe2]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="checkout-city"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    شهر
                  </label>
                  <input
                    id="checkout-city"
                    type="text"
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    autoComplete="address-level2"
                    required
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[#648767] focus:ring-2 focus:ring-[#e8efe2]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="checkout-address"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    آدرس کامل
                  </label>
                  <textarea
                    id="checkout-address"
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    autoComplete="street-address"
                    required
                    rows={4}
                    className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[#648767] focus:ring-2 focus:ring-[#e8efe2]"
                    placeholder="آدرس دقیق محل تحویل سفارش"
                  />
                </div>

                <div>
                  <label
                    htmlFor="checkout-postal-code"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    کد پستی
                  </label>
                  <input
                    id="checkout-postal-code"
                    type="text"
                    value={postalCode}
                    onChange={(event) => setPostalCode(event.target.value)}
                    autoComplete="postal-code"
                    required
                    maxLength={10}
                    dir="ltr"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[#648767] focus:ring-2 focus:ring-[#e8efe2]"
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

              <div className="mt-6 rounded-2xl border border-[#d9e6d5] bg-[#e8efe2] p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-black text-[#2f4b32]">ارسال معمولی</p>
                    <p className="mt-1 text-sm text-[#385e3e]">
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
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e8efe2] text-[#537653]">
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
                    <p className="mt-1 text-2xl font-black text-[#385e3e]">
                      {formatPrice(finalTotal)}
                    </p>
                  </div>
                  <span className="mb-1 text-sm text-slate-500">تومان</span>
                </div>
              </div>

              {authLoading ? (
                <button
                  type="button"
                  disabled
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-300 py-3.5 font-black text-white"
                >
                  <Loader2 size={19} className="animate-spin" />
                  در حال بررسی حساب...
                </button>
              ) : !user ? (
                <div className="mt-6 space-y-3">
                  <Link
                    to="/login"
                    state={{ from: "/checkout" }}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#648767] py-3.5 font-black text-white transition-colors hover:bg-[#385e3e]"
                  >
                    <User size={19} />
                    ورود و ادامه خرید
                  </Link>

                  <Link
                    to="/register"
                    state={{ from: "/checkout" }}
                    className="inline-flex w-full items-center justify-center rounded-xl border border-[#d9e6d5] bg-white py-3 font-bold text-[#385e3e] transition-colors hover:bg-[#f0f3e9]"
                  >
                    ایجاد حساب کاربری
                  </Link>
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={loading || submissionUncertain}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#648767] py-3.5 font-black text-white transition-colors hover:bg-[#385e3e] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 size={19} className="animate-spin" />
                      در حال ثبت سفارش...
                    </>
                  ) : submissionUncertain ? (
                    <>
                      <AlertCircle size={19} />
                      وضعیت سفارش نامشخص
                    </>
                  ) : (
                    <>
                      <CreditCard size={19} />
                      ادامه و پرداخت
                    </>
                  )}
                </button>
              )}

              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
                <ShieldCheck size={15} />
                اطلاعات شما با امنیت کامل ثبت می‌شود.
              </div>
            </section>

            <Link
              to="/cart"
              className="block rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:border-[#cbdcc9] hover:bg-[#f0f3e9]"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-slate-600">
                  بازگشت و ویرایش سبد خرید
                </span>
                <ChevronLeft
                  size={18}
                  className="text-slate-400 transition-colors hover:text-[#385e3e]"
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
