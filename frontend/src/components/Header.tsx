import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, ShoppingCart, User, LogOut } from "lucide-react";

import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

function Header() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { cartCount } = useCart();
  const { user, logout } = useAuth();

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const query = search.trim();

    if (query === "") {
      navigate("/products");
      return;
    }

    navigate(`/products?search=${encodeURIComponent(query)}`);
  };

  const handleLogin = () => {
    navigate("/login");
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-6">
          <div className="flex items-center justify-between w-full sm:w-auto sm:order-1">
            <Link
              to="/"
              className="text-2xl font-black text-blue-600 whitespace-nowrap sm:static"
            >
              آرسن شاپ
            </Link>

            <div className="flex items-center gap-4 sm:hidden">
              {user ? (
                <>
                  <Link
                    to="/account"
                    aria-label="حساب کاربری"
                    className="text-gray-700 hover:text-blue-600"
                  >
                    <User size={22} />
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    aria-label="خروج"
                    className="text-gray-500 hover:text-red-600"
                  >
                    <LogOut size={18} />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleLogin}
                  aria-label="ورود"
                  className="text-gray-700 hover:text-blue-600"
                >
                  <User size={22} />
                </button>
              )}

              <Link
                to="/cart"
                className="relative flex items-center justify-center text-blue-600"
                aria-label="سبد خرید"
              >
                <ShoppingCart size={26} />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center">
                    {cartCount.toLocaleString("fa-IR")}
                  </span>
                )}
              </Link>
            </div>
          </div>

          <form
            onSubmit={handleSearch}
            className="order-3 w-full sm:order-2 sm:flex-1 sm:w-auto sm:max-w-xl"
          >
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="جستجوی محصول، برند یا دسته‌بندی..."
                className="w-full rounded-xl border border-gray-200 py-3 pr-12 pl-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <button
                type="submit"
                className="absolute right-0 top-0 h-full w-12 flex items-center justify-center text-gray-400 hover:text-blue-600 transition"
                aria-label="جستجو"
              >
                <Search size={22} />
              </button>
            </div>
          </form>

          <div className="hidden sm:flex items-center gap-5 sm:order-3">
            {user ? (
              <div className="flex items-center gap-3">
                <Link
                  to="/account"
                  className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition"
                >
                  <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                    <User size={20} />
                  </div>
                  <span className="font-bold whitespace-nowrap">
                    {user.name}
                  </span>
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-gray-500 hover:text-red-600 transition text-sm"
                >
                  <LogOut size={18} />
                  <span>خروج</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleLogin}
                className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition"
              >
                <User size={22} />
                <span>ورود</span>
              </button>
            )}

            <Link
              to="/cart"
              className="relative flex items-center justify-center text-blue-600"
              aria-label="سبد خرید"
            >
              <ShoppingCart size={26} />
              {cartCount > 0 && (
                <span className="absolute -top-3 -right-3 bg-red-500 text-white text-xs font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center">
                  {cartCount.toLocaleString("fa-IR")}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
