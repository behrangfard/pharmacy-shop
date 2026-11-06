import { useEffect, useState } from "react";
import { AlignCenter, Plus, Trash2 } from "lucide-react";

import BannerTextLayers from "./BannerTextLayers";
import {
  BANNER_FONT_PRESETS,
  BANNER_TEXT_ALIGNS,
  BANNER_TEXT_ALIGN_LABELS,
  BANNER_TEXT_MAX_LAYERS,
  BANNER_TEXT_SCRIMS,
  BANNER_TEXT_SCRIM_LABELS,
  BANNER_TEXT_SHADOWS,
  BANNER_TEXT_SHADOW_LABELS,
  BANNER_TEXT_TAGS,
  BANNER_TEXT_TAG_LABELS,
  BANNER_TEXT_WEIGHTS,
  emptyBannerTextLayer,
  type BannerTextAlign,
  type BannerTextLayer,
  type BannerTextScrim,
  type BannerTextShadow,
  type BannerTextViewport,
} from "../utils/bannerText";
import { uniqueBannerFontFamilies, type BannerFontRecord } from "../utils/bannerFonts";
import { getStorageUrl } from "../utils/images";

/**
 * ویرایشگر متن لایه‌ای بنر.
 *
 * مدیر تصویر بدون متن را بارگذاری می‌کند و اینجا متن‌ها را با کشیدن ماوس روی
 * پیش‌نمایش جای‌گذاری می‌کند. متن‌ها به‌صورت HTML واقعی روی تصویر رندر
 * می‌شوند (نه داخل تصویر) تا برای سئو خوانا باشند.
 */
interface AdminBannerTextEditorProps {
  imagePath: string;
  mobileImagePath: string;
  layers: BannerTextLayer[];
  scrim: BannerTextScrim;
  imageAlt: string;
  fonts: BannerFontRecord[];
  disabled?: boolean;
  onLayersChange: (layers: BannerTextLayer[]) => void;
  onScrimChange: (scrim: BannerTextScrim) => void;
  onImageAltChange: (alt: string) => void;
}

function AdminBannerTextEditor({
  imagePath,
  mobileImagePath,
  layers,
  scrim,
  imageAlt,
  fonts,
  disabled = false,
  onLayersChange,
  onScrimChange,
  onImageAltChange,
}: AdminBannerTextEditorProps) {
  const [viewport, setViewport] = useState<BannerTextViewport>("desktop");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewBroken, setPreviewBroken] = useState(false);

  const previewPath =
    viewport === "mobile" ? mobileImagePath.trim() || imagePath : imagePath;

  const previewSource = getStorageUrl(previewPath);

  // با تغییر تصویر/نما، حالت «تصویر خراب» ریست می‌شود.
  useEffect(() => {
    setPreviewBroken(false);
  }, [previewSource]);

  const selectedLayer = layers.find((layer) => layer.id === selectedId) ?? null;

  const customFamilies = uniqueBannerFontFamilies(fonts).filter(
    (family) => !BANNER_FONT_PRESETS.some((preset) => preset.family === family),
  );

  function updateLayer(id: string, patch: Partial<BannerTextLayer>) {
    onLayersChange(
      layers.map((layer) => (layer.id === id ? { ...layer, ...patch } : layer)),
    );
  }

  function patchSelected(patch: Partial<BannerTextLayer>) {
    if (!selectedLayer) return;

    updateLayer(selectedLayer.id, patch);
  }

  function addLayer() {
    if (layers.length >= BANNER_TEXT_MAX_LAYERS) return;

    const next = emptyBannerTextLayer(layers.length + 1);

    // شناسهٔ یکتا حتی وقتی لایه‌ای حذف شده است.
    let uniqueId = next.id;
    let suffix = 2;

    while (layers.some((layer) => layer.id === uniqueId)) {
      uniqueId = `${next.id}-${suffix}`;
      suffix += 1;
    }

    onLayersChange([...layers, { ...next, id: uniqueId }]);
    setSelectedId(uniqueId);
  }

  function removeLayer(id: string) {
    onLayersChange(layers.filter((layer) => layer.id !== id));

    if (selectedId === id) setSelectedId(null);
  }

  /** جابه‌جایی با ماوس؛ در نمای موبایل موقعیت موبایل ثبت می‌شود. */
  function handleMove(id: string, position: { x: number; y: number }) {
    updateLayer(
      id,
      viewport === "mobile"
        ? { x_mobile: position.x, y_mobile: position.y }
        : { x: position.x, y: position.y },
    );
  }

  return (
    <div className="rounded-2xl border border-[#e6ecdf] bg-[#fbfcf8] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[12px] font-bold text-[#33533a]">متن روی بنر</p>
          <p className="text-[11px] leading-6 text-[#9aa894]">
            متن‌ها HTML واقعی‌اند و داخل تصویر پخته نمی‌شوند. با کشیدن هر متن
            روی پیش‌نمایش جای آن را تغییر دهید و با کلیک انتخابش کنید.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-[#dfe7d8] bg-white">
            <button
              type="button"
              className={`px-3 py-1 text-[11px] ${
                viewport === "desktop"
                  ? "bg-[#33533a] font-bold text-white"
                  : "text-[#4b5f4a]"
              }`}
              onClick={() => setViewport("desktop")}
            >
              دسکتاپ
            </button>
            <button
              type="button"
              className={`px-3 py-1 text-[11px] ${
                viewport === "mobile"
                  ? "bg-[#33533a] font-bold text-white"
                  : "text-[#4b5f4a]"
              }`}
              onClick={() => setViewport("mobile")}
            >
              موبایل
            </button>
          </div>

          <button
            type="button"
            className="admin-btn admin-btn-sm"
            onClick={addLayer}
            disabled={disabled || layers.length >= BANNER_TEXT_MAX_LAYERS}
          >
            <span className="inline-flex items-center gap-1.5">
              <Plus size={14} aria-hidden="true" />
              افزودن متن
            </span>
          </button>
        </div>
      </div>

      {/* پیش‌نمایش بنر با لایه‌های قابل کشیدن */}
      <div className="mt-3">
        <div
          className={
            viewport === "mobile"
              ? "mx-auto w-full max-w-[260px]"
              : "mx-auto w-full"
          }
        >
          <div className="relative overflow-hidden rounded-xl border border-[#dfe7d8] bg-[#eef2e6]">
            {previewSource && !previewBroken ? (
              <img
                src={previewSource}
                alt=""
                className="block h-auto w-full"
                onError={() => setPreviewBroken(true)}
              />
            ) : (
              <div
                className="flex w-full items-center justify-center text-[11px] text-[#9aa894]"
                style={{ aspectRatio: viewport === "mobile" ? "3 / 4" : "16 / 7" }}
              >
                تصویر بنر را انتخاب کنید تا پیش‌نمایش نشان داده شود
              </div>
            )}

            <BannerTextLayers
              layers={layers}
              viewport={viewport}
              scrim={scrim}
              interactive
              selectedId={selectedId}
              onSelect={setSelectedId}
              onMove={disabled ? undefined : handleMove}
            />
          </div>
        </div>

        {previewBroken && (
          <p className="mt-1 text-[11px] text-[#b91c1c]">
            تصویر پیش‌نمایش بارگذاری نشد؛ مسیر تصویر را بررسی کنید.
          </p>
        )}
      </div>

      {/* فهرست لایه‌ها */}
      {layers.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-[#dfe7d8] bg-white p-3 text-[11px] leading-6 text-[#9aa894]">
          هنوز متنی اضافه نشده است. اگر متن‌ها داخل خود تصویر هستند نیازی به
          افزودن متن نیست؛ برای تصویر بدون متن از «افزودن متن» استفاده کنید.
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {layers.map((layer, index) => (
            <span
              key={layer.id}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] ${
                layer.id === selectedId
                  ? "border-[#33533a] bg-[#33533a] text-white"
                  : "border-[#dfe7d8] bg-white text-[#4b5f4a]"
              }`}
            >
              <button
                type="button"
                className="max-w-[160px] truncate"
                onClick={() => setSelectedId(layer.id)}
                title={layer.text}
              >
                {index + 1}. {layer.text.trim() || "بدون متن"}
              </button>

              <button
                type="button"
                aria-label="حذف این متن"
                className="opacity-70 hover:opacity-100"
                onClick={() => removeLayer(layer.id)}
                disabled={disabled}
              >
                <Trash2 size={12} aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* تنظیمات لایهٔ انتخاب‌شده */}
      {selectedLayer && (
        <div className="mt-3 rounded-xl border border-[#e6ecdf] bg-white p-3">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-[#33533a]">
            <AlignCenter size={13} aria-hidden="true" />
            تنظیمات متن انتخاب‌شده
          </p>

          <div className="admin-form-grid">
            <div className="admin-field admin-full">
              <label className="admin-label" htmlFor="banner-layer-text">
                متن
              </label>
              <textarea
                id="banner-layer-text"
                className="admin-input"
                rows={2}
                maxLength={300}
                value={selectedLayer.text}
                onChange={(event) => patchSelected({ text: event.target.value })}
                disabled={disabled}
              />
              <span className="admin-help">
                متن ساده؛ برای شکستن خط از Enter استفاده کنید (حداکثر ۳۰۰
                نویسه).
              </span>
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="banner-layer-tag">
                نقش سئو (تگ)
              </label>
              <select
                id="banner-layer-tag"
                className="admin-input"
                value={selectedLayer.tag}
                onChange={(event) =>
                  patchSelected({
                    tag: event.target.value as BannerTextLayer["tag"],
                  })
                }
                disabled={disabled}
              >
                {BANNER_TEXT_TAGS.map((tag) => (
                  <option key={tag} value={tag}>
                    {BANNER_TEXT_TAG_LABELS[tag]}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="banner-layer-align">
                ترازبندی
              </label>
              <select
                id="banner-layer-align"
                className="admin-input"
                value={selectedLayer.align}
                onChange={(event) =>
                  patchSelected({ align: event.target.value as BannerTextAlign })
                }
                disabled={disabled}
              >
                {BANNER_TEXT_ALIGNS.map((align) => (
                  <option key={align} value={align}>
                    {BANNER_TEXT_ALIGN_LABELS[align]}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="banner-layer-font">
                فونت
              </label>
              <select
                id="banner-layer-font"
                className="admin-input"
                value={selectedLayer.font_family ?? ""}
                onChange={(event) =>
                  patchSelected({ font_family: event.target.value || null })
                }
                disabled={disabled}
              >
                <option value="">فونت پیش‌فرض سایت</option>

                <optgroup label="فونت‌های سایت">
                  {BANNER_FONT_PRESETS.map((preset) => (
                    <option key={preset.family} value={preset.family}>
                      {preset.label}
                    </option>
                  ))}
                </optgroup>

                {customFamilies.length > 0 && (
                  <optgroup label="فونت‌های سفارشی">
                    {customFamilies.map((family) => (
                      <option key={family} value={family}>
                        {family}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              <span className="admin-help">
                فونت‌های سفارشی را از بخش «کتابخانهٔ فونت بنرها» اضافه کنید.
              </span>
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="banner-layer-size">
                اندازهٔ دسکتاپ (px در عرض ۱۴۴۰)
              </label>
              <input
                id="banner-layer-size"
                type="number"
                className="admin-input"
                min={8}
                max={160}
                value={selectedLayer.font_size}
                onChange={(event) =>
                  patchSelected({ font_size: Number(event.target.value) || 8 })
                }
                disabled={disabled}
                dir="ltr"
              />
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="banner-layer-size-mobile">
                اندازهٔ موبایل (خالی = همان نسبت دسکتاپ)
              </label>
              <input
                id="banner-layer-size-mobile"
                type="number"
                className="admin-input"
                min={8}
                max={120}
                value={selectedLayer.font_size_mobile ?? ""}
                onChange={(event) =>
                  patchSelected({
                    font_size_mobile: event.target.value
                      ? Number(event.target.value)
                      : null,
                  })
                }
                disabled={disabled}
                dir="ltr"
              />
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="banner-layer-weight">
                ضخامت فونت
              </label>
              <select
                id="banner-layer-weight"
                className="admin-input"
                value={selectedLayer.font_weight}
                onChange={(event) =>
                  patchSelected({ font_weight: Number(event.target.value) })
                }
                disabled={disabled}
              >
                {BANNER_TEXT_WEIGHTS.map((weight) => (
                  <option key={weight} value={weight}>
                    {weight}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="banner-layer-line">
                فاصلهٔ خطوط
              </label>
              <input
                id="banner-layer-line"
                type="number"
                className="admin-input"
                min={0.8}
                max={3}
                step={0.05}
                value={selectedLayer.line_height}
                onChange={(event) =>
                  patchSelected({
                    line_height: Number(event.target.value) || 1.4,
                  })
                }
                disabled={disabled}
                dir="ltr"
              />
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="banner-layer-spacing">
                فاصلهٔ حروف
              </label>
              <input
                id="banner-layer-spacing"
                type="number"
                className="admin-input"
                min={-5}
                max={20}
                step={0.5}
                value={selectedLayer.letter_spacing}
                onChange={(event) =>
                  patchSelected({ letter_spacing: Number(event.target.value) || 0 })
                }
                disabled={disabled}
                dir="ltr"
              />
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="banner-layer-color">
                رنگ متن
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="banner-layer-color"
                  type="color"
                  className="h-9 w-12 rounded-lg border border-[#dfe7d8] bg-white"
                  value={selectedLayer.color}
                  onChange={(event) => patchSelected({ color: event.target.value })}
                  disabled={disabled}
                />
                <span dir="ltr" className="text-[11px] text-[#4b5f4a]">
                  {selectedLayer.color}
                </span>
              </div>
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="banner-layer-shadow">
                سایهٔ متن
              </label>
              <select
                id="banner-layer-shadow"
                className="admin-input"
                value={selectedLayer.shadow}
                onChange={(event) =>
                  patchSelected({
                    shadow: event.target.value as BannerTextShadow,
                  })
                }
                disabled={disabled}
              >
                {BANNER_TEXT_SHADOWS.map((shadow) => (
                  <option key={shadow} value={shadow}>
                    {BANNER_TEXT_SHADOW_LABELS[shadow]}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-field admin-full">
              <div className="flex flex-wrap items-center gap-3">
                <label className="admin-checkbox" htmlFor="banner-layer-italic">
                  <input
                    id="banner-layer-italic"
                    type="checkbox"
                    checked={selectedLayer.italic}
                    onChange={(event) =>
                      patchSelected({ italic: event.target.checked })
                    }
                    disabled={disabled}
                  />
                  مورب
                </label>

                <label className="admin-checkbox" htmlFor="banner-layer-upper">
                  <input
                    id="banner-layer-upper"
                    type="checkbox"
                    checked={selectedLayer.uppercase}
                    onChange={(event) =>
                      patchSelected({ uppercase: event.target.checked })
                    }
                    disabled={disabled}
                  />
                  حروف بزرگ
                </label>

                <label className="admin-checkbox" htmlFor="banner-layer-bg-on">
                  <input
                    id="banner-layer-bg-on"
                    type="checkbox"
                    checked={Boolean(selectedLayer.background)}
                    onChange={(event) =>
                      patchSelected({
                        background: event.target.checked ? "#000000" : null,
                      })
                    }
                    disabled={disabled}
                  />
                  کادر پس‌زمینه
                </label>

                {selectedLayer.background && (
                  <>
                    <input
                      type="color"
                      aria-label="رنگ پس‌زمینهٔ کادر"
                      className="h-9 w-12 rounded-lg border border-[#dfe7d8] bg-white"
                      value={selectedLayer.background}
                      onChange={(event) =>
                        patchSelected({ background: event.target.value })
                      }
                      disabled={disabled}
                    />

                    <label
                      className="flex items-center gap-2 text-[11px] text-[#4b5f4a]"
                      htmlFor="banner-layer-bg-opacity"
                    >
                      شفافیت
                      <input
                        id="banner-layer-bg-opacity"
                        type="number"
                        className="admin-input w-20"
                        min={0}
                        max={1}
                        step={0.05}
                        value={selectedLayer.background_opacity}
                        onChange={(event) =>
                          patchSelected({
                            background_opacity: Number(event.target.value) || 0,
                          })
                        }
                        disabled={disabled}
                        dir="ltr"
                      />
                    </label>
                  </>
                )}
              </div>
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="banner-layer-px">
                حاشیهٔ افقی کادر
              </label>
              <input
                id="banner-layer-px"
                type="number"
                className="admin-input"
                min={0}
                max={80}
                value={selectedLayer.padding_x}
                onChange={(event) =>
                  patchSelected({ padding_x: Number(event.target.value) || 0 })
                }
                disabled={disabled}
                dir="ltr"
              />
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="banner-layer-py">
                حاشیهٔ عمودی کادر
              </label>
              <input
                id="banner-layer-py"
                type="number"
                className="admin-input"
                min={0}
                max={80}
                value={selectedLayer.padding_y}
                onChange={(event) =>
                  patchSelected({ padding_y: Number(event.target.value) || 0 })
                }
                disabled={disabled}
                dir="ltr"
              />
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="banner-layer-radius">
                گردی گوشه‌ها
              </label>
              <input
                id="banner-layer-radius"
                type="number"
                className="admin-input"
                min={0}
                max={200}
                value={selectedLayer.radius}
                onChange={(event) =>
                  patchSelected({ radius: Number(event.target.value) || 0 })
                }
                disabled={disabled}
                dir="ltr"
              />
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="banner-layer-x">
                موقعیت افقی دسکتاپ (٪)
              </label>
              <input
                id="banner-layer-x"
                type="number"
                className="admin-input"
                min={0}
                max={100}
                step={0.5}
                value={selectedLayer.x}
                onChange={(event) =>
                  patchSelected({ x: Number(event.target.value) || 0 })
                }
                disabled={disabled}
                dir="ltr"
              />
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="banner-layer-y">
                موقعیت عمودی دسکتاپ (٪)
              </label>
              <input
                id="banner-layer-y"
                type="number"
                className="admin-input"
                min={0}
                max={100}
                step={0.5}
                value={selectedLayer.y}
                onChange={(event) =>
                  patchSelected({ y: Number(event.target.value) || 0 })
                }
                disabled={disabled}
                dir="ltr"
              />
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="banner-layer-xm">
                موقعیت افقی موبایل (٪)
              </label>
              <input
                id="banner-layer-xm"
                type="number"
                className="admin-input"
                min={0}
                max={100}
                step={0.5}
                value={selectedLayer.x_mobile ?? ""}
                placeholder="مثل دسکتاپ"
                onChange={(event) =>
                  patchSelected({
                    x_mobile: event.target.value
                      ? Number(event.target.value)
                      : null,
                  })
                }
                disabled={disabled}
                dir="ltr"
              />
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="banner-layer-ym">
                موقعیت عمودی موبایل (٪)
              </label>
              <input
                id="banner-layer-ym"
                type="number"
                className="admin-input"
                min={0}
                max={100}
                step={0.5}
                value={selectedLayer.y_mobile ?? ""}
                placeholder="مثل دسکتاپ"
                onChange={(event) =>
                  patchSelected({
                    y_mobile: event.target.value
                      ? Number(event.target.value)
                      : null,
                  })
                }
                disabled={disabled}
                dir="ltr"
              />
            </div>

            <div className="admin-field admin-full">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="admin-help">
                  در نمای «موبایل» با کشیدن متن، موقعیت موبایل ثبت می‌شود؛
                  خالی‌بودن آن یعنی همان نسبت دسکتاپ.
                </span>

                <button
                  type="button"
                  className="admin-btn admin-btn-sm"
                  onClick={() =>
                    patchSelected({
                      x_mobile: null,
                      y_mobile: null,
                      width_mobile: null,
                      font_size_mobile: null,
                    })
                  }
                  disabled={disabled}
                >
                  بازنشانی موقعیت موبایل
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* تنظیمات عمومی متن روی بنر */}
      <div className="mt-3 admin-form-grid">
        <div className="admin-field">
          <label className="admin-label" htmlFor="banner-text-scrim">
            پردهٔ پشت متن
          </label>
          <select
            id="banner-text-scrim"
            className="admin-input"
            value={scrim}
            onChange={(event) =>
              onScrimChange(event.target.value as BannerTextScrim)
            }
            disabled={disabled}
          >
            {BANNER_TEXT_SCRIMS.map((item) => (
              <option key={item} value={item}>
                {BANNER_TEXT_SCRIM_LABELS[item]}
              </option>
            ))}
          </select>
          <span className="admin-help">
            روی تصویرهای شلوغ، پردهٔ تیره خوانایی متن را بیشتر می‌کند.
          </span>
        </div>

        <div className="admin-field">
          <label className="admin-label" htmlFor="banner-image-alt">
            متن جایگزین تصویر (alt)
          </label>
          <input
            id="banner-image-alt"
            className="admin-input"
            value={imageAlt}
            maxLength={255}
            onChange={(event) => onImageAltChange(event.target.value)}
            disabled={disabled}
            placeholder="مثل: بنر کمپین مراقبت از پوست"
          />
          <span className="admin-help">
            برای سئو و screen reader؛ اگر خالی بماند از عنوان بنر استفاده
            می‌شود.
          </span>
        </div>
      </div>
    </div>
  );
}

export default AdminBannerTextEditor;
