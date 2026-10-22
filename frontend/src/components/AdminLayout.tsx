import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Tags,
  ShoppingCart,
  Store,
  LogOut,
  X,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

function AdminLayout() {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    {
      to: "/admin",
      label: "داشبورد",
      end: true,
      icon: LayoutDashboard,
    },
    {
      to: "/admin/products",
      label: "محصولات",
      icon: Package,
    },
    {
      to: "/admin/categories",
      label: "دسته‌بندی‌ها",
      icon: Tags,
    },
    {
      to: "/admin/orders",
      label: "سفارش‌ها",
      icon: ShoppingCart,
    },
  ];

  return (
    <div className="admin-layout" dir="rtl">
      {mobileMenuOpen && (
        <button
          type="button"
          className="admin-mobile-overlay"
          aria-label="بستن منو"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside className={`admin-sidebar ${mobileMenuOpen ? "is-open" : ""}`}>
        <button
          type="button"
          className="admin-mobile-close-button"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="بستن منو"
        >
          <X size={18} />
          <span>بستن منو</span>
        </button>

        <Link to="/admin" className="admin-brand">
          <span className="admin-brand-icon">
            <ShieldCheck size={25} strokeWidth={2.1} />
          </span>

          <span className="admin-brand-text">
            <strong>پنل مدیریت</strong>
            <small>مدیریت فروشگاه</small>
          </span>
        </Link>

        <div className="admin-nav-heading">منوی اصلی</div>

        <nav className="admin-nav" aria-label="منوی مدیریت">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `admin-nav-link ${isActive ? "is-active" : ""}`
                }
              >
                <span className="admin-nav-icon">
                  <Icon size={20} strokeWidth={1.9} />
                </span>

                <span className="admin-nav-label">{item.label}</span>

                <span className="admin-nav-indicator" />
              </NavLink>
            );
          })}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-user-card">
            <div className="admin-user-avatar">
              {(user?.name?.trim()?.charAt(0) || "ک").toUpperCase()}
            </div>

            <div className="admin-user-info">
              <span className="admin-user-caption">حساب کاربری</span>
              <strong className="admin-user-name">
                {user?.name || "مدیر فروشگاه"}
              </strong>
            </div>
          </div>

          <Link to="/" className="admin-store-link">
            <Store size={19} strokeWidth={1.9} />
            <span>مشاهده فروشگاه</span>
          </Link>

          <button
            type="button"
            className="admin-logout-button"
            onClick={() => {
              void logout();
            }}
          >
            <LogOut size={19} strokeWidth={1.9} />
            <span>خروج از حساب</span>
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <button
          type="button"
          className="admin-mobile-menu-button"
          onClick={() => setMobileMenuOpen((open) => !open)}
          aria-label="باز و بسته کردن منو"
          aria-expanded={mobileMenuOpen}
        >
          <span />
          <span />
          <span />
        </button>

        <div className="admin-page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default AdminLayout;
