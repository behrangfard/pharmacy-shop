import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";

import { adminApi } from "../../../services/api";
import {
  formatAdminNumber,
  formatAdminPrice,
  getAdminErrorMessage,
} from "../../../utils/adminFormat";

import {
  type Notice,
  type ShippingMethodRow,
  toNumber,
  gramsLabel,
  NoticeBox,
  Field,
} from "./shippingShared";

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

export function MethodsTab({
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

