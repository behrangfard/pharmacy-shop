import { useState, type FormEvent } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { LockKeyhole, Mail, ShieldCheck, ArrowRight } from "lucide-react";

import { useAdminAuth } from "../context/AdminAuthContext";
import { adminApi } from "../services/api";

function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAdminAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const requestedPath = (location.state as { from?: string } | null)?.from;

  const redirectPath =
    requestedPath?.startsWith("/admin/") &&
    !requestedPath.startsWith("/admin/login")
      ? requestedPath
      : "/admin";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const response = await adminApi.post("/auth/login", {
        email: email.trim(),
        password,
      });

      const token = response.data?.token;
      const user = response.data?.user;

      if (!token || !user) {
        throw new Error("پاسخ ورود معتبر نیست.");
      }

      if (user.role !== "admin") {
        setError("این حساب دسترسی مدیریت ندارد.");
        return;
      }

      localStorage.setItem("pharmacy-shop-admin-token", token);
      localStorage.setItem("pharmacy-shop-admin-user", JSON.stringify(user));

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
    <main
      dir="rtl"
      className="min-h-screen bg-slate-950 flex items-center justify-center p-5"
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-teal-400/10 border border-teal-400/20 text-teal-300 flex items-center justify-center">
            <ShieldCheck size={32} />
          </div>

          <h1 className="mt-5 text-2xl font-black text-white">ورود مدیر</h1>

          <p className="mt-2 text-sm text-slate-400">
            ورود امن به پنل مدیریت فروشگاه
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900 p-7 sm:p-8 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white">خوش آمدید</h2>
            <p className="text-sm text-slate-400 mt-1">
              اطلاعات حساب مدیر را وارد کنید.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm leading-6 text-red-300"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="admin-login-email"
                className="block text-sm font-semibold text-slate-200 mb-2"
              >
                ایمیل مدیر
              </label>

              <div className="relative">
                <input
                  id="admin-login-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="admin@example.com"
                  autoComplete="username"
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 text-white placeholder:text-slate-600 py-3 pr-11 pl-4 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-400/10"
                />

                <Mail
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="admin-login-password"
                className="block text-sm font-semibold text-slate-200 mb-2"
              >
                رمز عبور
              </label>

              <div className="relative">
                <input
                  id="admin-login-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="رمز عبور"
                  autoComplete="current-password"
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 text-white placeholder:text-slate-600 py-3 pr-11 pl-4 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-400/10"
                />

                <LockKeyhole
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-teal-400 hover:bg-teal-300 text-slate-950 font-black py-3.5 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "در حال بررسی..." : "ورود به پنل مدیریت"}
            </button>
          </form>
        </div>

        <Link
          to="/"
          className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-white transition"
        >
          <ArrowRight size={16} />
          بازگشت به فروشگاه
        </Link>

        <p className="mt-5 text-center text-xs text-slate-600">
          دسترسی این بخش مخصوص مدیران فروشگاه است.
        </p>
      </div>
    </main>
  );
}

export default AdminLogin;
