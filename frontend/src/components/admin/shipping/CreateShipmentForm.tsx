import {
  FormEvent,
  useCallback,
  useState,
} from "react";
import {
  Calculator,
  Save,
} from "lucide-react";

import JalaliDatePicker from "../../JalaliDatePicker";
import { adminApi } from "../../../services/api";
import {
  formatAdminPrice,
  getAdminErrorMessage,
} from "../../../utils/adminFormat";

import {
  type StatusMeta,
  type OrderOption,
  type ShipmentDetail,
  type ShippingMethodRow,
  type QuoteResult,
  toNumber,
  gramsLabel,
  Field,
} from "./shippingShared";

export function CreateShipmentForm({
  methods,
  statuses,
  preset,
  onCancel,
  onCreated,
}: {
  methods: ShippingMethodRow[];
  statuses: StatusMeta[];
  preset: OrderOption | null;
  onCancel: () => void;
  onCreated: (shipment: ShipmentDetail, message: string) => void;
}) {
  const [orderSearch, setOrderSearch] = useState("");
  const [orderResults, setOrderResults] = useState<OrderOption[]>([]);
  const [searchingOrders, setSearchingOrders] = useState(false);

  const [orderId, setOrderId] = useState<string>(preset ? String(preset.id) : "");
  const [recipient, setRecipient] = useState(preset?.recipient_name ?? "");
  const [phone, setPhone] = useState(preset?.phone ?? "");
  const [subtotal, setSubtotal] = useState(toNumber(preset?.subtotal ?? preset?.total));

  const [status, setStatus] = useState("awaiting_packaging");
  const [methodId, setMethodId] = useState("");
  const [carrier, setCarrier] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const [cost, setCost] = useState("");
  const [weight, setWeight] = useState("");
  const [volumetric, setVolumetric] = useState("");
  const [packages, setPackages] = useState("1");
  const [expectedDelivery, setExpectedDelivery] = useState("");
  const [notes, setNotes] = useState("");

  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const searchOrders = useCallback(async (term: string) => {
    if (term.trim() === "") {
      setOrderResults([]);
      return;
    }

    setSearchingOrders(true);

    try {
      const response = await adminApi.get("/admin/orders", {
        params: { search: term.trim(), per_page: 8 },
      });

      const payload = response.data?.data;
      const list = Array.isArray(payload?.data) ? payload.data : [];

      setOrderResults(list as OrderOption[]);
    } catch {
      setOrderResults([]);
    } finally {
      setSearchingOrders(false);
    }
  }, []);

  async function pickOrder(order: OrderOption) {
    setOrderId(String(order.id));
    setRecipient(order.recipient_name ?? "");
    setPhone(order.phone ?? "");
    setSubtotal(toNumber(order.subtotal ?? order.total));
    setOrderResults([]);
    setOrderSearch(order.order_number);

    try {
      const response = await adminApi.get(
        `/admin/orders/${encodeURIComponent(order.order_number)}`,
      );
      const full = response.data?.data as
        | (OrderOption & {
            address?: string | null;
            postal_code?: string | null;
            province?: string | null;
            city?: string | null;
          })
        | undefined;

      if (full) {
        setRecipient((current) => current || (full.recipient_name ?? ""));
        setPhone((current) => current || (full.phone ?? ""));
        setAddress((current) => current || (full.address ?? ""));
        setPostalCode((current) => current || (full.postal_code ?? ""));
        setProvince((current) => current || (full.province ?? ""));
        setCity((current) => current || (full.city ?? ""));
      }
    } catch {
      /* اطلاعات تکمیلی در دسترس نبود؛ مقادیر دستی استفاده می‌شود. */
    }
  }

  async function calculateQuote() {
    setQuoting(true);

    try {
      const response = await adminApi.post("/admin/shipping/quote", {
        shipping_method_id: methodId ? Number(methodId) : null,
        province: province.trim() || null,
        city: city.trim() || null,
        weight_grams: weight ? Number(weight) : 0,
        subtotal: subtotal > 0 ? subtotal : 0,
      });

      const result = response.data?.data as QuoteResult;

      setQuote(result);
      setCost(String(toNumber(result.cost)));
    } catch (requestError) {
      setError(getAdminErrorMessage(requestError));
    } finally {
      setQuoting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) return;

    if (!orderId) {
      setError("ابتدا سفارش مرسوله را انتخاب کنید.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await adminApi.post("/admin/shipping/shipments", {
        order_id: Number(orderId),
        shipping_method_id: methodId ? Number(methodId) : null,
        status,
        carrier: carrier.trim() || null,
        recipient_name: recipient.trim() || null,
        phone: phone.trim() || null,
        province: province.trim() || null,
        city: city.trim() || null,
        address: address.trim() || null,
        postal_code: postalCode.trim() || null,
        tracking_code: trackingCode.trim() || null,
        cost: cost === "" ? null : Number(cost),
        weight_grams: weight === "" ? null : Number(weight),
        volumetric_weight_grams: volumetric === "" ? null : Number(volumetric),
        package_count: packages === "" ? 1 : Number(packages),
        notes: notes.trim() || null,
        expected_delivery_at: expectedDelivery || null,
      });

      onCreated(
        response.data?.data as ShipmentDetail,
        response.data?.message ?? "مرسوله ثبت شد.",
      );
    } catch (requestError) {
      setError(getAdminErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="admin-card">
      <div className="admin-card-head">
        <div>
          <h2 className="admin-card-title">ثبت مرسولهٔ جدید</h2>
          <p className="admin-card-desc">
            سفارش را جست‌وجو کنید؛ اطلاعات گیرنده از سفارش پر می‌شود و
            می‌توانید هزینه را با «محاسبهٔ هزینه» از تعرفه‌ها بگیرید.
          </p>
        </div>

        <button type="button" className="admin-btn admin-btn-sm" onClick={onCancel}>
          انصراف
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="admin-form-grid" style={{ marginBottom: 16 }}>
          <Field id="shipment-order" label="سفارش (جست‌وجو با شماره سفارش یا نام گیرنده)" full>
            <div className="admin-toolbar" style={{ marginBottom: 0 }}>
              <input
                id="shipment-order"
                className="admin-input"
                style={{ maxWidth: 320 }}
                value={orderSearch}
                placeholder="مثلاً ORD-20260101-0001"
                onChange={(event) => setOrderSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void searchOrders(orderSearch);
                  }
                }}
                dir="ltr"
              />
              <button
                type="button"
                className="admin-btn admin-btn-sm"
                onClick={() => void searchOrders(orderSearch)}
                disabled={searchingOrders}
              >
                {searchingOrders ? "در حال جست‌وجو..." : "جست‌وجوی سفارش"}
              </button>
              {orderId && (
                <span className="admin-badge admin-badge-green">
                  سفارش انتخاب شد (#{orderId})
                </span>
              )}
            </div>

            {orderResults.length > 0 && (
              <div className="admin-table-wrap" style={{ marginTop: 10 }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>شماره سفارش</th>
                      <th>گیرنده</th>
                      <th>مبلغ</th>
                      <th>وضعیت</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {orderResults.map((order) => (
                      <tr key={order.id}>
                        <td dir="ltr">{order.order_number}</td>
                        <td>{order.recipient_name ?? "—"}</td>
                        <td>{formatAdminPrice(order.total ?? 0)}</td>
                        <td>
                          <span className="admin-badge admin-badge-gray">
                            {order.status ?? "—"}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="admin-btn admin-btn-primary admin-btn-sm"
                            onClick={() => void pickOrder(order)}
                          >
                            انتخاب
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Field>
        </div>

        <div className="admin-form-grid admin-form-grid-3">
          <Field id="shipment-status" label="وضعیت اولیه">
            <select
              id="shipment-status"
              className="admin-select"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              {statuses.length === 0 ? (
                <option value="awaiting_packaging">آماده بسته‌بندی</option>
              ) : (
                statuses.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))
              )}
            </select>
          </Field>

          <Field id="shipment-method" label="روش ارسال">
            <select
              id="shipment-method"
              className="admin-select"
              value={methodId}
              onChange={(event) => setMethodId(event.target.value)}
            >
              <option value="">بدون روش مشخص</option>
              {methods.map((method) => (
                <option key={method.id} value={method.id}>
                  {method.name}
                  {method.is_active ? "" : " (غیرفعال)"}
                </option>
              ))}
            </select>
          </Field>

          <Field id="shipment-carrier" label="شرکت حمل‌ونقل">
            <input
              id="shipment-carrier"
              className="admin-input"
              value={carrier}
              onChange={(event) => setCarrier(event.target.value)}
              placeholder="مثلاً پست پیشتاز"
              maxLength={100}
            />
          </Field>

          <Field id="shipment-recipient" label="نام گیرنده">
            <input
              id="shipment-recipient"
              className="admin-input"
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
              maxLength={150}
            />
          </Field>

          <Field id="shipment-phone" label="شمارهٔ تماس گیرنده">
            <input
              id="shipment-phone"
              className="admin-input"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              dir="ltr"
              maxLength={30}
              placeholder="09xxxxxxxxx"
            />
          </Field>

          <Field id="shipment-province" label="استان">
            <input
              id="shipment-province"
              className="admin-input"
              value={province}
              onChange={(event) => setProvince(event.target.value)}
              maxLength={100}
            />
          </Field>

          <Field id="shipment-city" label="شهر">
            <input
              id="shipment-city"
              className="admin-input"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              maxLength={100}
            />
          </Field>

          <Field id="shipment-postal" label="کد پستی">
            <input
              id="shipment-postal"
              className="admin-input"
              value={postalCode}
              onChange={(event) => setPostalCode(event.target.value)}
              dir="ltr"
              maxLength={20}
            />
          </Field>

          <Field id="shipment-tracking" label="کد رهگیری">
            <input
              id="shipment-tracking"
              className="admin-input"
              value={trackingCode}
              onChange={(event) => setTrackingCode(event.target.value)}
              dir="ltr"
              maxLength={80}
            />
          </Field>

          <Field id="shipment-address" label="نشانی کامل" full>
            <textarea
              id="shipment-address"
              className="admin-textarea"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              rows={2}
              maxLength={2000}
            />
          </Field>

          <Field id="shipment-weight" label="وزن (گرم)">
            <input
              id="shipment-weight"
              type="number"
              min={0}
              className="admin-input"
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
              dir="ltr"
            />
          </Field>

          <Field id="shipment-volumetric" label="وزن حجمی (گرم)">
            <input
              id="shipment-volumetric"
              type="number"
              min={0}
              className="admin-input"
              value={volumetric}
              onChange={(event) => setVolumetric(event.target.value)}
              dir="ltr"
            />
          </Field>

          <Field id="shipment-packages" label="تعداد بسته">
            <input
              id="shipment-packages"
              type="number"
              min={1}
              className="admin-input"
              value={packages}
              onChange={(event) => setPackages(event.target.value)}
              dir="ltr"
            />
          </Field>

          <Field id="shipment-expected" label="تاریخ تحویل مورد انتظار (شمسی)">
            <JalaliDatePicker
              id="shipment-expected"
              value={expectedDelivery}
              onChange={(value) => setExpectedDelivery(value.slice(0, 10))}
              withTime={false}
              placeholder="انتخاب تاریخ تحویل"
            />
          </Field>

          <Field id="shipment-cost" label="هزینهٔ ارسال (تومان)">
            <div className="admin-toolbar" style={{ marginBottom: 0 }}>
              <input
                id="shipment-cost"
                type="number"
                min={0}
                className="admin-input"
                value={cost}
                onChange={(event) => setCost(event.target.value)}
                dir="ltr"
                placeholder="خالی = محاسبهٔ خودکار"
              />
              <button
                type="button"
                className="admin-btn admin-btn-sm"
                onClick={() => void calculateQuote()}
                disabled={quoting}
              >
                <Calculator size={14} />
                {quoting ? "..." : "محاسبه"}
              </button>
            </div>
          </Field>

          <Field id="shipment-notes" label="یادداشت داخلی" full>
            <textarea
              id="shipment-notes"
              className="admin-textarea"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={2}
              maxLength={2000}
            />
          </Field>
        </div>

        {quote && (
          <div className="admin-notice admin-notice-success" style={{ marginTop: 12 }}>
            <strong>نتیجهٔ استعلام تعرفه:</strong>{" "}
            {quote.is_free ? "ارسال رایگان" : formatAdminPrice(quote.cost)}
            {quote.zone ? ` · منطقه: ${quote.zone.label}` : ""}
            {quote.method ? ` · روش: ${quote.method.name}` : ""}
            {quote.weight_grams ? ` · وزن مبنا: ${gramsLabel(quote.weight_grams)}` : ""}
            {quote.reason ? ` · ${quote.reason}` : ""}
          </div>
        )}

        {error && (
          <div className="admin-notice admin-notice-error" style={{ marginTop: 12 }}>
            {error}
          </div>
        )}

        <div className="admin-toolbar" style={{ marginTop: 16, marginBottom: 0 }}>
          <div className="admin-toolbar-spacer" />
          <button type="button" className="admin-btn" onClick={onCancel} disabled={saving}>
            انصراف
          </button>
          <button
            type="submit"
            className="admin-btn admin-btn-primary"
            disabled={saving || !orderId}
          >
            <Save size={15} /> {saving ? "در حال ثبت..." : "ثبت مرسوله"}
          </button>
        </div>
      </form>
    </section>
  );
}
