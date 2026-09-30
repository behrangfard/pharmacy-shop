import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Lock, Mail, User } from "lucide-react";

import Layout from "../components/Layout";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function Register() {
const navigate = useNavigate();
const { setUser } = useAuth();

const [name, setName] = useState("");
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [passwordConfirmation, setPasswordConfirmation] = useState("");

const [loading, setLoading] = useState(false);
const [error, setError] = useState("");

const handleSubmit = async (
event: React.FormEvent<HTMLFormElement>
) => {
event.preventDefault();


setError("");

if (password !== passwordConfirmation) {
  setError("رمز عبور و تکرار رمز عبور یکسان نیستند.");
  return;
}

setLoading(true);

try {
  const response = await api.post("/auth/register", {
    name,
    email,
    password,
    password_confirmation: passwordConfirmation,
  });

  const token = response.data.token;
  const user = response.data.user;

  localStorage.setItem(
    "pharmacy-shop-token",
    token
  );

  localStorage.setItem(
    "pharmacy-shop-user",
    JSON.stringify(user)
  );

  setUser(user);

  navigate("/");
} catch (error: any) {
  const responseErrors =
    error?.response?.data?.errors;

  if (responseErrors) {
    const firstError =
      Object.values(responseErrors)
        .flat()
        .find(
          (message) =>
            typeof message === "string"
        );

    setError(
      typeof firstError === "string"
        ? firstError
        : "اطلاعات واردشده صحیح نیست."
    );
  } else {
    setError(
      error?.response?.data?.message ||
        "ثبت‌نام انجام نشد."
    );
  }
} finally {
  setLoading(false);
}


};

return ( <Layout> <main className="max-w-md mx-auto px-6 py-16">


    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">

      <div className="text-center mb-8">

        <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
          <User size={30} />
        </div>

        <h1 className="text-2xl font-black text-slate-900 mt-5">
          ایجاد حساب کاربری
        </h1>

        <p className="text-slate-500 mt-2">
          برای خرید سریع‌تر حساب خود را بسازید
        </p>

      </div>

      {error && (
        <div className="mb-5 rounded-xl bg-red-50 border border-red-100 text-red-600 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >

        <div>

          <label className="block text-sm font-bold text-slate-700 mb-2">
            نام و نام خانوادگی
          </label>

          <div className="relative">

            <input
              type="text"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              placeholder="نام و نام خانوادگی"
              required
              className="w-full rounded-xl border border-slate-200 py-3 pr-11 pl-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <User
              size={19}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

          </div>

        </div>

        <div>

          <label className="block text-sm font-bold text-slate-700 mb-2">
            ایمیل
          </label>

          <div className="relative">

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="example@email.com"
              required
              className="w-full rounded-xl border border-slate-200 py-3 pr-11 pl-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <Mail
              size={19}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

          </div>

        </div>

        <div>

          <label className="block text-sm font-bold text-slate-700 mb-2">
            رمز عبور
          </label>

          <div className="relative">

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="حداقل ۸ کاراکتر"
              minLength={8}
              required
              className="w-full rounded-xl border border-slate-200 py-3 pr-11 pl-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <Lock
              size={19}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

          </div>

        </div>

        <div>

          <label className="block text-sm font-bold text-slate-700 mb-2">
            تکرار رمز عبور
          </label>

          <div className="relative">

            <input
              type="password"
              value={passwordConfirmation}
              onChange={(event) =>
                setPasswordConfirmation(
                  event.target.value
                )
              }
              placeholder="تکرار رمز عبور"
              minLength={8}
              required
              className="w-full rounded-xl border border-slate-200 py-3 pr-11 pl-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-3.5 rounded-xl font-bold transition"
        >
          {loading
            ? "در حال ثبت‌نام..."
            : "ایجاد حساب"}
        </button>

      </form>

      <div className="text-center mt-6">

        <span className="text-sm text-slate-500">
          قبلاً حساب ساخته‌اید؟
        </span>

        <Link
          to="/login"
          className="text-sm text-blue-600 font-bold mr-2 hover:text-blue-700"
        >
          وارد شوید
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

export default Register;
