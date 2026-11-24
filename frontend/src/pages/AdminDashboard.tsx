import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Package,
  Users,
  ShoppingCart,
  Wallet,
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
  ArrowDown,
  ArrowUp,
  Check,
  EyeOff,
  GripVertical,
  Headset,
  Megaphone,
  Newspaper,
  Plus,
  RotateCcw,
  Settings,
  SlidersHorizontal,
  Link2,
  Trash2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { adminApi } from "../services/api";
import { useAdminAuth } from "../context/AdminAuthContext";
import { ADMIN_PERMISSIONS } from "../utils/adminPermissions";
import { getAdminNavItem } from "../utils/adminNavItems";
import {
  DASHBOARD_BLOCK_IDS,
  DASHBOARD_BLOCK_META,
  dashboardShortcutBlockId,
  getDashboardBlockMeta,
  isDashboardCustomBlockId,
  type AdminDashboardCustomBlock,
  type DashboardBlockId,
} from "../utils/adminDashboardLayout";

import { dashboardStyles } from "../components/admin/dashboard/dashboardStyles";
import {
  formatNumber,
  formatPrice,
  pageStyle,
  quickLinks,
  type DashboardData,
  type OrderStatusItem,
  type StatItem,
} from "../components/admin/dashboard/dashboardShared";
import { SalesChannelsChart } from "../components/admin/dashboard/SalesChannelsChart";
import { SalesTrendChart } from "../components/admin/dashboard/SalesTrendChart";
import { useDashboardLayout } from "../components/admin/dashboard/useDashboardLayout";

function AdminDashboard() {
  const { user, can } = useAdminAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const {
    addMenuOpen,
    addShortcutBlock,
    blockDrop,
    dashboardLayout,
    draggingBlock,
    handleBlockDragEnd,
    handleBlockDragOver,
    handleBlockDragStart,
    handleBlockDrop,
    handleShortcutDragOver,
    handleShortcutDrop,
    layoutEditing,
    moveBlockByOffset,
    navShortcutTargets,
    pageRef,
    removeShortcutBlock,
    resetDashboardLayout,
    setAddMenuOpen,
    setBlockDrop,
    setBlockHidden,
    setLayoutEditing,
    shortcutDragActive,
    visibleBlocks,
  } = useDashboardLayout({ userId: user?.id, can });

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
        {
          title: "کالاهای رو به اتمام",
          value: formatNumber(data.low_stock?.total ?? 0),
          description: `${formatNumber(
            data.low_stock?.out_of_stock ?? 0,
          )} قلم ناموجود — «موجودی و انبار»`,
          icon: TrendingDown,
          color: "#c66d59",
          background: "#f9eeeb",
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

  const salesChannels = data?.sales?.channels ?? [];

  /* ---------- شاخص‌های «سلامت فروشگاه» ---------- */

  const paidPayments = data?.payments.paid ?? 0;
  const unpaidPayments = data?.payments.unpaid ?? 0;
  const totalPayments = paidPayments + unpaidPayments;
  const completionRate =
    totalOrders > 0
      ? Math.round(((data?.orders.completed ?? 0) / totalOrders) * 100)
      : 0;
  const paymentRate =
    totalPayments > 0 ? Math.round((paidPayments / totalPayments) * 100) : 0;
  const activeProductsRate =
    data && data.products.total > 0
      ? Math.round((data.products.active / data.products.total) * 100)
      : 0;
  const averagePaidOrder =
    paidPayments > 0 ? Number(data?.sales.total ?? 0) / paidPayments : 0;

  const supportShortcuts: {
    to: string;
    title: string;
    description: string;
    icon: LucideIcon;
    permission: string;
  }[] = [
    {
      to: "/admin/support",
      title: "گفتگوهای پشتیبانی",
      description: "پیام‌ها و درخواست‌های مشتریان",
      icon: Headset,
      permission: ADMIN_PERMISSIONS.messaging,
    },
    {
      to: "/admin/messaging",
      title: "پیام‌رسانی",
      description: "ارسال پیامک، تلگرام و واتساپ",
      icon: Megaphone,
      permission: ADMIN_PERMISSIONS.messaging,
    },
    {
      to: "/admin/articles",
      title: "مقالات و راهنما",
      description: "نوشتن و ویرایش مقاله‌های سایت",
      icon: Newspaper,
      permission: ADMIN_PERMISSIONS.articles,
    },
    {
      to: "/admin/settings",
      title: "تنظیمات فروشگاه",
      description: "تماس، ارسال، مالیات و درگاه پرداخت",
      icon: Settings,
      permission: ADMIN_PERMISSIONS.settings,
    },
  ].filter((item) => can(item.permission));

  /** نوار کنترل هر بخش در حالت «چیدمان» (کشیدن، بالا/پایین، پنهان‌کردن). */
  const renderBlockControls = (blockId: DashboardBlockId) => {
    if (!layoutEditing) {
      return null;
    }

    const meta = getDashboardBlockMeta(blockId, dashboardLayout);
    const index = visibleBlocks.indexOf(blockId);

    return (
      <div className="dashboard-block-bar">
        <span className="dashboard-block-bar-title">
          <span
            className="dashboard-block-grip"
            draggable
            onDragStart={(event) => handleBlockDragStart(event, blockId)}
            onDragEnd={handleBlockDragEnd}
            title="برای جابه‌جایی این بخش بکشید"
            aria-label={`کشیدن بخش ${meta.label}`}
            role="button"
            tabIndex={-1}
          >
            <GripVertical size={14} />
          </span>
          {meta.label}
        </span>

        <span className="dashboard-block-actions">
          <button
            type="button"
            className="dashboard-block-action"
            onClick={() => moveBlockByOffset(blockId, -1)}
            disabled={index <= 0}
            title="انتقال بخش به بالا"
            aria-label={`انتقال ${meta.label} به بالا`}
          >
            <ArrowUp size={13} />
          </button>

          <button
            type="button"
            className="dashboard-block-action"
            onClick={() => moveBlockByOffset(blockId, 1)}
            disabled={index === visibleBlocks.length - 1}
            title="انتقال بخش به پایین"
            aria-label={`انتقال ${meta.label} به پایین`}
          >
            <ArrowDown size={13} />
          </button>

          {/* برای میان‌برها امکان حذف کامل هم هست */}
          {isDashboardCustomBlockId(blockId) ? (
            <button
              type="button"
              className="dashboard-block-action"
              onClick={() => removeShortcutBlock(blockId)}
              title="حذف این میان‌بر از نمای کلی"
              aria-label={`حذف ${meta.label} از نمای کلی`}
            >
              <Trash2 size={13} />
            </button>
          ) : (
            <button
              type="button"
              className="dashboard-block-action"
              onClick={() => setBlockHidden(blockId, true)}
              title="پنهان کردن این بخش"
              aria-label={`پنهان کردن ${meta.label}`}
            >
              <EyeOff size={13} />
            </button>
          )}
        </span>
      </div>
    );
  };

  /** پوستهٔ هر بخش: ترتیب، ناحیهٔ رها کردن و نوار کنترل. */
  const renderBlock = (blockId: DashboardBlockId, content: ReactNode) => {
    if (dashboardLayout.hidden.includes(blockId)) {
      return null;
    }

    const drop = blockDrop?.id === blockId ? blockDrop : null;
    const meta = getDashboardBlockMeta(blockId, dashboardLayout);

    return (
      <section
        key={blockId}
        className={`dashboard-block ${
          draggingBlock === blockId ? "is-dragging" : ""
        } ${
          drop ? (drop.after ? "is-drop-after" : "is-drop-before") : ""
        }`}
        data-block={blockId}
        data-span={meta.span}
        style={{ order: dashboardLayout.order.indexOf(blockId) }}
        onDragOver={(event) => handleBlockDragOver(event, blockId)}
        onDrop={(event) => handleBlockDrop(event, blockId)}
        onDragLeave={() =>
          setBlockDrop((current) => (current?.id === blockId ? null : current))
        }
        aria-label={meta.label}
      >
        {renderBlockControls(blockId)}
        {content}
      </section>
    );
  };

  /** کارت یک بخش منو که مدیر به نمای کلی اضافه کرده است. */
  const renderShortcutBlock = (block: AdminDashboardCustomBlock) => {
    const Icon = getAdminNavItem(block.path)?.icon ?? Link2;

    return renderBlock(
      block.id,
      <section className="dashboard-panel dashboard-shortcut-block">
        <div className="dashboard-panel-header">
          <h2 className="dashboard-panel-title">{block.label}</h2>

          <span className="dashboard-shortcut-icon" aria-hidden="true">
            <Icon size={17} strokeWidth={1.9} />
          </span>
        </div>

        <p className="dashboard-shortcut-block-text">{block.description}</p>

        <Link
          to={block.path}
          className="dashboard-shortcut-block-link"
          title={`رفتن به ${block.label}`}
        >
          رفتن به بخش
          <ArrowLeft size={13} aria-hidden="true" />
        </Link>
      </section>,
    );
  };

  const customBlocks = dashboardLayout.order.filter(
    (blockId): blockId is `custom:${string}` =>
      isDashboardCustomBlockId(blockId),
  );

  return (
    <div
      ref={pageRef}
      className={`dashboard-page ${
        shortcutDragActive ? "is-shortcut-drop-active" : ""
      }`}
      style={pageStyle}
      onDragOver={handleShortcutDragOver}
      onDrop={handleShortcutDrop}
    >
      <style>{dashboardStyles}</style>

      {shortcutDragActive && (
        <div className="dashboard-shortcut-dropzone" aria-hidden="true">
          <Plus size={17} />
          <span>برای افزودن این بخش به نمای کلی، همین‌جا رها کنید</span>
        </div>
      )}

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

          <div className="dashboard-layout-tools">
            <button
              type="button"
              className={`dashboard-refresh-button dashboard-layout-toggle ${
                layoutEditing ? "is-active" : ""
              }`}
              onClick={() => setLayoutEditing((editing) => !editing)}
              aria-pressed={layoutEditing}
              title={
                layoutEditing
                  ? "پایان شخصی‌سازی نمای کلی"
                  : "شخصی‌سازی چیدمان نمای کلی"
              }
            >
              {layoutEditing ? (
                <Check size={14} aria-hidden="true" />
              ) : (
                <SlidersHorizontal size={14} aria-hidden="true" />
              )}
              {layoutEditing ? "پایان" : "چیدمان"}
            </button>

            {layoutEditing && (
              <>
                <button
                  type="button"
                  className="dashboard-refresh-button"
                  onClick={() => setAddMenuOpen((open) => !open)}
                  aria-expanded={addMenuOpen}
                  aria-haspopup="dialog"
                  title="افزودن بخش به نمای کلی"
                >
                  <Plus size={14} aria-hidden="true" />
                  افزودن بخش
                </button>

                <button
                  type="button"
                  className="dashboard-refresh-button"
                  onClick={resetDashboardLayout}
                  title="بازگشت به چیدمان پیش‌فرض"
                >
                  <RotateCcw size={14} aria-hidden="true" />
                  پیش‌فرض
                </button>
              </>
            )}

            {layoutEditing && addMenuOpen && (
              <div
                className="dashboard-layout-popover"
                role="dialog"
                aria-label="بخش‌های نمای کلی"
              >
                <p className="dashboard-layout-popover-title">
                  بخش‌های نمای کلی
                </p>

                {DASHBOARD_BLOCK_IDS.map((blockId) => {
                  const meta = DASHBOARD_BLOCK_META[blockId];
                  const hidden = dashboardLayout.hidden.includes(blockId);

                  return (
                    <button
                      key={blockId}
                      type="button"
                      className={`dashboard-layout-item ${
                        hidden ? "" : "is-added"
                      }`}
                      onClick={() => setBlockHidden(blockId, !hidden)}
                    >
                      <span>
                        {meta.label}
                        <small>{meta.description}</small>
                      </span>
                      <span className="dashboard-layout-item-state">
                        {hidden ? (
                          <Plus size={13} aria-hidden="true" />
                        ) : (
                          <Check size={13} aria-hidden="true" />
                        )}
                        {hidden ? "افزودن" : "حذف"}
                      </span>
                    </button>
                  );
                })}

                <p className="dashboard-layout-popover-title">
                  میان‌برهای منوی پنل
                </p>

                {navShortcutTargets.map((item) => {
                  const blockId = dashboardShortcutBlockId(item.to);
                  const added =
                    dashboardLayout.custom.some(
                      (block) => block.id === blockId,
                    ) && !dashboardLayout.hidden.includes(blockId);
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.to}
                      type="button"
                      className={`dashboard-layout-item ${
                        added ? "is-added" : ""
                      }`}
                      onClick={() => {
                        if (added) {
                          removeShortcutBlock(blockId);

                          return;
                        }

                        addShortcutBlock({ path: item.to, label: item.label });
                      }}
                    >
                      <span className="dashboard-layout-item-main">
                        <Icon size={14} strokeWidth={1.9} aria-hidden="true" />
                        <span>
                          {item.label}
                          <small>{item.to}</small>
                        </span>
                      </span>
                      <span className="dashboard-layout-item-state">
                        {added ? (
                          <Check size={13} aria-hidden="true" />
                        ) : (
                          <Plus size={13} aria-hidden="true" />
                        )}
                        {added ? "حذف" : "افزودن"}
                      </span>
                    </button>
                  );
                })}

                <p className="dashboard-layout-hint">
                  هر بخشی را که می‌خواهید به نمای کلی اضافه یا از آن حذف کنید؛
                  ترتیب نمایش را هم با کشیدن دستهٔ ⋮⋮ روی خودِ بخش‌ها تغییر
                  دهید. برای افزودن سریع هر بخش از پنل، همان بخش را از منوی
                  کنار صفحه بکشید و روی این صفحه رها کنید.
                </p>
              </div>
            )}
          </div>

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

          <div className="dashboard-blocks">
            {renderBlock(
              "welcome",
              <div
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
              </div>,
            )}

            {renderBlock(
              "quick-links",
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
              </section>,
            )}

            {renderBlock(
              "stats",
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
              </section>,
            )}

            {renderBlock(
              "sales-trend",
              <section className="dashboard-section">
                <div className="dashboard-section-heading">
                  <h2 className="dashboard-section-title">نبض فروشگاه</h2>
              <span className="dashboard-section-caption">
                نمودار تعاملی روند فروش
              </span>
            </div>
            <div className="dashboard-panel">
              <div className="dashboard-panel-header">
                <div>
                  <h3 className="dashboard-panel-title">روند فروش</h3>
                  <p className="dashboard-panel-subtitle">
                    فروش پرداخت‌شده در بازه‌های زمانی مختلف
                  </p>
                </div>
                <span
                  className="dashboard-stat-icon"
                  style={{ color: "#54785a", background: "#edf4e9" }}
                >
                  <ChartNoAxesCombined size={19} aria-hidden="true" />
                </span>
              </div>
              <SalesTrendChart />
            </div>
              </section>,
            )}

            {renderBlock(
              "order-status",
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
              </section>,
            )}

            {renderBlock(
              "payment-status",
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
              </section>,
            )}

            {renderBlock(
              "sales-channels",
              <section className="dashboard-panel">
                <div className="dashboard-panel-header">
                  <div>
                    <h2 className="dashboard-panel-title">کانال‌های فروش</h2>
                    <p className="dashboard-panel-subtitle">
                      سهم هر کانال از فروش پرداخت‌شده
                    </p>
                  </div>
                  <Globe size={19} color="#8c9aa5" aria-hidden="true" />
                </div>

                <SalesChannelsChart channels={salesChannels} />
              </section>,
            )}

            {renderBlock(
              "store-health",
              <section className="dashboard-panel">
                <div className="dashboard-panel-header">
                  <div>
                    <h2 className="dashboard-panel-title">سلامت فروشگاه</h2>
                    <p className="dashboard-panel-subtitle">
                      چند شاخص کلیدی برای پیگیری وضعیت فروش
                    </p>
                  </div>
                  <Activity size={19} color="#8c9aa5" aria-hidden="true" />
                </div>

                <div className="dashboard-health-list">
                  {[
                    {
                      label: "نرخ تکمیل سفارش",
                      value: completionRate,
                      hint: `${formatNumber(
                        data.orders.completed,
                      )} سفارش تکمیل‌شده از ${formatNumber(totalOrders)}`,
                      color: "#54785a",
                    },
                    {
                      label: "نرخ پرداخت سفارش‌ها",
                      value: paymentRate,
                      hint: `${formatNumber(paidPayments)} پرداخت‌شده و ${formatNumber(
                        unpaidPayments,
                      )} پرداخت‌نشده`,
                      color: "#397c91",
                    },
                    {
                      label: "محصولات فعال",
                      value: activeProductsRate,
                      hint: `${formatNumber(
                        data.products.active,
                      )} محصول فعال از ${formatNumber(data.products.total)}`,
                      color: "#c96548",
                    },
                  ].map((metric) => (
                    <div className="dashboard-health-row" key={metric.label}>
                      <div className="dashboard-health-head">
                        <span className="dashboard-health-label">
                          {metric.label}
                        </span>
                        <span className="dashboard-health-value">
                          {formatNumber(metric.value)}٪
                        </span>
                      </div>

                      <div
                        className="dashboard-health-track"
                        role="progressbar"
                        aria-label={metric.label}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={metric.value}
                      >
                        <div
                          className="dashboard-health-progress"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(0, metric.value),
                            )}%`,
                            background: metric.color,
                          }}
                        />
                      </div>

                      <p className="dashboard-health-note">{metric.hint}</p>
                    </div>
                  ))}
                </div>

                <div className="dashboard-health-foot">
                  <span>میانگین ارزش هر سفارش پرداخت‌شده</span>
                  <strong>{formatPrice(averagePaidOrder)}</strong>
                </div>
              </section>,
            )}

            {renderBlock(
              "support-shortcuts",
              <section className="dashboard-panel">
                <div className="dashboard-panel-header">
                  <div>
                    <h2 className="dashboard-panel-title">
                      میان‌برهای پشتیبانی
                    </h2>
                    <p className="dashboard-panel-subtitle">
                      دسترسی سریع به بخش‌های ارتباط با مشتری
                    </p>
                  </div>
                  <Headset size={19} color="#8c9aa5" aria-hidden="true" />
                </div>

                {supportShortcuts.length > 0 ? (
                  <div className="dashboard-shortcut-list">
                    {supportShortcuts.map((item) => {
                      const Icon = item.icon;

                      return (
                        <Link
                          to={item.to}
                          className="dashboard-shortcut"
                          key={item.to}
                        >
                          <span className="dashboard-shortcut-icon">
                            <Icon size={17} aria-hidden="true" />
                          </span>
                          <span className="dashboard-shortcut-text">
                            <span className="dashboard-shortcut-title">
                              {item.title}
                            </span>
                            <span className="dashboard-shortcut-description">
                              {item.description}
                            </span>
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <p className="dashboard-empty-note">
                    برای دیدن این میان‌برها، دسترسی بخش پشتیبانی یا تنظیمات لازم
                    است.
                  </p>
                )}
              </section>,
            )}

            {/* میان‌برهایی که مدیر از منوی پنل به نمای کلی اضافه کرده است */}
            {customBlocks.map((blockId) => {
              const block = dashboardLayout.custom.find(
                (item) => item.id === blockId,
              );

              return block ? renderShortcutBlock(block) : null;
            })}

            {visibleBlocks.length === 0 && (
              <div className="dashboard-block-empty">
                همهٔ بخش‌های نمای کلی پنهان شده‌اند. با «افزودن بخش» هر کدام را
                که لازم دارید به صفحه برگردانید.
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

export default AdminDashboard;
