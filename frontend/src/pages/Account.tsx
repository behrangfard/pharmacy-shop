import { useEffect, useMemo, useState, type FormEvent } from "react";

import { Link, useNavigate } from "react-router-dom";

import {
  ArrowRight,
  Mail,
  ShoppingCart,
  User,
  Loader2,
  Pencil,
  Save,
  Lock,
  ChevronLeft,
  ChevronDown,
  Cake,
  Phone,
} from "lucide-react";

import Layout from "../components/Layout";
import AccountNameMenu from "../components/AccountNameMenu";
import AddressBookSection from "../components/AddressBookSection";
import JalaliDatePicker from "../components/JalaliDatePicker";
import StoreChannelsSection from "../components/StoreChannelsSection";
import { usePrivatePageMeta } from "../hooks/usePageMeta";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import api from "../services/api";
import { STORAGE_KEYS } from "../utils/storageKeys";
import { formatJalaliShort, toEnglishDigits, todayJalali } from "../utils/jalali";

function Account() {
  usePrivatePageMeta("حساب کاربری", "/account");

  const navigate = useNavigate();

  const { user, setUser, logout } = useAuth();

  const { cartCount } = useCart();

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

  // فرم تغییر رمز به‌صورت پیش‌فرض بسته است تا صفحهٔ حساب کوتاه‌تر بماند.
  const [showPasswordForm, setShowPasswordForm] = useState(false);

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
        <div className="mb-6">
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
            اطلاعات حساب، آدرس‌ها و امنیت حساب خود را مدیریت کنید.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-6 md:col-span-2 md:row-start-1">
            <div className="bg-white rounded-3xl border border-line shadow-sm p-5 sm:p-7">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-line">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
                    <User size={30} />
                  </div>

                  <div>
                    {/* نام حساب، منوی میان‌بر «سفارش‌های من» و «حساب کاربری من» را باز می‌کند. */}
                    <AccountNameMenu name={user.name} />

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
              <button
                type="button"
                onClick={() => setShowPasswordForm((current) => !current)}
                aria-expanded={showPasswordForm}
                aria-controls="account-password-form"
                className="flex w-full items-center gap-3 text-right"
              >
                <div className="w-12 h-12 rounded-xl bg-gold-50 text-gold flex items-center justify-center">
                  <Lock size={24} />
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-black">تغییر رمز عبور</h2>

                  <p className="text-sm text-muted">
                    برای امنیت بیشتر، رمز حساب خود را به‌روز کنید
                  </p>
                </div>

                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cream text-muted-soft">
                  {showPasswordForm ? (
                    <ChevronDown size={18} />
                  ) : (
                    <ChevronLeft size={18} />
                  )}
                </span>
              </button>

              {passwordMessage && (
                <div className="mt-5 mb-5 bg-brand-50 text-stock-700 rounded-xl p-4 text-sm font-bold">
                  {passwordMessage}
                </div>
              )}

              {passwordError && (
                <div className="mt-5 mb-5 bg-blush-50 text-discount rounded-xl p-4 text-sm font-bold">
                  {passwordError}
                </div>
              )}

              <form
                id="account-password-form"
                onSubmit={handlePasswordSubmit}
                className={showPasswordForm ? "mt-5 space-y-5" : "hidden"}
              >
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
          </div>

          <div className="space-y-6 md:col-start-3 md:row-start-1">
            <StoreChannelsSection />

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
