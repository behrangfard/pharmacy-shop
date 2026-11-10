import { Plus } from "lucide-react";

import {
  BANNER_HERO_HEIGHT_PRESETS,
  BANNER_MOBILE_HEIGHT_PRESETS,
  BANNER_RADIUS_PRESETS,
  BANNER_SECTION_ANIMATIONS,
  BANNER_SECTION_LAYOUTS,
  MAX_BANNER_RADIUS,
  normalizeBannerRadius,
  type BannerSectionAnimation,
  type BannerSectionFit,
  type BannerSectionLayout,
} from "../utils/bannerGrid";

/**
 * تنظیمات یک بخش بنر در پنل مدیریت.
 *
 * هر بخش (هیرو دسکتاپ، چندستونهٔ دسکتاپ، بالای موبایل و وسط موبایل) این
 * مقادیر را مستقل نگه می‌دارد: تعداد تصاویر، ارتفاع، گردی گوشه و جاگیری
 * تصویر. بخش چندستونه به‌جای تعداد، «چیدمان» دارد.
 */
export interface AdminBannerSection {
  position: string;
  layout: BannerSectionLayout;
  slots: number;
  title: string;
  subtitle: string;
  /** سقف تعداد تصاویر؛ ۰ یعنی همه. */
  image_count: number;
  /** حداکثر ارتفاع در دسکتاپ (پیکسل)؛ ۰ یعنی ارتفاع طبیعی تصویر. */
  height_desktop: number;
  /** حداکثر ارتفاع در موبایل (پیکسل)؛ ۰ یعنی ارتفاع طبیعی تصویر. */
  height_mobile: number;
  /** contain = بدون برش و بدون بزرگ‌نمایی | cover = پرکردن کادر با برش. */
  fit: BannerSectionFit;
  /** گردی گوشهٔ همین بخش (پیکسل). */
  radius: number;
  /** انیمیشن هاور بنرهای همین بخش (فقط بخش‌های دسکتاپ). */
  animation: BannerSectionAnimation;
  /** گردی گوشهٔ پیش‌فرض سایت (برای دکمهٔ «پیش‌فرض»). */
  radius_default: number;
  is_active: boolean;
  banners_count: number;
}

/**
 * نوع بخش:
 * - hero   : اسلایدر بالای صفحهٔ اول (دسکتاپ)
 * - grid   : ردیف چندستونهٔ وسط صفحهٔ اول (دسکتاپ)
 * - mobile : بنر موبایل (بالا یا وسط)؛ ارتفاع و تعداد مستقل خودش را دارد
 */
export type AdminBannerSectionKind = "hero" | "grid" | "mobile";

const FIT_OPTIONS: { value: BannerSectionFit; label: string; hint: string }[] = [
  {
    value: "contain",
    label: "بدون برش و بدون بزرگ‌نمایی",
    hint: "تصویر با نسبت خودش نمایش داده می‌شود؛ بنر کوچک بزرگ نمی‌شود",
  },
  {
    value: "cover",
    label: "پرکردن کادر (با برش)",
    hint: "تصویر تمام عرض کادر را پر می‌کند و لبه‌های اضافه بریده می‌شود",
  },
];

interface AdminBannerSectionCardProps {
  kind: AdminBannerSectionKind;
  title: string;
  description: string;
  section: AdminBannerSection | null;
  loading: boolean;
  saving: boolean;
  /** متن دکمهٔ افزودن بنر (مثلاً «افزودن بنر به اسلایدر»). */
  addLabel: string;
  onChange: <K extends keyof AdminBannerSection>(
    field: K,
    value: AdminBannerSection[K],
  ) => void;
  onLayout: (layout: BannerSectionLayout) => void;
  onSave: () => void;
  onAdd: () => void;
}

/**
 * کارت تنظیمات یک بخش بنر.
 *
 * فقط فیلدهای مربوط به همان بخش نمایش داده می‌شود تا پنل ساده بماند:
 * چیدمان برای بخش چندستونه، تعداد تصاویر برای اسلایدر/موبایل، ارتفاع همان
 * نما و گردی گوشهٔ همان بخش.
 */
function AdminBannerSectionCard({
  kind,
  title,
  description,
  section,
  loading,
  saving,
  addLabel,
  onChange,
  onLayout,
  onSave,
  onAdd,
}: AdminBannerSectionCardProps) {
  const isGrid = kind === "grid";
  const isMobile = kind === "mobile";
  const heightField = isMobile ? "height_mobile" : "height_desktop";
  const heightPresets = isMobile
    ? BANNER_MOBILE_HEIGHT_PRESETS
    : BANNER_HERO_HEIGHT_PRESETS;

  return (
    <section className="admin-card">
      <div className="admin-card-head">
        <div>
          <h2 className="admin-card-title">{title}</h2>
          <p className="admin-card-desc">{description}</p>
        </div>
      </div>

      {section === null ? (
        <p className="admin-empty">
          {loading
            ? "در حال دریافت تنظیمات بخش..."
            : "تنظیمات این بخش دریافت نشد؛ صفحه را دوباره بارگذاری کنید."}
        </p>
      ) : (
        <>
          <div className="admin-form-grid">
            {isGrid ? null : (
              <div className="admin-field">
                <label
                  className="admin-label"
                  htmlFor={`count-${section.position}`}
                >
                  تعداد تصاویر
                </label>
                <input
                  id={`count-${section.position}`}
                  type="number"
                  min={0}
                  max={12}
                  className="admin-input"
                  value={section.image_count > 0 ? section.image_count : ""}
                  placeholder="همه"
                  onChange={(event) =>
                    onChange(
                      "image_count",
                      Math.max(0, Math.min(12, Number(event.target.value) || 0)),
                    )
                  }
                  disabled={saving}
                />
                <p className="admin-help">
                  خالی یا ۰ یعنی همهٔ بنرهای این بخش؛ الان {section.banners_count}{" "}
                  بنر ثبت شده. با بیش از یک تصویر، اسلایدر خودکار فعال می‌شود.
                </p>
              </div>
            )}

            {isGrid ? (
              <div className="admin-field admin-full">
                <span className="admin-label">چیدمان بخش</span>

                <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
                  {BANNER_SECTION_LAYOUTS.map((option) => {
                    const selected = section.layout === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => onLayout(option.value)}
                        disabled={saving}
                        className={`rounded-xl border-2 p-2 text-right transition ${
                          selected
                            ? "border-[#648767] bg-[#f4f8ef]"
                            : "border-[#e3ebdc] bg-white hover:border-[#a8bea1]"
                        }`}
                      >
                        <span
                          dir="rtl"
                          className={`grid h-12 gap-1 rounded-lg bg-[#eef2e7] p-1 ${option.preview.container}`}
                        >
                          {option.preview.slots.map((slotClass, slotIndex) => (
                            <span
                              key={slotIndex}
                              className={`block rounded bg-[#91ad8d] ${slotClass}`}
                            />
                          ))}
                        </span>

                        <span className="mt-1.5 block text-[11px] font-black leading-5 text-[#385e3e]">
                          {option.label}
                        </span>

                        <span className="mt-0.5 block text-[10px] text-[#9aa894]">
                          {option.hint}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <p className="admin-help">
                  این بخش {section.slots} بنر نمایش می‌دهد و الان{" "}
                  {section.banners_count} بنر ثبت شده است.
                </p>
              </div>
            ) : null}

            <div className="admin-field">
              <label
                className="admin-label"
                htmlFor={`height-${section.position}`}
              >
                {isGrid
                  ? "حداکثر ارتفاع کاشی‌ها (پیکسل)"
                  : isMobile
                    ? "حداکثر ارتفاع موبایل (پیکسل)"
                    : "حداکثر ارتفاع (پیکسل)"}
              </label>
              <input
                id={`height-${section.position}`}
                type="number"
                min={0}
                max={1200}
                step={10}
                className="admin-input"
                value={section[heightField] > 0 ? section[heightField] : ""}
                placeholder="خودکار (ارتفاع تصویر)"
                onChange={(event) =>
                  onChange(
                    heightField,
                    Math.max(0, Math.min(1200, Number(event.target.value) || 0)),
                  )
                }
                disabled={saving}
              />

              <div className="mt-2 flex flex-wrap gap-1.5">
                {heightPresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={`admin-btn admin-btn-sm ${
                      section[heightField] === preset ? "admin-btn-primary" : ""
                    }`}
                    onClick={() => onChange(heightField, preset)}
                    disabled={saving}
                  >
                    {preset === 0 ? "خودکار" : `${preset}px`}
                  </button>
                ))}
              </div>
            </div>

            <div className="admin-field">
              <label
                className="admin-label"
                htmlFor={`radius-${section.position}`}
              >
                گردی گوشه (پیکسل)
              </label>
              <input
                id={`radius-${section.position}`}
                type="number"
                min={0}
                max={MAX_BANNER_RADIUS}
                step={1}
                className="admin-input"
                value={section.radius}
                onChange={(event) =>
                  onChange("radius", normalizeBannerRadius(event.target.value))
                }
                disabled={saving}
              />

              <div className="mt-2 flex flex-wrap gap-1.5">
                {BANNER_RADIUS_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={`admin-btn admin-btn-sm ${
                      section.radius === preset ? "admin-btn-primary" : ""
                    }`}
                    onClick={() => onChange("radius", preset)}
                    disabled={saving}
                  >
                    {preset === 0 ? "بدون گردی" : `${preset}px`}
                  </button>
                ))}
              </div>

              <p className="admin-help">
                گردی فقط برای همین بخش است؛ پیش‌فرض سایت{" "}
                {section.radius_default}px.
              </p>
            </div>

            {isMobile ? null : (
              <div className="admin-field admin-full">
                <span className="admin-label">انیمیشن هاور</span>

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {BANNER_SECTION_ANIMATIONS.map((option) => {
                    const selected = section.animation === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => onChange("animation", option.value)}
                        disabled={saving}
                        className={`rounded-xl border-2 p-3 text-right transition ${
                          selected
                            ? "border-[#648767] bg-[#f4f8ef]"
                            : "border-[#e3ebdc] bg-white hover:border-[#a8bea1]"
                        }`}
                      >
                        <span className="block text-xs font-bold text-[#3f5140]">
                          {option.label}
                        </span>
                        <span className="mt-1 block text-[10px] leading-5 text-[#9aa894]">
                          {option.hint}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <p className="admin-help">
                  انیمیشن با بردن نشانگر ماوس (یا فوکوس کیبورد) روی هر بنر این
                  بخش اجرا می‌شود. برای کاربرانی که در سیستم خود «کاهش
                  انیمیشن» را فعال کرده‌اند، انیمیشن اجرا نمی‌شود.
                </p>
              </div>
            )}

            {isGrid ? (
              <>
                <div className="admin-field">
                  <label
                    className="admin-label"
                    htmlFor={`title-${section.position}`}
                  >
                    عنوان بخش (اختیاری)
                  </label>
                  <input
                    id={`title-${section.position}`}
                    className="admin-input"
                    value={section.title}
                    maxLength={255}
                    onChange={(event) => onChange("title", event.target.value)}
                    disabled={saving}
                  />
                </div>

                <div className="admin-field">
                  <label
                    className="admin-label"
                    htmlFor={`subtitle-${section.position}`}
                  >
                    زیرعنوان بخش (اختیاری)
                  </label>
                  <input
                    id={`subtitle-${section.position}`}
                    className="admin-input"
                    value={section.subtitle}
                    maxLength={255}
                    onChange={(event) =>
                      onChange("subtitle", event.target.value)
                    }
                    disabled={saving}
                  />
                </div>
              </>
            ) : (
              <div className="admin-field admin-full">
                <span className="admin-label">جاگیری تصویر در کادر</span>

                <div className="grid gap-2 sm:grid-cols-2">
                  {FIT_OPTIONS.map((option) => {
                    const selected = section.fit === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => onChange("fit", option.value)}
                        disabled={saving}
                        className={`rounded-xl border-2 p-3 text-right transition ${
                          selected
                            ? "border-[#648767] bg-[#f4f8ef]"
                            : "border-[#e3ebdc] bg-white hover:border-[#a8bea1]"
                        }`}
                      >
                        <span className="block text-xs font-bold text-[#3f5140]">
                          {option.label}
                        </span>
                        <span className="mt-1 block text-[10px] leading-5 text-[#9aa894]">
                          {option.hint}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <label
              className="admin-checkbox admin-full"
              htmlFor={`active-${section.position}`}
            >
              <input
                id={`active-${section.position}`}
                type="checkbox"
                checked={section.is_active}
                onChange={(event) =>
                  onChange("is_active", event.target.checked)
                }
                disabled={saving}
              />
              این بخش در سایت نمایش داده شود
            </label>
          </div>

          <div className="admin-actions">
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={onSave}
              disabled={saving}
            >
              {saving ? "در حال ذخیره..." : "ذخیرهٔ تنظیمات"}
            </button>

            <button
              type="button"
              className="admin-btn"
              onClick={onAdd}
              disabled={saving}
            >
              <span className="inline-flex items-center gap-1.5">
                <Plus size={14} aria-hidden="true" />
                {addLabel}
              </span>
            </button>
          </div>
        </>
      )}
    </section>
  );
}

export default AdminBannerSectionCard;
