import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { RefreshCw } from "lucide-react";

import JalaliDatePicker from "../../JalaliDatePicker";
import { adminApi } from "../../../services/api";
import {
  formatAdminDate,
  formatAdminNumber,
  getAdminErrorMessage,
} from "../../../utils/adminFormat";

import {
  type Notice,
  type StatusMeta,
  type HistoryEventRow,
  statusBadge,
  statusOf,
  NoticeBox,
} from "./shippingShared";

/* ------------------------------------------------------------------ */
/* ۶) تاریخچهٔ ارسال‌ها                                                 */
/* ------------------------------------------------------------------ */

export function HistoryTab({ refreshToken }: { refreshToken: number }) {
  const [rows, setRows] = useState<HistoryEventRow[]>([]);
  const [statuses, setStatuses] = useState<StatusMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [fromFilter, setFromFilter] = useState("");
  const [toFilter, setToFilter] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 400);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const params: Record<string, string> = {};

      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (fromFilter) params.from = fromFilter;
      if (toFilter) params.to = toFilter;

      const response = await adminApi.get("/admin/shipping/history", { params });

      setRows(Array.isArray(response.data?.data) ? response.data.data : []);
      setStatuses(response.data?.meta?.statuses ?? []);
      setNotice(null);
    } catch (error) {
      setNotice({ type: "error", text: getAdminErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, fromFilter, toFilter, refreshToken]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <NoticeBox notice={notice} />

      <div className="admin-toolbar">
        <input
          className="admin-input"
          style={{ maxWidth: 260 }}
          placeholder="جست‌وجو: مرسوله، کد رهگیری، گیرنده"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          aria-label="جست‌وجوی تاریخچه"
        />

        <select
          className="admin-select"
          style={{ maxWidth: 180 }}
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="فیلتر وضعیت رویداد"
        >
          <option value="">همهٔ وضعیت‌ها</option>
          {statuses.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>

        <div style={{ width: 168, flex: "0 0 auto" }}>
          <JalaliDatePicker
            value={fromFilter}
            onChange={(value) => setFromFilter(value.slice(0, 10))}
            withTime={false}
            placeholder="از تاریخ (شمسی)"
          />
        </div>

        <div style={{ width: 168, flex: "0 0 auto" }}>
          <JalaliDatePicker
            value={toFilter}
            onChange={(value) => setToFilter(value.slice(0, 10))}
            withTime={false}
            placeholder="تا تاریخ (شمسی)"
          />
        </div>

        <div className="admin-toolbar-spacer" />

        <button
          type="button"
          className="admin-btn admin-btn-sm"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw size={14} /> به‌روزرسانی
        </button>
      </div>

      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2 className="admin-card-title">تاریخچهٔ رویدادهای ارسال</h2>
            <p className="admin-card-desc">
              {formatAdminNumber(rows.length)} رویداد نمایش داده می‌شود؛ هر تغییر
              وضعیت مرسوله به‌صورت خودکار در این فهرست ثبت می‌شود.
            </p>
          </div>
        </div>

        {loading ? (
          <p className="admin-empty">در حال دریافت تاریخچه...</p>
        ) : rows.length === 0 ? (
          <p className="admin-empty">رویدادی با این فیلترها پیدا نشد.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>زمان</th>
                  <th>مرسوله</th>
                  <th>سفارش</th>
                  <th>گیرنده</th>
                  <th>کد رهگیری</th>
                  <th>وضعیت رویداد</th>
                  <th>یادداشت</th>
                  <th>ثبت‌کننده</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((event) => {
                  const meta = statusOf(statuses, event.status);

                  return (
                    <tr key={event.id}>
                      <td>{formatAdminDate(event.happened_at, true)}</td>
                      <td dir="ltr">{event.shipment?.shipment_number ?? "—"}</td>
                      <td dir="ltr">{event.shipment?.order_number ?? "—"}</td>
                      <td>{event.shipment?.recipient_name ?? "—"}</td>
                      <td dir="ltr">{event.shipment?.tracking_code ?? "—"}</td>
                      <td>
                        {statusBadge(event.status_label ?? meta.label, meta.tone)}
                      </td>
                      <td>{event.note ?? "—"}</td>
                      <td>{event.creator ?? "سیستم"}</td>
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

/* ------------------------------------------------------------------ */
/* صفحهٔ اصلی مدیریت ارسال                                             */
/* ------------------------------------------------------------------ */

