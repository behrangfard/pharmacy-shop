import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";

import { adminApi } from "../../services/api";
import { getAdminErrorMessage } from "../../utils/adminFormat";
import {
  EmptyState,
  FlashAlert,
  Modal,
  Panel,
  money,
  num,
  useDebouncedValue,
  useFlash,
  type Supplier,
} from "./accountingUi";

const EMPTY_FORM = {
  name: "",
  contact_name: "",
  phone: "",
  address: "",
  note: "",
  is_active: true,
};

/** مدیریت تأمین‌کنندگان: نام، تماس، جمع خرید و ماندهٔ بدهی. */
export default function SuppliersPanel({ onChanged }: { onChanged?: () => void }) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim());
  const { flash, success, error } = useFlash();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const response = await adminApi.get<{ data: Supplier[] }>("/admin/accounting/suppliers", {
        params: { search: search || undefined },
      });
      setSuppliers(response.data.data ?? []);
    } catch (caught) {
      error(getAdminErrorMessage(caught, "دریافت تأمین‌کنندگان انجام نشد."));
    } finally {
      setLoading(false);
    }
  }, [search, error]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setModalOpen(true);
  };

  const openEdit = (supplier: Supplier) => {
    setEditingId(supplier.id);
    setForm({
      name: supplier.name,
      contact_name: supplier.contact_name ?? "",
      phone: supplier.phone ?? "",
      address: supplier.address ?? "",
      note: supplier.note ?? "",
      is_active: supplier.is_active,
    });
    setFormError("");
    setModalOpen(true);
  };

  const save = async () => {
    if (saving) return;

    if (form.name.trim() === "") {
      setFormError("نام تأمین‌کننده را وارد کنید.");
      return;
    }

    setSaving(true);
    setFormError("");

    try {
      if (editingId === null) {
        await adminApi.post("/admin/accounting/suppliers", form);
        success("تأمین‌کننده ذخیره شد.");
      } else {
        await adminApi.put(`/admin/accounting/suppliers/${editingId}`, form);
        success("اطلاعات تأمین‌کننده به‌روزرسانی شد.");
      }

      setModalOpen(false);
      await load();
      onChanged?.();
    } catch (caught) {
      setFormError(getAdminErrorMessage(caught, "ذخیرهٔ تأمین‌کننده انجام نشد."));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (supplier: Supplier) => {
    if (!window.confirm(`تأمین‌کننده «${supplier.name}» حذف شود؟`)) return;

    try {
      await adminApi.delete(`/admin/accounting/suppliers/${supplier.id}`);
      success("تأمین‌کننده حذف شد.");
      await load();
      onChanged?.();
    } catch (caught) {
      error(getAdminErrorMessage(caught, "حذف تأمین‌کننده انجام نشد."));
    }
  };

  return (
    <Panel
      title="تأمین‌کنندگان"
      description="فروشندگانی که از آن‌ها جنس می‌خرید؛ ماندهٔ بدهی هرکدام از فاکتورها محاسبه می‌شود."
      actions={
        <>
          <button type="button" className="acc-button" onClick={() => void load()}>
            <RefreshCw size={15} aria-hidden="true" /> به‌روزرسانی
          </button>
          <button type="button" className="acc-button acc-button-primary" onClick={openCreate}>
            <Plus size={15} aria-hidden="true" /> تأمین‌کنندهٔ جدید
          </button>
        </>
      }
    >
      <FlashAlert flash={flash} />

      <input
        type="search"
        className="acc-input"
        value={searchInput}
        onChange={(event) => setSearchInput(event.target.value)}
        placeholder="جست‌وجوی نام یا شماره تماس…"
        aria-label="جست‌وجوی تأمین‌کننده"
      />

      {loading ? (
        <EmptyState>در حال دریافت تأمین‌کنندگان…</EmptyState>
      ) : suppliers.length === 0 ? (
        <EmptyState>
          هنوز تأمین‌کننده‌ای ثبت نشده است.
          <br />
          با دکمهٔ «تأمین‌کنندهٔ جدید» اولین فروشنده را اضافه کنید.
        </EmptyState>
      ) : (
        <div className="acc-table-wrap">
          <table className="acc-table">
            <thead>
              <tr>
                <th>نام</th>
                <th>شخص رابط</th>
                <th>تماس</th>
                <th>فاکتور</th>
                <th>جمع خرید</th>
                <th>مانده بدهی</th>
                <th>وضعیت</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {suppliers.map((supplier) => (
                <tr key={supplier.id}>
                  <td>{supplier.name}</td>
                  <td>{supplier.contact_name || "—"}</td>
                  <td dir="ltr">{supplier.phone || "—"}</td>
                  <td>{num(supplier.invoices_count)}</td>
                  <td>{money(supplier.invoices_total)}</td>
                  <td>
                    <span
                      className={
                        (supplier.balance ?? 0) > 0 ? "acc-badge is-warn" : "acc-badge is-ok"
                      }
                    >
                      {money(supplier.balance)}
                    </span>
                  </td>
                  <td>
                    <span className={supplier.is_active ? "acc-badge is-ok" : "acc-badge is-muted"}>
                      {supplier.is_active ? "فعال" : "غیرفعال"}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        type="button"
                        className="acc-button"
                        onClick={() => openEdit(supplier)}
                        aria-label={`ویرایش ${supplier.name}`}
                      >
                        <Pencil size={14} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="acc-button acc-button-danger"
                        onClick={() => void remove(supplier)}
                        aria-label={`حذف ${supplier.name}`}
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <Modal
          title={editingId === null ? "تأمین‌کنندهٔ جدید" : "ویرایش تأمین‌کننده"}
          onClose={() => setModalOpen(false)}
          busy={saving}
          footer={
            <>
              <button
                type="button"
                className="acc-button"
                onClick={() => setModalOpen(false)}
                disabled={saving}
              >
                انصراف
              </button>
              <button
                type="button"
                className="acc-button acc-button-primary"
                onClick={() => void save()}
                disabled={saving}
              >
                {saving ? "در حال ذخیره…" : "ذخیره"}
              </button>
            </>
          }
        >
          {formError && <div className="acc-alert is-error">{formError}</div>}

          <label className="acc-field">
            <span className="acc-label">نام تأمین‌کننده *</span>
            <input
              className="acc-input"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="مثال: پخش دارو ایران"
            />
          </label>

          <div className="acc-grid">
            <label className="acc-field">
              <span className="acc-label">شخص رابط</span>
              <input
                className="acc-input"
                value={form.contact_name}
                onChange={(event) => setForm({ ...form, contact_name: event.target.value })}
              />
            </label>

            <label className="acc-field">
              <span className="acc-label">شماره تماس</span>
              <input
                className="acc-input"
                dir="ltr"
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
                placeholder="09121234567"
              />
            </label>
          </div>

          <label className="acc-field">
            <span className="acc-label">آدرس</span>
            <input
              className="acc-input"
              value={form.address}
              onChange={(event) => setForm({ ...form, address: event.target.value })}
            />
          </label>

          <label className="acc-field">
            <span className="acc-label">یادداشت</span>
            <textarea
              className="acc-input"
              rows={2}
              value={form.note}
              onChange={(event) => setForm({ ...form, note: event.target.value })}
            />
          </label>

          <label className="acc-field" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
            />
            <span>این تأمین‌کننده فعال است</span>
          </label>
        </Modal>
      )}
    </Panel>
  );
}
