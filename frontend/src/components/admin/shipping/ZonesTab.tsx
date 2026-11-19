import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
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
  type ShippingZoneRow,
  toNumber,
  NoticeBox,
  Field,
} from "./shippingShared";

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

export function ZonesTab({
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

