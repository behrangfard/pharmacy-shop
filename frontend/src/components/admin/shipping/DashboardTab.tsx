import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  Boxes,
  ClipboardList,
  Clock,
  Package,
  PackageCheck,
  RefreshCw,
  Truck,
  Undo2,
  X,
} from "lucide-react";

import { adminApi } from "../../../services/api";
import {
  formatAdminDate,
  formatAdminNumber,
  formatAdminPrice,
  getAdminErrorMessage,
} from "../../../utils/adminFormat";

import {
  type Notice,
  type OrderOption,
  type OverviewData,
  statusBadge,
  statusOf,
  NoticeBox,
} from "./shippingShared";

/* ------------------------------------------------------------------ */
/* ۱) داشبورد ارسال                                                    */
/* ------------------------------------------------------------------ */

const DASHBOARD_CARDS: {
  label: string;
  key: keyof OverviewData["stats"];
  status: string;
  icon: typeof Truck;
}[] = [
  { label: "آماده بسته‌بندی", key: "awaiting_packaging", status: "awaiting_packaging", icon: Package },
  { label: "در حال بسته‌بندی", key: "packaging", status: "packaging", icon: Boxes },
  { label: "آماده ارسال", key: "ready_to_ship", status: "ready_to_ship", icon: ClipboardList },
  { label: "ارسال‌شده", key: "shipped", status: "in_transit", icon: Truck },
  { label: "تحویل‌شده", key: "delivered", status: "delivered", icon: PackageCheck },
  { label: "دارای تأخیر", key: "delayed", status: "delayed", icon: Clock },
  { label: "برگشتی", key: "returned", status: "returned", icon: Undo2 },
  { label: "ناموفق در تحویل", key: "delivery_failed", status: "delivery_failed", icon: X },
];

export function DashboardTab({
  refreshToken,
  onRegisterOrder,
  onOpenShipment,
  onOpenStatus,
}: {
  refreshToken: number;
  onRegisterOrder: (order: OrderOption) => void;
  onOpenShipment: (id: number) => void;
  onOpenStatus: (status: string) => void;
}) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const response = await adminApi.get("/admin/shipping");
      setData((response.data?.data as OverviewData) ?? null);
      setNotice(null);
    } catch (error) {
      setNotice({ type: "error", text: getAdminErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshToken]);

  const stats = data?.stats;

  return (
    <div>
      <NoticeBox notice={notice} />

      <div className="admin-stats">
        {DASHBOARD_CARDS.map((card) => {
          const Icon = card.icon;

          return (
            <button
              key={card.key}
              type="button"
              className="admin-stat"
              style={{ textAlign: "right", cursor: "pointer" }}
              onClick={() => onOpenStatus(card.status)}
              title="نمایش مرسوله‌های این وضعیت"
            >
              <span className="admin-stat-label">
                <Icon size={14} style={{ verticalAlign: "-2px" }} /> {card.label}
              </span>
              <span className="admin-stat-value">
                {loading ? "…" : formatAdminNumber(stats?.[card.key] ?? 0)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="admin-stats">
        <div className="admin-stat">
          <span className="admin-stat-label">هزینهٔ ارسال (کل)</span>
          <span className="admin-stat-value">
            {formatAdminPrice(data?.costs.total ?? 0)}
          </span>
          <span className="admin-stat-hint">
            ۳۰ روز اخیر: {formatAdminPrice(data?.costs.last_30_days ?? 0)}
          </span>
        </div>

        <div className="admin-stat">
          <span className="admin-stat-label">میانگین هزینهٔ هر مرسوله</span>
          <span className="admin-stat-value">
            {formatAdminPrice(data?.costs.average ?? 0)}
          </span>
          <span className="admin-stat-hint">
            کل مرسوله‌ها: {formatAdminNumber(stats?.total ?? 0)}
          </span>
        </div>

        <div className="admin-stat">
          <span className="admin-stat-label">روش‌های ارسال (فعال / کل)</span>
          <span className="admin-stat-value">
            {formatAdminNumber(data?.methods.active ?? 0)} /{" "}
            {formatAdminNumber(data?.methods.total ?? 0)}
          </span>
          <span className="admin-stat-hint">مناطق فعال: {formatAdminNumber(data?.zones.active ?? 0)}</span>
        </div>

        <div className="admin-stat">
          <span className="admin-stat-label">تعرفه‌های فعال</span>
          <span className="admin-stat-value">
            {formatAdminNumber(data?.rules.active ?? 0)}
          </span>
          <span className="admin-stat-hint">
            کل تعرفه‌ها: {formatAdminNumber(data?.rules.total ?? 0)}
          </span>
        </div>
      </div>
      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2 className="admin-card-title">سفارش‌های در انتظار ارسال</h2>
            <p className="admin-card-desc">
              سفارش‌های پرداخت‌شده‌ای که هنوز مرسولهٔ باز ندارند؛ با «ثبت
              مرسوله» چرخهٔ ارسال آغاز می‌شود.
            </p>
          </div>

          <button
            type="button"
            className="admin-btn admin-btn-sm"
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw size={14} /> به‌روزرسانی
          </button>
        </div>

        {loading ? (
          <p className="admin-empty">در حال دریافت اطلاعات...</p>
        ) : (data?.awaiting_shipment_orders.length ?? 0) === 0 ? (
          <p className="admin-empty">سفارشی در انتظار ارسال نیست.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>شماره سفارش</th>
                  <th>گیرنده</th>
                  <th>مبلغ سفارش</th>
                  <th>پرداخت</th>
                  <th>تاریخ ثبت</th>
                  <th>عملیات</th>
                </tr>
              </thead>

              <tbody>
                {data?.awaiting_shipment_orders.map((order) => (
                  <tr key={order.id}>
                    <td dir="ltr" style={{ fontWeight: 700 }}>
                      {order.order_number}
                    </td>
                    <td>{order.recipient_name ?? "—"}</td>
                    <td>{formatAdminPrice(order.total ?? 0)}</td>
                    <td>
                      <span
                        className={`admin-badge ${
                          order.payment_status === "paid"
                            ? "admin-badge-green"
                            : "admin-badge-amber"
                        }`}
                      >
                        {order.payment_status === "paid"
                          ? "پرداخت‌شده"
                          : "پرداخت‌نشده"}
                      </span>
                    </td>
                    <td>{formatAdminDate(order.created_at, true)}</td>
                    <td>
                      <button
                        type="button"
                        className="admin-btn admin-btn-primary admin-btn-sm"
                        onClick={() => onRegisterOrder(order)}
                      >
                        ثبت مرسوله
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2 className="admin-card-title">آخرین مرسوله‌ها</h2>
            <p className="admin-card-desc">
              جدیدترین مرسوله‌های ثبت‌شده به‌همراه وضعیت، کد رهگیری و هزینه.
            </p>
          </div>
        </div>

        {loading ? (
          <p className="admin-empty">در حال دریافت مرسوله‌ها...</p>
        ) : (data?.recent_shipments.length ?? 0) === 0 ? (
          <p className="admin-empty">هنوز مرسوله‌ای ثبت نشده است.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>مرسوله</th>
                  <th>سفارش</th>
                  <th>گیرنده</th>
                  <th>روش ارسال</th>
                  <th>کد رهگیری</th>
                  <th>هزینه</th>
                  <th>وضعیت</th>
                  <th />
                </tr>
              </thead>

              <tbody>
                {data?.recent_shipments.map((shipment) => {
                  const meta = statusOf(data?.statuses, shipment.status);

                  return (
                    <tr key={shipment.id}>
                      <td dir="ltr" style={{ fontWeight: 700 }}>
                        {shipment.shipment_number}
                      </td>
                      <td dir="ltr">{shipment.order_number ?? "—"}</td>
                      <td>{shipment.recipient_name}</td>
                      <td>{shipment.method_name ?? shipment.carrier ?? "—"}</td>
                      <td dir="ltr">{shipment.tracking_code ?? "—"}</td>
                      <td>{formatAdminPrice(shipment.cost)}</td>
                      <td>{statusBadge(meta.label, meta.tone)}</td>
                      <td>
                        <button
                          type="button"
                          className="admin-btn admin-btn-sm"
                          onClick={() => onOpenShipment(shipment.id)}
                        >
                          جزئیات
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
