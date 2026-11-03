import { useEffect, useMemo, useRef, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Tags,
  ShoppingCart,
  Store,
  LogOut,
  X,
  ShieldCheck,
  Search,
  Bell,
  ChevronLeft,
  CalendarDays,
  Command,
  Users,
  MessageSquare,
  Megaphone,
  Pencil,
} from "lucide-react";
import { useAdminAuth } from "../context/AdminAuthContext";

function AdminLayout() {
  const { user, logout } = useAdminAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    {
      to: "/admin",
      label: "نمای کلی",
      end: true,
      icon: LayoutDashboard,
      keywords: "داشبورد آمار فروش گزارش",
    },
    {
      to: "/admin/products",
      label: "محصولات",
      icon: Package,
      keywords: "کالا موجودی قیمت افزودن محصول",
    },
    {
      to: "/admin/categories",
      label: "دسته‌بندی‌ها",
      icon: Tags,
      keywords: "گروه دسته بندی",
    },
    {
      to: "/admin/orders",
      label: "سفارش‌ها",
      icon: ShoppingCart,
      keywords: "خرید پرداخت ارسال سفارش",
    },
    {
      to: "/admin/reviews",
      label: "نظرات محصولات",
      icon: MessageSquare,
      keywords: "نظر دیدگاه امتیاز ستاره بررسی تأیید رد پاسخ مشتری",
    },
    {
      to: "/admin/customers",
      label: "مشتریان",
      icon: Users,
      keywords: "مشتری کاربران اعضا سابقه خرید اطلاعات مشتری",
    },
    {
      to: "/admin/messaging",
      label: "پیام‌رسانی",
      icon: Megaphone,
      keywords:
        "پیامک sms تلگرام واتساپ واتس آپ بله ارسال پیام اطلاع رسانی پیام رسان مشتریان",
    },
    {
      to: "/admin/admins",
      label: "مدیران",
      icon: ShieldCheck,
      keywords: "مدیر ادمین حساب کاربری رمز عبور افزودن مدیر ویرایش حساب",
    },
  ];

  const currentPage = useMemo(() => {
    const match = [...navItems]
      .sort((a, b) => b.to.length - a.to.length)
      .find((item) =>
        item.end
          ? location.pathname === item.to
          : location.pathname === item.to ||
            location.pathname.startsWith(`${item.to}/`),
      );

    return match?.label ?? "پنل مدیریت";
  }, [location.pathname]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase("fa");

    if (!query) return navItems;

    return navItems.filter((item) =>
      `${item.label} ${item.keywords}`.toLocaleLowerCase("fa").includes(query),
    );
  }, [searchQuery]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }

      if (event.key === "Escape") {
        setSearchOpen(false);
        setNotificationsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (searchOpen) {
      const timer = window.setTimeout(
        () => searchInputRef.current?.focus(),
        50,
      );

      return () => window.clearTimeout(timer);
    }
  }, [searchOpen]);

  useEffect(() => {
    setSearchOpen(false);
    setSearchQuery("");
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const formatPersianDate = () =>
    new Intl.DateTimeFormat("fa-IR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date());

  const openPage = (path: string) => {
    navigate(path);
    setSearchOpen(false);
    setSearchQuery("");
  };

  return (
    <div className="admin-layout" dir="rtl">
      <style>{`
        .admin-topbar {
          position: relative;
          z-index: 20;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          min-height: 78px;
          padding: 16px 28px;
          margin-bottom: 24px;
          background: #ffffff;
          border: 1px solid #e9eee7;
          border-radius: 18px;
          box-shadow: 0 5px 22px rgba(31, 55, 35, 0.035);
        }
        .admin-topbar-breadcrumb {
          display: flex;
          align-items: center;
          gap: 9px;
          min-width: 0;
          color: #829084;
          font-size: 13px;
        }
        .admin-topbar-breadcrumb a {
          color: inherit;
          text-decoration: none;
          transition: color 0.2s;
        }
        .admin-topbar-breadcrumb a:hover {
          color: #527852;
        }
        .admin-topbar-current {
          overflow: hidden;
          color: #243529;
          font-size: 15px;
          font-weight: 800;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .admin-topbar-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
          flex: 1;
          min-width: 0;
        }
        .admin-topbar-search {
          display: flex;
          align-items: center;
          gap: 10px;
          width: min(100%, 330px);
          min-height: 43px;
          padding: 0 13px;
          color: #788579;
          background: #f7f9f6;
          border: 1px solid #edf1eb;
          border-radius: 12px;
          cursor: pointer;
          text-align: right;
          transition: border-color 0.2s, background 0.2s;
        }
        .admin-topbar-search:hover {
          background: #f1f5ef;
          border-color: #d8e3d5;
        }
        .admin-topbar-search-label {
          flex: 1;
          overflow: hidden;
          font: inherit;
          font-size: 12px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .admin-topbar-shortcut {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          padding: 3px 6px;
          color: #718071;
          background: white;
          border: 1px solid #e2e8df;
          border-radius: 6px;
          font-size: 10px;
          white-space: nowrap;
          direction: ltr;
        }
        .admin-topbar-icon-button {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 42px;
          width: 42px;
          height: 42px;
          color: #647464;
          background: #fff;
          border: 1px solid #e9eee7;
          border-radius: 12px;
          cursor: pointer;
          transition: background 0.2s, color 0.2s;
        }
        .admin-topbar-icon-button:hover {
          color: #426c46;
          background: #f4f7f2;
        }
        .admin-topbar-date {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #788579;
          font-size: 12px;
          white-space: nowrap;
          margin-right: auto;
        }
        .admin-search-backdrop {
          position: fixed;
          z-index: 1000;
          inset: 0;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: min(15vh, 120px) 18px 24px;
          background: rgba(18, 30, 21, 0.42);
          backdrop-filter: blur(4px);
        }
        .admin-search-dialog {
          width: min(100%, 540px);
          overflow: hidden;
          background: #fff;
          border: 1px solid #e5ebe2;
          border-radius: 18px;
          box-shadow: 0 24px 80px rgba(18, 35, 20, 0.2);
        }
        .admin-search-input-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 18px;
          border-bottom: 1px solid #edf0ea;
        }
        .admin-search-input {
          flex: 1;
          width: 100%;
          min-width: 0;
          padding: 8px 0;
          color: #243529;
          background: transparent;
          border: 0;
          outline: none;
          font: inherit;
          font-size: 14px;
        }
        .admin-search-results-title {
          padding: 14px 18px 8px;
          color: #849084;
          font-size: 11px;
          font-weight: 700;
        }
        .admin-search-result {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 13px 18px;
          color: #354638;
          background: #fff;
          border: 0;
          cursor: pointer;
          text-align: right;
          font: inherit;
          font-size: 13px;
        }
        .admin-search-result:hover {
          background: #f4f7f2;
        }
        .admin-search-result-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          color: #507b53;
          background: #edf4e9;
          border-radius: 10px;
        }
        .admin-search-empty {
          padding: 24px 18px;
          color: #829084;
          font-size: 13px;
          text-align: center;
        }
        .admin-notification-popover {
          position: absolute;
          z-index: 100;
          top: calc(100% + 10px);
          left: 0;
          width: min(290px, calc(100vw - 40px));
          padding: 16px;
          color: #526153;
          background: #fff;
          border: 1px solid #e8eee5;
          border-radius: 14px;
          box-shadow: 0 12px 36px rgba(25, 45, 27, 0.12);
          font-size: 12px;
          line-height: 1.9;
        }
        .admin-notification-title {
          margin-bottom: 6px;
          color: #263a29;
          font-size: 13px;
          font-weight: 800;
        }
        @media (max-width: 900px) {
          .admin-topbar {
            flex-wrap: wrap;
            padding: 15px 18px;
          }
          .admin-topbar-actions {
            flex: 1 1 100%;
            order: 3;
          }
          .admin-topbar-search {
            flex: 1;
            width: auto;
          }
          .admin-topbar-date {
            margin-right: auto;
          }
        }
        @media (max-width: 560px) {
          .admin-topbar {
            gap: 13px;
            margin-bottom: 18px;
            border-radius: 14px;
          }
          .admin-topbar-current {
            font-size: 13px;
          }
          .admin-topbar-date {
            font-size: 10px;
          }
          .admin-topbar-search {
            min-height: 42px;
          }
          .admin-topbar-shortcut {
            display: none;
          }
          .admin-topbar-actions {
            gap: 8px;
          }

          /* جلوگیری از بیرون‌زدن محتوای پنل در موبایل */
          .admin-layout {
            width: 100%;
            max-width: 100%;
            min-width: 0;
          }

          .admin-main {
            min-width: 0;
            max-width: 100%;
          }

          .admin-page-content {
            min-width: 0;
            max-width: 100%;
            width: 100%;
          }

          .admin-topbar {
            min-width: 0;
            max-width: 100%;
          }

          .admin-topbar-breadcrumb {
            flex: 1 1 auto;
            overflow: hidden;
          }

          .admin-topbar-actions {
            min-width: 0;
          }

          .admin-page-content {
            padding-right: 12px;
            padding-left: 12px;
          }

          .admin-topbar {
            width: 100%;
            padding-right: 12px;
            padding-left: 12px;
          }

          .admin-topbar-date {
            max-width: 100%;
            white-space: normal;
          }
        }
      `}</style>

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

            <Link
              to="/admin/admins"
              className="admin-user-edit"
              aria-label="ویرایش حساب مدیر"
              title="ویرایش حساب مدیر"
            >
              <Pencil size={15} strokeWidth={1.9} />
            </Link>
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
          <header className="admin-topbar">
            <div className="admin-topbar-breadcrumb">
              <Link to="/admin">خانه</Link>
              <ChevronLeft size={15} />
              <span className="admin-topbar-current">{currentPage}</span>
            </div>

            <div className="admin-topbar-actions">
              <button
                type="button"
                className="admin-topbar-search"
                onClick={() => setSearchOpen(true)}
                aria-label="جست‌وجو در پنل مدیریت"
              >
                <Search size={17} />
                <span className="admin-topbar-search-label">
                  جست‌وجو در پنل مدیریت...
                </span>
                <span className="admin-topbar-shortcut">
                  {navigator.platform?.toLowerCase().includes("mac") ? (
                    <Command size={11} />
                  ) : (
                    "Ctrl"
                  )}
                  K
                </span>
              </button>

              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  className="admin-topbar-icon-button"
                  onClick={() => setNotificationsOpen((open) => !open)}
                  aria-label="اعلان‌ها"
                  aria-expanded={notificationsOpen}
                >
                  <Bell size={18} />
                </button>

                {notificationsOpen && (
                  <div className="admin-notification-popover" role="status">
                    <div className="admin-notification-title">اعلان‌ها</div>
                    فعلاً اعلان جدیدی برای نمایش وجود ندارد.
                  </div>
                )}
              </div>
            </div>

            <div className="admin-topbar-date">
              <CalendarDays size={16} />
              <span>{formatPersianDate()}</span>
            </div>
          </header>

          <Outlet />
        </div>
      </main>

      {searchOpen && (
        <div
          className="admin-search-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSearchOpen(false);
            }
          }}
        >
          <section
            className="admin-search-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="جست‌وجو در پنل مدیریت"
          >
            <div className="admin-search-input-wrap">
              <Search size={20} color="#668066" />

              <input
                ref={searchInputRef}
                className="admin-search-input"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && filteredItems[0]) {
                    openPage(filteredItems[0].to);
                  }
                }}
                placeholder="نام بخش موردنظر را بنویسید..."
                aria-label="عبارت جست‌وجو"
              />

              <button
                type="button"
                className="admin-topbar-icon-button"
                onClick={() => setSearchOpen(false)}
                aria-label="بستن جست‌وجو"
              >
                <X size={17} />
              </button>
            </div>

            <div className="admin-search-results-title">بخش‌های مدیریت</div>

            {filteredItems.length ? (
              filteredItems.map((item) => {
                const Icon = item.icon;

                return (
                  <button
                    key={item.to}
                    type="button"
                    className="admin-search-result"
                    onClick={() => openPage(item.to)}
                  >
                    <span className="admin-search-result-icon">
                      <Icon size={18} />
                    </span>

                    <span>{item.label}</span>

                    <span
                      style={{
                        marginRight: "auto",
                        color: "#91a091",
                      }}
                    >
                      <ChevronLeft size={16} />
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="admin-search-empty">
                بخشی با این عبارت پیدا نشد.
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default AdminLayout;
