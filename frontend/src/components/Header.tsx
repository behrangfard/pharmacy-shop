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
    <header className="sticky top-0 z-40 border-b border-[#e8eee5] bg-white/95 shadow-sm backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-3 py-3 sm:px-6 sm:py-4">
        <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-6">
          {/* Logo */}
          <div className="order-1 flex w-full items-center justify-between sm:w-auto">
            <Link
              to="/"
              className="
                whitespace-nowrap text-2xl font-black
                tracking-tight text-[#4f7754]
                transition-colors hover:text-[#385e3e]
              "
            >
              بهرنگ شاپ
            </Link>

            {/* Mobile actions */}
            <div className="flex items-center gap-4 sm:hidden">
              {user ? (
                <>
                  <Link
                    to="/account"
                    aria-label="حساب کاربری"
                    className="text-[#526b55] transition-colors hover:text-[#8066a2]"
                  >
                    <User size={22} />
                  </Link>

                  <button
                    type="button"
                    onClick={handleLogout}
                    aria-label="خروج"
                    className="text-[#7b847b] transition-colors hover:text-[#bd626d]"
                  >
                    <LogOut size={19} />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleLogin}
                  aria-label="ورود"
                  className="text-[#526b55] transition-colors hover:text-[#8066a2]"
                >
                  <User size={22} />
                </button>
              )}

              <Link
                to="/cart"
                className="relative flex items-center justify-center text-[#537653] transition-colors hover:text-[#8066a2]"
                aria-label="سبد خرید"
              >
                <ShoppingCart size={25} />

                {cartCount > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#d9cbed] px-1 text-xs font-bold text-[#594477]">
                    {cartCount.toLocaleString("fa-IR")}
                  </span>
                )}
              </Link>
            </div>
          </div>

          {/* Search */}
          <form
            onSubmit={handleSearch}
            role="search"
            className="order-3 w-full sm:order-2 sm:w-auto sm:max-w-xl sm:flex-1"
          >
            <div className="relative">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="جستجوی محصول، برند یا دسته‌بندی..."
                aria-label="جستجوی محصولات"
                className="
                  w-full rounded-2xl border border-[#e3e9df]
                  bg-[#faf9f4] py-3 pl-4 pr-12
                  text-sm text-[#283b2d]
                  outline-none transition-all
                  placeholder:text-[#9aa397]
                  focus:border-[#91ad8d]
                  focus:bg-white
                  focus:ring-4 focus:ring-[#648767]/10
                "
              />

              <button
                type="submit"
                aria-label="جستجو"
                className="
                  absolute right-0 top-0 flex h-full w-12
                  items-center justify-center
                  text-[#7b947a] transition-colors
                  hover:text-[#4f7754]
                "
              >
                <Search size={21} />
              </button>
            </div>
          </form>

          {/* Desktop actions */}
          <div className="order-3 hidden items-center gap-5 sm:flex">
            {user ? (
              <div className="flex items-center gap-3">
                <Link
                  to="/account"
                  className="
                    flex items-center gap-2
                    text-[#526b55] transition-colors
                    hover:text-[#8066a2]
                  "
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e8efe2] text-[#537653]">
                    <User size={20} />
                  </div>

                  <span className="whitespace-nowrap font-bold">
                    {user.name}
                  </span>
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="
                    flex items-center gap-1.5
                    text-sm text-[#8b9188]
                    transition-colors hover:text-[#bd626d]
                  "
                >
                  <LogOut size={18} />
                  <span>خروج</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleLogin}
                className="
                  flex items-center gap-2 whitespace-nowrap
                  rounded-xl border border-[#e3e9df]
                  bg-white px-4 py-2.5
                  font-bold text-[#526b55]
                  transition-all hover:border-[#cbdcc9]
                  hover:bg-[#f4f6ee]
                "
              >
                <User size={21} />
                <span>ورود</span>
              </button>
            )}

            <Link
              to="/cart"
              aria-label="سبد خرید"
              className="
                relative flex h-11 w-11 items-center justify-center
                rounded-xl bg-[#e8efe2] text-[#537653]
                transition-all hover:bg-[#dce8d4]
                hover:text-[#385e3e]
              "
            >
              <ShoppingCart size={23} />

              {cartCount > 0 && (
                <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#d9cbed] px-1 text-xs font-bold text-[#594477]">
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
