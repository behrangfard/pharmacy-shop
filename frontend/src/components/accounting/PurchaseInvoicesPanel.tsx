import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, Pencil, Plus, RefreshCw, Trash2, Wallet } from "lucide-react";

import { adminApi } from "../../services/api";
import { getAdminErrorMessage } from "../../utils/adminFormat";
import {
  DateField,
  EMPTY_TODAY,
  EmptyState,
  FlashAlert,
  Modal,
  PAYMENT_STATUS_LABELS,
  Panel,
  dateValue,
  money,
  num,
  useDebouncedValue,
  useFlash,
  type InvoiceItem,
  type PurchaseInvoice,
  type Supplier,
} from "./accountingUi";

type ProductOption = {
  id: number;
  name: string;
  sku: string;
  stock: number;
  price: string | number;
  cost_price: string | number | null;
};

type FormItem = {
  key: string;
  product_id: number | null;
  title: string;
  quantity: string;
  unit_cost: string;
  discount: string;
};

type InvoiceForm = {
  invoice_number: string;
  supplier_id: string;
  issued_at: string;
  discount: string;
  shipping_cost: string;
  tax_amount: string;
  paid_amount: string;
  note: string;
  items: FormItem[];
};

const rowKey = () => `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

const newItem = (): FormItem => ({
  key: rowKey(),
  product_id: null,
  title: "",
  quantity: "1",
  unit_cost: "",
  discount: "0",
});

const emptyForm = (): InvoiceForm => ({
  invoice_number: "",
  supplier_id: "",
  issued_at: EMPTY_TODAY(),
  discount: "0",
  shipping_cost: "0",
  tax_amount: "0",
  paid_amount: "0",
  note: "",
  items: [newItem()],
});

const lineTotal = (item: FormItem) =>
  Math.max(Number(item.quantity || 0) * Number(item.unit_cost || 0) - Number(item.discount || 0), 0);

const statusBadge = (status: string) =>
  status === "paid" ? "acc-badge is-ok" : status === "partial" ? "acc-badge is-warn" : "acc-badge is-bad";

/** فاکتورهای خرید: ثبت کالا، افزایش موجودی و محاسبهٔ بدهی به تأمین‌کننده. */
export default function PurchaseInvoicesPanel({ suppliers }: { suppliers: Supplier[] }) {
  const [rows, setRows] = useState<PurchaseInvoice[]>([]);
  const [meta, setMeta] = useState({ last_page: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim());
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const { flash, success, error } = useFlash();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<InvoiceForm>(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [productQuery, setProductQuery] = useState("");
  const debouncedProductQuery = useDebouncedValue(productQuery.trim(), 350);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);

  const [paymentFor, setPaymentFor] = useState<PurchaseInvoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("0");
  const [paymentBusy, setPaymentBusy] = useState(false);

  const [details, setDetails] = useState<PurchaseInvoice | null>(null);

  const load = useCallback(
    async (targetPage = page) => {
      setLoading(true);

      try {
        const response = await adminApi.get<{
          data: { data: PurchaseInvoice[]; last_page: number; total: number };
        }>("/admin/accounting/purchase-invoices", {
          params: {
            page: targetPage,
            search: search || undefined,
            payment_status: statusFilter || undefined,
          },
        });

        setRows(response.data.data?.data ?? []);
        setMeta({
          last_page: response.data.data?.last_page ?? 1,
          total: response.data.data?.total ?? 0,
        });
      } catch (caught) {
        error(getAdminErrorMessage(caught, "دریافت فاکتورها انجام نشد."));
      } finally {
        setLoading(false);
      }
    },
    [page, search, statusFilter, error],
  );

  useEffect(() => {
    void load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, page]);

  useEffect(() => {
    if (!modalOpen) return;

    let active = true;

    void (async () => {
      try {
        const response = await adminApi.get<{ data: ProductOption[] }>(
          "/admin/accounting/products",
          { params: { search: debouncedProductQuery || undefined } },
        );

        if (active) {
          setProductOptions(response.data.data ?? []);
        }
      } catch {
        // خطای جست‌وجوی محصول، فرم را متوقف نمی‌کند.
      }
    })();

    return () => {
      active = false;
    };
  }, [modalOpen, debouncedProductQuery]);

  const totals = useMemo(() => {
    const itemsTotal = form.items.reduce((sum, item) => sum + lineTotal(item), 0);
    const total = Math.max(
      itemsTotal - Number(form.discount || 0) + Number(form.shipping_cost || 0) + Number(form.tax_amount || 0),
      0,
    );

    return { itemsTotal, total };
  }, [form]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setFormError("");
    setProductQuery("");
    setModalOpen(true);
  };

  const openEdit = async (invoice: PurchaseInvoice) => {
    setFormError("");
    setProductQuery("");

    try {
      const response = await adminApi.get<{ data: PurchaseInvoice }>(
        `/admin/accounting/purchase-invoices/${invoice.id}`,
      );
      const data = response.data.data;

      setEditingId(data.id);
      setForm({
        invoice_number: data.invoice_number,
        supplier_id: data.supplier_id ? String(data.supplier_id) : "",
        issued_at: dateValue(data.issued_at),
        discount: String(data.discount ?? 0),
        shipping_cost: String(data.shipping_cost ?? 0),
        tax_amount: String(data.tax_amount ?? 0),
        paid_amount: String(data.paid_amount ?? 0),
        note: data.note ?? "",
        items: (data.items ?? []).map((item: InvoiceItem) => ({
          key: rowKey(),
          product_id: item.product_id ?? null,
          title: item.title ?? "",
          quantity: String(item.quantity ?? 1),
          unit_cost: String(item.unit_cost ?? 0),
          discount: String(item.discount ?? 0),
        })),
      });
      setModalOpen(true);
    } catch (caught) {
      error(getAdminErrorMessage(caught, "دریافت فاکتور انجام نشد."));
    }
  };

  const showDetails = async (invoice: PurchaseInvoice) => {
    try {
      const response = await adminApi.get<{ data: PurchaseInvoice }>(
        `/admin/accounting/purchase-invoices/${invoice.id}`,
      );
      setDetails(response.data.data);
    } catch (caught) {
      error(getAdminErrorMessage(caught, "دریافت جزئیات فاکتور انجام نشد."));
    }
  };

  const updateItem = (key: string, patch: Partial<FormItem>) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    }));
  };

  const selectProduct = (key: string, productId: string) => {
    if (productId === "") {
      updateItem(key, { product_id: null });
      return;
    }

    const product = productOptions.find((option) => option.id === Number(productId));

    updateItem(key, {
      product_id: Number(productId),
      title: product?.name ?? "",
      unit_cost:
        product?.cost_price !== null && product?.cost_price !== undefined
          ? String(product.cost_price)
          : "",
    });
  };

  const save = async () => {
    if (saving) return;

    if (form.issued_at === "") {
      setFormError("تاریخ فاکتور را وارد کنید.");
      return;
    }

    if (form.items.length === 0) {
      setFormError("حداقل یک قلم به فاکتور اضافه کنید.");
      return;
    }

    const invalid = form.items.some(
      (item) => item.unit_cost === "" || Number(item.quantity) < 1,
    );

    if (invalid) {
      setFormError("تعداد و قیمت خرید همهٔ اقلام را کامل کنید.");
      return;
    }

    setSaving(true);
    setFormError("");

    const payload = {
      invoice_number: form.invoice_number.trim() === "" ? null : form.invoice_number.trim(),
      supplier_id: form.supplier_id === "" ? null : Number(form.supplier_id),
      issued_at: form.issued_at,
      discount: Number(form.discount || 0),
      shipping_cost: Number(form.shipping_cost || 0),
      tax_amount: Number(form.tax_amount || 0),
      paid_amount: Number(form.paid_amount || 0),
      note: form.note,
      items: form.items.map((item) => ({
        product_id: item.product_id,
        title: item.title,
        quantity: Number(item.quantity || 1),
        unit_cost: Number(item.unit_cost || 0),
        discount: Number(item.discount || 0),
      })),
    };

    try {
      if (editingId === null) {
        await adminApi.post("/admin/accounting/purchase-invoices", payload);
        success("فاکتور خرید ثبت شد و موجودی محصولات افزایش یافت.");
      } else {
        await adminApi.put(`/admin/accounting/purchase-invoices/${editingId}`, payload);
        success("فاکتور ویرایش شد و موجودی به‌روزرسانی شد.");
      }

      setModalOpen(false);
      await load(editingId === null ? 1 : page);
    } catch (caught) {
      setFormError(getAdminErrorMessage(caught, "ذخیرهٔ فاکتور انجام نشد."));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (invoice: PurchaseInvoice) => {
    if (
      !window.confirm(
        `فاکتور ${invoice.invoice_number} حذف شود؟ موجودی اقلام متصل به محصول از انبار کم می‌شود.`,
      )
    ) {
      return;
    }

    try {
      await adminApi.delete(`/admin/accounting/purchase-invoices/${invoice.id}`);
      success("فاکتور حذف و موجودی برگشت داده شد.");
      await load(page);
    } catch (caught) {
      error(getAdminErrorMessage(caught, "حذف فاکتور انجام نشد."));
    }
  };

  const openPayment = (invoice: PurchaseInvoice) => {
    setPaymentFor(invoice);
    setPaymentAmount(String(invoice.paid_amount ?? 0));
  };

  const submitPayment = async () => {
    if (!paymentFor || paymentBusy) return;

    setPaymentBusy(true);

    try {
      await adminApi.patch(`/admin/accounting/purchase-invoices/${paymentFor.id}/payment`, {
        paid_amount: Number(paymentAmount || 0),
      });
      success("وضعیت پرداخت فاکتور ثبت شد.");
      setPaymentFor(null);
      await load(page);
    } catch (caught) {
      error(getAdminErrorMessage(caught, "ثبت پرداخت انجام نشد."));
    } finally {
      setPaymentBusy(false);
    }
  };

  return (
    <Panel
      title="فاکتورهای خرید"
      description="با ثبت فاکتور، موجودی محصولات انتخاب‌شده افزایش می‌یابد و قیمت خرید (بهای تمام‌شده) آن‌ها به‌روز می‌شود."
      actions={
        <>
          <button type="button" className="acc-button" onClick={() => void load(page)}>
            <RefreshCw size={15} aria-hidden="true" /> به‌روزرسانی
          </button>
          <button type="button" className="acc-button acc-button-primary" onClick={openCreate}>
            <Plus size={15} aria-hidden="true" /> فاکتور خرید جدید
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
          placeholder="جست‌وجوی شماره فاکتور یا نام تأمین‌کننده…"
          aria-label="جست‌وجوی فاکتور"
        />

        <select
          className="acc-input"
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value);
            setPage(1);
          }}
          aria-label="وضعیت پرداخت"
        >
          <option value="">همهٔ وضعیت‌ها</option>
          {Object.entries(PAYMENT_STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <EmptyState>در حال دریافت فاکتورها…</EmptyState>
      ) : rows.length === 0 ? (
        <EmptyState>
          هنوز فاکتور خریدی ثبت نشده است.
          <br />
          با دکمهٔ «فاکتور خرید جدید» کالاها را وارد کنید تا موجودی و قیمت خرید ثبت شود.
        </EmptyState>
      ) : (
        <div className="acc-table-wrap">
          <table className="acc-table">
            <thead>
              <tr>
                <th>شماره</th>
                <th>تاریخ</th>
                <th>تأمین‌کننده</th>
                <th>اقلام</th>
                <th>مبلغ کل</th>
                <th>پرداخت‌شده</th>
                <th>مانده</th>
                <th>وضعیت</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((invoice) => (
                <tr key={invoice.id}>
                  <td dir="ltr">{invoice.invoice_number}</td>
                  <td>{dateValue(invoice.issued_at)}</td>
                  <td>{invoice.supplier?.name || "—"}</td>
                  <td>{num(invoice.items_count)}</td>
                  <td>{money(invoice.total)}</td>
                  <td>{money(invoice.paid_amount)}</td>
                  <td>
                    {money(Number(invoice.total) - Number(invoice.paid_amount))}
                  </td>
                  <td>
                    <span className={statusBadge(invoice.payment_status)}>
                      {PAYMENT_STATUS_LABELS[invoice.payment_status] ?? invoice.payment_status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        type="button"
                        className="acc-button"
                        onClick={() => void showDetails(invoice)}
                        title="جزئیات"
                      >
                        <Eye size={14} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="acc-button"
                        onClick={() => openPayment(invoice)}
                        title="ثبت پرداخت"
                      >
                        <Wallet size={14} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="acc-button"
                        onClick={() => void openEdit(invoice)}
                        aria-label="ویرایش فاکتور"
                      >
                        <Pencil size={14} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="acc-button acc-button-danger"
                        onClick={() => void remove(invoice)}
                        aria-label="حذف فاکتور"
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
            صفحهٔ {page} از {meta.last_page} — {num(meta.total)} فاکتور
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
          title={editingId === null ? "فاکتور خرید جدید" : `ویرایش فاکتور ${form.invoice_number}`}
          subtitle="هر قلم که به محصول وصل باشد، موجودی آن را افزایش می‌دهد."
          onClose={() => setModalOpen(false)}
          busy={saving}
          wide
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
                {saving ? "در حال ذخیره…" : editingId === null ? "ثبت فاکتور" : "ذخیرهٔ تغییرات"}
              </button>
            </>
          }
        >
          {formError && <div className="acc-alert is-error">{formError}</div>}

          <div className="acc-grid">
            <label className="acc-field">
              <span className="acc-label">شماره فاکتور تأمین‌کننده</span>
              <input
                className="acc-input"
                dir="ltr"
                value={form.invoice_number}
                onChange={(event) => setForm({ ...form, invoice_number: event.target.value })}
                placeholder="خالی بماند، خودکار ساخته می‌شود"
              />
            </label>

            <label className="acc-field">
              <span className="acc-label">تأمین‌کننده</span>
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

            <DateField
              label="تاریخ فاکتور"
              value={form.issued_at}
              onChange={(value) => setForm({ ...form, issued_at: value })}
              required
            />
          </div>

          <div className="acc-field">
            <span className="acc-label">جست‌وجوی محصول برای انتخاب در اقلام</span>
            <input
              className="acc-input"
              value={productQuery}
              onChange={(event) => setProductQuery(event.target.value)}
              placeholder="نام یا کد محصول…"
            />
            <span className="acc-hint">
              برای کالایی که در سایت نیست، قلم را بدون انتخاب محصول ثبت کنید (روی موجودی اثر ندارد) و
              سپس محصول را از بخش محصولات یا فایل اکسل اضافه کنید.
            </span>
          </div>

          <div className="acc-items">
            {form.items.map((item, index) => (
              <div className="acc-item-row" key={item.key}>
                <div className="acc-item-grid">
                  <label className="acc-field" style={{ gridColumn: "1 / -1" }}>
                    <span className="acc-label">محصول #{index + 1}</span>
                    <select
                      className="acc-input"
                      value={item.product_id ?? ""}
                      onChange={(event) => selectProduct(item.key, event.target.value)}
                    >
                      <option value="">— بدون اتصال به محصول —</option>
                      {productOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name} ({option.sku}) — موجودی {num(option.stock)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="acc-field" style={{ gridColumn: "1 / -1" }}>
                    <span className="acc-label">عنوان قلم</span>
                    <input
                      className="acc-input"
                      value={item.title}
                      onChange={(event) => updateItem(item.key, { title: event.target.value })}
                      placeholder="نام کالا در فاکتور"
                    />
                  </label>

                  <label className="acc-field">
                    <span className="acc-label">تعداد</span>
                    <input
                      className="acc-input"
                      dir="ltr"
                      inputMode="numeric"
                      value={item.quantity}
                      onChange={(event) => updateItem(item.key, { quantity: event.target.value })}
                    />
                  </label>

                  <label className="acc-field">
                    <span className="acc-label">قیمت خرید واحد</span>
                    <input
                      className="acc-input"
                      dir="ltr"
                      inputMode="numeric"
                      value={item.unit_cost}
                      onChange={(event) => updateItem(item.key, { unit_cost: event.target.value })}
                    />
                  </label>

                  <label className="acc-field">
                    <span className="acc-label">تخفیف قلم</span>
                    <input
                      className="acc-input"
                      dir="ltr"
                      inputMode="numeric"
                      value={item.discount}
                      onChange={(event) => updateItem(item.key, { discount: event.target.value })}
                    />
                  </label>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span className="acc-item-total">جمع قلم: {money(lineTotal(item))}</span>

                  <button
                    type="button"
                    className="acc-button acc-button-danger"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        items: current.items.filter((row) => row.key !== item.key),
                      }))
                    }
                    disabled={form.items.length === 1}
                  >
                    <Trash2 size={14} aria-hidden="true" /> حذف قلم
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="acc-button"
            onClick={() =>
              setForm((current) => ({ ...current, items: [...current.items, newItem()] }))
            }
          >
            <Plus size={15} aria-hidden="true" /> افزودن قلم
          </button>

          <div className="acc-grid">
            <label className="acc-field">
              <span className="acc-label">تخفیف کل فاکتور</span>
              <input
                className="acc-input"
                dir="ltr"
                inputMode="numeric"
                value={form.discount}
                onChange={(event) => setForm({ ...form, discount: event.target.value })}
              />
            </label>

            <label className="acc-field">
              <span className="acc-label">باربری / کرایهٔ حمل خرید</span>
              <input
                className="acc-input"
                dir="ltr"
                inputMode="numeric"
                value={form.shipping_cost}
                onChange={(event) => setForm({ ...form, shipping_cost: event.target.value })}
              />
            </label>

            <label className="acc-field">
              <span className="acc-label">مالیات فاکتور</span>
              <input
                className="acc-input"
                dir="ltr"
                inputMode="numeric"
                value={form.tax_amount}
                onChange={(event) => setForm({ ...form, tax_amount: event.target.value })}
              />
            </label>

            <label className="acc-field">
              <span className="acc-label">پرداخت‌شده به تأمین‌کننده</span>
              <input
                className="acc-input"
                dir="ltr"
                inputMode="numeric"
                value={form.paid_amount}
                onChange={(event) => setForm({ ...form, paid_amount: event.target.value })}
              />
            </label>
          </div>

          <div className="acc-stats">
            <div className="acc-stat">
              <div className="acc-stat-label">جمع اقلام</div>
              <div className="acc-stat-value">{money(totals.itemsTotal)}</div>
            </div>
            <div className="acc-stat is-good">
              <div className="acc-stat-label">مبلغ نهایی فاکتور</div>
              <div className="acc-stat-value">{money(totals.total)}</div>
            </div>
            <div className="acc-stat">
              <div className="acc-stat-label">مانده بدهی پس از این پرداخت</div>
              <div className="acc-stat-value">
                {money(Math.max(totals.total - Number(form.paid_amount || 0), 0))}
              </div>
            </div>
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

      {paymentFor && (
        <Modal
          title="ثبت پرداخت فاکتور"
          subtitle={`فاکتور ${paymentFor.invoice_number} — مبلغ کل ${money(paymentFor.total)}`}
          onClose={() => setPaymentFor(null)}
          busy={paymentBusy}
          footer={
            <>
              <button
                type="button"
                className="acc-button"
                onClick={() => setPaymentFor(null)}
                disabled={paymentBusy}
              >
                انصراف
              </button>
              <button
                type="button"
                className="acc-button acc-button-primary"
                onClick={() => void submitPayment()}
                disabled={paymentBusy}
              >
                {paymentBusy ? "در حال ثبت…" : "ثبت پرداخت"}
              </button>
            </>
          }
        >
          <label className="acc-field">
            <span className="acc-label">مبلغ پرداخت‌شده تا امروز (تومان)</span>
            <input
              className="acc-input"
              dir="ltr"
              inputMode="numeric"
              value={paymentAmount}
              onChange={(event) => setPaymentAmount(event.target.value)}
            />
            <span className="acc-hint">
              ماندهٔ فعلی: {money(Number(paymentFor.total) - Number(paymentFor.paid_amount))}
            </span>
          </label>
        </Modal>
      )}

      {details && (
        <Modal
          title={`فاکتور ${details.invoice_number}`}
          subtitle={`${details.supplier?.name ?? "بدون تأمین‌کننده"} — تاریخ ${dateValue(details.issued_at)}`}
          onClose={() => setDetails(null)}
          wide
          footer={
            <button type="button" className="acc-button" onClick={() => setDetails(null)}>
              بستن
            </button>
          }
        >
          <div className="acc-table-wrap">
            <table className="acc-table">
              <thead>
                <tr>
                  <th>کالا</th>
                  <th>تعداد</th>
                  <th>قیمت خرید</th>
                  <th>تخفیف</th>
                  <th>جمع</th>
                </tr>
              </thead>
              <tbody>
                {(details.items ?? []).map((item, index) => (
                  <tr key={item.id ?? index}>
                    <td className="wrap">
                      {item.title}
                      {item.product && (
                        <span className="acc-badge is-ok" style={{ marginInlineStart: 6 }}>
                          متصل به محصول
                        </span>
                      )}
                    </td>
                    <td>{num(item.quantity)}</td>
                    <td>{money(item.unit_cost)}</td>
                    <td>{money(item.discount)}</td>
                    <td>{money(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="acc-stats">
            <div className="acc-stat">
              <div className="acc-stat-label">جمع اقلام</div>
              <div className="acc-stat-value">{money(details.items_total)}</div>
            </div>
            <div className="acc-stat">
              <div className="acc-stat-label">باربری</div>
              <div className="acc-stat-value">{money(details.shipping_cost)}</div>
            </div>
            <div className="acc-stat is-good">
              <div className="acc-stat-label">مبلغ نهایی</div>
              <div className="acc-stat-value">{money(details.total)}</div>
            </div>
            <div className="acc-stat">
              <div className="acc-stat-label">مانده بدهی</div>
              <div className="acc-stat-value">
                {money(Number(details.total) - Number(details.paid_amount))}
              </div>
            </div>
          </div>

          {details.note && <p className="acc-subtitle">{details.note}</p>}
        </Modal>
      )}
    </Panel>
  );
}
