import {
  FormEvent,
  useState,
} from "react";
import {
  CheckCircle2,
  ClipboardList,
  Package,
  Save,
  Send,
  Tag,
  X,
} from "lucide-react";

import JalaliDatePicker from "../../JalaliDatePicker";
import { adminApi } from "../../../services/api";
import {
  formatAdminDate,
  formatAdminNumber,
  formatAdminPrice,
  getAdminErrorMessage,
} from "../../../utils/adminFormat";

import {
  type Notice,
  type StatusMeta,
  type ShipmentDetail,
  type ShippingMethodRow,
  type PrintJob,
  DELIVERY_FAILED,
  RETURNED_STATUS,
  toNumber,
  gramsLabel,
  statusBadge,
  statusOf,
  Field,
} from "./shippingShared";

/* ------------------------------------------------------------------ */
/* پنل جزئیات مرسوله                                                   */
/* ------------------------------------------------------------------ */

export function ShipmentDetailPanel({
  shipment,
  statuses,
  methods,
  onClose,
  onNotify,
  onUpdated,
  onPrint,
}: {
  shipment: ShipmentDetail;
  statuses: StatusMeta[];
  methods: ShippingMethodRow[];
  onClose: () => void;
  onNotify: (notice: Notice) => void;
  onUpdated: (shipment: ShipmentDetail, message: string) => void;
  onPrint: (job: PrintJob) => void;
}) {
  const [statusForm, setStatusForm] = useState({
    status: shipment.status,
    tracking_code: shipment.tracking_code ?? "",
    note: "",
    delay_reason: shipment.delay_reason ?? "",
    return_reason: shipment.return_reason ?? "",
  });
  const [savingStatus, setSavingStatus] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [channel, setChannel] = useState("sms");
  const [editing, setEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    recipient_name: shipment.recipient_name,
    phone: shipment.phone ?? "",
    province: shipment.province ?? "",
    city: shipment.city ?? "",
    address: shipment.address,
    postal_code: shipment.postal_code ?? "",
    shipping_method_id: shipment.shipping_method_id
      ? String(shipment.shipping_method_id)
      : "",
    carrier: shipment.carrier ?? "",
    tracking_code: shipment.tracking_code ?? "",
    cost: String(toNumber(shipment.cost)),
    weight_grams: shipment.weight_grams ? String(shipment.weight_grams) : "",
    volumetric_weight_grams: shipment.volumetric_weight_grams
      ? String(shipment.volumetric_weight_grams)
      : "",
    package_count: String(shipment.package_count ?? 1),
    expected_delivery_at: shipment.expected_delivery_at
      ? shipment.expected_delivery_at.slice(0, 10)
      : "",
    notes: shipment.notes ?? "",
  });
  const [error, setError] = useState("");

  const meta = statusOf(statuses, shipment.status);

  async function updateStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (savingStatus) return;

    setSavingStatus(true);
    setError("");

    try {
      const response = await adminApi.patch(
        `/admin/shipping/shipments/${shipment.id}/status`,
        {
          status: statusForm.status,
          tracking_code: statusForm.tracking_code.trim() || null,
          note: statusForm.note.trim() || null,
          delay_reason: statusForm.delay_reason.trim() || null,
          return_reason: statusForm.return_reason.trim() || null,
        },
      );

      onUpdated(
        response.data?.data as ShipmentDetail,
        response.data?.message ?? "وضعیت مرسوله به‌روزرسانی شد.",
      );
      setStatusForm((current) => ({ ...current, note: "" }));
    } catch (requestError) {
      setError(getAdminErrorMessage(requestError));
    } finally {
      setSavingStatus(false);
    }
  }

  async function notifyCustomer() {
    if (notifying) return;

    setNotifying(true);

    try {
      const response = await adminApi.post(
        `/admin/shipping/shipments/${shipment.id}/notify`,
        { channel },
      );

      onNotify({
        type: "success",
        text: response.data?.message ?? "اطلاع‌رسانی برای مشتری ثبت شد.",
      });
    } catch (requestError) {
      onNotify({ type: "error", text: getAdminErrorMessage(requestError) });
    } finally {
      setNotifying(false);
    }
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (savingEdit) return;

    setSavingEdit(true);
    setError("");

    try {
      const response = await adminApi.put(
        `/admin/shipping/shipments/${shipment.id}`,
        {
          recipient_name: editForm.recipient_name.trim(),
          phone: editForm.phone.trim() || null,
          province: editForm.province.trim() || null,
          city: editForm.city.trim() || null,
          address: editForm.address.trim(),
          postal_code: editForm.postal_code.trim() || null,
          shipping_method_id: editForm.shipping_method_id
            ? Number(editForm.shipping_method_id)
            : null,
          carrier: editForm.carrier.trim() || null,
          tracking_code: editForm.tracking_code.trim() || null,
          cost: editForm.cost === "" ? 0 : Number(editForm.cost),
          weight_grams: editForm.weight_grams === "" ? null : Number(editForm.weight_grams),
          volumetric_weight_grams:
            editForm.volumetric_weight_grams === ""
              ? null
              : Number(editForm.volumetric_weight_grams),
          package_count:
            editForm.package_count === "" ? 1 : Number(editForm.package_count),
          expected_delivery_at: editForm.expected_delivery_at || null,
          notes: editForm.notes.trim() || null,
        },
      );

      onUpdated(
        response.data?.data as ShipmentDetail,
        response.data?.message ?? "اطلاعات مرسوله ذخیره شد.",
      );
      setEditing(false);
    } catch (requestError) {
      setError(getAdminErrorMessage(requestError));
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <section className="admin-card" style={{ borderTop: "3px solid #2563eb" }}>
      <div className="admin-card-head">
        <div>
          <h2 className="admin-card-title" dir="ltr">
            {shipment.shipment_number}
          </h2>
          <p className="admin-card-desc">
            {statusBadge(meta.label, meta.tone)}
            {shipment.is_delayed && (
              <span className="admin-badge admin-badge-red" style={{ marginInlineStart: 6 }}>
                تأخیر
              </span>
            )}
            {shipment.order_number && (
              <span style={{ marginInlineStart: 8 }} dir="ltr">
                سفارش {shipment.order_number}
              </span>
            )}
          </p>
        </div>

        <div className="admin-row-actions">
          <button
            type="button"
            className="admin-btn admin-btn-sm"
            onClick={() => onPrint({ kind: "labels", shipments: [shipment] })}
          >
            <Tag size={14} /> برچسب
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-sm"
            onClick={() => onPrint({ kind: "packing", shipment })}
          >
            <Package size={14} /> برگهٔ بسته‌بندی
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-sm"
            onClick={() => onPrint({ kind: "invoice", shipment })}
          >
            <ClipboardList size={14} /> فاکتور
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-sm"
            onClick={() => setEditing((current) => !current)}
          >
            {editing ? "بستن ویرایش" : "ویرایش اطلاعات"}
          </button>
          <button type="button" className="admin-btn admin-btn-sm" onClick={onClose}>
            <X size={14} /> بستن
          </button>
        </div>
      </div>

      <div className="admin-form-grid admin-form-grid-3">
        <div>
          <div className="admin-label">گیرنده</div>
          <div>{shipment.recipient_name}</div>
          {shipment.phone && (
            <div dir="ltr" style={{ color: "#6b7280", fontSize: 13 }}>
              {shipment.phone}
            </div>
          )}
        </div>

        <div>
          <div className="admin-label">مقصد</div>
          <div>
            {[shipment.province, shipment.city].filter(Boolean).join(" · ") || "—"}
          </div>
          <div style={{ color: "#6b7280", fontSize: 13 }}>{shipment.address}</div>
          {shipment.postal_code && (
            <div dir="ltr" style={{ color: "#6b7280", fontSize: 13 }}>
              کد پستی: {shipment.postal_code}
            </div>
          )}
        </div>

        <div>
          <div className="admin-label">روش ارسال و رهگیری</div>
          <div>{shipment.method_name ?? "—"}</div>
          <div style={{ color: "#6b7280", fontSize: 13 }}>
            حامل: {shipment.carrier ?? "—"}
          </div>
          <div dir="ltr" style={{ color: "#6b7280", fontSize: 13 }}>
            {shipment.tracking_code ?? "بدون کد رهگیری"}
          </div>
        </div>

        <div>
          <div className="admin-label">هزینه و وزن</div>
          <div>{formatAdminPrice(shipment.cost)}</div>
          <div style={{ color: "#6b7280", fontSize: 13 }}>
            وزن: {gramsLabel(shipment.weight_grams)} · حجمی:{" "}
            {gramsLabel(shipment.volumetric_weight_grams)} · بسته:{" "}
            {formatAdminNumber(shipment.package_count)}
          </div>
        </div>

        <div>
          <div className="admin-label">زمان‌ها</div>
          <div style={{ fontSize: 13 }}>
            ثبت: {formatAdminDate(shipment.created_at, true)}
          </div>
          <div style={{ fontSize: 13 }}>
            ارسال: {formatAdminDate(shipment.shipped_at, true)}
          </div>
          <div style={{ fontSize: 13 }}>
            تحویل: {formatAdminDate(shipment.delivered_at, true)}
          </div>
          <div style={{ fontSize: 13 }}>
            تحویل مورد انتظار: {formatAdminDate(shipment.expected_delivery_at)}
          </div>
        </div>

        <div>
          <div className="admin-label">اطلاع‌رسانی به مشتری</div>
          <div className="admin-toolbar" style={{ marginBottom: 0 }}>
            <select
              className="admin-select"
              style={{ maxWidth: 130 }}
              value={channel}
              onChange={(event) => setChannel(event.target.value)}
              aria-label="کانال اطلاع‌رسانی"
            >
              <option value="sms">پیامک</option>
              <option value="email">ایمیل</option>
            </select>
            <button
              type="button"
              className="admin-btn admin-btn-sm"
              onClick={() => void notifyCustomer()}
              disabled={notifying}
            >
              <Send size={14} /> {notifying ? "..." : "ارسال"}
            </button>
          </div>
        </div>
      </div>

      {shipment.notes && (
        <p className="admin-card-desc" style={{ marginTop: 12 }}>
          <strong>یادداشت:</strong> {shipment.notes}
        </p>
      )}

      {error && (
        <div className="admin-notice admin-notice-error" style={{ marginTop: 12 }}>
          {error}
        </div>
      )}

      <hr style={{ margin: "18px 0", border: 0, borderTop: "1px solid #e5e7eb" }} />

      <form onSubmit={updateStatus}>
        <h3 className="admin-card-title" style={{ fontSize: 15, marginBottom: 10 }}>
          تغییر وضعیت / ثبت رویداد
        </h3>

        <div className="admin-form-grid admin-form-grid-3">
          <Field id="status-update" label="وضعیت جدید">
            <select
              id="status-update"
              className="admin-select"
              value={statusForm.status}
              onChange={(event) =>
                setStatusForm((current) => ({ ...current, status: event.target.value }))
              }
            >
              {statuses.length === 0 ? (
                <option value={shipment.status}>{shipment.status}</option>
              ) : (
                statuses.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))
              )}
            </select>
          </Field>

          <Field id="status-tracking" label="کد رهگیری">
            <input
              id="status-tracking"
              className="admin-input"
              value={statusForm.tracking_code}
              onChange={(event) =>
                setStatusForm((current) => ({
                  ...current,
                  tracking_code: event.target.value,
                }))
              }
              dir="ltr"
              maxLength={80}
              placeholder="مثلاً 12345678901234567890"
            />
          </Field>

          <Field id="status-note" label="یادداشت رویداد">
            <input
              id="status-note"
              className="admin-input"
              value={statusForm.note}
              onChange={(event) =>
                setStatusForm((current) => ({ ...current, note: event.target.value }))
              }
              maxLength={500}
              placeholder="توضیح کوتاه برای تاریخچه"
            />
          </Field>

          {statusForm.status === DELIVERY_FAILED && (
            <Field id="status-delay" label="دلیل تأخیر / عدم تحویل" full>
              <input
                id="status-delay"
                className="admin-input"
                value={statusForm.delay_reason}
                onChange={(event) =>
                  setStatusForm((current) => ({
                    ...current,
                    delay_reason: event.target.value,
                  }))
                }
                maxLength={255}
                placeholder="مثلاً عدم پاسخگویی گیرنده / آدرس نامعتبر"
                required
              />
            </Field>
          )}

          {statusForm.status === RETURNED_STATUS && (
            <Field id="status-return" label="دلیل برگشت مرسوله" full>
              <input
                id="status-return"
                className="admin-input"
                value={statusForm.return_reason}
                onChange={(event) =>
                  setStatusForm((current) => ({
                    ...current,
                    return_reason: event.target.value,
                  }))
                }
                maxLength={255}
                placeholder="مثلاً مرجوعی توسط گیرنده"
                required
              />
            </Field>
          )}
        </div>

        <div className="admin-toolbar" style={{ marginTop: 12, marginBottom: 0 }}>
          <div className="admin-toolbar-spacer" />
          <button
            type="submit"
            className="admin-btn admin-btn-primary admin-btn-sm"
            disabled={savingStatus}
          >
            <CheckCircle2 size={14} />{" "}
            {savingStatus ? "در حال ذخیره..." : "ثبت وضعیت"}
          </button>
        </div>
      </form>

      {editing && (
        <form onSubmit={saveEdit} style={{ marginTop: 18 }}>
          <h3 className="admin-card-title" style={{ fontSize: 15, marginBottom: 10 }}>
            ویرایش اطلاعات مرسوله
          </h3>

          <div className="admin-form-grid admin-form-grid-3">
            <Field id="edit-recipient" label="نام گیرنده">
              <input
                id="edit-recipient"
                className="admin-input"
                value={editForm.recipient_name}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    recipient_name: event.target.value,
                  }))
                }
                maxLength={150}
                required
              />
            </Field>

            <Field id="edit-phone" label="شمارهٔ تماس">
              <input
                id="edit-phone"
                className="admin-input"
                value={editForm.phone}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, phone: event.target.value }))
                }
                dir="ltr"
                maxLength={30}
              />
            </Field>

            <Field id="edit-province" label="استان">
              <input
                id="edit-province"
                className="admin-input"
                value={editForm.province}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, province: event.target.value }))
                }
                maxLength={100}
              />
            </Field>

            <Field id="edit-city" label="شهر">
              <input
                id="edit-city"
                className="admin-input"
                value={editForm.city}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, city: event.target.value }))
                }
                maxLength={100}
              />
            </Field>

            <Field id="edit-postal" label="کد پستی">
              <input
                id="edit-postal"
                className="admin-input"
                value={editForm.postal_code}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    postal_code: event.target.value,
                  }))
                }
                dir="ltr"
                maxLength={20}
              />
            </Field>

            <Field id="edit-method" label="روش ارسال">
              <select
                id="edit-method"
                className="admin-select"
                value={editForm.shipping_method_id}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    shipping_method_id: event.target.value,
                  }))
                }
              >
                <option value="">بدون روش مشخص</option>
                {methods.map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field id="edit-address" label="نشانی" full>
              <textarea
                id="edit-address"
                className="admin-textarea"
                value={editForm.address}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, address: event.target.value }))
                }
                rows={2}
                maxLength={2000}
                required
              />
            </Field>

            <Field id="edit-carrier" label="شرکت حمل‌ونقل">
              <input
                id="edit-carrier"
                className="admin-input"
                value={editForm.carrier}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, carrier: event.target.value }))
                }
                maxLength={100}
              />
            </Field>

            <Field id="edit-tracking" label="کد رهگیری">
              <input
                id="edit-tracking"
                className="admin-input"
                value={editForm.tracking_code}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    tracking_code: event.target.value,
                  }))
                }
                dir="ltr"
                maxLength={80}
              />
            </Field>

            <Field id="edit-cost" label="هزینه (تومان)">
              <input
                id="edit-cost"
                type="number"
                min={0}
                className="admin-input"
                value={editForm.cost}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, cost: event.target.value }))
                }
                dir="ltr"
              />
            </Field>

            <Field id="edit-weight" label="وزن (گرم)">
              <input
                id="edit-weight"
                type="number"
                min={0}
                className="admin-input"
                value={editForm.weight_grams}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    weight_grams: event.target.value,
                  }))
                }
                dir="ltr"
              />
            </Field>

            <Field id="edit-volumetric" label="وزن حجمی (گرم)">
              <input
                id="edit-volumetric"
                type="number"
                min={0}
                className="admin-input"
                value={editForm.volumetric_weight_grams}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    volumetric_weight_grams: event.target.value,
                  }))
                }
                dir="ltr"
              />
            </Field>

            <Field id="edit-packages" label="تعداد بسته">
              <input
                id="edit-packages"
                type="number"
                min={1}
                className="admin-input"
                value={editForm.package_count}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    package_count: event.target.value,
                  }))
                }
                dir="ltr"
              />
            </Field>

            <Field id="edit-expected" label="تحویل مورد انتظار (شمسی)">
              <JalaliDatePicker
                id="edit-expected"
                value={editForm.expected_delivery_at}
                onChange={(value) =>
                  setEditForm((current) => ({
                    ...current,
                    expected_delivery_at: value.slice(0, 10),
                  }))
                }
                withTime={false}
                placeholder="انتخاب تاریخ تحویل"
              />
            </Field>

            <Field id="edit-notes" label="یادداشت داخلی" full>
              <textarea
                id="edit-notes"
                className="admin-textarea"
                value={editForm.notes}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, notes: event.target.value }))
                }
                rows={2}
                maxLength={2000}
              />
            </Field>
          </div>

          <div className="admin-toolbar" style={{ marginTop: 12, marginBottom: 0 }}>
            <div className="admin-toolbar-spacer" />
            <button
              type="button"
              className="admin-btn admin-btn-sm"
              onClick={() => setEditing(false)}
              disabled={savingEdit}
            >
              انصراف
            </button>
            <button
              type="submit"
              className="admin-btn admin-btn-primary admin-btn-sm"
              disabled={savingEdit}
            >
              <Save size={14} /> {savingEdit ? "در حال ذخیره..." : "ذخیرهٔ تغییرات"}
            </button>
          </div>
        </form>
      )}

      <hr style={{ margin: "18px 0", border: 0, borderTop: "1px solid #e5e7eb" }} />

      <h3 className="admin-card-title" style={{ fontSize: 15, marginBottom: 10 }}>
        تاریخچهٔ رویدادها
      </h3>

      {!shipment.events || shipment.events.length === 0 ? (
        <p className="admin-empty">هنوز رویدادی برای این مرسوله ثبت نشده است.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>زمان</th>
                <th>وضعیت</th>
                <th>یادداشت</th>
                <th>ثبت‌کننده</th>
              </tr>
            </thead>
            <tbody>
              {shipment.events.map((event) => {
                const eventMeta = statusOf(statuses, event.status);

                return (
                  <tr key={event.id}>
                    <td>{formatAdminDate(event.happened_at, true)}</td>
                    <td>{statusBadge(event.status_label ?? eventMeta.label, eventMeta.tone)}</td>
                    <td>{event.note ?? "—"}</td>
                    <td>{event.creator ?? "سیستم"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
