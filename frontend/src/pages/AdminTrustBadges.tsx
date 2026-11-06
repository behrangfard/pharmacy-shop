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
  BadgeCheck,
  CheckCircle2,
  ImagePlus,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";

import { adminApi } from "../services/api";
import { formatAdminNumber, getAdminErrorMessage } from "../utils/adminFormat";
import { getStorageUrl } from "../utils/images";

/** یک نشان اعتماد/مجوز (اینماد، ساماندهی، نماد صنفی و ...). */
interface TrustBadgeRecord {
  id: number;
  title: string;
  image: string;
  link: string | null;
  open_in_new_tab: boolean;
  sort_order: number;
  is_active: boolean;
}

interface TrustBadgeForm {
  title: string;
  image: string;
  link: string;
  open_in_new_tab: boolean;
  sort_order: string;
  is_active: boolean;
}

const initialForm: TrustBadgeForm = {
  title: "",
  image: "",
  link: "",
  open_in_new_tab: true,
  sort_order: "0",
  is_active: true,
};

/**
 * مدیریت نشان‌های اعتماد و مجوزهای فروشگاه.
 *
 * این نشان‌ها در فوتر سایت (سمت چپ، پایین صفحه) در نوار «مجوزها و نمادهای
 * اعتماد» نمایش داده می‌شوند؛ مدیر می‌تواند تصویر (اینماد/ساماندهی/مجوز
 * صنفی)، عنوان، لینک مقصد، ترتیب نمایش و وضعیت فعال بودن هر نشان را تغییر دهد.
 */
function AdminTrustBadges() {
  const [badges, setBadges] = useState<TrustBadgeRecord[]>([]);
  const [form, setForm] = useState<TrustBadgeForm>(initialForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const formRef = useRef<HTMLElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadBadges = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await adminApi.get("/admin/trust-badges");
      const result = response.data?.data;

      if (!Array.isArray(result)) {
        throw new Error("ساختار پاسخ نشان‌ها معتبر نیست.");
      }

      setBadges(result as TrustBadgeRecord[]);
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBadges();
  }, [loadBadges]);

  const stats = useMemo(() => {
    const active = badges.filter((badge) => badge.is_active).length;

    return {
      total: badges.length,
      active,
      inactive: badges.length - active,
      linked: badges.filter((badge) => Boolean(badge.link)).length,
    };
  }, [badges]);

  const preview = getStorageUrl(form.image.trim() || null);

  function updateField<K extends keyof TrustBadgeForm>(
    field: K,
    value: TrustBadgeForm[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function startEditing(badge: TrustBadgeRecord) {
    setError("");
    setSuccess("");
    setEditingId(badge.id);
    setForm({
      title: badge.title ?? "",
      image: badge.image ?? "",
      link: badge.link ?? "",
      open_in_new_tab: badge.open_in_new_tab !== false,
      sort_order: String(badge.sort_order ?? 0),
      is_active: Boolean(badge.is_active),
    });

    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    // ورودی فایل خالی می‌شود تا انتخاب دوبارهٔ همان فایل هم رویداد بدهد.
    event.target.value = "";

    if (!file || uploading) return;

    setUploading(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await adminApi.post(
        "/admin/trust-badges/image",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );

      const path = response.data?.data?.path;

      if (typeof path !== "string" || path.trim() === "") {
        throw new Error("مسیر تصویر در پاسخ سرور نبود.");
      }

      updateField("image", path);
      setSuccess("تصویر نشان بارگذاری شد؛ برای ثبت نهایی فرم را ذخیره کنید.");
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) return;

    if (!form.image.trim()) {
      setError(
        "تصویر نشان الزامی است؛ ابتدا تصویر را بارگذاری کنید یا مسیر آن را وارد کنید.",
      );
      setSuccess("");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        title: form.title.trim(),
        image: form.image.trim(),
        link: form.link.trim() || null,
        open_in_new_tab: form.open_in_new_tab,
        sort_order: Number(form.sort_order) || 0,
        is_active: form.is_active,
      };

      if (editingId === null) {
        const response = await adminApi.post("/admin/trust-badges", payload);
        setSuccess(response.data?.message ?? "نشان اعتماد ثبت شد.");
      } else {
        const response = await adminApi.put(
          `/admin/trust-badges/${editingId}`,
          payload,
        );
        setSuccess(response.data?.message ?? "نشان اعتماد ویرایش شد.");
      }

      resetForm();
      await loadBadges();
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(badge: TrustBadgeRecord) {
    setActionId(badge.id);
    setError("");
    setSuccess("");

    try {
      const response = await adminApi.patch(
        `/admin/trust-badges/${badge.id}/status`,
        { is_active: !badge.is_active },
      );

      setSuccess(response.data?.message ?? "وضعیت نشان تغییر کرد.");
      await loadBadges();
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setActionId(null);
    }
  }

  async function deleteBadge(badge: TrustBadgeRecord) {
    if (
      !window.confirm(
        `نشان «${badge.title || "بدون عنوان"}» حذف شود؟ این کار برگشت‌پذیر نیست.`,
      )
    ) {
      return;
    }

    setActionId(badge.id);
    setError("");
    setSuccess("");

    try {
      const response = await adminApi.delete(`/admin/trust-badges/${badge.id}`);

      if (editingId === badge.id) {
        resetForm();
      }

      setSuccess(response.data?.message ?? "نشان اعتماد حذف شد.");
      await loadBadges();
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setActionId(null);
    }
  }

  return (
    <div dir="rtl" className="admin-page">
      <header className="admin-page-head">
        <div>
          <span className="admin-page-eyebrow">مدیریت فروشگاه</span>
          <h1 className="admin-page-title">نمادها و مجوزها</h1>
          <p className="admin-page-subtitle">
            نشان اعتماد الکترونیکی (اینماد)، ساماندهی و مجوزهای صنفی را اینجا
            بارگذاری کنید؛ نشان‌های فعال در فوتر سایت، سمت چپ پایین صفحه، نمایش
            داده می‌شوند.
          </p>
        </div>

        <button
          type="button"
          className="admin-btn"
          onClick={() => void loadBadges()}
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
          <span className="admin-stat-label">کل نشان‌ها</span>
          <strong className="admin-stat-value">
            {formatAdminNumber(stats.total)}
          </strong>
          <span className="admin-stat-hint">شامل غیرفعال‌ها</span>
        </div>

        <div className="admin-stat">
          <span className="admin-stat-label">نمایش در فوتر</span>
          <strong className="admin-stat-value">
            {formatAdminNumber(stats.active)}
          </strong>
          <span className="admin-stat-hint">نشان‌های فعال</span>
        </div>

        <div className="admin-stat">
          <span className="admin-stat-label">غیرفعال</span>
          <strong className="admin-stat-value">
            {formatAdminNumber(stats.inactive)}
          </strong>
          <span className="admin-stat-hint">پنهان از سایت</span>
        </div>

        <div className="admin-stat">
          <span className="admin-stat-label">دارای لینک</span>
          <strong className="admin-stat-value">
            {formatAdminNumber(stats.linked)}
          </strong>
          <span className="admin-stat-hint">صفحهٔ مجوز</span>
        </div>
      </div>

      <section className="admin-card" ref={formRef}>
        <div className="admin-card-head">
          <div>
            <h2 className="admin-card-title">
              {editingId === null ? "افزودن نشان تازه" : "ویرایش نشان"}
            </h2>
            <p className="admin-card-desc">
              تصویر نشان را با پس‌زمینهٔ شفاف یا سفید بارگذاری کنید (PNG/WebP تا
              ۲ مگابایت، پیشنهاد: مربعی ۱۲۰×۱۲۰ پیکسل). عنوان کوتاه، زیر تصویر
              در فوتر دیده می‌شود.
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
              <label className="admin-label" htmlFor="trust-badge-title">
                عنوان نشان
              </label>
              <input
                id="trust-badge-title"
                className="admin-input"
                value={form.title}
                onChange={(event) => updateField("title", event.target.value)}
                maxLength={120}
                required
                placeholder="نماد اعتماد الکترونیکی"
              />
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="trust-badge-link">
                لینک صفحهٔ مجوز
              </label>
              <input
                id="trust-badge-link"
                className="admin-input"
                value={form.link}
                onChange={(event) => updateField("link", event.target.value)}
                maxLength={2048}
                dir="ltr"
                placeholder="https://trustseal.enamad.ir/?id=..."
              />
              <span className="admin-help">
                خالی بماند، نشان کلیک‌پذیر نیست.
              </span>
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="trust-badge-sort">
                ترتیب نمایش
              </label>
              <input
                id="trust-badge-sort"
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
              <label className="admin-label" htmlFor="trust-badge-image">
                تصویر نشان
              </label>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-[#dfe7d8] bg-[#f8faf5]">
                  {preview ? (
                    <img
                      src={preview}
                      alt="پیش‌نمایش نشان اعتماد"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span className="inline-flex flex-col items-center gap-1 text-[11px] text-[#9aa894]">
                      <ImagePlus size={20} aria-hidden="true" />
                      بدون تصویر
                    </span>
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={fileInputRef}
                      id="trust-badge-image"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      onChange={(event) => void handleUpload(event)}
                    />

                    <label
                      htmlFor="trust-badge-image"
                      className="admin-btn admin-btn-primary inline-flex cursor-pointer items-center gap-2"
                      aria-disabled={uploading}
                    >
                      {uploading ? (
                        <Loader2
                          size={15}
                          className="animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <Upload size={15} aria-hidden="true" />
                      )}
                      {uploading ? "در حال بارگذاری..." : "انتخاب تصویر"}
                    </label>
                  </div>

                  <input
                    className="admin-input"
                    value={form.image}
                    onChange={(event) =>
                      updateField("image", event.target.value)
                    }
                    maxLength={2048}
                    dir="ltr"
                    placeholder="trust-badges/enamad.png"
                    aria-label="مسیر تصویر نشان"
                  />
                  <span className="admin-help">
                    اگر تصویر از قبل روی سرور است، مسیر آن را وارد کنید؛
                    مسیرهای /images/... از پوشهٔ تصاویر سایت خوانده می‌شوند.
                  </span>
                </div>
              </div>
            </div>

            <div className="admin-field">
              <label className="admin-label">وضعیت نمایش</label>
              <label className="admin-checkbox">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) =>
                    updateField("is_active", event.target.checked)
                  }
                />
                <span>در فوتر سایت نمایش داده شود</span>
              </label>
            </div>

            <div className="admin-field">
              <label className="admin-label">رفتار لینک</label>
              <label className="admin-checkbox">
                <input
                  type="checkbox"
                  checked={form.open_in_new_tab}
                  onChange={(event) =>
                    updateField("open_in_new_tab", event.target.checked)
                  }
                />
                <span>باز شدن در تب جدید</span>
              </label>
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
                  <Loader2
                    size={15}
                    className="animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <BadgeCheck size={15} aria-hidden="true" />
                )}
                {editingId === null ? "افزودن نشان" : "ذخیره تغییرات"}
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
            <h2 className="admin-card-title">فهرست نشان‌ها</h2>
            <p className="admin-card-desc">
              نشان‌های فعال به ترتیب «ترتیب نمایش» در نوار مجوزهای فوتر دیده
              می‌شوند. با غیرفعال‌کردن یا حذف، نشان از سایت پنهان می‌شود.
            </p>
          </div>
        </div>

        {loading ? (
          <p className="admin-empty">در حال دریافت نشان‌ها...</p>
        ) : badges.length === 0 ? (
          <p className="admin-empty">
            هنوز نشانی ثبت نشده است. با فرم بالا اولین نشان (مثلاً اینماد) را
            بیفزایید.
          </p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>تصویر</th>
                  <th>عنوان</th>
                  <th>لینک</th>
                  <th>ترتیب</th>
                  <th>وضعیت</th>
                  <th>عملیات</th>
                </tr>
              </thead>

              <tbody>
                {badges.map((badge) => {
                  const busy = actionId === badge.id;
                  const thumb = getStorageUrl(badge.image);

                  return (
                    <tr key={badge.id}>
                      <td>
                        <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-line bg-white">
                          {thumb ? (
                            <img
                              src={thumb}
                              alt={badge.title || "نشان اعتماد"}
                              className="h-full w-full object-contain"
                              loading="lazy"
                            />
                          ) : (
                            <ShieldCheck
                              size={18}
                              className="text-muted-soft"
                              aria-hidden="true"
                            />
                          )}
                        </span>
                      </td>

                      <td>{badge.title || "—"}</td>

                      <td style={{ fontSize: 12 }}>
                        {badge.link ? <span dir="ltr">{badge.link}</span> : "—"}
                      </td>

                      <td>{formatAdminNumber(badge.sort_order)}</td>

                      <td>
                        <span
                          className={`admin-badge ${
                            badge.is_active
                              ? "admin-badge-green"
                              : "admin-badge-red"
                          }`}
                        >
                          {badge.is_active ? "فعال" : "غیرفعال"}
                        </span>
                      </td>

                      <td>
                        <div className="admin-row-actions">
                          <button
                            type="button"
                            className="admin-btn admin-btn-sm"
                            onClick={() => startEditing(badge)}
                            disabled={busy || saving}
                          >
                            ویرایش
                          </button>

                          <button
                            type="button"
                            className="admin-btn admin-btn-sm"
                            onClick={() => void toggleStatus(badge)}
                            disabled={busy || saving}
                          >
                            {busy
                              ? "..."
                              : badge.is_active
                                ? "غیرفعال‌سازی"
                                : "فعال‌سازی"}
                          </button>

                          <button
                            type="button"
                            className="admin-btn admin-btn-sm admin-btn-danger"
                            onClick={() => void deleteBadge(badge)}
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

export default AdminTrustBadges;




