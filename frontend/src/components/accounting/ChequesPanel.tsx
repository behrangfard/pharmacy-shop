import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Pencil, Plus, RefreshCw, Trash2, XCircle } from "lucide-react";

import { adminApi } from "../../services/api";
import { getAdminErrorMessage } from "../../utils/adminFormat";
import {
  CHEQUE_STATUS_LABELS,
  DIRECTION_LABELS,
  DateField,
  EMPTY_TODAY,
  EmptyState,
  FlashAlert,
  Modal,
  Panel,
  dateValue,
  money,
  useDebouncedValue,
  useFlash,
  type Cheque,
  type Supplier,
} from "./accountingUi";

type ChequeForm = {
  direction: "paid" | "received";
  amount: string;
  due_date: string;
  bank_name: string;
  serial: string;
  party_name: string;
  supplier_id: string;
  status: Cheque["status"];
  note: string;
};

const emptyForm = (): ChequeForm => ({
  direction: "paid",
  amount: "",
  due_date: EMPTY_TODAY(),
  bank_name: "",
  serial: "",
  party_name: "",
  supplier_id: "",
  status: "pending",
  note: "",
});

const statusBadge = (status: Cheque["status"]) =>
  status === "cleared"
    ? "acc-badge is-ok"
    : status === "pending"
      ? "acc-badge is-warn"
      : status === "bounced"
        ? "acc-badge is-bad"
        : "acc-badge is-muted";

/** چک‌های پرداختی به تأمین‌کننده و دریافتی از مشتری. */
export default function ChequesPanel({ suppliers }: { suppliers: Supplier[] }) {
  const [rows, setRows] = useState<Cheque[]>([]);
  const [meta, setMeta] = useState({ paid_total: 0, received_total: 0, today: "", last_page: 1 });
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim());
  const [direction, setDirection] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const { flash, success, error } = useFlash();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ChequeForm>(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(
    async (targetPage = page) => {
      setLoading(true);

      try {
        const response = await adminApi.get<{
          data: { data: Cheque[]; last_page: number };
          meta: { paid_total: number; received_total: number; today: string };
        }>("/admin/accounting/cheques", {
          params: {
            page: targetPage,
            search: search || undefined,
            direction: direction || undefined,
            status: status || undefined,
          },
        });

        setRows(response.data.data?.data ?? []);
        setMeta({
          paid_total: response.data.meta?.paid_total ?? 0,
          received_total: response.data.meta?.received_total ?? 0,
          today: response.data.meta?.today ?? "",
          last_page: response.data.data?.last_page ?? 1,
        });
      } catch (caught) {
        error(getAdminErrorMessage(caught, "دریافت چک‌ها انجام نشد."));
      } finally {
        setLoading(false);
      }
    },
    [page, search, direction, status, error],
  );

  useEffect(() => {
    void load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, direction, status, page]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setFormError("");
    setModalOpen(true);
  };

  const openEdit = (cheque: Cheque) => {
    setEditingId(cheque.id);
    setForm({
      direction: cheque.direction,
      amount: String(cheque.amount),
      due_date: dateValue(cheque.due_date),
      bank_name: cheque.bank_name ?? "",
      serial: cheque.serial ?? "",
      party_name: cheque.party_name ?? "",
      supplier_id: cheque.supplier_id ? String(cheque.supplier_id) : "",
      status: cheque.status,
      note: cheque.note ?? "",
    });
    setFormError("");
    setModalOpen(true);
  };

  const save = async () => {
    if (saving) return;

    if (form.amount === "") {
      setFormError("مبلغ چک را وارد کنید.");
      return;
    }

    setSaving(true);
    setFormError("");

    const payload = {
      direction: form.direction,
      amount: Number(form.amount),
      due_date: form.due_date,
      bank_name: form.bank_name,
      serial: form.serial,
      party_name: form.party_name,
      supplier_id: form.supplier_id === "" ? null : Number(form.supplier_id),
      status: form.status,
      note: form.note,
    };

    try {
      if (editingId === null) {
        await adminApi.post("/admin/accounting/cheques", payload);
        success("چک ثبت شد.");
      } else {
        await adminApi.put(`/admin/accounting/cheques/${editingId}`, payload);
        success("اطلاعات چک به‌روزرسانی شد.");
      }

      setModalOpen(false);
      await load(editingId === null ? 1 : page);
    } catch (caught) {
      setFormError(getAdminErrorMessage(caught, "ذخیرهٔ چک انجام نشد."));
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (cheque: Cheque, next: Cheque["status"]) => {
    try {
      await adminApi.patch(`/admin/accounting/cheques/${cheque.id}/status`, { status: next });
      success(`وضعیت چک به «${CHEQUE_STATUS_LABELS[next]}» تغییر کرد.`);
      await load(page);
    } catch (caught) {
      error(getAdminErrorMessage(caught, "تغییر وضعیت چک انجام نشد."));
    }
  };

  const remove = async (cheque: Cheque) => {
    if (!window.confirm("این چک حذف شود؟")) return;

    try {
      await adminApi.delete(`/admin/accounting/cheques/${cheque.id}`);
      success("چک حذف شد.");
      await load(page);
    } catch (caught) {
      error(getAdminErrorMessage(caught, "حذف چک انجام نشد."));
    }
  };

  return (
    <Panel
      title="چک‌ها"
      description="چک‌های پرداختی به تأمین‌کنندگان و چک‌های دریافتی از مشتریان، با سررسید و وضعیت."
      actions={
        <>
          <button type="button" className="acc-button" onClick={() => void load(page)}>
            <RefreshCw size={15} aria-hidden="true" /> به‌روزرسانی
          </button>
          <button type="button" className="acc-button acc-button-primary" onClick={openCreate}>
            <Plus size={15} aria-hidden="true" /> چک جدید
          </button>
        </>
      }
    >
      <FlashAlert flash={flash} />

      <div className="acc-stats">
        <div className="acc-stat is-warn">
          <div className="acc-stat-label">چک‌های پرداختی در جریان</div>
          <div className="acc-stat-value">{money(meta.paid_total)}</div>
        </div>
        <div className="acc-stat is-good">
          <div className="acc-stat-label">چک‌های دریافتی در جریان</div>
          <div className="acc-stat-value">{money(meta.received_total)}</div>
        </div>
      </div>

      <div className="acc-grid">
        <input
          type="search"
          className="acc-input"
          value={searchInput}
          onChange={(event) => {
            setSearchInput(event.target.value);
            setPage(1);
          }}
          placeholder="جست‌وجوی طرف حساب، بانک یا شماره چک…"
          aria-label="جست‌وجوی چک"
        />

        <select
          className="acc-input"
          value={direction}
          onChange={(event) => {
            setDirection(event.target.value);
            setPage(1);
          }}
          aria-label="نوع چک"
        >
          <option value="">همهٔ چک‌ها</option>
          <option value="paid">پرداختی</option>
          <option value="received">دریافتی</option>
        </select>

        <select
          className="acc-input"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          aria-label="وضعیت چک"
        >
          <option value="">همهٔ وضعیت‌ها</option>
          {Object.entries(CHEQUE_STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <EmptyState>در حال دریافت چک‌ها…</EmptyState>
      ) : rows.length === 0 ? (
        <EmptyState>چکی با این فیلتر ثبت نشده است.</EmptyState>
      ) : (
        <div className="acc-table-wrap">
          <table className="acc-table">
            <thead>
              <tr>
                <th>نوع</th>
                <th>مبلغ</th>
                <th>سررسید</th>
                <th>طرف حساب</th>
                <th>بانک / سری</th>
                <th>وضعیت</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((cheque) => {
                const overdue =
                  cheque.status === "pending" &&
                  meta.today !== "" &&
                  dateValue(cheque.due_date) < meta.today;

                return (
                  <tr key={cheque.id}>
                    <td>{DIRECTION_LABELS[cheque.direction] ?? cheque.direction}</td>
                    <td>{money(cheque.amount)}</td>
                    <td>{dateValue(cheque.due_date)}</td>
                    <td>{cheque.party_name || cheque.supplier?.name || "—"}</td>
                    <td dir="auto">
                      {cheque.bank_name || "—"}
                      {cheque.serial ? ` / ${cheque.serial}` : ""}
                    </td>
                    <td>
                      <span className={overdue ? "acc-badge is-bad" : statusBadge(cheque.status)}>
                        {overdue ? "سررسید گذشته" : CHEQUE_STATUS_LABELS[cheque.status]}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        {cheque.status === "pending" && (
                          <>
                            <button
                              type="button"
                              className="acc-button"
                              onClick={() => void changeStatus(cheque, "cleared")}
                              title="پاس شد"
                            >
                              <CheckCircle2 size={14} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className="acc-button"
                              onClick={() => void changeStatus(cheque, "bounced")}
                              title="برگشت خورد"
                            >
                              <XCircle size={14} aria-hidden="true" />
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          className="acc-button"
                          onClick={() => openEdit(cheque)}
                          aria-label="ویرایش چک"
                        >
                          <Pencil size={14} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="acc-button acc-button-danger"
                          onClick={() => void remove(cheque)}
                          aria-label="حذف چک"
                        >
                          <Trash2 size={14} aria-hidden="true" />
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
          title={editingId === null ? "چک جدید" : "ویرایش چک"}
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

          <div className="acc-grid">
            <label className="acc-field">
              <span className="acc-label">نوع چک *</span>
              <select
                className="acc-input"
                value={form.direction}
                onChange={(event) =>
                  setForm({ ...form, direction: event.target.value as ChequeForm["direction"] })
                }
              >
                <option value="paid">پرداختی به تأمین‌کننده</option>
                <option value="received">دریافتی از مشتری</option>
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
              label="تاریخ سررسید"
              value={form.due_date}
              onChange={(value) => setForm({ ...form, due_date: value })}
              required
            />

            <label className="acc-field">
              <span className="acc-label">وضعیت</span>
              <select
                className="acc-input"
                value={form.status}
                onChange={(event) =>
                  setForm({ ...form, status: event.target.value as Cheque["status"] })
                }
              >
                {Object.entries(CHEQUE_STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="acc-grid">
            <label className="acc-field">
              <span className="acc-label">طرف حساب</span>
              <input
                className="acc-input"
                value={form.party_name}
                onChange={(event) => setForm({ ...form, party_name: event.target.value })}
              />
            </label>

            <label className="acc-field">
              <span className="acc-label">بانک</span>
              <input
                className="acc-input"
                value={form.bank_name}
                onChange={(event) => setForm({ ...form, bank_name: event.target.value })}
              />
            </label>

            <label className="acc-field">
              <span className="acc-label">شماره / سری چک</span>
              <input
                className="acc-input"
                dir="ltr"
                value={form.serial}
                onChange={(event) => setForm({ ...form, serial: event.target.value })}
              />
            </label>
          </div>

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
