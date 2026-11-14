import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, User, LogOut, Heart } from "lucide-react";

import HeaderSearch from "./HeaderSearch";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useWishlist } from "../context/WishlistContext";
import { useHeaderFooter } from "../hooks/useHeaderFooter";

function Header() {
  const navigate = useNavigate();

  const {
    header_logo_text: logoText,
    header_tagline: tagline,
    header_show_search: showSearch,
    header_cta_enabled: ctaEnabled,
    header_cta_label: ctaLabel,
    header_cta_url: ctaUrl,
    header_cta_new_tab: ctaNewTab,
  } = useHeaderFooter();

  const { cartCount } = useCart();
  const { user, logout } = useAuth();
  const { count: wishlistCount } = useWishlist();


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
          <div className="order-1 flex w-full min-w-0 items-center justify-between gap-2 sm:w-auto">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                to="/"
                className="
                  truncate whitespace-nowrap text-xl font-black
                  tracking-tight text-brand-600
                  transition-colors hover:text-brand-700 sm:text-2xl
                "
              >
                {logoText}
              </Link>

              {/* شعار کوتاه کنار لوگو؛ فقط در صفحه‌های بزرگ تا شلوغ نشود */}
              {tagline && (
                <span className="hidden text-xs font-medium leading-5 text-muted lg:block">
                  {tagline}
                </span>
              )}
            </div>

            {/* Mobile actions */}
            <div className="flex shrink-0 items-center gap-2.5 sm:hidden">
              {user ? (
                <>
                  <Link
                    to="/account"
                    aria-label="حساب کاربری"
                    className="flex shrink-0 items-center justify-center text-ink-soft transition-colors hover:text-plum-500"
                  >
                    <User size={22} />
                  </Link>

                  <button
                    type="button"
                    onClick={handleLogout}
                    aria-label="خروج"
                    className="flex shrink-0 items-center justify-center text-muted transition-colors hover:text-discount"
                  >
                    <LogOut size={19} />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleLogin}
                  aria-label="ورود"
                  className="flex shrink-0 items-center justify-center text-ink-soft transition-colors hover:text-plum-500"
                >
                  <User size={22} />
                </button>
              )}

              <Link
                to="/wishlist"
                className="relative flex shrink-0 items-center justify-center text-blush-400 transition-colors hover:text-plum-500"
                aria-label="علاقه‌مندی‌ها"
              >
                <Heart size={23} />

                {wishlistCount > 0 && (
                  <span className="absolute end-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-blush-100 px-1 text-[10px] font-bold leading-none text-blush-600 ring-2 ring-white">
                    {wishlistCount.toLocaleString("fa-IR")}
                  </span>
                )}
              </Link>

              <Link
                to="/cart"
                className="relative flex shrink-0 items-center justify-center text-brand-600 transition-colors hover:text-plum-500"
                aria-label="سبد خرید"
              >
                <ShoppingCart size={25} />

                {cartCount > 0 && (
                  <span className="absolute end-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-plum-200 px-1 text-[10px] font-bold leading-none text-plum-700 ring-2 ring-white">
                    {cartCount.toLocaleString("fa-IR")}
                  </span>
                )}
              </Link>
            </div>
          </div>

          {/* Search */}
          {showSearch && (
            <HeaderSearch className="order-3 w-full sm:order-2 sm:w-auto sm:max-w-xl sm:flex-1" />
          )}

          {/* Desktop actions */}
          <div className="order-3 hidden items-center gap-5 sm:flex">
            {/* دکمهٔ اقدام (CTA) اختیاری از پنل؛ فقط در صفحه‌های بزرگ */}
            {ctaEnabled && ctaLabel && (
              ctaUrl.startsWith("/") ? (
                <Link
                  to={ctaUrl}
                  className="
                    hidden whitespace-nowrap rounded-xl bg-plum-100
                    px-3.5 py-2.5 text-sm font-bold text-plum-600
                    transition-colors hover:bg-plum-200 lg:inline-flex
                  "
                >
                  {ctaLabel}
                </Link>
              ) : (
                <a
                  href={ctaUrl || "#"}
                  target={ctaNewTab ? "_blank" : undefined}
                  rel={ctaNewTab ? "noopener noreferrer" : undefined}
                  className="
                    hidden whitespace-nowrap rounded-xl bg-plum-100
                    px-3.5 py-2.5 text-sm font-bold text-plum-600
                    transition-colors hover:bg-plum-200 lg:inline-flex
                  "
                >
                  {ctaLabel}
                </a>
              )
            )}
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
