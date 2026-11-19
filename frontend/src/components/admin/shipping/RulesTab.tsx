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
  type ShippingRuleRow,
  RULE_TYPES,
  toNumber,
  NoticeBox,
  Field,
} from "./shippingShared";

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

export function RulesTab({
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
