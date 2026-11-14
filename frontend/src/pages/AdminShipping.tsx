import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  Boxes,
  Calculator,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  History,
  MapPin,
  Package,
  PackageCheck,
  Plus,
  Printer,
  RefreshCw,
  Ruler,
  Save,
  Send,
  Tag,
  Trash2,
  Truck,
  Undo2,
  X,
} from "lucide-react";

import JalaliDatePicker from "../components/JalaliDatePicker";
import { useStoreSettings } from "../hooks/useStoreSettings";
import { adminApi } from "../services/api";
import {
  formatAdminDate,
  formatAdminNumber,
  formatAdminPrice,
  getAdminErrorMessage,
} from "../utils/adminFormat";

/* ------------------------------------------------------------------ */
/* انواع داده                                                          */
/* ------------------------------------------------------------------ */

type Tone = "gray" | "amber" | "blue" | "green" | "red";

type TabId =
  | "dashboard"
  | "shipments"
  | "methods"
  | "zones"
  | "rules"
  | "page"
  | "history";

type Notice = { type: "success" | "error"; text: string };

interface StatusMeta {
  value: string;
  label: string;
  tone: Tone;
  count?: number;
}

interface OrderOption {
  id: number;
  order_number: string;
  recipient_name: string | null;
  phone?: string | null;
  total?: string | number;
  subtotal?: string | number;
  status?: string;
  payment_status?: string;
  created_at?: string;
}

interface OrderItem {
  id: number;
  product_name: string;
  sku: string | null;
  quantity: number;
  unit_price: string | number;
  total_price: string | number;
}

interface OrderSummary {
  id: number;
  order_number: string;
  total?: string | number;
  subtotal?: string | number;
  status?: string;
  payment_status?: string;
  created_at?: string;
  items?: OrderItem[];
}

interface ShipmentEventRow {
  id: number;
  status: string;
  status_label: string;
  note: string | null;
  happened_at: string | null;
  creator: string | null;
}

interface ShipmentRow {
  id: number;
  shipment_number: string;
  order_id: number;
  order_number: string | null;
  shipping_method_id: number | null;
  method_name: string | null;
  status: string;
  carrier: string | null;
  recipient_name: string;
  phone: string | null;
  province: string | null;
  city: string | null;
  address: string;
  postal_code: string | null;
  tracking_code: string | null;
  cost: string | number;
  weight_grams: number | null;
  volumetric_weight_grams: number | null;
  effective_weight_grams?: number | null;
  package_count: number;
  notes: string | null;
  delay_reason: string | null;
  return_reason: string | null;
  is_delayed: boolean;
  shipped_at: string | null;
  delivered_at: string | null;
  expected_delivery_at: string | null;
  created_at: string;
  order?: OrderSummary | null;
  events?: ShipmentEventRow[];
}

type ShipmentDetail = ShipmentRow;

interface ShippingMethodRow {
  id: number;
  name: string;
  code: string;
  carrier: string | null;
  description: string | null;
  base_cost: string | number;
  cost_per_kg: string | number;
  min_weight_grams: number | null;
  max_weight_grams: number | null;
  min_days: number | null;
  max_days: number | null;
  free_over_amount: string | number | null;
  is_express: boolean;
  is_active: boolean;
  sort_order: number;
  delivery_estimate?: string | null;
  shipments_count?: number;
}
interface ShippingZoneRow {
  id: number;
  province: string;
  city: string | null;
  area: string | null;
  cost: string | number | null;
  is_express_available: boolean;
  is_active: boolean;
  note: string | null;
}

interface ShippingRuleRow {
  id: number;
  title: string;
  type: string;
  type_label: string;
  shipping_method_id: number | null;
  province: string | null;
  city: string | null;
  threshold_amount: string | number | null;
  amount: string | number | null;
  cost_per_kg: string | number | null;
  priority: number;
  is_active: boolean;
  note: string | null;
  method?: { id: number; name: string } | null;
}

interface HistoryEventRow {
  id: number;
  status: string;
  status_label: string;
  note: string | null;
  happened_at: string | null;
  creator: string | null;
  shipment: {
    id: number;
    shipment_number: string;
    tracking_code: string | null;
    recipient_name: string;
    status: string;
    order_number: string | null;
  } | null;
}

interface OverviewData {
  stats: {
    awaiting_packaging: number;
    packaging: number;
    ready_to_ship: number;
    handed_to_carrier: number;
    in_transit: number;
    shipped: number;
    delivered: number;
    delivery_failed: number;
    returned: number;
    delayed: number;
    awaiting_shipment_orders: number;
    total: number;
  };
  costs: { total: number; last_30_days: number; average: number };
  methods: { total: number; active: number };
  zones: { total: number; active: number };
  rules: { total: number; active: number };
  statuses: StatusMeta[];
  recent_shipments: ShipmentRow[];
  awaiting_shipment_orders: OrderOption[];
  carriers: string[];
}

interface QuoteResult {
  cost: number;
  is_free: boolean;
  reason: string;
  weight_grams: number;
  weight_kg: number;
  zone: { id: number; label: string; cost: number | null } | null;
  method: { id: number; name: string; estimate: string | null } | null;
}

type PrintJob =
  | { kind: "labels"; shipments: ShipmentRow[] }
  | { kind: "packing"; shipment: ShipmentDetail }
  | { kind: "invoice"; shipment: ShipmentDetail };

/* ------------------------------------------------------------------ */
/* ثابت‌ها و ابزارهای کمکی                                             */
/* ------------------------------------------------------------------ */

const TONE_BADGE: Record<Tone, string> = {
  gray: "admin-badge-gray",
  amber: "admin-badge-amber",
  blue: "admin-badge-blue",
  green: "admin-badge-green",
  red: "admin-badge-red",
};

const TABS: { id: TabId; label: string; icon: typeof Truck }[] = [
  { id: "dashboard", label: "داشبورد ارسال", icon: Boxes },
  { id: "shipments", label: "مرسوله‌ها", icon: Package },
  { id: "methods", label: "روش‌های ارسال", icon: Truck },
  { id: "zones", label: "مناطق ارسال", icon: MapPin },
  { id: "rules", label: "تعرفه و هزینه", icon: Ruler },
  { id: "page", label: "صفحهٔ ارسال", icon: FileText },
  { id: "history", label: "تاریخچه", icon: History },
];

const RULE_TYPES: { value: string; label: string }[] = [
  { value: "fixed", label: "هزینهٔ ثابت" },
  { value: "free_over_amount", label: "ارسال رایگان بالای مبلغ" },
  { value: "weight_based", label: "هزینه بر اساس وزن" },
  { value: "zone_based", label: "هزینهٔ منطقه‌ای" },
];

const DELIVERY_FAILED = "delivery_failed";
const RETURNED_STATUS = "returned";

function toNumber(value: number | string | null | undefined): number {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function gramsLabel(grams: number | null | undefined): string {
  if (!grams || grams <= 0) return "—";
  if (grams < 1000) return `${formatAdminNumber(grams)} گرم`;

  return `${formatAdminNumber(Number((grams / 1000).toFixed(2)))} کیلوگرم`;
}

function statusBadge(label: string, tone: string) {
  const badge = TONE_BADGE[(tone as Tone) ?? "gray"] ?? TONE_BADGE.gray;

  return <span className={`admin-badge ${badge}`}>{label}</span>;
}

function statusOf(statuses: StatusMeta[] | undefined, status: string) {
  return (
    statuses?.find((item) => item.value === status) ?? {
      value: status,
      label: status,
      tone: "gray" as Tone,
    }
  );
}

function NoticeBox({ notice }: { notice: Notice | null }) {
  if (!notice || !notice.text) return null;

  return (
    <div
      className={`admin-alert ${
        notice.type === "error" ? "admin-alert-error" : "admin-alert-success"
      }`}
      role={notice.type === "error" ? "alert" : "status"}
    >
      <span aria-hidden="true">{notice.type === "error" ? "!" : "✓"}</span>
      <span>{notice.text}</span>
    </div>
  );
}

function Field({
  id,
  label,
  full,
  children,
}: {
  id: string;
  label: string;
  full?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`admin-field${full ? " admin-full" : ""}`}>
      <label className="admin-label" htmlFor={id}>
        {label}
      </label>
      {children}
    </div>
  );
}
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

function DashboardTab({
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
/* ------------------------------------------------------------------ */
/* ۲) مدیریت مرسوله‌ها                                                 */
/* ------------------------------------------------------------------ */

function ShipmentsTab({
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
function CreateShipmentForm({
  methods,
  statuses,
  preset,
  onCancel,
  onCreated,
}: {
  methods: ShippingMethodRow[];
  statuses: StatusMeta[];
  preset: OrderOption | null;
  onCancel: () => void;
  onCreated: (shipment: ShipmentDetail, message: string) => void;
}) {
  const [orderSearch, setOrderSearch] = useState("");
  const [orderResults, setOrderResults] = useState<OrderOption[]>([]);
  const [searchingOrders, setSearchingOrders] = useState(false);

  const [orderId, setOrderId] = useState<string>(preset ? String(preset.id) : "");
  const [recipient, setRecipient] = useState(preset?.recipient_name ?? "");
  const [phone, setPhone] = useState(preset?.phone ?? "");
  const [subtotal, setSubtotal] = useState(toNumber(preset?.subtotal ?? preset?.total));

  const [status, setStatus] = useState("awaiting_packaging");
  const [methodId, setMethodId] = useState("");
  const [carrier, setCarrier] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const [cost, setCost] = useState("");
  const [weight, setWeight] = useState("");
  const [volumetric, setVolumetric] = useState("");
  const [packages, setPackages] = useState("1");
  const [expectedDelivery, setExpectedDelivery] = useState("");
  const [notes, setNotes] = useState("");

  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const searchOrders = useCallback(async (term: string) => {
    if (term.trim() === "") {
      setOrderResults([]);
      return;
    }

    setSearchingOrders(true);

    try {
      const response = await adminApi.get("/admin/orders", {
        params: { search: term.trim(), per_page: 8 },
      });

      const payload = response.data?.data;
      const list = Array.isArray(payload?.data) ? payload.data : [];

      setOrderResults(list as OrderOption[]);
    } catch {
      setOrderResults([]);
    } finally {
      setSearchingOrders(false);
    }
  }, []);

  async function pickOrder(order: OrderOption) {
    setOrderId(String(order.id));
    setRecipient(order.recipient_name ?? "");
    setPhone(order.phone ?? "");
    setSubtotal(toNumber(order.subtotal ?? order.total));
    setOrderResults([]);
    setOrderSearch(order.order_number);

    try {
      const response = await adminApi.get(
        `/admin/orders/${encodeURIComponent(order.order_number)}`,
      );
      const full = response.data?.data as
        | (OrderOption & {
            address?: string | null;
            postal_code?: string | null;
            province?: string | null;
            city?: string | null;
          })
        | undefined;

      if (full) {
        setRecipient((current) => current || (full.recipient_name ?? ""));
        setPhone((current) => current || (full.phone ?? ""));
        setAddress((current) => current || (full.address ?? ""));
        setPostalCode((current) => current || (full.postal_code ?? ""));
        setProvince((current) => current || (full.province ?? ""));
        setCity((current) => current || (full.city ?? ""));
      }
    } catch {
      /* اطلاعات تکمیلی در دسترس نبود؛ مقادیر دستی استفاده می‌شود. */
    }
  }

  async function calculateQuote() {
    setQuoting(true);

    try {
      const response = await adminApi.post("/admin/shipping/quote", {
        shipping_method_id: methodId ? Number(methodId) : null,
        province: province.trim() || null,
        city: city.trim() || null,
        weight_grams: weight ? Number(weight) : 0,
        subtotal: subtotal > 0 ? subtotal : 0,
      });

      const result = response.data?.data as QuoteResult;

      setQuote(result);
      setCost(String(toNumber(result.cost)));
    } catch (requestError) {
      setError(getAdminErrorMessage(requestError));
    } finally {
      setQuoting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) return;

    if (!orderId) {
      setError("ابتدا سفارش مرسوله را انتخاب کنید.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await adminApi.post("/admin/shipping/shipments", {
        order_id: Number(orderId),
        shipping_method_id: methodId ? Number(methodId) : null,
        status,
        carrier: carrier.trim() || null,
        recipient_name: recipient.trim() || null,
        phone: phone.trim() || null,
        province: province.trim() || null,
        city: city.trim() || null,
        address: address.trim() || null,
        postal_code: postalCode.trim() || null,
        tracking_code: trackingCode.trim() || null,
        cost: cost === "" ? null : Number(cost),
        weight_grams: weight === "" ? null : Number(weight),
        volumetric_weight_grams: volumetric === "" ? null : Number(volumetric),
        package_count: packages === "" ? 1 : Number(packages),
        notes: notes.trim() || null,
        expected_delivery_at: expectedDelivery || null,
      });

      onCreated(
        response.data?.data as ShipmentDetail,
        response.data?.message ?? "مرسوله ثبت شد.",
      );
    } catch (requestError) {
      setError(getAdminErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="admin-card">
      <div className="admin-card-head">
        <div>
          <h2 className="admin-card-title">ثبت مرسولهٔ جدید</h2>
          <p className="admin-card-desc">
            سفارش را جست‌وجو کنید؛ اطلاعات گیرنده از سفارش پر می‌شود و
            می‌توانید هزینه را با «محاسبهٔ هزینه» از تعرفه‌ها بگیرید.
          </p>
        </div>

        <button type="button" className="admin-btn admin-btn-sm" onClick={onCancel}>
          انصراف
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="admin-form-grid" style={{ marginBottom: 16 }}>
          <Field id="shipment-order" label="سفارش (جست‌وجو با شماره سفارش یا نام گیرنده)" full>
            <div className="admin-toolbar" style={{ marginBottom: 0 }}>
              <input
                id="shipment-order"
                className="admin-input"
                style={{ maxWidth: 320 }}
                value={orderSearch}
                placeholder="مثلاً ORD-20260101-0001"
                onChange={(event) => setOrderSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void searchOrders(orderSearch);
                  }
                }}
                dir="ltr"
              />
              <button
                type="button"
                className="admin-btn admin-btn-sm"
                onClick={() => void searchOrders(orderSearch)}
                disabled={searchingOrders}
              >
                {searchingOrders ? "در حال جست‌وجو..." : "جست‌وجوی سفارش"}
              </button>
              {orderId && (
                <span className="admin-badge admin-badge-green">
                  سفارش انتخاب شد (#{orderId})
                </span>
              )}
            </div>

            {orderResults.length > 0 && (
              <div className="admin-table-wrap" style={{ marginTop: 10 }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>شماره سفارش</th>
                      <th>گیرنده</th>
                      <th>مبلغ</th>
                      <th>وضعیت</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {orderResults.map((order) => (
                      <tr key={order.id}>
                        <td dir="ltr">{order.order_number}</td>
                        <td>{order.recipient_name ?? "—"}</td>
                        <td>{formatAdminPrice(order.total ?? 0)}</td>
                        <td>
                          <span className="admin-badge admin-badge-gray">
                            {order.status ?? "—"}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="admin-btn admin-btn-primary admin-btn-sm"
                            onClick={() => void pickOrder(order)}
                          >
                            انتخاب
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Field>
        </div>

        <div className="admin-form-grid admin-form-grid-3">
          <Field id="shipment-status" label="وضعیت اولیه">
            <select
              id="shipment-status"
              className="admin-select"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              {statuses.length === 0 ? (
                <option value="awaiting_packaging">آماده بسته‌بندی</option>
              ) : (
                statuses.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))
              )}
            </select>
          </Field>

          <Field id="shipment-method" label="روش ارسال">
            <select
              id="shipment-method"
              className="admin-select"
              value={methodId}
              onChange={(event) => setMethodId(event.target.value)}
            >
              <option value="">بدون روش مشخص</option>
              {methods.map((method) => (
                <option key={method.id} value={method.id}>
                  {method.name}
                  {method.is_active ? "" : " (غیرفعال)"}
                </option>
              ))}
            </select>
          </Field>

          <Field id="shipment-carrier" label="شرکت حمل‌ونقل">
            <input
              id="shipment-carrier"
              className="admin-input"
              value={carrier}
              onChange={(event) => setCarrier(event.target.value)}
              placeholder="مثلاً پست پیشتاز"
              maxLength={100}
            />
          </Field>

          <Field id="shipment-recipient" label="نام گیرنده">
            <input
              id="shipment-recipient"
              className="admin-input"
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
              maxLength={150}
            />
          </Field>

          <Field id="shipment-phone" label="شمارهٔ تماس گیرنده">
            <input
              id="shipment-phone"
              className="admin-input"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              dir="ltr"
              maxLength={30}
              placeholder="09xxxxxxxxx"
            />
          </Field>

          <Field id="shipment-province" label="استان">
            <input
              id="shipment-province"
              className="admin-input"
              value={province}
              onChange={(event) => setProvince(event.target.value)}
              maxLength={100}
            />
          </Field>

          <Field id="shipment-city" label="شهر">
            <input
              id="shipment-city"
              className="admin-input"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              maxLength={100}
            />
          </Field>

          <Field id="shipment-postal" label="کد پستی">
            <input
              id="shipment-postal"
              className="admin-input"
              value={postalCode}
              onChange={(event) => setPostalCode(event.target.value)}
              dir="ltr"
              maxLength={20}
            />
          </Field>

          <Field id="shipment-tracking" label="کد رهگیری">
            <input
              id="shipment-tracking"
              className="admin-input"
              value={trackingCode}
              onChange={(event) => setTrackingCode(event.target.value)}
              dir="ltr"
              maxLength={80}
            />
          </Field>

          <Field id="shipment-address" label="نشانی کامل" full>
            <textarea
              id="shipment-address"
              className="admin-textarea"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              rows={2}
              maxLength={2000}
            />
          </Field>

          <Field id="shipment-weight" label="وزن (گرم)">
            <input
              id="shipment-weight"
              type="number"
              min={0}
              className="admin-input"
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
              dir="ltr"
            />
          </Field>

          <Field id="shipment-volumetric" label="وزن حجمی (گرم)">
            <input
              id="shipment-volumetric"
              type="number"
              min={0}
              className="admin-input"
              value={volumetric}
              onChange={(event) => setVolumetric(event.target.value)}
              dir="ltr"
            />
          </Field>

          <Field id="shipment-packages" label="تعداد بسته">
            <input
              id="shipment-packages"
              type="number"
              min={1}
              className="admin-input"
              value={packages}
              onChange={(event) => setPackages(event.target.value)}
              dir="ltr"
            />
          </Field>

          <Field id="shipment-expected" label="تاریخ تحویل مورد انتظار (شمسی)">
            <JalaliDatePicker
              id="shipment-expected"
              value={expectedDelivery}
              onChange={(value) => setExpectedDelivery(value.slice(0, 10))}
              withTime={false}
              placeholder="انتخاب تاریخ تحویل"
            />
          </Field>

          <Field id="shipment-cost" label="هزینهٔ ارسال (تومان)">
            <div className="admin-toolbar" style={{ marginBottom: 0 }}>
              <input
                id="shipment-cost"
                type="number"
                min={0}
                className="admin-input"
                value={cost}
                onChange={(event) => setCost(event.target.value)}
                dir="ltr"
                placeholder="خالی = محاسبهٔ خودکار"
              />
              <button
                type="button"
                className="admin-btn admin-btn-sm"
                onClick={() => void calculateQuote()}
                disabled={quoting}
              >
                <Calculator size={14} />
                {quoting ? "..." : "محاسبه"}
              </button>
            </div>
          </Field>

          <Field id="shipment-notes" label="یادداشت داخلی" full>
            <textarea
              id="shipment-notes"
              className="admin-textarea"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={2}
              maxLength={2000}
            />
          </Field>
        </div>

        {quote && (
          <div className="admin-notice admin-notice-success" style={{ marginTop: 12 }}>
            <strong>نتیجهٔ استعلام تعرفه:</strong>{" "}
            {quote.is_free ? "ارسال رایگان" : formatAdminPrice(quote.cost)}
            {quote.zone ? ` · منطقه: ${quote.zone.label}` : ""}
            {quote.method ? ` · روش: ${quote.method.name}` : ""}
            {quote.weight_grams ? ` · وزن مبنا: ${gramsLabel(quote.weight_grams)}` : ""}
            {quote.reason ? ` · ${quote.reason}` : ""}
          </div>
        )}

        {error && (
          <div className="admin-notice admin-notice-error" style={{ marginTop: 12 }}>
            {error}
          </div>
        )}

        <div className="admin-toolbar" style={{ marginTop: 16, marginBottom: 0 }}>
          <div className="admin-toolbar-spacer" />
          <button type="button" className="admin-btn" onClick={onCancel} disabled={saving}>
            انصراف
          </button>
          <button
            type="submit"
            className="admin-btn admin-btn-primary"
            disabled={saving || !orderId}
          >
            <Save size={15} /> {saving ? "در حال ثبت..." : "ثبت مرسوله"}
          </button>
        </div>
      </form>
    </section>
  );
}
/* ------------------------------------------------------------------ */
/* پنل جزئیات مرسوله                                                   */
/* ------------------------------------------------------------------ */

function ShipmentDetailPanel({
  shipment,
  statuses,
  methods,
  onClose,
  onNotify,
  onUpdated,
  onPrint,
}: {
  shipment: ShipmentDetail;
  statuses: StatusMeta[];
  methods: ShippingMethodRow[];
  onClose: () => void;
  onNotify: (notice: Notice) => void;
  onUpdated: (shipment: ShipmentDetail, message: string) => void;
  onPrint: (job: PrintJob) => void;
}) {
  const [statusForm, setStatusForm] = useState({
    status: shipment.status,
    tracking_code: shipment.tracking_code ?? "",
    note: "",
    delay_reason: shipment.delay_reason ?? "",
    return_reason: shipment.return_reason ?? "",
  });
  const [savingStatus, setSavingStatus] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [channel, setChannel] = useState("sms");
  const [editing, setEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    recipient_name: shipment.recipient_name,
    phone: shipment.phone ?? "",
    province: shipment.province ?? "",
    city: shipment.city ?? "",
    address: shipment.address,
    postal_code: shipment.postal_code ?? "",
    shipping_method_id: shipment.shipping_method_id
      ? String(shipment.shipping_method_id)
      : "",
    carrier: shipment.carrier ?? "",
    tracking_code: shipment.tracking_code ?? "",
    cost: String(toNumber(shipment.cost)),
    weight_grams: shipment.weight_grams ? String(shipment.weight_grams) : "",
    volumetric_weight_grams: shipment.volumetric_weight_grams
      ? String(shipment.volumetric_weight_grams)
      : "",
    package_count: String(shipment.package_count ?? 1),
    expected_delivery_at: shipment.expected_delivery_at
      ? shipment.expected_delivery_at.slice(0, 10)
      : "",
    notes: shipment.notes ?? "",
  });
  const [error, setError] = useState("");

  const meta = statusOf(statuses, shipment.status);

  async function updateStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (savingStatus) return;

    setSavingStatus(true);
    setError("");

    try {
      const response = await adminApi.patch(
        `/admin/shipping/shipments/${shipment.id}/status`,
        {
          status: statusForm.status,
          tracking_code: statusForm.tracking_code.trim() || null,
          note: statusForm.note.trim() || null,
          delay_reason: statusForm.delay_reason.trim() || null,
          return_reason: statusForm.return_reason.trim() || null,
        },
      );

      onUpdated(
        response.data?.data as ShipmentDetail,
        response.data?.message ?? "وضعیت مرسوله به‌روزرسانی شد.",
      );
      setStatusForm((current) => ({ ...current, note: "" }));
    } catch (requestError) {
      setError(getAdminErrorMessage(requestError));
    } finally {
      setSavingStatus(false);
    }
  }

  async function notifyCustomer() {
    if (notifying) return;

    setNotifying(true);

    try {
      const response = await adminApi.post(
        `/admin/shipping/shipments/${shipment.id}/notify`,
        { channel },
      );

      onNotify({
        type: "success",
        text: response.data?.message ?? "اطلاع‌رسانی برای مشتری ثبت شد.",
      });
    } catch (requestError) {
      onNotify({ type: "error", text: getAdminErrorMessage(requestError) });
    } finally {
      setNotifying(false);
    }
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (savingEdit) return;

    setSavingEdit(true);
    setError("");

    try {
      const response = await adminApi.put(
        `/admin/shipping/shipments/${shipment.id}`,
        {
          recipient_name: editForm.recipient_name.trim(),
          phone: editForm.phone.trim() || null,
          province: editForm.province.trim() || null,
          city: editForm.city.trim() || null,
          address: editForm.address.trim(),
          postal_code: editForm.postal_code.trim() || null,
          shipping_method_id: editForm.shipping_method_id
            ? Number(editForm.shipping_method_id)
            : null,
          carrier: editForm.carrier.trim() || null,
          tracking_code: editForm.tracking_code.trim() || null,
          cost: editForm.cost === "" ? 0 : Number(editForm.cost),
          weight_grams: editForm.weight_grams === "" ? null : Number(editForm.weight_grams),
          volumetric_weight_grams:
            editForm.volumetric_weight_grams === ""
              ? null
              : Number(editForm.volumetric_weight_grams),
          package_count:
            editForm.package_count === "" ? 1 : Number(editForm.package_count),
          expected_delivery_at: editForm.expected_delivery_at || null,
          notes: editForm.notes.trim() || null,
        },
      );

      onUpdated(
        response.data?.data as ShipmentDetail,
        response.data?.message ?? "اطلاعات مرسوله ذخیره شد.",
      );
      setEditing(false);
    } catch (requestError) {
      setError(getAdminErrorMessage(requestError));
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <section className="admin-card" style={{ borderTop: "3px solid #2563eb" }}>
      <div className="admin-card-head">
        <div>
          <h2 className="admin-card-title" dir="ltr">
            {shipment.shipment_number}
          </h2>
          <p className="admin-card-desc">
            {statusBadge(meta.label, meta.tone)}
            {shipment.is_delayed && (
              <span className="admin-badge admin-badge-red" style={{ marginInlineStart: 6 }}>
                تأخیر
              </span>
            )}
            {shipment.order_number && (
              <span style={{ marginInlineStart: 8 }} dir="ltr">
                سفارش {shipment.order_number}
              </span>
            )}
          </p>
        </div>

        <div className="admin-row-actions">
          <button
            type="button"
            className="admin-btn admin-btn-sm"
            onClick={() => onPrint({ kind: "labels", shipments: [shipment] })}
          >
            <Tag size={14} /> برچسب
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-sm"
            onClick={() => onPrint({ kind: "packing", shipment })}
          >
            <Package size={14} /> برگهٔ بسته‌بندی
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-sm"
            onClick={() => onPrint({ kind: "invoice", shipment })}
          >
            <ClipboardList size={14} /> فاکتور
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-sm"
            onClick={() => setEditing((current) => !current)}
          >
            {editing ? "بستن ویرایش" : "ویرایش اطلاعات"}
          </button>
          <button type="button" className="admin-btn admin-btn-sm" onClick={onClose}>
            <X size={14} /> بستن
          </button>
        </div>
      </div>

      <div className="admin-form-grid admin-form-grid-3">
        <div>
          <div className="admin-label">گیرنده</div>
          <div>{shipment.recipient_name}</div>
          {shipment.phone && (
            <div dir="ltr" style={{ color: "#6b7280", fontSize: 13 }}>
              {shipment.phone}
            </div>
          )}
        </div>

        <div>
          <div className="admin-label">مقصد</div>
          <div>
            {[shipment.province, shipment.city].filter(Boolean).join(" · ") || "—"}
          </div>
          <div style={{ color: "#6b7280", fontSize: 13 }}>{shipment.address}</div>
          {shipment.postal_code && (
            <div dir="ltr" style={{ color: "#6b7280", fontSize: 13 }}>
              کد پستی: {shipment.postal_code}
            </div>
          )}
        </div>

        <div>
          <div className="admin-label">روش ارسال و رهگیری</div>
          <div>{shipment.method_name ?? "—"}</div>
          <div style={{ color: "#6b7280", fontSize: 13 }}>
            حامل: {shipment.carrier ?? "—"}
          </div>
          <div dir="ltr" style={{ color: "#6b7280", fontSize: 13 }}>
            {shipment.tracking_code ?? "بدون کد رهگیری"}
          </div>
        </div>

        <div>
          <div className="admin-label">هزینه و وزن</div>
          <div>{formatAdminPrice(shipment.cost)}</div>
          <div style={{ color: "#6b7280", fontSize: 13 }}>
            وزن: {gramsLabel(shipment.weight_grams)} · حجمی:{" "}
            {gramsLabel(shipment.volumetric_weight_grams)} · بسته:{" "}
            {formatAdminNumber(shipment.package_count)}
          </div>
        </div>

        <div>
          <div className="admin-label">زمان‌ها</div>
          <div style={{ fontSize: 13 }}>
            ثبت: {formatAdminDate(shipment.created_at, true)}
          </div>
          <div style={{ fontSize: 13 }}>
            ارسال: {formatAdminDate(shipment.shipped_at, true)}
          </div>
          <div style={{ fontSize: 13 }}>
            تحویل: {formatAdminDate(shipment.delivered_at, true)}
          </div>
          <div style={{ fontSize: 13 }}>
            تحویل مورد انتظار: {formatAdminDate(shipment.expected_delivery_at)}
          </div>
        </div>

        <div>
          <div className="admin-label">اطلاع‌رسانی به مشتری</div>
          <div className="admin-toolbar" style={{ marginBottom: 0 }}>
            <select
              className="admin-select"
              style={{ maxWidth: 130 }}
              value={channel}
              onChange={(event) => setChannel(event.target.value)}
              aria-label="کانال اطلاع‌رسانی"
            >
              <option value="sms">پیامک</option>
              <option value="email">ایمیل</option>
            </select>
            <button
              type="button"
              className="admin-btn admin-btn-sm"
              onClick={() => void notifyCustomer()}
              disabled={notifying}
            >
              <Send size={14} /> {notifying ? "..." : "ارسال"}
            </button>
          </div>
        </div>
      </div>

      {shipment.notes && (
        <p className="admin-card-desc" style={{ marginTop: 12 }}>
          <strong>یادداشت:</strong> {shipment.notes}
        </p>
      )}

      {error && (
        <div className="admin-notice admin-notice-error" style={{ marginTop: 12 }}>
          {error}
        </div>
      )}

      <hr style={{ margin: "18px 0", border: 0, borderTop: "1px solid #e5e7eb" }} />

      <form onSubmit={updateStatus}>
        <h3 className="admin-card-title" style={{ fontSize: 15, marginBottom: 10 }}>
          تغییر وضعیت / ثبت رویداد
        </h3>

        <div className="admin-form-grid admin-form-grid-3">
          <Field id="status-update" label="وضعیت جدید">
            <select
              id="status-update"
              className="admin-select"
              value={statusForm.status}
              onChange={(event) =>
                setStatusForm((current) => ({ ...current, status: event.target.value }))
              }
            >
              {statuses.length === 0 ? (
                <option value={shipment.status}>{shipment.status}</option>
              ) : (
                statuses.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))
              )}
            </select>
          </Field>

          <Field id="status-tracking" label="کد رهگیری">
            <input
              id="status-tracking"
              className="admin-input"
              value={statusForm.tracking_code}
              onChange={(event) =>
                setStatusForm((current) => ({
                  ...current,
                  tracking_code: event.target.value,
                }))
              }
              dir="ltr"
              maxLength={80}
              placeholder="مثلاً 12345678901234567890"
            />
          </Field>

          <Field id="status-note" label="یادداشت رویداد">
            <input
              id="status-note"
              className="admin-input"
              value={statusForm.note}
              onChange={(event) =>
                setStatusForm((current) => ({ ...current, note: event.target.value }))
              }
              maxLength={500}
              placeholder="توضیح کوتاه برای تاریخچه"
            />
          </Field>

          {statusForm.status === DELIVERY_FAILED && (
            <Field id="status-delay" label="دلیل تأخیر / عدم تحویل" full>
              <input
                id="status-delay"
                className="admin-input"
                value={statusForm.delay_reason}
                onChange={(event) =>
                  setStatusForm((current) => ({
                    ...current,
                    delay_reason: event.target.value,
                  }))
                }
                maxLength={255}
                placeholder="مثلاً عدم پاسخگویی گیرنده / آدرس نامعتبر"
                required
              />
            </Field>
          )}

          {statusForm.status === RETURNED_STATUS && (
            <Field id="status-return" label="دلیل برگشت مرسوله" full>
              <input
                id="status-return"
                className="admin-input"
                value={statusForm.return_reason}
                onChange={(event) =>
                  setStatusForm((current) => ({
                    ...current,
                    return_reason: event.target.value,
                  }))
                }
                maxLength={255}
                placeholder="مثلاً مرجوعی توسط گیرنده"
                required
              />
            </Field>
          )}
        </div>

        <div className="admin-toolbar" style={{ marginTop: 12, marginBottom: 0 }}>
          <div className="admin-toolbar-spacer" />
          <button
            type="submit"
            className="admin-btn admin-btn-primary admin-btn-sm"
            disabled={savingStatus}
          >
            <CheckCircle2 size={14} />{" "}
            {savingStatus ? "در حال ذخیره..." : "ثبت وضعیت"}
          </button>
        </div>
      </form>

      {editing && (
        <form onSubmit={saveEdit} style={{ marginTop: 18 }}>
          <h3 className="admin-card-title" style={{ fontSize: 15, marginBottom: 10 }}>
            ویرایش اطلاعات مرسوله
          </h3>

          <div className="admin-form-grid admin-form-grid-3">
            <Field id="edit-recipient" label="نام گیرنده">
              <input
                id="edit-recipient"
                className="admin-input"
                value={editForm.recipient_name}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    recipient_name: event.target.value,
                  }))
                }
                maxLength={150}
                required
              />
            </Field>

            <Field id="edit-phone" label="شمارهٔ تماس">
              <input
                id="edit-phone"
                className="admin-input"
                value={editForm.phone}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, phone: event.target.value }))
                }
                dir="ltr"
                maxLength={30}
              />
            </Field>

            <Field id="edit-province" label="استان">
              <input
                id="edit-province"
                className="admin-input"
                value={editForm.province}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, province: event.target.value }))
                }
                maxLength={100}
              />
            </Field>

            <Field id="edit-city" label="شهر">
              <input
                id="edit-city"
                className="admin-input"
                value={editForm.city}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, city: event.target.value }))
                }
                maxLength={100}
              />
            </Field>

            <Field id="edit-postal" label="کد پستی">
              <input
                id="edit-postal"
                className="admin-input"
                value={editForm.postal_code}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    postal_code: event.target.value,
                  }))
                }
                dir="ltr"
                maxLength={20}
              />
            </Field>

            <Field id="edit-method" label="روش ارسال">
              <select
                id="edit-method"
                className="admin-select"
                value={editForm.shipping_method_id}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    shipping_method_id: event.target.value,
                  }))
                }
              >
                <option value="">بدون روش مشخص</option>
                {methods.map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field id="edit-address" label="نشانی" full>
              <textarea
                id="edit-address"
                className="admin-textarea"
                value={editForm.address}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, address: event.target.value }))
                }
                rows={2}
                maxLength={2000}
                required
              />
            </Field>

            <Field id="edit-carrier" label="شرکت حمل‌ونقل">
              <input
                id="edit-carrier"
                className="admin-input"
                value={editForm.carrier}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, carrier: event.target.value }))
                }
                maxLength={100}
              />
            </Field>

            <Field id="edit-tracking" label="کد رهگیری">
              <input
                id="edit-tracking"
                className="admin-input"
                value={editForm.tracking_code}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    tracking_code: event.target.value,
                  }))
                }
                dir="ltr"
                maxLength={80}
              />
            </Field>

            <Field id="edit-cost" label="هزینه (تومان)">
              <input
                id="edit-cost"
                type="number"
                min={0}
                className="admin-input"
                value={editForm.cost}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, cost: event.target.value }))
                }
                dir="ltr"
              />
            </Field>

            <Field id="edit-weight" label="وزن (گرم)">
              <input
                id="edit-weight"
                type="number"
                min={0}
                className="admin-input"
                value={editForm.weight_grams}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    weight_grams: event.target.value,
                  }))
                }
                dir="ltr"
              />
            </Field>

            <Field id="edit-volumetric" label="وزن حجمی (گرم)">
              <input
                id="edit-volumetric"
                type="number"
                min={0}
                className="admin-input"
                value={editForm.volumetric_weight_grams}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    volumetric_weight_grams: event.target.value,
                  }))
                }
                dir="ltr"
              />
            </Field>

            <Field id="edit-packages" label="تعداد بسته">
              <input
                id="edit-packages"
                type="number"
                min={1}
                className="admin-input"
                value={editForm.package_count}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    package_count: event.target.value,
                  }))
                }
                dir="ltr"
              />
            </Field>

            <Field id="edit-expected" label="تحویل مورد انتظار (شمسی)">
              <JalaliDatePicker
                id="edit-expected"
                value={editForm.expected_delivery_at}
                onChange={(value) =>
                  setEditForm((current) => ({
                    ...current,
                    expected_delivery_at: value.slice(0, 10),
                  }))
                }
                withTime={false}
                placeholder="انتخاب تاریخ تحویل"
              />
            </Field>

            <Field id="edit-notes" label="یادداشت داخلی" full>
              <textarea
                id="edit-notes"
                className="admin-textarea"
                value={editForm.notes}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, notes: event.target.value }))
                }
                rows={2}
                maxLength={2000}
              />
            </Field>
          </div>

          <div className="admin-toolbar" style={{ marginTop: 12, marginBottom: 0 }}>
            <div className="admin-toolbar-spacer" />
            <button
              type="button"
              className="admin-btn admin-btn-sm"
              onClick={() => setEditing(false)}
              disabled={savingEdit}
            >
              انصراف
            </button>
            <button
              type="submit"
              className="admin-btn admin-btn-primary admin-btn-sm"
              disabled={savingEdit}
            >
              <Save size={14} /> {savingEdit ? "در حال ذخیره..." : "ذخیرهٔ تغییرات"}
            </button>
          </div>
        </form>
      )}

      <hr style={{ margin: "18px 0", border: 0, borderTop: "1px solid #e5e7eb" }} />

      <h3 className="admin-card-title" style={{ fontSize: 15, marginBottom: 10 }}>
        تاریخچهٔ رویدادها
      </h3>

      {!shipment.events || shipment.events.length === 0 ? (
        <p className="admin-empty">هنوز رویدادی برای این مرسوله ثبت نشده است.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>زمان</th>
                <th>وضعیت</th>
                <th>یادداشت</th>
                <th>ثبت‌کننده</th>
              </tr>
            </thead>
            <tbody>
              {shipment.events.map((event) => {
                const eventMeta = statusOf(statuses, event.status);

                return (
                  <tr key={event.id}>
                    <td>{formatAdminDate(event.happened_at, true)}</td>
                    <td>{statusBadge(event.status_label ?? eventMeta.label, eventMeta.tone)}</td>
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
  );
}
/* ------------------------------------------------------------------ */
/* لایهٔ چاپ                                                          */
/* ------------------------------------------------------------------ */

function PrintArea({ job, onClose }: { job: PrintJob; onClose: () => void }) {
  const settings = useStoreSettings();

  useEffect(() => {
    const timer = window.setTimeout(() => window.print(), 400);

    return () => window.clearTimeout(timer);
  }, [job]);

  return (
    <div className="shp-print-layer">
      <div className="shp-print-actions">
        <button type="button" className="admin-btn admin-btn-primary admin-btn-sm" onClick={() => window.print()}>
          <Printer size={14} /> چاپ
        </button>
        <button type="button" className="admin-btn admin-btn-sm" onClick={onClose}>
          <X size={14} /> بستن
        </button>
      </div>

      <div className="shp-print-body">
        {job.kind === "labels" && (
          <div className="shp-label-grid">
            {job.shipments.map((shipment) => (
              <div className="shp-label" key={shipment.id}>
                <div className="shp-label-head">
                  <strong>{settings.store_name}</strong>
                  <span dir="ltr">{shipment.shipment_number}</span>
                </div>

                <div className="shp-label-row">
                  <span>گیرنده</span>
                  <strong>{shipment.recipient_name}</strong>
                </div>
                <div className="shp-label-row">
                  <span>تلفن</span>
                  <strong dir="ltr">{shipment.phone ?? "—"}</strong>
                </div>
                <div className="shp-label-row">
                  <span>مقصد</span>
                  <strong>
                    {[shipment.province, shipment.city].filter(Boolean).join(" · ") || "—"}
                  </strong>
                </div>
                <div className="shp-label-address">{shipment.address}</div>
                <div className="shp-label-row">
                  <span>کد پستی</span>
                  <strong dir="ltr">{shipment.postal_code ?? "—"}</strong>
                </div>
                <div className="shp-label-row">
                  <span>روش</span>
                  <strong>{shipment.method_name ?? shipment.carrier ?? "—"}</strong>
                </div>
                <div className="shp-label-code" dir="ltr">
                  {shipment.tracking_code ?? shipment.shipment_number}
                </div>
                <div className="shp-label-foot">
                  <span>سفارش: {shipment.order_number ?? "—"}</span>
                  <span>{formatAdminDate(shipment.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {(job.kind === "packing" || job.kind === "invoice") && (
          <div className="shp-doc">
            <div className="shp-doc-head">
              <div>
                <h1>{settings.store_name}</h1>
                {settings.store_slogan && <p>{settings.store_slogan}</p>}
                <p dir="ltr">{settings.store_phone}</p>
                <p>{settings.store_address}</p>
              </div>
              <div className="shp-doc-titles">
                <h2>{job.kind === "packing" ? "برگهٔ بسته‌بندی" : "فاکتور ارسال"}</h2>
                <p dir="ltr">{job.shipment.shipment_number}</p>
                <p>{formatAdminDate(job.shipment.created_at)}</p>
                <p dir="ltr">{job.shipment.order_number ?? "—"}</p>
              </div>
            </div>

            <div className="shp-doc-grid">
              <div>
                <h3>فرستنده</h3>
                <p>{settings.store_name}</p>
                <p dir="ltr">{settings.store_phone}</p>
                <p>{settings.store_address}</p>
              </div>
              <div>
                <h3>گیرنده</h3>
                <p>{job.shipment.recipient_name}</p>
                <p dir="ltr">{job.shipment.phone ?? "—"}</p>
                <p>
                  {[job.shipment.province, job.shipment.city].filter(Boolean).join(" · ")}
                </p>
                <p>{job.shipment.address}</p>
                <p dir="ltr">{job.shipment.postal_code ?? "—"}</p>
              </div>
              <div>
                <h3>ارسال</h3>
                <p>{job.shipment.method_name ?? job.shipment.carrier ?? "—"}</p>
                <p dir="ltr">{job.shipment.tracking_code ?? "بدون کد رهگیری"}</p>
                <p>بسته: {formatAdminNumber(job.shipment.package_count)}</p>
                <p>وزن: {gramsLabel(job.shipment.weight_grams)}</p>
              </div>
            </div>

            <table className="shp-doc-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>کالا</th>
                  <th>کد</th>
                  <th>تعداد</th>
                  {job.kind === "invoice" && <th>قیمت واحد</th>}
                  {job.kind === "invoice" && <th>جمع</th>}
                </tr>
              </thead>
              <tbody>
                {(job.shipment.order?.items ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={job.kind === "invoice" ? 6 : 4}>
                      اقلام سفارش در دسترس نیست.
                    </td>
                  </tr>
                ) : (
                  (job.shipment.order?.items ?? []).map((item, index) => (
                    <tr key={item.id}>
                      <td>{formatAdminNumber(index + 1)}</td>
                      <td>{item.product_name}</td>
                      <td dir="ltr">{item.sku ?? "—"}</td>
                      <td>{formatAdminNumber(item.quantity)}</td>
                      {job.kind === "invoice" && (
                        <td>{formatAdminPrice(item.unit_price)}</td>
                      )}
                      {job.kind === "invoice" && (
                        <td>{formatAdminPrice(item.total_price)}</td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {job.kind === "invoice" && (
              <div className="shp-doc-totals">
                <div>
                  <span>جمع کالاها</span>
                  <strong>{formatAdminPrice(job.shipment.order?.subtotal ?? 0)}</strong>
                </div>
                <div>
                  <span>هزینهٔ ارسال</span>
                  <strong>{formatAdminPrice(job.shipment.cost)}</strong>
                </div>
                <div>
                  <span>مبلغ کل</span>
                  <strong>{formatAdminPrice(job.shipment.order?.total ?? 0)}</strong>
                </div>
              </div>
            )}

            {job.shipment.notes && (
              <p className="shp-doc-note">
                <strong>یادداشت: </strong>
                {job.shipment.notes}
              </p>
            )}

            <div className="shp-doc-foot">
              <span>امضای فرستنده</span>
              <span>امضای مأمور پست / حامل</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
/* ------------------------------------------------------------------ */
/* ۳) روش‌های ارسال                                                    */
/* ------------------------------------------------------------------ */

type MethodForm = {
  name: string;
  code: string;
  carrier: string;
  description: string;
  base_cost: string;
  cost_per_kg: string;
  min_weight_grams: string;
  max_weight_grams: string;
  min_days: string;
  max_days: string;
  free_over_amount: string;
  is_express: boolean;
  is_active: boolean;
  sort_order: string;
};

const EMPTY_METHOD_FORM: MethodForm = {
  name: "",
  code: "",
  carrier: "",
  description: "",
  base_cost: "0",
  cost_per_kg: "0",
  min_weight_grams: "",
  max_weight_grams: "",
  min_days: "",
  max_days: "",
  free_over_amount: "",
  is_express: false,
  is_active: true,
  sort_order: "0",
};

function methodToForm(method: ShippingMethodRow): MethodForm {
  return {
    name: method.name,
    code: method.code,
    carrier: method.carrier ?? "",
    description: method.description ?? "",
    base_cost: String(toNumber(method.base_cost)),
    cost_per_kg: String(toNumber(method.cost_per_kg)),
    min_weight_grams: method.min_weight_grams ? String(method.min_weight_grams) : "",
    max_weight_grams: method.max_weight_grams ? String(method.max_weight_grams) : "",
    min_days: method.min_days === null ? "" : String(method.min_days),
    max_days: method.max_days === null ? "" : String(method.max_days),
    free_over_amount:
      method.free_over_amount === null ? "" : String(toNumber(method.free_over_amount)),
    is_express: method.is_express,
    is_active: method.is_active,
    sort_order: String(method.sort_order ?? 0),
  };
}

function MethodsTab({
  refreshToken,
  onChanged,
}: {
  refreshToken: number;
  onChanged: () => void;
}) {
  const [rows, setRows] = useState<ShippingMethodRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<MethodForm>(EMPTY_METHOD_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const response = await adminApi.get("/admin/shipping/methods");

      setRows(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (error) {
      setNotice({ type: "error", text: getAdminErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  }, [refreshToken]);

  useEffect(() => {
    void load();
  }, [load]);

  function update<K extends keyof MethodForm>(key: K, value: MethodForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function startCreate() {
    setEditingId(null);
    setForm(EMPTY_METHOD_FORM);
    setShowForm(true);
  }

  function startEdit(method: ShippingMethodRow) {
    setEditingId(method.id);
    setForm(methodToForm(method));
    setShowForm(true);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) return;

    if (!form.name.trim()) {
      setNotice({ type: "error", text: "نام روش ارسال الزامی است." });
      return;
    }

    setSaving(true);

    const payload = {
      name: form.name.trim(),
      code: form.code.trim() || null,
      carrier: form.carrier.trim() || null,
      description: form.description.trim() || null,
      base_cost: Number(form.base_cost) || 0,
      cost_per_kg: Number(form.cost_per_kg) || 0,
      min_weight_grams: form.min_weight_grams === "" ? null : Number(form.min_weight_grams),
      max_weight_grams: form.max_weight_grams === "" ? null : Number(form.max_weight_grams),
      min_days: form.min_days === "" ? null : Number(form.min_days),
      max_days: form.max_days === "" ? null : Number(form.max_days),
      free_over_amount: form.free_over_amount === "" ? null : Number(form.free_over_amount),
      is_express: form.is_express,
      is_active: form.is_active,
      sort_order: form.sort_order === "" ? 0 : Number(form.sort_order),
    };

    try {
      const response = editingId
        ? await adminApi.put(`/admin/shipping/methods/${editingId}`, payload)
        : await adminApi.post("/admin/shipping/methods", payload);

      setNotice({
        type: "success",
        text: response.data?.message ?? "روش ارسال ذخیره شد.",
      });
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_METHOD_FORM);
      await load();
      onChanged();
    } catch (error) {
      setNotice({ type: "error", text: getAdminErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(method: ShippingMethodRow) {
    try {
      const response = await adminApi.patch(
        `/admin/shipping/methods/${method.id}/status`,
        { is_active: !method.is_active },
      );

      setNotice({
        type: "success",
        text: response.data?.message ?? "وضعیت روش ارسال تغییر کرد.",
      });
      await load();
      onChanged();
    } catch (error) {
      setNotice({ type: "error", text: getAdminErrorMessage(error) });
    }
  }

  async function remove(method: ShippingMethodRow) {
    if (!window.confirm(`روش «${method.name}» حذف شود؟`)) return;

    try {
      const response = await adminApi.delete(`/admin/shipping/methods/${method.id}`);

      setNotice({ type: "success", text: response.data?.message ?? "روش حذف شد." });
      await load();
      onChanged();
    } catch (error) {
      setNotice({ type: "error", text: getAdminErrorMessage(error) });
    }
  }

  return (
    <div>
      <NoticeBox notice={notice} />

      <div className="admin-toolbar">
        <div className="admin-toolbar-spacer" />
        <button type="button" className="admin-btn admin-btn-sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={14} /> به‌روزرسانی
        </button>
        <button type="button" className="admin-btn admin-btn-primary admin-btn-sm" onClick={startCreate}>
          روش ارسال جدید
        </button>
      </div>

      {showForm && (
        <section className="admin-card">
          <div className="admin-card-head">
            <h2 className="admin-card-title">
              {editingId ? "ویرایش روش ارسال" : "تعریف روش ارسال"}
            </h2>
            <button
              type="button"
              className="admin-btn admin-btn-sm"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
            >
              انصراف
            </button>
          </div>

          <form onSubmit={submit}>
            <div className="admin-form-grid admin-form-grid-3">
              <Field id="method-name" label="نام روش *">
                <input
                  id="method-name"
                  className="admin-input"
                  value={form.name}
                  onChange={(event) => update("name", event.target.value)}
                  maxLength={100}
                  required
                />
              </Field>

              <Field id="method-code" label="کد یکتا (انگلیسی)">
                <input
                  id="method-code"
                  className="admin-input"
                  value={form.code}
                  onChange={(event) => update("code", event.target.value)}
                  dir="ltr"
                  maxLength={60}
                  placeholder="post_pishtaz"
                />
              </Field>

              <Field id="method-carrier" label="شرکت حمل‌ونقل">
                <input
                  id="method-carrier"
                  className="admin-input"
                  value={form.carrier}
                  onChange={(event) => update("carrier", event.target.value)}
                  maxLength={100}
                />
              </Field>

              <Field id="method-description" label="توضیح کوتاه" full>
                <input
                  id="method-description"
                  className="admin-input"
                  value={form.description}
                  onChange={(event) => update("description", event.target.value)}
                  maxLength={255}
                />
              </Field>

              <Field id="method-base-cost" label="هزینهٔ پایه (تومان)">
                <input
                  id="method-base-cost"
                  type="number"
                  min={0}
                  className="admin-input"
                  value={form.base_cost}
                  onChange={(event) => update("base_cost", event.target.value)}
                  dir="ltr"
                />
              </Field>

              <Field id="method-cost-per-kg" label="هزینهٔ هر کیلوگرم (تومان)">
                <input
                  id="method-cost-per-kg"
                  type="number"
                  min={0}
                  className="admin-input"
                  value={form.cost_per_kg}
                  onChange={(event) => update("cost_per_kg", event.target.value)}
                  dir="ltr"
                />
              </Field>

              <Field id="method-free-over" label="ارسال رایگان بالای مبلغ">
                <input
                  id="method-free-over"
                  type="number"
                  min={0}
                  className="admin-input"
                  value={form.free_over_amount}
                  onChange={(event) => update("free_over_amount", event.target.value)}
                  dir="ltr"
                  placeholder="خالی = بدون سقف رایگان"
                />
              </Field>

              <Field id="method-min-weight" label="حداقل وزن (گرم)">
                <input
                  id="method-min-weight"
                  type="number"
                  min={0}
                  className="admin-input"
                  value={form.min_weight_grams}
                  onChange={(event) => update("min_weight_grams", event.target.value)}
                  dir="ltr"
                />
              </Field>

              <Field id="method-max-weight" label="حداکثر وزن (گرم)">
                <input
                  id="method-max-weight"
                  type="number"
                  min={0}
                  className="admin-input"
                  value={form.max_weight_grams}
                  onChange={(event) => update("max_weight_grams", event.target.value)}
                  dir="ltr"
                />
              </Field>

              <Field id="method-sort" label="ترتیب نمایش">
                <input
                  id="method-sort"
                  type="number"
                  min={0}
                  className="admin-input"
                  value={form.sort_order}
                  onChange={(event) => update("sort_order", event.target.value)}
                  dir="ltr"
                />
              </Field>

              <Field id="method-min-days" label="حداقل روز تحویل">
                <input
                  id="method-min-days"
                  type="number"
                  min={0}
                  max={60}
                  className="admin-input"
                  value={form.min_days}
                  onChange={(event) => update("min_days", event.target.value)}
                  dir="ltr"
                />
              </Field>

              <Field id="method-max-days" label="حداکثر روز تحویل">
                <input
                  id="method-max-days"
                  type="number"
                  min={0}
                  max={60}
                  className="admin-input"
                  value={form.max_days}
                  onChange={(event) => update("max_days", event.target.value)}
                  dir="ltr"
                />
              </Field>

              <Field id="method-flags" label="ویژگی‌ها">
                <div style={{ display: "flex", gap: 16, alignItems: "center", paddingTop: 6 }}>
                  <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      className="admin-checkbox"
                      checked={form.is_express}
                      onChange={(event) => update("is_express", event.target.checked)}
                    />
                    ارسال سریع
                  </label>
                  <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      className="admin-checkbox"
                      checked={form.is_active}
                      onChange={(event) => update("is_active", event.target.checked)}
                    />
                    فعال
                  </label>
                </div>
              </Field>
            </div>

            <div className="admin-toolbar" style={{ marginTop: 14, marginBottom: 0 }}>
              <div className="admin-toolbar-spacer" />
              <button
                type="submit"
                className="admin-btn admin-btn-primary admin-btn-sm"
                disabled={saving}
              >
                <Save size={14} /> {saving ? "در حال ذخیره..." : "ذخیره"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2 className="admin-card-title">روش‌های ارسال</h2>
            <p className="admin-card-desc">
              {formatAdminNumber(rows.length)} روش ثبت شده است؛ روش‌های غیرفعال در
              فرم ثبت مرسوله هم قابل انتخاب هستند اما در فروشگاه نمایش داده نمی‌شوند.
            </p>
          </div>
        </div>

        {loading ? (
          <p className="admin-empty">در حال دریافت روش‌ها...</p>
        ) : rows.length === 0 ? (
          <p className="admin-empty">هنوز روش ارسالی تعریف نشده است.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>نام</th>
                  <th>کد</th>
                  <th>حامل</th>
                  <th>هزینهٔ پایه</th>
                  <th>هر کیلو</th>
                  <th>بازهٔ وزن</th>
                  <th>زمان تحویل</th>
                  <th>رایگان بالای</th>
                  <th>مرسوله</th>
                  <th>وضعیت</th>
                  <th>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((method) => (
                  <tr key={method.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{method.name}</div>
                      {method.description && (
                        <div style={{ fontSize: 12, color: "#6b7280" }}>
                          {method.description}
                        </div>
                      )}
                      {method.is_express && (
                        <span className="admin-badge admin-badge-blue" style={{ marginTop: 4 }}>
                          ارسال سریع
                        </span>
                      )}
                    </td>
                    <td dir="ltr">{method.code}</td>
                    <td>{method.carrier ?? "—"}</td>
                    <td>{formatAdminPrice(method.base_cost)}</td>
                    <td>{formatAdminPrice(method.cost_per_kg)}</td>
                    <td>
                      {gramsLabel(method.min_weight_grams)} —{" "}
                      {gramsLabel(method.max_weight_grams)}
                    </td>
                    <td>
                      {method.delivery_estimate ??
                        (method.min_days !== null || method.max_days !== null
                          ? `${formatAdminNumber(method.min_days ?? 0)} تا ${formatAdminNumber(
                              method.max_days ?? 0,
                            )} روز`
                          : "—")}
                    </td>
                    <td>
                      {method.free_over_amount === null
                        ? "—"
                        : formatAdminPrice(method.free_over_amount)}
                    </td>
                    <td>{formatAdminNumber(method.shipments_count ?? 0)}</td>
                    <td>
                      <span
                        className={`admin-badge ${
                          method.is_active ? "admin-badge-green" : "admin-badge-gray"
                        }`}
                      >
                        {method.is_active ? "فعال" : "غیرفعال"}
                      </span>
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        <button
                          type="button"
                          className="admin-btn admin-btn-sm"
                          onClick={() => startEdit(method)}
                        >
                          ویرایش
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn-sm"
                          onClick={() => void toggleActive(method)}
                        >
                          {method.is_active ? "غیرفعال" : "فعال"}
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn-danger admin-btn-sm"
                          onClick={() => void remove(method)}
                          title="حذف"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
/* ------------------------------------------------------------------ */
/* ۴) مناطق ارسال                                                      */
/* ------------------------------------------------------------------ */

type ZoneForm = {
  province: string;
  city: string;
  area: string;
  cost: string;
  is_express_available: boolean;
  is_active: boolean;
  note: string;
};

const EMPTY_ZONE_FORM: ZoneForm = {
  province: "",
  city: "",
  area: "",
  cost: "",
  is_express_available: false,
  is_active: true,
  note: "",
};

function ZonesTab({
  refreshToken,
  onChanged,
}: {
  refreshToken: number;
  onChanged: () => void;
}) {
  const [rows, setRows] = useState<ShippingZoneRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ZoneForm>(EMPTY_ZONE_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const response = await adminApi.get("/admin/shipping/zones");

      setRows(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (error) {
      setNotice({ type: "error", text: getAdminErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  }, [refreshToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim();

    if (term === "") return rows;

    return rows.filter((zone) =>
      [zone.province, zone.city, zone.area, zone.note]
        .filter(Boolean)
        .some((value) => String(value).includes(term)),
    );
  }, [rows, search]);

  function update<K extends keyof ZoneForm>(key: K, value: ZoneForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function startCreate() {
    setEditingId(null);
    setForm(EMPTY_ZONE_FORM);
    setShowForm(true);
  }

  function startEdit(zone: ShippingZoneRow) {
    setEditingId(zone.id);
    setForm({
      province: zone.province,
      city: zone.city ?? "",
      area: zone.area ?? "",
      cost: zone.cost === null ? "" : String(toNumber(zone.cost)),
      is_express_available: zone.is_express_available,
      is_active: zone.is_active,
      note: zone.note ?? "",
    });
    setShowForm(true);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) return;

    if (!form.province.trim()) {
      setNotice({ type: "error", text: "نام استان الزامی است." });
      return;
    }

    setSaving(true);

    const payload = {
      province: form.province.trim(),
      city: form.city.trim() || null,
      area: form.area.trim() || null,
      cost: form.cost === "" ? null : Number(form.cost),
      is_express_available: form.is_express_available,
      is_active: form.is_active,
      note: form.note.trim() || null,
    };

    try {
      const response = editingId
        ? await adminApi.put(`/admin/shipping/zones/${editingId}`, payload)
        : await adminApi.post("/admin/shipping/zones", payload);

      setNotice({
        type: "success",
        text: response.data?.message ?? "منطقهٔ ارسال ذخیره شد.",
      });
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_ZONE_FORM);
      await load();
      onChanged();
    } catch (error) {
      setNotice({ type: "error", text: getAdminErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(zone: ShippingZoneRow) {
    try {
      const response = await adminApi.patch(
        `/admin/shipping/zones/${zone.id}/status`,
        { is_active: !zone.is_active },
      );

      setNotice({
        type: "success",
        text: response.data?.message ?? "وضعیت منطقه تغییر کرد.",
      });
      await load();
      onChanged();
    } catch (error) {
      setNotice({ type: "error", text: getAdminErrorMessage(error) });
    }
  }

  async function remove(zone: ShippingZoneRow) {
    if (!window.confirm(`منطقهٔ «${zone.province}» حذف شود؟`)) return;

    try {
      const response = await adminApi.delete(`/admin/shipping/zones/${zone.id}`);

      setNotice({ type: "success", text: response.data?.message ?? "منطقه حذف شد." });
      await load();
      onChanged();
    } catch (error) {
      setNotice({ type: "error", text: getAdminErrorMessage(error) });
    }
  }

  return (
    <div>
      <NoticeBox notice={notice} />

      <div className="admin-toolbar">
        <input
          className="admin-input"
          style={{ maxWidth: 260 }}
          placeholder="جست‌وجو در استان، شهر یا محدوده"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="جست‌وجوی منطقه"
        />

        <div className="admin-toolbar-spacer" />

        <button type="button" className="admin-btn admin-btn-sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={14} /> به‌روزرسانی
        </button>
        <button type="button" className="admin-btn admin-btn-primary admin-btn-sm" onClick={startCreate}>
          منطقهٔ جدید
        </button>
      </div>

      {showForm && (
        <section className="admin-card">
          <div className="admin-card-head">
            <h2 className="admin-card-title">
              {editingId ? "ویرایش منطقهٔ ارسال" : "تعریف منطقهٔ ارسال"}
            </h2>
            <button
              type="button"
              className="admin-btn admin-btn-sm"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
            >
              انصراف
            </button>
          </div>

          <form onSubmit={submit}>
            <div className="admin-form-grid admin-form-grid-3">
              <Field id="zone-province" label="استان *">
                <input
                  id="zone-province"
                  className="admin-input"
                  value={form.province}
                  onChange={(event) => update("province", event.target.value)}
                  maxLength={100}
                  required
                />
              </Field>

              <Field id="zone-city" label="شهر">
                <input
                  id="zone-city"
                  className="admin-input"
                  value={form.city}
                  onChange={(event) => update("city", event.target.value)}
                  maxLength={100}
                  placeholder="خالی = کل استان"
                />
              </Field>

              <Field id="zone-area" label="محدوده / محله">
                <input
                  id="zone-area"
                  className="admin-input"
                  value={form.area}
                  onChange={(event) => update("area", event.target.value)}
                  maxLength={120}
                />
              </Field>

              <Field id="zone-cost" label="هزینهٔ ارسال (تومان)">
                <input
                  id="zone-cost"
                  type="number"
                  min={0}
                  className="admin-input"
                  value={form.cost}
                  onChange={(event) => update("cost", event.target.value)}
                  dir="ltr"
                  placeholder="خالی = هزینهٔ پیش‌فرض روش"
                />
              </Field>

              <Field id="zone-note" label="یادداشت">
                <input
                  id="zone-note"
                  className="admin-input"
                  value={form.note}
                  onChange={(event) => update("note", event.target.value)}
                  maxLength={255}
                />
              </Field>

              <Field id="zone-flags" label="ویژگی‌ها">
                <div style={{ display: "flex", gap: 16, alignItems: "center", paddingTop: 6 }}>
                  <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      className="admin-checkbox"
                      checked={form.is_express_available}
                      onChange={(event) =>
                        update("is_express_available", event.target.checked)
                      }
                    />
                    ارسال سریع
                  </label>
                  <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      className="admin-checkbox"
                      checked={form.is_active}
                      onChange={(event) => update("is_active", event.target.checked)}
                    />
                    فعال
                  </label>
                </div>
              </Field>
            </div>

            <div className="admin-toolbar" style={{ marginTop: 14, marginBottom: 0 }}>
              <div className="admin-toolbar-spacer" />
              <button
                type="submit"
                className="admin-btn admin-btn-primary admin-btn-sm"
                disabled={saving}
              >
                <Save size={14} /> {saving ? "در حال ذخیره..." : "ذخیره"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2 className="admin-card-title">مناطق ارسال</h2>
            <p className="admin-card-desc">
              {formatAdminNumber(filtered.length)} منطقه از{" "}
              {formatAdminNumber(rows.length)} منطقه نمایش داده می‌شود. منطقه‌ای که
              شهرش خالی باشد، برای همهٔ شهرهای آن استان اعمال می‌شود.
            </p>
          </div>
        </div>

        {loading ? (
          <p className="admin-empty">در حال دریافت مناطق...</p>
        ) : filtered.length === 0 ? (
          <p className="admin-empty">منطقه‌ای با این مشخصات پیدا نشد.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>استان</th>
                  <th>شهر</th>
                  <th>محدوده</th>
                  <th>هزینه</th>
                  <th>ارسال سریع</th>
                  <th>یادداشت</th>
                  <th>وضعیت</th>
                  <th>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((zone) => (
                  <tr key={zone.id}>
                    <td style={{ fontWeight: 600 }}>{zone.province}</td>
                    <td>{zone.city ?? "همهٔ شهرها"}</td>
                    <td>{zone.area ?? "—"}</td>
                    <td>{zone.cost === null ? "پیش‌فرض" : formatAdminPrice(zone.cost)}</td>
                    <td>
                      {zone.is_express_available ? (
                        <span className="admin-badge admin-badge-blue">دارد</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>{zone.note ?? "—"}</td>
                    <td>
                      <span
                        className={`admin-badge ${
                          zone.is_active ? "admin-badge-green" : "admin-badge-gray"
                        }`}
                      >
                        {zone.is_active ? "فعال" : "غیرفعال"}
                      </span>
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        <button
                          type="button"
                          className="admin-btn admin-btn-sm"
                          onClick={() => startEdit(zone)}
                        >
                          ویرایش
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn-sm"
                          onClick={() => void toggleActive(zone)}
                        >
                          {zone.is_active ? "غیرفعال" : "فعال"}
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn-danger admin-btn-sm"
                          onClick={() => void remove(zone)}
                          title="حذف"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
/* ------------------------------------------------------------------ */
/* ۵) تعرفه و قوانین هزینه                                             */
/* ------------------------------------------------------------------ */

type RuleForm = {
  title: string;
  type: string;
  shipping_method_id: string;
  province: string;
  city: string;
  threshold_amount: string;
  amount: string;
  cost_per_kg: string;
  priority: string;
  is_active: boolean;
  note: string;
};

const EMPTY_RULE_FORM: RuleForm = {
  title: "",
  type: "fixed",
  shipping_method_id: "",
  province: "",
  city: "",
  threshold_amount: "",
  amount: "",
  cost_per_kg: "",
  priority: "0",
  is_active: true,
  note: "",
};

function RulesTab({
  refreshToken,
  onChanged,
}: {
  refreshToken: number;
  onChanged: () => void;
}) {
  const [rows, setRows] = useState<ShippingRuleRow[]>([]);
  const [methods, setMethods] = useState<ShippingMethodRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<RuleForm>(EMPTY_RULE_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const [rulesResponse, methodsResponse] = await Promise.all([
        adminApi.get("/admin/shipping/rules"),
        adminApi.get("/admin/shipping/methods"),
      ]);

      setRows(Array.isArray(rulesResponse.data?.data) ? rulesResponse.data.data : []);
      setMethods(
        Array.isArray(methodsResponse.data?.data) ? methodsResponse.data.data : [],
      );
    } catch (error) {
      setNotice({ type: "error", text: getAdminErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  }, [refreshToken]);

  useEffect(() => {
    void load();
  }, [load]);

  function update<K extends keyof RuleForm>(key: K, value: RuleForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function startCreate() {
    setEditingId(null);
    setForm(EMPTY_RULE_FORM);
    setShowForm(true);
  }

  function startEdit(rule: ShippingRuleRow) {
    setEditingId(rule.id);
    setForm({
      title: rule.title,
      type: rule.type,
      shipping_method_id: rule.shipping_method_id ? String(rule.shipping_method_id) : "",
      province: rule.province ?? "",
      city: rule.city ?? "",
      threshold_amount:
        rule.threshold_amount === null ? "" : String(toNumber(rule.threshold_amount)),
      amount: rule.amount === null ? "" : String(toNumber(rule.amount)),
      cost_per_kg: rule.cost_per_kg === null ? "" : String(toNumber(rule.cost_per_kg)),
      priority: String(rule.priority ?? 0),
      is_active: rule.is_active,
      note: rule.note ?? "",
    });
    setShowForm(true);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) return;

    if (!form.title.trim()) {
      setNotice({ type: "error", text: "عنوان قانون الزامی است." });
      return;
    }

    setSaving(true);

    const payload = {
      title: form.title.trim(),
      type: form.type,
      shipping_method_id: form.shipping_method_id
        ? Number(form.shipping_method_id)
        : null,
      province: form.province.trim() || null,
      city: form.city.trim() || null,
      threshold_amount: form.threshold_amount === "" ? null : Number(form.threshold_amount),
      amount: form.amount === "" ? null : Number(form.amount),
      cost_per_kg: form.cost_per_kg === "" ? null : Number(form.cost_per_kg),
      priority: form.priority === "" ? 0 : Number(form.priority),
      is_active: form.is_active,
      note: form.note.trim() || null,
    };

    try {
      const response = editingId
        ? await adminApi.put(`/admin/shipping/rules/${editingId}`, payload)
        : await adminApi.post("/admin/shipping/rules", payload);

      setNotice({
        type: "success",
        text: response.data?.message ?? "قانون تعرفه ذخیره شد.",
      });
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_RULE_FORM);
      await load();
      onChanged();
    } catch (error) {
      setNotice({ type: "error", text: getAdminErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(rule: ShippingRuleRow) {
    try {
      const response = await adminApi.patch(
        `/admin/shipping/rules/${rule.id}/status`,
        { is_active: !rule.is_active },
      );

      setNotice({
        type: "success",
        text: response.data?.message ?? "وضعیت قانون تغییر کرد.",
      });
      await load();
      onChanged();
    } catch (error) {
      setNotice({ type: "error", text: getAdminErrorMessage(error) });
    }
  }

  async function remove(rule: ShippingRuleRow) {
    if (!window.confirm(`قانون «${rule.title}» حذف شود؟`)) return;

    try {
      const response = await adminApi.delete(`/admin/shipping/rules/${rule.id}`);

      setNotice({ type: "success", text: response.data?.message ?? "قانون حذف شد." });
      await load();
      onChanged();
    } catch (error) {
      setNotice({ type: "error", text: getAdminErrorMessage(error) });
    }
  }

  return (
    <div>
      <NoticeBox notice={notice} />

      <div className="admin-toolbar">
        <div className="admin-toolbar-spacer" />
        <button type="button" className="admin-btn admin-btn-sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={14} /> به‌روزرسانی
        </button>
        <button type="button" className="admin-btn admin-btn-primary admin-btn-sm" onClick={startCreate}>
          قانون جدید
        </button>
      </div>

      {showForm && (
        <section className="admin-card">
          <div className="admin-card-head">
            <h2 className="admin-card-title">
              {editingId ? "ویرایش قانون تعرفه" : "تعریف قانون تعرفه"}
            </h2>
            <button
              type="button"
              className="admin-btn admin-btn-sm"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
            >
              انصراف
            </button>
          </div>

          <form onSubmit={submit}>
            <div className="admin-form-grid admin-form-grid-3">
              <Field id="rule-title" label="عنوان قانون *">
                <input
                  id="rule-title"
                  className="admin-input"
                  value={form.title}
                  onChange={(event) => update("title", event.target.value)}
                  maxLength={150}
                  required
                />
              </Field>

              <Field id="rule-type" label="نوع قانون">
                <select
                  id="rule-type"
                  className="admin-select"
                  value={form.type}
                  onChange={(event) => update("type", event.target.value)}
                >
                  {RULE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field id="rule-method" label="روش ارسال (اختیاری)">
                <select
                  id="rule-method"
                  className="admin-select"
                  value={form.shipping_method_id}
                  onChange={(event) => update("shipping_method_id", event.target.value)}
                >
                  <option value="">همهٔ روش‌ها</option>
                  {methods.map((method) => (
                    <option key={method.id} value={method.id}>
                      {method.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field id="rule-province" label="استان (اختیاری)">
                <input
                  id="rule-province"
                  className="admin-input"
                  value={form.province}
                  onChange={(event) => update("province", event.target.value)}
                  maxLength={100}
                  placeholder="خالی = همهٔ استان‌ها"
                />
              </Field>

              <Field id="rule-city" label="شهر (اختیاری)">
                <input
                  id="rule-city"
                  className="admin-input"
                  value={form.city}
                  onChange={(event) => update("city", event.target.value)}
                  maxLength={100}
                />
              </Field>

              <Field id="rule-threshold" label="حد آستانهٔ مبلغ (تومان)">
                <input
                  id="rule-threshold"
                  type="number"
                  min={0}
                  className="admin-input"
                  value={form.threshold_amount}
                  onChange={(event) => update("threshold_amount", event.target.value)}
                  dir="ltr"
                  placeholder="برای ارسال رایگان"
                />
              </Field>

              <Field id="rule-amount" label="مبلغ هزینه (تومان)">
                <input
                  id="rule-amount"
                  type="number"
                  min={0}
                  className="admin-input"
                  value={form.amount}
                  onChange={(event) => update("amount", event.target.value)}
                  dir="ltr"
                />
              </Field>

              <Field id="rule-per-kg" label="هزینهٔ هر کیلوگرم (تومان)">
                <input
                  id="rule-per-kg"
                  type="number"
                  min={0}
                  className="admin-input"
                  value={form.cost_per_kg}
                  onChange={(event) => update("cost_per_kg", event.target.value)}
                  dir="ltr"
                />
              </Field>

              <Field id="rule-priority" label="اولویت (بزرگ‌تر = مهم‌تر)">
                <input
                  id="rule-priority"
                  type="number"
                  min={0}
                  max={9999}
                  className="admin-input"
                  value={form.priority}
                  onChange={(event) => update("priority", event.target.value)}
                  dir="ltr"
                />
              </Field>

              <Field id="rule-note" label="یادداشت">
                <input
                  id="rule-note"
                  className="admin-input"
                  value={form.note}
                  onChange={(event) => update("note", event.target.value)}
                  maxLength={255}
                />
              </Field>

              <Field id="rule-active" label="وضعیت">
                <label style={{ display: "flex", gap: 6, alignItems: "center", paddingTop: 6 }}>
                  <input
                    type="checkbox"
                    className="admin-checkbox"
                    checked={form.is_active}
                    onChange={(event) => update("is_active", event.target.checked)}
                  />
                  فعال باشد
                </label>
              </Field>
            </div>

            <div className="admin-toolbar" style={{ marginTop: 14, marginBottom: 0 }}>
              <div className="admin-toolbar-spacer" />
              <button
                type="submit"
                className="admin-btn admin-btn-primary admin-btn-sm"
                disabled={saving}
              >
                <Save size={14} /> {saving ? "در حال ذخیره..." : "ذخیره"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2 className="admin-card-title">قوانین تعرفهٔ ارسال</h2>
            <p className="admin-card-desc">
              قوانین با اولویت بالاتر زودتر اعمال می‌شوند؛ برای ارسال رایگان از نوع
              «ارسال رایگان بالای مبلغ» با تعیین حد آستانه استفاده کنید.
            </p>
          </div>
        </div>

        {loading ? (
          <p className="admin-empty">در حال دریافت قوانین...</p>
        ) : rows.length === 0 ? (
          <p className="admin-empty">هنوز قانون تعرفه‌ای ثبت نشده است.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>عنوان</th>
                  <th>نوع</th>
                  <th>روش</th>
                  <th>مقصد</th>
                  <th>آستانه</th>
                  <th>مبلغ</th>
                  <th>هر کیلو</th>
                  <th>اولویت</th>
                  <th>وضعیت</th>
                  <th>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((rule) => (
                  <tr key={rule.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{rule.title}</div>
                      {rule.note && (
                        <div style={{ fontSize: 12, color: "#6b7280" }}>{rule.note}</div>
                      )}
                    </td>
                    <td>
                      <span className="admin-badge admin-badge-blue">{rule.type_label}</span>
                    </td>
                    <td>{rule.method?.name ?? "همهٔ روش‌ها"}</td>
                    <td>
                      {[rule.province, rule.city].filter(Boolean).join(" · ") || "همه"}
                    </td>
                    <td>
                      {rule.threshold_amount === null
                        ? "—"
                        : formatAdminPrice(rule.threshold_amount)}
                    </td>
                    <td>{rule.amount === null ? "—" : formatAdminPrice(rule.amount)}</td>
                    <td>
                      {rule.cost_per_kg === null ? "—" : formatAdminPrice(rule.cost_per_kg)}
                    </td>
                    <td>{formatAdminNumber(rule.priority)}</td>
                    <td>
                      <span
                        className={`admin-badge ${
                          rule.is_active ? "admin-badge-green" : "admin-badge-gray"
                        }`}
                      >
                        {rule.is_active ? "فعال" : "غیرفعال"}
                      </span>
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        <button
                          type="button"
                          className="admin-btn admin-btn-sm"
                          onClick={() => startEdit(rule)}
                        >
                          ویرایش
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn-sm"
                          onClick={() => void toggleActive(rule)}
                        >
                          {rule.is_active ? "غیرفعال" : "فعال"}
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn-danger admin-btn-sm"
                          onClick={() => void remove(rule)}
                          title="حذف"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
/* ------------------------------------------------------------------ */
/* ۶) تاریخچهٔ ارسال‌ها                                                 */
/* ------------------------------------------------------------------ */

function HistoryTab({ refreshToken }: { refreshToken: number }) {
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

/* ------------------------------------------------------------------ */
/* ۷) صفحهٔ «روش‌های ارسال و اطلاعات ارسال» (محتوای سایت)              */
/* ------------------------------------------------------------------ */

interface ShippingPageForm {
  title: string;
  intro: string;
  notes: string[];
  content: string;
  show_costs: boolean;
}

const EMPTY_SHIPPING_PAGE: ShippingPageForm = {
  title: "",
  intro: "",
  notes: [],
  content: "",
  show_costs: true,
};

/** بیشینهٔ نکته‌های «اطلاعات ارسال»؛ هماهنگ با بک‌اند. */
const SHIPPING_PAGE_NOTES_MAX = 10;

/**
 * ویرایش صفحهٔ عمومی «روش‌های ارسال و اطلاعات ارسال» (/shipping-info).
 *
 * روش‌ها، هزینه و زمان تحویل از تب «روش‌های ارسال» می‌آیند؛ این تب فقط متن
 * صفحه (عنوان، معرفی، نکته‌ها، متن تکمیلی) و نمایش/مخفی‌کردن هزینه‌ها را
 * ویرایش می‌کند.
 */
function ShippingPageTab({ onOpenMethods }: { onOpenMethods: () => void }) {
  const [form, setForm] = useState<ShippingPageForm>(EMPTY_SHIPPING_PAGE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const response = await adminApi.get("/admin/shipping/page");
      const data = (response.data?.data ?? {}) as Record<string, unknown>;

      setForm({
        title: typeof data.title === "string" ? data.title : "",
        intro: typeof data.intro === "string" ? data.intro : "",
        notes: Array.isArray(data.notes)
          ? data.notes.filter(
              (note): note is string => typeof note === "string",
            )
          : [],
        content: typeof data.content === "string" ? data.content : "",
        show_costs: data.show_costs !== false,
      });
    } catch (error) {
      setNotice({ type: "error", text: getAdminErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function update<K extends keyof ShippingPageForm>(
    key: K,
    value: ShippingPageForm[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateNote(index: number, value: string) {
    setForm((current) => ({
      ...current,
      notes: current.notes.map((note, position) =>
        position === index ? value : note,
      ),
    }));
  }

  function addNote() {
    setForm((current) => ({ ...current, notes: [...current.notes, ""] }));
  }

  function removeNote(index: number) {
    setForm((current) => ({
      ...current,
      notes: current.notes.filter((_, position) => position !== index),
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) return;

    if (!form.title.trim()) {
      setNotice({ type: "error", text: "عنوان صفحه را وارد کنید." });
      return;
    }

    setSaving(true);

    try {
      const response = await adminApi.put("/admin/shipping/page", {
        title: form.title.trim(),
        intro: form.intro.trim(),
        notes: form.notes
          .map((note) => note.trim())
          .filter((note) => note !== ""),
        content: form.content,
        show_costs: form.show_costs,
      });

      setNotice({
        type: "success",
        text: response.data?.message ?? "صفحهٔ روش‌های ارسال ذخیره شد.",
      });

      await load();
    } catch (error) {
      setNotice({ type: "error", text: getAdminErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <NoticeBox notice={notice} />

      <div className="admin-toolbar">
        <div className="admin-toolbar-spacer" />
        <button
          type="button"
          className="admin-btn admin-btn-sm"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw size={14} /> بازخوانی
        </button>
        <a
          className="admin-btn admin-btn-sm"
          href="/shipping-info"
          target="_blank"
          rel="noopener noreferrer"
        >
          مشاهده در سایت
        </a>
      </div>

      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2 className="admin-card-title">
              محتوای صفحهٔ «روش‌های ارسال و اطلاعات ارسال»
            </h2>
            <p className="admin-card-desc">
              این متن‌ها در مسیر <code dir="ltr">/shipping-info</code> سایت
              نمایش داده می‌شوند. فهرست روش‌ها، هزینه و زمان تحویل از تب
              «روش‌های ارسال» خوانده می‌شود.
            </p>
          </div>

          <button
            type="button"
            className="admin-btn admin-btn-sm"
            onClick={onOpenMethods}
          >
            ویرایش روش‌های ارسال
          </button>
        </div>

        <form onSubmit={submit} noValidate>
          <div className="admin-form-grid admin-form-grid-3">
            <Field id="shipping-page-title" label="عنوان صفحه *" full>
              <input
                id="shipping-page-title"
                className="admin-input"
                value={form.title}
                onChange={(event) => update("title", event.target.value)}
                maxLength={120}
                required
              />
            </Field>

            <Field id="shipping-page-intro" label="متن معرفی" full>
              <textarea
                id="shipping-page-intro"
                className="admin-input"
                rows={3}
                value={form.intro}
                onChange={(event) => update("intro", event.target.value)}
                maxLength={1000}
              />
            </Field>
          </div>

          <div style={{ marginTop: 14 }}>
            <div className="admin-toolbar" style={{ marginTop: 0 }}>
              <span className="admin-label" style={{ margin: 0 }}>
                نکته‌های «اطلاعات ارسال» (
                {formatAdminNumber(form.notes.length)} از{" "}
                {formatAdminNumber(SHIPPING_PAGE_NOTES_MAX)})
              </span>
              <div className="admin-toolbar-spacer" />
              <button
                type="button"
                className="admin-btn admin-btn-sm"
                onClick={addNote}
                disabled={form.notes.length >= SHIPPING_PAGE_NOTES_MAX}
              >
                <Plus size={14} /> افزودن نکته
              </button>
            </div>

            {form.notes.length === 0 ? (
              <p className="admin-empty">هنوز نکته‌ای اضافه نشده است.</p>
            ) : (
              <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                {form.notes.map((note, index) => (
                  <div
                    key={index}
                    style={{ display: "flex", gap: 8, alignItems: "center" }}
                  >
                    <input
                      className="admin-input"
                      value={note}
                      onChange={(event) => updateNote(index, event.target.value)}
                      maxLength={300}
                      aria-label={`نکتهٔ ${index + 1}`}
                      placeholder="مثلاً: بسته‌بندی سفارش‌ها محرمانه انجام می‌شود."
                    />
                    <button
                      type="button"
                      className="admin-btn admin-btn-sm"
                      onClick={() => removeNote(index)}
                      title="حذف نکته"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            className="admin-form-grid admin-form-grid-3"
            style={{ marginTop: 14 }}
          >
            <Field
              id="shipping-page-content"
              label="متن تکمیلی صفحه (اختیاری)"
              full
            >
              <textarea
                id="shipping-page-content"
                className="admin-input"
                rows={6}
                value={form.content}
                onChange={(event) => update("content", event.target.value)}
                maxLength={20000}
                placeholder={
                  "## عنوان بخش\nمتن پاراگراف...\n\n- نکتهٔ اول\n- نکتهٔ دوم"
                }
              />
              <p className="admin-card-desc" style={{ marginTop: 6 }}>
                نشانه‌های سبک متن: <code dir="ltr">##</code> سرتیتر،{" "}
                <code dir="ltr">###</code> زیرتیتر، <code dir="ltr">-</code>{" "}
                فهرست، <code dir="ltr">&gt;</code> نکتهٔ برجسته و{" "}
                <code dir="ltr">**متن**</code> پررنگ.
              </p>
            </Field>

            <Field id="shipping-page-show-costs" label="نمایش هزینه‌ها" full>
              <label
                style={{
                  display: "flex",
                  gap: 6,
                  alignItems: "center",
                  paddingTop: 4,
                }}
              >
                <input
                  type="checkbox"
                  className="admin-checkbox"
                  checked={form.show_costs}
                  onChange={(event) =>
                    update("show_costs", event.target.checked)
                  }
                />
                هزینهٔ پایه و هزینهٔ هر کیلوگرم روش‌ها روی صفحهٔ سایت نمایش
                داده شود.
              </label>
            </Field>
          </div>

          <div
            className="admin-toolbar"
            style={{ marginTop: 14, marginBottom: 0 }}
          >
            <div className="admin-toolbar-spacer" />
            <button
              type="submit"
              className="admin-btn admin-btn-primary admin-btn-sm"
              disabled={saving}
            >
              <Save size={14} /> {saving ? "در حال ذخیره..." : "ذخیره"}
            </button>
          </div>

        </form>
      </section>
    </div>
  );
}

export default function AdminShipping() {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [refreshToken, setRefreshToken] = useState(0);
  const [presetOrder, setPresetOrder] = useState<OrderOption | null>(null);
  const [statusPreset, setStatusPreset] = useState<string | null>(null);
  const [openShipmentId, setOpenShipmentId] = useState<number | null>(null);

  const bumpRefresh = useCallback(() => {
    setRefreshToken((current) => current + 1);
  }, []);

  const consumePreset = useCallback(() => {
    setPresetOrder(null);
  }, []);

  const consumeNav = useCallback(() => {
    setStatusPreset(null);
    setOpenShipmentId(null);
  }, []);

  const handleRegisterOrder = useCallback((order: OrderOption) => {
    setPresetOrder(order);
    setStatusPreset(null);
    setOpenShipmentId(null);
    setActiveTab("shipments");
  }, []);

  const handleOpenShipment = useCallback((id: number) => {
    setPresetOrder(null);
    setStatusPreset(null);
    setOpenShipmentId(id);
    setActiveTab("shipments");
  }, []);

  const handleOpenStatus = useCallback((status: string) => {
    setPresetOrder(null);
    setOpenShipmentId(null);
    setStatusPreset(status);
    setActiveTab("shipments");
  }, []);

  return (
    <div dir="rtl" className="admin-page">
      <header className="admin-page-head">
        <div>
          <span className="admin-page-eyebrow">عملیات فروش</span>
          <h1 className="admin-page-title">مدیریت ارسال و حمل‌ونقل</h1>
          <p className="admin-page-subtitle">
            مرسوله‌ها را ثبت و پیگیری کنید، روش‌ها و مناطق ارسال را تعریف کنید،
            تعرفهٔ هزینه را تنظیم کنید و برچسب، بارنامه و فاکتور چاپ بگیرید.
          </p>
        </div>

        <button
          type="button"
          className="admin-btn"
          onClick={bumpRefresh}
          title="بارگذاری مجدد داده‌های بخش جاری"
        >
          <RefreshCw size={16} /> به‌روزرسانی
        </button>
      </header>

      <nav className="shp-tabs" aria-label="بخش‌های مدیریت ارسال">
        {TABS.map((tab) => {
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              className={`shp-tab${activeTab === tab.id ? " is-active" : ""}`}
              aria-current={activeTab === tab.id ? "page" : undefined}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {activeTab === "dashboard" && (
        <DashboardTab
          refreshToken={refreshToken}
          onRegisterOrder={handleRegisterOrder}
          onOpenShipment={handleOpenShipment}
          onOpenStatus={handleOpenStatus}
        />
      )}

      {activeTab === "shipments" && (
        <ShipmentsTab
          refreshToken={refreshToken}
          presetOrder={presetOrder}
          onConsumedPreset={consumePreset}
          onChanged={bumpRefresh}
          statusPreset={statusPreset}
          openShipmentId={openShipmentId}
          onConsumedNav={consumeNav}
        />
      )}

      {activeTab === "methods" && (
        <MethodsTab refreshToken={refreshToken} onChanged={bumpRefresh} />
      )}

      {activeTab === "zones" && (
        <ZonesTab refreshToken={refreshToken} onChanged={bumpRefresh} />
      )}

      {activeTab === "rules" && (
        <RulesTab refreshToken={refreshToken} onChanged={bumpRefresh} />
      )}

      {activeTab === "page" && (
        <ShippingPageTab onOpenMethods={() => setActiveTab("methods")} />
      )}

      {activeTab === "history" && <HistoryTab refreshToken={refreshToken} />}
    </div>
  );
}
