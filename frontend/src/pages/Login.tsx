import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Lock, Mail, LogIn } from "lucide-react";

import Layout from "../components/Layout";
import { usePrivatePageMeta } from "../hooks/usePageMeta";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { STORAGE_KEYS } from "../utils/storageKeys";

function Login() {
  usePrivatePageMeta("ورود به حساب", "/login");

  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const requestedPath = (location.state as { from?: string } | null)?.from;

  const redirectPath =
    requestedPath?.startsWith("/") && !requestedPath.startsWith("//")
      ? requestedPath
      : "/";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const response = await api.post("/auth/login", {
        email: email.trim(),
        password,
      });

      const token = response.data?.token;
      const user = response.data?.user;

      if (!token || !user) {
        throw new Error("پاسخ ورود معتبر نیست.");
      }

      localStorage.setItem(STORAGE_KEYS.token, token);
      localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));

      setUser(user);

      navigate(redirectPath, { replace: true });
    } catch (error: any) {
      setError(
        error?.response?.data?.message ||
          error?.message ||
          "ایمیل یا رمز عبور صحیح نیست.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <main
        dir="rtl"
        className="min-h-[70vh] bg-cream flex items-center justify-center p-6"
      >
        <div className="w-full max-w-md bg-white rounded-3xl shadow-sm border border-line p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <LogIn size={30} />
            </div>

            <h1 className="text-2xl font-black text-ink mt-5">
              ورود به حساب کاربری
            </h1>

            <p className="text-muted mt-2">برای ادامه وارد حساب خود شوید</p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 p-3 rounded-xl bg-blush-50 border border-blush-100 text-discount text-sm"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="login-email"
                className="block text-sm font-bold text-ink-soft mb-2"
              >
                ایمیل
              </label>

              <div className="relative">
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="example@email.com"
                  autoComplete="email"
                  required
                  className="w-full border border-line rounded-xl py-3 pr-11 pl-4 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />

                <Mail
                  size={19}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-soft"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-sm font-bold text-ink-soft mb-2"
              >
                رمز عبور
              </label>

              <div className="relative">
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="رمز عبور"
                  autoComplete="current-password"
                  required
                  className="w-full border border-line rounded-xl py-3 pr-11 pl-4 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />

                <Lock
                  size={19}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-soft"
                />
              </div>

              <div className="mt-2 text-left">
                <Link
                  to="/forgot-password"
                  className="text-xs font-bold text-brand-600 transition hover:text-brand-700"
                >
                  رمز عبور را فراموش کرده‌اید؟
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white rounded-xl p-3.5 font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "در حال ورود..." : "ورود به حساب"}
            </button>
          </form>

          <div className="text-center mt-6">
            <span className="text-sm text-muted">
              هنوز حساب کاربری ندارید؟
            </span>

            <Link
              to="/register"
              state={{ from: redirectPath }}
              className="text-sm text-brand-600 font-bold mr-2 hover:text-brand-700"
            >
              ایجاد حساب
            </Link>
          </div>

          <Link
            to="/"
            className="flex items-center justify-center gap-2 text-sm text-muted-soft hover:text-brand-600 mt-6"
          >
            <ArrowRight size={16} />
            بازگشت به فروشگاه
          </Link>
        </div>
      </main>
    </Layout>
  );
}

export default Login;
