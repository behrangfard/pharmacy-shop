import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  RotateCcw,
  Save,
  Truck,
} from "lucide-react";
import { adminApi } from "../services/api";
import { getAdminErrorMessage } from "../utils/adminFormat";
import { toPersianDigits } from "../utils/jalali";

type OrderStatusOption = {
  key: string;
  label: string;
};

type OrderStatusSmsOverview = {
  settings: {
    enabled: boolean;
    statuses: string[];
    template: string;
  };
  statuses: OrderStatusOption[];
  placeholders: string[];
  default_template: string;
  sms_available: boolean;
  store_name: string;
};

type OrderStatusSmsForm = {
  enabled: boolean;
  statuses: string[];
  template: string;
};

const PREVIEW_VALUES: Record<string, string> = {
  "{name}": "مشتری گرامی",
  "{order}": "ORD-14030101-ABC123",
  "{tracking}": "TRK-123456",
  "{total}": "۲۵۰٬۰۰۰ تومان",
};

/**
 * کارت «پیامک خودکار تغییر وضعیت سفارش» در صفحهٔ پیام‌رسانی.
 *
 * تنظیمات در جدول store_settings ذخیره می‌شود و با هر تغییر وضعیت سفارش،
 * پیامک انتخاب‌شده به شمارهٔ مشتری ارسال می‌گردد.
 */
function OrderStatusSmsCard() {
  const [overview, setOverview] = useState<OrderStatusSmsOverview | null>(null);
  const [form, setForm] = useState<OrderStatusSmsForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const applyOverview = useCallback((data: OrderStatusSmsOverview) => {
    setOverview(data);
    setForm({
      enabled: data.settings.enabled,
      statuses: data.settings.statuses,
      template: data.settings.template,
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const response = await adminApi.get("/admin/messaging/order-status");

      applyOverview(response.data?.data as OrderStatusSmsOverview);
      setError("");
    } catch (requestError) {
      setError(
        getAdminErrorMessage(
          requestError,
          "دریافت تنظیمات پیامک وضعیت سفارش ناموفق بود.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [applyOverview]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleStatus = (key: string) => {
    setForm((current) => {
      if (!current) return current;

      const statuses = current.statuses.includes(key)
        ? current.statuses.filter((status) => status !== key)
        : [...current.statuses, key];

      return { ...current, statuses };
    });
  };

  const insertPlaceholder = (token: string) => {
    if (!form) return;

    const textarea = textareaRef.current;

    if (!textarea) {
      setForm({ ...form, template: `${form.template}${token}` });

      return;
    }

    const start = textarea.selectionStart ?? form.template.length;
    const end = textarea.selectionEnd ?? start;

    setForm({
      ...form,
      template: `${form.template.slice(0, start)}${token}${form.template.slice(end)}`,
    });

    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const preview = useMemo(() => {
    if (!form || !overview) return "";

    const firstSelected =
      overview.statuses.find((status) => form.statuses.includes(status.key)) ??
      overview.statuses[0];

    const values: Record<string, string> = {
      ...PREVIEW_VALUES,
      "{status}": firstSelected?.label ?? "در حال آماده‌سازی",
      "{store}": overview.store_name.trim() || "فروشگاه",
    };

    return Object.entries(values).reduce(
      (text, [token, value]) => text.split(token).join(value),
      form.template,
    );
  }, [form, overview]);

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();

    if (!form) return;

    if (form.template.trim().length < 10) {
      setError("متن پیام باید حداقل ۱۰ نویسه باشد.");
      setMessage("");

      return;
    }

    if (form.enabled && form.statuses.length === 0) {
      setError("برای فعال بودن اطلاع‌رسانی، حداقل یک وضعیت را انتخاب کنید.");
      setMessage("");

      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await adminApi.put("/admin/messaging/order-status", {
        enabled: form.enabled,
        statuses: form.statuses,
        template: form.template,
      });

      applyOverview(response.data?.data as OrderStatusSmsOverview);
      setMessage(response.data?.message || "تنظیمات ذخیره شد.");
    } catch (requestError) {
      setError(
        getAdminErrorMessage(
          requestError,
          "ذخیرهٔ تنظیمات پیامک وضعیت سفارش ناموفق بود.",
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  const charCount = form?.template.length ?? 0;
  const smsParts = Math.max(1, Math.ceil(charCount / 70));

  return (
    <section className="msg-card" aria-labelledby="order-status-sms-title">
      <div className="msg-card-head">
        <div>
          <h2 className="msg-bday-title" id="order-status-sms-title">
            <Truck size={18} />
            پیامک خودکار وضعیت سفارش
          </h2>
          <p>
            با هر بار تغییر وضعیت سفارش در پنل، پیامک اطلاع‌رسانی برای شمارهٔ
            ثبت‌شدهٔ مشتری ارسال می‌شود. متن پیام را می‌توانید با متغیرهای زیر
            شخصی‌سازی کنید.
          </p>
        </div>

        {form && (
          <label className="msg-switch">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(event) =>
                setForm({ ...form, enabled: event.target.checked })
              }
              aria-label="فعال بودن پیامک خودکار وضعیت سفارش"
            />
            <span className="msg-switch-track" aria-hidden="true">
              <span />
            </span>
            <span className="msg-switch-text">
              {form.enabled ? "فعال" : "غیرفعال"}
            </span>
          </label>
        )}
      </div>

      {overview && !overview.sms_available && (
        <div className="msg-alert msg-alert-warning" role="status">
          <AlertCircle size={16} />
          <span>
            کانال پیامک هنوز فعال یا تنظیم نشده است؛ تا زمان تنظیم
            <code> SMS_ENABLED </code> و <code> SMS_API_KEY </code>
            پیامی ارسال نمی‌شود.
          </span>
        </div>
      )}

      {error && (
        <div className="msg-alert msg-alert-error" role="alert">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div className="msg-alert msg-alert-success" role="status">
          <CheckCircle2 size={16} />
          <span>{message}</span>
        </div>
      )}

      {loading && !form ? (
        <div className="msg-table-skeleton">
          {[0, 1, 2].map((index) => (
            <div key={index} className="msg-skeleton-row" />
          ))}
        </div>
      ) : form && overview ? (
        <form className="msg-form msg-bday-form" onSubmit={handleSave}>
          <div className="msg-field">
            <span className="msg-label">وضعیت‌هایی که پیامک می‌شوند</span>

            <div className="msg-ostatus-grid">
              {overview.statuses.map((status) => (
                <label
                  key={status.key}
                  className={`msg-ostatus-option${
                    form.statuses.includes(status.key) ? " is-active" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form.statuses.includes(status.key)}
                    onChange={() => toggleStatus(status.key)}
                  />
                  <span>{status.label}</span>
                </label>
              ))}
            </div>

            <span className="msg-hint">
              وضعیت «در انتظار پرداخت» معمولاً نیازی به اطلاع‌رسانی ندارد و
              پیش‌فرض انتخاب نشده است.
            </span>
          </div>

          <label className="msg-field">
            <span className="msg-label">متن پیام</span>

            <textarea
              ref={textareaRef}
              className="msg-input msg-textarea"
              rows={4}
              maxLength={600}
              value={form.template}
              onChange={(event) =>
                setForm({ ...form, template: event.target.value })
              }
              placeholder="مثلاً: {name} عزیز، سفارش {order} «{status}» شد."
            />
          </label>

          <div className="msg-bday-chips">
            {overview.placeholders.map((placeholder) => (
              <button
                key={placeholder}
                type="button"
                className="msg-ghost-button"
                onClick={() => insertPlaceholder(placeholder)}
              >
                {placeholder}
              </button>
            ))}

            <button
              type="button"
              className="msg-ghost-button msg-bday-reset"
              onClick={() =>
                setForm({ ...form, template: overview.default_template })
              }
            >
              <RotateCcw size={13} />
              متن پیش‌فرض
            </button>
          </div>

          <div className="msg-bday-preview">
            <span>پیش‌نمایش پیام</span>
            <p>{preview || "—"}</p>
            <div className="msg-hint">
              {toPersianDigits(charCount)} نویسه • حدود{" "}
              {toPersianDigits(smsParts)} بخش پیامک
            </div>
          </div>

          <div className="msg-actions">
            <button
              type="submit"
              className="msg-primary-button"
              disabled={saving}
            >
              {saving ? (
                <RefreshCw size={16} className="msg-spin" />
              ) : (
                <Save size={16} />
              )}
              {saving ? "در حال ذخیره..." : "ذخیرهٔ تنظیمات"}
            </button>

            <span className="msg-hint">
              ارسال پیامک پس از ثبت تغییر وضعیت انجام می‌شود و نتیجهٔ آن در
              «تاریخچهٔ ارسال‌ها» هم ثبت می‌گردد.
            </span>
          </div>
        </form>
      ) : null}
    </section>
  );
}

export default OrderStatusSmsCard;
