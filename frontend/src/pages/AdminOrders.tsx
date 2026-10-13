import { useCallback, useEffect, useState } from "react";
import api from "../services/api";

type OrderStatus =
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

type PaymentStatus = "paid" | "unpaid" | "failed" | "refunded";

interface OrderItem {
  id: number;
  product_id: number;
  product_name: string;
  sku?: string | null;
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
    pending: { color: "#92400e", background: "#fef3c7" },
    processing: { color: "#1d4ed8", background: "#dbeafe" },
    shipped: { color: "#6d28d9", background: "#ede9fe" },
    delivered: { color: "#166534", background: "#dcfce7" },
    cancelled: { color: "#991b1b", background: "#fee2e2" },
  };

const paymentColors: Record<
  PaymentStatus,
  { color: string; background: string }
> = {
  paid: { color: "#166534", background: "#dcfce7" },
  unpaid: { color: "#92400e", background: "#fef3c7" },
  failed: { color: "#991b1b", background: "#fee2e2" },
  refunded: { color: "#6d28d9", background: "#ede9fe" },
};

function formatPrice(value: string | number | null | undefined) {
  return `${new Intl.NumberFormat("fa-IR").format(Number(value ?? 0))} تومان`;
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
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  padding: "20px",
  boxShadow: "0 4px 14px rgba(0,0,0,0.03)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  border: "1px solid #d1d5db",
  borderRadius: "9px",
  padding: "11px 12px",
  background: "#fff",
  color: "#111827",
  fontSize: "14px",
  fontFamily: "inherit",
};

const primaryButtonStyle: React.CSSProperties = {
  border: 0,
  borderRadius: "9px",
  padding: "11px 16px",
  background: "#2563eb",
  color: "#fff",
  fontSize: "14px",
  fontWeight: 700,
  fontFamily: "inherit",
  cursor: "pointer",
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

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/admin/orders", {
        params: {
          page,
          per_page: 15,
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
  }, [page, search, statusFilter, paymentFilter]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

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

      const response = await api.get(
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

      const response = await api.patch(
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

  const applySearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const changeStatusFilter = (value: string) => {
    setPage(1);
    setStatusFilter(value);
  };

  const changePaymentFilter = (value: string) => {
    setPage(1);
    setPaymentFilter(value);
  };

  return (
    <div dir="rtl" style={{ color: "#111827" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "26px",
        }}
      >
        <div>
          <h1
            style={{
              margin: "0 0 8px",
              fontSize: "28px",
              fontWeight: 800,
            }}
          >
            مدیریت سفارش‌ها
          </h1>

          <p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>
            مشاهده، جست‌وجو و مدیریت سفارش‌های مشتریان
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <button
            type="button"
            onClick={clearSearchAndFilters}
            style={{
              ...primaryButtonStyle,
              background: "#059669",
            }}
          >
            پاک کردن جستجو و نمایش همه سفارش‌ها
          </button>

          <button
            type="button"
            onClick={() => void loadOrders()}
            disabled={loading}
            style={{
              ...primaryButtonStyle,
              opacity: loading ? 0.65 : 1,
            }}
          >
            {loading ? "در حال دریافت..." : "تازه‌سازی"}
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: "14px",
          marginBottom: "22px",
        }}
      >
        <div style={cardStyle}>
          <div
            style={{
              color: "#6b7280",
              fontSize: "13px",
              marginBottom: 8,
            }}
          >
            سفارش‌های مطابق فیلتر
          </div>

          <strong style={{ fontSize: "25px" }}>
            {new Intl.NumberFormat("fa-IR").format(total)}
          </strong>
        </div>

        <div style={cardStyle}>
          <div
            style={{
              color: "#6b7280",
              fontSize: "13px",
              marginBottom: 8,
            }}
          >
            تعداد این صفحه
          </div>

          <strong style={{ fontSize: "25px" }}>
            {new Intl.NumberFormat("fa-IR").format(orders.length)}
          </strong>
        </div>
      </div>

      <form
        className="admin-orders-filters"
        onSubmit={applySearch}
        style={{
          ...cardStyle,
          display: "grid",
          gridTemplateColumns:
            "minmax(180px, 2fr) repeat(2, minmax(150px, 1fr)) auto",
          gap: "12px",
          alignItems: "end",
          marginBottom: "20px",
        }}
      >
        <label
          style={{
            display: "block",
            fontSize: "13px",
            color: "#4b5563",
          }}
        >
          جست‌وجو
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="شماره سفارش، نام گیرنده یا تلفن"
            style={{ ...inputStyle, marginTop: 7 }}
          />
        </label>

        <label
          style={{
            display: "block",
            fontSize: "13px",
            color: "#4b5563",
          }}
        >
          وضعیت سفارش
          <select
            value={statusFilter}
            onChange={(event) => changeStatusFilter(event.target.value)}
            style={{ ...inputStyle, marginTop: 7 }}
          >
            <option value="">همه وضعیت‌ها</option>
            <option value="pending">در انتظار</option>
            <option value="processing">در حال پردازش</option>
            <option value="shipped">ارسال‌شده</option>
            <option value="delivered">تحویل‌شده</option>
            <option value="cancelled">لغوشده</option>
          </select>
        </label>

        <label
          style={{
            display: "block",
            fontSize: "13px",
            color: "#4b5563",
          }}
        >
          وضعیت پرداخت
          <select
            value={paymentFilter}
            onChange={(event) => changePaymentFilter(event.target.value)}
            style={{ ...inputStyle, marginTop: 7 }}
          >
            <option value="">همه پرداخت‌ها</option>
            <option value="paid">پرداخت‌شده</option>
            <option value="unpaid">پرداخت‌نشده</option>
            <option value="failed">ناموفق</option>
            <option value="refunded">بازپرداخت‌شده</option>
          </select>
        </label>

        <button type="submit" style={primaryButtonStyle}>
          جست‌وجو
        </button>
      </form>

      {error && (
        <div
          role="alert"
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#b91c1c",
            borderRadius: "10px",
            padding: "14px 16px",
            marginBottom: "18px",
          }}
        >
          {error}
        </div>
      )}

      {notice && (
        <div
          role="status"
          style={{
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            color: "#1d4ed8",
            borderRadius: "10px",
            padding: "14px 16px",
            marginBottom: "18px",
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
              fontSize: "18px",
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
          overflowX: "auto",
        }}
      >
        {loading ? (
          <p style={{ padding: "28px", color: "#6b7280" }}>
            در حال دریافت سفارش‌ها...
          </p>
        ) : orders.length === 0 ? (
          <div style={{ padding: "36px 20px", textAlign: "center" }}>
            <div
              style={{
                fontSize: "17px",
                fontWeight: 700,
                marginBottom: 8,
              }}
            >
              سفارشی پیدا نشد
            </div>

            <div style={{ color: "#6b7280", fontSize: "14px" }}>
              فیلترها را تغییر بده یا دوباره جست‌وجو کن.
            </div>

            <button
              type="button"
              onClick={clearSearchAndFilters}
              style={{
                ...primaryButtonStyle,
                background: "#059669",
                marginTop: "16px",
              }}
            >
              بازگشت به همه سفارش‌ها
            </button>
          </div>
        ) : (
          <table
            className="admin-orders-desktop-table"
            style={{
              width: "100%",
              minWidth: "900px",
              borderCollapse: "collapse",
              textAlign: "right",
            }}
          >
            <thead style={{ background: "#f9fafb" }}>
              <tr>
                {[
                  "ردیف",
                  "شماره سفارش",
                  "نام گیرنده",
                  "مبلغ نهایی",
                  "وضعیت سفارش",
                  "وضعیت پرداخت",
                  "تاریخ",
                  "جزئیات",
                ].map((heading) => (
                  <th
                    key={heading}
                    style={{
                      padding: "15px 16px",
                      color: "#4b5563",
                      fontSize: "13px",
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {orders.map((order, index) => (
                <tr key={order.id}>
                  <td style={cellStyle}>{(page - 1) * 15 + index + 1}</td>

                  <td style={cellStyle}>
                    <strong>{order.order_number}</strong>
                  </td>

                  <td style={cellStyle}>{order.recipient_name || "—"}</td>

                  <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>
                    {formatPrice(order.total)}
                  </td>

                  <td style={cellStyle}>
                    <span
                      style={{
                        ...statusColors[order.status],
                        display: "inline-block",
                        borderRadius: "20px",
                        padding: "5px 10px",
                        fontSize: "12px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {statusLabels[order.status] || order.status}
                    </span>
                  </td>

                  <td style={cellStyle}>
                    <span
                      style={{
                        ...paymentColors[order.payment_status],
                        display: "inline-block",
                        borderRadius: "20px",
                        padding: "5px 10px",
                        fontSize: "12px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {paymentLabels[order.payment_status] ||
                        order.payment_status}
                    </span>
                  </td>

                  <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>
                    {formatDate(order.created_at)}
                  </td>

                  <td style={cellStyle}>
                    <button
                      type="button"
                      onClick={() => void openOrderDetails(order.order_number)}
                      style={{
                        border: "1px solid #bfdbfe",
                        background: "#eff6ff",
                        color: "#1d4ed8",
                        borderRadius: "8px",
                        padding: "8px 12px",
                        fontFamily: "inherit",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      مشاهده
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {!loading && orders.length > 0 && (
        <div className="admin-orders-mobile-cards">
          {orders.map((order, index) => (
            <article
              key={order.id}
              style={{
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: "14px",
                padding: "16px",
                marginBottom: "12px",
                boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "10px",
                  marginBottom: "14px",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#6b7280",
                      marginBottom: "5px",
                    }}
                  >
                    شماره سفارش
                  </div>
                  <strong style={{ overflowWrap: "anywhere" }}>
                    {order.order_number}
                  </strong>
                </div>

                <span
                  style={{
                    fontSize: "12px",
                    color: "#6b7280",
                    whiteSpace: "nowrap",
                  }}
                >
                  ردیف{" "}
                  {new Intl.NumberFormat("fa-IR").format(
                    (page - 1) * 15 + index + 1,
                  )}
                </span>
              </div>

              <div style={{ marginBottom: "12px", overflowWrap: "anywhere" }}>
                <span style={{ color: "#6b7280", fontSize: "13px" }}>
                  گیرنده:{" "}
                </span>
                <strong>{order.recipient_name || "—"}</strong>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: "14px 10px",
                  marginBottom: "16px",
                }}
              >
                <div>
                  <div
                    style={{
                      color: "#6b7280",
                      fontSize: "12px",
                      marginBottom: "6px",
                    }}
                  >
                    مبلغ نهایی
                  </div>
                  <strong style={{ fontSize: "14px" }}>
                    {formatPrice(order.total)}
                  </strong>
                </div>

                <div>
                  <div
                    style={{
                      color: "#6b7280",
                      fontSize: "12px",
                      marginBottom: "6px",
                    }}
                  >
                    تاریخ
                  </div>
                  <span style={{ fontSize: "13px" }}>
                    {formatDate(order.created_at)}
                  </span>
                </div>

                <div>
                  <div
                    style={{
                      color: "#6b7280",
                      fontSize: "12px",
                      marginBottom: "6px",
                    }}
                  >
                    وضعیت سفارش
                  </div>
                  <span
                    style={{
                      ...statusColors[order.status],
                      display: "inline-block",
                      borderRadius: "20px",
                      padding: "5px 9px",
                      fontSize: "12px",
                    }}
                  >
                    {statusLabels[order.status] || order.status}
                  </span>
                </div>

                <div>
                  <div
                    style={{
                      color: "#6b7280",
                      fontSize: "12px",
                      marginBottom: "6px",
                    }}
                  >
                    وضعیت پرداخت
                  </div>
                  <span
                    style={{
                      ...paymentColors[order.payment_status],
                      display: "inline-block",
                      borderRadius: "20px",
                      padding: "5px 9px",
                      fontSize: "12px",
                    }}
                  >
                    {paymentLabels[order.payment_status] ||
                      order.payment_status}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void openOrderDetails(order.order_number)}
                style={{
                  width: "100%",
                  minHeight: "44px",
                  border: "1px solid #bfdbfe",
                  background: "#eff6ff",
                  color: "#1d4ed8",
                  borderRadius: "9px",
                  padding: "10px",
                  fontFamily: "inherit",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                مشاهده جزئیات سفارش
              </button>
            </article>
          ))}
        </div>
      )}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginTop: "18px",
        }}
      >
        <span style={{ color: "#6b7280", fontSize: "13px" }}>
          صفحه {new Intl.NumberFormat("fa-IR").format(page)} از{" "}
          {new Intl.NumberFormat("fa-IR").format(lastPage)}
        </span>

        <div style={{ display: "flex", gap: "8px" }}>
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
              setSelectedOrder(null);
              setNotice("");
            }
          }}
        >
          <section
            className="admin-order-details-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-details-title"
            style={{
              width: "min(820px, 100%)",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#fff",
              borderRadius: "16px",
              padding: "24px",
              boxSizing: "border-box",
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "start",
                gap: "16px",
                marginBottom: "20px",
              }}
            >
              <div>
                <h2
                  id="order-details-title"
                  style={{
                    margin: "0 0 8px",
                    fontSize: "21px",
                  }}
                >
                  جزئیات سفارش
                </h2>

                <div style={{ color: "#6b7280", fontSize: "13px" }}>
                  {selectedOrder.order_number}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedOrder(null);
                  setNotice("");
                }}
                aria-label="بستن جزئیات"
                style={{
                  border: 0,
                  background: "#f3f4f6",
                  borderRadius: "8px",
                  padding: "6px 12px",
                  fontSize: "22px",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "12px",
                marginBottom: "22px",
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
              <div style={{ marginTop: "12px" }}>
                <InfoBox label="یادداشت سفارش" value={selectedOrder.notes} />
              </div>
            )}

            <h3 style={{ margin: "24px 0 12px", fontSize: "17px" }}>
              اقلام سفارش
            </h3>

            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  minWidth: "450px",
                  borderCollapse: "collapse",
                  textAlign: "right",
                }}
              >
                <thead style={{ background: "#f9fafb" }}>
                  <tr>
                    {["محصول", "تعداد", "قیمت واحد", "جمع"].map((heading) => (
                      <th key={heading} style={cellStyle}>
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {(selectedOrder.items || []).map((item) => (
                    <tr key={item.id}>
                      <td style={cellStyle}>
                        {item.product_name || item.product?.name || "محصول"}

                        {item.sku ? (
                          <div
                            style={{
                              color: "#6b7280",
                              fontSize: "12px",
                              marginTop: 4,
                            }}
                          >
                            {item.sku}
                          </div>
                        ) : null}
                      </td>

                      <td style={cellStyle}>{item.quantity}</td>

                      <td
                        style={{
                          ...cellStyle,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatPrice(item.unit_price)}
                      </td>

                      <td
                        style={{
                          ...cellStyle,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatPrice(item.total_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div
              style={{
                background: "#f9fafb",
                borderRadius: "12px",
                padding: "16px",
                marginTop: "18px",
                display: "grid",
                gap: "10px",
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

              <div
                style={{
                  borderTop: "1px solid #e5e7eb",
                  paddingTop: 12,
                }}
              >
                <SummaryRow
                  label="مبلغ نهایی"
                  value={formatPrice(selectedOrder.total)}
                  strong
                />
              </div>
            </div>

            <div style={{ marginTop: "24px" }}>
              <h3 style={{ margin: "0 0 12px", fontSize: "17px" }}>
                تغییر وضعیت سفارش
              </h3>

              {selectedOrder.status === "cancelled" ? (
                <p style={{ color: "#991b1b", fontSize: "14px" }}>
                  این سفارش لغو شده است و از این بخش قابل فعال‌سازی مجدد نیست.
                </p>
              ) : selectedOrder.status === "delivered" ? (
                <p style={{ color: "#166534", fontSize: "14px" }}>
                  این سفارش تحویل شده است و وضعیت آن قابل بازگشت نیست.
                </p>
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "10px",
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
                      minWidth: "190px",
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
                  background: "#eff6ff",
                  color: "#1d4ed8",
                  borderRadius: "9px",
                  padding: "12px",
                  marginTop: "16px",
                  fontSize: "14px",
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
        background: "#f9fafb",
        border: "1px solid #e5e7eb",
        borderRadius: "10px",
        padding: "13px",
        minWidth: 0,
      }}
    >
      <div
        style={{
          color: "#6b7280",
          fontSize: "12px",
          marginBottom: "7px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          color: "#111827",
          fontSize: "14px",
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
        gap: "16px",
        fontSize: strong ? "16px" : "14px",
        fontWeight: strong ? 800 : 500,
      }}
    >
      <span>{label}</span>
      <span style={{ whiteSpace: "nowrap" }}>{value}</span>
    </div>
  );
}

const cellStyle: React.CSSProperties = {
  padding: "14px 16px",
  borderBottom: "1px solid #e5e7eb",
  fontSize: "13px",
  verticalAlign: "middle",
};

const modalBackdropStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1000,
  background: "rgba(17,24,39,0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
  boxSizing: "border-box",
};

function paginationButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    background: disabled ? "#f3f4f6" : "#fff",
    color: disabled ? "#9ca3af" : "#111827",
    padding: "9px 16px",
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "inherit",
  };
}

export default AdminOrders;
