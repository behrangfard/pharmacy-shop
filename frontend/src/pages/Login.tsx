import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Lock, Mail, LogIn } from "lucide-react";

import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { STORAGE_KEYS } from "../utils/storageKeys";

function Login() {
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
        className="min-h-[70vh] bg-slate-50 flex items-center justify-center p-6"
      >
        <div className="w-full max-w-md bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <LogIn size={30} />
            </div>

            <h1 className="text-2xl font-black text-slate-900 mt-5">
              ورود به حساب کاربری
            </h1>

            <p className="text-slate-500 mt-2">برای ادامه وارد حساب خود شوید</p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="login-email"
                className="block text-sm font-bold text-slate-700 mb-2"
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
                  className="w-full border border-slate-200 rounded-xl py-3 pr-11 pl-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

                <Mail
                  size={19}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-sm font-bold text-slate-700 mb-2"
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
                  className="w-full border border-slate-200 rounded-xl py-3 pr-11 pl-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

                <Lock
                  size={19}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl p-3.5 font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "در حال ورود..." : "ورود به حساب"}
            </button>
          </form>

          <div className="text-center mt-6">
            <span className="text-sm text-slate-500">
              هنوز حساب کاربری ندارید؟
            </span>

            <Link
              to="/register"
              state={{ from: redirectPath }}
              className="text-sm text-blue-600 font-bold mr-2 hover:text-blue-700"
            >
              ایجاد حساب
            </Link>
          </div>

          <Link
            to="/"
            className="flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-blue-600 mt-6"
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
