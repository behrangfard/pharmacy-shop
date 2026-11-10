import { useCallback, useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";

import AdminBannerSectionCard, {
  type AdminBannerSection,
} from "./AdminBannerSectionCard";
import { adminApi } from "../services/api";
import { formatAdminDate, getAdminErrorMessage } from "../utils/adminFormat";
import {
  HOME_HERO_POSITION,
  bannerSectionSlots,
  normalizeBannerRadius,
  normalizeBannerSectionAnimation,
  normalizeBannerSectionFit,
  normalizeBannerSectionLayout,
} from "../utils/bannerGrid";
import { getStorageUrl } from "../utils/images";

/** اسلاید اسلایدر هیرو؛ فقط فیلدهای نمایشی فهرست. */
interface SliderSlide {
  id: number;
  title: string | null;
  image: string;
  link: string | null;
  sort_order: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
}

interface AdminSliderPanelProps {
  /** رفتن به تب «بنرها» برای ساخت یا ویرایش محتوای اسلاید. */
  onManageBanners: () => void;
}

/**
 * تب «اسلایدر» در بخش مدیریت محتوا.
 *
 * اسلایدر همان بنرهای بالای صفحهٔ اول (position = home_hero) است؛ این تب برای
 * کارهای روزمرهٔ اسلایدر ساخته شده است: تنظیم تعداد اسلایدها، ارتفاع، گردی
 * گوشه و انیمیشن، تغییر ترتیب اسلایدها، فعال/غیرفعال‌کردن و حذف. نوشتن متن و
 * انتخاب تصویر هر اسلاید در تب «بنرها» انجام می‌شود.
 */
function AdminSliderPanel({ onManageBanners }: AdminSliderPanelProps) {
  const [slides, setSlides] = useState<SliderSlide[]>([]);
  const [section, setSection] = useState<AdminBannerSection | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [brokenImages, setBrokenImages] = useState<Record<number, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [bannersResponse, sectionsResponse] = await Promise.all([
        adminApi.get("/admin/banners", {
          params: { position: HOME_HERO_POSITION },
        }),
        adminApi.get("/admin/banner-sections"),
      ]);

      const banners = bannersResponse.data?.data;

      if (!Array.isArray(banners)) {
        throw new Error("ساختار پاسخ اسلایدر معتبر نیست.");
      }

      setSlides(
        banners.map((raw: Record<string, unknown>) => ({
          id: Number(raw.id) || 0,
          title: typeof raw.title === "string" ? raw.title : null,
          image: typeof raw.image === "string" ? raw.image : "",
          link: typeof raw.link === "string" ? raw.link : null,
          sort_order: Number(raw.sort_order) || 0,
          is_active: raw.is_active !== false,
          starts_at: typeof raw.starts_at === "string" ? raw.starts_at : null,
          ends_at: typeof raw.ends_at === "string" ? raw.ends_at : null,
        })),
      );

      const rawSections = sectionsResponse.data?.data;
      const rawSection = Array.isArray(rawSections)
        ? rawSections.find(
            (item: { position?: string }) =>
              item?.position === HOME_HERO_POSITION,
          )
        : null;

      if (!rawSection) {
        setSection(null);
        return;
      }

      const layout = normalizeBannerSectionLayout(rawSection.layout);

      setSection({
        position: HOME_HERO_POSITION,
        layout,
        slots: bannerSectionSlots(layout),
        title: typeof rawSection.title === "string" ? rawSection.title : "",
        subtitle:
          typeof rawSection.subtitle === "string" ? rawSection.subtitle : "",
        image_count: Number(rawSection.image_count ?? 0) || 0,
        height_desktop: Number(rawSection.height_desktop ?? 0) || 0,
        height_mobile: Number(rawSection.height_mobile ?? 0) || 0,
        fit: normalizeBannerSectionFit(rawSection.fit),
        radius: normalizeBannerRadius(rawSection.radius),
        animation: normalizeBannerSectionAnimation(rawSection.animation),
        radius_default: normalizeBannerRadius(
          rawSection.radius_default ??
            sectionsResponse.data?.appearance?.radius,
        ),
        is_active: rawSection.is_active !== false,
        banners_count: Number(rawSection.banners_count ?? 0),
      });
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setBrokenImages({});
  }, [slides]);

  function updateSectionField<K extends keyof AdminBannerSection>(
    field: K,
    value: AdminBannerSection[K],
  ) {
    setSection((current) =>
      current ? { ...current, [field]: value } : current,
    );
  }

  async function saveSection() {
    if (!section || savingSection) return;

    setSavingSection(true);
    setError("");
    setSuccess("");

    try {
      const response = await adminApi.put(
        `/admin/banner-sections/${HOME_HERO_POSITION}`,
        {
          layout: section.layout,
          title: section.title.trim() || null,
          subtitle: section.subtitle.trim() || null,
          image_count: section.image_count > 0 ? section.image_count : null,
          height_desktop:
            section.height_desktop > 0 ? section.height_desktop : null,
          height_mobile:
            section.height_mobile > 0 ? section.height_mobile : null,
          fit: section.fit,
          radius: normalizeBannerRadius(section.radius),
          animation: section.animation,
          is_active: section.is_active,
        },
      );

      setSuccess(response.data?.message ?? "تنظیمات اسلایدر ذخیره شد.");
      await load();
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setSavingSection(false);
    }
  }

  /** جابه‌جایی یک اسلاید و ذخیرهٔ ترتیب جدید در سرور. */
  async function moveSlide(index: number, direction: -1 | 1) {
    const target = index + direction;

    if (target < 0 || target >= slides.length || reordering) return;

    const next = [...slides];
    const [moved] = next.splice(index, 1);

    next.splice(target, 0, moved);

    setSlides(next);
    setReordering(true);
    setError("");
    setSuccess("");

    try {
      const response = await adminApi.put("/admin/banners/order", {
        position: HOME_HERO_POSITION,
        ids: next.map((slide) => slide.id),
      });

      setSuccess(
        response.data?.message ?? "ترتیب اسلایدهای اسلایدر ذخیره شد.",
      );
      await load();
    } catch (err) {
      setError(getAdminErrorMessage(err));
      await load();
    } finally {
      setReordering(false);
    }
  }

  async function toggleSlide(slide: SliderSlide) {
    setActionId(slide.id);
    setError("");
    setSuccess("");

    try {
      await adminApi.patch(`/admin/banners/${slide.id}/status`, {
        is_active: !slide.is_active,
      });

      setSuccess(slide.is_active ? "اسلاید غیرفعال شد." : "اسلاید فعال شد.");
      await load();
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setActionId(null);
    }
  }

  async function removeSlide(slide: SliderSlide) {
    const confirmed = window.confirm(
      `اسلاید «${slide.title || `#${slide.id}`}» حذف شود؟ این کار قابل بازگشت نیست.`,
    );

    if (!confirmed) return;

    setActionId(slide.id);
    setError("");
    setSuccess("");

    try {
      await adminApi.delete(`/admin/banners/${slide.id}`);
      setSuccess("اسلاید حذف شد.");
      await load();
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setActionId(null);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#6b7280]">
          <span className="rounded-lg border border-[#e3ebdc] bg-white px-3 py-1.5">
            اسلایدها: {slides.length}
          </span>
          <span className="rounded-lg border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-1.5 text-[#047857]">
            فعال: {slides.filter((slide) => slide.is_active).length}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={onManageBanners}
          >
            <span className="inline-flex items-center gap-1.5">
              <Plus size={15} aria-hidden="true" />
              ساخت اسلاید جدید
            </span>
          </button>

          <button
            type="button"
            className="admin-btn"
            onClick={() => void load()}
            disabled={loading}
          >
            <span className="inline-flex items-center gap-1.5">
              <RefreshCw size={14} aria-hidden="true" />
              {loading ? "در حال دریافت..." : "بارگذاری مجدد"}
            </span>
          </button>
        </div>
      </div>

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

      {/* تنظیمات اسلایدر: تعداد اسلایدها، ارتفاع، گردی گوشه و انیمیشن */}
      <AdminBannerSectionCard
        kind="hero"
        title="تنظیمات اسلایدر بالای صفحهٔ اول"
        description="تعداد اسلایدهایی که در اسلایدر نمایش داده می‌شوند، حداکثر ارتفاع، گردی گوشه و انیمیشن هاور. تغییرات پس از «ذخیرهٔ تنظیمات» روی صفحهٔ اول اعمال می‌شود."
        section={section}
        loading={loading}
        saving={savingSection}
        addLabel="ساخت اسلاید جدید"
        onChange={updateSectionField}
        onLayout={(layout) =>
          setSection((current) =>
            current
              ? { ...current, layout, slots: bannerSectionSlots(layout) }
              : current,
          )
        }
        onSave={() => void saveSection()}
        onAdd={onManageBanners}
      />

      {/* فهرست اسلایدها با ترتیب قابل تغییر */}
      <div className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2 className="admin-card-title">اسلایدهای اسلایدر</h2>
            <p className="admin-card-desc">
              ترتیب نمایش با دکمه‌های بالا/پایین تغییر می‌کند و بلافاصله ذخیره
              می‌شود. اسلاید غیرفعال یا خارج از بازهٔ زمانی در سایت دیده نمی‌شود.
            </p>
          </div>
        </div>

        {loading ? (
          <p className="admin-help">
            <Loader2 size={14} className="ml-1 inline animate-spin" />
            در حال دریافت اسلایدها...
          </p>
        ) : slides.length === 0 ? (
          <p className="admin-empty">
            هنوز اسلایدی برای اسلایدر بالای صفحه ساخته نشده است. با «ساخت اسلاید
            جدید» اولین اسلاید را اضافه کنید.
          </p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ترتیب</th>
                  <th>تصویر</th>
                  <th>عنوان</th>
                  <th>وضعیت</th>
                  <th>بازهٔ نمایش</th>
                  <th>عملیات</th>
                </tr>
              </thead>

              <tbody>
                {slides.map((slide, index) => {
                  const source = getStorageUrl(slide.image);
                  const busy = actionId === slide.id || reordering;

                  return (
                    <tr key={slide.id}>
                      <td>
                        <div className="flex items-center gap-1">
                          <span className="w-5 text-center text-xs font-black text-muted-soft">
                            {index + 1}
                          </span>

                          <button
                            type="button"
                            className="admin-btn admin-btn-sm"
                            onClick={() => void moveSlide(index, -1)}
                            disabled={index === 0 || busy}
                            title="انتقال به بالا"
                            aria-label="انتقال اسلاید به بالا"
                          >
                            <ArrowUp size={13} aria-hidden="true" />
                          </button>

                          <button
                            type="button"
                            className="admin-btn admin-btn-sm"
                            onClick={() => void moveSlide(index, 1)}
                            disabled={index === slides.length - 1 || busy}
                            title="انتقال به پایین"
                            aria-label="انتقال اسلاید به پایین"
                          >
                            <ArrowDown size={13} aria-hidden="true" />
                          </button>
                        </div>
                      </td>

                      <td>
                        <span className="block h-12 w-24 overflow-hidden rounded-lg border border-[#e5e7eb] bg-[#f9fafb]">
                          {source && !brokenImages[slide.id] ? (
                            <img
                              src={source}
                              alt={slide.title ?? "اسلاید"}
                              className="h-full w-full object-cover"
                              loading="lazy"
                              onError={() =>
                                setBrokenImages((current) => ({
                                  ...current,
                                  [slide.id]: true,
                                }))
                              }
                            />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-[10px] text-muted-soft">
                              بدون تصویر
                            </span>
                          )}
                        </span>
                      </td>

                      <td>
                        <div className="font-bold text-ink">
                          {slide.title || `اسلاید #${slide.id}`}
                        </div>

                        {slide.link && (
                          <div
                            dir="ltr"
                            className="mt-1 text-right text-[11px] text-muted-soft"
                          >
                            {slide.link}
                          </div>
                        )}
                      </td>

                      <td>
                        <button
                          type="button"
                          onClick={() => void toggleSlide(slide)}
                          disabled={busy}
                          className={`admin-badge ${
                            slide.is_active
                              ? "admin-badge-green"
                              : "admin-badge-red"
                          }`}
                        >
                          {actionId === slide.id
                            ? "..."
                            : slide.is_active
                              ? "فعال"
                              : "غیرفعال"}
                        </button>
                      </td>

                      <td className="text-[11px] leading-6 text-muted-soft">
                        {slide.starts_at || slide.ends_at
                          ? `${slide.starts_at ? formatAdminDate(slide.starts_at) : "—"} تا ${
                              slide.ends_at ? formatAdminDate(slide.ends_at) : "—"
                            }`
                          : "همیشه"}
                      </td>

                      <td>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            className="admin-btn admin-btn-sm"
                            onClick={onManageBanners}
                          >
                            ویرایش محتوا
                          </button>

                          <button
                            type="button"
                            className="admin-btn admin-btn-sm admin-btn-danger"
                            onClick={() => void removeSlide(slide)}
                            disabled={busy}
                          >
                            <Trash2 size={13} aria-hidden="true" />
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
      </div>
    </div>
  );
}

export default AdminSliderPanel;
