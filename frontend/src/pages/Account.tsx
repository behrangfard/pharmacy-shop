import { useEffect, useMemo, useState, type FormEvent } from "react";

import { Link, useNavigate } from "react-router-dom";

import {
  ArrowRight,
  Mail,
  ShoppingCart,
  User,
  Package,
  Loader2,
  Pencil,
  Save,
  Lock,
  ChevronLeft,
  CalendarDays,
  Cake,
  Phone,
  CreditCard,
  XCircle,
  CheckCircle2,
  Truck,
  Clock3,
  Tag,
} from "lucide-react";

import Layout from "../components/Layout";
import AddressBookSection from "../components/AddressBookSection";
import JalaliDatePicker from "../components/JalaliDatePicker";
import { usePrivatePageMeta } from "../hooks/usePageMeta";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import api from "../services/api";
import { STORAGE_KEYS } from "../utils/storageKeys";
import { getStorageUrl } from "../utils/images";
import { formatJalaliShort, toEnglishDigits, todayJalali } from "../utils/jalali";

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
  payment_method?: string | null;
  recipient_name: string;
  phone: string;
  address: string;
  postal_code: string;
  notes?: string | null;
  created_at: string;
  items: OrderItem[];
};

function Account() {
  usePrivatePageMeta("حساب کاربری", "/account");

  const navigate = useNavigate();

  const { user, setUser, logout } = useAuth();

  const { cartCount } = useCart();

  const [orders, setOrders] = useState<Order[]>([]);

  const [ordersLoading, setOrdersLoading] = useState(false);

  const [ordersError, setOrdersError] = useState("");

  const [cancellingOrderNumber, setCancellingOrderNumber] = useState<string | null>(null);

  const [editingProfile, setEditingProfile] = useState(false);

  const [profileName, setProfileName] = useState("");

  const [profileEmail, setProfileEmail] = useState("");

  const [profileMobile, setProfileMobile] = useState("");

  const [profileBirthDate, setProfileBirthDate] = useState("");

  const [profileOptOut, setProfileOptOut] = useState(false);

  const [profileLoading, setProfileLoading] = useState(false);

  const [profileMessage, setProfileMessage] = useState("");

  const [profileError, setProfileError] = useState("");

  // سال‌های قابل انتخاب برای تاریخ تولد: ۱۰۰ سال قبل تا سال جاری شمسی
  const birthYearRange = useMemo(() => {
    const currentYear = todayJalali().jy;

    return { minYear: currentYear - 100, maxYear: currentYear };
  }, []);

  const [currentPassword, setCurrentPassword] = useState("");

  const [newPassword, setNewPassword] = useState("");

  const [passwordConfirmation, setPasswordConfirmation] = useState("");

  const [passwordLoading, setPasswordLoading] = useState(false);

  const [passwordMessage, setPasswordMessage] = useState("");

  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    if (!user) {
      return;
    }

    setProfileName(user.name);
    setProfileEmail(user.email);
    setProfileMobile(user.phone ?? "");
    setProfileBirthDate(user.birth_date ? user.birth_date.slice(0, 10) : "");
    setProfileOptOut(Boolean(user.birthday_greeting_opt_out));
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const loadOrders = async () => {
      setOrdersLoading(true);
      setOrdersError("");

      try {
        const response = await api.get("/orders");

        const data =
          response.data?.data ?? response.data?.orders ?? response.data ?? [];

        setOrders(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Orders error:", error);
        setOrdersError("دریافت سفارش‌ها با خطا مواجه شد.");
      } finally {
        setOrdersLoading(false);
      }
    };

    loadOrders();
  }, [user]);


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
  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setProfileMessage("");
    setProfileError("");

    const normalizedMobile = toEnglishDigits(profileMobile).replace(/\D/g, "");

    if (normalizedMobile && !/^09\d{9}$/.test(normalizedMobile)) {
      setProfileError("شمارهٔ موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد.");
      return;
    }

    setProfileLoading(true);

    try {
      const response = await api.put("/auth/profile", {
        name: profileName,
        email: profileEmail,
        phone: normalizedMobile || null,
        birth_date: profileBirthDate ? profileBirthDate.slice(0, 10) : null,
        birthday_greeting_opt_out: profileOptOut,
      });

      const updatedUser = response.data?.user;

      if (updatedUser) {
        setUser(updatedUser);

        localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(updatedUser));
      }

      setProfileMessage("اطلاعات حساب با موفقیت به‌روزرسانی شد.");

      setEditingProfile(false);
    } catch (error: any) {
      console.error("Profile update error:", error);

      const message =
        error?.response?.data?.message ??
        "به‌روزرسانی اطلاعات حساب با خطا مواجه شد.";

      setProfileError(message);
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setPasswordMessage("");
    setPasswordError("");

    if (newPassword !== passwordConfirmation) {
      setPasswordError("رمز عبور جدید و تکرار آن یکسان نیستند.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("رمز عبور جدید باید حداقل ۸ کاراکتر باشد.");
      return;
    }

    setPasswordLoading(true);

    try {
      const response = await api.put("/auth/password", {
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: passwordConfirmation,
      });

      setPasswordMessage(
        response.data?.message ?? "رمز عبور با موفقیت تغییر کرد.",
      );

      setCurrentPassword("");
      setNewPassword("");
      setPasswordConfirmation("");
    } catch (error: any) {
      console.error("Password change error:", error);

      const responseErrors = error?.response?.data?.errors;

      if (responseErrors) {
        const firstError = Object.values(responseErrors)
          .flat()
          .find((message) => typeof message === "string");

        setPasswordError(
          typeof firstError === "string"
            ? firstError
            : "اطلاعات واردشده صحیح نیست.",
        );
      } else {
        setPasswordError(
          error?.response?.data?.message ?? "تغییر رمز عبور انجام نشد.",
        );
      }
    } finally {
      setPasswordLoading(false);
    }
  };

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
          wrapper: "bg-gold-50 text-gold border-gold-100",
          accent: "bg-gold",
          icon: Clock3,
        };

      case "processing":
        return {
          wrapper: "bg-brand-50 text-brand-700 border-brand-200",
          accent: "bg-brand-500",
          icon: Package,
        };

      case "shipped":
        return {
          wrapper: "bg-brand-100 text-brand-700 border-brand-250",
          accent: "bg-brand-500",
          icon: Truck,
        };

      case "delivered":
        return {
          wrapper: "bg-brand-50 text-stock-700 border-brand-200",
          accent: "bg-stock",
          icon: CheckCircle2,
        };

      case "cancelled":
        return {
          wrapper: "bg-blush-50 text-discount border-blush-200",
          accent: "bg-discount",
          icon: XCircle,
        };

      default:
        return {
          wrapper: "bg-cream text-muted border-line",
          accent: "bg-muted-soft",
          icon: Package,
        };
    }
  };

  const getPaymentStyle = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-brand-50 text-stock-700 border-brand-200";

      case "failed":
        return "bg-blush-50 text-discount border-blush-200";

      case "refunded":
        return "bg-brand-100 text-brand-700 border-brand-250";

      default:
        return "bg-cream text-muted border-line";
    }
  };

  const getOrderImage = (order: Order) => {
    const firstItem = order.items?.[0];

    if (!firstItem) {
      return null;
    }

    if (firstItem.product?.thumbnail) {
      return getStorageUrl(firstItem.product.thumbnail);
    }

    const images = firstItem.product?.images ?? [];

    if (images.length === 0) {
      return null;
    }

    const primaryImage = images.find((image) => image.is_primary);

    const selectedImage =
      primaryImage ??
      [...images].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0];

    return getStorageUrl(selectedImage?.path);
  };

  if (!user) {
    return (
      <Layout>
        <main className="max-w-4xl mx-auto px-6 py-16">
          <div className="bg-white rounded-3xl border border-line shadow-sm p-10 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <User size={30} />
            </div>

            <h1 className="text-2xl font-black mt-5">ورود به حساب کاربری</h1>

            <p className="text-muted mt-2">
              برای مشاهده اطلاعات حساب، ابتدا وارد شوید.
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
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted hover:text-brand-600 transition-colors"
          >
            <ArrowRight size={17} />
            بازگشت به فروشگاه
          </Link>

          <h1 className="text-2xl sm:text-3xl font-black text-ink mt-5">
            حساب کاربری من
          </h1>

          <p className="text-muted mt-2">
            مدیریت اطلاعات حساب و مشاهده سفارش‌های شما
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl border border-line shadow-sm p-5 sm:p-7">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-line">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
                    <User size={30} />
                  </div>

                  <div>
                    <h2 className="text-xl font-black">{user.name}</h2>

                    <p className="text-muted text-sm mt-1">
                      حساب کاربری بهرنگ شاپ
                    </p>
                  </div>
                </div>

                {!editingProfile && (
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMessage("");
                      setProfileError("");
                      setEditingProfile(true);
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-50 text-brand-600 px-4 py-2 font-bold text-sm"
                  >
                    <Pencil size={17} />
                    ویرایش
                  </button>
                )}
              </div>

              {profileMessage && (
                <div className="mt-5 bg-brand-50 text-stock-700 rounded-xl p-4 text-sm font-bold">
                  {profileMessage}
                </div>
              )}

              {profileError && (
                <div className="mt-5 bg-blush-50 text-discount rounded-xl p-4 text-sm font-bold">
                  {profileError}
                </div>
              )}

              {!editingProfile ? (
                <div className="mt-7 space-y-5">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-cream flex items-center justify-center">
                      <User size={20} />
                    </div>

                    <div>
                      <p className="text-xs text-muted-soft">
                        نام و نام خانوادگی
                      </p>

                      <p className="font-bold mt-1">{user.name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-cream flex items-center justify-center">
                      <Mail size={20} />
                    </div>

                    <div>
                      <p className="text-xs text-muted-soft">ایمیل</p>

                      <p className="font-bold mt-1">{user.email}</p>
                    </div>
                  </div>

                  {user.phone && (
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-xl bg-cream flex items-center justify-center">
                        <Phone size={20} />
                      </div>

                      <div>
                        <p className="text-xs text-muted-soft">شمارهٔ موبایل</p>

                        <p className="font-bold mt-1" dir="ltr">
                          {user.phone}
                        </p>
                      </div>
                    </div>
                  )}

                  {user.birth_date && (
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-xl bg-cream flex items-center justify-center">
                        <Cake size={20} />
                      </div>

                      <div>
                        <p className="text-xs text-muted-soft">تاریخ تولد</p>

                        <p className="font-bold mt-1">
                          {formatJalaliShort(user.birth_date)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleProfileSubmit} className="mt-7 space-y-5">
                  <div>
                    <label className="block text-sm font-bold mb-2">
                      نام و نام خانوادگی
                    </label>

                    <input
                      type="text"
                      value={profileName}
                      onChange={(event) => setProfileName(event.target.value)}
                      required
                      className="w-full rounded-xl border border-line px-4 py-3 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-2">
                      ایمیل
                    </label>

                    <input
                      type="email"
                      value={profileEmail}
                      onChange={(event) => setProfileEmail(event.target.value)}
                      required
                      dir="ltr"
                      className="w-full rounded-xl border border-line px-4 py-3 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-2">
                      شمارهٔ موبایل{" "}
                      <span className="text-xs font-normal text-muted-soft">
                        (اختیاری)
                      </span>
                    </label>

                    <input
                      type="tel"
                      inputMode="numeric"
                      value={profileMobile}
                      onChange={(event) => setProfileMobile(event.target.value)}
                      placeholder="09121234567"
                      autoComplete="tel"
                      dir="ltr"
                      className="w-full rounded-xl border border-line px-4 py-3 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-sm font-bold mb-2">
                      <Cake size={16} className="text-brand-600" />
                      تاریخ تولد{" "}
                      <span className="text-xs font-normal text-muted-soft">
                        (اختیاری)
                      </span>
                    </label>

                    <JalaliDatePicker
                      value={profileBirthDate}
                      onChange={setProfileBirthDate}
                      withTime={false}
                      minYear={birthYearRange.minYear}
                      maxYear={birthYearRange.maxYear}
                      placeholder="انتخاب تاریخ تولد"
                    />

                    <p className="mt-1.5 text-xs text-muted-soft">
                      برای دریافت تخفیفات و جشنواره‌های مخصوص روز تولد شما.
                    </p>
                  </div>

                  <label className="flex items-start gap-3 rounded-xl border border-line px-4 py-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!profileOptOut}
                      onChange={(event) =>
                        setProfileOptOut(!event.target.checked)
                      }
                      className="mt-1 h-4 w-4 accent-brand-600"
                    />

                    <span className="text-sm text-ink-soft">
                      می‌خواهم تخفیفات و جشنواره‌های مخصوص روز تولد را دریافت کنم.
                    </span>
                  </label>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={profileLoading}
                      className="inline-flex items-center justify-center gap-2 flex-1 rounded-xl bg-brand-600 text-white py-3 font-bold disabled:opacity-60"
                    >
                      {profileLoading ? (
                        <>
                          <Loader2 size={19} className="animate-spin" />
                          در حال ذخیره...
                        </>
                      ) : (
                        <>
                          <Save size={19} />
                          ذخیره تغییرات
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setProfileName(user.name);
                        setProfileEmail(user.email);
                        setProfileError("");
                        setProfileMessage("");
                        setEditingProfile(false);
                      }}
                      className="rounded-xl bg-line text-ink-soft px-5 py-3 font-bold"
                    >
                      انصراف
                    </button>
                  </div>
                </form>
              )}

              {!editingProfile && (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-8 w-full rounded-xl bg-blush-50 text-discount py-3 font-bold"
                >
                  خروج از حساب کاربری
                </button>
              )}
            </div>

            <AddressBookSection />

            <div className="bg-white rounded-3xl border border-line shadow-sm p-5 sm:p-7">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gold-50 text-gold flex items-center justify-center">
                  <Lock size={24} />
                </div>

                <div>
                  <h2 className="text-xl font-black">تغییر رمز عبور</h2>

                  <p className="text-sm text-muted">
                    برای امنیت بیشتر، رمز حساب خود را مدیریت کنید
                  </p>
                </div>
              </div>

              {passwordMessage && (
                <div className="mb-5 bg-brand-50 text-stock-700 rounded-xl p-4 text-sm font-bold">
                  {passwordMessage}
                </div>
              )}

              {passwordError && (
                <div className="mb-5 bg-blush-50 text-discount rounded-xl p-4 text-sm font-bold">
                  {passwordError}
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold mb-2">
                    رمز عبور فعلی
                  </label>

                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full rounded-xl border border-line px-4 py-3 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">
                    رمز عبور جدید
                  </label>

                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="حداقل ۸ کاراکتر"
                    className="w-full rounded-xl border border-line px-4 py-3 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">
                    تکرار رمز عبور جدید
                  </label>

                  <input
                    type="password"
                    value={passwordConfirmation}
                    onChange={(event) =>
                      setPasswordConfirmation(event.target.value)
                    }
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="تکرار رمز عبور جدید"
                    className="w-full rounded-xl border border-line px-4 py-3 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                </div>

                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="inline-flex items-center justify-center gap-2 w-full rounded-xl bg-ink text-white py-3.5 font-bold disabled:opacity-60"
                >
                  {passwordLoading ? (
                    <>
                      <Loader2 size={19} className="animate-spin" />
                      در حال تغییر رمز...
                    </>
                  ) : (
                    <>
                      <Lock size={19} />
                      تغییر رمز عبور
                    </>
                  )}
                </button>
              </form>
            </div>

            <div className="bg-white rounded-3xl border border-line shadow-sm p-5 sm:p-7">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                  <Package size={24} />
                </div>

                <div>
                  <h2 className="text-xl font-black">سفارش‌های من</h2>

                  <p className="text-sm text-muted">
                    تاریخچه سفارش‌های ثبت شده
                  </p>
                </div>

                {orders.length > 0 && (
                  <span className="mr-auto min-w-8 h-8 px-2 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center text-sm font-black">
                    {orders.length.toLocaleString("fa-IR")}
                  </span>
                )}
              </div>


              {ordersLoading && (
                <div className="py-10 text-center">
                  <Loader2
                    size={32}
                    className="mx-auto animate-spin text-brand-600"
                  />

                  <p className="mt-4 text-muted">
                    در حال دریافت سفارش‌ها...
                  </p>
                </div>
              )}

              {!ordersLoading && ordersError && (
                <div className="bg-blush-50 text-discount rounded-xl p-5">
                  {ordersError}
                </div>
              )}

              {!ordersLoading && !ordersError && orders.length === 0 && (
                <div className="text-center py-10">
                  <Package size={48} className="mx-auto text-line-strong" />

                  <h3 className="font-black mt-4">هنوز سفارشی ثبت نکرده‌اید</h3>

                  <Link
                    to="/products"
                    className="inline-flex mt-5 bg-brand-600 text-white px-6 py-3 rounded-xl font-bold"
                  >
                    مشاهده محصولات
                  </Link>
                </div>
              )}

              {!ordersLoading && !ordersError && orders.length > 0 && (
                <div className="space-y-5">
                  {orders.map((order) => {
                    const statusStyle = getStatusStyle(order.status);

                    const StatusIcon = statusStyle.icon;

                    const orderImage = getOrderImage(order);

                    const itemCount =
                      order.items?.reduce(
                        (sum, item) => sum + Number(item.quantity),
                        0,
                      ) ?? 0;

                    const firstItem = order.items?.[0];

                    const originalAmount = Number(order.subtotal ?? 0);

                    const discountAmount = Number(order.discount ?? 0);

                    const finalAmount = Number(order.total ?? 0);

                    const shippingCost = Number(order.shipping_cost ?? 0);

                    /*
                     * سفارش پرداخت‌نشده (و لغو‌نشده) می‌تواند مرحلهٔ پرداخت را
                     * ادامه دهد؛ همان شرطی که سرور در pay() بررسی می‌کند.
                     * سفارش «پرداخت در محل» مرحلهٔ پرداخت آنلاین ندارد.
                     */
                    const canContinuePayment =
                      order.payment_status === "unpaid" &&
                      order.payment_method !== "cod" &&
                      !["cancelled", "canceled"].includes(order.status);

                    // لغو سفارش فقط تا پیش از ارسال و برای سفارش پرداخت‌نشده.
                    const canCancelOrder =
                      order.payment_status !== "paid" &&
                      !["shipped", "delivered", "cancelled", "canceled"].includes(
                        order.status,
                      );

                    return (
                      <div
                        key={order.id}
                        className="relative overflow-hidden rounded-2xl border border-line bg-white shadow-sm"
                      >
                        <div
                          className={`absolute right-0 top-0 bottom-0 w-1.5 ${statusStyle.accent}`}
                        />

                        <Link
                          to={`/account/orders/${order.order_number}`}
                          className="group block"
                        >
                          <div className="p-4 sm:p-5 pr-5 sm:pr-6">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                              <div className="flex items-start gap-4 min-w-0">
                                <div className="w-16 h-16 rounded-2xl bg-cream border border-line overflow-hidden flex-shrink-0">
                                  {orderImage ? (
                                    <img
                                      src={orderImage}
                                      alt={
                                        firstItem?.product?.name ??
                                        firstItem?.product_name ??
                                        "محصول سفارش"
                                      }
                                      className="w-full h-full object-contain p-1"
                                      onError={(event) => {
                                        event.currentTarget.style.display =
                                          "none";
                                      }}
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-line-strong">
                                      <Package size={27} />
                                    </div>
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <p className="text-xs text-muted-soft">
                                    شماره سفارش
                                  </p>

                                  <p
                                    className="font-black text-brand-600 mt-1"
                                    dir="ltr"
                                  >
                                    {order.order_number}
                                  </p>

                                  {firstItem && (
                                    <p className="text-sm text-muted mt-1 max-w-[260px] truncate">
                                      {firstItem.product?.name ??
                                        firstItem.product_name}

                                      {order.items.length > 1 &&
                                        ` و ${
                                          order.items.length - 1
                                        } کالای دیگر`}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-row sm:flex-col items-start sm:items-end gap-2">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold ${statusStyle.wrapper}`}
                                >
                                  <StatusIcon size={14} />
                                  {getOrderStatus(order.status)}
                                </span>

                                <span
                                  className={`inline-flex items-center px-3 py-1.5 rounded-full border text-xs font-bold ${getPaymentStyle(
                                    order.payment_status,
                                  )}`}
                                >
                                  <CreditCard size={13} className="ml-1" />

                                  {getPaymentStatus(order.payment_status)}
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
                              <div
                                className="rounded-xl bg-cream border border-line p-4"
                                style={{
                                  direction: "ltr",
                                  textAlign: "left",
                                }}
                              >
                                <div className="text-xs text-muted-soft mb-1">
                                  مبلغ اصلی کالاها
                                </div>

                                <div className="text-base font-bold text-ink-soft whitespace-nowrap">
                                  {formatPrice(originalAmount)} تومان
                                </div>
                              </div>

                              {discountAmount > 0 ? (
                                <div
                                  className="rounded-xl bg-blush-50 border border-blush-100 p-4"
                                  style={{
                                    direction: "ltr",
                                    textAlign: "left",
                                  }}
                                >
                                  <div className="flex items-center gap-1.5 text-xs text-discount mb-1">
                                    <Tag size={13} />
                                    تخفیف
                                  </div>

                                  <div className="text-base font-black text-discount whitespace-nowrap">
                                    - {formatPrice(discountAmount)} تومان
                                  </div>
                                </div>
                              ) : (
                                <div
                                  className="rounded-xl bg-cream border border-line p-4"
                                  style={{
                                    direction: "ltr",
                                    textAlign: "left",
                                  }}
                                >
                                  <div className="text-xs text-muted-soft mb-1">
                                    تخفیف
                                  </div>

                                  <div className="text-base font-bold text-muted">
                                    بدون تخفیف
                                  </div>
                                </div>
                              )}
                            </div>

                            <div
                              className="mt-3 rounded-xl bg-brand-50 border border-brand-100 p-4"
                              style={{
                                direction: "ltr",
                                textAlign: "left",
                              }}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div>
                                  <div className="text-xs text-brand-500 mb-1">
                                    مبلغ نهایی سفارش
                                  </div>

                                  <div className="text-xl font-black text-brand-700 whitespace-nowrap">
                                    {formatPrice(finalAmount)} تومان
                                  </div>
                                </div>

                                <div className="text-xs text-muted">
                                  {shippingCost === 0
                                    ? "ارسال رایگان"
                                    : `هزینه ارسال: ${formatPrice(
                                        shippingCost,
                                      )} تومان`}
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-5 pt-5 border-t border-line">
                              <div>
                                <div className="flex items-center gap-1.5 text-xs text-muted-soft">
                                  <CalendarDays size={14} />
                                  تاریخ
                                </div>

                                <p className="font-bold text-ink mt-1">
                                  {formatDate(order.created_at)}
                                </p>
                              </div>

                              <div>
                                <div className="flex items-center gap-1.5 text-xs text-muted-soft">
                                  <Package size={14} />
                                  تعداد کالا
                                </div>

                                <p className="font-bold text-ink mt-1">
                                  {itemCount.toLocaleString("fa-IR")} کالا
                                </p>
                              </div>

                              <div className="col-span-2 md:col-span-1">
                                <div className="flex items-center gap-1.5 text-xs text-muted-soft">
                                  <CreditCard size={14} />
                                  وضعیت پرداخت
                                </div>

                                <p className="font-bold text-ink mt-1">
                                  {getPaymentStatus(order.payment_status)}
                                </p>

                                <p className="text-[11px] text-muted-soft mt-1">
                                  {order.payment_method === "cod"
                                    ? "پرداخت در محل"
                                    : "پرداخت آنلاین"}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="px-5 py-3 bg-cream border-t border-line flex items-center justify-between gap-3 group-hover:bg-brand-50 transition">
                            <span className="text-sm font-bold text-muted group-hover:text-brand-600">
                              مشاهده جزئیات سفارش
                            </span>

                            <ChevronLeft
                              size={18}
                              className="text-muted-soft group-hover:text-brand-600 group-hover:-translate-x-1 transition"
                            />
                          </div>
                        </Link>
                        {(canContinuePayment || canCancelOrder) && (
                          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-white px-5 py-3">
                            {canContinuePayment && (
                              <Link
                                to={`/payment/${encodeURIComponent(order.order_number)}`}
                                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-brand-700 hover:shadow-md active:scale-[0.99]"
                              >
                                <CreditCard size={16} />
                                ادامه خرید
                              </Link>
                            )}

                            {canCancelOrder && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleCancelOrder(order.order_number)
                                }
                                disabled={
                                  cancellingOrderNumber === order.order_number
                                }
                                className="inline-flex items-center gap-2 rounded-xl border border-blush-200 px-4 py-2 text-sm font-bold text-discount transition hover:bg-blush-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {cancellingOrderNumber === order.order_number ? (
                                  <Loader2 size={16} className="animate-spin" />
                                ) : (
                                  <XCircle size={16} />
                                )}
                                {cancellingOrderNumber === order.order_number
                                  ? "در حال لغو..."
                                  : "لغو سفارش"}
                              </button>
                            )}
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <Link
              to="/cart"
              className="block bg-white rounded-3xl border border-line shadow-sm p-6 hover:border-brand-200 hover:shadow-md transition"
            >
              <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                <ShoppingCart size={24} />
              </div>

              <h3 className="font-black mt-5">سبد خرید</h3>

              <p className="text-sm text-muted mt-2">
                {cartCount > 0
                  ? `${cartCount.toLocaleString("fa-IR")} کالا در سبد خرید`
                  : "سبد خرید شما خالی است"}
              </p>

              <div className="mt-5 flex items-center justify-between text-sm font-bold text-brand-600">
                <span>مشاهده سبد خرید</span>

                <ChevronLeft size={17} />
              </div>
            </Link>

            <div className="bg-ink text-white rounded-3xl p-6">
              <p className="text-sm text-line-strong">خوش آمدید</p>

              <h3 className="font-black text-lg mt-2">{user.name}</h3>

              <p className="text-sm text-muted-soft mt-3 leading-6">
                از حساب کاربری خود برای مدیریت خریدها و سفارش‌های آینده استفاده
                کنید.
              </p>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
}

export default Account;
