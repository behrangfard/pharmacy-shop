import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  RefreshCw,
  Tag,
  Trash2,
} from "lucide-react";

import JalaliDatePicker from "../../JalaliDatePicker";
import { adminApi } from "../../../services/api";
import {
  formatAdminDate,
  formatAdminNumber,
  formatAdminPrice,
  getAdminErrorMessage,
} from "../../../utils/adminFormat";

import {
  type Notice,
  type StatusMeta,
  type OrderOption,
  type ShipmentRow,
  type ShipmentDetail,
  type ShippingMethodRow,
  type PrintJob,
  statusBadge,
  statusOf,
  NoticeBox,
} from "./shippingShared";
import { CreateShipmentForm } from "./CreateShipmentForm";
import { ShipmentDetailPanel } from "./ShipmentDetailPanel";
import { PrintArea } from "./PrintArea";

/* ------------------------------------------------------------------ */
/* ۲) مدیریت مرسوله‌ها                                                 */
/* ------------------------------------------------------------------ */

export function ShipmentsTab({
  refreshToken,
  presetOrder,
  onConsumedPreset,
  onChanged,
  statusPreset,
  openShipmentId,
  onConsumedNav,
}: {
  refreshToken: number;
  presetOrder: OrderOption | null;
  onConsumedPreset: () => void;
  onChanged: () => void;
  statusPreset: string | null;
  openShipmentId: number | null;
  onConsumedNav: () => void;
}) {
  const [rows, setRows] = useState<ShipmentRow[]>([]);
  const [statuses, setStatuses] = useState<StatusMeta[]>([]);
  const [methods, setMethods] = useState<ShippingMethodRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [fromFilter, setFromFilter] = useState("");
  const [toFilter, setToFilter] = useState("");

  const [selected, setSelected] = useState<number[]>([]);
  const [detail, setDetail] = useState<ShipmentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [preset, setPreset] = useState<OrderOption | null>(null);
  const [printJob, setPrintJob] = useState<PrintJob | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 400);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!presetOrder) return;

    setPreset(presetOrder);
    setShowCreate(true);
    onConsumedPreset();
  }, [presetOrder, onConsumedPreset]);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const params: Record<string, string> = {};

      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (methodFilter) params.method_id = methodFilter;
      if (fromFilter) params.from = fromFilter;
      if (toFilter) params.to = toFilter;

      const [listResponse, methodsResponse] = await Promise.all([
        adminApi.get("/admin/shipping/shipments", { params }),
        adminApi.get("/admin/shipping/methods"),
      ]);

      setRows(Array.isArray(listResponse.data?.data) ? listResponse.data.data : []);
      setStatuses(listResponse.data?.meta?.statuses ?? []);
      setMethods(
        Array.isArray(methodsResponse.data?.data) ? methodsResponse.data.data : [],
      );
      setNotice(null);
    } catch (error) {
      setNotice({ type: "error", text: getAdminErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, methodFilter, fromFilter, toFilter, refreshToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDetail = useCallback(async (id: number) => {
    setDetailLoading(true);

    try {
      const response = await adminApi.get(`/admin/shipping/shipments/${id}`);
      setDetail((response.data?.data as ShipmentDetail) ?? null);
    } catch (error) {
      setNotice({ type: "error", text: getAdminErrorMessage(error) });
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!statusPreset && !openShipmentId) return;

    if (statusPreset) setStatusFilter(statusPreset);
    if (openShipmentId) void openDetail(openShipmentId);

    onConsumedNav();
  }, [statusPreset, openShipmentId, onConsumedNav, openDetail]);

  async function removeShipment(shipment: ShipmentRow) {
    const confirmed = window.confirm(
      `مرسولهٔ ${shipment.shipment_number} حذف شود؟ این کار قابل بازگشت نیست.`,
    );

    if (!confirmed) return;

    try {
      const response = await adminApi.delete(
        `/admin/shipping/shipments/${shipment.id}`,
      );

      setNotice({
        type: "success",
        text: response.data?.message ?? "مرسوله حذف شد.",
      });

      if (detail?.id === shipment.id) setDetail(null);

      setSelected((current) => current.filter((item) => item !== shipment.id));
      await load();
      onChanged();
    } catch (error) {
      setNotice({ type: "error", text: getAdminErrorMessage(error) });
    }
  }

  function toggleSelected(id: number) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  const selectedShipments = useMemo(
    () => rows.filter((row) => selected.includes(row.id)),
    [rows, selected],
  );

  function handleCreated(next: ShipmentDetail, message: string) {
    setNotice({ type: "success", text: message });
    setShowCreate(false);
    setPreset(null);
    setDetail(next);
    void load();
    onChanged();
  }
  return (
    <div>
      <NoticeBox notice={notice} />

      <div className="admin-toolbar">
        <input
          className="admin-input"
          style={{ maxWidth: 260 }}
          placeholder="جست‌وجو: مرسوله، سفارش، گیرنده، کد رهگیری"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          aria-label="جست‌وجوی مرسوله"
        />

        <select
          className="admin-select"
          style={{ maxWidth: 180 }}
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="فیلتر وضعیت"
        >
          <option value="">همهٔ وضعیت‌ها</option>
          <option value="open">مرسوله‌های باز</option>
          <option value="delayed">دارای تأخیر</option>
          {statuses.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>

        <select
          className="admin-select"
          style={{ maxWidth: 180 }}
          value={methodFilter}
          onChange={(event) => setMethodFilter(event.target.value)}
          aria-label="فیلتر روش ارسال"
        >
          <option value="">همهٔ روش‌ها</option>
          {methods.map((method) => (
            <option key={method.id} value={method.id}>
              {method.name}
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

        <button
          type="button"
          className="admin-btn admin-btn-sm"
          onClick={() => setPrintJob({ kind: "labels", shipments: selectedShipments })}
          disabled={selectedShipments.length === 0}
        >
          <Tag size={14} /> برچسب ({formatAdminNumber(selected.length)})
        </button>

        <button
          type="button"
          className="admin-btn admin-btn-primary admin-btn-sm"
          onClick={() => {
            setPreset(null);
            setShowCreate((current) => !current);
          }}
        >
          {showCreate ? "بستن فرم" : "ثبت مرسولهٔ جدید"}
        </button>
      </div>

      {showCreate && (
        <CreateShipmentForm
          methods={methods}
          statuses={statuses}
          preset={preset}
          onCancel={() => {
            setShowCreate(false);
            setPreset(null);
          }}
          onCreated={handleCreated}
        />
      )}

      {detailLoading && <p className="admin-empty">در حال دریافت جزئیات مرسوله...</p>}

      {detail && !detailLoading && (
        <ShipmentDetailPanel
          key={detail.id}
          shipment={detail}
          statuses={statuses}
          methods={methods}
          onClose={() => setDetail(null)}
          onNotify={setNotice}
          onUpdated={(next, message) => {
            setDetail(next);
            setNotice({ type: "success", text: message });
            void load();
            onChanged();
          }}
          onPrint={setPrintJob}
        />
      )}
      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2 className="admin-card-title">فهرست مرسوله‌ها</h2>
            <p className="admin-card-desc">
              {formatAdminNumber(rows.length)} مرسوله نمایش داده می‌شود. برای
              تغییر وضعیت، ویرایش آدرس یا چاپ برچسب روی «جزئیات» بزنید.
            </p>
          </div>
        </div>

        {loading ? (
          <p className="admin-empty">در حال دریافت مرسوله‌ها...</p>
        ) : rows.length === 0 ? (
          <p className="admin-empty">مرسوله‌ای با این فیلترها پیدا نشد.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input
                      type="checkbox"
                      className="admin-checkbox"
                      aria-label="انتخاب همه"
                      checked={selected.length === rows.length && rows.length > 0}
                      onChange={(event) =>
                        setSelected(
                          event.target.checked ? rows.map((row) => row.id) : [],
                        )
                      }
                    />
                  </th>
                  <th>مرسوله</th>
                  <th>سفارش</th>
                  <th>گیرنده</th>
                  <th>مقصد</th>
                  <th>روش ارسال</th>
                  <th>کد رهگیری</th>
                  <th>هزینه</th>
                  <th>تاریخ ثبت</th>
                  <th>وضعیت</th>
                  <th>عملیات</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((shipment) => {
                  const meta = statusOf(statuses, shipment.status);

                  return (
                    <tr key={shipment.id}>
                      <td>
                        <input
                          type="checkbox"
                          className="admin-checkbox"
                          aria-label={`انتخاب مرسولهٔ ${shipment.shipment_number}`}
                          checked={selected.includes(shipment.id)}
                          onChange={() => toggleSelected(shipment.id)}
                        />
                      </td>
                      <td dir="ltr" style={{ fontWeight: 700 }}>
                        {shipment.shipment_number}
                      </td>
                      <td dir="ltr">{shipment.order_number ?? "—"}</td>
                      <td>
                        <div>{shipment.recipient_name}</div>
                        {shipment.phone && (
                          <div dir="ltr" style={{ fontSize: 12, color: "#6b7280" }}>
                            {shipment.phone}
                          </div>
                        )}
                      </td>
                      <td>
                        {[shipment.province, shipment.city]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </td>
                      <td>{shipment.method_name ?? shipment.carrier ?? "—"}</td>
                      <td dir="ltr">{shipment.tracking_code ?? "—"}</td>
                      <td>{formatAdminPrice(shipment.cost)}</td>
                      <td>{formatAdminDate(shipment.created_at)}</td>
                      <td>
                        {statusBadge(meta.label, meta.tone)}
                        {shipment.is_delayed && (
                          <span
                            className="admin-badge admin-badge-red"
                            style={{ marginInlineStart: 6 }}
                          >
                            تأخیر
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="admin-row-actions">
                          <button
                            type="button"
                            className="admin-btn admin-btn-sm"
                            onClick={() => void openDetail(shipment.id)}
                          >
                            جزئیات
                          </button>
                          <button
                            type="button"
                            className="admin-btn admin-btn-danger admin-btn-sm"
                            onClick={() => void removeShipment(shipment)}
                            title="حذف مرسوله"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {printJob && (
        <PrintArea job={printJob} onClose={() => setPrintJob(null)} />
      )}
    </div>
  );
}
