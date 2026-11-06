import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { ImagePlus, Loader2, Plus, Upload } from "lucide-react";

import AdminBannerFontsPanel from "../components/AdminBannerFontsPanel";
import AdminBannerTextEditor from "../components/AdminBannerTextEditor";
import JalaliDatePicker from "../components/JalaliDatePicker";
import { useAdminBannerFonts } from "../hooks/useBannerFonts";
import { adminApi } from "../services/api";
import {
  formatAdminDate,
  getAdminErrorMessage,
  toDateTimeInput,
} from "../utils/adminFormat";
import {
  sanitizeBannerTextLayers,
  type BannerTextLayer,
  type BannerTextScrim,
} from "../utils/bannerText";
import { getStorageUrl } from "../utils/images";

interface Banner {
  id: number;
  title: string | null;
  subtitle: string | null;
  image: string;
  /** تصویر نسخهٔ موبایل (مثلاً ۷۵۰×۱۰۰۰)؛ اختیاری. */
  mobile_image: string | null;
  /** متن جایگزین تصویر برای سئو و screen reader. */
  image_alt: string | null;
  /** پردهٔ تیره پشت متن (none | light | medium | dark). */
  text_scrim: string | null;
  /** لایه‌های متن روی بنر (JSON از API). */
  text_layers: unknown;
  link: string | null;
  button_label: string | null;
  position: "home_hero" | "home_strip" | "products_top";
  sort_order: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
}

interface BannerForm {
  title: string;
  subtitle: string;
  image: string;
  mobile_image: string;
  image_alt: string;
  text_scrim: BannerTextScrim;
  text_layers: BannerTextLayer[];
  link: string;
  button_label: string;
  position: Banner["position"];
  sort_order: string;
  is_active: boolean;
  starts_at: string;
  ends_at: string;
}

const initialForm: BannerForm = {
  title: "",
  subtitle: "",
  image: "",
  mobile_image: "",
  image_alt: "",
  text_scrim: "none",
  text_layers: [],
  link: "",
  button_label: "",
  position: "home_hero",
  sort_order: "0",
  is_active: true,
  starts_at: "",
  ends_at: "",
};

const positionLabels: Record<Banner["position"], string> = {
  home_hero: "اسلایدر اصلی صفحهٔ اول",
  home_strip: "نوار تبلیغاتی صفحهٔ اول",
  products_top: "بالای صفحهٔ محصولات",
};

/**
 * تصاویر آمادهٔ خودِ سایت (پوشهٔ frontend/public/images).
 * این تصاویر در بک‌اند نیستند و لازم نیست بارگذاری شوند؛ کافی است مسیرشان در
 * بنر ذخیره شود. این‌ها فقط میان‌بر انتخاب تصویرند و هیچ بنر پیش‌فرضی در سایت
 * نمایش داده نمی‌شود؛ تا بنری در پنل ثبت نشود، هیرو صفحهٔ اول خالی می‌ماند.
 */
const SITE_IMAGE_PRESETS = [
  {
    path: "/images/women-sport-hero.png",
    label: "هیرو اصلی سایت",
    hint: "تصویر عریض دسکتاپ؛ متن و دکمه داخل خود تصویر است. برای موبایل باید تصویر موبایل جدا ثبت شود",
  },
  {
    path: "/images/women-sport-hero2.png",
    label: "هیرو جایگزین",
    hint: "مناسب اسلاید دوم اسلایدر اصلی",
  },
] as const;

/**
 * تصویر نسخهٔ موبایل بنر هیرو.
 * تصویر عریض دسکتاپ روی موبایل خیلی کوتاه و ریز می‌شود؛ با این تصویر (نسبت
 * عمودی/مربع، مثل ۷۵۰×۱۰۰۰) سایت زیر ۷۶۸ پیکسل این نسخه را نشان می‌دهد.
 */
const SITE_MOBILE_IMAGE_PRESETS = [
  {
    path: "/images/women-sport-hero-mobile.png",
    label: "هیرو موبایل",
    hint: "نسخهٔ موبایل تصویر اصلی سایت؛ در عرض کمتر از ۷۶۸ پیکسل نمایش داده می‌شود",
  },
] as const;

/**
 * ابعاد پیشنهادی تصویر بنر.
 * بنر هیرو در تمام عرض صفحه و با نسبت تصویر خودش (بدون برش) نمایش داده
 * می‌شود؛ پس هر یک از این نسبت‌ها بدون بریدگی می‌نشیند.
 */
const BANNER_SIZE_HINTS = [
  { label: "دسکتاپ عریض", size: "۱۹۲۰ × ۶۵۰" },
  { label: "دسکتاپ بلندتر", size: "۱۹۲۰ × ۷۵۰" },
  { label: "لپ‌تاپ", size: "۱۴۴۰ × ۶۰۰" },
  { label: "موبایل", size: "۷۵۰ × ۱۰۰۰" },
] as const;

function AdminBanners() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [form, setForm] = useState<BannerForm>(initialForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  // کتابخانهٔ فونت بنرها (بارگذاری/حذف/وضعیت) در یک جا نگه داشته می‌شود تا
  // ویرایشگر متن و پنل فونت همان فهرست را ببینند.
  const {
    fonts,
    loading: fontsLoading,
    error: fontsError,
    createFont,
    deleteFont,
    toggleFont,
  } = useAdminBannerFonts();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [previewBroken, setPreviewBroken] = useState(false);
  const [mobilePreviewBroken, setMobilePreviewBroken] = useState(false);
  const [brokenImages, setBrokenImages] = useState<Record<number, boolean>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mobileImageInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLElement>(null);

  const loadBanners = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await adminApi.get("/admin/banners");
      const result = response.data?.data;

      if (!Array.isArray(result)) {
        throw new Error("ساختار پاسخ بنرها معتبر نیست.");
      }

      setBanners(result);
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBanners();
  }, [loadBanners]);

  useEffect(() => {
    setBrokenImages({});
  }, [banners]);

  useEffect(() => {
    setPreviewBroken(false);
  }, [form.image]);

  useEffect(() => {
    setMobilePreviewBroken(false);
  }, [form.mobile_image]);

  function updateField<K extends keyof BannerForm>(
    field: K,
    value: BannerForm[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function scrollToForm() {
    window.setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
    setFormOpen(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (mobileImageInputRef.current) {
      mobileImageInputRef.current.value = "";
    }
  }

  function openCreateForm() {
    setError("");
    setSuccess("");
    setForm(initialForm);
    setEditingId(null);
    setFormOpen(true);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (mobileImageInputRef.current) {
      mobileImageInputRef.current.value = "";
    }

    scrollToForm();
  }

  function startEditing(banner: Banner) {
    setError("");
    setSuccess("");
    setEditingId(banner.id);
    setForm({
      title: banner.title ?? "",
      subtitle: banner.subtitle ?? "",
      image: banner.image ?? "",
      mobile_image: banner.mobile_image ?? "",
      image_alt: banner.image_alt ?? "",
      text_scrim:
        banner.text_scrim === "light" ||
        banner.text_scrim === "medium" ||
        banner.text_scrim === "dark"
          ? banner.text_scrim
          : "none",
      text_layers: sanitizeBannerTextLayers(banner.text_layers),
      link: banner.link ?? "",
      button_label: banner.button_label ?? "",
      position: banner.position ?? "home_hero",
      sort_order: String(banner.sort_order ?? 0),
      is_active: Boolean(banner.is_active),
      starts_at: toDateTimeInput(banner.starts_at),
      ends_at: toDateTimeInput(banner.ends_at),
    });
    setFormOpen(true);

    scrollToForm();
  }

  /**
   * بارگذاری تصویر بنر. `field` مشخص می‌کند مسیر برگشتی در فیلد تصویر اصلی
   * (دسکتاپ) یا تصویر موبایل قرار بگیرد.
   */
  async function handleImageUpload(
    event: ChangeEvent<HTMLInputElement>,
    field: "image" | "mobile_image" = "image",
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    setUploading(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await adminApi.post("/admin/banners/image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const path = response.data?.data?.path;

      if (typeof path !== "string" || path === "") {
        throw new Error("بارگذاری تصویر بنر انجام نشد.");
      }

      updateField(field, path);
      setSuccess(
        field === "mobile_image"
          ? "تصویر موبایل بنر بارگذاری شد."
          : "تصویر بنر بارگذاری شد.",
      );
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      if (mobileImageInputRef.current) {
        mobileImageInputRef.current.value = "";
      }
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving || uploading) return;

    if (!form.image.trim()) {
      setError("نشانی تصویر بنر الزامی است.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        title: form.title.trim() || null,
        subtitle: form.subtitle.trim() || null,
        image: form.image.trim(),
        mobile_image: form.mobile_image.trim() || null,
        image_alt: form.image_alt.trim() || null,
        text_scrim: form.text_scrim,
        // لایه‌های بدون متن را نمی‌فرستیم تا بک‌اند آن‌ها را دور بریزد.
        text_layers: form.text_layers
          .filter((layer) => layer.text.trim().length > 0)
          .map((layer) => ({ ...layer, text: layer.text.trim() })),
        link: form.link.trim() || null,
        button_label: form.button_label.trim() || null,
        position: form.position,
        sort_order: Number(form.sort_order) || 0,
        is_active: form.is_active,
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
      };

      if (editingId === null) {
        const response = await adminApi.post("/admin/banners", payload);
        setSuccess(response.data?.message ?? "بنر ایجاد شد.");
      } else {
        const response = await adminApi.put(
          `/admin/banners/${editingId}`,
          payload,
        );
        setSuccess(response.data?.message ?? "بنر ویرایش شد.");
      }

      resetForm();
      await loadBanners();
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(banner: Banner) {
    setActionId(banner.id);
    setError("");
    setSuccess("");

    try {
      await adminApi.patch(`/admin/banners/${banner.id}/status`, {
        is_active: !banner.is_active,
      });

      setSuccess(banner.is_active ? "بنر غیرفعال شد." : "بنر فعال شد.");
      await loadBanners();
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setActionId(null);
    }
  }

  async function deleteBanner(banner: Banner) {
    if (!window.confirm("این بنر حذف شود؟")) {
      return;
    }

    setActionId(banner.id);
    setError("");
    setSuccess("");

    try {
      const response = await adminApi.delete(`/admin/banners/${banner.id}`);

      setSuccess(response.data?.message ?? "بنر حذف شد.");
      await loadBanners();
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setActionId(null);
    }
  }

  const imagePreview = getStorageUrl(form.image);
  const mobileImagePreview = getStorageUrl(form.mobile_image);

  return (
    <div dir="rtl" className="admin-page">
      <header className="admin-page-head">
        <div>
          <span className="admin-page-eyebrow">مدیریت محتوا</span>
          <h1 className="admin-page-title">بنرهای فروشگاه</h1>
          <p className="admin-page-subtitle">
            تصاویر بنر بالای صفحهٔ اول و نوار تبلیغاتی را مدیریت کنید. بنرهای
            «اسلایدر اصلی» جای تصویر بزرگ صفحهٔ اول را می‌گیرند، در تمام عرض
            صفحه و با نسبت تصویر خودشان (بدون برش) نمایش داده می‌شوند و اگر بیش
            از یکی باشند هر ۵ ثانیه خودکار اسلاید می‌شوند؛ اگر هیچ بنر فعالی در
            این بخش نباشد تصویر پیش‌فرض سایت نمایش داده می‌شود. «نوار تبلیغاتی»
            تصویر بنر را در کارت‌های ریز زیر هیرو نشان می‌دهد. بنر غیرفعال یا
            خارج از بازهٔ زمانی در سایت دیده نمی‌شود. با دکمهٔ «بنر اصلی از
            تصویر پیش‌فرض» همان تصویر بزرگ فعلی سایت به یک بنر قابل ویرایش تبدیل
            می‌شود؛ نیازی به بارگذاری دوبارهٔ فایل نیست.
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
              افزودن بنر
            </span>
          </button>

          <button
            type="button"
            className="admin-btn"
            onClick={() => void loadBanners()}
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

      {formOpen && (
        <section className="admin-card" ref={formRef}>
          <div className="admin-card-head">
            <div>
              <h2 className="admin-card-title">
                {editingId === null ? "افزودن بنر جدید" : "ویرایش بنر"}
              </h2>
              <p className="admin-card-desc">
                تصویر را بارگذاری کنید، یکی از «تصاویر آمادهٔ سایت» را انتخاب کنید
                یا نشانی کامل/مسیر فایل را وارد کنید؛ برای اسلایدر اصلی می‌توانید
                تصویر موبایل جداگانه هم ثبت کنید. بازهٔ نمایش به تاریخ شمسی ثبت
                می‌شود.
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

          <form onSubmit={handleSubmit}>
            <div className="admin-form-grid">
              <div className="admin-field">
                <label className="admin-label" htmlFor="banner-title">
                  عنوان
                </label>
                <input
                  id="banner-title"
                  className="admin-input"
                  value={form.title}
                  onChange={(event) => updateField("title", event.target.value)}
                  maxLength={255}
                />
              </div>

              <div className="admin-field">
                <label className="admin-label" htmlFor="banner-subtitle">
                  زیرعنوان
                </label>
                <input
                  id="banner-subtitle"
                  className="admin-input"
                  value={form.subtitle}
                  onChange={(event) =>
                    updateField("subtitle", event.target.value)
                  }
                  maxLength={255}
                />
              </div>

              <div className="admin-field admin-full">
                <label className="admin-label" htmlFor="banner-image">
                  تصویر بنر *
                </label>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="flex h-24 w-40 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-[#dfe7d8] bg-[#f8faf5]">
                    {imagePreview && !previewBroken ? (
                      <img
                        src={imagePreview}
                        alt="پیش‌نمایش تصویر بنر"
                        className="h-full w-full object-cover"
                        onError={() => setPreviewBroken(true)}
                      />
                    ) : (
                      <span className="inline-flex flex-col items-center gap-1 text-[11px] text-[#9aa894]">
                        <ImagePlus size={20} aria-hidden="true" />
                        {imagePreview ? "تصویر پیدا نشد" : "بدون تصویر"}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        ref={fileInputRef}
                        id="banner-image-file"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(event) => void handleImageUpload(event)}
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
                          {uploading
                            ? "در حال بارگذاری..."
                            : "بارگذاری تصویر بنر"}
                        </span>
                      </button>

                      {form.image && (
                        <button
                          type="button"
                          className="admin-btn admin-btn-sm admin-btn-danger"
                          onClick={() => updateField("image", "")}
                          disabled={uploading || saving}
                        >
                          حذف تصویر
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold text-[#6b7a67]">
                        تصاویر آمادهٔ سایت:
                      </span>

                      {SITE_IMAGE_PRESETS.map((preset) => {
                        const isSelected = form.image.trim() === preset.path;

                        return (
                          <button
                            key={preset.path}
                            type="button"
                            onClick={() => updateField("image", preset.path)}
                            disabled={uploading || saving}
                            aria-pressed={isSelected}
                            title={preset.hint}
                            className={`overflow-hidden rounded-lg border-2 bg-white p-0 transition ${
                              isSelected
                                ? "border-[#648767] ring-2 ring-[#648767]/20"
                                : "border-[#e3ebdc] hover:border-[#a8bea1]"
                            }`}
                          >
                            <img
                              src={preset.path}
                              alt={preset.label}
                              className="block h-12 w-24 object-cover"
                            />
                            <span className="block px-1 py-0.5 text-[10px] font-bold text-[#4b5f4a]">
                              {preset.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <input
                      id="banner-image"
                      className="admin-input"
                      value={form.image}
                      onChange={(event) =>
                        updateField("image", event.target.value)
                      }
                      dir="ltr"
                      maxLength={2048}
                      required
                      placeholder="banners/banner.jpg"
                    />

                    {previewBroken && imagePreview && (
                      <p
                        className="text-[11px] leading-6 text-[#b91c1c]"
                        dir="rtl"
                      >
                        تصویر از نشانی{" "}
                        <span dir="ltr">{imagePreview}</span> بارگذاری نشد؛ اگر
                        تازه فایل را آپلود کرده‌اید یک‌بار دستور{" "}
                        <span dir="ltr">php artisan storage:link</span> را در
                        پوشهٔ backend اجرا کنید.
                      </p>
                    )}

                    <p className="text-[11px] leading-6 text-[#9aa894]">
                      مسیر فایل بارگذاری‌شده (مثل{" "}
                      <span dir="ltr">banners/banner.jpg</span>)، آدرس کامل، یا
                      مسیر تصویر آمادهٔ سایت (مثل{" "}
                      <span dir="ltr">/images/women-sport-hero.png</span>) را
                      می‌توانید وارد کنید. حداکثر ۵ مگابایت با فرمت JPG، PNG یا
                      WebP.
                    </p>

                    <div className="rounded-xl border border-[#e6ecdf] bg-[#f8faf5] p-3">
                      <p className="text-[11px] font-bold leading-6 text-[#4b5f4a]">
                        بنر اسلایدر اصلی در تمام عرض صفحه و با نسبت تصویر خودش
                        (بدون برش) نمایش داده می‌شود؛ ابعاد پیشنهادی:
                      </p>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {BANNER_SIZE_HINTS.map((item) => (
                          <span
                            key={item.label}
                            className="inline-flex items-center gap-1 rounded-full border border-[#dfe7d8] bg-white px-2.5 py-1 text-[11px] text-[#4b5f4a]"
                          >
                            {item.label}:
                            <span dir="ltr" className="font-bold">
                              {item.size}
                            </span>
                          </span>
                        ))}
                      </div>

                      <p className="mt-2 text-[11px] leading-6 text-[#9aa894]">
                        «نوار تبلیغاتی» تصویر را با همان نسبت خودش و بدون برش
                        نشان می‌دهد؛ برای هماهنگی کارت‌ها تصویرهای هم‌ارتفاع
                        بگذارید.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="admin-field admin-full">
                <label className="admin-label" htmlFor="banner-mobile-image">
                  تصویر موبایل (اختیاری)
                </label>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="flex h-24 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-[#dfe7d8] bg-[#f8faf5]">
                    {mobileImagePreview && !mobilePreviewBroken ? (
                      <img
                        src={mobileImagePreview}
                        alt="پیش‌نمایش تصویر موبایل بنر"
                        className="h-full w-full object-cover"
                        onError={() => setMobilePreviewBroken(true)}
                      />
                    ) : (
                      <span className="inline-flex flex-col items-center gap-1 text-[11px] text-[#9aa894]">
                        <ImagePlus size={20} aria-hidden="true" />
                        {mobileImagePreview ? "تصویر پیدا نشد" : "بدون تصویر"}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        ref={mobileImageInputRef}
                        id="banner-mobile-image-file"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(event) =>
                          void handleImageUpload(event, "mobile_image")
                        }
                        className="hidden"
                      />

                      <button
                        type="button"
                        className="admin-btn admin-btn-sm"
                        onClick={() => mobileImageInputRef.current?.click()}
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
                          {uploading
                            ? "در حال بارگذاری..."
                            : "بارگذاری تصویر موبایل"}
                        </span>
                      </button>

                      {form.mobile_image && (
                        <button
                          type="button"
                          className="admin-btn admin-btn-sm admin-btn-danger"
                          onClick={() => updateField("mobile_image", "")}
                          disabled={uploading || saving}
                        >
                          حذف تصویر موبایل
                        </button>
                      )}

                      {SITE_MOBILE_IMAGE_PRESETS.map((preset) => {
                        const isSelected =
                          form.mobile_image.trim() === preset.path;

                        return (
                          <button
                            key={preset.path}
                            type="button"
                            onClick={() =>
                              updateField("mobile_image", preset.path)
                            }
                            disabled={uploading || saving}
                            aria-pressed={isSelected}
                            title={preset.hint}
                            className={`overflow-hidden rounded-lg border-2 bg-white p-0 transition ${
                              isSelected
                                ? "border-[#648767] ring-2 ring-[#648767]/20"
                                : "border-[#e3ebdc] hover:border-[#a8bea1]"
                            }`}
                          >
                            <img
                              src={preset.path}
                              alt={preset.label}
                              className="block h-12 w-12 object-cover"
                            />
                            <span className="block px-1 py-0.5 text-[10px] font-bold text-[#4b5f4a]">
                              {preset.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <input
                      id="banner-mobile-image"
                      className="admin-input"
                      value={form.mobile_image}
                      onChange={(event) =>
                        updateField("mobile_image", event.target.value)
                      }
                      dir="ltr"
                      maxLength={2048}
                      placeholder="/images/women-sport-hero-mobile.png"
                    />

                    <p className="text-[11px] leading-6 text-[#9aa894]">
                      این تصویر کاملاً مستقل از تصویر دسکتاپ است و فقط روی
                      موبایل (عرض کمتر از ۷۶۸ پیکسل) نمایش داده می‌شود. ابعاد
                      پیشنهادی موبایل:{" "}
                      <span dir="ltr" className="font-bold">
                        ۷۵۰ × ۱۰۰۰
                      </span>{" "}
                      و این تصویر در بنر هیرو، نوار تبلیغاتی و بنر بالای صفحهٔ
                      محصولات استفاده می‌شود.
                    </p>

                    {!form.mobile_image.trim() && (
                      <p className="rounded-lg border border-[#f0d9a8] bg-[#fff9ec] px-3 py-2 text-[11px] leading-6 text-[#8a5a00]">
                        ⚠️ تصویر موبایل ثبت نشده است؛ این بنر روی گوشی نمایش
                        داده نمی‌شود (تصویر دسکتاپ جای آن نمی‌نشیند و هیچ نسخهٔ
                        پیش‌فرضی هم وجود ندارد). برای نمایش بنر روی موبایل،
                        تصویر موبایل را بارگذاری کنید.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="admin-field">
                <label className="admin-label" htmlFor="banner-position">
                  محل نمایش
                </label>
                <select
                  id="banner-position"
                  className="admin-select"
                  value={form.position}
                  onChange={(event) =>
                    updateField(
                      "position",
                      event.target.value as Banner["position"],
                    )
                  }
                >
                  {Object.entries(positionLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>

                <p className="text-[11px] leading-6 text-[#9aa894]">
                  «اسلایدر اصلی» تصویر بزرگ بالای صفحهٔ اول را نمایش می‌دهد؛ با
                  ثبت بیش از یک بنر فعال در این بخش، اسلایدر خودکار فعال می‌شود.
                </p>
              </div>

              <div className="admin-field">
                <label className="admin-label" htmlFor="banner-link">
                  لینک مقصد
                </label>
                <input
                  id="banner-link"
                  className="admin-input"
                  value={form.link}
                  onChange={(event) => updateField("link", event.target.value)}
                  dir="ltr"
                  maxLength={2048}
                  placeholder="/products?category=..."
                />
              </div>

              <div className="admin-field">
                <label className="admin-label" htmlFor="banner-button">
                  متن دکمه
                </label>
                <input
                  id="banner-button"
                  className="admin-input"
                  value={form.button_label}
                  onChange={(event) =>
                    updateField("button_label", event.target.value)
                  }
                  maxLength={60}
                  placeholder="مشاهدهٔ محصولات"
                />
              </div>

              <div className="admin-field">
                <label className="admin-label" htmlFor="banner-sort">
                  ترتیب نمایش
                </label>
                <input
                  id="banner-sort"
                  type="number"
                  min={0}
                  className="admin-input"
                  value={form.sort_order}
                  onChange={(event) =>
                    updateField("sort_order", event.target.value)
                  }
                  dir="ltr"
                />
              </div>

              <div className="admin-field">
                <label className="admin-label" htmlFor="banner-start">
                  شروع نمایش (شمسی)
                </label>
                <JalaliDatePicker
                  id="banner-start"
                  value={form.starts_at}
                  onChange={(value) => updateField("starts_at", value)}
                />
                <span className="admin-help">
                  خالی بماند، از ابتدا نمایش داده می‌شود.
                </span>
              </div>

              <div className="admin-field">
                <label className="admin-label" htmlFor="banner-end">
                  پایان نمایش (شمسی)
                </label>
                <JalaliDatePicker
                  id="banner-end"
                  value={form.ends_at}
                  onChange={(value) => updateField("ends_at", value)}
                  defaultHour={23}
                  defaultMinute={59}
                />
                <span className="admin-help">خالی بماند، بدون پایان است.</span>
              </div>

              <label
                className="admin-checkbox admin-full"
                htmlFor="banner-active"
              >
                <input
                  id="banner-active"
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) =>
                    updateField("is_active", event.target.checked)
                  }
                />
                بنر فعال باشد
              </label>
            </div>

            <AdminBannerTextEditor
              imagePath={form.image}
              mobileImagePath={form.mobile_image}
              layers={form.text_layers}
              scrim={form.text_scrim}
              imageAlt={form.image_alt}
              fonts={fonts}
              disabled={saving}
              onLayersChange={(layers) => updateField("text_layers", layers)}
              onScrimChange={(scrim) => updateField("text_scrim", scrim)}
              onImageAltChange={(alt) => updateField("image_alt", alt)}
            />

            <div className="admin-actions">
              <button
                type="submit"
                className="admin-btn admin-btn-primary"
                disabled={saving || uploading}
              >
                {saving
                  ? "در حال ذخیره..."
                  : editingId === null
                    ? "ایجاد بنر"
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

      <AdminBannerFontsPanel
        fonts={fonts}
        loading={fontsLoading}
        error={fontsError}
        disabled={saving}
        onCreate={createFont}
        onToggle={toggleFont}
        onDelete={deleteFont}
      />

      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2 className="admin-card-title">فهرست بنرها</h2>
            <p className="admin-card-desc">
              بنرهای فعال به ترتیب «ترتیب نمایش» در سایت قرار می‌گیرند؛ در اسلایدر
              اصلی همین ترتیب، ترتیب اسلایدها است.
            </p>
          </div>

          <button
            type="button"
            className="admin-btn admin-btn-sm"
            onClick={openCreateForm}
          >
            <span className="inline-flex items-center gap-1.5">
              <Plus size={14} aria-hidden="true" />
              افزودن بنر
            </span>
          </button>
        </div>

        {loading ? (
          <p className="admin-empty">در حال دریافت بنرها...</p>
        ) : banners.length === 0 ? (
          <p className="admin-empty">هنوز بنری ثبت نشده است.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>تصویر</th>
                  <th>عنوان</th>
                  <th>محل نمایش</th>
                  <th>بازهٔ نمایش</th>
                  <th>ترتیب</th>
                  <th>وضعیت</th>
                  <th>عملیات</th>
                </tr>
              </thead>

              <tbody>
                {banners.map((banner) => {
                  const busy = actionId === banner.id;
                  const imageUrl = getStorageUrl(banner.image);

                  return (
                    <tr key={banner.id}>
                      <td>
                        {imageUrl && !brokenImages[banner.id] ? (
                          <a
                            href={imageUrl}
                            target="_blank"
                            rel="noreferrer"
                            title="مشاهدهٔ تصویر"
                          >
                            <img
                              src={imageUrl}
                              alt={banner.title ?? "بنر"}
                              loading="lazy"
                              onError={() =>
                                setBrokenImages((current) => ({
                                  ...current,
                                  [banner.id]: true,
                                }))
                              }
                              style={{
                                width: 84,
                                height: 46,
                                objectFit: "cover",
                                borderRadius: 8,
                                border: "1px solid #e5e7eb",
                                background: "#f8faf5",
                              }}
                            />
                          </a>
                        ) : (
                          <span
                            style={{
                              display: "inline-flex",
                              flexDirection: "column",
                              gap: 2,
                              fontSize: 11,
                              color: banner.image ? "#b91c1c" : "#9ca3af",
                            }}
                          >
                            {banner.image ? "تصویر یافت نشد" : "—"}
                            {banner.image && (
                              <span dir="ltr" style={{ color: "#9ca3af" }}>
                                {banner.image}
                              </span>
                            )}
                          </span>
                        )}

                        <div
                          style={{
                            marginTop: 4,
                            fontSize: 10,
                            fontWeight: 700,
                            color: banner.mobile_image ? "#3f6b45" : "#9ca3af",
                          }}
                        >
                          {banner.mobile_image ? "موبایل ✓" : "موبایل: —"}
                        </div>
                      </td>
                      <td>
                        {banner.title || "—"}
                        {banner.subtitle && (
                          <div style={{ fontSize: 11, color: "#9ca3af" }}>
                            {banner.subtitle}
                          </div>
                        )}
                      </td>
                      <td>{positionLabels[banner.position] ?? "—"}</td>
                      <td style={{ fontSize: 12 }}>
                        {banner.starts_at || banner.ends_at
                          ? `${formatAdminDate(
                              banner.starts_at,
                              true,
                            )} تا ${formatAdminDate(banner.ends_at, true)}`
                          : "همیشگی"}
                      </td>
                      <td>{banner.sort_order}</td>
                      <td>
                        <span
                          className={`admin-badge ${
                            banner.is_active
                              ? "admin-badge-green"
                              : "admin-badge-red"
                          }`}
                        >
                          {banner.is_active ? "فعال" : "غیرفعال"}
                        </span>
                      </td>
                      <td>
                        <div className="admin-row-actions">
                          <button
                            type="button"
                            className="admin-btn admin-btn-sm"
                            onClick={() => startEditing(banner)}
                            disabled={busy || saving}
                          >
                            ویرایش
                          </button>

                          <button
                            type="button"
                            className="admin-btn admin-btn-sm"
                            onClick={() => void toggleStatus(banner)}
                            disabled={busy || saving}
                          >
                            {busy
                              ? "..."
                              : banner.is_active
                                ? "غیرفعال‌سازی"
                                : "فعال‌سازی"}
                          </button>

                          <button
                            type="button"
                            className="admin-btn admin-btn-sm admin-btn-danger"
                            onClick={() => void deleteBanner(banner)}
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

export default AdminBanners;
