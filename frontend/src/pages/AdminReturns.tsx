import { FormEvent, useCallback, useEffect, useState } from "react";

import { adminApi } from "../services/api";
import {
  formatAdminDate,
  formatAdminNumber,
  getAdminErrorMessage,
} from "../utils/adminFormat";

interface ReturnRequest {
  id: number;
  status: "pending" | "approved" | "rejected" | "refunded";
  reason: string;
  description: string | null;
  admin_note: string | null;
  refund_amount: string | number | null;
  created_at: string;
  order: {
    id: number;
    order_number: string;
    total: string | number;
    status: string;
    payment_status: string;
    created_at: string;
    phone: string | null;
  } | null;
  user: {
    id: number;
    name: string;
    email: string;
  } | null;
}

const statusLabels: Record<ReturnRequest["status"], string> = {
  pending: "در انتظار بررسی",
  approved: "تأییدشده",
  rejected: "ردشده",
  refunded: "بازپرداخت‌شده",
};

const statusClasses: Record<ReturnRequest["status"], string> = {
  pending: "admin-badge-amber",
  approved: "admin-badge-blue",
  rejected: "admin-badge-red",
  refunded: "admin-badge-green",
};

function AdminReturns() {
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [editing, setEditing] = useState<ReturnRequest | null>(null);
  const [status, setStatus] = useState<ReturnRequest["status"]>("pending");
  const [adminNote, setAdminNote] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const loadReturns = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await adminApi.get("/admin/returns", {
        params: statusFilter ? { status: statusFilter } : {},
      });

      const result = response.data?.data;

      if (!Array.isArray(result)) {
        throw new Error("ساختار پاسخ درخواست‌های مرجوعی معتبر نیست.");
      }

      setReturns(result);
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void loadReturns();
  }, [loadReturns]);

  function startEditing(item: ReturnRequest) {
    setEditing(item);
    setStatus(item.status);
    setAdminNote(item.admin_note ?? "");
    setRefundAmount(
      item.refund_amount === null ? "" : String(item.refund_amount),
    );
    setError("");
    setSuccess("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editing || saving) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await adminApi.patch(
        `/admin/returns/${editing.id}/status`,
        {
          status,
          admin_note: adminNote.trim() || null,
          refund_amount: refundAmount.trim() ? Number(refundAmount) : null,
        },
      );

      setSuccess(response.data?.message ?? "وضعیت درخواست به‌روزرسانی شد.");
      setEditing(null);
      await loadReturns();
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div dir="rtl" className="admin-page">
      <header className="admin-page-head">
        <div>
          <span className="admin-page-eyebrow">خدمات پس از فروش</span>
          <h1 className="admin-page-title">درخواست‌های مرجوعی</h1>
          <p className="admin-page-subtitle">
            درخواست‌های مرجوعی مشتریان را بررسی کنید. با ثبت وضعیت «بازپرداخت»
            مبلغ به سفارش برگشت می‌خورد و وضعیت پرداخت سفارش به «مستردشده»
            تغییر می‌کند.
          </p>
        </div>

        <button
          type="button"
          className="admin-btn"
          onClick={() => void loadReturns()}
          disabled={loading}
        >
          {loading ? "در حال دریافت..." : "بارگذاری مجدد"}
        </button>
      </header>

      {error && (
        <div className="admin-alert admin-alert-error" role="alert">
          <span aria-hidden="true">!</span>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="admin-alert admin-alert-success" role="status">
          <span aria-hidden="true">✓</span>
          <span>{success}</span>
        </div>
      )}

      {editing && (
        <section className="admin-card">
          <div className="admin-card-head">
            <div>
              <h2 className="admin-card-title">
                بررسی درخواست سفارش {editing.order?.order_number ?? "—"}
              </h2>
              <p className="admin-card-desc">
                دلیل مشتری: {editing.reason}
                {editing.description ? ` — ${editing.description}` : ""}
              </p>
            </div>

            <button
              type="button"
              className="admin-btn admin-btn-sm"
              onClick={() => setEditing(null)}
            >
              بستن
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="admin-form-grid admin-form-grid-3">
              <div className="admin-field">
                <label className="admin-label" htmlFor="return-status">
                  وضعیت درخواست
                </label>
                <select
                  id="return-status"
                  className="admin-select"
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as ReturnRequest["status"])
                  }
                >
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-field">
                <label className="admin-label" htmlFor="return-refund">
                  مبلغ بازپرداخت (تومان)
                </label>
                <input
                  id="return-refund"
                  type="number"
                  min={0}
                  step={1000}
                  className="admin-input"
                  value={refundAmount}
                  onChange={(event) => setRefundAmount(event.target.value)}
                  dir="ltr"
                  placeholder={
                    editing.order
                      ? String(Number(editing.order.total) || 0)
                      : "مبلغ سفارش"
                  }
                />
                <span className="admin-help">
                  خالی بگذارید تا مبلغ کل سفارش بازپرداخت شود.
                </span>
              </div>

              <div className="admin-field admin-full">
                <label className="admin-label" htmlFor="return-note">
                  یادداشت مدیر
                </label>
                <textarea
                  id="return-note"
                  className="admin-textarea"
                  value={adminNote}
                  onChange={(event) => setAdminNote(event.target.value)}
                  maxLength={2000}
                />
              </div>
            </div>

            <div className="admin-actions">
              <button
                type="submit"
                className="admin-btn admin-btn-primary"
                disabled={saving}
              >
                {saving ? "در حال ذخیره..." : "ذخیرهٔ وضعیت"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2 className="admin-card-title">فهرست درخواست‌ها</h2>
            <p className="admin-card-desc">
              {formatAdminNumber(returns.length)} درخواست نمایش داده می‌شود.
            </p>
          </div>

          <select
            className="admin-select"
            style={{ maxWidth: 200 }}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="فیلتر وضعیت مرجوعی"
          >
            <option value="">همهٔ وضعیت‌ها</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="admin-empty">در حال دریافت درخواست‌ها...</p>
        ) : returns.length === 0 ? (
          <p className="admin-empty">درخواستی با این وضعیت وجود ندارد.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table admin-returns-table">
              <thead>
                <tr>
                  <th>سفارش</th>
                  <th>مشتری</th>
                  <th>دلیل</th>
                  <th>مبلغ سفارش</th>
                  <th>تاریخ ثبت</th>
                  <th>وضعیت</th>
                  <th>عملیات</th>
                </tr>
              </thead>

              <tbody>
                {returns.map((item) => (
                  <tr key={item.id}>
                    <td
                      className="admin-returns-ltr"
                      style={{ fontWeight: 700 }}
                    >
                      {item.order?.order_number ?? "—"}
                    </td>
                    <td>
                      <span className="admin-returns-customer">
                        <span className="admin-returns-name">
                          {item.user?.name ?? "—"}
                        </span>
                        {item.order?.phone && (
                          <span className="admin-returns-phone">
                            {item.order.phone}
                          </span>
                        )}
                      </span>
                    </td>
                    <td>
                      <span
                        className="admin-returns-reason"
                        title={item.reason}
                      >
                        {item.reason}
                      </span>
                    </td>
                    <td>
                      {item.order
                        ? `${formatAdminNumber(item.order.total)} تومان`
                        : "—"}
                    </td>
                    <td>{formatAdminDate(item.created_at, true)}</td>
                    <td>
                      <span
                        className={`admin-badge ${statusClasses[item.status]}`}
                      >
                        {statusLabels[item.status]}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="admin-btn admin-btn-sm"
                        onClick={() => startEditing(item)}
                      >
                        بررسی
                      </button>
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

export default AdminReturns;