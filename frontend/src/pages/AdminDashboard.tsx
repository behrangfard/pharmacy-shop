import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import {
  Package,
  Users,
  ShoppingCart,
  Wallet,
  Tags,
  ArrowUpLeft,
  ArrowLeft,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import api from "../services/api";

interface DashboardData {
  products: {
    total: number;
    active: number;
  };
  users: {
    total: number;
  };
  orders: {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    cancelled: number;
  };
  payments: {
    paid: number;
    unpaid: number;
  };
  sales: {
    total: string;
  };
}

interface QuickLinkItem {
  to: string;
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  background: string;
  action: string;
}

interface StatItem {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
  color: string;
  background: string;
}

interface OrderStatusItem {
  label: string;
  value: number;
  color: string;
  background: string;
}

function formatPrice(value: string | number) {
  return new Intl.NumberFormat("fa-IR").format(Number(value));
}

const quickLinks: QuickLinkItem[] = [
  {
    to: "/admin/products",
    title: "مدیریت محصولات",
    description: "افزودن، ویرایش و مدیریت موجودی محصولات",
    icon: Package,
    color: "#4338ca",
    background: "#eef2ff",
    action: "مشاهده محصولات",
  },
  {
    to: "/admin/categories",
    title: "دسته‌بندی‌ها",
    description: "ساخت و مدیریت دسته‌بندی‌های فروشگاه",
    icon: Tags,
    color: "#7c3aed",
    background: "#f5f3ff",
    action: "مدیریت دسته‌بندی‌ها",
  },
  {
    to: "/admin/orders",
    title: "مدیریت سفارش‌ها",
    description: "بررسی سفارش‌ها و پیگیری وضعیت آن‌ها",
    icon: ShoppingCart,
    color: "#0f766e",
    background: "#f0fdfa",
    action: "مشاهده سفارش‌ها",
  },
];

function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/admin/dashboard");
        setData(response.data.data);
      } catch {
        setError("دریافت اطلاعات داشبورد با خطا مواجه شد.");
      } finally {
        setLoading(false);
      }
    };

    void loadDashboard();
  }, []);

  const pageStyle: CSSProperties = {
    width: "100%",
    maxWidth: "none",
    minWidth: 0,
    color: "#111827",
    boxSizing: "border-box",
  };

  const panelStyle: CSSProperties = {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "22px",
    boxShadow: "0 3px 12px rgba(15, 23, 42, 0.035)",
    minWidth: 0,
    boxSizing: "border-box",
  };

  if (loading) {
    return (
      <div style={pageStyle}>
        <h1 className="dashboard-page-title">داشبورد مدیریت</h1>
        <div className="dashboard-message">
          <span className="dashboard-loader" aria-hidden="true" />
          در حال دریافت اطلاعات...
        </div>
        <style>{dashboardStyles}</style>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={pageStyle}>
        <h1 className="dashboard-page-title">داشبورد مدیریت</h1>

        <div className="dashboard-error" role="alert">
          <span className="dashboard-error-icon" aria-hidden="true">
            !
          </span>
          <span>{error || "اطلاعات داشبورد در دسترس نیست."}</span>
        </div>

        <style>{dashboardStyles}</style>
      </div>
    );
  }

  const stats: StatItem[] = [
    {
      title: "کل محصولات",
      value: formatPrice(data.products.total),
      description: `${formatPrice(data.products.active)} محصول فعال`,
      icon: Package,
      color: "#4338ca",
      background: "#eef2ff",
    },
    {
      title: "کل کاربران",
      value: formatPrice(data.users.total),
      description: "کاربران ثبت‌نام‌شده",
      icon: Users,
      color: "#7c3aed",
      background: "#f5f3ff",
    },
    {
      title: "کل سفارش‌ها",
      value: formatPrice(data.orders.total),
      description: `${formatPrice(data.orders.processing)} سفارش در حال پردازش`,
      icon: ShoppingCart,
      color: "#0f766e",
      background: "#f0fdfa",
    },
    {
      title: "فروش کل",
      value: `${formatPrice(data.sales.total)} تومان`,
      description: `${formatPrice(data.payments.paid)} سفارش پرداخت‌شده`,
      icon: Wallet,
      color: "#b45309",
      background: "#fffbeb",
    },
  ];

  const orderStatuses: OrderStatusItem[] = [
    {
      label: "در انتظار",
      value: data.orders.pending,
      color: "#b45309",
      background: "#fffbeb",
    },
    {
      label: "در حال پردازش",
      value: data.orders.processing,
      color: "#1d4ed8",
      background: "#eff6ff",
    },
    {
      label: "تکمیل‌شده",
      value: data.orders.completed,
      color: "#15803d",
      background: "#f0fdf4",
    },
    {
      label: "لغوشده",
      value: data.orders.cancelled,
      color: "#b91c1c",
      background: "#fef2f2",
    },
  ];

  return (
    <div style={pageStyle}>
      <style>{dashboardStyles}</style>

      <header className="dashboard-header">
        <div className="dashboard-header-content">
          <div>
            <h1 className="dashboard-page-title">داشبورد مدیریت</h1>
            <p className="dashboard-subtitle">
              نمای کلی فروشگاه و دسترسی سریع به بخش‌های مدیریت
            </p>
          </div>

          <div className="dashboard-status">
            <span className="dashboard-status-dot" />
            پنل مدیریت فروشگاه
          </div>
        </div>
      </header>

      <section className="dashboard-section">
        <div className="dashboard-section-heading">
          <div>
            <h2 className="dashboard-section-title">دسترسی سریع</h2>
            <p className="dashboard-section-description">
              برای ورود به هر بخش، کارت مربوط به آن را انتخاب کن.
            </p>
          </div>
        </div>

        <div className="dashboard-quick-links">
          {quickLinks.map((item) => {
            const Icon = item.icon;

            return (
              <Link key={item.to} to={item.to} className="dashboard-quick-link">
                <div className="dashboard-quick-link-top">
                  <div
                    className="dashboard-quick-link-icon"
                    style={{
                      background: item.background,
                      color: item.color,
                    }}
                    aria-hidden="true"
                  >
                    <Icon size={25} strokeWidth={1.8} />
                  </div>

                  <span className="dashboard-open-icon" aria-hidden="true">
                    <ArrowUpLeft size={19} strokeWidth={1.8} />
                  </span>
                </div>

                <h3 className="dashboard-quick-link-title">{item.title}</h3>

                <p className="dashboard-quick-link-description">
                  {item.description}
                </p>

                <div
                  className="dashboard-quick-link-action"
                  style={{ color: item.color }}
                >
                  <span>{item.action}</span>
                  <ArrowLeft
                    className="dashboard-action-arrow"
                    size={17}
                    strokeWidth={1.9}
                    aria-hidden="true"
                  />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="dashboard-section">
        <div className="dashboard-section-heading">
          <div>
            <h2 className="dashboard-section-title">آمار کلی فروشگاه</h2>
            <p className="dashboard-section-description">
              خلاصه‌ای از عملکرد فعلی فروشگاه
            </p>
          </div>
        </div>

        <div className="dashboard-stats-grid">
          {stats.map((card) => {
            const Icon = card.icon;

            return (
              <div className="dashboard-stat-card" key={card.title}>
                <div className="dashboard-stat-heading">
                  <span
                    className="dashboard-stat-icon"
                    style={{
                      background: card.background,
                      color: card.color,
                    }}
                    aria-hidden="true"
                  >
                    <Icon size={22} strokeWidth={1.8} />
                  </span>

                  <span className="dashboard-stat-label">{card.title}</span>
                </div>

                <div className="dashboard-stat-value">{card.value}</div>

                <div className="dashboard-stat-description">
                  {card.description}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="dashboard-lower-grid">
        <section className="dashboard-panel" style={panelStyle}>
          <div className="dashboard-panel-heading">
            <div>
              <h2 className="dashboard-panel-title">وضعیت سفارش‌ها</h2>
              <p className="dashboard-panel-description">
                تفکیک سفارش‌ها بر اساس وضعیت
              </p>
            </div>

            <Link to="/admin/orders" className="dashboard-text-link">
              مشاهده سفارش‌ها
              <ArrowLeft size={15} aria-hidden="true" />
            </Link>
          </div>

          <div className="dashboard-order-statuses">
            {orderStatuses.map((status) => (
              <div
                className="dashboard-order-status"
                key={status.label}
                style={{ background: status.background }}
              >
                <span style={{ color: status.color }}>{status.label}</span>

                <strong style={{ color: status.color }}>
                  {formatPrice(status.value)}
                </strong>
              </div>
            ))}
          </div>
        </section>

        <section className="dashboard-panel" style={panelStyle}>
          <div className="dashboard-panel-heading">
            <div>
              <h2 className="dashboard-panel-title">وضعیت پرداخت‌ها</h2>
              <p className="dashboard-panel-description">
                خلاصه سفارش‌های پرداخت‌شده و پرداخت‌نشده
              </p>
            </div>
          </div>

          <div className="dashboard-payment-grid">
            <div className="dashboard-payment-card dashboard-payment-paid">
              <div className="dashboard-payment-label">
                <span className="dashboard-payment-indicator" />
                پرداخت‌شده
              </div>

              <strong>{formatPrice(data.payments.paid)}</strong>
            </div>

            <div className="dashboard-payment-card dashboard-payment-unpaid">
              <div className="dashboard-payment-label">
                <span className="dashboard-payment-indicator" />
                پرداخت‌نشده
              </div>

              <strong>{formatPrice(data.payments.unpaid)}</strong>
            </div>
          </div>

          <div className="dashboard-payment-note">
            برای بررسی جزئیات هر سفارش و وضعیت آن، به بخش مدیریت سفارش‌ها مراجعه
            کن.
          </div>
        </section>
      </div>
    </div>
  );
}

const dashboardStyles = `
  .dashboard-header {
    margin-bottom: 30px;
    padding: 25px 26px;
    background: linear-gradient(120deg, #111c35, #1e293b);
    border: 1px solid #273449;
    border-radius: 14px;
    color: #fff;
  }

  .dashboard-header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 18px;
  }

  .dashboard-page-title {
    margin: 0 0 8px;
    color: #111827;
    font-size: 27px;
    font-weight: 850;
    line-height: 1.7;
  }

  .dashboard-header .dashboard-page-title {
    color: #fff;
  }

  .dashboard-subtitle {
    margin: 0;
    color: #cbd5e1;
    font-size: 13px;
    line-height: 2;
  }

  .dashboard-status {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    padding: 9px 12px;
    border: 1px solid rgba(134, 239, 172, 0.25);
    border-radius: 9px;
    background: rgba(22, 101, 52, 0.22);
    color: #bbf7d0;
    font-size: 12px;
    font-weight: 700;
    white-space: nowrap;
  }

  .dashboard-status-dot {
    width: 7px;
    height: 7px;
    flex-shrink: 0;
    border-radius: 50%;
    background: #4ade80;
  }

  .dashboard-section {
    margin-bottom: 30px;
  }

  .dashboard-section-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;
  }

  .dashboard-section-title {
    margin: 0 0 5px;
    color: #111827;
    font-size: 19px;
    font-weight: 800;
    line-height: 1.8;
  }

  .dashboard-section-description {
    margin: 0;
    color: #64748b;
    font-size: 12px;
    line-height: 1.9;
  }

  .dashboard-quick-links {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
  }

  .dashboard-quick-link {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 208px;
    padding: 21px;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    background: #fff;
    color: #111827;
    text-decoration: none;
    box-sizing: border-box;
    box-shadow: 0 3px 12px rgba(15, 23, 42, 0.035);
    transition:
      transform 0.18s ease,
      box-shadow 0.18s ease,
      border-color 0.18s ease;
  }

  .dashboard-quick-link:hover {
    transform: translateY(-3px);
    border-color: #c7d2fe;
    box-shadow: 0 12px 26px rgba(15, 23, 42, 0.075);
  }

  .dashboard-quick-link:focus-visible,
  .dashboard-text-link:focus-visible {
    outline: 2px solid #60a5fa;
    outline-offset: 3px;
  }

  .dashboard-quick-link-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;
  }

  .dashboard-quick-link-icon,
  .dashboard-stat-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    border: 1px solid rgba(148, 163, 184, 0.16);
    box-shadow: 0 3px 8px rgba(15, 23, 42, 0.04);
    transition:
      transform 180ms ease,
      box-shadow 180ms ease;
  }

  .dashboard-quick-link-icon {
    width: 50px;
    height: 50px;
    border-radius: 14px;
  }

  .dashboard-stat-icon {
    width: 43px;
    height: 43px;
    border-radius: 12px;
  }

  .dashboard-quick-link:hover .dashboard-quick-link-icon {
    transform: translateY(-2px);
    box-shadow: 0 6px 14px rgba(15, 23, 42, 0.09);
  }

  .dashboard-open-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    background: #f8fafc;
    color: #64748b;
    transition:
      background 0.18s ease,
      color 0.18s ease;
  }

  .dashboard-quick-link:hover .dashboard-open-icon {
    border-color: #cbd5e1;
    background: #f1f5f9;
    color: #334155;
  }

  .dashboard-quick-link-title {
    margin: 0 0 7px;
    font-size: 16px;
    font-weight: 800;
    line-height: 1.8;
  }

  .dashboard-quick-link-description {
    margin: 0 0 15px;
    color: #64748b;
    font-size: 12px;
    line-height: 2;
  }

  .dashboard-quick-link-action {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-top: auto;
    padding-top: 13px;
    border-top: 1px solid #f1f5f9;
    font-size: 12px;
    font-weight: 750;
  }

  .dashboard-action-arrow {
    flex-shrink: 0;
    transition: transform 0.18s ease;
  }

  .dashboard-quick-link:hover .dashboard-action-arrow {
    transform: translateX(-3px);
  }

  .dashboard-stats-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 15px;
  }

  .dashboard-stat-card {
    min-width: 0;
    padding: 19px;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    background: #fff;
    box-sizing: border-box;
    box-shadow: 0 3px 12px rgba(15, 23, 42, 0.035);
    transition:
      transform 0.18s ease,
      border-color 0.18s ease,
      box-shadow 0.18s ease;
  }

  .dashboard-stat-card:hover {
    transform: translateY(-2px);
    border-color: #c7d2fe;
    box-shadow: 0 8px 20px rgba(15, 23, 42, 0.055);
  }

  .dashboard-stat-heading {
    display: flex;
    align-items: center;
    gap: 11px;
    margin-bottom: 16px;
  }

  .dashboard-stat-label {
    color: #64748b;
    font-size: 12px;
    line-height: 1.8;
  }

  .dashboard-stat-value {
    margin-bottom: 7px;
    color: #111827;
    font-size: clamp(17px, 1.8vw, 24px);
    font-weight: 850;
    line-height: 1.9;
    overflow-wrap: anywhere;
  }

  .dashboard-stat-description {
    color: #64748b;
    font-size: 11px;
    line-height: 1.9;
  }

  .dashboard-lower-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18px;
  }

  .dashboard-panel {
    box-shadow: 0 3px 12px rgba(15, 23, 42, 0.035);
  }

  .dashboard-panel-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 20px;
  }

  .dashboard-panel-title {
    margin: 0 0 5px;
    color: #111827;
    font-size: 17px;
    font-weight: 800;
    line-height: 1.8;
  }

  .dashboard-panel-description {
    margin: 0;
    color: #64748b;
    font-size: 11px;
    line-height: 1.8;
  }

  .dashboard-text-link {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 8px 10px;
    border: 1px solid #dbeafe;
    border-radius: 9px;
    background: #eff6ff;
    color: #1d4ed8;
    font-size: 11px;
    font-weight: 750;
    text-decoration: none;
    transition: background 0.18s ease;
  }

  .dashboard-text-link:hover {
    background: #dbeafe;
  }

  .dashboard-order-statuses {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .dashboard-order-status {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;
    min-width: 0;
    padding: 14px;
    border: 1px solid rgba(148, 163, 184, 0.12);
    border-radius: 10px;
  }

  .dashboard-order-status span {
    font-size: 12px;
    line-height: 1.8;
  }

  .dashboard-order-status strong {
    font-size: 19px;
    font-weight: 850;
  }

  .dashboard-payment-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .dashboard-payment-card {
    min-width: 0;
    padding: 16px;
    border: 1px solid transparent;
    border-radius: 11px;
  }

  .dashboard-payment-paid {
    border-color: #dcfce7;
    background: #f0fdf4;
    color: #166534;
  }

  .dashboard-payment-unpaid {
    border-color: #ffedd5;
    background: #fff7ed;
    color: #9a3412;
  }

  .dashboard-payment-label {
    display: flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 12px;
    font-size: 12px;
  }

  .dashboard-payment-indicator {
    width: 7px;
    height: 7px;
    flex-shrink: 0;
    border-radius: 50%;
    background: currentColor;
  }

  .dashboard-payment-card strong {
    font-size: 24px;
    font-weight: 850;
    line-height: 1.8;
    overflow-wrap: anywhere;
  }

  .dashboard-payment-note {
    margin-top: 16px;
    padding: 12px 14px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    background: #f8fafc;
    color: #64748b;
    font-size: 11px;
    line-height: 2;
  }

  .dashboard-message {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 18px;
    padding: 18px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    background: #fff;
    color: #64748b;
    font-size: 13px;
  }

  .dashboard-loader {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    border: 2px solid #dbeafe;
    border-top-color: #2563eb;
    border-radius: 50%;
    animation: dashboard-spin 0.75s linear infinite;
  }

  .dashboard-error {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 18px;
    padding: 18px;
    border: 1px solid #fecaca;
    border-radius: 10px;
    background: #fff;
    color: #b91c1c;
    font-size: 13px;
    line-height: 1.9;
  }

  .dashboard-error-icon {
    display: grid;
    place-items: center;
    width: 25px;
    height: 25px;
    flex-shrink: 0;
    border-radius: 50%;
    background: #fee2e2;
    color: #b91c1c;
    font-weight: 800;
  }

  @keyframes dashboard-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .dashboard-quick-link,
    .dashboard-action-arrow,
    .dashboard-open-icon,
    .dashboard-stat-card,
    .dashboard-quick-link-icon,
    .dashboard-stat-icon {
      transition: none;
    }

    .dashboard-loader {
      animation-duration: 2s;
    }
  }

  @media (max-width: 1100px) {
    .dashboard-stats-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .dashboard-quick-links {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .dashboard-lower-grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  @media (max-width: 768px) {
    .dashboard-header {
      padding: 20px;
      margin-bottom: 24px;
    }

    .dashboard-page-title {
      font-size: 23px;
    }

    .dashboard-quick-links {
      grid-template-columns: minmax(0, 1fr);
      gap: 12px;
    }

    .dashboard-quick-link {
      min-height: 0;
      padding: 17px;
    }

    .dashboard-section {
      margin-bottom: 24px;
    }

    .dashboard-panel {
      padding: 16px !important;
    }

    .dashboard-lower-grid {
      gap: 14px;
    }
  }

  @media (max-width: 420px) {
    .dashboard-stats-grid {
      grid-template-columns: minmax(0, 1fr);
    }

    .dashboard-header-content {
      align-items: flex-start;
      flex-direction: column;
    }

    .dashboard-order-statuses {
      grid-template-columns: minmax(0, 1fr);
    }

    .dashboard-stat-card {
      padding: 16px;
    }
  }
`;

export default AdminDashboard;
