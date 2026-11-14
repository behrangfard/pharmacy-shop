import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowLeft, Loader2, Mail, MailCheck } from "lucide-react";

import Layout from "../components/Layout";
import { usePrivatePageMeta } from "../hooks/usePageMeta";
import api from "../services/api";

/**
 * درخواست لینک بازیابی رمز عبور.
 *
 * پاسخ سرور عمداً همیشه یکسان است تا مشخص نشود ایمیل در فروشگاه حساب دارد
 * یا نه. در محیط توسعه (debug) ممکن است لینک آماده هم برگردد.
 */
function ForgotPassword() {
  usePrivatePageMeta("بازیابی رمز عبور", "/forgot-password");

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [debugUrl, setDebugUrl] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setError("");
    setMessage("");
    setDebugUrl("");

    try {
      const response = await api.post("/auth/forgot-password", {
        email: email.trim(),
      });

      setMessage(
        response.data?.message ??
          "اگر این ایمیل در فروشگاه ثبت شده باشد، لینک بازیابی ارسال می‌شود.",
      );

      if (typeof response.data?.debug_reset_url === "string") {
        setDebugUrl(response.data.debug_reset_url);
      }
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
              "ارسال درخواست ممکن نشد. لطفاً دوباره تلاش کنید.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <main
        dir="rtl"
        className="flex min-h-[70vh] items-center justify-center bg-cream p-6"
      >
        <div className="w-full max-w-md rounded-3xl border border-line bg-white p-8 shadow-sm">
          <div className="mb-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <Mail size={30} />
            </div>

            <h1 className="mt-5 text-2xl font-black text-ink">
              بازیابی رمز عبور
            </h1>

            <p className="mt-2 leading-7 text-muted">
              ایمیل حساب خود را وارد کنید؛ لینک تعیین رمز جدید برای شما ارسال
              می‌شود.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-blush-100 bg-blush-50 p-3 text-sm text-discount"
            >
              {error}
            </div>
          )}

          {message && (
            <div
              role="status"
              className="mb-5 rounded-xl border border-brand-100 bg-brand-50 p-4 text-sm leading-7 text-brand-700"
            >
              <div className="mb-1 flex items-center gap-2 font-black">
                <MailCheck size={18} />
                درخواست ثبت شد
              </div>
              {message}

              {debugUrl && (
                <a
                  href={debugUrl}
                  className="mt-3 block break-all text-xs font-bold text-brand-600 underline"
                >
                  (محیط توسعه) باز کردن لینک تعیین رمز جدید
                </a>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="forgot-email"
                className="mb-2 block text-sm font-bold text-ink-soft"
              >
                ایمیل
              </label>

              <div className="relative">
                <input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="example@email.com"
                  autoComplete="email"
                  required
                  className="w-full rounded-xl border border-line py-3 pr-11 pl-4 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />

                <Mail
                  size={19}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-soft"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-brand-600 p-3.5 font-bold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={18} className="animate-spin" />
                  در حال ارسال...
                </span>
              ) : (
                "ارسال لینک بازیابی"
              )}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between text-sm">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 font-bold text-brand-600 hover:text-brand-700"
            >
              <ArrowRight size={16} />
              بازگشت به ورود
            </Link>

            <Link
              to="/track-order"
              className="inline-flex items-center gap-1 text-muted-soft hover:text-brand-600"
            >
              رهگیری سفارش
              <ArrowLeft size={14} />
            </Link>
          </div>
        </div>
      </main>
    </Layout>
  );
}

export default ForgotPassword;
