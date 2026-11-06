import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { ImagePlus, Loader2, Plus, Upload } from "lucide-react";

import JalaliDatePicker from "../components/JalaliDatePicker";
import { adminApi } from "../services/api";
import {
  formatAdminDate,
  getAdminErrorMessage,
  toDateTimeInput,
} from "../utils/adminFormat";
import { getStorageUrl } from "../utils/images";

type BarItemType = "text" | "image" | "video";

type BarAnimation = "fade" | "slide" | "none";

interface BarItem {
  id: number;
  type: BarItemType;
  text: string | null;
  image: string | null;
  link: string | null;
  open_in_new_tab: boolean;
  sort_order: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
}

/** تنظیمات ظاهری نوار؛ مقادیر عددی در فرم به‌صورت رشته نگه داشته می‌شوند. */
interface BarSettings {
  enabled: boolean;
  height: string;
  mobile_height: string;
  background_color: string;
  text_color: string;
  font_size: string;
  interval: string;
  animation: BarAnimation;
}

interface BarItemForm {
  type: BarItemType;
  text: string;
  image: string;
  link: string;
  open_in_new_tab: boolean;
  sort_order: string;
  is_active: boolean;
  starts_at: string;
  ends_at: string;
}

const typeLabels: Record<BarItemType, string> = {
  text: "متن",
  image: "تصویر (ثابت یا متحرک)",
  video: "ویدیوی کوتاه",
};

const animationLabels: Record<BarAnimation, string> = {
  fade: "محو شدن",
  slide: "لغزش از کنار",
  none: "بدون انیمیشن",
};

const defaultSettings: BarSettings = {
  enabled: false,
  height: "44",
  mobile_height: "40",
  background_color: "#385e3e",
  text_color: "#f7f8f2",
  font_size: "13",
  interval: "6",
  animation: "fade",
};

const emptyItemForm: BarItemForm = {
  type: "text",
  text: "",
  image: "",
  link: "",
  open_in_new_tab: false,
  sort_order: "0",
  is_active: true,
  starts_at: "",
  ends_at: "",
};

/** هندل ثابت ارجاع به بخش فرم آیتم‌ها (برای اسکرول بعد از کلیک). */
function AdminAnnouncementBar() {
  const [items, setItems] = useState<BarItem[]>([]);
  const [settings, setSettings] = useState<BarSettings>(defaultSettings);
  const [form, setForm] = useState<BarItemForm>(emptyItemForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const formRef = useRef<HTMLElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadBar = useCallback(async () => {
    setLoading(true);

    try {
      const response = await adminApi.get("/admin/announcement-bar");
      const data = response.data?.data ?? {};

      setItems(Array.isArray(data.items) ? (data.items as BarItem[]) : []);

      const remote = (data.settings ?? {}) as Partial<Record<string, unknown>>;

      setSettings({
        enabled: remote.enabled === true,
        height: String(remote.height ?? defaultSettings.height),
        mobile_height: String(remote.mobile_height ?? defaultSettings.mobile_height),
        background_color:
          typeof remote.background_color === "string"
            ? remote.background_color
            : defaultSettings.background_color,
        text_color:
          typeof remote.text_color === "string"
            ? remote.text_color
            : defaultSettings.text_color,
        font_size: String(remote.font_size ?? defaultSettings.font_size),
        interval: String(remote.interval ?? defaultSettings.interval),
        animation:
          remote.animation === "slide" || remote.animation === "none"
            ? remote.animation
            : "fade",
      });
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBar();
  }, [loadBar]);

  function scrollToForm() {
    window.setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }

  function updateSettingsField<K extends keyof BarSettings>(
    key: K,
    value: BarSettings[K],
  ) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function updateForm<K extends keyof BarItemForm>(
    key: K,
    value: BarItemForm[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setForm(emptyItemForm);
    setEditingId(null);
    setFormOpen(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function openCreateForm() {
    setError("");
    setSuccess("");
    setForm({
      ...emptyItemForm,
      sort_order: String(items.length > 0 ? Math.max(...items.map((i) => i.sort_order)) + 1 : 0),
    });
    setEditingId(null);
    setFormOpen(true);

    scrollToForm();
  }

  function startEditing(item: BarItem) {
    setError("");
    setSuccess("");
    setEditingId(item.id);
    setForm({
      type: item.type,
      text: item.text ?? "",
      image: item.image ?? "",
      link: item.link ?? "",
      open_in_new_tab: Boolean(item.open_in_new_tab),
      sort_order: String(item.sort_order ?? 0),
      is_active: Boolean(item.is_active),
      starts_at: toDateTimeInput(item.starts_at),
      ends_at: toDateTimeInput(item.ends_at),
    });
    setFormOpen(true);

    scrollToForm();
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (settingsSaving) return;

    setSettingsSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await adminApi.put("/admin/announcement-bar/settings", {
        enabled: settings.enabled,
        height: Number(settings.height) || defaultSettings.height,
        mobile_height: Number(settings.mobile_height) || defaultSettings.mobile_height,
        background_color: settings.background_color,
        text_color: settings.text_color,
        font_size: Number(settings.font_size) || defaultSettings.font_size,
        interval: Number(settings.interval) || defaultSettings.interval,
        animation: settings.animation,
      });

      setSuccess(response.data?.message ?? "تنظیمات نوار ذخیره شد.");
      await loadBar();
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setSettingsSaving(false);
    }
  }

  /**
   * بارگذاری تصویر (شامل GIF/WebP متحرک) یا ویدیو؛ نوع آیتم هم بر اساس
   * پسوند فایل به‌صورت خودکار انتخاب می‌شود.
   */
  async function handleMediaUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    setUploading(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await adminApi.post(
        "/admin/announcement-bar/media",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );

      const path = response.data?.data?.path;

      if (typeof path !== "string" || path === "") {
        throw new Error("بارگذاری فایل انجام نشد.");
      }

      setForm((current) => ({
        ...current,
        image: path,
        type: response.data?.data?.type === "video" ? "video" : "image",
      }));

      setSuccess("فایل نوار اطلاع‌رسانی بارگذاری شد.");
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleItemSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving || uploading) return;

    if (form.type === "text" && form.text.trim() === "") {
      setError("متن اطلاع‌رسانی را وارد کنید.");
      return;
    }

    if (form.type !== "text" && form.image.trim() === "") {
      setError("برای اطلاع‌رسانی تصویری یا ویدیویی، فایل را بارگذاری کنید.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        type: form.type,
        text: form.text.trim() || null,
        image: form.image.trim() || null,
        link: form.link.trim() || null,
        open_in_new_tab: form.open_in_new_tab,
        sort_order: Number(form.sort_order) || 0,
        is_active: form.is_active,
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
      };

      if (editingId === null) {
        const response = await adminApi.post(
          "/admin/announcement-bar/items",
          payload,
        );

        setSuccess(response.data?.message ?? "اطلاع‌رسانی ایجاد شد.");
      } else {
        const response = await adminApi.put(
          `/admin/announcement-bar/items/${editingId}`,
          payload,
        );

        setSuccess(response.data?.message ?? "اطلاع‌رسانی ویرایش شد.");
      }

      resetForm();
      await loadBar();
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(item: BarItem) {
    setActionId(item.id);
    setError("");
    setSuccess("");

    try {
      await adminApi.patch(`/admin/announcement-bar/items/${item.id}/status`, {
        is_active: !item.is_active,
      });

      setSuccess(
        item.is_active ? "اطلاع‌رسانی غیرفعال شد." : "اطلاع‌رسانی فعال شد.",
      );
      await loadBar();
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setActionId(null);
    }
  }

  async function deleteItem(item: BarItem) {
    if (!window.confirm("این اطلاع‌رسانی حذف شود؟")) {
      return;
    }

    setActionId(item.id);
    setError("");
    setSuccess("");

    try {
      const response = await adminApi.delete(
        `/admin/announcement-bar/items/${item.id}`,
      );

      setSuccess(response.data?.message ?? "اطلاع‌رسانی حذف شد.");

      if (editingId === item.id) {
        resetForm();
      }

      await loadBar();
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setActionId(null);
    }
  }

  const mediaPreview = getStorageUrl(form.image);
  const activeItems = items.filter((item) => item.is_active);
  const previewHeight = Math.max(Number(settings.height) || 44, 24);
  const previewFontSize = Number(settings.font_size) || 13;
  const previewText =
    activeItems[0]?.text?.trim() ||
    "متن نمونه: ارسال رایگان برای خرید بالای ۵۰۰ هزار تومان";



  return (
    <div dir="rtl" className="admin-page">
      <header className="admin-page-head">
        <div>
          <span className="admin-page-eyebrow">مدیریت محتوا</span>
          <h1 className="admin-page-title">نوار اطلاع‌رسانی بالای هدر</h1>
          <p className="admin-page-subtitle">
            نوار باریکِ تمام‌عرضِ بالای هدر سایت برای اطلاع‌رسانی تخفیف‌ها و
            تبلیغات. ارتفاع، رنگ، اندازهٔ متن، سرعت تعویض و نوع انیمیشن از همین
            صفحه تنظیم می‌شود و نوار مثل هدر هنگام اسکرول ناپدید نمی‌شود. هر
            اطلاع‌رسانی می‌تواند متن، تصویر (شامل GIF/WebP متحرک) یا ویدیوی
            کوتاه باشد؛ اگر چند اطلاع‌رسانی فعال ثبت شود، در سایت به ترتیب
            «ترتیب نمایش» و با فاصلهٔ زمانی مشخص جابه‌جا می‌شوند. تا نوار
            «فعال» نشود یا اطلاع‌رسانی فعالی نداشته باشد، هیچ چیزی بالای هدر
            دیده نمی‌شود.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 8,
          }}
        >
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={openCreateForm}
          >
            <span className="inline-flex items-center gap-1.5">
              <Plus size={15} aria-hidden="true" />
              افزودن اطلاع‌رسانی
            </span>
          </button>

          <button
            type="button"
            className="admin-btn"
            onClick={() => void loadBar()}
            disabled={loading}
          >
            {loading ? "در حال دریافت..." : "بارگذاری مجدد"}
          </button>
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

      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2 className="admin-card-title">تنظیمات نوار</h2>
            <p className="admin-card-desc">
              ارتفاع نوار در دسکتاپ و موبایل جداگانه تنظیم می‌شود (۲۴ تا ۱۲۰
              پیکسل). رنگ‌ها باید کد شش‌رقمی مثل <span dir="ltr">#385e3e</span>{" "}
              باشند. اگر چند اطلاع‌رسانی فعال باشد، هر چند ثانیه یک‌بار (فاصلهٔ
              زمانی زیر) جابه‌جا می‌شوند.
            </p>
          </div>

          <span
            className={`admin-badge ${
              settings.enabled ? "admin-badge-green" : "admin-badge-red"
            }`}
          >
            {settings.enabled ? "فعال" : "غیرفعال"}
          </span>
        </div>

        <form onSubmit={saveSettings}>
          <div className="admin-form-grid">
            <label className="admin-checkbox admin-full" htmlFor="bar-enabled">
              <input
                id="bar-enabled"
                type="checkbox"
                checked={settings.enabled}
                onChange={(event) =>
                  updateSettingsField("enabled", event.target.checked)
                }
              />
              نوار اطلاع‌رسانی در سایت نمایش داده شود
            </label>

            <div className="admin-field">
              <label className="admin-label" htmlFor="bar-height">
                ارتفاع در دسکتاپ (پیکسل)
              </label>
              <input
                id="bar-height"
                type="number"
                min={24}
                max={120}
                className="admin-input"
                value={settings.height}
                onChange={(event) =>
                  updateSettingsField("height", event.target.value)
                }
                dir="ltr"
              />
              <span className="admin-help">مثلاً ۴۴ برای نوار باریک</span>
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="bar-mobile-height">
                ارتفاع در موبایل (پیکسل)
              </label>
              <input
                id="bar-mobile-height"
                type="number"
                min={24}
                max={120}
                className="admin-input"
                value={settings.mobile_height}
                onChange={(event) =>
                  updateSettingsField("mobile_height", event.target.value)
                }
                dir="ltr"
              />
              <span className="admin-help">
                در نمایشگرهای زیر ۷۶۸ پیکسل اعمال می‌شود
              </span>
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="bar-font-size">
                اندازهٔ متن (پیکسل)
              </label>
              <input
                id="bar-font-size"
                type="number"
                min={9}
                max={24}
                className="admin-input"
                value={settings.font_size}
                onChange={(event) =>
                  updateSettingsField("font_size", event.target.value)
                }
                dir="ltr"
              />
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="bar-interval">
                فاصلهٔ تعویض اطلاع‌رسانی‌ها (ثانیه)
              </label>
              <input
                id="bar-interval"
                type="number"
                min={2}
                max={60}
                className="admin-input"
                value={settings.interval}
                onChange={(event) =>
                  updateSettingsField("interval", event.target.value)
                }
                dir="ltr"
              />
              <span className="admin-help">بین ۲ تا ۶۰ ثانیه</span>
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="bar-animation">
                نوع انیمیشن تعویض
              </label>
              <select
                id="bar-animation"
                className="admin-select"
                value={settings.animation}
                onChange={(event) =>
                  updateSettingsField(
                    "animation",
                    event.target.value as BarAnimation,
                  )
                }
              >
                {(Object.keys(animationLabels) as BarAnimation[]).map(
                  (value) => (
                    <option key={value} value={value}>
                      {animationLabels[value]}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="bar-bg-color">
                رنگ پس‌زمینهٔ نوار
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  id="bar-bg-color"
                  type="color"
                  value={settings.background_color}
                  onChange={(event) =>
                    updateSettingsField("background_color", event.target.value)
                  }
                  aria-label="انتخاب رنگ پس‌زمینه"
                  style={{
                    width: 46,
                    height: 42,
                    padding: 2,
                    border: "1px solid #dbe5d5",
                    borderRadius: 10,
                    background: "#fff",
                    cursor: "pointer",
                  }}
                />
                <input
                  className="admin-input"
                  value={settings.background_color}
                  onChange={(event) =>
                    updateSettingsField("background_color", event.target.value)
                  }
                  dir="ltr"
                  maxLength={7}
                />
              </div>
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="bar-text-color">
                رنگ متن نوار
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  id="bar-text-color"
                  type="color"
                  value={settings.text_color}
                  onChange={(event) =>
                    updateSettingsField("text_color", event.target.value)
                  }
                  aria-label="انتخاب رنگ متن"
                  style={{
                    width: 46,
                    height: 42,
                    padding: 2,
                    border: "1px solid #dbe5d5",
                    borderRadius: 10,
                    background: "#fff",
                    cursor: "pointer",
                  }}
                />
                <input
                  className="admin-input"
                  value={settings.text_color}
                  onChange={(event) =>
                    updateSettingsField("text_color", event.target.value)
                  }
                  dir="ltr"
                  maxLength={7}
                />
              </div>
            </div>

            <div className="admin-field admin-full">
              <span className="admin-label">پیش‌نمایش نوار</span>

              <div
                dir="rtl"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                  height: `${previewHeight}px`,
                  overflow: "hidden",
                  borderRadius: 12,
                  backgroundColor: settings.background_color,
                  color: settings.text_color,
                  fontSize: `${previewFontSize}px`,
                  fontWeight: 700,
                  transition: "height 0.2s ease, background-color 0.2s ease",
                }}
              >
                <span
                  style={{
                    display: "block",
                    maxWidth: "100%",
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    textOverflow: "ellipsis",
                    paddingInline: 14,
                  }}
                >
                  {previewText}
                </span>
              </div>

              <span className="admin-help">
                ارتفاع پیش‌نمایش همان ارتفاع دسکتاپ است؛ در موبایل ارتفاع
                «موبایل» اعمال می‌شود. این نوار در سایت بالای هدر و چسبیده به
                آن نمایش داده می‌شود.
              </span>
            </div>
          </div>

          <div className="admin-actions">
            <button
              type="submit"
              className="admin-btn admin-btn-primary"
              disabled={settingsSaving}
            >
              {settingsSaving ? "در حال ذخیره..." : "ذخیرهٔ تنظیمات نوار"}
            </button>

            <button
              type="button"
              className="admin-btn"
              onClick={() => setSettings(defaultSettings)}
              disabled={settingsSaving}
            >
              بازگردانی به پیش‌فرض
            </button>
          </div>
        </form>
      </section>


      {formOpen && (
        <section className="admin-card" ref={formRef}>
          <div className="admin-card-head">
            <div>
              <h2 className="admin-card-title">
                {editingId === null
                  ? "افزودن اطلاع‌رسانی جدید"
                  : "ویرایش اطلاع‌رسانی"}
              </h2>
              <p className="admin-card-desc">
                برای اطلاع‌رسانی متنی فقط متن لازم است؛ برای تصویر یا ویدیو،
                فایل را بارگذاری کنید (نوع آیتم خودکار انتخاب می‌شود). لینک
                اختیاری است و می‌تواند نشانی داخلی مثل{" "}
                <span dir="ltr">/products</span> یا آدرس کامل بیرونی باشد.
              </p>
            </div>

            <button
              type="button"
              className="admin-btn admin-btn-sm"
              onClick={resetForm}
              disabled={saving}
            >
              بستن فرم
            </button>
          </div>

          <form onSubmit={handleItemSubmit}>
            <div className="admin-form-grid">
              <div className="admin-field">
                <label className="admin-label" htmlFor="bar-item-type">
                  نوع اطلاع‌رسانی
                </label>
                <select
                  id="bar-item-type"
                  className="admin-select"
                  value={form.type}
                  onChange={(event) =>
                    updateForm("type", event.target.value as BarItemType)
                  }
                >
                  {(Object.keys(typeLabels) as BarItemType[]).map((value) => (
                    <option key={value} value={value}>
                      {typeLabels[value]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-field">
                <label className="admin-label" htmlFor="bar-item-sort">
                  ترتیب نمایش
                </label>
                <input
                  id="bar-item-sort"
                  type="number"
                  min={0}
                  className="admin-input"
                  value={form.sort_order}
                  onChange={(event) =>
                    updateForm("sort_order", event.target.value)
                  }
                  dir="ltr"
                />
              </div>

              {form.type === "text" ? (
                <div className="admin-field admin-full">
                  <label className="admin-label" htmlFor="bar-item-text">
                    متن اطلاع‌رسانی *
                  </label>
                  <textarea
                    id="bar-item-text"
                    className="admin-textarea"
                    rows={2}
                    maxLength={500}
                    value={form.text}
                    onChange={(event) =>
                      updateForm("text", event.target.value)
                    }
                    placeholder="مثلاً: جشنوارهٔ پایان فصل، تا ۵۰٪ تخفیف روی همهٔ محصولات"
                  />
                  <span className="admin-help">
                    متن کوتاه بهتر دیده می‌شود؛ حداکثر ۵۰۰ نویسه.
                  </span>
                </div>
              ) : (
                <div className="admin-field admin-full">
                  <label className="admin-label" htmlFor="bar-item-file">
                    فایل {form.type === "video" ? "ویدیو" : "تصویر"} *
                  </label>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                    <div className="flex h-16 w-40 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-[#dfe7d8] bg-[#f8faf5]">
                      {mediaPreview ? (
                        form.type === "video" ? (
                          <video
                            src={mediaPreview}
                            className="h-full w-full object-contain"
                            autoPlay
                            loop
                            muted
                            playsInline
                          />
                        ) : (
                          <img
                            src={mediaPreview}
                            alt="پیش‌نمایش فایل نوار"
                            className="h-full w-full object-contain"
                          />
                        )
                      ) : (
                        <span className="inline-flex flex-col items-center gap-1 text-[11px] text-[#9aa894]">
                          <ImagePlus size={18} aria-hidden="true" />
                          بدون فایل
                        </span>
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          ref={fileInputRef}
                          id="bar-item-file"
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm"
                          onChange={(event) => void handleMediaUpload(event)}
                          className="hidden"
                        />

                        <button
                          type="button"
                          className="admin-btn admin-btn-sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading || saving}
                        >
                          <span className="inline-flex items-center gap-1.5">
                            {uploading ? (
                              <Loader2
                                size={14}
                                className="animate-spin"
                                aria-hidden="true"
                              />
                            ) : (
                              <Upload size={14} aria-hidden="true" />
                            )}
                            {uploading ? "در حال بارگذاری..." : "بارگذاری فایل"}
                          </span>
                        </button>

                        {form.image && (
                          <button
                            type="button"
                            className="admin-btn admin-btn-sm admin-btn-danger"
                            onClick={() => updateForm("image", "")}
                            disabled={uploading || saving}
                          >
                            حذف فایل
                          </button>
                        )}
                      </div>

                      <input
                        id="bar-item-image"
                        className="admin-input"
                        value={form.image}
                        onChange={(event) =>
                          updateForm("image", event.target.value)
                        }
                        dir="ltr"
                        maxLength={2048}
                        placeholder="announcement-bar/file.gif"
                      />

                      <span className="admin-help">
                        تصویر ثابت، GIF یا WebP متحرک و ویدیوی کوتاه MP4/WebM
                        (حداکثر ۱۰ مگابایت). برای نوار باریک، تصویر با ارتفاع
                        کم و عرض زیاد (مثلاً ۱۹۲۰×۶۰) مناسب است.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="admin-field admin-full">
                <label className="admin-label" htmlFor="bar-item-link">
                  لینک مقصد (اختیاری)
                </label>
                <input
                  id="bar-item-link"
                  className="admin-input"
                  value={form.link}
                  onChange={(event) => updateForm("link", event.target.value)}
                  dir="ltr"
                  maxLength={2048}
                  placeholder="/products"
                />
                <span className="admin-help">
                  نشانی داخلی مثل <span dir="ltr">/products</span> یا آدرس کامل
                  بیرونی. خالی بماند، اطلاع‌رسانی کلیک‌پذیر نیست.
                </span>
              </div>

              <label
                className="admin-checkbox admin-full"
                htmlFor="bar-item-new-tab"
              >
                <input
                  id="bar-item-new-tab"
                  type="checkbox"
                  checked={form.open_in_new_tab}
                  onChange={(event) =>
                    updateForm("open_in_new_tab", event.target.checked)
                  }
                />
                لینک در تب جدید باز شود
              </label>

              <div className="admin-field">
                <label className="admin-label" htmlFor="bar-item-start">
                  شروع نمایش (شمسی)
                </label>
                <JalaliDatePicker
                  id="bar-item-start"
                  value={form.starts_at}
                  onChange={(value) => updateForm("starts_at", value)}
                />
                <span className="admin-help">
                  خالی بماند، از همین حالا نمایش داده می‌شود.
                </span>
              </div>

              <div className="admin-field">
                <label className="admin-label" htmlFor="bar-item-end">
                  پایان نمایش (شمسی)
                </label>
                <JalaliDatePicker
                  id="bar-item-end"
                  value={form.ends_at}
                  onChange={(value) => updateForm("ends_at", value)}
                  defaultHour={23}
                  defaultMinute={59}
                />
                <span className="admin-help">خالی بماند، بدون پایان است.</span>
              </div>

              <label
                className="admin-checkbox admin-full"
                htmlFor="bar-item-active"
              >
                <input
                  id="bar-item-active"
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) =>
                    updateForm("is_active", event.target.checked)
                  }
                />
                این اطلاع‌رسانی فعال باشد
              </label>
            </div>

            <div className="admin-actions">
              <button
                type="submit"
                className="admin-btn admin-btn-primary"
                disabled={saving || uploading}
              >
                {saving
                  ? "در حال ذخیره..."
                  : editingId === null
                    ? "ایجاد اطلاع‌رسانی"
                    : "ذخیرهٔ تغییرات"}
              </button>

              <button
                type="button"
                className="admin-btn"
                onClick={resetForm}
                disabled={saving}
              >
                انصراف
              </button>
            </div>
          </form>
        </section>
      )}



      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2 className="admin-card-title">فهرست اطلاع‌رسانی‌ها</h2>
            <p className="admin-card-desc">
              اطلاع‌رسانی‌های فعال به ترتیب «ترتیب نمایش» در نوار دیده می‌شوند و
              هر {Number(settings.interval) || 6} ثانیه جابه‌جا می‌شوند.
            </p>
          </div>

          <span className="admin-badge admin-badge-gray">
            {activeItems.length.toLocaleString("fa-IR")} فعال از{" "}
            {items.length.toLocaleString("fa-IR")}
          </span>
        </div>

        {loading ? (
          <p className="admin-help">در حال دریافت اطلاع‌رسانی‌ها...</p>
        ) : items.length === 0 ? (
          <p className="admin-help">
            هنوز اطلاع‌رسانی‌ای ثبت نشده است. با دکمهٔ «افزودن اطلاع‌رسانی»
            اولین مورد را بسازید؛ تا آن زمان هیچ نواری بالای هدر نمایش داده
            نمی‌شود.
          </p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>محتوا</th>
                  <th>نوع</th>
                  <th>لینک</th>
                  <th>بازهٔ نمایش</th>
                  <th>ترتیب</th>
                  <th>وضعیت</th>
                  <th>عملیات</th>
                </tr>
              </thead>

              <tbody>
                {items.map((item) => {
                  const preview = getStorageUrl(item.image);
                  const busy = actionId === item.id;
                  const thumbStyle = {
                    width: 72,
                    height: 34,
                    objectFit: "contain" as const,
                    borderRadius: 6,
                    backgroundColor: "#f3f6ef",
                    flexShrink: 0,
                  };

                  return (
                    <tr key={item.id}>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          {item.type !== "text" && preview ? (
                            item.type === "video" ? (
                              <video
                                src={preview}
                                aria-label="پیش‌نمایش ویدیوی نوار"
                                style={thumbStyle}
                                autoPlay
                                loop
                                muted
                                playsInline
                              />
                            ) : (
                              <img
                                src={preview}
                                alt="پیش‌نمایش تصویر نوار"
                                style={thumbStyle}
                              />
                            )
                          ) : null}

                          <span
                            style={{
                              display: "block",
                              maxWidth: 280,
                              overflow: "hidden",
                              whiteSpace: "nowrap",
                              textOverflow: "ellipsis",
                              fontSize: 12,
                              fontWeight: 700,
                              color: "#3f4d3c",
                            }}
                          >
                            {item.text?.trim() ||
                              (item.type === "text"
                                ? "—"
                                : "فایل بارگذاری‌شده")}
                          </span>
                        </div>
                      </td>

                      <td>{typeLabels[item.type] ?? "—"}</td>

                      <td style={{ fontSize: 12 }}>
                        {item.link ? <span dir="ltr">{item.link}</span> : "—"}
                      </td>

                      <td style={{ fontSize: 12 }}>
                        {item.starts_at || item.ends_at
                          ? `${formatAdminDate(
                              item.starts_at,
                              true,
                            )} تا ${formatAdminDate(item.ends_at, true)}`
                          : "همیشگی"}
                      </td>

                      <td>{item.sort_order}</td>


                      <td>
                        <span
                          className={`admin-badge ${
                            item.is_active
                              ? "admin-badge-green"
                              : "admin-badge-red"
                          }`}
                        >
                          {item.is_active ? "فعال" : "غیرفعال"}
                        </span>
                      </td>

                      <td>
                        <div className="admin-row-actions">
                          <button
                            type="button"
                            className="admin-btn admin-btn-sm"
                            onClick={() => startEditing(item)}
                            disabled={busy || saving}
                          >
                            ویرایش
                          </button>

                          <button
                            type="button"
                            className="admin-btn admin-btn-sm"
                            onClick={() => void toggleStatus(item)}
                            disabled={busy || saving}
                          >
                            {busy ? "..." : item.is_active ? "غیرفعال" : "فعال"}
                          </button>

                          <button
                            type="button"
                            className="admin-btn admin-btn-sm admin-btn-danger"
                            onClick={() => void deleteItem(item)}
                            disabled={busy || saving}
                          >
                            حذف
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
      </section>
    </div>
  );
}

export default AdminAnnouncementBar;


