import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  CirclePlay,
  ImagePlus,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { adminApi } from "../services/api";
import { formatAdminNumber, getAdminErrorMessage } from "../utils/adminFormat";
import { getStorageUrl } from "../utils/images";

/** یک اسلاید از استوری: تصویر تمام‌صفحه + متن اختیاری + لینک اختیاری. */
interface StorySlideForm {
  image: string;
  caption: string;
  link: string;
}

/** یک استوری ثبت‌شده در سرور. */
interface StoryRecord {
  id: number;
  title: string;
  cover_image: string | null;
  slides: StorySlideForm[];
  sort_order: number;
  is_active: boolean;
}

interface StoryForm {
  title: string;
  cover_image: string;
  slides: StorySlideForm[];
  sort_order: string;
  is_active: boolean;
}

const emptySlide: StorySlideForm = { image: "", caption: "", link: "" };

const initialForm: StoryForm = {
  title: "",
  cover_image: "",
  slides: [{ ...emptySlide }],
  sort_order: "0",
  is_active: true,
};

/**
 * مدیریت استوری‌های صفحهٔ اول فروشگاه (دایره‌های بالای دسته‌بندی‌ها).
 *
 * مدیر می‌تواند برای هر استوری: تصویر دایره (کاور)، عنوان زیر آن، اسلایدها
 * (تصویر + متن + لینک)، ترتیب نمایش و وضعیت فعال بودن را تعیین کند. استوری‌های
 * فعال در نوار بالای دسته‌بندی‌های صفحهٔ اول نمایش داده می‌شوند.
 */
function AdminStories() {
  const [stories, setStories] = useState<StoryRecord[]>([]);
  const [form, setForm] = useState<StoryForm>(initialForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<"cover" | number | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const formRef = useRef<HTMLElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadStories = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await adminApi.get("/admin/stories");
      const result = response.data?.data;

      if (!Array.isArray(result)) {
        throw new Error("ساختار پاسخ استوری‌ها معتبر نیست.");
      }

      setStories(result as StoryRecord[]);
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStories();
  }, [loadStories]);

  const stats = useMemo(() => {
    const active = stories.filter((story) => story.is_active).length;

    return {
      total: stories.length,
      active,
      inactive: stories.length - active,
      slides: stories.reduce((sum, story) => sum + (story.slides?.length ?? 0), 0),
    };
  }, [stories]);

  const coverPreview = getStorageUrl(form.cover_image.trim() || null);

  function updateField<K extends keyof StoryForm>(field: K, value: StoryForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateSlide(index: number, field: keyof StorySlideForm, value: string) {
    setForm((current) => ({
      ...current,
      slides: current.slides.map((slide, slideIndex) =>
        slideIndex === index ? { ...slide, [field]: value } : slide,
      ),
    }));
  }

  function addSlide() {
    setForm((current) => ({
      ...current,
      slides: [...current.slides, { ...emptySlide }],
    }));
  }

  function removeSlide(index: number) {
    setForm((current) => {
      const slides = current.slides.filter((_, slideIndex) => slideIndex !== index);

      return {
        ...current,
        slides: slides.length === 0 ? [{ ...emptySlide }] : slides,
      };
    });
  }

  function moveSlide(index: number, offset: -1 | 1) {
    setForm((current) => {
      const target = index + offset;

      if (target < 0 || target >= current.slides.length) {
        return current;
      }

      const slides = [...current.slides];
      const [moved] = slides.splice(index, 1);
      slides.splice(target, 0, moved);

      return { ...current, slides };
    });
  }

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
    setUploadTarget(null);
  }

  function startEditing(story: StoryRecord) {
    setError("");
    setSuccess("");
    setEditingId(story.id);
    setForm({
      title: story.title ?? "",
      cover_image: story.cover_image ?? "",
      slides:
        story.slides && story.slides.length > 0
          ? story.slides.map((slide) => ({
              image: slide.image ?? "",
              caption: slide.caption ?? "",
              link: slide.link ?? "",
            }))
          : [{ ...emptySlide }],
      sort_order: String(story.sort_order ?? 0),
      is_active: Boolean(story.is_active),
    });

    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    // ورودی فایل خالی می‌شود تا انتخاب دوبارهٔ همان فایل هم رویداد بدهد.
    event.target.value = "";

    const target = uploadTarget;

    if (!file || uploading || target === null) return;

    setUploading(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await adminApi.post("/admin/stories/image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const path = response.data?.data?.path;

      if (typeof path !== "string" || path.trim() === "") {
        throw new Error("مسیر تصویر در پاسخ سرور نبود.");
      }

      if (target === "cover") {
        updateField("cover_image", path);
      } else {
        updateSlide(target, "image", path);
      }

      setSuccess("تصویر بارگذاری شد؛ برای ثبت نهایی فرم را ذخیره کنید.");
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setUploading(false);
      setUploadTarget(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) return;

    const slides = form.slides.filter((slide) => slide.image.trim() !== "");

    if (slides.length === 0) {
      setError("حداقل یک اسلاید با تصویر لازم است؛ ابتدا تصویر اسلاید را بارگذاری کنید.");
      setSuccess("");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        title: form.title.trim(),
        cover_image: form.cover_image.trim() || null,
        slides: slides.map((slide) => ({
          image: slide.image.trim(),
          caption: slide.caption.trim() || null,
          link: slide.link.trim() || null,
        })),
        sort_order: Number(form.sort_order) || 0,
        is_active: form.is_active,
      };

      if (editingId === null) {
        const response = await adminApi.post("/admin/stories", payload);
        setSuccess(response.data?.message ?? "استوری ثبت شد.");
      } else {
        const response = await adminApi.put(`/admin/stories/${editingId}`, payload);
        setSuccess(response.data?.message ?? "استوری ویرایش شد.");
      }

      resetForm();
      await loadStories();
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(story: StoryRecord) {
    setActionId(story.id);
    setError("");
    setSuccess("");

    try {
      const response = await adminApi.patch(`/admin/stories/${story.id}/status`, {
        is_active: !story.is_active,
      });

      setSuccess(response.data?.message ?? "وضعیت استوری تغییر کرد.");
      await loadStories();
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setActionId(null);
    }
  }

  async function deleteStory(story: StoryRecord) {
    if (
      !window.confirm(
        `استوری «${story.title || "بدون عنوان"}» حذف شود؟ این کار برگشت‌پذیر نیست.`,
      )
    ) {
      return;
    }

    setActionId(story.id);
    setError("");
    setSuccess("");

    try {
      const response = await adminApi.delete(`/admin/stories/${story.id}`);

      if (editingId === story.id) {
        resetForm();
      }

      setSuccess(response.data?.message ?? "استوری حذف شد.");
      await loadStories();
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setActionId(null);
    }
  }

  function pickUpload(target: "cover" | number) {
    setUploadTarget(target);
    fileInputRef.current?.click();
  }

  return (
    <div dir="rtl" className="admin-page">
      <header className="admin-page-head">
        <div>
          <span className="admin-page-eyebrow">مدیریت فروشگاه</span>
          <h1 className="admin-page-title">استوری‌ها</h1>
          <p className="admin-page-subtitle">
            استوری‌های صفحهٔ اول را اینجا بسازید؛ دایره‌های گرد بالای بخش
            دسته‌بندی‌ها نمایش داده می‌شوند و با کلیک، اسلایدها تمام‌صفحه مرور
            می‌شوند (مثل استوری اینستاگرام).
          </p>
        </div>

        <button
          type="button"
          className="admin-btn"
          onClick={() => void loadStories()}
          disabled={loading}
        >
          <span className="inline-flex items-center gap-2">
            <RefreshCw size={15} aria-hidden="true" />
            {loading ? "در حال دریافت..." : "بارگذاری مجدد"}
          </span>
        </button>
      </header>

      {error && (
        <div className="admin-alert admin-alert-error" role="alert">
          <span aria-hidden="true">!</span>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="admin-alert admin-alert-success" role="status">
          <CheckCircle2 size={16} aria-hidden="true" />
          <span>{success}</span>
        </div>
      )}

      <div className="admin-stats">
        <div className="admin-stat">
          <span className="admin-stat-label">کل استوری‌ها</span>
          <strong className="admin-stat-value">
            {formatAdminNumber(stats.total)}
          </strong>
          <span className="admin-stat-hint">شامل غیرفعال‌ها</span>
        </div>

        <div className="admin-stat">
          <span className="admin-stat-label">نمایش در صفحهٔ اول</span>
          <strong className="admin-stat-value">
            {formatAdminNumber(stats.active)}
          </strong>
          <span className="admin-stat-hint">استوری‌های فعال</span>
        </div>

        <div className="admin-stat">
          <span className="admin-stat-label">غیرفعال</span>
          <strong className="admin-stat-value">
            {formatAdminNumber(stats.inactive)}
          </strong>
          <span className="admin-stat-hint">پنهان از سایت</span>
        </div>

        <div className="admin-stat">
          <span className="admin-stat-label">کل اسلایدها</span>
          <strong className="admin-stat-value">
            {formatAdminNumber(stats.slides)}
          </strong>
          <span className="admin-stat-hint">همهٔ استوری‌ها</span>
        </div>
      </div>

      {/* ورودی فایل مشترک کاور و اسلایدها */}
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
              {editingId === null ? "افزودن استوری تازه" : "ویرایش استوری"}
            </h2>
            <p className="admin-card-desc">
              تصویر دایره را مربعی بارگذاری کنید (پیشنهاد: ۳۰۰×۳۰۰ پیکسل) و
              تصویر اسلایدها را عمودی (پیشنهاد: ۱۰۸۰×۱۴۴۰ پیکسل، حداکثر ۵
              مگابایت). اگر کاور را خالی بگذارید، تصویر اولین اسلاید به‌جای آن
              نمایش داده می‌شود.
            </p>
          </div>

          {editingId !== null && (
            <button
              type="button"
              className="admin-btn admin-btn-sm"
              onClick={resetForm}
              disabled={saving}
            >
              <span className="inline-flex items-center gap-1.5">
                <X size={14} aria-hidden="true" />
                بستن فرم
              </span>
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="admin-form-grid">
            <div className="admin-field">
              <label className="admin-label" htmlFor="story-title">
                عنوان استوری
              </label>
              <input
                id="story-title"
                className="admin-input"
                value={form.title}
                onChange={(event) => updateField("title", event.target.value)}
                maxLength={120}
                required
                placeholder="مثلاً: بهداشتی"
              />
              <span className="admin-help">زیر دایرهٔ استوری دیده می‌شود.</span>
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="story-sort">
                ترتیب نمایش
              </label>
              <input
                id="story-sort"
                className="admin-input"
                type="number"
                min={0}
                max={9999}
                value={form.sort_order}
                onChange={(event) =>
                  updateField("sort_order", event.target.value)
                }
              />
              <span className="admin-help">عدد کوچک‌تر، سمت راست‌تر.</span>
            </div>

            <div className="admin-field admin-full">
              <span className="admin-label">تصویر دایره (کاور)</span>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-dashed border-[#dfe7d8] bg-[#f8faf5]">
                  {coverPreview ? (
                    <img
                      src={coverPreview}
                      alt="پیش‌نمایش کاور استوری"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="inline-flex flex-col items-center gap-1 text-[11px] text-[#9aa894]">
                      <ImagePlus size={20} aria-hidden="true" />
                      بدون تصویر
                    </span>
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <button
                    type="button"
                    className="admin-btn inline-flex items-center gap-2"
                    onClick={() => pickUpload("cover")}
                    disabled={uploading}
                  >
                    {uploading && uploadTarget === "cover" ? (
                      <Loader2
                        size={15}
                        className="animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <Upload size={15} aria-hidden="true" />
                    )}
                    {uploading && uploadTarget === "cover"
                      ? "در حال بارگذاری..."
                      : "انتخاب تصویر دایره"}
                  </button>

                  <input
                    className="admin-input"
                    value={form.cover_image}
                    onChange={(event) =>
                      updateField("cover_image", event.target.value)
                    }
                    maxLength={2048}
                    dir="ltr"
                    placeholder="stories/cover.jpg (اختیاری)"
                  />
                  <span className="admin-help">
                    خالی بماند، تصویر اولین اسلاید به‌جای آن می‌نشیند.
                  </span>
                </div>
              </div>
            </div>

            <div className="admin-field">
              <span className="admin-label">وضعیت نمایش</span>
              <label className="admin-checkbox">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) =>
                    updateField("is_active", event.target.checked)
                  }
                />
                <span>در صفحهٔ اول نمایش داده شود</span>
              </label>
            </div>
          </div>

          <div className="admin-card-head mt-6">
            <div>
              <h3 className="admin-card-title text-base">اسلایدها</h3>
              <p className="admin-card-desc">
                هر اسلاید یک تصویر تمام‌صفحه است؛ متن و لینک اختیاری‌اند. لینک
                داخلی مثل <span dir="ltr">/products?category=health</span> یا
                لینک کامل بیرونی.
              </p>
            </div>

            <button
              type="button"
              className="admin-btn admin-btn-sm"
              onClick={addSlide}
            >
              <span className="inline-flex items-center gap-1.5">
                <Plus size={14} aria-hidden="true" />
                افزودن اسلاید
              </span>
            </button>
          </div>

          <div className="space-y-3">
            {form.slides.map((slide, index) => (
              <div
                key={index}
                className="rounded-xl border border-[#dfe7d8] bg-[#f8faf5] p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-brand-800">
                    اسلاید {formatAdminNumber(index + 1)}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="admin-btn admin-btn-sm"
                      onClick={() => moveSlide(index, -1)}
                      disabled={index === 0}
                      aria-label="انتقال به بالا"
                    >
                      <ArrowUp size={13} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn-sm"
                      onClick={() => moveSlide(index, 1)}
                      disabled={index === form.slides.length - 1}
                      aria-label="انتقال به پایین"
                    >
                      <ArrowDown size={13} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn-sm admin-btn-danger"
                      onClick={() => removeSlide(index)}
                      aria-label="حذف اسلاید"
                    >
                      <Trash2 size={13} aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
                  <div className="flex h-24 w-20 items-center justify-center overflow-hidden rounded-lg border border-dashed border-[#dfe7d8] bg-white">
                    {getStorageUrl(slide.image || null) ? (
                      <img
                        src={getStorageUrl(slide.image) ?? undefined}
                        alt={`پیش‌نمایش اسلاید ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="inline-flex flex-col items-center gap-1 text-[11px] text-[#9aa894]">
                        <ImagePlus size={18} aria-hidden="true" />
                        بدون تصویر
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="admin-btn admin-btn-sm inline-flex items-center gap-1.5"
                        onClick={() => pickUpload(index)}
                        disabled={uploading}
                      >
                        {uploading && uploadTarget === index ? (
                          <Loader2
                            size={13}
                            className="animate-spin"
                            aria-hidden="true"
                          />
                        ) : (
                          <Upload size={13} aria-hidden="true" />
                        )}
                        {uploading && uploadTarget === index
                          ? "در حال بارگذاری..."
                          : "بارگذاری تصویر"}
                      </button>

                      <input
                        className="admin-input flex-1"
                        value={slide.image}
                        onChange={(event) =>
                          updateSlide(index, "image", event.target.value)
                        }
                        maxLength={2048}
                        dir="ltr"
                        placeholder="stories/slide-1.jpg"
                      />
                    </div>

                    <input
                      className="admin-input"
                      value={slide.caption}
                      onChange={(event) =>
                        updateSlide(index, "caption", event.target.value)
                      }
                      maxLength={160}
                      placeholder="متن اسلاید (اختیاری)"
                    />

                    <input
                      className="admin-input"
                      value={slide.link}
                      onChange={(event) =>
                        updateSlide(index, "link", event.target.value)
                      }
                      maxLength={2048}
                      dir="ltr"
                      placeholder="/products?category=health یا https://... (اختیاری)"
                    />
                  </div>
                </div>
              </div>
            ))}
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
                ) : (
                  <CirclePlay size={15} aria-hidden="true" />
                )}
                {editingId === null ? "افزودن استوری" : "ذخیره تغییرات"}
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
            <h2 className="admin-card-title">فهرست استوری‌ها</h2>
            <p className="admin-card-desc">
              استوری‌های فعال به ترتیب «ترتیب نمایش» در نوار بالای دسته‌بندی‌های
              صفحهٔ اول دیده می‌شوند. با غیرفعال‌کردن یا حذف، استوری از سایت
              پنهان می‌شود.
            </p>
          </div>
        </div>

        {loading ? (
          <p className="admin-empty">در حال دریافت استوری‌ها...</p>
        ) : stories.length === 0 ? (
          <p className="admin-empty">
            هنوز استوری‌ای ثبت نشده است. با فرم بالا اولین استوری را بیفزایید.
          </p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>دایره</th>
                  <th>عنوان</th>
                  <th>اسلایدها</th>
                  <th>ترتیب</th>
                  <th>وضعیت</th>
                  <th>عملیات</th>
                </tr>
              </thead>

              <tbody>
                {stories.map((story) => {
                  const busy = actionId === story.id;
                  const thumb = getStorageUrl(
                    story.cover_image || story.slides?.[0]?.image || null,
                  );
                  const slideCount = story.slides?.length ?? 0;

                  return (
                    <tr key={story.id}>
                      <td>
                        <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-line bg-white">
                          {thumb ? (
                            <img
                              src={thumb}
                              alt={story.title || "استوری"}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <CirclePlay
                              size={18}
                              className="text-muted-soft"
                              aria-hidden="true"
                            />
                          )}
                        </span>
                      </td>

                      <td>{story.title || "—"}</td>

                      <td>{formatAdminNumber(slideCount)}</td>

                      <td>{formatAdminNumber(story.sort_order)}</td>

                      <td>
                        <span
                          className={`admin-badge ${
                            story.is_active
                              ? "admin-badge-green"
                              : "admin-badge-red"
                          }`}
                        >
                          {story.is_active ? "فعال" : "غیرفعال"}
                        </span>
                      </td>

                      <td>
                        <div className="admin-row-actions">
                          <button
                            type="button"
                            className="admin-btn admin-btn-sm"
                            onClick={() => startEditing(story)}
                            disabled={busy || saving}
                          >
                            ویرایش
                          </button>

                          <button
                            type="button"
                            className="admin-btn admin-btn-sm"
                            onClick={() => void toggleStatus(story)}
                            disabled={busy || saving}
                          >
                            {busy
                              ? "..."
                              : story.is_active
                                ? "غیرفعال‌سازی"
                                : "فعال‌سازی"}
                          </button>

                          <button
                            type="button"
                            className="admin-btn admin-btn-sm admin-btn-danger"
                            onClick={() => void deleteStory(story)}
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

export default AdminStories;
