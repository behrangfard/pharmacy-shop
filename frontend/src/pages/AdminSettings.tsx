import { FormEvent, useEffect, useState } from "react";

import { adminApi } from "../services/api";
import {
  fetchStoreSettings,
  invalidateStoreSettingsCache,
} from "../services/storeSettings";

type SettingsForm = {
  store_name: string;
  store_slogan: string;
  store_phone: string;
  store_mobile: string;
  store_email: string;
  store_address: string;
  store_working_hours: string;
  support_note: string;
  shipping_note: string;
  store_instagram: string;
  store_telegram: string;
  store_whatsapp: string;
  vat_enabled: boolean;
  vat_percent: string;
  shipping_cost: string;
  free_shipping_enabled: boolean;
  free_shipping_threshold: string;
  return_policy_days: string;
};

const initialForm: SettingsForm = {
  store_name: "",
  store_slogan: "",
  store_phone: "",
  store_mobile: "",
  store_email: "",
  store_address: "",
  store_working_hours: "",
  support_note: "",
  shipping_note: "",
  store_instagram: "",
  store_telegram: "",
  store_whatsapp: "",
  vat_enabled: false,
  vat_percent: "0",
  shipping_cost: "0",
  free_shipping_enabled: false,
  free_shipping_threshold: "0",
  return_policy_days: "7",
};

function getErrorMessage(error: unknown): string {
  const fallback = "ذخیره تنظیمات انجام نشد. لطفاً دوباره تلاش کنید.";

  if (!error || typeof error !== "object") {
    return fallback;
  }

  const response = (
    error as {
      response?: {
        data?: {
          message?: string;
          errors?: Record<string, string[] | string>;
        };
      };
      message?: string;
    }
  ).response?.data;

  if (response?.errors) {
    const validationMessages = Object.values(response.errors)
      .flatMap((messages) => (Array.isArray(messages) ? messages : [messages]))
      .filter((message): message is string => typeof message === "string");

    if (validationMessages.length > 0) {
      return validationMessages[0];
    }
  }

  return (
    response?.message || (error as { message?: string }).message || fallback
  );
}

type TextFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  help?: string;
  placeholder?: string;
  type?: string;
  ltr?: boolean;
  maxLength?: number;
  min?: number;
  max?: number;
  step?: number;
  full?: boolean;
  required?: boolean;
};

function TextField({
  id,
  label,
  value,
  onChange,
  help,
  placeholder,
  type = "text",
  ltr,
  maxLength,
  min,
  max,
  step,
  full,
  required,
}: TextFieldProps) {
  return (
    <div className={`admin-field${full ? " admin-full" : ""}`}>
      <label className="admin-label" htmlFor={id}>
        {label}
        {required ? " *" : ""}
      </label>

      <input
        id={id}
        type={type}
        className="admin-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        dir={ltr ? "ltr" : undefined}
        maxLength={maxLength}
        min={min}
        max={max}
        step={step}
        required={required}
      />

      {help && <span className="admin-help">{help}</span>}
    </div>
  );
}

type CheckboxFieldProps = {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  help?: string;
};

function CheckboxField({
  id,
  label,
  checked,
  onChange,
  help,
}: CheckboxFieldProps) {
  return (
    <div className="admin-field">
      <label className="admin-checkbox" htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        {label}
      </label>

      {help && <span className="admin-help">{help}</span>}
    </div>
  );
}

function AdminSettings() {
  const [form, setForm] = useState<SettingsForm>(initialForm);
  const [savedForm, setSavedForm] = useState<SettingsForm>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await adminApi.get("/admin/settings");
        const settings = response.data?.data ?? {};
        const bool = (value: unknown) =>
          value === true || value === 1 || value === "1";

        const next: SettingsForm = {
          store_name: settings.store_name ?? "",
          store_slogan: settings.store_slogan ?? "",
          store_phone: settings.store_phone ?? "",
          store_mobile: settings.store_mobile ?? "",
          store_email: settings.store_email ?? "",
          store_address: settings.store_address ?? "",
          store_working_hours: settings.store_working_hours ?? "",
          support_note: settings.support_note ?? "",
          shipping_note: settings.shipping_note ?? "",
          store_instagram: settings.store_instagram ?? "",
          store_telegram: settings.store_telegram ?? "",
          store_whatsapp: settings.store_whatsapp ?? "",
          vat_enabled: bool(settings.vat_enabled),
          vat_percent: String(settings.vat_percent ?? "0"),
          shipping_cost: String(settings.shipping_cost ?? "0"),
          free_shipping_enabled: bool(settings.free_shipping_enabled),
          free_shipping_threshold: String(
            settings.free_shipping_threshold ?? "0",
          ),
          return_policy_days: String(settings.return_policy_days ?? "7"),
        };

        if (!active) return;

        setForm(next);
        setSavedForm(next);
      } catch (err) {
        if (active) setError(getErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  function updateField<K extends keyof SettingsForm>(
    field: K,
    value: SettingsForm[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) return;

    if (!form.store_name.trim()) {
      setError("نام فروشگاه الزامی است.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        ...form,
        store_email: form.store_email.trim() || null,
        vat_percent: Number(form.vat_percent) || 0,
        shipping_cost: Number(form.shipping_cost) || 0,
        free_shipping_threshold: Number(form.free_shipping_threshold) || 0,
        return_policy_days: Number(form.return_policy_days) || 0,
      };

      const response = await adminApi.put("/admin/settings", payload);

      setSuccess(
        response.data?.message ?? "تنظیمات فروشگاه با موفقیت ذخیره شد.",
      );
      setSavedForm(form);

      // سایت باید بلافاصله مقادیر جدید (هزینه ارسال، فوتر و ...) را نشان دهد.
      invalidateStoreSettingsCache();
      void fetchStoreSettings(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div dir="rtl" className="admin-page">
      <header className="admin-page-head">
        <div>
          <span className="admin-page-eyebrow">مدیریت فروشگاه</span>
          <h1 className="admin-page-title">تنظیمات فروشگاه</h1>
          <p className="admin-page-subtitle">
            اطلاعات تماس، شبکه‌های اجتماعی، مالیات، هزینه ارسال و شرایط مرجوعی
            فروشگاه را از اینجا مدیریت کنید. این مقادیر در فوتر، صفحهٔ تسویه و
            محاسبهٔ سفارش‌ها استفاده می‌شوند.
          </p>
        </div>
      </header>

      {error && (
        <div className="admin-alert admin-alert-error" role="alert">
          <span aria-hidden="true">!</span>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="admin-alert admin-alert-success" role="status">
          <span aria-hidden="true">✓</span>
          <span>{success}</span>
        </div>
      )}

      {loading ? (
        <div className="admin-card">
          <p className="admin-empty">در حال دریافت تنظیمات...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <section className="admin-card">
            <div className="admin-card-head">
              <div>
                <h2 className="admin-card-title">اطلاعات فروشگاه</h2>
                <p className="admin-card-desc">
                  این اطلاعات در فوتر سایت و فاکتورها نمایش داده می‌شود.
                </p>
              </div>
            </div>

            <div className="admin-form-grid">
              <TextField
                id="setting-store-name"
                label="نام فروشگاه"
                value={form.store_name}
                onChange={(value) => updateField("store_name", value)}
                maxLength={120}
                required
              />

              <TextField
                id="setting-store-slogan"
                label="شعار فروشگاه"
                value={form.store_slogan}
                onChange={(value) => updateField("store_slogan", value)}
                maxLength={255}
              />

              <TextField
                id="setting-store-phone"
                label="تلفن ثابت"
                value={form.store_phone}
                onChange={(value) => updateField("store_phone", value)}
                ltr
                maxLength={30}
              />

              <TextField
                id="setting-store-mobile"
                label="موبایل / پشتیبانی"
                value={form.store_mobile}
                onChange={(value) => updateField("store_mobile", value)}
                ltr
                maxLength={30}
              />

              <TextField
                id="setting-store-email"
                label="ایمیل"
                type="email"
                value={form.store_email}
                onChange={(value) => updateField("store_email", value)}
                ltr
                maxLength={120}
              />

              <TextField
                id="setting-store-hours"
                label="ساعات کاری"
                value={form.store_working_hours}
                onChange={(value) => updateField("store_working_hours", value)}
                maxLength={120}
              />

              <TextField
                id="setting-store-address"
                label="آدرس"
                value={form.store_address}
                onChange={(value) => updateField("store_address", value)}
                maxLength={255}
                full
              />

              <TextField
                id="setting-support-note"
                label="متن پشتیبانی (فوتر)"
                value={form.support_note}
                onChange={(value) => updateField("support_note", value)}
                maxLength={255}
                full
              />
            </div>
          </section>

          <section className="admin-card">
            <div className="admin-card-head">
              <div>
                <h2 className="admin-card-title">شبکه‌های اجتماعی</h2>
                <p className="admin-card-desc">
                  نشانی کامل صفحه‌ها را وارد کنید؛ لینک‌ها در فوتر نمایش داده
                  می‌شوند.
                </p>
              </div>
            </div>

            <div className="admin-form-grid admin-form-grid-3">
              <TextField
                id="setting-instagram"
                label="اینستاگرام"
                value={form.store_instagram}
                onChange={(value) => updateField("store_instagram", value)}
                placeholder="https://instagram.com/..."
                ltr
                maxLength={255}
              />

              <TextField
                id="setting-telegram"
                label="تلگرام"
                value={form.store_telegram}
                onChange={(value) => updateField("store_telegram", value)}
                placeholder="https://t.me/..."
                ltr
                maxLength={255}
              />

              <TextField
                id="setting-whatsapp"
                label="واتس‌اپ"
                value={form.store_whatsapp}
                onChange={(value) => updateField("store_whatsapp", value)}
                placeholder="https://wa.me/98..."
                ltr
                maxLength={255}
              />
            </div>
          </section>

          <section className="admin-card">
            <div className="admin-card-head">
              <div>
                <h2 className="admin-card-title">مالیات و ارسال</h2>
                <p className="admin-card-desc">
                  مبالغ به تومان محاسبه می‌شوند و روی سفارش‌های جدید اعمال
                  می‌شوند.
                </p>
              </div>
            </div>

            <div className="admin-form-grid">
              <CheckboxField
                id="setting-vat"
                label="محاسبهٔ مالیات بر ارزش افزوده فعال باشد"
                checked={form.vat_enabled}
                onChange={(checked) => updateField("vat_enabled", checked)}
                help="در صورت فعال بودن، درصد زیر روی محصولات مشمول مالیات اعمال می‌شود."
              />

              <TextField
                id="setting-vat-percent"
                label="درصد مالیات"
                type="number"
                value={form.vat_percent}
                onChange={(value) => updateField("vat_percent", value)}
                min={0}
                max={100}
                step={0.5}
                ltr
              />

              <TextField
                id="setting-shipping-cost"
                label="هزینه ارسال (تومان)"
                type="number"
                value={form.shipping_cost}
                onChange={(value) => updateField("shipping_cost", value)}
                min={0}
                step={1000}
                ltr
              />

              <TextField
                id="setting-return-days"
                label="مهلت مرجوعی (روز)"
                type="number"
                value={form.return_policy_days}
                onChange={(value) => updateField("return_policy_days", value)}
                min={0}
                max={90}
                ltr
                help="مقدار صفر یعنی محدودیتی برای ثبت درخواست مرجوعی وجود ندارد."
              />

              <CheckboxField
                id="setting-free-ship"
                label="ارسال رایگان برای سبدهای بالای مبلغ مشخص"
                checked={form.free_shipping_enabled}
                onChange={(checked) =>
                  updateField("free_shipping_enabled", checked)
                }
              />

              <TextField
                id="setting-free-limit"
                label="حداقل مبلغ برای ارسال رایگان (تومان)"
                type="number"
                value={form.free_shipping_threshold}
                onChange={(value) =>
                  updateField("free_shipping_threshold", value)
                }
                min={0}
                step={1000}
                ltr
              />

              <div className="admin-field admin-full">
                <label className="admin-label" htmlFor="setting-shipping-note">
                  توضیح شرایط ارسال
                </label>
                <textarea
                  id="setting-shipping-note"
                  className="admin-textarea"
                  value={form.shipping_note}
                  onChange={(event) =>
                    updateField("shipping_note", event.target.value)
                  }
                  maxLength={500}
                />
              </div>
            </div>
          </section>

          <div className="admin-actions">
            <button
              type="submit"
              className="admin-btn admin-btn-primary"
              disabled={saving}
            >
              {saving ? "در حال ذخیره..." : "ذخیرهٔ تنظیمات"}
            </button>

            <button
              type="button"
              className="admin-btn"
              onClick={() => {
                setForm(savedForm);
                setError("");
                setSuccess("");
              }}
              disabled={saving}
            >
              بازگردانی تغییرات ذخیره‌نشده
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default AdminSettings;
