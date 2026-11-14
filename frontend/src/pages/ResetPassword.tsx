import { FormEvent, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Loader2,
  Lock,
  Mail,
} from "lucide-react";

import Layout from "../components/Layout";
import { usePrivatePageMeta } from "../hooks/usePageMeta";
import api from "../services/api";

const inputClass =
  "w-full rounded-xl border border-line py-3 pr-11 pl-4 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

const iconClass =
  "absolute right-3 top-1/2 -translate-y-1/2 text-muted-soft";

/**
 * تعیین رمز عبور جدید با توکن ایمیل بازیابی.
 * آدرس: /reset-password/:token?email=user@example.com
 */
function ResetPassword() {
  usePrivatePageMeta("تعیین رمز عبور جدید", "/reset-password");

  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (loading || !token) return;

    if (password.length < 8) {
      setError("رمز عبور باید حداقل ۸ کاراکتر باشد.");
      return;
    }

    if (password !== passwordConfirmation) {
      setError("رمز عبور و تکرار آن یکسان نیست.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await api.post("/auth/reset-password", {
        token,
        email: email.trim(),
        password,
        password_confirmation: passwordConfirmation,
      });

      setDone(true);
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
              "تعیین رمز جدید ممکن نشد. لطفاً دوباره تلاش کنید.",
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
              {done ? <CheckCircle2 size={30} /> : <KeyRound size={30} />}
            </div>

            <h1 className="mt-5 text-2xl font-black text-ink">
              {done ? "رمز عبور تغییر کرد" : "تعیین رمز عبور جدید"}
            </h1>

            <p className="mt-2 leading-7 text-muted">
              {done
                ? "اکنون می‌توانید با رمز جدید وارد حساب کاربری شوید."
                : "یک رمز عبور قوی (حداقل ۸ کاراکتر) انتخاب کنید."}
            </p>
          </div>

          {!token && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-blush-100 bg-blush-50 p-3 text-sm leading-7 text-discount"
            >
              لینک بازیابی معتبر نیست. لطفاً دوباره درخواست بازیابی ثبت کنید.
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-blush-100 bg-blush-50 p-3 text-sm leading-7 text-discount"
            >
              {error}
            </div>
          )}

          {done ? (
            <Link
              to="/login"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 p-3.5 font-bold text-white transition hover:bg-brand-700"
            >
              ورود به حساب کاربری
              <ArrowRight size={18} />
            </Link>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="reset-email"
                  className="mb-2 block text-sm font-bold text-ink-soft"
                >
                  ایمیل
                </label>

                <div className="relative">
                  <input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    required
                    className={inputClass}
                  />

                  <Mail size={19} className={iconClass} />
                </div>
              </div>

              <div>
                <label
                  htmlFor="reset-password"
                  className="mb-2 block text-sm font-bold text-ink-soft"
                >
                  رمز عبور جدید
                </label>

                <div className="relative">
                  <input
                    id="reset-password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    required
                    className={inputClass}
                  />

                  <Lock size={19} className={iconClass} />
                </div>
              </div>

              <div>
                <label
                  htmlFor="reset-password-confirmation"
                  className="mb-2 block text-sm font-bold text-ink-soft"
                >
                  تکرار رمز عبور جدید
                </label>

                <div className="relative">
                  <input
                    id="reset-password-confirmation"
                    type="password"
                    value={passwordConfirmation}
                    onChange={(event) =>
                      setPasswordConfirmation(event.target.value)
                    }
                    autoComplete="new-password"
                    minLength={8}
                    required
                    className={inputClass}
                  />

                  <Lock size={19} className={iconClass} />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !token}
                className="w-full rounded-xl bg-brand-600 p-3.5 font-bold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={18} className="animate-spin" />
                    در حال ذخیره...
                  </span>
                ) : (
                  "ذخیرهٔ رمز عبور جدید"
                )}
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-sm">
            <Link
              to="/forgot-password"
              className="font-bold text-brand-600 hover:text-brand-700"
            >
              درخواست لینک جدید
            </Link>
          </div>
        </div>
      </main>
    </Layout>
  );
}

export default ResetPassword;
