import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  UserRound,
  Mail,
  CalendarDays,
  ShoppingCart,
  Wallet,
  RefreshCw,
  AlertCircle,
  Package,
} from "lucide-react";
import { adminApi } from "../services/api";
type CustomerOrder = {
  id: number;
  order_number: string;
  status: string;
  payment_status: string;
  total: number | string;
  created_at: string;
  items?: Array<{
    id: number;
    quantity: number;
    price?: number | string;
    product?: {
      name?: string;
    };
  }>;
};

type Customer = {
  id: number;
  name: string;
  email: string;
  created_at: string;
};

type PaginatedOrders = {
  data: CustomerOrder[];
  current_page: number;
  last_page: number;
  total: number;
};

type CustomerDetailResponse = {
  success: boolean;
  data: {
    customer: Customer;
    summary: {
      orders_count: number;
      paid_orders_count: number;
      total_spent: number | string;
    };
    orders: PaginatedOrders;
  };
};

const numberFormatter = new Intl.NumberFormat("fa-IR");

function formatNumber(value: number | string | null | undefined) {
  return numberFormatter.format(Number(value) || 0);
}

function formatPrice(value: number | string | null | undefined) {
  return `${formatNumber(value)} تومان`;
}

function formatDate(value: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

const statusLabels: Record<string, string> = {
  pending: "در انتظار بررسی",
  processing: "در حال پردازش",
  shipped: "ارسال‌شده",
  delivered: "تحویل‌شده",
  cancelled: "لغوشده",
  unpaid: "پرداخت‌نشده",
  paid: "پرداخت‌شده",
  failed: "ناموفق",
  refunded: "مستردشده",
};

function getStatusLabel(status: string) {
  return statusLabels[status] ?? status ?? "نامشخص";
}

function AdminCustomerDetail() {
  const { customerId } = useParams<{ customerId: string }>();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [summary, setSummary] = useState({
    orders_count: 0,
    paid_orders_count: 0,
    total_spent: 0,
  });
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCustomer = useCallback(async () => {
    if (!customerId || !/^\d+$/.test(customerId)) {
      setError("شناسهٔ مشتری معتبر نیست.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await adminApi.get<CustomerDetailResponse>(
        `/admin/customers/${customerId}`,
        {
          params: {
            page,
            per_page: 10,
          },
        },
      );
      const result = response.data;

      if (!result?.success || !result?.data?.customer) {
        throw new Error("پاسخ سرور معتبر نیست.");
      }

      setCustomer(result.data.customer);
      setSummary({
        orders_count: Number(result.data.summary?.orders_count) || 0,
        paid_orders_count: Number(result.data.summary?.paid_orders_count) || 0,
        total_spent: Number(result.data.summary?.total_spent) || 0,
      });

      const orderData = result.data.orders;

      setOrders(orderData?.data ?? []);
      setLastPage(orderData?.last_page ?? 1);
      setTotalOrders(orderData?.total ?? 0);
    } catch {
      setError(
        "دریافت اطلاعات مشتری انجام نشد. ممکن است مشتری وجود نداشته باشد یا ارتباط با سرور برقرار نباشد.",
      );
    } finally {
      setLoading(false);
    }
  }, [customerId, page]);

  useEffect(() => {
    void loadCustomer();
  }, [loadCustomer]);

  return (
    <div className="customer-detail-page" dir="rtl">
      <style>{`
        .customer-detail-page {
          color: #243529;
          padding-bottom: 28px;
          min-width: 0;
        }
        .customer-detail-page * { box-sizing: border-box; }
        .customer-detail-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 24px;
        }
        .customer-detail-back {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #557657;
          text-decoration: none;
          font-size: 12px;
          font-weight: 800;
          margin-bottom: 18px;
        }
        .customer-detail-back:hover { color: #2e5230; }
        .customer-detail-title {
          margin: 0;
          font-size: clamp(23px, 3vw, 29px);
          font-weight: 900;
        }
        .customer-detail-subtitle {
          margin: 9px 0 0;
          color: #829084;
          font-size: 13px;
          line-height: 1.9;
        }
        .customer-detail-card {
          padding: 24px;
          background: #fff;
          border: 1px solid #e9eee7;
          border-radius: 16px;
          box-shadow: 0 5px 22px rgba(31,55,35,.025);
        }
        .customer-detail-profile {
          display: flex;
          align-items: center;
          gap: 16px;
          min-width: 0;
        }
        .customer-detail-avatar {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 65px;
          height: 65px;
          flex-shrink: 0;
          color: #527852;
          background: #edf4e9;
          border-radius: 18px;
        }
        .customer-detail-name {
          margin: 0 0 10px;
          font-size: 19px;
          font-weight: 900;
          overflow-wrap: anywhere;
        }
        .customer-detail-email {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #829084;
          font-size: 12px;
          overflow-wrap: anywhere;
        }
        .customer-detail-joined {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-top: 9px;
          color: #829084;
          font-size: 11px;
        }
        .customer-detail-stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 15px;
          margin: 20px 0 25px;
        }
        .customer-detail-stat {
          padding: 20px;
          background: #fff;
          border: 1px solid #e9eee7;
          border-radius: 15px;
        }
        .customer-detail-stat-label {
          color: #829084;
          font-size: 12px;
          font-weight: 700;
        }
        .customer-detail-stat-value {
          margin: 15px 0 0;
          color: #2d4430;
          font-size: clamp(19px, 2.4vw, 25px);
          font-weight: 900;
          overflow-wrap: anywhere;
        }
        .customer-detail-orders {
          overflow: hidden;
          background: #fff;
          border: 1px solid #e9eee7;
          border-radius: 16px;
        }
        .customer-detail-orders-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 22px;
          border-bottom: 1px solid #edf0ea;
        }
        .customer-detail-orders-heading h2 {
          margin: 0;
          font-size: 15px;
          font-weight: 900;
        }
        .customer-detail-orders-heading p {
          margin: 7px 0 0;
          color: #829084;
          font-size: 11px;
        }
        .customer-detail-count {
          padding: 7px 10px;
          color: #527852;
          background: #edf4e9;
          border-radius: 9px;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
        }
        .customer-detail-table-wrap { overflow-x: auto; }
        .customer-detail-table {
          width: 100%;
          border-collapse: collapse;
          text-align: right;
          white-space: nowrap;
        }
        .customer-detail-table th {
          padding: 14px 20px;
          color: #829084;
          background: #fafbf9;
          border-bottom: 1px solid #edf0ea;
          font-size: 11px;
        }
        .customer-detail-table td {
          padding: 16px 20px;
          color: #526153;
          border-bottom: 1px solid #f0f2ee;
          font-size: 12px;
        }
        .customer-detail-table tr:last-child td { border-bottom: 0; }
        .customer-detail-status {
          display: inline-flex;
          padding: 6px 9px;
          border-radius: 8px;
          background: #f0f3ef;
          color: #526153;
          font-size: 11px;
          font-weight: 800;
        }
        .customer-detail-status.paid,
        .customer-detail-status.delivered {
          background: #edf5eb;
          color: #477449;
        }
        .customer-detail-status.failed,
        .customer-detail-status.cancelled {
          background: #fff0ed;
          color: #a34f42;
        }
        .customer-detail-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          min-height: 200px;
          padding: 25px;
          color: #829084;
          font-size: 12px;
          line-height: 1.9;
          text-align: center;
        }
        .customer-detail-retry {
          padding: 9px 13px;
          color: #527852;
          background: white;
          border: 1px solid #dfe8dc;
          border-radius: 9px;
          cursor: pointer;
          font: inherit;
          font-size: 12px;
          font-weight: 800;
        }
        .customer-detail-pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 16px 22px;
          border-top: 1px solid #edf0ea;
          color: #829084;
          font-size: 11px;
        }
        .customer-detail-pagination button {
          padding: 8px 12px;
          color: #526153;
          background: white;
          border: 1px solid #e4eae1;
          border-radius: 9px;
          cursor: pointer;
          font: inherit;
        }
        .customer-detail-pagination button:disabled {
          opacity: .4;
          cursor: not-allowed;
        }
        @media (max-width: 650px) {
          .customer-detail-card { padding: 17px; }
          .customer-detail-stats {
            grid-template-columns: 1fr;
            gap: 10px;
          }
          .customer-detail-stat { padding: 16px; }
          .customer-detail-stat-value { margin-top: 9px; }
          .customer-detail-orders-heading { padding: 17px; }
          .customer-detail-pagination {
            align-items: flex-start;
            flex-direction: column;
            padding: 16px;
          }
        }
      `}</style>

      <header className="customer-detail-header">
        <div>
          <Link to="/admin/customers" className="customer-detail-back">
            <ArrowRight size={17} />
            بازگشت به فهرست مشتریان
          </Link>

          <h1 className="customer-detail-title">جزئیات مشتری</h1>
          <p className="customer-detail-subtitle">
            اطلاعات حساب کاربری و تاریخچه سفارش‌های مشتری.
          </p>
        </div>
      </header>

      {error ? (
        <div
          className="customer-detail-card customer-detail-state"
          role="alert"
        >
          <AlertCircle size={26} color="#b45345" />
          <span>{error}</span>
          <button
            type="button"
            className="customer-detail-retry"
            onClick={() => void loadCustomer()}
          >
            تلاش دوباره
          </button>
          <Link to="/admin/customers" className="customer-detail-back">
            بازگشت به فهرست مشتریان
          </Link>
        </div>
      ) : loading ? (
        <div
          className="customer-detail-card customer-detail-state"
          role="status"
        >
          <RefreshCw size={24} />
          در حال دریافت اطلاعات مشتری...
        </div>
      ) : customer ? (
        <>
          <section className="customer-detail-card">
            <div className="customer-detail-profile">
              <div className="customer-detail-avatar">
                <UserRound size={30} />
              </div>

              <div>
                <h2 className="customer-detail-name">
                  {customer.name || "بدون نام"}
                </h2>

                <div className="customer-detail-email">
                  <Mail size={15} />
                  {customer.email || "ایمیل ثبت نشده"}
                </div>

                <div className="customer-detail-joined">
                  <CalendarDays size={14} />
                  تاریخ عضویت: {formatDate(customer.created_at)}
                </div>
              </div>
            </div>
          </section>

          <section className="customer-detail-stats">
            <article className="customer-detail-stat">
              <div className="customer-detail-stat-label">
                <ShoppingCart
                  size={15}
                  style={{ verticalAlign: "middle", marginLeft: 6 }}
                />
                تعداد سفارش‌ها
              </div>
              <p className="customer-detail-stat-value">
                {formatNumber(summary.orders_count)}
              </p>
            </article>

            <article className="customer-detail-stat">
              <div className="customer-detail-stat-label">
                <Package
                  size={15}
                  style={{ verticalAlign: "middle", marginLeft: 6 }}
                />
                سفارش‌های پرداخت‌شده
              </div>
              <p className="customer-detail-stat-value">
                {formatNumber(summary.paid_orders_count)}
              </p>
            </article>

            <article className="customer-detail-stat">
              <div className="customer-detail-stat-label">
                <Wallet
                  size={15}
                  style={{ verticalAlign: "middle", marginLeft: 6 }}
                />
                مجموع خرید پرداخت‌شده
              </div>
              <p className="customer-detail-stat-value">
                {formatPrice(summary.total_spent)}
              </p>
            </article>
          </section>

          <section className="customer-detail-orders">
            <div className="customer-detail-orders-heading">
              <div>
                <h2>تاریخچه سفارش‌ها</h2>
                <p>سفارش‌های ثبت‌شده توسط این مشتری</p>
              </div>
              <span className="customer-detail-count">
                {formatNumber(totalOrders)} سفارش
              </span>
            </div>

            {orders.length === 0 ? (
              <div className="customer-detail-state">
                <ShoppingCart size={27} />
                <strong>هنوز سفارشی ثبت نشده است.</strong>
              </div>
            ) : (
              <div className="customer-detail-table-wrap">
                <table className="customer-detail-table">
                  <thead>
                    <tr>
                      <th>شماره سفارش</th>
                      <th>تاریخ ثبت</th>
                      <th>مبلغ سفارش</th>
                      <th>وضعیت سفارش</th>
                      <th>وضعیت پرداخت</th>
                    </tr>
                  </thead>

                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id}>
                        <td>{order.order_number || order.id}</td>
                        <td>{formatDate(order.created_at)}</td>
                        <td style={{ fontWeight: 800, color: "#354b37" }}>
                          {formatPrice(order.total)}
                        </td>
                        <td>
                          <span
                            className={`customer-detail-status ${order.status}`}
                          >
                            {getStatusLabel(order.status)}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`customer-detail-status ${order.payment_status}`}
                          >
                            {getStatusLabel(order.payment_status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {totalOrders > 0 && (
              <footer className="customer-detail-pagination">
                <span>
                  صفحه {formatNumber(page)} از {formatNumber(lastPage)}
                </span>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    disabled={page <= 1 || loading}
                    onClick={() =>
                      setPage((current) => Math.max(1, current - 1))
                    }
                  >
                    قبلی
                  </button>

                  <button
                    type="button"
                    disabled={page >= lastPage || loading}
                    onClick={() =>
                      setPage((current) => Math.min(lastPage, current + 1))
                    }
                  >
                    بعدی
                  </button>
                </div>
              </footer>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

export default AdminCustomerDetail;
