import { Link, NavLink, Outlet } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

function AdminLayout() {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navItems = [
    {
      to: "/admin",
      label: "داشبورد",
      end: true,
    },
    {
      to: "/admin/products",
      label: "محصولات",
    },
    {
      to: "/admin/categories",
      label: "دسته‌بندی‌ها",
    },
    {
      to: "/admin/orders",
      label: "سفارش‌ها",
    },
  ];

  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100vh",
        display: "flex",
        background: "#f5f7fb",
      }}
    >
      {mobileMenuOpen && (
        <button
          type="button"
          className="admin-mobile-overlay"
          aria-label="بستن منو"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      <aside
        className={`admin-sidebar ${mobileMenuOpen ? "is-open" : ""}`}
        style={{
          width: "220px",
          minHeight: "100vh",
          background: "#111827",
          color: "#fff",
          padding: "24px 16px",
          boxSizing: "border-box",
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <button
          type="button"
          className="admin-mobile-close-button"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="بستن منو"
        >
          ✕ بستن منو
        </button>
        <Link
          to="/admin"
          style={{
            color: "#fff",
            textDecoration: "none",
            fontSize: "22px",
            fontWeight: 800,
            padding: "8px 12px",
            marginBottom: "30px",
          }}
        >
          پنل مدیریت{" "}
        </Link>

        <nav
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {navItems.map((item) => (
            <NavLink
              onClick={() => setMobileMenuOpen(false)}
              key={item.to}
              to={item.to}
              end={item.end}
              style={({ isActive }) => ({
                color: "#fff",
                textDecoration: "none",
                padding: "12px 14px",
                borderRadius: "10px",
                background: isActive ? "rgba(255,255,255,0.12)" : "transparent",
                fontWeight: isActive ? 700 : 500,
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div
          style={{
            marginTop: "auto",
            borderTop: "1px solid rgba(255,255,255,0.1)",
            paddingTop: "18px",
          }}
        >
          <div
            style={{
              fontSize: "14px",
              color: "#d1d5db",
              marginBottom: "12px",
              padding: "0 12px",
            }}
          >
            {user?.name}
          </div>

          <Link
            to="/"
            style={{
              display: "block",
              color: "#d1d5db",
              textDecoration: "none",
              padding: "10px 12px",
              fontSize: "14px",
            }}
          >
            مشاهده فروشگاه
          </Link>

          <button
            type="button"
            onClick={() => {
              void logout();
            }}
            style={{
              width: "100%",
              border: 0,
              background: "transparent",
              color: "#fca5a5",
              textAlign: "right",
              padding: "10px 12px",
              cursor: "pointer",
              fontSize: "14px",
              fontFamily: "inherit",
            }}
          >
            خروج از حساب
          </button>
        </div>
      </aside>

      <main
        className="admin-main"
        style={{
          flex: 1,
          marginRight: "220px",
          minHeight: "100vh",
          padding: "16px",
          boxSizing: "border-box",
        }}
      >
        <button
          type="button"
          className="admin-mobile-menu-button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="باز و بسته کردن منو"
          aria-expanded={mobileMenuOpen}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;
