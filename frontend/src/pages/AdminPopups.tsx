import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarClock,
  ImagePlus,
  Loader2,
  Megaphone,
  MousePointerClick,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { adminApi } from "../services/api";
import {
  type PopupDevice,
  type PopupFrequency,
  type PopupImagePosition,
  type PopupLayout,
  type PopupPage,
  type PopupTheme,
} from "../services/popups";
import { formatAdminNumber, getAdminErrorMessage } from "../utils/adminFormat";
import { getStorageUrl } from "../utils/images";

/** یک پاپ‌آپ ثبت‌شده در سرور (همان فیلدهای ذخیره‌شده). */
interface PopupRecord {
  id: number;
  title: string | null;
  badge: string | null;
  description: string | null;
  image: string | null;
  image_alt: string | null;
  theme: PopupTheme;
  layout: PopupLayout;
  image_position: PopupImagePosition;
  cta_text: string | null;
  cta_link: string | null;
  secondary_text: string | null;
  secondary_link: string | null;
  coupon_code: string | null;
  display_pages: PopupPage[] | null;
  devices: PopupDevice;
  delay_seconds: number;
  auto_close_seconds: number;
  frequency: PopupFrequency;
  starts_at: string | null;
  ends_at: string | null;
  countdown_to: string | null;
  close_on_backdrop: boolean;
  show_close: boolean;
  is_active: boolean;
  sort_order: number;
  created_at?: string | null;
}

/** فرم ویرایش/افزودن؛ عددها و تاریخ‌ها به‌صورت رشته نگه داشته می‌شوند. */
interface PopupForm {
  title: string;
  badge: string;
  description: string;
  image: string;
  image_alt: string;
  theme: PopupTheme;
  layout: PopupLayout;
  image_position: PopupImagePosition;
  cta_text: string;
  cta_link: string;
  secondary_text: string;
  secondary_link: string;
  coupon_code: string;
  display_pages: PopupPage[];
  devices: PopupDevice;
  delay_seconds: string;
  auto_close_seconds: string;
  frequency: PopupFrequency;
  starts_at: string;
  ends_at: string;
  countdown_to: string;
  close_on_backdrop: boolean;
  show_close: boolean;
  is_active: boolean;
  sort_order: string;
}

const PAGE_OPTIONS: { value: PopupPage; label: string; hint: string }[] = [
  { value: "home", label: "صفحهٔ اول", hint: "/" },
  { value: "products", label: "فهرست محصولات", hint: "/products" },
  { value: "product", label: "صفحهٔ محصول", hint: "/product/..." },
  { value: "cart", label: "سبد خرید", hint: "/cart" },
  { value: "checkout", label: "تسویه حساب", hint: "/checkout" },
];

const THEME_OPTIONS: { value: PopupTheme; label: string }[] = [
  { value: "light", label: "روشن" },
  { value: "dark", label: "تیره" },
  { value: "brand", label: "برند (سبز)" },
];

const LAYOUT_OPTIONS: { value: PopupLayout; label: string; hint: string }[] = [
  { value: "center", label: "مودال وسط", hint: "تمرکز کامل روی پیام" },
  { value: "bottom", label: "شیت پایین", hint: "مناسب موبایل" },
  { value: "corner", label: "کارت گوشه", hint: "کم‌مزاحم" },
];

const DEVICE_OPTIONS: { value: PopupDevice; label: string }[] = [
  { value: "all", label: "همهٔ دستگاه‌ها" },
  { value: "desktop", label: "فقط دسکتاپ" },
  { value: "mobile", label: "فقط موبایل" },
];

const FREQUENCY_OPTIONS: { value: PopupFrequency; label: string; hint: string }[] = [
  { value: "always", label: "همیشه", hint: "در هر بازدید (با احتیاط استفاده کنید)" },
  { value: "session", label: "هر نشست یک‌بار", hint: "تا بستن مرورگر" },
  { value: "daily", label: "روزی یک‌بار", hint: "هر ۲۴ ساعت" },
  { value: "weekly", label: "هفتگی", hint: "هر ۷ روز" },
  { value: "once", label: "فقط یک‌بار", hint: "تا پاک‌شدن حافظهٔ مرورگر" },
];

const initialForm: PopupForm = {
  title: "",
  badge: "",
  description: "",
  image: "",
  image_alt: "",
  theme: "light",
  layout: "center",
  image_position: "top",
  cta_text: "",
  cta_link: "",
  secondary_text: "",
  secondary_link: "",
  coupon_code: "",
  display_pages: [],
  devices: "all",
  delay_seconds: "0",
  auto_close_seconds: "0",
  frequency: "session",
  starts_at: "",
  ends_at: "",
  countdown_to: "",
  close_on_backdrop: true,
  show_close: true,
  is_active: true,
  sort_order: "0",
};

/** ISO سرور را به مقدار قابل‌نمایش در input datetime-local تبدیل می‌کند. */
function toDateTimeInput(value: string | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (part: number) => String(part).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

/** مقدار datetime-local را به فرمت قابل قبول API تبدیل می‌کند. */
function fromDateTimeInput(value: string): string | null {
  const trimmed = value.trim();

  if (trimmed === "") {
    return null;
  }

  return trimmed.length === 16 ? `${trimmed.replace("T", " ")}:00` : trimmed.replace("T", " ");
}

/** ثبت زمان برای نمایش وضعیت زمان‌بندی در جدول. */
function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("fa-IR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function AdminPopups() {
  const [popups, setPopups] = useState<PopupRecord[]>([]);
  const [form, setForm] = useState<PopupForm>(initialForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const formRef = useRef<HTMLElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadPopups = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await adminApi.get("/admin/popups");
      const result = response.data?.data;

      if (!Array.isArray(result)) {
        throw new Error("ساختار پاسخ پاپ‌آپ‌ها معتبر نیست.");
      }

      setPopups(result as PopupRecord[]);
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPopups();
  }, [loadPopups]);

  const stats = useMemo(() => {
    const now = Date.now();
    let active = 0;
    let scheduled = 0;
    let expired = 0;

    popups.forEach((popup) => {
      const starts = popup.starts_at ? Date.parse(popup.starts_at) : null;
      const ends = popup.ends_at ? Date.parse(popup.ends_at) : null;

      if (ends !== null && ends <= now) {
        expired += 1;
      } else if (starts !== null && starts > now) {
        scheduled += 1;
      } else if (popup.is_active) {
        active += 1;
      }
    });

    return { total: popups.length, active, scheduled, expired };
  }, [popups]);

  const imagePreview = getStorageUrl(form.image.trim() || null);

  const updateField = <K extends keyof PopupForm>(key: K, value: PopupForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const togglePage = (page: PopupPage) => {
    setForm((current) => ({
      ...current,
      display_pages: current.display_pages.includes(page)
        ? current.display_pages.filter((item) => item !== page)
        : [...current.display_pages, page],
    }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const startEditing = (popup: PopupRecord) => {
    setEditingId(popup.id);
    setError("");
    setSuccess("");
    setForm({
      title: popup.title ?? "",
      badge: popup.badge ?? "",
      description: popup.description ?? "",
      image: popup.image ?? "",
      image_alt: popup.image_alt ?? "",
      theme: popup.theme,
      layout: popup.layout,
      image_position: popup.image_position,
      cta_text: popup.cta_text ?? "",
      cta_link: popup.cta_link ?? "",
      secondary_text: popup.secondary_text ?? "",
      secondary_link: popup.secondary_link ?? "",
      coupon_code: popup.coupon_code ?? "",
      display_pages: popup.display_pages ?? [],
      devices: popup.devices,
      delay_seconds: String(popup.delay_seconds),
      auto_close_seconds: String(popup.auto_close_seconds),
      frequency: popup.frequency,
      starts_at: toDateTimeInput(popup.starts_at),
      ends_at: toDateTimeInput(popup.ends_at),
      countdown_to: toDateTimeInput(popup.countdown_to),
      close_on_backdrop: popup.close_on_backdrop,
      show_close: popup.show_close,
      is_active: popup.is_active,
      sort_order: String(popup.sort_order),
    });

    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const buildPayload = () => ({
    title: form.title.trim() || null,
    badge: form.badge.trim() || null,
    description: form.description.trim() || null,
    image: form.image.trim() || null,
    image_alt: form.image_alt.trim() || null,
    theme: form.theme,
    layout: form.layout,
    image_position: form.image_position,
    cta_text: form.cta_text.trim() || null,
    cta_link: form.cta_link.trim() || null,
    secondary_text: form.secondary_text.trim() || null,
    secondary_link: form.secondary_link.trim() || null,
    coupon_code: form.coupon_code.trim() || null,
    display_pages: form.display_pages,
    devices: form.devices,
    delay_seconds: Number(form.delay_seconds || 0),
    auto_close_seconds: Number(form.auto_close_seconds || 0),
    frequency: form.frequency,
    starts_at: fromDateTimeInput(form.starts_at),
    ends_at: fromDateTimeInput(form.ends_at),
    countdown_to: fromDateTimeInput(form.countdown_to),
    close_on_backdrop: form.close_on_backdrop,
    show_close: form.show_close,
    is_active: form.is_active,
    sort_order: Number(form.sort_order || 0),
  });

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = buildPayload();

      if (editingId === null) {
        const response = await adminApi.post("/admin/popups", payload);
        setSuccess(response.data?.message ?? "پاپ‌آپ ثبت شد.");
      } else {
        const response = await adminApi.put(`/admin/popups/${editingId}`, payload);
        setSuccess(response.data?.message ?? "پاپ‌آپ ویرایش شد.");
      }

      resetForm();
      await loadPopups();
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (popup: PopupRecord) => {
    setActionId(popup.id);
    setError("");
    setSuccess("");

    try {
      const response = await adminApi.patch(`/admin/popups/${popup.id}/status`, {
        is_active: !popup.is_active,
      });

      setSuccess(response.data?.message ?? "وضعیت پاپ‌آپ تغییر کرد.");
      await loadPopups();
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setActionId(null);
    }
  };

  const deletePopup = async (popup: PopupRecord) => {
    const label = popup.title || "این پاپ‌آپ";

    if (!window.confirm(`«${label}» حذف شود؟ این کار قابل بازگشت نیست.`)) {
      return;
    }

    setActionId(popup.id);
    setError("");
    setSuccess("");

    try {
      const response = await adminApi.delete(`/admin/popups/${popup.id}`);

      if (editingId === popup.id) {
        resetForm();
      }

      setSuccess(response.data?.message ?? "پاپ‌آپ حذف شد.");
      await loadPopups();
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setActionId(null);
    }
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await adminApi.post("/admin/popups/image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const path = response.data?.data?.path;

      if (typeof path !== "string" || path === "") {
        throw new Error("مسیر تصویر در پاسخ سرور نبود.");
      }

      updateField("image", path);
      setSuccess("تصویر بارگذاری شد.");
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <h1 className="admin-page-title">پاپ‌آپ‌ها</h1>
          <p className="admin-page-subtitle">
            کمپین‌های پاپ‌آپ فروشگاه: محتوا، تصویر، دکمه‌ها، کد تخفیف، صفحه‌های
            هدف، دستگاه، بازهٔ زمانی و قاعدهٔ تکرار نمایش.
          </p>
        </div>

        <button
          type="button"
          className="admin-btn admin-btn-sm"
          onClick={() => void loadPopups()}
          disabled={loading}
        >
          <RefreshCw
            size={14}
            className={loading ? "animate-spin" : ""}
            aria-hidden="true"
          />
          به‌روزرسانی
        </button>
      </div>

      {error && <div className="admin-alert admin-alert-error">{error}</div>}
      {success && <div className="admin-alert admin-alert-success">{success}</div>}

      <div className="admin-stats">
        <div className="admin-stat">
          <span className="admin-stat-label">کل پاپ‌آپ‌ها</span>
          <strong className="admin-stat-value">
            {formatAdminNumber(stats.total)}
          </strong>
          <span className="admin-stat-hint">شامل غیرفعال و منقضی</span>
        </div>

        <div className="admin-stat">
          <span className="admin-stat-label">در حال نمایش</span>
          <strong className="admin-stat-value">
            {formatAdminNumber(stats.active)}
          </strong>
          <span className="admin-stat-hint">فعال و داخل بازه</span>
        </div>

        <div className="admin-stat">
          <span className="admin-stat-label">زمان‌بندی‌شده</span>
          <strong className="admin-stat-value">
            {formatAdminNumber(stats.scheduled)}
          </strong>
          <span className="admin-stat-hint">شروع در آینده</span>
        </div>

        <div className="admin-stat">
          <span className="admin-stat-label">منقضی</span>
          <strong className="admin-stat-value">
            {formatAdminNumber(stats.expired)}
          </strong>
          <span className="admin-stat-hint">پایان‌یافته</span>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={(event) => void handleUpload(event)}
      />

      <section className="admin-card" ref={formRef}>
        <div className="admin-card-head">
          <div>
            <h2 className="admin-card-title">
              {editingId === null ? "افزودن پاپ‌آپ تازه" : "ویرایش پاپ‌آپ"}
            </h2>
            <p className="admin-card-desc">
              حداقل یکی از عنوان، توضیح یا تصویر لازم است. تصویر پیشنهادی:
              ۱۲۰۰×۸۰۰ پیکسل (حداکثر ۵ مگابایت). پیام کوتاه و دکمهٔ روشن،
              بهترین نرخ کلیک را دارد.
            </p>
          </div>

          {editingId !== null && (
            <button
              type="button"
              className="admin-btn admin-btn-sm"
              onClick={resetForm}
              disabled={saving}
            >
              <X size={14} aria-hidden="true" />
              بستن فرم
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="admin-form-grid">
            <div className="admin-field">
              <label className="admin-label" htmlFor="popup-title">
                عنوان
              </label>
              <input
                id="popup-title"
                className="admin-input"
                value={form.title}
                onChange={(event) => updateField("title", event.target.value)}
                maxLength={120}
                placeholder="مثلاً: ۲۰٪ تخفیف روی همهٔ محصولات"
              />
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="popup-badge">
                برچسب کوچک
              </label>
              <input
                id="popup-badge"
                className="admin-input"
                value={form.badge}
                onChange={(event) => updateField("badge", event.target.value)}
                maxLength={60}
                placeholder="مثلاً: پیشنهاد امروز"
              />
            </div>

            <div className="admin-field admin-full">
              <label className="admin-label" htmlFor="popup-description">
                متن توضیح
              </label>
              <textarea
                id="popup-description"
                className="admin-input admin-textarea"
                rows={3}
                value={form.description}
                onChange={(event) =>
                  updateField("description", event.target.value)
                }
                maxLength={600}
                placeholder="یک یا دو جملهٔ کوتاه؛ مثلاً: با کد زیر تا پایان امشب ۲۰٪ تخفیف بگیرید."
              />
              <span className="admin-help">
                {formatAdminNumber(form.description.length)} از ۶۰۰ نویسه.
              </span>
            </div>

            <div className="admin-field admin-full">
              <span className="admin-label">تصویر</span>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="admin-btn admin-btn-sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Upload size={13} aria-hidden="true" />
                  )}
                  {uploading ? "در حال بارگذاری..." : "بارگذاری تصویر"}
                </button>

                <input
                  className="admin-input flex-1"
                  value={form.image}
                  onChange={(event) => updateField("image", event.target.value)}
                  maxLength={2048}
                  dir="ltr"
                  placeholder="popups/sale.jpg (اختیاری)"
                />

                {form.image.trim() !== "" && (
                  <button
                    type="button"
                    className="admin-btn admin-btn-sm admin-btn-danger"
                    onClick={() => updateField("image", "")}
                    aria-label="حذف تصویر"
                  >
                    <Trash2 size={13} aria-hidden="true" />
                  </button>
                )}
              </div>

              {imagePreview && (
                <span className="mt-2 block h-28 w-full max-w-sm overflow-hidden rounded-xl border border-line bg-cream">
                  <img
                    src={imagePreview}
                    alt="پیش‌نمایش تصویر پاپ‌آپ"
                    className="h-full w-full object-cover"
                  />
                </span>
              )}
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="popup-image-alt">
                متن جایگزین تصویر
              </label>
              <input
                id="popup-image-alt"
                className="admin-input"
                value={form.image_alt}
                onChange={(event) => updateField("image_alt", event.target.value)}
                maxLength={160}
                placeholder="برای دسترس‌پذیری و سئو"
              />
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="popup-cta-text">
                متن دکمهٔ اصلی
              </label>
              <input
                id="popup-cta-text"
                className="admin-input"
                value={form.cta_text}
                onChange={(event) => updateField("cta_text", event.target.value)}
                maxLength={40}
                placeholder="مثلاً: خرید با تخفیف"
              />
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="popup-cta-link">
                لینک دکمهٔ اصلی
              </label>
              <input
                id="popup-cta-link"
                className="admin-input"
                value={form.cta_link}
                onChange={(event) => updateField("cta_link", event.target.value)}
                maxLength={2048}
                dir="ltr"
                placeholder="/products یا https://..."
              />
              <span className="admin-help">
                لینک داخلی با <span dir="ltr">/</span> شروع شود؛ لینک بیرونی در
                تب جدید باز می‌شود.
              </span>
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="popup-secondary-text">
                متن دکمهٔ دوم
              </label>
              <input
                id="popup-secondary-text"
                className="admin-input"
                value={form.secondary_text}
                onChange={(event) =>
                  updateField("secondary_text", event.target.value)
                }
                maxLength={40}
                placeholder="مثلاً: بعداً"
              />
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="popup-secondary-link">
                لینک دکمهٔ دوم
              </label>
              <input
                id="popup-secondary-link"
                className="admin-input"
                value={form.secondary_link}
                onChange={(event) =>
                  updateField("secondary_link", event.target.value)
                }
                maxLength={2048}
                dir="ltr"
                placeholder="/products?sort=discount (اختیاری)"
              />
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="popup-coupon">
                کد تخفیف
              </label>
              <input
                id="popup-coupon"
                className="admin-input"
                value={form.coupon_code}
                onChange={(event) =>
                  updateField("coupon_code", event.target.value)
                }
                maxLength={40}
                dir="ltr"
                placeholder="SAVE20"
              />
              <span className="admin-help">
                با دکمهٔ «کپی» کنار کد در پاپ‌آپ نمایش داده می‌شود.
              </span>
            </div>

          </div>

          <div className="mt-6 border-t border-line pt-4">
            <h3 className="admin-card-title text-base">ظاهر پاپ‌آپ</h3>

            <div className="admin-form-grid mt-3">
              <div className="admin-field">
                <label className="admin-label" htmlFor="popup-theme">
                  تم رنگی
                </label>
                <select
                  id="popup-theme"
                  className="admin-select"
                  value={form.theme}
                  onChange={(event) =>
                    updateField("theme", event.target.value as PopupTheme)
                  }
                >
                  {THEME_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-field">
                <label className="admin-label" htmlFor="popup-layout">
                  جاگذاری
                </label>
                <select
                  id="popup-layout"
                  className="admin-select"
                  value={form.layout}
                  onChange={(event) =>
                    updateField("layout", event.target.value as PopupLayout)
                  }
                >
                  {LAYOUT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} — {option.hint}
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-field">
                <label className="admin-label" htmlFor="popup-image-position">
                  موقعیت تصویر (دسکتاپ)
                </label>
                <select
                  id="popup-image-position"
                  className="admin-select"
                  value={form.image_position}
                  onChange={(event) =>
                    updateField(
                      "image_position",
                      event.target.value as PopupImagePosition,
                    )
                  }
                >
                  <option value="top">بالای متن</option>
                  <option value="side">کنار متن</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-line pt-4">
            <h3 className="admin-card-title text-base">
              هدف‌گیری و زمان‌بندی
            </h3>

            <div className="admin-form-grid mt-3">
              <div className="admin-field admin-full">
                <span className="admin-label">صفحه‌های نمایش</span>

                <div className="flex flex-wrap gap-2">
                  {PAGE_OPTIONS.map((option) => {
                    const checked = form.display_pages.includes(option.value);

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => togglePage(option.value)}
                        aria-pressed={checked}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                          checked
                            ? "border-brand-500 bg-brand-500 text-white"
                            : "border-line bg-white text-muted hover:border-brand-250 hover:text-brand-700"
                        }`}
                      >
                        {option.label}
                        <span
                          dir="ltr"
                          className={`text-[10px] ${
                            checked ? "text-white/70" : "text-muted-soft"
                          }`}
                        >
                          {option.hint}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <span className="admin-help">
                  هیچ صفحه‌ای انتخاب نشود یعنی پاپ‌آپ در همهٔ صفحه‌ها نمایش داده
                  می‌شود.
                </span>
              </div>

              <div className="admin-field">
                <label className="admin-label" htmlFor="popup-devices">
                  دستگاه
                </label>
                <select
                  id="popup-devices"
                  className="admin-select"
                  value={form.devices}
                  onChange={(event) =>
                    updateField("devices", event.target.value as PopupDevice)
                  }
                >
                  {DEVICE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-field">
                <label className="admin-label" htmlFor="popup-starts-at">
                  شروع نمایش
                </label>
                <input
                  id="popup-starts-at"
                  type="datetime-local"
                  className="admin-input"
                  value={form.starts_at}
                  onChange={(event) =>
                    updateField("starts_at", event.target.value)
                  }
                />
                <span className="admin-help">خالی یعنی از همین حالا.</span>
              </div>

              <div className="admin-field">
                <label className="admin-label" htmlFor="popup-ends-at">
                  پایان نمایش
                </label>
                <input
                  id="popup-ends-at"
                  type="datetime-local"
                  className="admin-input"
                  value={form.ends_at}
                  onChange={(event) => updateField("ends_at", event.target.value)}
                />
                <span className="admin-help">خالی یعنی بدون پایان.</span>
              </div>

              <div className="admin-field">
                <label className="admin-label" htmlFor="popup-countdown">
                  شمارش معکوس تا
                </label>
                <input
                  id="popup-countdown"
                  type="datetime-local"
                  className="admin-input"
                  value={form.countdown_to}
                  onChange={(event) =>
                    updateField("countdown_to", event.target.value)
                  }
                />
                <span className="admin-help">
                  اگر پر شود، شمارش معکوس داخل پاپ‌آپ نمایش داده می‌شود.
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-line pt-4">
            <h3 className="admin-card-title text-base">قواعد نمایش</h3>

            <div className="admin-form-grid mt-3">
              <div className="admin-field">
                <label className="admin-label" htmlFor="popup-delay">
                  تأخیر باز شدن (ثانیه)
                </label>
                <input
                  id="popup-delay"
                  type="number"
                  min={0}
                  max={30}
                  className="admin-input"
                  value={form.delay_seconds}
                  onChange={(event) =>
                    updateField("delay_seconds", event.target.value)
                  }
                />
                <span className="admin-help">۰ تا ۳۰ ثانیه.</span>
              </div>

              <div className="admin-field">
                <label className="admin-label" htmlFor="popup-auto-close">
                  بستن خودکار (ثانیه)
                </label>
                <input
                  id="popup-auto-close"
                  type="number"
                  min={0}
                  max={120}
                  className="admin-input"
                  value={form.auto_close_seconds}
                  onChange={(event) =>
                    updateField("auto_close_seconds", event.target.value)
                  }
                />
                <span className="admin-help">۰ یعنی خودکار بسته نشود.</span>
              </div>

              <div className="admin-field">
                <label className="admin-label" htmlFor="popup-frequency">
                  دفعات نمایش برای هر بازدیدکننده
                </label>
                <select
                  id="popup-frequency"
                  className="admin-select"
                  value={form.frequency}
                  onChange={(event) =>
                    updateField("frequency", event.target.value as PopupFrequency)
                  }
                >
                  {FREQUENCY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} — {option.hint}
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-field">
                <label className="admin-label" htmlFor="popup-sort">
                  اولویت نمایش
                </label>
                <input
                  id="popup-sort"
                  type="number"
                  min={0}
                  max={9999}
                  className="admin-input"
                  value={form.sort_order}
                  onChange={(event) =>
                    updateField("sort_order", event.target.value)
                  }
                />
                <span className="admin-help">
                  عدد کوچک‌تر اول نمایش داده می‌شود.
                </span>
              </div>

              <div className="admin-field admin-full">
                <span className="admin-label">رفتار بستن</span>

                <div className="flex flex-col gap-2">
                  <label className="admin-checkbox">
                    <input
                      type="checkbox"
                      checked={form.show_close}
                      onChange={(event) =>
                        updateField("show_close", event.target.checked)
                      }
                    />
                    <span>دکمهٔ ضربدر (بستن) نمایش داده شود</span>
                  </label>

                  <label className="admin-checkbox">
                    <input
                      type="checkbox"
                      checked={form.close_on_backdrop}
                      onChange={(event) =>
                        updateField("close_on_backdrop", event.target.checked)
                      }
                    />
                    <span>کلیک روی پس‌زمینه پاپ‌آپ را ببندد</span>
                  </label>

                  <label className="admin-checkbox">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(event) =>
                        updateField("is_active", event.target.checked)
                      }
                    />
                    <span>پاپ‌آپ فعال باشد</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-line pt-4">
            <h3 className="admin-card-title text-base">پیش‌نمایش سریع</h3>
            <p className="admin-card-desc">
              نمای تقریبی (بدون پس‌زمینهٔ سایت). تصویر و شیت پایین در سایت با
              همین محتوا رندر می‌شوند.
            </p>

            <div className="mt-3 max-w-sm">
              <div
                className={`overflow-hidden rounded-2xl border shadow-sm ${
                  form.theme === "dark"
                    ? "border-[#24382c] bg-[#16241c] text-white"
                    : form.theme === "brand"
                      ? "border-brand-500 bg-brand-500 text-white"
                      : "border-line bg-white text-ink"
                }`}
              >
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt=""
                    className="h-28 w-full object-cover"
                  />
                )}

                <div className="space-y-2 p-4">
                  {form.badge.trim() !== "" && (
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-black ${
                        form.theme === "light"
                          ? "bg-brand-100 text-brand-700"
                          : "bg-white/20 text-white"
                      }`}
                    >
                      {form.badge}
                    </span>
                  )}

                  {form.title.trim() !== "" && (
                    <p className="text-sm font-black leading-6">{form.title}</p>
                  )}

                  {form.description.trim() !== "" && (
                    <p
                      className={`text-[11px] leading-5 ${
                        form.theme === "light" ? "text-muted" : "text-white/75"
                      }`}
                    >
                      {form.description}
                    </p>
                  )}

                  {form.coupon_code.trim() !== "" && (
                    <span
                      dir="ltr"
                      className={`block rounded-lg border border-dashed px-2 py-1.5 text-center text-xs font-black tracking-[0.2em] ${
                        form.theme === "light"
                          ? "border-brand-250 bg-cream text-brand-700"
                          : "border-white/40 bg-white/10"
                      }`}
                    >
                      {form.coupon_code}
                    </span>
                  )}

                  {form.cta_text.trim() !== "" && (
                    <span
                      className={`flex h-9 items-center justify-center rounded-lg text-[11px] font-black ${
                        form.theme === "light"
                          ? "bg-brand-500 text-white"
                          : "bg-white text-ink"
                      }`}
                    >
                      {form.cta_text}
                    </span>
                  )}
                </div>
              </div>

              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-soft">
                <span className="inline-flex items-center gap-1">
                  <Megaphone size={11} />
                  {LAYOUT_OPTIONS.find((item) => item.value === form.layout)?.label}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MousePointerClick size={11} />
                  {FREQUENCY_OPTIONS.find(
                    (item) => item.value === form.frequency,
                  )?.label}
                </span>
                <span className="inline-flex items-center gap-1">
                  <CalendarClock size={11} />
                  {form.delay_seconds || "۰"} ثانیه تأخیر
                </span>
              </p>
            </div>
          </div>

          <div className="admin-actions">
            <button
              type="submit"
              className="admin-btn admin-btn-primary"
              disabled={saving || uploading}
            >
              <span className="inline-flex items-center gap-2">
                {saving ? (
                  <Loader2 size={15} className="animate-spin" aria-hidden="true" />
                ) : editingId === null ? (
                  <Plus size={15} aria-hidden="true" />
                ) : (
                  <Megaphone size={15} aria-hidden="true" />
                )}
                {editingId === null ? "افزودن پاپ‌آپ" : "ذخیرهٔ تغییرات"}
              </span>
            </button>

            <button
              type="button"
              className="admin-btn"
              onClick={resetForm}
              disabled={saving || uploading}
            >
              انصراف
            </button>
          </div>




        </form>
      </section>

      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2 className="admin-card-title">فهرست پاپ‌آپ‌ها</h2>
            <p className="admin-card-desc">
              پاپ‌آپ‌های فعال به ترتیب «اولویت نمایش» در صفحه‌های هدف دیده
              می‌شوند؛ قاعدهٔ تکرار مانع نمایش تکراری برای همان بازدیدکننده
              می‌شود.
            </p>
          </div>

          <span className="admin-badge admin-badge-gray">
            {formatAdminNumber(popups.length)} مورد
          </span>
        </div>

        {loading ? (
          <div className="admin-empty">در حال دریافت پاپ‌آپ‌ها…</div>
        ) : popups.length === 0 ? (
          <div className="admin-empty">
            هنوز پاپ‌آپی ثبت نشده است. فرم بالا را پر کنید تا اولین کمپین ساخته
            شود.
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>تصویر</th>
                  <th>عنوان</th>
                  <th>صفحه‌ها</th>
                  <th>تکرار</th>
                  <th>زمان‌بندی</th>
                  <th>وضعیت</th>
                  <th>اقدامات</th>
                </tr>
              </thead>

              <tbody>
                {popups.map((popup) => {
                  const busy = actionId === popup.id;
                  const thumb = getStorageUrl(popup.image);
                  const now = Date.now();
                  const endsAt = popup.ends_at ? Date.parse(popup.ends_at) : null;
                  const startsAt = popup.starts_at
                    ? Date.parse(popup.starts_at)
                    : null;
                  const expired = endsAt !== null && endsAt <= now;
                  const scheduled = startsAt !== null && startsAt > now;

                  const statusLabel = !popup.is_active
                    ? "غیرفعال"
                    : expired
                      ? "منقضی"
                      : scheduled
                        ? "زمان‌بندی‌شده"
                        : "فعال";

                  const statusClass = !popup.is_active
                    ? "admin-badge-red"
                    : expired
                      ? "admin-badge-gray"
                      : scheduled
                        ? "admin-badge-amber"
                        : "admin-badge-green";

                  const pageLabel =
                    popup.display_pages === null ||
                    popup.display_pages.length === 0
                      ? "همهٔ صفحه‌ها"
                      : popup.display_pages
                          .map(
                            (page) =>
                              PAGE_OPTIONS.find(
                                (option) => option.value === page,
                              )?.label ?? page,
                          )
                          .join("، ");

                  const frequencyLabel =
                    FREQUENCY_OPTIONS.find(
                      (option) => option.value === popup.frequency,
                    )?.label ?? popup.frequency;

                  return (
                    <tr key={popup.id}>
                      <td>
                        <span className="flex h-12 w-16 items-center justify-center overflow-hidden rounded-lg border border-line bg-white">
                          {thumb ? (
                            <img
                              src={thumb}
                              alt={popup.title || "پاپ‌آپ"}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <ImagePlus
                              size={18}
                              className="text-muted-soft"
                              aria-hidden="true"
                            />
                          )}
                        </span>
                      </td>

                      <td>
                        <span className="block font-bold">
                          {popup.title || "بدون عنوان"}
                        </span>
                        {popup.badge && (
                          <span className="mt-0.5 block text-[11px] text-muted-soft">
                            {popup.badge}
                          </span>
                        )}
                        {popup.coupon_code && (
                          <span
                            dir="ltr"
                            className="mt-0.5 block text-[11px] font-black text-brand-700"
                          >
                            {popup.coupon_code}
                          </span>
                        )}
                      </td>

                      <td className="text-xs">{pageLabel}</td>

                      <td className="text-xs">
                        {frequencyLabel}
                        <span className="mt-0.5 block text-[11px] text-muted-soft">
                          تأخیر {formatAdminNumber(popup.delay_seconds)} ثانیه
                        </span>
                      </td>

                      <td className="text-[11px] leading-5">
                        <span className="block">
                          شروع: {formatDateTime(popup.starts_at)}
                        </span>
                        <span className="block">
                          پایان: {formatDateTime(popup.ends_at)}
                        </span>
                      </td>

                      <td>
                        <span className={`admin-badge ${statusClass}`}>
                          {statusLabel}
                        </span>
                      </td>

                      <td>
                        <div className="admin-row-actions">
                          <button
                            type="button"
                            className="admin-btn admin-btn-sm"
                            onClick={() => startEditing(popup)}
                            disabled={busy || saving}
                          >
                            ویرایش
                          </button>

                          <button
                            type="button"
                            className="admin-btn admin-btn-sm"
                            onClick={() => void toggleStatus(popup)}
                            disabled={busy || saving}
                          >
                            {busy
                              ? "..."
                              : popup.is_active
                                ? "غیرفعال‌سازی"
                                : "فعال‌سازی"}
                          </button>

                          <button
                            type="button"
                            className="admin-btn admin-btn-sm admin-btn-danger"
                            onClick={() => void deletePopup(popup)}
                            disabled={busy || saving}
                          >
                            <Trash2 size={13} aria-hidden="true" />
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

export default AdminPopups;
