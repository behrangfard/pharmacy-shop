import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, ShoppingCart, User, LogOut, Heart } from "lucide-react";

import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useWishlist } from "../context/WishlistContext";

function Header() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { cartCount } = useCart();
  const { user, logout } = useAuth();
  const { count: wishlistCount } = useWishlist();

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
    // چسبان‌بودن (sticky) و لایهٔ z در Layout اعمال می‌شود، جایی که نوار
    // اطلاع‌رسانی بالای هدر قرار می‌گیرد؛ این‌جا فقط ظاهر هدر ساخته می‌شود.
    <header className="border-b border-line bg-white/95 shadow-sm backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-3 py-3 sm:px-6 sm:py-4">
        <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-6">
          {/* Logo */}
          <div className="order-1 flex w-full items-center justify-between sm:w-auto">
            <Link
              to="/"
              className="
                whitespace-nowrap text-2xl font-black
                tracking-tight text-brand-600
                transition-colors hover:text-brand-700
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
                    className="text-ink-soft transition-colors hover:text-plum-500"
                  >
                    <User size={22} />
                  </Link>

                  <button
                    type="button"
                    onClick={handleLogout}
                    aria-label="خروج"
                    className="text-muted transition-colors hover:text-discount"
                  >
                    <LogOut size={19} />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleLogin}
                  aria-label="ورود"
                  className="text-ink-soft transition-colors hover:text-plum-500"
                >
                  <User size={22} />
                </button>
              )}

              <Link
                to="/wishlist"
                className="relative flex items-center justify-center text-blush-400 transition-colors hover:text-plum-500"
                aria-label="علاقه‌مندی‌ها"
              >
                <Heart size={23} />

                {wishlistCount > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-blush-100 px-1 text-xs font-bold text-blush-600">
                    {wishlistCount.toLocaleString("fa-IR")}
                  </span>
                )}
              </Link>

              <Link
                to="/cart"
                className="relative flex items-center justify-center text-brand-600 transition-colors hover:text-plum-500"
                aria-label="سبد خرید"
              >
                <ShoppingCart size={25} />

                {cartCount > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-plum-200 px-1 text-xs font-bold text-plum-700">
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
                  w-full rounded-2xl border border-line-soft
                  bg-cream py-3 pl-4 pr-12
                  text-sm text-ink
                  outline-none transition-all
                  placeholder:text-muted-soft
                  focus:border-brand-400
                  focus:bg-white
                  focus:ring-4 focus:ring-brand-500/10
                "
              />

              <button
                type="submit"
                aria-label="جستجو"
                className="
                  absolute right-0 top-0 flex h-full w-12
                  items-center justify-center
                  text-brand-500 transition-colors
                  hover:text-brand-600
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
                    text-ink-soft transition-colors
                    hover:text-plum-500
                  "
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-brand-600">
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
                    text-sm text-muted
                    transition-colors hover:text-discount
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
                  rounded-xl border border-line-soft
                  bg-white px-4 py-2.5
                  font-bold text-ink-soft
                  transition-all hover:border-brand-300
                  hover:bg-brand-50
                "
              >
                <User size={21} />
                <span>ورود</span>
              </button>
            )}

            <Link
              to="/wishlist"
              aria-label="علاقه‌مندی‌ها"
              className="
                relative flex h-11 w-11 items-center justify-center
                rounded-xl bg-blush-50 text-blush-500
                transition-all hover:bg-blush-200
                hover:text-blush-600
              "
            >
              <Heart size={22} />

              {wishlistCount > 0 && (
                <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-plum-200 px-1 text-xs font-bold text-plum-700">
                  {wishlistCount.toLocaleString("fa-IR")}
                </span>
              )}
            </Link>

            <Link
              to="/cart"
              aria-label="سبد خرید"
              className="
                relative flex h-11 w-11 items-center justify-center
                rounded-xl bg-brand-100 text-brand-600
                transition-all hover:bg-brand-200
                hover:text-brand-700
              "
            >
              <ShoppingCart size={23} />

              {cartCount > 0 && (
                <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-plum-200 px-1 text-xs font-bold text-plum-700">
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
