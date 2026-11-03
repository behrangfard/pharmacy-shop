import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import {
  Package,
  Users,
  ShoppingCart,
  Wallet,
  Tags,
  ArrowLeft,
  ArrowUpLeft,
  CheckCircle2,
  Clock3,
  Truck,
  XCircle,
  RefreshCw,
  Activity,
  TrendingUp,
  TrendingDown,
  Sparkles,
  ChartNoAxesCombined,
  Globe,
  Phone,
  Store,
  CircleHelp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { adminApi } from "../services/api";

interface DailySalesItem {
  date: string;
  day: string;
  sales: number | string;
}

interface SalesChannelItem {
  channel: string;
  label: string;
  orders: number;
  sales: number | string;
  percentage: number;
}

interface DashboardData {
  products: { total: number; active: number };
  users: { total: number };
  orders: {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    cancelled: number;
  };
  payments: { paid: number; unpaid: number };
  sales: {
    total: number | string;
    current_week: number | string;
    previous_week: number | string;
    change_percent: number | null;
    week_starts_at?: string;
    next_week_starts_at?: string;
    daily?: DailySalesItem[];
    channels?: SalesChannelItem[];
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
  icon: LucideIcon;
}

const formatNumber = (value: string | number | null | undefined) =>
  new Intl.NumberFormat("fa-IR").format(Number(value) || 0);

const formatPrice = (value: string | number | null | undefined) =>
  `${formatNumber(value)} تومان`;

const pageStyle: CSSProperties = {
  width: "100%",
  maxWidth: "none",
  minWidth: 0,
  boxSizing: "border-box",
};

const quickLinks: QuickLinkItem[] = [
  {
    to: "/admin/products",
    title: "مدیریت محصولات",
    description: "محصولات، قیمت‌ها و موجودی فروشگاه را مدیریت کن.",
    icon: Package,
    color: "#c96548",
    background: "#fff0eb",
    action: "مشاهده محصولات",
  },
  {
    to: "/admin/categories",
    title: "دسته‌بندی‌ها",
    description: "ساختار دسته‌بندی محصولات فروشگاه را سامان بده.",
    icon: Tags,
    color: "#397c91",
    background: "#eaf3f5",
    action: "مدیریت دسته‌بندی‌ها",
  },
  {
    to: "/admin/orders",
    title: "مدیریت سفارش‌ها",
    description: "سفارش‌های مشتریان و وضعیت پردازش آن‌ها را پیگیری کن.",
    icon: ShoppingCart,
    color: "#54785a",
    background: "#edf4e9",
    action: "مشاهده سفارش‌ها",
  },
];

const channelPresentation: Record<
  string,
  { label: string; icon: LucideIcon; color: string; background: string }
> = {
  website: {
    label: "وب‌سایت",
    icon: Globe,
    color: "#397c91",
    background: "#eaf3f5",
  },
  instagram: {
    label: "اینستاگرام",
    icon: Globe,
    color: "#b65d8b",
    background: "#faedf4",
  },
  phone: {
    label: "تلفنی",
    icon: Phone,
    color: "#b47b3c",
    background: "#fbf2e5",
  },
  in_person: {
    label: "حضوری",
    icon: Store,
    color: "#54785a",
    background: "#edf4e9",
  },
  other: {
    label: "سایر",
    icon: CircleHelp,
    color: "#858d98",
    background: "#f0f2f4",
  },
};

const dashboardStyles = `
.dashboard-page {
  --mehr-ink:#17212b;
  --mehr-muted:#89929d;
  --mehr-line:#edf0f2;
  --mehr-shadow:0 8px 26px rgba(35,47,58,.045);
  direction:rtl;
  color:var(--mehr-ink);
  font-family:inherit;
  min-width:0;
  width:100%;
}
.dashboard-page *, .dashboard-page *::before, .dashboard-page *::after {
  box-sizing:border-box;
}
.dashboard-header {
  display:flex;justify-content:space-between;align-items:flex-end;
  flex-wrap:wrap;gap:18px;margin-bottom:24px;
}
.dashboard-eyebrow {
  display:inline-flex;align-items:center;gap:7px;color:#72808e;
  font-size:11px;font-weight:800;margin-bottom:8px;
}
.dashboard-title {
  margin:0;font-size:clamp(23px,2.5vw,29px);font-weight:900;
  letter-spacing:-.7px;line-height:1.8;color:#17212b;
}
.dashboard-subtitle {margin:4px 0 0;color:#89929d;font-size:12px;line-height:2;}
.dashboard-header-actions {display:flex;align-items:center;flex-wrap:wrap;gap:10px;}
.dashboard-header-badge,.dashboard-refresh-button {
  display:inline-flex;align-items:center;justify-content:center;gap:7px;
  padding:10px 13px;border:1px solid #e8ecef;border-radius:10px;
  background:#fff;color:#687583;font-size:10px;font-weight:700;
}
.dashboard-refresh-button {color:#344454;font-family:inherit;font-size:11px;cursor:pointer;}
.dashboard-refresh-button:hover {background:#f8fafb;border-color:#dce2e6;}
.dashboard-refresh-button:disabled {cursor:not-allowed;opacity:.6;}
.dashboard-section {margin-bottom:25px;min-width:0;}
.dashboard-section-heading {
  display:flex;align-items:center;justify-content:space-between;
  gap:12px;margin-bottom:14px;
}
.dashboard-section-title {margin:0;font-size:15px;font-weight:900;color:#263442;}
.dashboard-section-caption {color:#929ba5;font-size:10px;}
.dashboard-stats-grid {display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;}
.dashboard-stat-card {
  min-width:0;padding:18px;border:1px solid #edf0f2;border-radius:15px;
  background:#fff;box-shadow:var(--mehr-shadow);
  transition:transform .2s ease,box-shadow .2s ease;
}
.dashboard-stat-card:hover {transform:translateY(-2px);box-shadow:0 12px 28px rgba(35,47,58,.07);}
.dashboard-stat-top {display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:16px;}
.dashboard-stat-icon {display:flex;align-items:center;justify-content:center;flex:0 0 42px;width:42px;height:42px;border-radius:12px;}
.dashboard-stat-label {color:#85909c;font-size:11px;font-weight:700;}
.dashboard-stat-value {margin:0;overflow-wrap:anywhere;color:#202d39;font-size:clamp(18px,1.8vw,25px);font-weight:900;line-height:1.8;}
.dashboard-stat-description {margin:5px 0 0;color:#9aa2ab;font-size:10px;line-height:1.9;}
.dashboard-quick-grid {display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;}
.dashboard-quick-card {
  display:flex;flex-direction:column;min-width:0;padding:19px;border:1px solid #edf0f2;
  border-radius:15px;background:#fff;color:inherit;text-decoration:none;box-shadow:var(--mehr-shadow);
  transition:transform .2s ease,border-color .2s ease,box-shadow .2s ease;
}
.dashboard-quick-card:hover {transform:translateY(-2px);border-color:#dfe5e9;box-shadow:0 12px 28px rgba(35,47,58,.07);}
.dashboard-quick-top {display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px;}
.dashboard-quick-icon {display:flex;align-items:center;justify-content:center;width:43px;height:43px;border-radius:12px;}
.dashboard-quick-arrow {color:#a0a8b0;transition:transform .2s ease;}
.dashboard-quick-card:hover .dashboard-quick-arrow {transform:translateX(-3px);}
.dashboard-quick-title {margin:0 0 6px;color:#273542;font-size:13px;font-weight:900;}
.dashboard-quick-description {flex:1;margin:0;color:#8c96a0;font-size:10px;line-height:2.1;}
.dashboard-quick-action {display:inline-flex;align-items:center;gap:6px;margin-top:15px;color:#607687;font-size:10px;font-weight:800;}

/* نمودارها: فروش در سمت راست و عریض‌تر، کانال‌ها در سمت چپ */
.dashboard-charts-grid {
  display:grid;
  direction:rtl;
  grid-template-columns:minmax(0,3fr) minmax(0,1fr);
  gap:16px;
  align-items:stretch;
  margin-bottom:25px;
}
.dashboard-chart-panel {min-width:0;}
.dashboard-chart-panel .dashboard-panel {height:100%;}
.dashboard-lower-grid {display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);gap:16px;align-items:stretch;}
.dashboard-panel {min-width:0;padding:20px;border:1px solid #edf0f2;border-radius:15px;background:#fff;box-shadow:var(--mehr-shadow);}
.dashboard-panel-header {display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:20px;}
.dashboard-panel-title {margin:0;color:#263442;font-size:13px;font-weight:900;}
.dashboard-panel-subtitle {margin:5px 0 0;color:#9aa2ab;font-size:10px;line-height:1.8;}
.dashboard-status-list {display:flex;flex-direction:column;gap:17px;}
.dashboard-status-row {display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px;}
.dashboard-status-info {display:flex;align-items:center;gap:9px;min-width:0;}
.dashboard-status-icon {display:flex;align-items:center;justify-content:center;flex:0 0 34px;width:34px;height:34px;border-radius:10px;}
.dashboard-status-label {color:#586573;font-size:11px;font-weight:700;}
.dashboard-status-value {color:#273542;font-size:12px;font-weight:900;font-variant-numeric:tabular-nums;}
.dashboard-status-track {grid-column:1 / -1;width:100%;height:6px;overflow:hidden;border-radius:999px;background:#f0f2f4;}
.dashboard-status-progress {height:100%;border-radius:inherit;transition:width .35s ease;}
.dashboard-payment-summary {display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:17px;}
.dashboard-payment-card {min-width:0;padding:15px;border-radius:12px;}
.dashboard-payment-label {color:#7f8b96;font-size:10px;font-weight:700;}
.dashboard-payment-value {margin-top:7px;overflow-wrap:anywhere;color:#273542;font-size:clamp(17px,2vw,22px);font-weight:900;}
.dashboard-payment-note {margin:0;padding-top:15px;border-top:1px solid #f0f2f4;color:#929ba5;font-size:10px;line-height:2.1;}
.dashboard-message {display:flex;align-items:center;gap:10px;margin-bottom:20px;padding:15px;border:1px solid #f2d6cf;border-radius:12px;background:#fff7f4;color:#a95842;font-size:12px;line-height:1.9;}
.dashboard-message button {margin-right:auto;padding:7px 10px;border:1px solid #ecd2ca;border-radius:8px;background:#fff;color:#a95842;font-family:inherit;font-size:10px;font-weight:800;cursor:pointer;}
.dashboard-loading {display:flex;align-items:center;justify-content:center;gap:10px;min-height:180px;border:1px solid #edf0f2;border-radius:15px;background:#fff;color:#89929d;font-size:12px;}
.dashboard-spin {animation:dashboard-spin 1s linear infinite;}
@keyframes dashboard-spin {to {transform:rotate(360deg);}}
.dashboard-welcome-card {
  position:relative;isolation:isolate;overflow:hidden;display:grid;
  grid-template-columns:minmax(0,1fr) minmax(230px,290px);align-items:center;
  gap:28px;margin:0 0 26px;padding:27px 29px;min-width:0;
  border:1px solid #35515a;border-radius:18px;
  background:linear-gradient(118deg,#263f4b 0%,#2d4b56 55%,#385b65 100%);
  color:#fff;box-shadow:0 13px 32px rgba(29,55,64,.12);
}
.dashboard-welcome-card::before {content:"";position:absolute;z-index:-1;width:290px;height:290px;left:-100px;top:-175px;border:1px solid rgba(229,194,123,.2);border-radius:50%;box-shadow:0 0 0 24px rgba(229,194,123,.035),0 0 0 50px rgba(229,194,123,.025);}
.dashboard-welcome-content {position:relative;z-index:1;min-width:0;}
.dashboard-welcome-label {display:inline-flex;align-items:center;gap:7px;margin-bottom:11px;color:#e5c27b;font-size:10px;font-weight:800;}
.dashboard-welcome-title {margin:0;color:#fff;font-size:clamp(19px,2vw,24px);font-weight:900;line-height:1.9;}
.dashboard-welcome-description {max-width:500px;margin:5px 0 0;color:#cfdbde;font-size:11px;line-height:2.2;}
.dashboard-welcome-link {display:inline-flex;align-items:center;justify-content:center;gap:8px;margin-top:17px;padding:10px 14px;border:1px solid rgba(229,194,123,.42);border-radius:9px;background:rgba(229,194,123,.1);color:#f4dca6;font-family:inherit;font-size:10px;font-weight:800;text-decoration:none;transition:background .2s ease;}
.dashboard-welcome-link:hover {background:rgba(229,194,123,.18);}
.dashboard-weekly-sales {position:relative;z-index:1;min-width:0;padding:18px 19px;border:1px solid rgba(255,255,255,.14);border-radius:13px;background:rgba(255,255,255,.075);}
.dashboard-weekly-sales-top {display:flex;align-items:center;justify-content:space-between;gap:10px;}
.dashboard-weekly-sales-label {color:#d1dfe1;font-size:10px;font-weight:700;}
.dashboard-weekly-sales-icon {display:flex;align-items:center;justify-content:center;width:36px;height:36px;border:1px solid rgba(229,194,123,.23);border-radius:10px;background:rgba(229,194,123,.11);color:#e5c27b;}
.dashboard-weekly-sales-value {margin:8px 0 9px;color:#fff;font-size:clamp(20px,2.2vw,27px);font-weight:900;line-height:1.8;overflow-wrap:anywhere;}
.dashboard-weekly-sales-meta {display:flex;align-items:center;flex-wrap:wrap;gap:7px;margin-top:6px;color:#c5d4d7;font-size:9px;line-height:1.9;}
.dashboard-weekly-change {display:inline-flex;align-items:center;gap:4px;padding:4px 7px;border-radius:7px;font-size:10px;font-weight:800;}
.dashboard-weekly-change.is-up {background:rgba(119,207,145,.14);color:#a8e5b7;}
.dashboard-weekly-change.is-down {background:rgba(255,157,132,.14);color:#ffc0ae;}
.dashboard-weekly-change.is-neutral {background:rgba(255,255,255,.09);color:#d5dfe0;}
.dashboard-weekly-divider {height:1px;margin:12px 0;background:rgba(255,255,255,.12);}
.dashboard-weekly-period {color:#b9cbd0;font-size:9px;line-height:1.9;}
.dashboard-chart-value {font-size:12px;font-weight:900;color:#263442;overflow-wrap:anywhere;}
.dashboard-chart-muted {color:#929ba5;font-size:10px;line-height:2;}
.dashboard-sales-chart { min-width:0; }
.dashboard-sales-chart-summary { display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;margin:-2px 0 6px; }
.dashboard-sales-chart-summary-label { display:block;color:#929ba5;font-size:10px;line-height:1.9; }
.dashboard-sales-chart-summary-value { display:block;margin-top:3px;color:#263442;font-size:16px;font-weight:900;line-height:1.8;overflow-wrap:anywhere; }
.dashboard-sales-chart-legend { display:inline-flex;align-items:center;gap:7px;color:#718072;font-size:10px;font-weight:800;white-space:nowrap; }
.dashboard-sales-chart-legend i,.dashboard-tooltip-dot { display:inline-block;width:8px;height:8px;border-radius:50%;background:#638965; }
.dashboard-chart-wrap { width:100%;min-width:0;height:300px;min-height:240px;display:flex;align-items:stretch; }
.dashboard-chart-svg { display:block;width:100%;height:100%;max-height:none;min-height:0;overflow:visible; }
.dashboard-chart-gridline {stroke:#edf0f2;stroke-width:1;stroke-dasharray:3 5;}
.dashboard-chart-label {fill:#8c96a0;font-size:10px;font-family:inherit;}
.dashboard-chart-tooltip {display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:4px;padding:12px 14px;border:1px solid #e8eee7;border-radius:11px;background:#f8faf7;color:#596775;font-size:11px;}
.dashboard-chart-tooltip span {display:inline-flex;align-items:center;gap:8px;}
.dashboard-chart-tooltip strong {color:#2f5c3b;font-size:12px;font-weight:900;}
.dashboard-sales-chart-hint { margin:8px 0 0;color:#a0a8b0;font-size:10px;line-height:1.9; }
.sales-chart-point { cursor:pointer;outline:none; }
.sales-chart-point:focus-visible circle:last-child { stroke:#315b3b;stroke-width:2; }
.dashboard-channel-list {display:flex;flex-direction:column;gap:15px;margin-top:20px;}
.dashboard-channel-row {display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;}
.dashboard-channel-main {display:flex;align-items:center;gap:9px;min-width:0;}
.dashboard-channel-icon {display:flex;align-items:center;justify-content:center;flex:0 0 34px;width:34px;height:34px;border-radius:10px;}
.dashboard-channel-label {color:#43515f;font-size:11px;font-weight:800;}
.dashboard-channel-meta {margin-top:3px;color:#929ba5;font-size:9px;}
.dashboard-channel-percent {color:#263442;font-size:12px;font-weight:900;white-space:nowrap;}
.dashboard-channel-track {grid-column:1 / -1;height:6px;overflow:hidden;border-radius:ظpx;background:#f0f2f4;}
.dashboard-channel-progress {height:100%;border-radius:inherit;}
.dashboard-channel-total {display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:20px;padding-top:15px;border-top:1px solid #edf0f2;color:#7d8994;font-size:10px;}
.dashboard-empty-note {padding:14px;border-radius:10px;background:#f7f9fa;color:#929ba5;font-size:10px;line-height:2;}

@media (max-width:1100px) {
  .dashboard-stats-grid {grid-template-columns:repeat(2,minmax(0,1fr));}
  .dashboard-lower-grid {grid-template-columns:minmax(0,1fr);}
  .dashboard-charts-grid {grid-template-columns:minmax(0,2fr) minmax(0,1fr);}
}
@media (max-width:760px) {
  .dashboard-quick-grid {grid-template-columns:minmax(0,1fr);}
  .dashboard-header {align-items:flex-start;}
  .dashboard-header-actions {width:100%;}
  .dashboard-welcome-card {grid-template-columns:minmax(0,1fr) minmax(210px,.8fr);gap:17px;padding:21px;}
  .dashboard-charts-grid {grid-template-columns:minmax(0,1fr);}
  .dashboard-chart-wrap {height:270px;min-height:220px;}
}
@media (max-width:600px) {
  .dashboard-welcome-card {grid-template-columns:minmax(0,1fr);gap:17px;padding:19px;}
  .dashboard-weekly-sales {padding:16px;}
  .dashboard-welcome-title {font-size:19px;}
}
@media (max-width:480px) {
  .dashboard-stats-grid {grid-template-columns:minmax(0,1fr);}
  .dashboard-stat-card,.dashboard-panel {padding:15px;}
  .dashboard-payment-summary {grid-template-columns:minmax(0,1fr);}
  .dashboard-chart-wrap {height:235px;min-height:200px;}
  .dashboard-sales-chart-summary-value {font-size:14px;}
  .dashboard-title {font-size:23px;}
  .dashboard-header-badge {display:none;}
}
@media (prefers-reduced-motion:reduce) {
  .dashboard-page *, .dashboard-page *::before, .dashboard-page *::after {
    animation-duration:.01ms !important;animation-iteration-count:1 !important;
    transition-duration:.01ms !important;scroll-behavior:auto !important;
  }
}
`;

function SalesLineChart({ items }: { items: DailySalesItem[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const width = 760;
  const height = 330;
  const padding = { top: 28, right: 26, bottom: 46, left: 76 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const values = items.map((item) => Math.max(0, Number(item.sales) || 0));
  const maxValue = Math.max(...values, 0);
  const upperBound = maxValue > 0 ? maxValue * 1.18 : 1;
  const tickCount = 4;

  const points = items.map((item, index) => {
    const value = values[index];
    const x =
      padding.left +
      (items.length <= 1
        ? chartWidth / 2
        : (index / (items.length - 1)) * chartWidth);
    const y = padding.top + chartHeight - (value / upperBound) * chartHeight;
    return {
      x,
      y,
      value,
      label: item.day || item.date,
      date: item.date,
      key: `${item.date}-${index}`,
      index,
    };
  });

  const linePath = points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const previous = points[index - 1];
    const middleX = (previous.x + point.x) / 2;
    return `${path} C ${middleX} ${previous.y}, ${middleX} ${point.y}, ${point.x} ${point.y}`;
  }, "");

  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  const areaPath =
    points.length > 0
      ? `${linePath} L ${lastPoint.x} ${padding.top + chartHeight} L ${firstPoint.x} ${padding.top + chartHeight} Z`
      : "";

  const formatAxisValue = (value: number) => {
    if (value >= 1_000_000)
      return `${(value / 1_000_000).toLocaleString("fa-IR", { maximumFractionDigits: 1 })}م`;
    if (value >= 1_000)
      return `${(value / 1_000).toLocaleString("fa-IR", { maximumFractionDigits: 1 })}ه`;
    return formatNumber(value);
  };

  const activePoint =
    activeIndex === null ? null : (points[activeIndex] ?? null);

  if (items.length === 0) {
    return (
      <div className="dashboard-empty-note">
        هنوز اطلاعاتی برای نمایش روند فروش وجود ندارد.
      </div>
    );
  }

  return (
    <div
      className="dashboard-sales-chart"
      onMouseLeave={() => setActiveIndex(null)}
    >
      <div className="dashboard-sales-chart-summary">
        <div>
          <span className="dashboard-sales-chart-summary-label">
            مجموع فروش ثبت‌شده
          </span>
          <strong className="dashboard-sales-chart-summary-value">
            {formatPrice(values.reduce((sum, value) => sum + value, 0))}
          </strong>
        </div>
        <span className="dashboard-sales-chart-legend">
          <i /> فروش روزانه
        </span>
      </div>

      <div className="dashboard-chart-wrap">
        <svg
          className="dashboard-chart-svg"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="نمودار تعاملی روند فروش روزانه"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient
              id="mehrSalesAreaGradient"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor="#739777" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#739777" stopOpacity="0.015" />
            </linearGradient>
            <linearGradient
              id="mehrSalesLineGradient"
              x1="0"
              y1="0"
              x2="1"
              y2="0"
            >
              <stop offset="0%" stopColor="#8cae83" />
              <stop offset="100%" stopColor="#477653" />
            </linearGradient>
            <filter
              id="mehrSalesPointShadow"
              x="-100%"
              y="-100%"
              width="300%"
              height="300%"
            >
              <feDropShadow
                dx="0"
                dy="2"
                stdDeviation="2.5"
                floodColor="#477653"
                floodOpacity="0.2"
              />
            </filter>
          </defs>

          {Array.from({ length: tickCount + 1 }, (_, index) => {
            const value = (upperBound / tickCount) * index;
            const y =
              padding.top + chartHeight - (index / tickCount) * chartHeight;
            return (
              <g key={`sales-tick-${index}`}>
                <line
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                  className="dashboard-chart-gridline"
                />
                <text
                  x={padding.left - 12}
                  y={y + 4}
                  textAnchor="end"
                  className="dashboard-chart-label"
                >
                  {formatAxisValue(value)}
                </text>
              </g>
            );
          })}

          {points.length > 1 && (
            <path d={areaPath} fill="url(#mehrSalesAreaGradient)" />
          )}
          {points.length > 1 && (
            <path
              d={linePath}
              fill="none"
              stroke="url(#mehrSalesLineGradient)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {activePoint && (
            <line
              x1={activePoint.x}
              x2={activePoint.x}
              y1={padding.top}
              y2={padding.top + chartHeight}
              stroke="#8ba58b"
              strokeWidth="1"
              strokeDasharray="4 5"
            />
          )}

          {points.map((point) => (
            <g
              key={point.key}
              className="sales-chart-point"
              onMouseEnter={() => setActiveIndex(point.index)}
              onFocus={() => setActiveIndex(point.index)}
            >
              <circle
                cx={point.x}
                cy={point.y}
                r={activeIndex === point.index ? 11 : 8}
                fill="#6c936e"
                opacity={activeIndex === point.index ? 0.18 : 0.1}
              />
              <circle
                cx={point.x}
                cy={point.y}
                r={activeIndex === point.index ? 5 : 3.5}
                fill="#fff"
                stroke="#52775a"
                strokeWidth={activeIndex === point.index ? 3 : 2}
                filter="url(#mehrSalesPointShadow)"
              />
              <circle
                cx={point.x}
                cy={point.y}
                r="12"
                fill="transparent"
                tabIndex={0}
                role="button"
                aria-label={`${point.label}: ${formatPrice(point.value)}`}
                onFocus={() => setActiveIndex(point.index)}
                onBlur={() => setActiveIndex(null)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setActiveIndex(point.index);
                  }
                }}
              />
            </g>
          ))}

          {points.map((point, index) => {
            const labelStep = Math.max(1, Math.ceil(points.length / 7));
            if (
              index !== 0 &&
              index !== points.length - 1 &&
              index % labelStep !== 0
            )
              return null;
            return (
              <text
                key={`sales-date-${point.key}`}
                x={point.x}
                y={height - 13}
                textAnchor="middle"
                className="dashboard-chart-label"
              >
                {point.label}
              </text>
            );
          })}
        </svg>
      </div>

      {activePoint && (
        <div className="dashboard-chart-tooltip" role="status">
          <span>
            <i className="dashboard-tooltip-dot" />
            {activePoint.label}
            {activePoint.date && activePoint.date !== activePoint.label
              ? ` · ${activePoint.date}`
              : ""}
          </span>
          <strong>{formatPrice(activePoint.value)}</strong>
        </div>
      )}
      {!activePoint && (
        <p className="dashboard-sales-chart-hint">
          برای مشاهده مبلغ فروش هر روز، نشانگر را روی نقاط نمودار قرار بده.
        </p>
      )}
    </div>
  );
}

function SalesChannelsChart({ channels }: { channels: SalesChannelItem[] }) {
  const colors: Record<string, string> = {
    website: "#397c91",
    instagram: "#b65d8b",
    phone: "#b47b3c",
    in_person: "#54785a",
    other: "#a5adb6",
  };

  const safeChannels = channels.map((channel) => ({
    ...channel,
    sales: Math.max(0, Number(channel.sales) || 0),
    orders: Math.max(0, Number(channel.orders) || 0),
    percentage: Math.max(0, Number(channel.percentage) || 0),
  }));

  const totalSales = safeChannels.reduce((sum, item) => sum + item.sales, 0);
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr)",
          alignItems: "center",
          gap: 12,
        }}
      >
        <svg
          viewBox="0 0 160 160"
          role="img"
          aria-label="نمودار سهم کانال‌های فروش"
          style={{
            display: "block",
            width: "100%",
            maxWidth: 155,
            margin: "0 auto",
          }}
        >
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="#edf0f2"
            strokeWidth="17"
          />

          {totalSales > 0 &&
            safeChannels.map((channel, index) => {
              const fraction = channel.sales / totalSales;
              const segmentLength = circumference * fraction;
              const currentOffset = offset;
              offset += segmentLength;

              return (
                <circle
                  key={`${channel.channel}-${index}`}
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="none"
                  stroke={colors[channel.channel] ?? "#a5adb6"}
                  strokeWidth="17"
                  strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
                  strokeDashoffset={-currentOffset}
                  transform="rotate(-90 80 80)"
                >
                  <title>{`${channel.label}: ${formatPrice(channel.sales)}`}</title>
                </circle>
              );
            })}

          <text x="80" y="74" textAnchor="middle" fill="#89929d" fontSize="10">
            مجموع فروش
          </text>
          <text
            x="80"
            y="94"
            textAnchor="middle"
            fill="#263442"
            fontSize="12"
            fontWeight="800"
          >
            {formatNumber(totalSales)}
          </text>
        </svg>

        <div style={{ minWidth: 0 }}>
          {safeChannels.length === 0 ? (
            <div className="dashboard-empty-note">
              اطلاعات کانال‌های فروش موجود نیست.
            </div>
          ) : (
            safeChannels.map((channel, index) => {
              const presentation =
                channelPresentation[channel.channel] ??
                channelPresentation.other;
              const Icon = presentation.icon;

              return (
                <div
                  key={`${channel.channel}-${index}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 12,
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      flex: "0 0 9px",
                      borderRadius: 3,
                      background: colors[channel.channel] ?? "#a5adb6",
                    }}
                  />
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        color: "#43515f",
                        fontSize: 10,
                        fontWeight: 800,
                      }}
                    >
                      <Icon size={13} aria-hidden="true" />
                      {channel.label || presentation.label}
                    </span>
                    <span
                      style={{
                        display: "block",
                        marginTop: 3,
                        color: "#929ba5",
                        fontSize: 9,
                      }}
                    >
                      {formatNumber(channel.orders)} سفارش
                    </span>
                  </span>
                  <strong
                    style={{
                      color: "#263442",
                      fontSize: 11,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatNumber(channel.percentage)}٪
                  </strong>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="dashboard-channel-list">
        {safeChannels.map((channel, index) => {
          const presentation =
            channelPresentation[channel.channel] ?? channelPresentation.other;
          const color = colors[channel.channel] ?? "#a5adb6";
          const percentage = Math.min(100, channel.percentage);

          return (
            <div
              className="dashboard-channel-row"
              key={`${channel.channel}-detail-${index}`}
            >
              <div className="dashboard-channel-main">
                <span
                  className="dashboard-channel-icon"
                  style={{
                    color: presentation.color,
                    background: presentation.background,
                  }}
                >
                  <presentation.icon size={16} aria-hidden="true" />
                </span>
                <span style={{ minWidth: 0 }}>
                  <span className="dashboard-channel-label">
                    {channel.label || presentation.label}
                  </span>
                  <span
                    className="dashboard-channel-meta"
                    style={{ display: "block" }}
                  >
                    {formatPrice(channel.sales)} ·{" "}
                    {formatNumber(channel.orders)} سفارش
                  </span>
                </span>
              </div>

              <span className="dashboard-channel-percent">
                {formatNumber(channel.percentage)}٪
              </span>

              <div className="dashboard-channel-track">
                <div
                  className="dashboard-channel-progress"
                  style={{ width: `${percentage}%`, background: color }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="dashboard-channel-total">
        <span>مجموع فروش کانال‌ها</span>
        <strong>{formatPrice(totalSales)}</strong>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async (initial = false) => {
    try {
      if (initial) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError("");
      const response = await adminApi.get("/admin/dashboard");
      setData(response.data.data);
    } catch {
      setError(
        initial
          ? "دریافت اطلاعات داشبورد با خطا مواجه شد."
          : "به‌روزرسانی اطلاعات داشبورد انجام نشد. دوباره تلاش کن.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard(true);
  }, [loadDashboard]);

  const weeklyChange = data?.sales?.change_percent;
  const weeklyChangeIsNumber =
    typeof weeklyChange === "number" && Number.isFinite(weeklyChange);
  const weeklyChangeIsPositive = weeklyChangeIsNumber && weeklyChange > 0;
  const weeklyChangeIsNegative = weeklyChangeIsNumber && weeklyChange < 0;

  const weeklyChangeLabel = weeklyChangeIsNumber
    ? `${weeklyChange > 0 ? "+" : ""}${formatNumber(weeklyChange)}٪`
    : null;

  const weeklyChangeClass = weeklyChangeIsPositive
    ? "is-up"
    : weeklyChangeIsNegative
      ? "is-down"
      : "is-neutral";

  const stats: StatItem[] = data
    ? [
        {
          title: "تعداد محصولات",
          value: formatNumber(data.products.total),
          description: `${formatNumber(data.products.active)} محصول فعال`,
          icon: Package,
          color: "#c96548",
          background: "#fff0eb",
        },
        {
          title: "کاربران فروشگاه",
          value: formatNumber(data.users.total),
          description: "کاربران ثبت‌نام‌شده",
          icon: Users,
          color: "#397c91",
          background: "#eaf3f5",
        },
        {
          title: "مجموع سفارش‌ها",
          value: formatNumber(data.orders.total),
          description: `${formatNumber(data.orders.processing)} سفارش در حال پردازش`,
          icon: ShoppingCart,
          color: "#54785a",
          background: "#edf4e9",
        },
        {
          title: "مجموع فروش",
          value: formatPrice(data.sales.total),
          description: `${formatNumber(data.payments.paid)} سفارش پرداخت‌شده`,
          icon: Wallet,
          color: "#b47b3c",
          background: "#fbf2e5",
        },
      ]
    : [];

  const orderStatuses: OrderStatusItem[] = data
    ? [
        {
          label: "در انتظار",
          value: data.orders.pending,
          color: "#be8d37",
          background: "#fff5e4",
          icon: Clock3,
        },
        {
          label: "در حال پردازش",
          value: data.orders.processing,
          color: "#397c91",
          background: "#edf3f8",
          icon: Truck,
        },
        {
          label: "تکمیل‌شده",
          value: data.orders.completed,
          color: "#397c91",
          background: "#edf4f8",
          icon: CheckCircle2,
        },
        {
          label: "لغوشده",
          value: data.orders.cancelled,
          color: "#c66d59",
          background: "#f9eeeb",
          icon: XCircle,
        },
      ]
    : [];

  const totalOrders = data
    ? Math.max(
        0,
        data.orders.pending +
          data.orders.processing +
          data.orders.completed +
          data.orders.cancelled,
      )
    : 0;

  const dailySales = data?.sales?.daily ?? [];
  const salesChannels = data?.sales?.channels ?? [];

  return (
    <div className="dashboard-page" style={pageStyle}>
      <style>{dashboardStyles}</style>

      <header className="dashboard-header">
        <div>
          <div className="dashboard-eyebrow">
            <Activity size={15} aria-hidden="true" />
            فضای مدیریت
          </div>
          <h1 className="dashboard-title">نمای کلی</h1>
          <p className="dashboard-subtitle">
            خلاصه‌ای از وضعیت فعلی فروشگاه و عملکرد بخش‌های مختلف.
          </p>
        </div>

        <div className="dashboard-header-actions">
          <span className="dashboard-header-badge">
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#6aab7a",
                display: "inline-block",
              }}
            />
            پنل مدیریت فروشگاه
          </span>

          <button
            type="button"
            className="dashboard-refresh-button"
            onClick={() => void loadDashboard(false)}
            disabled={loading || refreshing}
          >
            <RefreshCw
              size={14}
              className={refreshing ? "dashboard-spin" : ""}
              aria-hidden="true"
            />
            به‌روزرسانی
          </button>
        </div>
      </header>

      {loading ? (
        <div className="dashboard-loading" role="status">
          <RefreshCw size={18} className="dashboard-spin" aria-hidden="true" />
          در حال دریافت اطلاعات فروشگاه...
        </div>
      ) : error && !data ? (
        <div className="dashboard-message" role="alert">
          <XCircle size={18} aria-hidden="true" />
          <span>{error}</span>
          <button type="button" onClick={() => void loadDashboard(false)}>
            تلاش دوباره
          </button>
        </div>
      ) : data ? (
        <>
          {error && (
            <div className="dashboard-message" role="alert">
              <XCircle size={18} aria-hidden="true" />
              <span>{error}</span>
              <button type="button" onClick={() => void loadDashboard(false)}>
                تلاش دوباره
              </button>
            </div>
          )}

          <section
            className="dashboard-welcome-card"
            aria-label="خلاصه فروش هفتگی"
          >
            <div className="dashboard-welcome-content">
              <div className="dashboard-welcome-label">
                <Sparkles size={15} aria-hidden="true" />
                خلاصه هفتگی فروشگاه
              </div>

              <h2 className="dashboard-welcome-title">
                سلام، روزت پر از اتفاق‌های خوب ✨
              </h2>

              <p className="dashboard-welcome-description">
                نگاهی به عملکرد فروشگاهت در هفته جاری بینداز و فروش این هفته را
                با هفته قبل مقایسه کن.
              </p>

              <Link to="/admin/orders" className="dashboard-welcome-link">
                دیدن گزارش سفارش‌ها
                <ArrowLeft size={15} aria-hidden="true" />
              </Link>
            </div>

            <div className="dashboard-weekly-sales">
              <div className="dashboard-weekly-sales-top">
                <span className="dashboard-weekly-sales-label">
                  فروش این هفته
                </span>
                <span className="dashboard-weekly-sales-icon">
                  <ChartNoAxesCombined size={19} aria-hidden="true" />
                </span>
              </div>

              <div className="dashboard-weekly-sales-value">
                {formatPrice(data.sales.current_week)}
              </div>

              <div className="dashboard-weekly-divider" />

              <div className="dashboard-weekly-sales-meta">
                {weeklyChangeIsNumber ? (
                  <span
                    className={`dashboard-weekly-change ${weeklyChangeClass}`}
                  >
                    {weeklyChangeIsPositive ? (
                      <TrendingUp size={13} aria-hidden="true" />
                    ) : weeklyChangeIsNegative ? (
                      <TrendingDown size={13} aria-hidden="true" />
                    ) : null}
                    {weeklyChangeLabel}
                  </span>
                ) : (
                  <span className="dashboard-weekly-change is-neutral">
                    مقایسه در دسترس نیست
                  </span>
                )}
                <span>نسبت به هفته قبل</span>
              </div>

              <div className="dashboard-weekly-period">
                محاسبه هفتگی از شنبه تا جمعه
              </div>
            </div>
          </section>

          <section className="dashboard-section">
            <div className="dashboard-section-heading">
              <h2 className="dashboard-section-title">دسترسی سریع</h2>
              <span className="dashboard-section-caption">
                بخش‌های پرکاربرد مدیریت
              </span>
            </div>

            <div className="dashboard-quick-grid">
              {quickLinks.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    to={item.to}
                    className="dashboard-quick-card"
                    key={item.to}
                  >
                    <div className="dashboard-quick-top">
                      <span
                        className="dashboard-quick-icon"
                        style={{
                          color: item.color,
                          background: item.background,
                        }}
                      >
                        <Icon size={21} aria-hidden="true" />
                      </span>
                      <ArrowUpLeft
                        size={17}
                        className="dashboard-quick-arrow"
                        aria-hidden="true"
                      />
                    </div>
                    <h3 className="dashboard-quick-title">{item.title}</h3>
                    <p className="dashboard-quick-description">
                      {item.description}
                    </p>
                    <span className="dashboard-quick-action">
                      {item.action}
                      <ArrowLeft size={14} aria-hidden="true" />
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
          <section className="dashboard-section">
            <div className="dashboard-section-heading">
              <h2 className="dashboard-section-title">آمار کلی فروشگاه</h2>
              <span className="dashboard-section-caption">
                نمای کلی اطلاعات
              </span>
            </div>

            <div className="dashboard-stats-grid">
              {stats.map((stat) => {
                const Icon = stat.icon;

                return (
                  <article className="dashboard-stat-card" key={stat.title}>
                    <div className="dashboard-stat-top">
                      <span className="dashboard-stat-label">{stat.title}</span>
                      <span
                        className="dashboard-stat-icon"
                        style={{
                          color: stat.color,
                          background: stat.background,
                        }}
                      >
                        <Icon size={20} aria-hidden="true" />
                      </span>
                    </div>
                    <p className="dashboard-stat-value">{stat.value}</p>
                    <p className="dashboard-stat-description">
                      {stat.description}
                    </p>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="dashboard-section">
            <div className="dashboard-section-heading">
              <h2 className="dashboard-section-title">نبض فروشگاه</h2>
              <span className="dashboard-section-caption">
                روند فروش روزانه
              </span>
            </div>
            <div className="dashboard-panel">
              <div className="dashboard-panel-header">
                <div>
                  <h3 className="dashboard-panel-title">روند فروش روزانه</h3>
                  <p className="dashboard-panel-subtitle">
                    تغییرات فروش در روزهای ثبت‌شده
                  </p>
                </div>
                <span
                  className="dashboard-stat-icon"
                  style={{ color: "#54785a", background: "#edf4e9" }}
                >
                  <ChartNoAxesCombined size={19} aria-hidden="true" />
                </span>
              </div>
              <SalesLineChart items={dailySales} />
            </div>
          </section>

          <div className="dashboard-lower-grid">
            <section className="dashboard-panel">
              <div className="dashboard-panel-header">
                <div>
                  <h2 className="dashboard-panel-title">وضعیت سفارش‌ها</h2>
                  <p className="dashboard-panel-subtitle">
                    توزیع سفارش‌ها براساس وضعیت فعلی
                  </p>
                </div>
                <ShoppingCart size={19} color="#8c9aa5" aria-hidden="true" />
              </div>

              <div className="dashboard-status-list">
                {orderStatuses.map((status) => {
                  const Icon = status.icon;
                  const percentage =
                    totalOrders > 0
                      ? Math.min(100, (status.value / totalOrders) * 100)
                      : 0;

                  return (
                    <div className="dashboard-status-row" key={status.label}>
                      <div className="dashboard-status-info">
                        <span
                          className="dashboard-status-icon"
                          style={{
                            color: status.color,
                            background: status.background,
                          }}
                        >
                          <Icon size={17} aria-hidden="true" />
                        </span>
                        <span className="dashboard-status-label">
                          {status.label}
                        </span>
                      </div>

                      <span className="dashboard-status-value">
                        {formatNumber(status.value)}
                      </span>

                      <div
                        className="dashboard-status-track"
                        role="progressbar"
                        aria-label={status.label}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(percentage)}
                      >
                        <div
                          className="dashboard-status-progress"
                          style={{
                            width: `${percentage}%`,
                            background: status.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="dashboard-panel">
              <div className="dashboard-panel-header">
                <div>
                  <h2 className="dashboard-panel-title">وضعیت پرداخت‌ها</h2>
                  <p className="dashboard-panel-subtitle">
                    خلاصه وضعیت پرداخت سفارش‌ها
                  </p>
                </div>
                <Wallet size={19} color="#8c9aa5" aria-hidden="true" />
              </div>

              <div className="dashboard-payment-summary">
                <div
                  className="dashboard-payment-card"
                  style={{ background: "#edf5ed" }}
                >
                  <div className="dashboard-payment-label">پرداخت‌شده</div>
                  <div className="dashboard-payment-value">
                    {formatNumber(data.payments.paid)}
                  </div>
                </div>

                <div
                  className="dashboard-payment-card"
                  style={{ background: "#fff3ed" }}
                >
                  <div className="dashboard-payment-label">پرداخت‌نشده</div>
                  <div className="dashboard-payment-value">
                    {formatNumber(data.payments.unpaid)}
                  </div>
                </div>
              </div>

              <p className="dashboard-payment-note">
                برای بررسی جزئیات هر سفارش و وضعیت پرداخت آن، به بخش مدیریت
                سفارش‌ها مراجعه کن.
              </p>

              <Link to="/admin/orders" className="dashboard-welcome-link">
                رفتن به سفارش‌ها
                <ArrowLeft size={14} aria-hidden="true" />
              </Link>
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}

export default AdminDashboard;
