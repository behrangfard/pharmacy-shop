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
  Check,
  MapPinned,
  Plus,
} from "lucide-react";

import Layout from "../components/Layout";
import AddressMapPicker from "../components/AddressMapPicker";
import { usePrivatePageMeta } from "../hooks/usePageMeta";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import api from "../services/api";
import {
  createAddress,
  fetchAddresses,
  type SavedAddress,
} from "../services/addresses";
import { useStoreSettings } from "../hooks/useStoreSettings";
import { toEnglishDigits } from "../utils/jalali";

const CHECKOUT_KEY_STORAGE = "checkout_idempotency_key";
const CHECKOUT_FINGERPRINT_STORAGE = "checkout_fingerprint";

type CheckoutItem = {
  product_id: number;
  variant_id?: number;
  quantity: number;
  /** رنگ انتخاب‌شدهٔ محصول (در صورت رنگ‌بندی) */
  color_name?: string;
  /** رنگ هر قطعهٔ پک چندعددی */
  pack_colors?: { name: string; color: string }[];
};

type CheckoutPayload = {
  recipient_name: string;
  phone: string;
  address: string;
  postal_code: string;
  notes: null;
  coupon_code?: string | null;
  items: CheckoutItem[];
};

/**
 * ساختار قدیمی اقلام سبد خرید که ممکن است هنوز در localStorage کاربران
 * باقی مانده باشد؛ برای تبدیل ایمن به payload سفارش استفاده می‌شود.
 */
type LegacyCartItem = {
  id: number;
  quantity: number;
  product_id?: number | string | null;
  product?: { id?: number | string | null } | null;
  variant_id?: number | string | null;
  color_name?: string | null;
  pack_colors?: { name?: string | null; color?: string | null }[] | null;
};

function Checkout() {
  usePrivatePageMeta("تسویه حساب", "/checkout");

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

  const storeSettings = useStoreSettings();

  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<{
    code: string;
    discount: number;
    title: string | null;
  } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");

  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [addressesError, setAddressesError] = useState("");
  const [addressesReloadKey, setAddressesReloadKey] = useState(0);
  const [selectedAddressId, setSelectedAddressId] = useState<number | "new">(
    "new",
  );
  const [saveAddressToBook, setSaveAddressToBook] = useState(false);
  const [showAddressMap, setShowAddressMap] = useState(false);
  const [mapPoint, setMapPoint] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // مقداردهی اولیه نام کاربر بدون بازنویسی اطلاعاتی که خودش ویرایش کرده است.
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

  // پر کردن فرم با آدرس انتخاب‌شده از دفترچهٔ آدرس مشتری.
  function applySavedAddress(address: SavedAddress) {
    const fullName = (address.recipient_name ?? "").trim();

    if (fullName) {
      const parts = fullName.split(/\s+/);
      setFirstName(parts[0] ?? "");
      setLastName(parts.slice(1).join(" "));
    }

    setPhone(toEnglishDigits(address.phone ?? "").replace(/\D/g, ""));
    setProvince(address.province ?? "");
    setCity(address.city ?? "");
    setAddress(address.address ?? "");
    setPostalCode(
      toEnglishDigits(address.postal_code ?? "")
        .replace(/\D/g, "")
        .slice(0, 10),
    );
    setSelectedAddressId(address.id);
    setMapPoint(
      address.latitude !== null && address.longitude !== null
        ? { latitude: address.latitude, longitude: address.longitude }
        : null,
    );
    setShowAddressMap(false);
  }

  // خالی کردن فیلدهای آدرس برای ثبت آدرس جدید.
  function startNewAddress() {
    setSelectedAddressId("new");
    setProvince("");
    setCity("");
    setAddress("");
    setPostalCode("");
    setMapPoint(null);
    setShowAddressMap(false);
  }

  // بارگذاری آدرس‌های ذخیره‌شده و انتخاب خودکار آدرس پیش‌فرض.
  // کلید وابستگی «شناسهٔ کاربر» است تا رفرش‌های بی‌ربط، انتخاب کاربر را
  // بازنویسی نکنند و در حالت StrictMode هم وضعیت بارگذاری قفل نشود.
  const authUserId = user?.id ?? null;

  useEffect(() => {
    if (authLoading || authUserId === null) {
      return;
    }

    let active = true;

    setAddressesLoading(true);
    setAddressesError("");

    (async () => {
      try {
        const items = await fetchAddresses();

        if (!active) {
          return;
        }

        setSavedAddresses(items);

        const preferred = items.find((item) => item.is_default) ?? items[0];

        if (preferred) {
          applySavedAddress(preferred);
        }
      } catch (loadError) {
        console.error("Checkout addresses load error:", loadError);

        if (active) {
          setSavedAddresses([]);
          setAddressesError(
            "دریافت آدرس‌های ذخیره‌شده ممکن نشد. آدرس را دستی وارد کنید یا دوباره تلاش کنید.",
          );
        }
      } finally {
        if (active) {
          setAddressesLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, authUserId, addressesReloadKey]);

  // همگام‌سازی مالیات با تنظیمات فروشگاه (قابل ویرایش از پنل مدیران).
  useEffect(() => {
    setVatEnabled(storeSettings.vat_enabled);
    setVatPercent(
      Math.min(Math.max(Number(storeSettings.vat_percent) || 0, 0), 100),
    );
  }, [storeSettings.vat_enabled, storeSettings.vat_percent]);

  async function applyCoupon() {
    const code = couponInput.trim();

    if (!code || couponLoading) return;

    setCouponLoading(true);
    setCouponError("");

    try {
      const response = await api.post("/coupons/check", {
        code,
        subtotal: Math.max(0, Number(cartTotal ?? 0)),
      });

      const data = response.data?.data;
      const discount = Number(data?.discount) || 0;

      if (discount <= 0) {
        throw new Error("این کد تخفیف برای سبد خرید فعلی معتبر نیست.");
      }

      setCoupon({
        code: data?.code ?? code.toUpperCase(),
        discount,
        title: data?.title ?? null,
      });
      setCouponInput(data?.code ?? code.toUpperCase());
    } catch (error: any) {
      setCoupon(null);
      setCouponError(
        error?.response?.data?.message ??
          error?.message ??
          "کد تخفیف معتبر نیست.",
      );
    } finally {
      setCouponLoading(false);
    }
  }

  function removeCoupon() {
    setCoupon(null);
    setCouponInput("");
    setCouponError("");
  }

  const formatPrice = (value: string | number) => {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
      return "۰";
    }

    return numericValue.toLocaleString("fa-IR");
  };

  const itemsSubtotal = Math.max(0, Number(cartTotal ?? 0));
  const couponDiscount = Math.min(coupon?.discount ?? 0, itemsSubtotal);
  const netSubtotal = Math.max(0, itemsSubtotal - couponDiscount);

  const shippingCost = useMemo(() => {
    if (items.length === 0 || netSubtotal <= 0) {
      return 0;
    }

    const threshold = Number(storeSettings.free_shipping_threshold) || 0;

    if (
      storeSettings.free_shipping_enabled &&
      threshold > 0 &&
      netSubtotal >= threshold
    ) {
      return 0;
    }

    return Math.max(0, Number(storeSettings.shipping_cost) || 0);
  }, [items.length, netSubtotal, storeSettings]);

  const isFreeShipping =
    shippingCost === 0 && (Number(storeSettings.shipping_cost) || 0) > 0;

  const cartOriginalTotal = useMemo(() => {
    return items.reduce((total, item) => {
      const originalPrice = item.originalPrice ?? item.price;

      return total + Number(originalPrice) * item.quantity;
    }, 0);
  }, [items]);

  const cartDiscount = useMemo(() => {
    return Math.max(0, cartOriginalTotal - Number(cartTotal ?? 0));
  }, [cartOriginalTotal, cartTotal]);

  // مالیات فقط برای محصولاتی محاسبه می‌شود که مشمول مالیات هستند.
  const taxableAmount = useMemo(() => {
    const taxableProductsTotal = items.reduce((total, item) => {
      if (item.is_taxable !== true) {
        return total;
      }

      return total + Number(item.price) * Number(item.quantity);
    }, 0);

    return Math.max(0, taxableProductsTotal - couponDiscount) + shippingCost;
  }, [items, couponDiscount, shippingCost]);

  const taxAmount = useMemo(() => {
    return vatEnabled ? Math.round((taxableAmount * vatPercent) / 100) : 0;
  }, [taxableAmount, vatEnabled, vatPercent]);

  const finalTotal = useMemo(() => {
    return Math.max(0, netSubtotal + shippingCost + taxAmount);
  }, [netSubtotal, shippingCost, taxAmount]);

  // مرتب‌سازی قطعی اقلام برای اینکه ترتیب سبد خرید
  // باعث تولید کلید Idempotency متفاوت نشود.
  const getCheckoutFingerprint = (payload: CheckoutPayload) => {
    const normalizedItems = [...payload.items].sort((a, b) => {
      if (a.product_id !== b.product_id) {
        return a.product_id - b.product_id;
      }

      return (a.variant_id ?? 0) - (b.variant_id ?? 0);
    });

    return JSON.stringify({
      userId: user?.id ?? null,
      recipient_name: payload.recipient_name,
      phone: payload.phone,
      address: payload.address,
      postal_code: payload.postal_code,
      notes: payload.notes,
      coupon_code: payload.coupon_code ?? null,
      items: normalizedItems,
    });
  };

  // استفاده مجدد از کلید قبلی فقط برای اطلاعات دقیقاً یکسان.
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

    // هر قلم سبد خرید با شناسه تنوع خودش به سفارش تبدیل می‌شود.
    const orderItems: CheckoutItem[] = items.map((cartItem) => {
      const item = cartItem as LegacyCartItem;
      const productId = Number(item.product_id ?? item.product?.id ?? item.id);

      const variantId =
        item.variant_id === undefined ||
        item.variant_id === null ||
        item.variant_id === ""
          ? undefined
          : Number(item.variant_id);

      // رنگ محصول یا رنگ قطعات پک، در صورت انتخاب مشتری.
      const colorName =
        typeof item.color_name === "string" ? item.color_name.trim() : "";

      const packColors = Array.isArray(item.pack_colors)
        ? item.pack_colors
            .map((entry) => ({
              name: String(entry?.name ?? "").trim(),
              color: String(entry?.color ?? "").trim(),
            }))
            .filter((entry) => entry.name !== "" && entry.color !== "")
        : [];

      return {
        product_id: productId,
        ...(variantId !== undefined ? { variant_id: variantId } : {}),
        quantity: Number(item.quantity),
        ...(colorName !== "" ? { color_name: colorName } : {}),
        ...(packColors.length > 0 ? { pack_colors: packColors } : {}),
      };
    });

    if (
      orderItems.some(
        (item) =>
          !Number.isInteger(item.product_id) ||
          item.product_id < 1 ||
          !Number.isInteger(item.quantity) ||
          item.quantity < 1 ||
          (item.variant_id !== undefined &&
            (!Number.isInteger(item.variant_id) || item.variant_id < 1)),
      )
    ) {
      setError("اطلاعات محصولات یا تنوع‌های سبد خرید معتبر نیست.");
      return;
    }

    // جلوگیری از تکرار یک محصول با یک تنوع/رنگ یکسان در payload.
    const itemKeys = orderItems.map((item) => {
      const packSignature = (item.pack_colors ?? [])
        .map((entry) => `${entry.name}=${entry.color}`)
        .sort()
        .join("|");

      return [
        item.product_id,
        item.variant_id ?? "default",
        item.color_name ?? "",
        packSignature,
      ].join(":");
    });

    if (new Set(itemKeys).size !== itemKeys.length) {
      setError(
        "یک محصول با تنوع یکسان چند بار در سبد خرید ثبت شده است. " +
          "لطفاً سبد خرید را بررسی کنید.",
      );
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
        coupon_code: coupon?.code ?? null,
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

      // در صورت درخواست کاربر، آدرس تازه در دفترچهٔ آدرس ذخیره می‌شود.
      if (saveAddressToBook && selectedAddressId === "new") {
        try {
          await createAddress({
            title: null,
            recipient_name: `${firstName.trim()} ${lastName.trim()}`,
            phone: phone.trim(),
            province: province.trim(),
            city: city.trim(),
            address: address.trim(),
            postal_code: postalCode.trim() || null,
            latitude: mapPoint?.latitude ?? null,
            longitude: mapPoint?.longitude ?? null,
            is_default: savedAddresses.length === 0,
          });
        } catch (saveError) {
          console.error("Address save error:", saveError);
        }
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
            className="inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-brand-700"
          >
            <ArrowRight size={17} />
            بازگشت به سبد خرید
          </Link>

          <div className="mt-6 rounded-3xl border border-line bg-white p-8 text-center shadow-sm sm:p-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100 text-brand-550">
              <ShoppingBag size={30} />
            </div>

            <h1 className="mt-5 text-2xl font-black text-ink">
              سبد خرید شما خالی است
            </h1>

            <p className="mt-2 text-muted">
              برای ادامه خرید، ابتدا محصولی به سبد خرید اضافه کنید.
            </p>

            <Link
              to="/products"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 py-3 font-bold text-white transition-colors hover:bg-brand-700"
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
            className="inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-brand-700"
          >
            <ArrowRight size={17} />
            بازگشت به سبد خرید
          </Link>

          <h1 className="mt-5 text-2xl font-black text-ink sm:text-3xl">
            تکمیل سفارش
          </h1>

          <p className="mt-2 text-muted">
            اطلاعات ارسال سفارش خود را وارد کنید.
          </p>
        </div>

        {!authLoading && !user && (
          <section
            role="status"
            className="mb-6 rounded-2xl border border-gold-100 bg-gold-50 p-5 sm:p-6"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-100 text-gold">
                <User size={22} />
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="text-base font-black text-ink">
                  برای ادامه خرید وارد حساب شوید
                </h2>

                <p className="mt-2 text-sm leading-7 text-muted">
                  برای ثبت و پیگیری سفارش، وارد حساب کاربری خود شوید یا یک حساب
                  جدید ایجاد کنید. پس از ورود می‌توانید به همین صفحه برگردید.
                </p>

                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    to="/login"
                    state={{ from: "/checkout" }}
                    className="inline-flex items-center justify-center rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700"
                  >
                    ورود به حساب
                  </Link>

                  <Link
                    to="/register"
                    state={{ from: "/checkout" }}
                    className="inline-flex items-center justify-center rounded-xl border border-brand-250 bg-white px-5 py-2.5 text-sm font-bold text-brand-700 transition hover:bg-brand-75"
                  >
                    ایجاد حساب کاربری
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

        {authLoading && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-line bg-cream p-4 text-sm text-muted">
            <Loader2 size={18} className="animate-spin" />
            در حال بررسی وضعیت حساب کاربری...
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <section className="rounded-3xl border border-line bg-white p-5 shadow-sm sm:p-7">
              <div className="mb-7 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-550">
                  <MapPin size={24} />
                </div>

                <div>
                  <h2 className="text-xl font-black text-ink">
                    اطلاعات گیرنده
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    اطلاعات لازم برای ارسال سفارش
                  </p>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mb-6 flex items-start gap-3 rounded-xl border border-blush-100 bg-blush-50 p-4 text-sm font-bold text-discount"
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

              <div className="mb-6">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold text-ink-soft">
                    انتخاب آدرس
                  </p>

                  <Link
                    to="/account"
                    className="text-xs font-bold text-brand-600 transition hover:text-brand-700"
                  >
                    مدیریت آدرس‌ها
                  </Link>
                </div>

                {addressesError && !addressesLoading && (
                  <div className="mb-3 flex flex-wrap items-center gap-3 rounded-2xl border border-blush-100 bg-blush-50 p-3 text-xs font-bold text-discount">
                    <AlertCircle size={16} className="shrink-0" />
                    <span className="flex-1">{addressesError}</span>

                    <button
                      type="button"
                      onClick={() =>
                        setAddressesReloadKey((current) => current + 1)
                      }
                      className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-[11px] font-bold text-discount"
                    >
                      تلاش دوباره
                    </button>
                  </div>
                )}

                {addressesLoading ? (
                  <div className="flex items-center gap-2 rounded-2xl border border-dashed border-line bg-cream p-4 text-xs text-muted">
                    <Loader2 size={16} className="animate-spin" />
                    در حال دریافت آدرس‌های ذخیره‌شده...
                  </div>
                ) : savedAddresses.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {savedAddresses.map((saved) => {
                      const isSelected = selectedAddressId === saved.id;

                      return (
                        <button
                          key={saved.id}
                          type="button"
                          onClick={() => applySavedAddress(saved)}
                          aria-pressed={isSelected}
                          className={`rounded-2xl border p-4 text-right transition ${
                            isSelected
                              ? "border-brand-500 bg-brand-50 ring-2 ring-brand-100"
                              : "border-line bg-white hover:border-brand-200"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-bold text-ink">
                              {saved.title || "آدرس"}
                            </span>

                            {isSelected ? (
                              <Check
                                size={16}
                                className="shrink-0 text-brand-600"
                              />
                            ) : saved.is_default ? (
                              <span className="shrink-0 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold text-brand-700">
                                پیش‌فرض
                              </span>
                            ) : null}
                          </div>

                          <p className="mt-2 text-xs leading-5 text-muted">
                            {saved.full_address ??
                              [saved.province, saved.city, saved.address]
                                .filter(Boolean)
                                .join("، ")}
                          </p>

                          <p className="mt-1 text-[11px] text-muted-soft">
                            {saved.recipient_name}
                            {saved.phone ? ` · ${saved.phone}` : ""}
                          </p>
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      onClick={startNewAddress}
                      aria-pressed={selectedAddressId === "new"}
                      className={`flex items-center justify-center gap-2 rounded-2xl border border-dashed p-4 text-sm font-bold transition ${
                        selectedAddressId === "new"
                          ? "border-brand-500 bg-brand-50 text-brand-700"
                          : "border-line bg-white text-muted hover:border-brand-200"
                      }`}
                    >
                      <Plus size={16} />
                      آدرس جدید
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-2xl border border-dashed border-line bg-cream p-4 text-xs text-muted">
                    <MapPinned size={16} className="shrink-0 text-muted-soft" />
                    هنوز آدرسی ذخیره نکرده‌اید؛ آدرس را دستی وارد کنید یا آن را
                    برای سفارش‌های بعدی ذخیره کنید.
                  </div>
                )}
              </div>


              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="checkout-first-name"
                    className="mb-2 block text-sm font-bold text-ink-soft"
                  >
                    نام
                  </label>

                  <div className="relative">
                    <User
                      size={18}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-soft"
                    />

                    <input
                      id="checkout-first-name"
                      type="text"
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                      autoComplete="given-name"
                      required
                      className="w-full rounded-xl border border-line bg-white py-3 pl-4 pr-11 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="checkout-last-name"
                    className="mb-2 block text-sm font-bold text-ink-soft"
                  >
                    نام خانوادگی
                  </label>

                  <div className="relative">
                    <User
                      size={18}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-soft"
                    />

                    <input
                      id="checkout-last-name"
                      type="text"
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                      autoComplete="family-name"
                      required
                      className="w-full rounded-xl border border-line bg-white py-3 pl-4 pr-11 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="checkout-phone"
                    className="mb-2 block text-sm font-bold text-ink-soft"
                  >
                    شماره موبایل
                  </label>

                  <div className="relative">
                    <Phone
                      size={18}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-soft"
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
                      className="w-full rounded-xl border border-line bg-white py-3 pl-4 pr-11 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="checkout-province"
                    className="mb-2 block text-sm font-bold text-ink-soft"
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
                    className="w-full rounded-xl border border-line px-4 py-3 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="checkout-city"
                    className="mb-2 block text-sm font-bold text-ink-soft"
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
                    className="w-full rounded-xl border border-line px-4 py-3 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="checkout-address"
                    className="mb-2 block text-sm font-bold text-ink-soft"
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
                    className="w-full resize-none rounded-xl border border-line px-4 py-3 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                    placeholder="آدرس دقیق محل تحویل سفارش"
                  />
                </div>

                <div>
                  <label
                    htmlFor="checkout-postal-code"
                    className="mb-2 block text-sm font-bold text-ink-soft"
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
                    className="w-full rounded-xl border border-line px-4 py-3 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                </div>

                {selectedAddressId === "new" && (
                  <div className="space-y-3 rounded-2xl border border-dashed border-line bg-cream p-4 sm:col-span-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setShowAddressMap((current) => !current)}
                        className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-xs font-bold text-ink-soft transition hover:border-brand-200 hover:text-brand-700"
                      >
                        <MapPinned size={15} />
                        {showAddressMap
                          ? "بستن نقشه"
                          : "انتخاب موقعیت روی نقشه"}
                      </button>

                      {mapPoint && (
                        <button
                          type="button"
                          onClick={() => setMapPoint(null)}
                          className="text-[11px] font-bold text-discount"
                        >
                          حذف موقعیت انتخاب‌شده
                        </button>
                      )}
                    </div>

                    {showAddressMap && (
                      <AddressMapPicker
                        latitude={mapPoint?.latitude ?? null}
                        longitude={mapPoint?.longitude ?? null}
                        onChange={setMapPoint}
                        onResolve={(parts) => {
                          if (parts.address) {
                            setAddress(parts.address);
                          }

                          if (parts.city) {
                            setCity(parts.city);
                          }

                          if (parts.province) {
                            setProvince(parts.province);
                          }

                          if (parts.postal_code) {
                            setPostalCode(
                              toEnglishDigits(parts.postal_code)
                                .replace(/\D/g, "")
                                .slice(0, 10),
                            );
                          }
                        }}
                      />
                    )}

                    <label className="flex items-center gap-2 text-xs font-bold text-ink-soft">
                      <input
                        type="checkbox"
                        checked={saveAddressToBook}
                        onChange={(event) =>
                          setSaveAddressToBook(event.target.checked)
                        }
                        className="h-4 w-4 rounded border-line accent-brand-600"
                      />
                      این آدرس را برای سفارش‌های بعدی ذخیره کن
                    </label>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-line bg-white p-5 shadow-sm sm:p-7">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-stock">
                  <Truck size={24} />
                </div>

                <div>
                  <h2 className="text-xl font-black text-ink">
                    روش ارسال
                  </h2>

                  <p className="mt-1 text-sm text-muted">
                    ارسال سفارش برای شما
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-brand-250 bg-brand-100 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-black text-brand-800">ارسال معمولی</p>

                    <p className="mt-1 text-sm text-brand-700">
                      ارسال سفارش به آدرس ثبت‌شده
                    </p>
                  </div>

                  <div className="text-sm font-black text-stock">
                    {shippingCost === 0
                      ? "رایگان"
                      : `${formatPrice(shippingCost)} تومان`}
                  </div>
                </div>

                {isFreeShipping && (
                  <p className="mt-3 text-xs text-brand-700">
                    ارسال این سفارش رایگان است.
                  </p>
                )}

                {!isFreeShipping &&
                  storeSettings.free_shipping_enabled &&
                  Number(storeSettings.free_shipping_threshold) > 0 && (
                    <p className="mt-3 text-xs text-muted">
                      با خرید بالای{" "}
                      {formatPrice(storeSettings.free_shipping_threshold)}{" "}
                      تومان، ارسال رایگان می‌شود.
                    </p>
                  )}

                {storeSettings.shipping_note && (
                  <p className="mt-2 text-xs leading-6 text-muted-soft">
                    {storeSettings.shipping_note}
                  </p>
                )}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl border border-line bg-white p-5 shadow-sm sm:p-6 lg:sticky lg:top-6">
              <div className="flex items-center gap-3 border-b border-line pb-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 text-brand-550">
                  <ShoppingBag size={22} />
                </div>

                <div>
                  <h2 className="text-lg font-black">خلاصه سفارش</h2>

                  <p className="mt-1 text-xs text-muted">
                    {items.length.toLocaleString("fa-IR")} محصول
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-dashed border-brand-300 bg-brand-50 p-4">
                <label
                  htmlFor="checkout-coupon"
                  className="text-xs font-bold text-brand-700"
                >
                  کد تخفیف دارید؟
                </label>

                <div className="mt-2 flex gap-2">
                  <input
                    id="checkout-coupon"
                    value={couponInput}
                    onChange={(event) => setCouponInput(event.target.value)}
                    dir="ltr"
                    placeholder="WELCOME10"
                    className="min-w-0 flex-1 rounded-xl border border-brand-250 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />

                  <button
                    type="button"
                    onClick={() => void applyCoupon()}
                    disabled={couponLoading || !couponInput.trim()}
                    className="shrink-0 rounded-xl bg-brand-500 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {couponLoading ? "..." : "اعمال"}
                  </button>
                </div>

                {couponError && (
                  <p className="mt-2 text-xs text-discount">{couponError}</p>
                )}

                {coupon && (
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-brand-100 px-3 py-2 text-xs text-brand-800">
                    <span className="font-bold" dir="ltr">
                      {coupon.code}
                    </span>

                    <span className="flex items-center gap-2">
                      {formatPrice(coupon.discount)} تومان تخفیف
                      <button
                        type="button"
                        onClick={removeCoupon}
                        className="rounded-lg border border-brand-300 bg-white px-2 py-1 text-[10px] font-bold text-brand-700"
                      >
                        حذف
                      </button>
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-muted">مبلغ کالاها</span>

                  <span className="font-bold text-ink">
                    {formatPrice(cartOriginalTotal)} تومان
                  </span>
                </div>

                {cartDiscount > 0 && (
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-muted">تخفیف</span>

                    <span className="font-bold text-stock">
                      - {formatPrice(cartDiscount)} تومان
                    </span>
                  </div>
                )}

                {couponDiscount > 0 && (
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-muted">تخفیف کد تخفیف</span>

                    <span className="font-bold text-stock">
                      - {formatPrice(couponDiscount)} تومان
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-muted">هزینه ارسال</span>

                  <span
                    className={`font-bold ${
                      shippingCost === 0 ? "text-stock" : "text-ink"
                    }`}
                  >
                    {shippingCost === 0
                      ? "رایگان"
                      : `${formatPrice(shippingCost)} تومان`}
                  </span>
                </div>

                {vatEnabled && (
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-muted">
                      ارزش افزوده ({formatPrice(vatPercent)}٪)
                    </span>

                    <span className="font-bold text-ink">
                      {formatPrice(taxAmount)} تومان
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-5 border-t border-line pt-5">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs text-muted-soft">مبلغ نهایی</p>

                    <p className="mt-1 text-2xl font-black text-brand-700">
                      {formatPrice(finalTotal)}
                    </p>
                  </div>

                  <span className="mb-1 text-sm text-muted">تومان</span>
                </div>
              </div>

              {authLoading ? (
                <button
                  type="button"
                  disabled
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-line-strong py-3.5 font-black text-white"
                >
                  <Loader2 size={19} className="animate-spin" />
                  در حال بررسی حساب...
                </button>
              ) : !user ? (
                <div className="mt-6 space-y-3">
                  <Link
                    to="/login"
                    state={{ from: "/checkout" }}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3.5 font-black text-white transition-colors hover:bg-brand-700"
                  >
                    <User size={19} />
                    ورود و ادامه خرید
                  </Link>

                  <Link
                    to="/register"
                    state={{ from: "/checkout" }}
                    className="inline-flex w-full items-center justify-center rounded-xl border border-brand-250 bg-white py-3 font-bold text-brand-700 transition-colors hover:bg-brand-75"
                  >
                    ایجاد حساب کاربری
                  </Link>
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={loading || submissionUncertain}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3.5 font-black text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
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

              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-soft">
                <ShieldCheck size={15} />
                اطلاعات شما با امنیت کامل ثبت می‌شود.
              </div>
            </section>

            <Link
              to="/cart"
              className="block rounded-2xl border border-line bg-cream p-4 transition hover:border-brand-300 hover:bg-brand-75"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-muted">
                  بازگشت و ویرایش سبد خرید
                </span>

                <ChevronLeft
                  size={18}
                  className="text-muted-soft transition-colors hover:text-brand-700"
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
