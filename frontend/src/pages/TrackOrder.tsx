import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  Ban,
  Check,
  CheckCircle2,
  Copy,
  FileText,
  KeyRound,
  Loader2,
  Package,
  Phone,
  Search,
  Truck,
} from "lucide-react";

import Layout from "../components/Layout";
import { usePrivatePageMeta } from "../hooks/usePageMeta";
import api from "../services/api";
import { formatJalaliDateTime, toEnglishDigits } from "../utils/jalali";
import { STORAGE_KEYS } from "../utils/storageKeys";

type TrackingEvent = {
  status: string;
  note: string | null;
  happened_at: string | null;
};

type TrackingShipment = {
  shipment_number: string;
  status: string;
  status_label: string;
  carrier: string | null;
  tracking_code: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  events: TrackingEvent[];
};

type TrackingItem = {
  product_name: string;
  variant_name: string | null;
  color_name: string | null;
  pack_colors: { name: string; color: string }[] | null;
  quantity: number;
  unit_price: number;
  total_price: number;
};

type TrackingOrder = {
  order_number: string;
  status: string;
  status_label: string;
  payment_status: string;
  payment_method: string;
  recipient_name: string;
  phone_masked: string;
  address: string;
  created_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  shipping_method: string | null;
  tracking_code: string | null;
  subtotal: number;
  discount: number;
  coupon_discount: number;
  shipping_cost: number;
  tax_amount: number;
  total: number;
  items: TrackingItem[];
  shipments: TrackingShipment[];
};

const STATUS_STEPS = [
  { value: "pending", label: "ثبت سفارش" },
  { value: "processing", label: "در حال آماده‌سازی" },
  { value: "shipped", label: "ارسال‌شده" },
  { value: "delivered", label: "تحویل‌شده" },
] as const;

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: "پرداخت‌نشده",
  paid: "پرداخت‌شده",
  refunded: "بازگشت وجه",
  failed: "ناموفق",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  online: "پرداخت آنلاین",
  cod: "پرداخت در محل",
};

const formatPrice = (value: number) =>
  new Intl.NumberFormat("fa-IR").format(Math.round(Number(value) || 0));

const formatDate = (value: string | null) =>
  value ? formatJalaliDateTime(value) : "—";

/** نمایش خوانای کد پیگیری مهمان: ABCD-2345 */
const formatAccessCode = (code: string) =>
  code
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .match(/.{1,4}/g)
    ?.join("-") ?? "";

/**
 * صفحهٔ عمومی رهگیری سفارش.
 *
 * مشتری (حتی بدون حساب) با «شماره سفارش + شماره تماس» وضعیت را می‌بیند.
 * سرور شماره تماس را ماسک می‌کند و امکان هیچ تغییری در این صفحه نیست.
 */
function TrackOrder() {
  usePrivatePageMeta("رهگیری سفارش", "/track-order");

  const location = useLocation();
  const [searchParams] = useSearchParams();
  const autoRan = useRef(false);

  const [orderNumber, setOrderNumber] = useState(
    searchParams.get("order")?.trim() ?? "",
  );
  const [phone, setPhone] = useState(
    (location.state as { phone?: string } | null)?.phone ?? "",
  );

  /*
   * کد پیگیری مهمان فقط در پاسخ ثبت سفارش برمی‌گردد و از چک‌اوت به این صفحه
   * می‌آید. مشتری با «شماره سفارش + این کد» در مرورگر جدید دسترسی را
   * بازیابی می‌کند (فاکتور و لغو سفارش).
   */
  const savedAccessCode =
    (location.state as { accessCode?: string } | null)?.accessCode ?? "";

  const [accessCodeInput, setAccessCodeInput] = useState(savedAccessCode);
  const [recovering, setRecovering] = useState(false);
  const [recoverError, setRecoverError] = useState("");
  const [recoverNotice, setRecoverNotice] = useState("");
  const [copiedAccessCode, setCopiedAccessCode] = useState(false);

  const [order, setOrder] = useState<TrackingOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionNotice, setActionNotice] = useState("");

  const registered = searchParams.get("registered") === "1";
  // کاربر واردشده از جزئیات حساب لغو می‌کند؛ دکمهٔ لغو فقط برای مهمان است.
  const isGuest = !localStorage.getItem(STORAGE_KEYS.token);

  const runTrack = useCallback(
    async (orderNumberValue: string, phoneValue: string) => {
      const normalizedOrder = toEnglishDigits(orderNumberValue).trim();
      const normalizedPhone = toEnglishDigits(phoneValue)
        .replace(/\D/g, "")
        .trim();

      if (!normalizedOrder || normalizedPhone.length < 10) {
        setError("شماره سفارش و شماره تماس معتبر را وارد کنید.");
        return;
      }

      setLoading(true);
      setError("");
      setActionError("");
      setActionNotice("");
      setOrder(null);

      try {
        const response = await api.post("/orders/track", {
          order_number: normalizedOrder,
          phone: normalizedPhone,
        });

        setOrder(response.data?.data ?? null);
      } catch (requestError: any) {
        const validationMessage = Object.values(
          requestError?.response?.data?.errors ?? {},
        )
          .flat()
          .find((item) => typeof item === "string");

        setError(
          typeof validationMessage === "string"
            ? validationMessage
            : requestError?.response?.data?.message ??
                "رهگیری سفارش ممکن نشد. لطفاً دوباره تلاش کنید.",
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // اگر از صفحهٔ تسویه با شماره سفارش و تلفن آمده‌ایم، خودکار رهگیری کن.
  useEffect(() => {
    if (autoRan.current) return;

    const initialOrder = searchParams.get("order")?.trim() ?? "";
    const initialPhone =
      (location.state as { phone?: string } | null)?.phone ?? "";

    if (initialOrder && initialPhone) {
      autoRan.current = true;
      setOrderNumber(initialOrder);
      setPhone(initialPhone);
      void runTrack(initialOrder, initialPhone);
    }
  }, [location.state, runTrack, searchParams]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (loading) return;

    void runTrack(orderNumber, phone);
  };

  /**
   * لغو سفارش مهمان با همان شناسهٔ مرورگر (هدر توسط api ارسال می‌شود).
   * پاسخ موفق، وضعیت را بدون نیاز به شماره تماس دوباره به‌روز می‌کند.
   */
  const handleCancel = async () => {
    if (!order || cancelling) return;

    if (
      !window.confirm("این سفارش لغو شود؟ با لغو، موجودی کالاها آزاد می‌شود.")
    ) {
      return;
    }

    setCancelling(true);
    setActionError("");
    setActionNotice("");

    try {
      await api.post(
        `/orders/${encodeURIComponent(order.order_number)}/cancel`,
      );

      setOrder((previous) =>
        previous
          ? { ...previous, status: "cancelled", status_label: "لغوشده" }
          : previous,
      );
      setActionNotice("سفارش شما لغو شد و موجودی کالاها آزاد شد.");
    } catch (requestError: any) {
      setActionError(
        requestError?.response?.data?.message ??
          "لغو سفارش انجام نشد. لطفاً دوباره تلاش کنید.",
      );
    } finally {
      setCancelling(false);
    }
  };

  /**
   * بازیابی دسترسی مهمان در مرورگر جدید.
   *
   * سرور با «شماره سفارش + کد پیگیری» همان شناسهٔ مرورگر قبلی را برمی‌گرداند؛
   * آن را در localStorage ذخیره می‌کنیم تا فاکتور و لغو سفارش مثل قبل کار کند.
   */
  const handleRecover = async () => {
    if (recovering) return;

    const normalizedOrder = toEnglishDigits(orderNumber).trim();
    const normalizedCode = toEnglishDigits(accessCodeInput)
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase();

    if (!normalizedOrder || normalizedCode.length < 8) {
      setRecoverError("شماره سفارش و کد پیگیری ۸ کاراکتری را وارد کنید.");
      return;
    }

    setRecovering(true);
    setRecoverError("");
    setRecoverNotice("");

    try {
      const response = await api.post("/orders/recover", {
        order_number: normalizedOrder,
        access_code: normalizedCode,
      });

      const guestToken = response.data?.data?.guest_token;

      if (typeof guestToken !== "string" || !guestToken) {
        setRecoverError("بازیابی دسترسی انجام نشد. لطفاً دوباره تلاش کنید.");
        return;
      }

      localStorage.setItem(STORAGE_KEYS.guestToken, guestToken);

      setRecoverNotice(
        "دسترسی شما به این سفارش بازیابی شد. اکنون می‌توانید فاکتور را ببینید یا سفارش را لغو کنید.",
      );

      // اگر وضعیت سفارش هنوز نمایش داده نشده، با هویت تازه دوباره رهگیری می‌کنیم.
      if (!order && phone.trim()) {
        await runTrack(orderNumber, phone);
      }
    } catch (requestError: any) {
      const validationMessage = Object.values(
        requestError?.response?.data?.errors ?? {},
      )
        .flat()
        .find((item) => typeof item === "string");

      setRecoverError(
        typeof validationMessage === "string"
          ? validationMessage
          : requestError?.response?.data?.message ??
              "بازیابی دسترسی ممکن نشد. شماره سفارش و کد پیگیری را بررسی کنید.",
      );
    } finally {
      setRecovering(false);
    }
  };

  /** کپی کد پیگیری در کلیپ‌بورد (برای نگه‌داشتن بیرون از مرورگر). */
  const handleCopyAccessCode = async () => {
    if (!savedAccessCode) return;

    try {
      await navigator.clipboard.writeText(savedAccessCode);
      setCopiedAccessCode(true);
      window.setTimeout(() => setCopiedAccessCode(false), 2000);
    } catch {
      setCopiedAccessCode(false);
    }
  };

  const canCancel = Boolean(
    order &&
      isGuest &&
      order.payment_status === "unpaid" &&
      !["cancelled", "canceled", "shipped", "delivered"].includes(order.status),
  );

  const activeStep = order
    ? STATUS_STEPS.findIndex((step) => step.value === order.status)
    : -1;

  const statusTone =
    order?.status === "cancelled"
      ? "border-blush-100 bg-blush-50 text-discount"
      : "border-brand-100 bg-brand-50 text-brand-700";

  return (
    <Layout>
      <main dir="rtl" className="bg-cream px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
              <Truck size={30} />
            </div>

            <h1 className="mt-5 text-2xl font-black text-ink sm:text-3xl">
              رهگیری سفارش
            </h1>

            <p className="mx-auto mt-2 max-w-lg leading-7 text-muted">
              شماره سفارش و شماره تماسی که هنگام ثبت سفارش وارد کرده‌اید را
              بنویسید. نیازی به ورود به حساب کاربری نیست.
            </p>
          </div>

          {registered && (
            <div
              role="status"
              className="mt-6 flex items-start gap-3 rounded-2xl border border-stock/20 bg-brand-50 p-4 text-sm leading-7 text-brand-700"
            >
              <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
              <span>
                سفارش شما با موفقیت ثبت شد. شمارهٔ سفارش و کد پیگیری مهمان را
                نگه دارید؛ برای پیگیری، همین صفحه را با شماره سفارش و شماره
                تماس باز کنید.
              </span>
            </div>
          )}

          {registered && savedAccessCode && (
            <div className="mt-4 rounded-2xl border border-brand-200 bg-white p-4 text-sm leading-7 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-black text-ink">
                  <KeyRound size={18} aria-hidden="true" />
                  کد پیگیری مهمان
                </span>

                <span
                  className="rounded-xl bg-brand-50 px-3 py-1.5 font-black tracking-[0.2em] text-brand-700"
                  dir="ltr"
                >
                  {formatAccessCode(savedAccessCode)}
                </span>
              </div>

              <p className="mt-2 text-xs leading-7 text-muted">
                این کد را جایی ذخیره کنید. اگر مرورگر عوض شود یا اطلاعات آن پاک
                شود، با «شماره سفارش + کد پیگیری» دوباره به فاکتور و لغو سفارش
                دسترسی خواهید داشت.
              </p>

              <button
                type="button"
                onClick={() => void handleCopyAccessCode()}
                className="mt-3 inline-flex items-center gap-2 rounded-xl border border-line px-3.5 py-2 text-xs font-bold text-ink-soft transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
              >
                {copiedAccessCode ? (
                  <Check size={15} aria-hidden="true" />
                ) : (
                  <Copy size={15} aria-hidden="true" />
                )}
                {copiedAccessCode ? "کد کپی شد" : "کپی کد"}
              </button>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="mt-6 rounded-3xl border border-line bg-white p-5 shadow-sm sm:p-6"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="track-order-number"
                  className="mb-2 block text-sm font-bold text-ink-soft"
                >
                  شماره سفارش
                </label>

                <div className="relative">
                  <input
                    id="track-order-number"
                    value={orderNumber}
                    onChange={(event) => setOrderNumber(event.target.value)}
                    placeholder="ORD-14050101-ABC123"
                    required
                    dir="ltr"
                    className="w-full rounded-xl border border-line py-3 pr-11 pl-4 text-left outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />

                  <Package
                    size={19}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-soft"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="track-phone"
                  className="mb-2 block text-sm font-bold text-ink-soft"
                >
                  شماره تماس
                </label>

                <div className="relative">
                  <input
                    id="track-phone"
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="09120000000"
                    required
                    dir="ltr"
                    className="w-full rounded-xl border border-line py-3 pr-11 pl-4 text-left outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />

                  <Phone
                    size={19}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-soft"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="mt-4 flex items-start gap-2 rounded-xl border border-blush-100 bg-blush-50 p-3 text-sm leading-7 text-discount"
              >
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3.5 font-black text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 size={19} className="animate-spin" />
                  در حال دریافت وضعیت...
                </>
              ) : (
                <>
                  <Search size={19} />
                  مشاهدهٔ وضعیت سفارش
                </>
              )}
            </button>
          </form>

          {isGuest && (
            <details className="group mt-4 rounded-3xl border border-line bg-white p-5 shadow-sm sm:p-6">
              <summary className="list-none cursor-pointer text-sm font-bold text-ink-soft [&::-webkit-details-marker]:hidden">
                دسترسی به سفارش را از دست داده‌اید؟ بازیابی با کد پیگیری
              </summary>

              <p className="mt-3 text-xs leading-7 text-muted">
                کد پیگیری هنگام ثبت سفارش نمایش داده شده است. با «شماره سفارش +
                کد پیگیری» در این مرورگر، فاکتور و امکان لغو سفارش دوباره در
                دسترس قرار می‌گیرد.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="recover-order-number"
                    className="mb-2 block text-sm font-bold text-ink-soft"
                  >
                    شماره سفارش
                  </label>

                  <input
                    id="recover-order-number"
                    value={orderNumber}
                    onChange={(event) => setOrderNumber(event.target.value)}
                    placeholder="ORD-14050101-ABC123"
                    dir="ltr"
                    className="w-full rounded-xl border border-line px-4 py-3 text-left outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="recover-access-code"
                    className="mb-2 block text-sm font-bold text-ink-soft"
                  >
                    کد پیگیری
                  </label>

                  <input
                    id="recover-access-code"
                    value={accessCodeInput}
                    onChange={(event) => setAccessCodeInput(event.target.value)}
                    placeholder="ABCD-2345"
                    dir="ltr"
                    autoComplete="off"
                    className="w-full rounded-xl border border-line px-4 py-3 text-left tracking-[0.2em] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                </div>
              </div>

              {recoverError && (
                <div
                  role="alert"
                  className="mt-4 flex items-start gap-2 rounded-xl border border-blush-100 bg-blush-50 p-3 text-sm leading-7 text-discount"
                >
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <span>{recoverError}</span>
                </div>
              )}

              {recoverNotice && (
                <div
                  role="status"
                  className="mt-4 flex items-start gap-2 rounded-xl border border-stock/20 bg-brand-50 p-3 text-sm leading-7 text-brand-700"
                >
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                  <span>{recoverNotice}</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => void handleRecover()}
                disabled={recovering}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 font-black text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-6"
              >
                {recovering ? (
                  <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                ) : (
                  <KeyRound size={18} aria-hidden="true" />
                )}
                {recovering ? "در حال بازیابی..." : "بازیابی دسترسی"}
              </button>
            </details>
          )}

          {order && (
            <div className="mt-6 space-y-5">
              <section className="rounded-3xl border border-line bg-white p-5 shadow-sm sm:p-7">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
                  <div>
                    <p className="text-xs text-muted-soft">شماره سفارش</p>
                    <p className="mt-1 text-lg font-black text-ink" dir="ltr">
                      {order.order_number}
                    </p>
                  </div>

                  <span
                    className={`rounded-full border px-3 py-1.5 text-xs font-black ${statusTone}`}
                  >
                    {order.status_label}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Link
                    to={`/account/orders/${encodeURIComponent(order.order_number)}/invoice`}
                    className="inline-flex items-center gap-2 rounded-xl border border-line px-3.5 py-2 text-xs font-bold text-ink-soft transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                  >
                    <FileText size={16} aria-hidden="true" />
                    مشاهدهٔ فاکتور
                  </Link>

                  {canCancel && (
                    <button
                      type="button"
                      onClick={() => void handleCancel()}
                      disabled={cancelling}
                      className="inline-flex items-center gap-2 rounded-xl border border-blush-100 px-3.5 py-2 text-xs font-bold text-discount transition hover:bg-blush-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {cancelling ? (
                        <Loader2
                          size={16}
                          className="animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <Ban size={16} aria-hidden="true" />
                      )}
                      لغو سفارش
                    </button>
                  )}
                </div>

                {actionNotice && (
                  <div
                    role="status"
                    className="mt-3 flex items-start gap-2 rounded-xl border border-stock/20 bg-brand-50 p-3 text-sm leading-7 text-brand-700"
                  >
                    <CheckCircle2
                      size={18}
                      className="mt-0.5 shrink-0"
                      aria-hidden="true"
                    />
                    <span>{actionNotice}</span>
                  </div>
                )}

                {actionError && (
                  <div
                    role="alert"
                    className="mt-3 flex items-start gap-2 rounded-xl border border-blush-100 bg-blush-50 p-3 text-sm leading-7 text-discount"
                  >
                    <AlertCircle
                      size={18}
                      className="mt-0.5 shrink-0"
                      aria-hidden="true"
                    />
                    <span>{actionError}</span>
                  </div>
                )}

                {order.status === "cancelled" ? (
                  <p className="mt-4 rounded-xl border border-blush-100 bg-blush-50 p-4 text-sm leading-7 text-discount">
                    این سفارش لغو شده است. برای پیگیری بیشتر با پشتیبانی
                    فروشگاه تماس بگیرید.
                  </p>
                ) : (
                  <ol className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {STATUS_STEPS.map((step, index) => {
                      const passed = activeStep >= index;

                      return (
                        <li
                          key={step.value}
                          className={`rounded-2xl border p-3 text-center ${
                            passed
                              ? "border-brand-250 bg-brand-50"
                              : "border-line bg-cream"
                          }`}
                        >
                          <span
                            className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-xs font-black ${
                              passed
                                ? "bg-brand-500 text-white"
                                : "bg-white text-muted"
                            }`}
                          >
                            {index + 1}
                          </span>

                          <span
                            className={`mt-2 block text-xs font-bold ${
                              passed ? "text-brand-700" : "text-muted"
                            }`}
                          >
                            {step.label}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                )}

                <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-xl bg-cream p-3">
                    <dt className="text-xs text-muted-soft">وضعیت پرداخت</dt>
                    <dd className="mt-1 font-bold text-ink">
                      {PAYMENT_STATUS_LABELS[order.payment_status] ??
                        order.payment_status}
                    </dd>
                  </div>

                  <div className="rounded-xl bg-cream p-3">
                    <dt className="text-xs text-muted-soft">روش پرداخت</dt>
                    <dd className="mt-1 font-bold text-ink">
                      {PAYMENT_METHOD_LABELS[order.payment_method] ??
                        order.payment_method}
                    </dd>
                  </div>

                  <div className="rounded-xl bg-cream p-3">
                    <dt className="text-xs text-muted-soft">گیرنده</dt>
                    <dd className="mt-1 font-bold text-ink">
                      {order.recipient_name} — {order.phone_masked}
                    </dd>
                  </div>

                  <div className="rounded-xl bg-cream p-3">
                    <dt className="text-xs text-muted-soft">تاریخ ثبت</dt>
                    <dd className="mt-1 font-bold text-ink">
                      {formatDate(order.created_at)}
                    </dd>
                  </div>

                  {order.shipping_method && (
                    <div className="rounded-xl bg-cream p-3 sm:col-span-2">
                      <dt className="text-xs text-muted-soft">روش ارسال</dt>
                      <dd className="mt-1 font-bold text-ink">
                        {order.shipping_method}
                      </dd>
                    </div>
                  )}

                  {order.tracking_code && (
                    <div className="rounded-xl bg-cream p-3 sm:col-span-2">
                      <dt className="text-xs text-muted-soft">
                        کد رهگیری مرسوله
                      </dt>
                      <dd
                        className="mt-1 font-black tracking-wide text-ink"
                        dir="ltr"
                      >
                        {order.tracking_code}
                      </dd>
                    </div>
                  )}
                </dl>

                <p className="mt-4 text-xs leading-6 text-muted">
                  آدرس تحویل: {order.address}
                </p>
              </section>

              <section className="rounded-3xl border border-line bg-white p-5 shadow-sm sm:p-7">
                <h2 className="text-lg font-black text-ink">اقلام سفارش</h2>

                <ul className="mt-4 divide-y divide-line">
                  {order.items.map((item, index) => (
                    <li
                      key={`${item.product_name}-${index}`}
                      className="flex items-start justify-between gap-3 py-3"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-ink">
                          {item.product_name}
                        </p>

                        <p className="mt-1 text-xs leading-6 text-muted">
                          {[
                            item.variant_name,
                            item.color_name,
                          ]
                            .filter(Boolean)
                            .join(" • ") || "—"}
                          {" • تعداد: "}
                          {formatPrice(item.quantity)}
                        </p>
                      </div>

                      <span className="shrink-0 text-sm font-black text-brand-700">
                        {formatPrice(item.total_price)} تومان
                      </span>
                    </li>
                  ))}
                </ul>

                <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted">جمع کالاها</dt>
                    <dd className="font-bold">{formatPrice(order.subtotal)}</dd>
                  </div>

                  {order.discount > 0 && (
                    <div className="flex justify-between text-discount">
                      <dt>تخفیف</dt>
                      <dd className="font-bold">
                        {formatPrice(order.discount)}
                      </dd>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <dt className="text-muted">هزینهٔ ارسال</dt>
                    <dd className="font-bold">
                      {order.shipping_cost > 0
                        ? formatPrice(order.shipping_cost)
                        : "رایگان"}
                    </dd>
                  </div>

                  {order.tax_amount > 0 && (
                    <div className="flex justify-between">
                      <dt className="text-muted">مالیات</dt>
                      <dd className="font-bold">
                        {formatPrice(order.tax_amount)}
                      </dd>
                    </div>
                  )}

                  <div className="flex justify-between border-t border-line pt-2 text-base">
                    <dt className="font-black text-ink">مبلغ نهایی</dt>
                    <dd className="font-black text-brand-700">
                      {formatPrice(order.total)} تومان
                    </dd>
                  </div>
                </dl>
              </section>

              {order.shipments.length > 0 && (
                <section className="rounded-3xl border border-line bg-white p-5 shadow-sm sm:p-7">
                  <h2 className="text-lg font-black text-ink">مرسوله‌ها</h2>

                  {order.shipments.map((shipment) => (
                    <div
                      key={shipment.shipment_number}
                      className="mt-4 rounded-2xl border border-line p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <span className="font-bold text-ink" dir="ltr">
                          {shipment.shipment_number}
                        </span>

                        <span className="font-bold text-brand-700">
                          {shipment.status_label}
                        </span>
                      </div>

                      {(shipment.carrier || shipment.tracking_code) && (
                        <p className="mt-2 text-xs text-muted">
                          {[shipment.carrier, shipment.tracking_code]
                            .filter(Boolean)
                            .join(" • ")}
                        </p>
                      )}

                      {shipment.events.length > 0 && (
                        <ul className="mt-3 space-y-2 border-t border-line pt-3 text-xs">
                          {shipment.events.map((event, index) => (
                            <li
                              key={`${event.status}-${index}`}
                              className="flex items-start justify-between gap-2"
                            >
                              <span className="font-bold text-ink-soft">
                                {event.note || event.status}
                              </span>

                              <span className="shrink-0 text-muted-soft">
                                {formatDate(event.happened_at)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </section>
              )}

              <p className="text-center text-xs leading-7 text-muted-soft">
                برای حفظ حریم خصوصی، شمارهٔ تماس به‌صورت ناقص نمایش داده می‌شود.
                سؤالی دارید؟{" "}
                <Link
                  to="/pages/contact"
                  className="font-bold text-brand-600 hover:text-brand-700"
                >
                  با پشتیبانی تماس بگیرید
                </Link>
                .
              </p>
            </div>
          )}
        </div>
      </main>
    </Layout>
  );
}

export default TrackOrder;
