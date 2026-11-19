import { type ReactNode } from "react";
import {
  Boxes,
  FileText,
  History,
  MapPin,
  Package,
  Ruler,
  Truck,
} from "lucide-react";

import { formatAdminNumber } from "../../../utils/adminFormat";

/* ------------------------------------------------------------------ */
/* انواع داده                                                          */
/* ------------------------------------------------------------------ */

export type Tone = "gray" | "amber" | "blue" | "green" | "red";

export type TabId =
  | "dashboard"
  | "shipments"
  | "methods"
  | "zones"
  | "rules"
  | "page"
  | "history";

export type Notice = { type: "success" | "error"; text: string };

export interface StatusMeta {
  value: string;
  label: string;
  tone: Tone;
  count?: number;
}

export interface OrderOption {
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

export interface OrderItem {
  id: number;
  product_name: string;
  sku: string | null;
  quantity: number;
  unit_price: string | number;
  total_price: string | number;
}

export interface OrderSummary {
  id: number;
  order_number: string;
  total?: string | number;
  subtotal?: string | number;
  status?: string;
  payment_status?: string;
  created_at?: string;
  items?: OrderItem[];
}

export interface ShipmentEventRow {
  id: number;
  status: string;
  status_label: string;
  note: string | null;
  happened_at: string | null;
  creator: string | null;
}

export interface ShipmentRow {
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

export type ShipmentDetail = ShipmentRow;

export interface ShippingMethodRow {
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
export interface ShippingZoneRow {
  id: number;
  province: string;
  city: string | null;
  area: string | null;
  cost: string | number | null;
  is_express_available: boolean;
  is_active: boolean;
  note: string | null;
}

export interface ShippingRuleRow {
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

export interface HistoryEventRow {
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

export interface OverviewData {
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

export interface QuoteResult {
  cost: number;
  is_free: boolean;
  reason: string;
  weight_grams: number;
  weight_kg: number;
  zone: { id: number; label: string; cost: number | null } | null;
  method: { id: number; name: string; estimate: string | null } | null;
}

export type PrintJob =
  | { kind: "labels"; shipments: ShipmentRow[] }
  | { kind: "packing"; shipment: ShipmentDetail }
  | { kind: "invoice"; shipment: ShipmentDetail };

/* ------------------------------------------------------------------ */
/* ثابت‌ها و ابزارهای کمکی                                             */
/* ------------------------------------------------------------------ */

export const TONE_BADGE: Record<Tone, string> = {
  gray: "admin-badge-gray",
  amber: "admin-badge-amber",
  blue: "admin-badge-blue",
  green: "admin-badge-green",
  red: "admin-badge-red",
};

export const TABS: { id: TabId; label: string; icon: typeof Truck }[] = [
  { id: "dashboard", label: "داشبورد ارسال", icon: Boxes },
  { id: "shipments", label: "مرسوله‌ها", icon: Package },
  { id: "methods", label: "روش‌های ارسال", icon: Truck },
  { id: "zones", label: "مناطق ارسال", icon: MapPin },
  { id: "rules", label: "تعرفه و هزینه", icon: Ruler },
  { id: "page", label: "صفحهٔ ارسال", icon: FileText },
  { id: "history", label: "تاریخچه", icon: History },
];

export const RULE_TYPES: { value: string; label: string }[] = [
  { value: "fixed", label: "هزینهٔ ثابت" },
  { value: "free_over_amount", label: "ارسال رایگان بالای مبلغ" },
  { value: "weight_based", label: "هزینه بر اساس وزن" },
  { value: "zone_based", label: "هزینهٔ منطقه‌ای" },
];

export const DELIVERY_FAILED = "delivery_failed";
export const RETURNED_STATUS = "returned";

export function toNumber(value: number | string | null | undefined): number {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

export function gramsLabel(grams: number | null | undefined): string {
  if (!grams || grams <= 0) return "—";
  if (grams < 1000) return `${formatAdminNumber(grams)} گرم`;

  return `${formatAdminNumber(Number((grams / 1000).toFixed(2)))} کیلوگرم`;
}

export function statusBadge(label: string, tone: string) {
  const badge = TONE_BADGE[(tone as Tone) ?? "gray"] ?? TONE_BADGE.gray;

  return <span className={`admin-badge ${badge}`}>{label}</span>;
}

export function statusOf(statuses: StatusMeta[] | undefined, status: string) {
  return (
    statuses?.find((item) => item.value === status) ?? {
      value: status,
      label: status,
      tone: "gray" as Tone,
    }
  );
}

export function NoticeBox({ notice }: { notice: Notice | null }) {
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

export function Field({
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
