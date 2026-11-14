import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";

import { adminApi } from "../../services/api";
import { getAdminErrorMessage } from "../../utils/adminFormat";
import {
  DateField,
  EMPTY_TODAY,
  EmptyState,
  EXPENSE_CATEGORIES,
  FlashAlert,
  Modal,
  Panel,
  dateValue,
  money,
  useDebouncedValue,
  useFlash,
  type Expense,
  type Supplier,
} from "./accountingUi";

type ExpenseForm = {
  title: string;
  category: string;
  amount: string;
  spent_at: string;
  supplier_id: string;
  note: string;
};

const emptyForm = (): ExpenseForm => ({
  title: "",
  category: "shipping",
  amount: "",
  spent_at: EMPTY_TODAY(),
  supplier_id: "",
  note: "",
});

/** هزینه‌های فروشگاه: باربری، بسته‌بندی، تبلیغات و ... */
export default function ExpensesPanel({ suppliers }: { suppliers: Supplier[] }) {
  const [rows, setRows] = useState<Expense[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim());
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ last_page: 1, total: 0 });
  const { flash, success, error } = useFlash();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ExpenseForm>(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(
    async (targetPage = page) => {
      setLoading(true);

      try {
        const response = await adminApi.get<{
          data: { data: Expense[]; last_page: number; total: number };
          meta: { total_amount: number };
        }>("/admin/accounting/expenses", {
          params: {
            page: targetPage,
            search: search || undefined,
            category: category || undefined,
          },
        });

        setRows(response.data.data?.data ?? []);
        setMeta({
          last_page: response.data.data?.last_page ?? 1,
          total: response.data.data?.total ?? 0,
        });
        setTotalAmount(response.data.meta?.total_amount ?? 0);
      } catch (caught) {
        error(getAdminErrorMessage(caught, "دریافت هزینه‌ها انجام نشد."));
      } finally {
        setLoading(false);
      }
    },
    [page, search, category, error],
  );

  useEffect(() => {
    void load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category, page]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setFormError("");
    setModalOpen(true);
  };

  const openEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setForm({
      title: expense.title,
      category: expense.category,
      amount: String(expense.amount),
      spent_at: dateValue(expense.spent_at),
      supplier_id: expense.supplier_id ? String(expense.supplier_id) : "",
      note: expense.note ?? "",
    });
    setFormError("");
    setModalOpen(true);
  };

  const save = async () => {
    if (saving) return;

    if (form.title.trim() === "" || form.amount === "") {
      setFormError("عنوان و مبلغ هزینه را وارد کنید.");
      return;
    }

    setSaving(true);
    setFormError("");

    const payload = {
      title: form.title,
      category: form.category,
      amount: Number(form.amount),
      spent_at: form.spent_at,
      supplier_id: form.supplier_id === "" ? null : Number(form.supplier_id),
      note: form.note,
    };

    try {
      if (editingId === null) {
        await adminApi.post("/admin/accounting/expenses", payload);
        success("هزینه ثبت شد.");
      } else {
        await adminApi.put(`/admin/accounting/expenses/${editingId}`, payload);
        success("هزینه به‌روزرسانی شد.");
      }

      setModalOpen(false);
      await load(editingId === null ? 1 : page);
    } catch (caught) {
      setFormError(getAdminErrorMessage(caught, "ذخیرهٔ هزینه انجام نشد."));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (expense: Expense) => {
    if (!window.confirm(`هزینهٔ «${expense.title}» حذف شود؟`)) return;

    try {
      await adminApi.delete(`/admin/accounting/expenses/${expense.id}`);
      success("هزینه حذف شد.");
      await load(page);
    } catch (caught) {
      error(getAdminErrorMessage(caught, "حذف هزینه انجام نشد."));
    }
  };

  return (
    <Panel
      title="هزینه‌ها"
      description="باربری ارسال، بسته‌بندی، تبلیغات و هر هزینهٔ دیگری که از سود کم می‌شود."
      actions={
        <>
          <button type="button" className="acc-button" onClick={() => void load(page)}>
            <RefreshCw size={15} aria-hidden="true" /> به‌روزرسانی
          </button>
          <button type="button" className="acc-button acc-button-primary" onClick={openCreate}>
            <Plus size={15} aria-hidden="true" /> هزینهٔ جدید
          </button>
        </>
      }
    >
      <FlashAlert flash={flash} />

      <div className="acc-grid">
        <input
          type="search"
          className="acc-input"
          value={searchInput}
          onChange={(event) => {
            setSearchInput(event.target.value);
            setPage(1);
          }}
          placeholder="جست‌وجوی عنوان هزینه…"
          aria-label="جست‌وجوی هزینه"
        />

        <select
          className="acc-input"
          value={category}
          onChange={(event) => {
            setCategory(event.target.value);
            setPage(1);
          }}
          aria-label="دستهٔ هزینه"
        >
          <option value="">همهٔ دسته‌ها</option>
          {EXPENSE_CATEGORIES.map((item) => (
            <option key={item.key} value={item.key}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div className="acc-stats">
        <div className="acc-stat">
          <div className="acc-stat-label">جمع هزینه‌های این فیلتر</div>
          <div className="acc-stat-value">{money(totalAmount)}</div>
          <div className="acc-stat-hint">{meta.total} ردیف</div>
        </div>
      </div>

      {loading ? (
        <EmptyState>در حال دریافت هزینه‌ها…</EmptyState>
      ) : rows.length === 0 ? (
        <EmptyState>هزینه‌ای با این فیلتر ثبت نشده است.</EmptyState>
      ) : (
        <div className="acc-table-wrap">
          <table className="acc-table">
            <thead>
              <tr>
                <th>عنوان</th>
                <th>دسته</th>
                <th>مبلغ</th>
                <th>تاریخ</th>
                <th>تأمین‌کننده</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((expense) => (
                <tr key={expense.id}>
                  <td className="wrap">{expense.title}</td>
                  <td>
                    {EXPENSE_CATEGORIES.find((item) => item.key === expense.category)?.label ??
                      expense.category}
                  </td>
                  <td>{money(expense.amount)}</td>
                  <td>{dateValue(expense.spent_at)}</td>
                  <td>{expense.supplier?.name ?? "—"}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        type="button"
                        className="acc-button"
                        onClick={() => openEdit(expense)}
                        aria-label="ویرایش هزینه"
                      >
                        <Pencil size={14} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="acc-button acc-button-danger"
                        onClick={() => void remove(expense)}
                        aria-label="حذف هزینه"
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

      {meta.last_page > 1 && (
        <div className="acc-pagination">
          <span>
            صفحهٔ {page} از {meta.last_page}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="acc-button"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
            >
              قبلی
            </button>
            <button
              type="button"
              className="acc-button"
              onClick={() => setPage(Math.min(meta.last_page, page + 1))}
              disabled={page >= meta.last_page}
            >
              بعدی
            </button>
          </div>
        </div>
      )}

      {modalOpen && (
        <Modal
          title={editingId === null ? "هزینهٔ جدید" : "ویرایش هزینه"}
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
            <span className="acc-label">عنوان هزینه *</span>
            <input
              className="acc-input"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="مثال: کرایهٔ پیک هفتهٔ اول"
            />
          </label>

          <div className="acc-grid">
            <label className="acc-field">
              <span className="acc-label">دسته *</span>
              <select
                className="acc-input"
                value={form.category}
                onChange={(event) => setForm({ ...form, category: event.target.value })}
              >
                {EXPENSE_CATEGORIES.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="acc-field">
              <span className="acc-label">مبلغ (تومان) *</span>
              <input
                className="acc-input"
                dir="ltr"
                inputMode="numeric"
                value={form.amount}
                onChange={(event) => setForm({ ...form, amount: event.target.value })}
              />
            </label>
          </div>

          <div className="acc-grid">
            <DateField
              label="تاریخ هزینه"
              value={form.spent_at}
              onChange={(value) => setForm({ ...form, spent_at: value })}
              required
            />

            <label className="acc-field">
              <span className="acc-label">تأمین‌کننده (اختیاری)</span>
              <select
                className="acc-input"
                value={form.supplier_id}
                onChange={(event) => setForm({ ...form, supplier_id: event.target.value })}
              >
                <option value="">بدون تأمین‌کننده</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="acc-field">
            <span className="acc-label">یادداشت</span>
            <textarea
              className="acc-input"
              rows={2}
              value={form.note}
              onChange={(event) => setForm({ ...form, note: event.target.value })}
            />
          </label>
        </Modal>
      )}
    </Panel>
  );
}
