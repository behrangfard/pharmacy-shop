import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { adminApi } from "../services/api";
import JalaliDatePicker from "../components/JalaliDatePicker";
import {
  formatAdminDate,
  formatAdminNumber,
  getAdminErrorMessage,
  toDateTimeInput,
} from "../utils/adminFormat";

interface Coupon {
  id: number;
  code: string;
  title: string | null;
  type: "percent" | "fixed";
  value: string | number;
  min_order_total: string | number;
  max_discount: string | number | null;
  usage_limit: number | null;
  used_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
}

interface CouponForm {
  code: string;
  title: string;
  type: "percent" | "fixed";
  value: string;
  min_order_total: string;
  max_discount: string;
  usage_limit: string;
  starts_at: string;
  expires_at: string;
  is_active: boolean;
}

const initialForm: CouponForm = {
  code: "",
  title: "",
  type: "percent",
  value: "10",
  min_order_total: "0",
  max_discount: "",
  usage_limit: "",
  starts_at: "",
  expires_at: "",
  is_active: true,
};

function describeCoupon(coupon: Coupon): string {
  return coupon.type === "percent"
    ? `${formatAdminNumber(coupon.value)}٪ تخفیف`
    : `${formatAdminNumber(coupon.value)} تومان تخفیف`;
}

function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [form, setForm] = useState<CouponForm>(initialForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadCoupons = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await adminApi.get("/admin/coupons");
      const result = response.data?.data;

      if (!Array.isArray(result)) {
        throw new Error("ساختار پاسخ کدهای تخفیف معتبر نیست.");
      }

      setCoupons(result);
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCoupons();
  }, [loadCoupons]);

  const filteredCoupons = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fa");

    if (!query) return coupons;

    return coupons.filter((coupon) =>
      [coupon.code, coupon.title ?? ""].some((value) =>
        value.toLocaleLowerCase("fa").includes(query),
      ),
    );
  }, [coupons, search]);

  function updateField<K extends keyof CouponForm>(
    field: K,
    value: CouponForm[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
  }

  function startEditing(coupon: Coupon) {
    setError("");
    setSuccess("");
    setEditingId(coupon.id);
    setForm({
      code: coupon.code ?? "",
      title: coupon.title ?? "",
      type: coupon.type === "fixed" ? "fixed" : "percent",
      value: String(coupon.value ?? ""),
      min_order_total: String(coupon.min_order_total ?? "0"),
      max_discount:
        coupon.max_discount === null ? "" : String(coupon.max_discount),
      usage_limit:
        coupon.usage_limit === null ? "" : String(coupon.usage_limit),
      starts_at: toDateTimeInput(coupon.starts_at),
      expires_at: toDateTimeInput(coupon.expires_at),
      is_active: Boolean(coupon.is_active),
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function buildPayload() {
    return {
      code: form.code.trim(),
      title: form.title.trim() || null,
      type: form.type,
      value: Number(form.value) || 0,
      min_order_total: Number(form.min_order_total) || 0,
      max_discount: form.max_discount.trim()
        ? Number(form.max_discount)
        : null,
      usage_limit: form.usage_limit.trim() ? Number(form.usage_limit) : null,
      starts_at: form.starts_at || null,
      expires_at: form.expires_at || null,
      is_active: form.is_active,
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) return;

    if (!form.code.trim()) {
      setError("کد تخفیف الزامی است.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = buildPayload();

      if (editingId === null) {
        const response = await adminApi.post("/admin/coupons", payload);
        setSuccess(response.data?.message ?? "کد تخفیف ایجاد شد.");
      } else {
        const response = await adminApi.put(
          `/admin/coupons/${editingId}`,
          payload,
        );
        setSuccess(response.data?.message ?? "کد تخفیف ویرایش شد.");
      }

      resetForm();
      await loadCoupons();
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(coupon: Coupon) {
    setActionId(coupon.id);
    setError("");
    setSuccess("");

    try {
      await adminApi.patch(`/admin/coupons/${coupon.id}/status`, {
        is_active: !coupon.is_active,
      });

      setSuccess(
        coupon.is_active ? "کد تخفیف غیرفعال شد." : "کد تخفیف فعال شد.",
      );
      await loadCoupons();
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setActionId(null);
    }
  }

  async function deleteCoupon(coupon: Coupon) {
    if (!window.confirm(`کد تخفیف «${coupon.code}» حذف شود؟`)) {
      return;
    }

    setActionId(coupon.id);
    setError("");
    setSuccess("");

    try {
      const response = await adminApi.delete(`/admin/coupons/${coupon.id}`);

      setSuccess(response.data?.message ?? "کد تخفیف حذف شد.");
      await loadCoupons();
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setActionId(null);
    }
  }

  return (
    <div dir="rtl" className="admin-page">
      <header className="admin-page-head">
        <div>
          <span className="admin-page-eyebrow">بازاریابی</span>
          <h1 className="admin-page-title">کدهای تخفیف</h1>
          <p className="admin-page-subtitle">
            کد تخفیف درصدی یا مبلغی بسازید، سقف تخفیف و حداقل مبلغ سبد را تعیین
            کنید و بازهٔ اعتبار آن را مشخص کنید. کدهای استفاده‌شده حذف نمی‌شوند
            و فقط غیرفعال می‌گردند.
          </p>
        </div>

        <button
          type="button"
          className="admin-btn"
          onClick={() => void loadCoupons()}
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

      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2 className="admin-card-title">
              {editingId === null ? "ایجاد کد تخفیف" : "ویرایش کد تخفیف"}
            </h2>
            <p className="admin-card-desc">
              کدها به حروف بزرگ تبدیل می‌شوند؛ برای مثال welcome10 به WELCOME10
              تغییر می‌کند.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="admin-form-grid admin-form-grid-3">
            <div className="admin-field">
              <label className="admin-label" htmlFor="coupon-code">
                کد تخفیف *
              </label>
              <input
                id="coupon-code"
                className="admin-input"
                value={form.code}
                onChange={(event) => updateField("code", event.target.value)}
                dir="ltr"
                required
                maxLength={60}
                placeholder="WELCOME10"
              />
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="coupon-title">
                عنوان (اختیاری)
              </label>
              <input
                id="coupon-title"
                className="admin-input"
                value={form.title}
                onChange={(event) => updateField("title", event.target.value)}
                maxLength={255}
                placeholder="تخفیف خوش‌آمدگویی"
              />
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="coupon-type">
                نوع تخفیف
              </label>
              <select
                id="coupon-type"
                className="admin-select"
                value={form.type}
                onChange={(event) =>
                  updateField("type", event.target.value as CouponForm["type"])
                }
              >
                <option value="percent">درصدی</option>
                <option value="fixed">مبلغ ثابت (تومان)</option>
              </select>
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="coupon-value">
                {form.type === "percent"
                  ? "درصد تخفیف *"
                  : "مبلغ تخفیف (تومان) *"}
              </label>
              <input
                id="coupon-value"
                type="number"
                min={0}
                max={form.type === "percent" ? 100 : undefined}
                step={form.type === "percent" ? 0.5 : 1000}
                className="admin-input"
                value={form.value}
                onChange={(event) => updateField("value", event.target.value)}
                dir="ltr"
                required
              />
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="coupon-min">
                حداقل مبلغ سبد (تومان)
              </label>
              <input
                id="coupon-min"
                type="number"
                min={0}
                step={1000}
                className="admin-input"
                value={form.min_order_total}
                onChange={(event) =>
                  updateField("min_order_total", event.target.value)
                }
                dir="ltr"
              />
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="coupon-max">
                سقف تخفیف (تومان)
              </label>
              <input
                id="coupon-max"
                type="number"
                min={0}
                step={1000}
                className="admin-input"
                value={form.max_discount}
                onChange={(event) =>
                  updateField("max_discount", event.target.value)
                }
                dir="ltr"
                placeholder="بدون سقف"
              />
              <span className="admin-help">
                فقط برای تخفیف درصدی کاربرد دارد.
              </span>
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="coupon-limit">
                سقف تعداد استفاده
              </label>
              <input
                id="coupon-limit"
                type="number"
                min={1}
                className="admin-input"
                value={form.usage_limit}
                onChange={(event) =>
                  updateField("usage_limit", event.target.value)
                }
                dir="ltr"
                placeholder="بدون محدودیت"
              />
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="coupon-start">
                شروع اعتبار (شمسی)
              </label>
              <JalaliDatePicker
                id="coupon-start"
                value={form.starts_at}
                onChange={(value) => updateField("starts_at", value)}
              />
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="coupon-expire">
                پایان اعتبار (شمسی)
              </label>
              <JalaliDatePicker
                id="coupon-expire"
                value={form.expires_at}
                onChange={(value) => updateField("expires_at", value)}
                defaultHour={23}
                defaultMinute={59}
              />
            </div>

            <label
              className="admin-checkbox admin-full"
              htmlFor="coupon-active"
            >
              <input
                id="coupon-active"
                type="checkbox"
                checked={form.is_active}
                onChange={(event) =>
                  updateField("is_active", event.target.checked)
                }
              />
              کد تخفیف فعال باشد
            </label>
          </div>

          <div className="admin-actions">
            <button
              type="submit"
              className="admin-btn admin-btn-primary"
              disabled={saving}
            >
              {saving
                ? "در حال ذخیره..."
                : editingId === null
                  ? "ایجاد کد تخفیف"
                  : "ذخیرهٔ تغییرات"}
            </button>

            {editingId !== null && (
              <button
                type="button"
                className="admin-btn"
                onClick={resetForm}
                disabled={saving}
              >
                انصراف
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2 className="admin-card-title">فهرست کدهای تخفیف</h2>
            <p className="admin-card-desc">
              {formatAdminNumber(coupons.length)} کد ثبت شده است.
            </p>
          </div>
        </div>

        <div className="admin-toolbar">
          <input
            className="admin-input"
            style={{ maxWidth: 320 }}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="جست‌وجوی کد یا عنوان..."
            aria-label="جست‌وجوی کد تخفیف"
          />
        </div>

        {loading ? (
          <p className="admin-empty">در حال دریافت کدهای تخفیف...</p>
        ) : filteredCoupons.length === 0 ? (
          <p className="admin-empty">کد تخفیفی با این مشخصات پیدا نشد.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>کد</th>
                  <th>تخفیف</th>
                  <th>حداقل سبد</th>
                  <th>استفاده</th>
                  <th>پایان اعتبار</th>
                  <th>وضعیت</th>
                  <th>عملیات</th>
                </tr>
              </thead>

              <tbody>
                {filteredCoupons.map((coupon) => {
                  const busy = actionId === coupon.id;
                  const expired =
                    coupon.expires_at !== null &&
                    new Date(coupon.expires_at).getTime() < Date.now();

                  return (
                    <tr key={coupon.id}>
                      <td dir="ltr" style={{ fontWeight: 700 }}>
                        {coupon.code}
                        {coupon.title && (
                          <div
                            dir="rtl"
                            style={{ fontSize: 11, color: "#9ca3af" }}
                          >
                            {coupon.title}
                          </div>
                        )}
                      </td>
                      <td>{describeCoupon(coupon)}</td>
                      <td>
                        {Number(coupon.min_order_total) > 0
                          ? `${formatAdminNumber(coupon.min_order_total)} تومان`
                          : "—"}
                      </td>
                      <td>
                        {formatAdminNumber(coupon.used_count)} /{" "}
                        {coupon.usage_limit === null
                          ? "∞"
                          : formatAdminNumber(coupon.usage_limit)}
                      </td>
                      <td>{formatAdminDate(coupon.expires_at)}</td>
                      <td>
                        <span
                          className={`admin-badge ${
                            !coupon.is_active
                              ? "admin-badge-red"
                              : expired
                                ? "admin-badge-amber"
                                : "admin-badge-green"
                          }`}
                        >
                          {!coupon.is_active
                            ? "غیرفعال"
                            : expired
                              ? "منقضی"
                              : "فعال"}
                        </span>
                      </td>
                      <td>
                        <div className="admin-row-actions">
                          <button
                            type="button"
                            className="admin-btn admin-btn-sm"
                            onClick={() => startEditing(coupon)}
                            disabled={busy || saving}
                          >
                            ویرایش
                          </button>

                          <button
                            type="button"
                            className="admin-btn admin-btn-sm"
                            onClick={() => void toggleStatus(coupon)}
                            disabled={busy || saving}
                          >
                            {busy
                              ? "..."
                              : coupon.is_active
                                ? "غیرفعال‌سازی"
                                : "فعال‌سازی"}
                          </button>

                          <button
                            type="button"
                            className="admin-btn admin-btn-sm admin-btn-danger"
                            onClick={() => void deleteCoupon(coupon)}
                            disabled={busy || saving}
                          >
                            حذف
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
    </div>
  );
}

export default AdminCoupons;