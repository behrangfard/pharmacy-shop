import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const from = (location.state as { from?: string } | null)?.from || "/";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const response = await api.post("/auth/login", {
        email,
        password,
      });

      localStorage.setItem("pharmacy-shop-token", response.data.token);

      localStorage.setItem(
        "pharmacy-shop-user",
        JSON.stringify(response.data.user)
      );
      setUser(response.data.user);

      navigate(from, { replace: true });
    } catch (error: any) {
      setError(
        error?.response?.data?.message || "ایمیل یا رمز عبور صحیح نیست."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border p-8">
        <h1 className="text-2xl font-bold text-center mb-2">
          ورود به حساب کاربری
        </h1>

        <p className="text-center text-slate-500 mb-8">
          برای ادامه وارد حساب خود شوید
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="ایمیل"
            required
            className="w-full border rounded-xl p-3 outline-none"
          />

          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="رمز عبور"
            required
            className="w-full border rounded-xl p-3 outline-none"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white rounded-xl p-3 font-bold disabled:opacity-50"
          >
            {loading ? "در حال ورود..." : "ورود به حساب"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
