import { useCallback, useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";

import { formatAdminNumber, formatAdminPrice } from "../../utils/adminFormat";
import JalaliDatePicker from "../JalaliDatePicker";

/* ------------------------------- انواع داده ------------------------------- */

export type Supplier = {
  id: number;
  name: string;
  contact_name: string | null;
  phone: string | null;
  address: string | null;
  note: string | null;
  is_active: boolean;
  invoices_count?: number;
  invoices_total?: number;
  balance?: number;
};

export type InvoiceItem = {
  id?: number;
  product_id: number | null;
  title: string;
  sku: string | null;
  quantity: number;
  unit_cost: number | string;
  discount: number | string;
  total: number | string;
  product?: { id: number; name: string; sku: string; stock: number } | null;
  /** فقط برای فرم؛ وضعیت انتخاب محصول */
  search?: string;
};

export type PurchaseInvoice = {
  id: number;
  invoice_number: string;
  supplier_id: number | null;
  supplier?: { id: number; name: string } | null;
  issued_at: string;
  items_total: string | number;
  discount: string | number;
  shipping_cost: string | number;
  tax_amount: string | number;
  total: string | number;
  paid_amount: string | number;
  payment_status: "unpaid" | "partial" | "paid";
  note: string | null;
  items_count?: number;
  items?: InvoiceItem[];
};

export type Expense = {
  id: number;
  title: string;
  category: string;
  amount: string | number;
  spent_at: string;
  supplier_id: number | null;
  supplier?: { id: number; name: string } | null;
  note: string | null;
};

export type Cheque = {
  id: number;
  direction: "paid" | "received";
  amount: string | number;
  due_date: string;
  bank_name: string | null;
  serial: string | null;
  party_name: string | null;
  supplier_id: number | null;
  supplier?: { id: number; name: string } | null;
  status: "pending" | "cleared" | "bounced" | "cancelled";
  note: string | null;
};

export type MonthlyRow = {
  month: string;
  orders_count: number;
  revenue: number;
  cogs: number;
  shipping_income: number;
  purchase_shipping: number;
  expenses: number;
  gross: number;
  net: number;
};

export type ProfitReport = {
  period: { from: string; to: string };
  sales: {
    orders_count: number;
    revenue: number;
    discount: number;
    shipping_income: number;
    tax: number;
    total_collected: number;
  };
  costs: {
    cogs: number;
    purchase_total: number;
    purchase_shipping: number;
    purchase_remaining: number;
    purchases_count: number;
    expenses: number;
    expenses_by_category: { key: string; label: string; total: number }[];
  };
  profit: { gross: number; net: number; gross_margin: number };
  monthly: MonthlyRow[];
  top_products: { name: string; quantity: number; revenue: number; profit: number }[];
};

export type AccountingOverview = {
  current: ProfitReport;
  previous: { sales: ProfitReport["sales"]; profit: ProfitReport["profit"] };
  inventory_value: number;
  supplier_debt: number;
  cheques: {
    paid_pending: number;
    received_pending: number;
    overdue_count: number;
    upcoming: {
      id: number;
      direction: "paid" | "received";
      amount: number;
      due_date: string | null;
      party_name: string | null;
      bank_name: string | null;
      status: string;
      is_overdue: boolean;
    }[];
  };
  recent_invoices: {
    id: number;
    invoice_number: string;
    issued_at: string | null;
    supplier: string | null;
    total: number;
    paid_amount: number;
    remaining: number;
    payment_status: string;
  }[];
  series: MonthlyRow[];
};

/* --------------------------------- کمکی‌ها -------------------------------- */

export const num = (value: number | string | null | undefined) =>
  formatAdminNumber(Number(value ?? 0));

export const money = (value: number | string | null | undefined) =>
  formatAdminPrice(Number(value ?? 0));

export const EXPENSE_CATEGORIES: { key: string; label: string }[] = [
  { key: "shipping", label: "باربری و ارسال" },
  { key: "packaging", label: "بسته‌بندی" },
  { key: "marketing", label: "تبلیغات و بازاریابی" },
  { key: "software", label: "نرم‌افزار و ابزار" },
  { key: "tax", label: "مالیات و عوارض" },
  { key: "other", label: "سایر" },
];

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: "پرداخت‌نشده",
  partial: "پرداخت جزئی",
  paid: "تسویه‌شده",
};

export const CHEQUE_STATUS_LABELS: Record<string, string> = {
  pending: "در جریان",
  cleared: "پاس شد",
  bounced: "برگشتی",
  cancelled: "لغو شد",
};

export const DIRECTION_LABELS: Record<string, string> = {
  paid: "پرداختی به تأمین‌کننده",
  received: "دریافتی از مشتری",
};

/** تاریخ ISO را به مقدار ورودی تقویم شمسی تبدیل می‌کند. */
export const dateValue = (value: string | null | undefined) =>
  (value ?? "").slice(0, 10);

/** امروز به شکل YYYY-MM-DD (برای مقدار پیش‌فرض فرم‌ها). */
export const EMPTY_TODAY = () => new Date().toISOString().slice(0, 10);

/* --------------------------------- استایل‌ها -------------------------------- */

const ACCOUNTING_CSS_BASE = `
  .acc-page { display: grid; gap: 16px; color: var(--admin-ink, #2c3a2e); }
  .acc-page * { box-sizing: border-box; }
  .acc-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    padding: 6px;
    border: 1px solid var(--admin-line, #e6ece3);
    border-radius: 14px;
    background: #fbfdf9;
  }
  .acc-tab {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 13px;
    border-radius: 10px;
    border: 1px solid transparent;
    background: transparent;
    color: #4b5b4d;
    font-size: 12.5px;
    font-weight: 700;
    cursor: pointer;
  }
  .acc-tab:hover { background: #f1f6ee; }
  .acc-tab.is-active { background: #33583a; border-color: #33583a; color: #fff; }
  .acc-panel {
    display: grid;
    gap: 14px;
    padding: 18px;
    border: 1px solid var(--admin-line, #e6ece3);
    border-radius: 16px;
    background: #fff;
    box-shadow: 0 4px 16px rgba(30, 44, 32, .04);
  }
  .acc-panel-head {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }
  .acc-title { margin: 0; font-size: 15px; font-weight: 850; }
  .acc-subtitle {
    margin: 4px 0 0;
    font-size: 12px;
    line-height: 1.9;
    color: var(--admin-muted, #6d7d70);
  }
  .acc-actions { display: flex; flex-wrap: wrap; gap: 8px; }
  .acc-button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 9px 13px;
    border-radius: 10px;
    border: 1px solid var(--admin-line, #e6ece3);
    background: #fff;
    color: #3d4d3f;
    font-size: 12.5px;
    font-weight: 700;
    cursor: pointer;
    transition: transform 140ms ease, background 140ms ease;
  }
  .acc-button:hover:not(:disabled) { transform: translateY(-1px); }
  .acc-button:disabled { opacity: .55; cursor: not-allowed; }
  .acc-button-primary { border-color: #33583a; background: #33583a; color: #fff; }
  .acc-button-danger { border-color: #f0d9d3; background: #fff8f6; color: #a3452f; }
  .acc-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 11px; }
  .acc-stat {
    padding: 14px;
    border: 1px solid var(--admin-line, #e6ece3);
    border-radius: 13px;
    background: #fbfdf9;
  }
  .acc-stat-label { font-size: 11.5px; color: var(--admin-muted, #6d7d70); line-height: 1.8; }
  .acc-stat-value { margin-top: 5px; font-size: 19px; font-weight: 850; line-height: 1.7; }
  .acc-stat-hint { margin-top: 3px; font-size: 10.5px; color: #7c8a7e; }
  .acc-stat.is-good { border-color: #cfe2c9; background: #f4f9f1; }
  .acc-stat.is-warn { border-color: #f0dcc4; background: #fdf8ef; }
  .acc-stat.is-bad { border-color: #f0d6cf; background: #fdf3f0; }
  .acc-grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
  .acc-field { display: grid; gap: 5px; font-size: 12px; color: #45584a; }
  .acc-label { font-weight: 700; }
  .acc-input {
    width: 100%;
    padding: 9px 11px;
    border: 1px solid #dfe8db;
    border-radius: 10px;
    background: #fff;
    font-size: 12.5px;
    font-family: inherit;
    color: #2f4032;
  }
  .acc-input:focus-visible { outline: 2px solid #4c7a52; outline-offset: 1px; }
  .acc-hint { font-size: 11px; color: #7c8a7e; line-height: 1.8; }
`;

const ACCOUNTING_CSS_PANELS = `
  .acc-table-wrap {
    width: 100%;
    overflow-x: auto;
    border: 1px solid var(--admin-line, #e6ece3);
    border-radius: 12px;
  }
  .acc-table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .acc-table th, .acc-table td {
    padding: 9px 11px;
    text-align: right;
    border-bottom: 1px solid #f0f4ed;
    white-space: nowrap;
  }
  .acc-table th { background: #f5f8f2; font-weight: 800; color: #3c4c3e; }
  .acc-table tbody tr:hover { background: #fafcf8; }
  .acc-table td.wrap { white-space: normal; min-width: 150px; }
  .acc-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 10.5px;
    font-weight: 700;
  }
  .acc-badge.is-ok { background: #eef7ea; color: #3f6b3f; }
  .acc-badge.is-warn { background: #fdf4e7; color: #9a6a1f; }
  .acc-badge.is-bad { background: #fdeeea; color: #a3452f; }
  .acc-badge.is-muted { background: #f3f4f0; color: #6c6f63; }
  .acc-empty {
    padding: 26px 16px;
    border: 1px dashed #dfe8db;
    border-radius: 12px;
    background: #fcfdfa;
    text-align: center;
    color: #7c8a7e;
    font-size: 12.5px;
    line-height: 2;
  }
  .acc-alert {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 11px 13px;
    border-radius: 11px;
    font-size: 12.5px;
    line-height: 1.9;
  }
  .acc-alert.is-error { border: 1px solid #f0d6cf; background: #fdf3f0; color: #a3452f; }
  .acc-alert.is-success { border: 1px solid #cfe2c9; background: #f2f8ef; color: #3f6b3f; }
  .acc-bars { display: grid; gap: 9px; }
  .acc-bar-row { display: grid; gap: 4px; }
  .acc-bar-head { display: flex; justify-content: space-between; gap: 8px; font-size: 11.5px; color: #55655a; }
  .acc-bar-track {
    position: relative;
    height: 8px;
    border-radius: 999px;
    background: #eef3ea;
    overflow: hidden;
  }
  .acc-bar-fill {
    position: absolute;
    inset-inline-start: 0;
    top: 0;
    bottom: 0;
    border-radius: 999px;
    background: #4c7a52;
  }
  .acc-bar-fill.is-negative { background: #c2603f; }
  .acc-list { display: grid; gap: 8px; }
  .acc-list-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 10px 12px;
    border: 1px solid #e8efe4;
    border-radius: 11px;
    background: #fff;
    font-size: 12px;
  }
  .acc-list-meta { display: flex; flex-wrap: wrap; gap: 9px; color: #7c8a7e; font-size: 11px; }
  .acc-pagination {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    font-size: 11.5px;
    color: #6d7d70;
  }
  .acc-modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 95;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    background: rgba(24, 36, 26, .45);
    backdrop-filter: blur(3px);
  }
  .acc-modal {
    display: flex;
    flex-direction: column;
    width: min(560px, 100%);
    max-height: calc(100vh - 32px);
    border-radius: 16px;
    border: 1px solid var(--admin-line, #e6ece3);
    background: #fff;
    box-shadow: 0 24px 60px rgba(20, 32, 22, .22);
  }
  .acc-modal.is-wide { width: min(900px, 100%); }
  .acc-modal-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 16px 18px 12px;
    border-bottom: 1px solid var(--admin-line, #e6ece3);
  }
  .acc-modal-body { display: grid; gap: 12px; padding: 16px 18px; overflow-y: auto; }
  .acc-modal-foot {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 18px 16px;
    border-top: 1px solid var(--admin-line, #e6ece3);
  }
  .acc-items { display: grid; gap: 10px; }
  .acc-item-row {
    display: grid;
    gap: 8px;
    padding: 11px;
    border: 1px solid #e8efe4;
    border-radius: 12px;
    background: #fbfdf9;
  }
  .acc-item-grid { display: grid; gap: 8px; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); }
  .acc-item-total { font-size: 11.5px; color: #4b5b4d; font-weight: 700; }
  @media (max-width: 640px) {
    .acc-panel { padding: 14px; border-radius: 14px; }
    .acc-modal-backdrop { align-items: flex-end; padding: 8px; }
    .acc-modal { max-height: calc(100vh - 16px); border-radius: 14px; }
    .acc-actions { width: 100%; }
    .acc-actions > * { flex: 1 1 auto; justify-content: center; }
  }
`;

export function AccountingStyle() {
  return <style>{ACCOUNTING_CSS_BASE + ACCOUNTING_CSS_PANELS}</style>;
}

type PanelProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function Panel({ title, description, actions, children }: PanelProps) {
  return (
    <section className="acc-panel">
      <div className="acc-panel-head">
        <div>
          <h2 className="acc-title">{title}</h2>
          {description && <p className="acc-subtitle">{description}</p>}
        </div>
        {actions && <div className="acc-actions">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

type ModalProps = {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  busy?: boolean;
};

export function Modal({
  title,
  subtitle,
  onClose,
  children,
  footer,
  wide,
  busy,
}: ModalProps) {
  return (
    <div
      className="acc-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) {
          onClose();
        }
      }}
    >
      <div
        className={`acc-modal${wide ? " is-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        dir="rtl"
      >
        <div className="acc-modal-head">
          <div>
            <h2 className="acc-title">{title}</h2>
            {subtitle && <p className="acc-subtitle">{subtitle}</p>}
          </div>

          <button
            type="button"
            className="acc-button"
            onClick={onClose}
            disabled={busy}
            aria-label="بستن"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="acc-modal-body">{children}</div>

        {footer && <div className="acc-modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

type DateFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  hint?: string;
};

export function DateField({ label, value, onChange, required, hint }: DateFieldProps) {
  return (
    <div className="acc-field">
      <span className="acc-label">
        {label}
        {required ? " *" : ""}
      </span>

      <JalaliDatePicker
        value={value ? `${value}T00:00` : ""}
        onChange={(next) => onChange(next.slice(0, 10))}
        withTime={false}
        placeholder="انتخاب تاریخ"
      />

      {hint && <span className="acc-hint">{hint}</span>}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="acc-empty">{children}</div>;
}

type StatCardProps = {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "good" | "warn" | "bad";
};

export function StatCard({ label, value, hint, tone = "default" }: StatCardProps) {
  const toneClass = tone === "default" ? "" : ` is-${tone}`;

  return (
    <article className={`acc-stat${toneClass}`}>
      <div className="acc-stat-label">{label}</div>
      <div className="acc-stat-value">{value}</div>
      {hint && <div className="acc-stat-hint">{hint}</div>}
    </article>
  );
}

/* ------------------------------ قلاب‌های کمکی ------------------------------ */

export function useDebouncedValue<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delay);

    return () => window.clearTimeout(timeout);
  }, [value, delay]);

  return debounced;
}

export type Flash = { tone: "error" | "success"; text: string } | null;

/**
 * پیام کوتاه موفقیت/خطا با محو خودکار.
 *
 * خروجی این قلاب در افکت‌ها و `useCallback`های صفحات حسابداری استفاده می‌شود؛
 * پس `success` و `error` باید هویت ثابت داشته باشند. اگر هر رندر تابع تازه
 * بسازیم، افکتِ وابسته به آن‌ها در هر رندر دوباره اجرا می‌شود و درخواست‌ها
 * بی‌پایان تکرار می‌شوند (دکمهٔ «به‌روزرسانی» مدام بین دو حالت می‌پرد).
 */
export function useFlash() {
  const [flash, setFlash] = useState<Flash>(null);

  useEffect(() => {
    if (!flash) return;

    const timeout = window.setTimeout(() => setFlash(null), 6000);

    return () => window.clearTimeout(timeout);
  }, [flash]);

  const success = useCallback((text: string) => {
    setFlash({ tone: "success", text });
  }, []);

  const error = useCallback((text: string) => {
    setFlash({ tone: "error", text });
  }, []);

  return { flash, success, error };
}

export function FlashAlert({ flash }: { flash: Flash }) {
  if (!flash) return null;

  return (
    <div className={`acc-alert is-${flash.tone}`} role={flash.tone === "error" ? "alert" : "status"}>
      {flash.text}
    </div>
  );
}
