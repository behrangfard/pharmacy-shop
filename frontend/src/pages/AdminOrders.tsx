import { useCallback, useEffect, useState } from "react";

import { adminApi } from "../services/api";

type OrderStatus =
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

type PaymentStatus = "paid" | "unpaid" | "failed" | "refunded";

type SortKey =
  | "order_number"
  | "recipient_name"
  | "total"
  | "status"
  | "payment_status"
  | "created_at";

type SortDirection = "asc" | "desc";

interface OrderItem {
  id: number;

  product_id: number;
  variant_id?: number | null;
  product_name: string;
  variant_name?: string | null;
  sku?: string | null;
  variant?: {
    name?: string;
    sku?: string | null;
  } | null;

  quantity: number;

  unit_price: string | number;

  total_price: string | number;

  product?: {
    name?: string;

    images?: Array<{
      path: string;

      is_primary?: boolean;
    }>;
  } | null;
}

interface Order {
  id: number;

  order_number: string;

  user_id?: number;

  user?: {
    id?: number;

    name?: string;

    email?: string;
  } | null;

  recipient_name: string;

  phone: string;

  address: string;

  postal_code?: string | null;

  notes?: string | null;

  subtotal: string | number;

  shipping_cost: string | number;

  discount: string | number;

  total: string | number;

  status: OrderStatus;

  payment_status: PaymentStatus;

  created_at: string;

  items: OrderItem[];
}

interface PaginatedOrders {
  data: Order[];

  current_page: number;

  last_page: number;

  total: number;

  per_page: number;
}

const colors = {
  ink: "#344b3a",

  muted: "#7c877b",

  green: "#587b5b",

  greenDark: "#426747",

  greenSoft: "#edf4e9",

  cream: "#fffefa",

  border: "#e7ecdf",

  background: "#f4f6fb",

  lilac: "#eee7f5",

  lilacText: "#80649b",

  teal: "#e4f0ed",

  tealText: "#527f7b",

  amber: "#fbf1e2",

  amberText: "#a77639",

  red: "#faeae5",

  redText: "#b65c49",
};

const statusLabels: Record<OrderStatus, string> = {
  pending: "در انتظار",

  processing: "در حال پردازش",

  shipped: "ارسال‌شده",

  delivered: "تحویل‌شده",

  cancelled: "لغوشده",
};

const paymentLabels: Record<PaymentStatus, string> = {
  paid: "پرداخت‌شده",

  unpaid: "پرداخت‌نشده",

  failed: "ناموفق",

  refunded: "بازپرداخت‌شده",
};

const statusColors: Record<OrderStatus, { color: string; background: string }> =
  {
    pending: { color: "#85652b", background: "#f8efd9" },

    processing: { color: "#385e3e", background: "#e8efe2" },

    shipped: { color: colors.lilacText, background: colors.lilac },

    delivered: { color: "#385e3e", background: "#e0ebdd" },

    cancelled: { color: colors.redText, background: colors.red },
  };

const paymentColors: Record<
  PaymentStatus,
  { color: string; background: string }
> = {
  paid: { color: "#385e3e", background: "#e0ebdd" },

  unpaid: { color: "#85652b", background: "#f8efd9" },

  failed: { color: colors.redText, background: colors.red },

  refunded: { color: colors.lilacText, background: colors.lilac },
};

const sortLabels: Record<SortKey, string> = {
  order_number: "شماره سفارش",

  recipient_name: "نام گیرنده",

  total: "مبلغ نهایی",

  status: "وضعیت سفارش",

  payment_status: "وضعیت پرداخت",

  created_at: "تاریخ",
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat("fa-IR").format(value);

function formatPrice(value: string | number | null | undefined) {
  return `${formatNumber(Number(value ?? 0))} تومان`;
}

function formatDate(value: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "short",

    timeStyle: "short",
  }).format(date);
}

function getErrorMessage(error: unknown, fallback: string) {
  const apiError = error as {
    response?: {
      data?: {
        message?: string;

        errors?: Record<string, string[]>;
      };
    };
  };

  const validationMessages = apiError.response?.data?.errors;

  if (validationMessages) {
    const firstMessage = Object.values(validationMessages).flat()[0];

    if (firstMessage) return firstMessage;
  }

  return apiError.response?.data?.message || fallback;
}

const cardStyle: React.CSSProperties = {
  background: colors.cream,

  border: `1px solid ${colors.border}`,

  borderRadius: 18,

  padding: 20,

  boxShadow: "0 5px 16px rgba(52, 75, 58, 0.035)",

  boxSizing: "border-box",
};

const inputStyle: React.CSSProperties = {
  width: "100%",

  minWidth: 0,

  minHeight: 43,

  boxSizing: "border-box",

  border: `1px solid ${colors.border}`,

  borderRadius: 11,

  padding: "11px 13px",

  background: colors.cream,

  color: colors.ink,

  fontSize: 13,

  fontFamily: "inherit",

  outlineColor: colors.green,
};

const primaryButtonStyle: React.CSSProperties = {
  border: `1px solid ${colors.green}`,

  borderRadius: 11,

  padding: "10px 14px",

  minHeight: 40,

  background: colors.green,

  color: "#ffffff",

  fontSize: 13,

  fontWeight: 700,

  transition: "all 160ms ease",

  fontFamily: "inherit",

  cursor: "pointer",

  display: "inline-flex",

  alignItems: "center",

  justifyContent: "center",

  gap: 7,

  boxSizing: "border-box",
};

const secondaryButtonStyle: React.CSSProperties = {
  border: `1px solid ${colors.border}`,

  borderRadius: 11,

  padding: "10px 14px",

  minHeight: 40,

  background: colors.cream,

  color: colors.greenDark,

  fontSize: 13,

  fontWeight: 700,

  transition: "all 160ms ease",

  fontFamily: "inherit",

  cursor: "pointer",

  display: "inline-flex",

  alignItems: "center",

  justifyContent: "center",

  gap: 7,

  boxSizing: "border-box",
};

function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);

  const [page, setPage] = useState(1);

  const [lastPage, setLastPage] = useState(1);

  const [total, setTotal] = useState(0);

  const [searchInput, setSearchInput] = useState("");

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("");

  const [paymentFilter, setPaymentFilter] = useState("");

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [notice, setNotice] = useState("");

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const [detailLoading, setDetailLoading] = useState(false);

  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [newStatus, setNewStatus] = useState<OrderStatus>("pending");

  const [sortKey, setSortKey] = useState<SortKey>("created_at");

  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const normalizedSearch = searchInput.trim();

      setSearch((currentSearch) =>
        currentSearch === normalizedSearch ? currentSearch : normalizedSearch,
      );

      setPage(1);
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);

      setError("");

      // دریافت فهرست سفارش‌ها با توکن مدیریت

      const response = await adminApi.get("/admin/orders", {
        params: {
          page,

          per_page: 15,

          sort_by: sortKey,

          sort_direction: sortDirection,

          ...(search ? { search } : {}),

          ...(statusFilter ? { status: statusFilter } : {}),

          ...(paymentFilter ? { payment_status: paymentFilter } : {}),
        },
      });

      const result: PaginatedOrders = response.data.data;

      setOrders(Array.isArray(result?.data) ? result.data : []);

      setLastPage(Math.max(1, Number(result?.last_page ?? 1)));

      setTotal(Number(result?.total ?? 0));
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,

          "دریافت سفارش‌ها با خطا مواجه شد. دسترسی ادمین و اتصال API را بررسی کن.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, paymentFilter, sortKey, sortDirection]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);

      setSortDirection(
        key === "total" || key === "created_at" ? "desc" : "asc",
      );
    }

    setPage(1);
  };

  const renderSortHeader = (key: SortKey) => {
    const active = sortKey === key;

    return (
      <button
        type="button"
        onClick={() => handleSort(key)}
        aria-label={`مرتب‌سازی بر اساس ${sortLabels[key]}`}
        aria-pressed={active}
        title={
          active
            ? `مرتب‌سازی ${sortDirection === "asc" ? "صعودی" : "نزولی"}؛ برای تغییر جهت کلیک کن`
            : `مرتب‌سازی بر اساس ${sortLabels[key]}`
        }
        style={{
          display: "inline-flex",

          alignItems: "center",

          justifyContent: "flex-start",

          gap: 7,

          border: 0,

          borderRadius: 7,

          padding: "5px 3px",

          margin: "-5px -3px",

          background: active ? colors.greenSoft : "transparent",

          color: active ? colors.greenDark : "#536452",

          font: "inherit",

          fontSize: 12,

          fontWeight: 800,

          cursor: "pointer",

          whiteSpace: "nowrap",

          transition: "background 160ms ease, color 160ms ease",
        }}
      >
        {sortLabels[key]}

        <span
          aria-hidden="true"
          style={{
            minWidth: 14,

            fontSize: 13,

            lineHeight: 1,

            color: active ? colors.green : "#9aa394",
          }}
        >
          {active ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </button>
    );
  };

  const clearSearchAndFilters = () => {
    setSearchInput("");

    setSearch("");

    setStatusFilter("");

    setPaymentFilter("");

    setPage(1);

    setSelectedOrder(null);

    setNotice("");

    setError("");
  };

  const openOrderDetails = async (orderNumber: string) => {
    try {
      setDetailLoading(true);

      setError("");

      setSelectedOrder(null);

      // دریافت جزئیات سفارش با توکن مدیریت

      const response = await adminApi.get(
        `/admin/orders/${encodeURIComponent(orderNumber)}`,
      );

      const order: Order = response.data.data;

      setSelectedOrder(order);

      setNewStatus(order.status);
    } catch (requestError) {
      setError(
        getErrorMessage(requestError, "دریافت جزئیات سفارش ناموفق بود."),
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const updateOrderStatus = async () => {
    if (!selectedOrder || updatingStatus) return;

    if (selectedOrder.status === "cancelled") {
      setNotice("سفارش لغوشده قابل فعال‌سازی مجدد نیست.");

      return;
    }

    if (selectedOrder.status === "delivered" && newStatus !== "delivered") {
      setNotice("وضعیت سفارش تحویل‌شده قابل بازگشت نیست.");

      return;
    }

    if (newStatus === "cancelled") {
      setNotice(
        "لغو سفارش از این صفحه پشتیبانی نمی‌شود؛ ابتدا باید بازگرداندن موجودی به‌صورت امن پیاده‌سازی شود.",
      );

      return;
    }

    if (
      ["processing", "shipped", "delivered"].includes(newStatus) &&
      selectedOrder.payment_status !== "paid"
    ) {
      setNotice("برای این وضعیت، سفارش باید پرداخت‌شده باشد.");

      return;
    }

    try {
      setUpdatingStatus(true);

      setNotice("");

      // تغییر وضعیت سفارش با توکن مدیریت

      const response = await adminApi.patch(
        `/admin/orders/${encodeURIComponent(
          selectedOrder.order_number,
        )}/status`,

        { status: newStatus },
      );

      const updatedOrder: Order = response.data.data;

      setSelectedOrder(updatedOrder);

      setNewStatus(updatedOrder.status);

      setNotice(response.data.message || "وضعیت سفارش به‌روزرسانی شد.");

      await loadOrders();
    } catch (requestError) {
      setNotice(getErrorMessage(requestError, "تغییر وضعیت سفارش ناموفق بود."));
    } finally {
      setUpdatingStatus(false);
    }
  };

  const changeStatusFilter = (value: string) => {
    setPage(1);

    setStatusFilter(value);
  };

  const changePaymentFilter = (value: string) => {
    setPage(1);

    setPaymentFilter(value);
  };

  const closeOrderDetails = () => {
    setSelectedOrder(null);

    setNotice("");
  };

  function renderStatusBadge(status: OrderStatus) {
    const badgeColors = statusColors[status];

    return (
      <span
        style={{
          ...badgeColors,

          display: "inline-flex",

          alignItems: "center",

          justifyContent: "center",

          borderRadius: 999,

          padding: "6px 11px",

          fontSize: 12,

          fontWeight: 700,

          whiteSpace: "nowrap",
        }}
      >
        {statusLabels[status] || status}
      </span>
    );
  }

  function renderPaymentBadge(status: PaymentStatus) {
    const badgeColors = paymentColors[status];

    return (
      <span
        style={{
          ...badgeColors,

          display: "inline-flex",

          alignItems: "center",

          justifyContent: "center",

          borderRadius: 999,

          padding: "6px 11px",

          fontSize: 12,

          fontWeight: 700,

          whiteSpace: "nowrap",
        }}
      >
        {paymentLabels[status] || status}
      </span>
    );
  }

  return (
    <div
      className="admin-orders-page"
      dir="rtl"
      style={{
        color: colors.ink,

        width: "100%",

        minWidth: 0,

        boxSizing: "border-box",
      }}
    >
      <style>{`

        .admin-orders-page \*,

        .admin-orders-page \*::before,

        .admin-orders-page \*::after {

          box-sizing: border-box;

        }



        .admin-orders-page .orders-filter-row {

          display: flex;

          gap: 10px;

          flex-wrap: wrap;

          align-items: center;

        }



        .admin-orders-page .orders-filter-search {

          flex: 1 1 260px;

          width: 100%;

          min-width: 0;

        }



        .admin-orders-page .orders-filter-select {

          flex: 0 1 170px;

          width: auto;

          min-width: 150px;

          max-width: 100%;

        }



        .admin-orders-page .orders-filter-clear:hover {

          background: #edf4e9 !important;

        }



        .admin-orders-page .orders-filter-row input:focus-visible,

        .admin-orders-page .orders-filter-row select:focus-visible,

        .admin-orders-page .orders-filter-row button:focus-visible {

          outline: 2px solid #587b5b;

          outline-offset: 2px;

        }



        .admin-orders-page .admin-orders-mobile-cards {

          display: none;

        }



        .admin-orders-page .admin-orders-desktop-table {

          display: block;

        }



        @media (max-width: 700px) {

          .admin-orders-page .orders-filter-panel {

            padding: 14px !important;

          }



          .admin-orders-page .orders-filter-row input,

          .admin-orders-page .orders-filter-row select,

          .admin-orders-page .orders-filter-row button {

            flex: 1 1 100% !important;

            width: 100% !important;

            min-width: 0 !important;

          }



          .admin-orders-page .admin-orders-mobile-cards {

            display: grid !important;

          }



          .admin-orders-page .admin-orders-desktop-table {

            display: none !important;

          }

        }

      `}</style>

      <div
        style={{
          display: "flex",

          justifyContent: "space-between",

          alignItems: "center",

          flexWrap: "wrap",

          gap: 16,

          marginBottom: 26,
        }}
      >
        <div>
          <div
            style={{
              display: "inline-flex",

              alignItems: "center",

              gap: 7,

              background: colors.greenSoft,

              color: colors.green,

              borderRadius: 999,

              padding: "6px 11px",

              fontSize: 12,

              fontWeight: 700,

              marginBottom: 12,
            }}
          >
            <span
              style={{
                width: 7,

                height: 7,

                borderRadius: "50%",

                background: colors.green,
              }}
            />
            مدیریت فروشگاه
          </div>

          <h1
            style={{
              margin: "0 0 8px",

              fontSize: "clamp(23px, 3vw, 29px)",

              fontWeight: 800,

              color: colors.ink,

              letterSpacing: "-0.4px",
            }}
          >
            مدیریت سفارش‌ها
          </h1>

          <p style={{ margin: 0, color: colors.muted, fontSize: 14 }}>
            مشاهده، جست‌وجو و مدیریت سفارش‌های مشتریان
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadOrders()}
          disabled={loading}
          style={{
            ...primaryButtonStyle,

            opacity: loading ? 0.65 : 1,

            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading ? "در حال دریافت..." : "تازه‌سازی"}
        </button>
      </div>

      <div
        style={{
          display: "grid",

          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 190px), 1fr))",

          gap: 14,

          marginBottom: 22,
        }}
      >
        <div style={{ ...cardStyle, position: "relative", overflow: "hidden" }}>
          <div
            style={{
              position: "absolute",

              insetInlineStart: 0,

              top: 0,

              bottom: 0,

              width: 4,

              background: colors.green,
            }}
          />

          <div
            style={{
              display: "flex",

              justifyContent: "space-between",

              alignItems: "center",

              gap: 12,
            }}
          >
            <div>
              <div
                style={{
                  color: colors.muted,

                  fontSize: 13,

                  marginBottom: 8,
                }}
              >
                سفارش‌های مطابق فیلتر
              </div>

              <strong style={{ fontSize: 27, color: colors.ink }}>
                {formatNumber(total)}
              </strong>
            </div>

            <div
              style={{
                width: 46,

                height: 46,

                borderRadius: 14,

                display: "grid",

                placeItems: "center",

                background: colors.greenSoft,

                color: colors.green,

                fontSize: 22,
              }}
              aria-hidden="true"
            >
              ≡
            </div>
          </div>
        </div>

        <div style={{ ...cardStyle, position: "relative", overflow: "hidden" }}>
          <div
            style={{
              position: "absolute",

              insetInlineStart: 0,

              top: 0,

              bottom: 0,

              width: 4,

              background: "#a08abb",
            }}
          />

          <div
            style={{
              display: "flex",

              justifyContent: "space-between",

              alignItems: "center",

              gap: 12,
            }}
          >
            <div>
              <div
                style={{
                  color: colors.muted,

                  fontSize: 13,

                  marginBottom: 8,
                }}
              >
                تعداد این صفحه
              </div>

              <strong style={{ fontSize: 27, color: colors.ink }}>
                {formatNumber(orders.length)}
              </strong>
            </div>

            <div
              style={{
                width: 46,

                height: 46,

                borderRadius: 14,

                display: "grid",

                placeItems: "center",

                background: colors.lilac,

                color: colors.lilacText,

                fontSize: 22,
              }}
              aria-hidden="true"
            >
              ▦
            </div>
          </div>
        </div>
      </div>

      <section
        className="orders-filter-panel"
        aria-label="جست‌وجو و فیلتر سفارش‌ها"
        style={{
          ...cardStyle,

          marginBottom: 20,

          padding: 20,
        }}
      >
        <div
          style={{
            marginBottom: 14,

            color: colors.ink,

            fontSize: 14,

            fontWeight: 800,
          }}
        >
          جست‌وجو و فیلتر
        </div>

        <div className="orders-filter-row">
          <input
            className="orders-filter-search"
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="جست‌وجو بر اساس شماره سفارش، نام گیرنده یا تلفن..."
            aria-label="جست‌وجوی سفارش‌ها"
            autoComplete="off"
            style={inputStyle}
          />

          <select
            className="orders-filter-select"
            value={statusFilter}
            onChange={(event) => changeStatusFilter(event.target.value)}
            aria-label="فیلتر وضعیت سفارش"
            style={inputStyle}
          >
            <option value="">همه وضعیت‌ها</option>

            <option value="pending">در انتظار</option>

            <option value="processing">در حال پردازش</option>

            <option value="shipped">ارسال‌شده</option>

            <option value="delivered">تحویل‌شده</option>

            <option value="cancelled">لغوشده</option>
          </select>

          <select
            className="orders-filter-select"
            value={paymentFilter}
            onChange={(event) => changePaymentFilter(event.target.value)}
            aria-label="فیلتر وضعیت پرداخت"
            style={inputStyle}
          >
            <option value="">همه پرداخت‌ها</option>

            <option value="paid">پرداخت‌شده</option>

            <option value="unpaid">پرداخت‌نشده</option>

            <option value="failed">ناموفق</option>

            <option value="refunded">بازپرداخت‌شده</option>
          </select>

          <button
            type="button"
            onClick={clearSearchAndFilters}
            className="orders-filter-clear"
            style={{
              ...secondaryButtonStyle,

              background: "#f8f8f1",

              whiteSpace: "nowrap",
            }}
          >
            پاک کردن فیلترها
          </button>
        </div>

        <div
          style={{
            marginTop: 10,

            color: colors.muted,

            fontSize: 11,

            lineHeight: 1.8,
          }}
        >
          نتایج پس از توقف تایپ به‌صورت خودکار به‌روزرسانی می‌شوند.
        </div>
      </section>

      {error && (
        <div
          role="alert"
          style={{
            background: colors.red,

            border: "1px solid #e9c9c4",

            color: colors.redText,

            borderRadius: 12,

            padding: "14px 16px",

            marginBottom: 18,

            overflowWrap: "anywhere",
          }}
        >
          {error}
        </div>
      )}

      {notice && !selectedOrder && (
        <div
          role="status"
          style={{
            background: colors.lilac,

            border: "1px solid #dfd2ed",

            color: colors.lilacText,

            borderRadius: 12,

            padding: "14px 16px",

            marginBottom: 18,

            overflowWrap: "anywhere",
          }}
        >
          {notice}

          <button
            type="button"
            onClick={() => setNotice("")}
            aria-label="بستن پیام"
            style={{
              float: "left",

              border: 0,

              background: "transparent",

              color: "inherit",

              cursor: "pointer",

              fontSize: 18,
            }}
          >
            ×
          </button>
        </div>
      )}

      <div
        style={{
          ...cardStyle,

          padding: 0,

          width: "100%",

          maxWidth: "100%",

          minWidth: 0,

          overflow: "hidden",
        }}
      >
        {loading ? (
          <p style={{ padding: 28, color: colors.muted }}>
            در حال دریافت سفارش‌ها...
          </p>
        ) : orders.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center" }}>
            <div
              style={{
                width: 64,

                height: 64,

                borderRadius: 20,

                background: colors.greenSoft,

                color: colors.green,

                display: "grid",

                placeItems: "center",

                margin: "0 auto 16px",

                fontSize: 28,
              }}
              aria-hidden="true"
            >
              ◌
            </div>

            <div
              style={{
                fontSize: 17,

                fontWeight: 800,

                marginBottom: 8,

                color: colors.ink,
              }}
            >
              سفارشی پیدا نشد
            </div>

            <div style={{ color: colors.muted, fontSize: 14 }}>
              فیلترها را تغییر بده یا دوباره جست‌وجو کن.
            </div>

            <button
              type="button"
              onClick={clearSearchAndFilters}
              style={{ ...secondaryButtonStyle, marginTop: 16 }}
            >
              بازگشت به همه سفارش‌ها
            </button>
          </div>
        ) : (
          <>
            <div
              className="admin-orders-desktop-table"
              style={{ overflowX: "auto" }}
            >
              <table
                className="admin-orders-table"
                style={{
                  width: "100%",

                  minWidth: 900,

                  borderCollapse: "collapse",

                  textAlign: "right",
                }}
              >
                <thead style={{ background: "#f3f6ef" }}>
                  <tr>
                    {(
                      [
                        "order_number",

                        "recipient_name",

                        "total",

                        "status",

                        "payment_status",

                        "created_at",
                      ] as SortKey[]
                    ).map((key) => (
                      <th
                        key={key}
                        scope="col"
                        style={{
                          padding: "15px 16px",

                          fontSize: 12,

                          fontWeight: 800,

                          whiteSpace: "nowrap",

                          borderBottom: `1px solid ${colors.border}`,

                          textAlign: "right",
                        }}
                      >
                        {renderSortHeader(key)}
                      </th>
                    ))}

                    <th
                      scope="col"
                      style={{
                        padding: "15px 16px",

                        color: "#536452",

                        fontSize: 12,

                        fontWeight: 800,

                        whiteSpace: "nowrap",

                        borderBottom: `1px solid ${colors.border}`,
                      }}
                    >
                      جزئیات
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td style={cellStyle}>
                        <strong style={{ color: colors.green }}>
                          {order.order_number}
                        </strong>
                      </td>

                      <td style={cellStyle}>{order.recipient_name || "—"}</td>

                      <td
                        style={{
                          ...cellStyle,

                          whiteSpace: "nowrap",

                          fontWeight: 700,
                        }}
                      >
                        {formatPrice(order.total)}
                      </td>

                      <td style={cellStyle}>
                        {renderStatusBadge(order.status)}
                      </td>

                      <td style={cellStyle}>
                        {renderPaymentBadge(order.payment_status)}
                      </td>

                      <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>
                        {formatDate(order.created_at)}
                      </td>

                      <td style={cellStyle}>
                        <button
                          type="button"
                          onClick={() =>
                            void openOrderDetails(order.order_number)
                          }
                          style={detailButtonStyle}
                        >
                          مشاهده
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div
              className="admin-orders-mobile-cards"
              style={{ padding: 12, gap: 12 }}
            >
              <div
                style={{
                  display: "flex",

                  alignItems: "center",

                  flexWrap: "wrap",

                  gap: 8,

                  padding: "4px 4px 12px",
                }}
              >
                <span
                  style={{
                    fontSize: 12,

                    fontWeight: 700,

                    color: colors.muted,
                  }}
                >
                  مرتب‌سازی:
                </span>

                <select
                  aria-label="مرتب‌سازی سفارش‌های موبایل"
                  value={sortKey}
                  onChange={(event) =>
                    handleSort(event.target.value as SortKey)
                  }
                  style={{
                    ...inputStyle,

                    width: "auto",

                    flex: "1 1 150px",
                  }}
                >
                  {(Object.keys(sortLabels) as SortKey[]).map((key) => (
                    <option key={key} value={key}>
                      {sortLabels[key]}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() =>
                    setSortDirection((current) =>
                      current === "asc" ? "desc" : "asc",
                    )
                  }
                  style={secondaryButtonStyle}
                  aria-label="تغییر جهت مرتب‌سازی"
                >
                  {sortDirection === "asc" ? "صعودی ↑" : "نزولی ↓"}
                </button>
              </div>

              {orders.map((order) => (
                <article
                  key={order.id}
                  style={{
                    border: `1px solid ${colors.border}`,

                    borderRadius: 14,

                    padding: 16,

                    background: colors.cream,

                    minWidth: 0,

                    boxSizing: "border-box",
                  }}
                >
                  <div
                    style={{
                      display: "flex",

                      justifyContent: "space-between",

                      alignItems: "center",

                      flexWrap: "wrap",

                      gap: 10,

                      marginBottom: 16,
                    }}
                  >
                    <strong
                      style={{
                        overflowWrap: "anywhere",

                        color: colors.green,
                      }}
                    >
                      سفارش {order.order_number}
                    </strong>

                    <button
                      type="button"
                      onClick={() => void openOrderDetails(order.order_number)}
                      style={detailButtonStyle}
                    >
                      مشاهده جزئیات
                    </button>
                  </div>

                  <div style={{ display: "grid", gap: 14 }}>
                    <div>
                      <div style={mobileLabelStyle}>نام گیرنده</div>

                      <div style={{ marginTop: 5, overflowWrap: "anywhere" }}>
                        {order.recipient_name || "—"}
                      </div>
                    </div>

                    <div>
                      <div style={mobileLabelStyle}>مبلغ نهایی</div>

                      <strong style={{ display: "block", marginTop: 5 }}>
                        {formatPrice(order.total)}
                      </strong>
                    </div>

                    <div>
                      <div style={mobileLabelStyle}>وضعیت سفارش</div>

                      <div style={{ marginTop: 7 }}>
                        {renderStatusBadge(order.status)}
                      </div>
                    </div>

                    <div>
                      <div style={mobileLabelStyle}>وضعیت پرداخت</div>

                      <div style={{ marginTop: 7 }}>
                        {renderPaymentBadge(order.payment_status)}
                      </div>
                    </div>

                    <div>
                      <div style={mobileLabelStyle}>تاریخ ثبت</div>

                      <div style={{ marginTop: 5 }}>
                        {formatDate(order.created_at)}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>

      <div
        style={{
          display: "flex",

          justifyContent: "space-between",

          alignItems: "center",

          flexWrap: "wrap",

          gap: 12,

          marginTop: 18,
        }}
      >
        <span style={{ color: colors.muted, fontSize: 13 }}>
          صفحه {formatNumber(page)} از {formatNumber(lastPage)}
        </span>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            style={paginationButtonStyle(page <= 1 || loading)}
          >
            قبلی
          </button>

          <button
            type="button"
            disabled={page >= lastPage || loading}
            onClick={() =>
              setPage((current) => Math.min(lastPage, current + 1))
            }
            style={paginationButtonStyle(page >= lastPage || loading)}
          >
            بعدی
          </button>
        </div>
      </div>

      {detailLoading && (
        <div style={modalBackdropStyle}>
          <div style={{ ...cardStyle, width: "min(420px, 100%)" }}>
            در حال دریافت جزئیات سفارش...
          </div>
        </div>
      )}

      {selectedOrder && (
        <div
          style={modalBackdropStyle}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeOrderDetails();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-details-title"
            style={{
              width: "min(820px, 100%)",

              maxHeight: "90vh",

              overflowY: "auto",

              background: "#faf9f4",

              border: `1px solid ${colors.border}`,

              borderRadius: 20,

              padding: "clamp(16px, 3vw, 26px)",

              boxSizing: "border-box",

              boxShadow: "0 24px 70px rgba(35, 55, 37, 0.22)",
            }}
          >
            <div
              style={{
                display: "flex",

                justifyContent: "space-between",

                alignItems: "start",

                gap: 16,

                marginBottom: 22,
              }}
            >
              <div>
                <div
                  style={{
                    color: colors.lilacText,

                    fontSize: 12,

                    fontWeight: 800,

                    marginBottom: 8,
                  }}
                >
                  جزئیات و پیگیری
                </div>

                <h2
                  id="order-details-title"
                  style={{
                    margin: "0 0 8px",

                    fontSize: 22,

                    color: colors.ink,
                  }}
                >
                  جزئیات سفارش
                </h2>

                <div style={{ color: colors.muted, fontSize: 13 }}>
                  {selectedOrder.order_number}
                </div>
              </div>

              <button
                type="button"
                onClick={closeOrderDetails}
                aria-label="بستن جزئیات"
                style={{
                  border: `1px solid ${colors.border}`,

                  background: "#ffffff",

                  color: "#536452",

                  borderRadius: 10,

                  width: 38,

                  height: 38,

                  fontSize: 22,

                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                display: "grid",

                gridTemplateColumns:
                  "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",

                gap: 12,

                marginBottom: 14,
              }}
            >
              <InfoBox
                label="نام گیرنده"
                value={selectedOrder.recipient_name}
              />

              <InfoBox label="تلفن" value={selectedOrder.phone} />

              <InfoBox
                label="تاریخ ثبت"
                value={formatDate(selectedOrder.created_at)}
              />

              <InfoBox
                label="وضعیت پرداخت"
                value={paymentLabels[selectedOrder.payment_status]}
              />
            </div>

            <InfoBox
              label="نشانی"
              value={`${selectedOrder.address || "—"}${
                selectedOrder.postal_code
                  ? ` - کد پستی: ${selectedOrder.postal_code}`
                  : ""
              }`}
            />

            {selectedOrder.notes && (
              <div style={{ marginTop: 12 }}>
                <InfoBox label="یادداشت سفارش" value={selectedOrder.notes} />
              </div>
            )}

            <h3 style={sectionHeadingStyle}>اقلام سفارش</h3>

            <div
              style={{
                overflowX: "auto",

                maxWidth: "100%",

                border: `1px solid ${colors.border}`,

                borderRadius: 12,

                background: "#ffffff",
              }}
            >
              <table
                style={{
                  width: "100%",

                  minWidth: 450,

                  borderCollapse: "collapse",

                  textAlign: "right",
                }}
              >
                <thead style={{ background: "#f0f4eb" }}>
                  <tr>
                    {["محصول و تنوع", "تعداد", "قیمت واحد", "جمع"].map(
                      (heading) => (
                        <th key={heading} scope="col" style={cellStyle}>
                          {heading}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>

                <tbody>
                  {(selectedOrder.items || []).map((item) => (
                    <tr key={item.id}>
                      <td style={cellStyle}>
                        {item.product_name || item.product?.name || "محصول"}
                        {item.variant_name || item.variant?.name ? (
                          <div
                            style={{
                              color: colors.green,
                              fontSize: 12,
                              fontWeight: 700,
                              marginTop: 5,
                            }}
                          >
                            تنوع: {item.variant_name || item.variant?.name}
                          </div>
                        ) : null}
                        {item.sku || item.variant?.sku ? (
                          <div
                            style={{
                              color: colors.muted,
                              fontSize: 11,
                              marginTop: 4,
                              direction: "ltr",
                              textAlign: "right",
                            }}
                          >
                            SKU: {item.sku || item.variant?.sku}
                          </div>
                        ) : null}
                      </td>

                      <td style={cellStyle}>{formatNumber(item.quantity)}</td>

                      <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>
                        {formatPrice(item.unit_price)}
                      </td>

                      <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>
                        {formatPrice(item.total_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div
              style={{
                background: "#f0f4eb",

                border: `1px solid ${colors.border}`,

                borderRadius: 14,

                padding: 16,

                marginTop: 18,

                display: "grid",

                gap: 12,
              }}
            >
              <SummaryRow
                label="جمع اولیه"
                value={formatPrice(selectedOrder.subtotal)}
              />

              <SummaryRow
                label="تخفیف"
                value={formatPrice(selectedOrder.discount)}
              />

              <SummaryRow
                label="هزینه ارسال"
                value={formatPrice(selectedOrder.shipping_cost)}
              />

              <div style={{ borderTop: "1px solid #dce4d7", paddingTop: 12 }}>
                <SummaryRow
                  label="مبلغ نهایی"
                  value={formatPrice(selectedOrder.total)}
                  strong
                />
              </div>
            </div>

            <div style={{ marginTop: 24 }}>
              <h3 style={sectionHeadingStyle}>تغییر وضعیت سفارش</h3>

              {selectedOrder.status === "cancelled" ? (
                <p style={{ color: "#984b48", fontSize: 14 }}>
                  این سفارش لغو شده است و از این بخش قابل فعال‌سازی مجدد نیست.
                </p>
              ) : selectedOrder.status === "delivered" ? (
                <p style={{ color: "#385e3e", fontSize: 14 }}>
                  این سفارش تحویل شده است و وضعیت آن قابل بازگشت نیست.
                </p>
              ) : (
                <div
                  style={{
                    display: "flex",

                    alignItems: "center",

                    flexWrap: "wrap",

                    gap: 10,
                  }}
                >
                  <select
                    value={newStatus}
                    onChange={(event) =>
                      setNewStatus(event.target.value as OrderStatus)
                    }
                    style={{
                      ...inputStyle,

                      width: "auto",

                      minWidth: 190,

                      maxWidth: "100%",
                    }}
                  >
                    <option value="pending">در انتظار</option>

                    {selectedOrder.payment_status === "paid" && (
                      <>
                        <option value="processing">در حال پردازش</option>

                        <option value="shipped">ارسال‌شده</option>

                        <option value="delivered">تحویل‌شده</option>
                      </>
                    )}
                  </select>

                  <button
                    type="button"
                    onClick={() => void updateOrderStatus()}
                    disabled={
                      updatingStatus || newStatus === selectedOrder.status
                    }
                    style={{
                      ...primaryButtonStyle,

                      opacity:
                        updatingStatus || newStatus === selectedOrder.status
                          ? 0.55
                          : 1,
                    }}
                  >
                    {updatingStatus ? "در حال ذخیره..." : "ذخیره وضعیت"}
                  </button>
                </div>
              )}
            </div>

            {notice && (
              <div
                role="status"
                style={{
                  background: colors.lilac,

                  border: "1px solid #dfd2ed",

                  color: colors.lilacText,

                  borderRadius: 10,

                  padding: 12,

                  marginTop: 16,

                  fontSize: 14,
                }}
              >
                {notice}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value?: string | null }) {
  return (
    <div
      style={{
        background: "#ffffff",

        border: `1px solid ${colors.border}`,

        borderRadius: 12,

        padding: 13,

        minWidth: 0,

        overflowWrap: "anywhere",
      }}
    >
      <div
        style={{
          color: colors.muted,

          fontSize: 12,

          marginBottom: 7,
        }}
      >
        {label}
      </div>

      <div
        style={{
          color: colors.ink,

          fontSize: 14,

          overflowWrap: "anywhere",

          whiteSpace: "pre-wrap",
        }}
      >
        {value || "—"}
      </div>
    </div>
  );
}

function SummaryRow({
  label,

  value,

  strong = false,
}: {
  label: string;

  value: string;

  strong?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",

        justifyContent: "space-between",

        gap: 16,

        fontSize: strong ? 16 : 14,

        fontWeight: strong ? 800 : 500,

        color: strong ? colors.ink : "#536452",
      }}
    >
      <span>{label}</span>

      <span style={{ whiteSpace: "nowrap" }}>{value}</span>
    </div>
  );
}

const sectionHeadingStyle: React.CSSProperties = {
  margin: "24px 0 12px",

  fontSize: 17,

  fontWeight: 800,

  color: colors.ink,
};

const cellStyle: React.CSSProperties = {
  padding: "14px 16px",

  borderBottom: `1px solid ${colors.border}`,

  fontSize: 13,

  verticalAlign: "middle",

  color: colors.ink,
};

const detailButtonStyle: React.CSSProperties = {
  border: `1px solid ${colors.border}`,

  background: "#e8efe2",

  color: "#385e3e",

  borderRadius: 9,

  padding: "8px 12px",

  fontFamily: "inherit",

  fontSize: 12,

  fontWeight: 700,

  cursor: "pointer",

  whiteSpace: "nowrap",

  transition: "all 160ms ease",
};

const mobileLabelStyle: React.CSSProperties = {
  color: colors.muted,

  fontSize: 12,
};

const modalBackdropStyle: React.CSSProperties = {
  position: "fixed",

  inset: 0,

  zIndex: 1000,

  background: "rgba(31, 47, 33, 0.48)",

  display: "flex",

  alignItems: "center",

  justifyContent: "center",

  padding: 20,

  boxSizing: "border-box",
};

function paginationButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    border: `1px solid ${colors.border}`,

    borderRadius: 10,

    background: disabled ? "#f0f2ec" : "#ffffff",

    color: disabled ? "#a0a79b" : colors.green,

    padding: "9px 16px",

    fontSize: 13,

    fontWeight: 700,

    cursor: disabled ? "not-allowed" : "pointer",

    fontFamily: "inherit",
  };
}

export default AdminOrders;
