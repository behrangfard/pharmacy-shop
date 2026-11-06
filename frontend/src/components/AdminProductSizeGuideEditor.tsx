import { useState, type CSSProperties } from "react";

import ProductSizeGuidePreview from "./ProductSizeGuide";
import { getStorageUrl } from "../utils/images";
import {
  PRODUCT_SIZE_GUIDE_UNIT_OPTIONS,
  hasProductSizeGuideContent,
  normalizeSizeLabel,
  type ProductSizeGuide,
  type ProductSizeGuideUnit,
} from "../utils/productSizeGuide";

export interface AdminProductSizeGuideEditorProps {
  /** مقدار فعلی راهنمای سایز همان محصول */
  value: ProductSizeGuide;
  onChange: (next: ProductSizeGuide) => void;
  /** نام تنوع‌های محصول؛ برای ساخت سریع سطر جدول اندازه‌ها */
  variantNames: string[];
  /** بارگذاری تصویر نحوهٔ اندازه‌گیری؛ مسیر ذخیره‌شده را برمی‌گرداند */
  onUploadImage: (file: File) => Promise<string | null>;
  uploadingImage?: boolean;
  /** پیام خطای بارگذاری تصویر */
  uploadError?: string;
}

const field: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  padding: "9px 11px",
  fontFamily: "inherit",
  fontSize: 13,
  background: "#fff",
  color: "#111827",
};

const label: CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 700,
  marginBottom: 6,
  color: "#374151",
};

const addButton: CSSProperties = {
  border: "1px dashed #93b78e",
  background: "#f6faf2",
  color: "#385e3e",
  borderRadius: 8,
  padding: "8px 12px",
  fontFamily: "inherit",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
};

const removeButton: CSSProperties = {
  border: "1px solid #fecaca",
  background: "#fef2f2",
  color: "#b91c1c",
  borderRadius: 7,
  padding: "5px 8px",
  fontFamily: "inherit",
  fontSize: 11,
  cursor: "pointer",
};

const groupTitle: CSSProperties = {
  margin: "22px 0 10px",
  fontSize: 13.5,
  fontWeight: 800,
  color: "#344b3a",
};

const hint: CSSProperties = {
  margin: "4px 0 0",
  fontSize: 11.5,
  lineHeight: 1.9,
  color: "#6b7280",
};

/**
 * ویرایشگر «راهنمای سایز اختصاصی محصول».
 *
 * همهٔ بخش‌ها اختیاری‌اند: عنوان، توضیح، تصویر اندازه‌گیری، مراحل اندازه‌گیری،
 * جدول اندازه‌ها (ستون/سطر دلخواه)، ابعاد دوخت، توصیهٔ انتخاب سایز، نکته‌ها و
 * یادداشت. پیش‌نمایش زنده کمک می‌کند نتیجه را همان‌طور که مشتری می‌بیند ببینید.
 */
export default function AdminProductSizeGuideEditor({
  value,
  onChange,
  variantNames,
  onUploadImage,
  uploadingImage = false,
  uploadError = "",
}: AdminProductSizeGuideEditorProps) {
  const [showPreview, setShowPreview] = useState(true);

  function patch(changes: Partial<ProductSizeGuide>) {
    onChange({ ...value, ...changes });
  }

  function updateColumn(index: number, next: string) {
    patch({
      columns: value.columns.map((column, columnIndex) =>
        columnIndex === index ? next : column,
      ),
    });
  }

  function addColumn() {
    if (value.columns.length >= 8) return;

    patch({
      columns: [...value.columns, ""],
      rows: value.rows.map((row) => [...row, ""]),
    });
  }

  function removeColumn(index: number) {
    if (value.columns.length <= 1) return;

    patch({
      columns: value.columns.filter((_, columnIndex) => columnIndex !== index),
      rows: value.rows.map((row) =>
        row.filter((_, cellIndex) => cellIndex !== index),
      ),
    });
  }

  function updateCell(rowIndex: number, cellIndex: number, next: string) {
    patch({
      rows: value.rows.map((row, currentRowIndex) =>
        currentRowIndex === rowIndex
          ? row.map((cell, currentCellIndex) =>
              currentCellIndex === cellIndex ? next : cell,
            )
          : row,
      ),
    });
  }

  function addRow() {
    patch({ rows: [...value.rows, value.columns.map(() => "")] });
  }

  function removeRow(rowIndex: number) {
    patch({ rows: value.rows.filter((_, index) => index !== rowIndex) });
  }

  /**
   * ساخت سطرهای جدول از نام تنوع‌های ثبت‌شدهٔ همین محصول؛ ستون‌های اندازه
   * خالی می‌مانند تا مدیر عدد هر سایز را وارد کند.
   */
  function addRowsFromVariants() {
    if (variantNames.length === 0) return;

    const existing = new Set(
      value.rows.map((row) => normalizeSizeLabel(row[0] ?? "")),
    );

    const newRows = variantNames
      .filter((name) => !existing.has(normalizeSizeLabel(name)))
      .map((name) => [name, ...value.columns.slice(1).map(() => "")]);

    if (newRows.length === 0) return;

    patch({ rows: [...value.rows, ...newRows] });
  }

  const imageUrl = getStorageUrl(value.measure_image);
  const canPreview = hasProductSizeGuideContent(value);

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: 8,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 17 }}>راهنمای سایز اختصاصی محصول</h2>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12.5,
              fontWeight: 700,
              color: "#374151",
            }}
          >
            <input
              type="checkbox"
              checked={value.is_enabled}
              onChange={(event) => patch({ is_enabled: event.target.checked })}
            />
            نمایش در صفحهٔ این محصول
          </label>

          <button
            type="button"
            onClick={() => setShowPreview((current) => !current)}
            style={{
              border: "1px solid #d1d5db",
              background: "#fff",
              color: "#374151",
              borderRadius: 8,
              padding: "7px 11px",
              fontFamily: "inherit",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {showPreview ? "بستن پیش‌نمایش" : "پیش‌نمایش"}
          </button>
        </div>
      </div>

      <p style={{ ...hint, marginTop: 0 }}>
        این راهنما فقط برای همین محصول است و به راهنمای سایز عمومی سایت کاری
        ندارد. اگر خالی بماند یا تیک نمایش برداشته شود، در صفحهٔ محصول نمایش
        داده نمی‌شود و دکمهٔ راهنمای سایز به راهنمای عمومی فروشگاه می‌رود.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
          marginTop: 14,
        }}
      >
        <div>
          <label style={label}>عنوان راهنما</label>
          <input
            value={value.title}
            onChange={(event) => patch({ title: event.target.value })}
            placeholder="مثلاً سایزبندی مدل آنجل"
            style={field}
          />
        </div>

        <div>
          <label style={label}>واحد اندازه‌ها</label>
          <select
            value={value.unit}
            onChange={(event) =>
              patch({ unit: event.target.value as ProductSizeGuideUnit })
            }
            style={field}
          >
            {PRODUCT_SIZE_GUIDE_UNIT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <label style={label}>توضیح این محصول (بالای جدول)</label>
        <textarea
          value={value.intro}
          onChange={(event) => patch({ intro: event.target.value })}
          rows={3}
          placeholder="مثلاً: این مدل کشباف است و انعطاف خوبی دارد؛ اگر بین دو سایز هستید، سایز بزرگ‌تر را انتخاب کنید."
          style={{ ...field, lineHeight: 1.9, resize: "vertical" }}
        />
      </div>

      {/* تصویر نحوهٔ اندازه‌گیری */}
      <h3 style={groupTitle}>تصویر نحوهٔ اندازه‌گیری (اختیاری)</h3>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={uploadingImage}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";

            if (!file) return;

            const path = await onUploadImage(file);

            if (path) {
              patch({ measure_image: path });
            }
          }}
          style={{ fontSize: 12 }}
        />

        {uploadingImage && (
          <span style={{ fontSize: 12, color: "#2563eb" }}>در حال بارگذاری...</span>
        )}

        {value.measure_image !== "" && (
          <button
            type="button"
            onClick={() => patch({ measure_image: "" })}
            style={removeButton}
          >
            حذف تصویر
          </button>
        )}
      </div>

      {uploadError && (
        <p style={{ ...hint, color: "#b91c1c" }}>{uploadError}</p>
      )}

      {imageUrl && (
        <img
          src={imageUrl}
          alt="پیش‌نمایش تصویر نحوهٔ اندازه‌گیری"
          style={{
            marginTop: 10,
            maxHeight: 160,
            borderRadius: 10,
            border: "1px solid #e5e7eb",
            background: "#f9fafb",
            padding: 6,
          }}
        />
      )}

      {/* مراحل اندازه‌گیری */}
      <h3 style={groupTitle}>مراحل اندازه‌گیری</h3>

      <p style={{ ...hint, marginTop: 0 }}>
        هر مرحله یک عنوان کوتاه و توضیح دارد؛ مثلاً «دور سینه» و «نوار را روی
        برجسته‌ترین نقطهٔ سینه و موازی زمین بچرخانید».
      </p>

      <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
        {value.measure_steps.map((step, index) => (
          <div
            key={`step-${index}`}
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(140px, 1fr) minmax(180px, 2fr) auto",
              gap: 8,
              alignItems: "start",
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              padding: 10,
              background: "#fcfdfa",
            }}
          >
            <input
              value={step.title}
              onChange={(event) =>
                patch({
                  measure_steps: value.measure_steps.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, title: event.target.value }
                      : item,
                  ),
                })
              }
              placeholder="عنوان مرحله"
              style={field}
            />

            <input
              value={step.description}
              onChange={(event) =>
                patch({
                  measure_steps: value.measure_steps.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, description: event.target.value }
                      : item,
                  ),
                })
              }
              placeholder="توضیح کوتاه"
              style={field}
            />

            <button
              type="button"
              onClick={() =>
                patch({
                  measure_steps: value.measure_steps.filter(
                    (_, itemIndex) => itemIndex !== index,
                  ),
                })
              }
              style={removeButton}
            >
              حذف
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() =>
          patch({
            measure_steps: [
              ...value.measure_steps,
              { title: "", description: "" },
            ],
          })
        }
        style={{ ...addButton, marginTop: 10 }}
      >
        + افزودن مرحله
      </button>

      {/* جدول اندازه‌ها */}
      <h3 style={groupTitle}>جدول اندازه‌های این محصول</h3>

      <p style={{ ...hint, marginTop: 0 }}>
        سرستون‌ها را در ردیف اول ویرایش کنید (مثلاً «سایز»، «دور سینه»، «دور
        کمر») و در هر سطر اندازه‌های همان سایز را بنویسید. ستون اول باید نام
        سایز باشد تا با تنوع‌های محصول تطبیق داده شود.
      </p>

      <div style={{ overflowX: "auto", marginTop: 10 }}>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 560 }}>
          <thead>
            <tr>
              {value.columns.map((column, index) => (
                <th key={`column-${index}`} style={{ padding: 4, minWidth: 110 }}>
                  <input
                    value={column}
                    onChange={(event) => updateColumn(index, event.target.value)}
                    placeholder={`ستون ${index + 1}`}
                    style={{ ...field, fontSize: 12, textAlign: "center", fontWeight: 700 }}
                  />

                  {value.columns.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeColumn(index)}
                      style={{
                        marginTop: 4,
                        border: "none",
                        background: "transparent",
                        color: "#b91c1c",
                        fontSize: 10.5,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      حذف ستون
                    </button>
                  )}
                </th>
              ))}

              <th style={{ width: 46 }} />
            </tr>
          </thead>

          <tbody>
            {value.rows.map((row, rowIndex) => (
              <tr key={`row-${rowIndex}`}>
                {value.columns.map((_, cellIndex) => (
                  <td key={`cell-${cellIndex}`} style={{ padding: 4 }}>
                    <input
                      value={row[cellIndex] ?? ""}
                      onChange={(event) =>
                        updateCell(rowIndex, cellIndex, event.target.value)
                      }
                      placeholder={cellIndex === 0 ? "سایز" : "مقدار"}
                      style={{ ...field, fontSize: 12, textAlign: "center", direction: "ltr" }}
                    />
                  </td>
                ))}

                <td style={{ padding: 4, textAlign: "center" }}>
                  <button
                    type="button"
                    onClick={() => removeRow(rowIndex)}
                    title="حذف این سطر"
                    style={removeButton}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {value.rows.length === 0 && (
        <p style={{ ...hint, marginTop: 8 }}>
          هنوز سطری ثبت نشده است. با «افزودن سطر» یا «ساخت سطر از تنوع‌های
          محصول» شروع کنید.
        </p>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
        <button type="button" onClick={addRow} style={addButton}>
          + افزودن سطر
        </button>

        <button type="button" onClick={addColumn} style={addButton}>
          + افزودن ستون
        </button>

        <button
          type="button"
          onClick={addRowsFromVariants}
          disabled={variantNames.length === 0}
          style={{
            ...addButton,
            borderStyle: "solid",
            cursor: variantNames.length === 0 ? "not-allowed" : "pointer",
            opacity: variantNames.length === 0 ? 0.55 : 1,
          }}
        >
          ساخت سطر از تنوع‌های محصول ({variantNames.length})
        </button>
      </div>

      {/* ابعاد و مشخصات دوخت */}
      <h3 style={groupTitle}>ابعاد و مشخصات دوخت</h3>

      <p style={{ ...hint, marginTop: 0 }}>
        اندازه‌های ثابت لباس (نه جدول سایز)؛ مثل «قد لباس: ۷۵»، «عرض بند:
        ۱.۵» یا «جنس: کشباف».
      </p>

      <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
        {value.specs.map((spec, index) => (
          <div
            key={`spec-${index}`}
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(130px, 1fr) minmax(130px, 1fr) auto",
              gap: 8,
              alignItems: "center",
            }}
          >
            <input
              value={spec.label}
              onChange={(event) =>
                patch({
                  specs: value.specs.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, label: event.target.value }
                      : item,
                  ),
                })
              }
              placeholder="عنوان مشخصه (مثلاً قد لباس)"
              style={field}
            />

            <input
              value={spec.value}
              onChange={(event) =>
                patch({
                  specs: value.specs.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, value: event.target.value }
                      : item,
                  ),
                })
              }
              placeholder="مقدار (مثلاً 75)"
              style={field}
            />

            <button
              type="button"
              onClick={() =>
                patch({
                  specs: value.specs.filter(
                    (_, itemIndex) => itemIndex !== index,
                  ),
                })
              }
              style={removeButton}
            >
              حذف
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() =>
          patch({ specs: [...value.specs, { label: "", value: "" }] })
        }
        style={{ ...addButton, marginTop: 10 }}
      >
        + افزودن مشخصه
      </button>

      {/* توصیه و نکته‌ها */}
      <h3 style={groupTitle}>توصیهٔ انتخاب سایز و نکته‌ها</h3>

      <div style={{ display: "grid", gap: 12 }}>
        <div>
          <label style={label}>توصیهٔ انتخاب سایز</label>
          <textarea
            value={value.fit_note}
            onChange={(event) => patch({ fit_note: event.target.value })}
            rows={2}
            placeholder="مثلاً: اگر بین دو سایز هستید، برای راحتی بیشتر سایز بزرگ‌تر را انتخاب کنید."
            style={{ ...field, lineHeight: 1.9, resize: "vertical" }}
          />
        </div>

        <div>
          <label style={label}>نکته‌های کوتاه این مدل</label>

          <div style={{ display: "grid", gap: 8 }}>
            {value.tips.map((tip, index) => (
              <div
                key={`tip-${index}`}
                style={{ display: "flex", gap: 8, alignItems: "center" }}
              >
                <input
                  value={tip}
                  onChange={(event) =>
                    patch({
                      tips: value.tips.map((item, itemIndex) =>
                        itemIndex === index ? event.target.value : item,
                      ),
                    })
                  }
                  placeholder="مثلاً: بند این مدل قابل تنظیم است."
                  style={field}
                />

                <button
                  type="button"
                  onClick={() =>
                    patch({
                      tips: value.tips.filter(
                        (_, itemIndex) => itemIndex !== index,
                      ),
                    })
                  }
                  style={removeButton}
                >
                  حذف
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => patch({ tips: [...value.tips, ""] })}
            style={{ ...addButton, marginTop: 10 }}
          >
            + افزودن نکته
          </button>
        </div>

        <div>
          <label style={label}>یادداشت پایانی</label>
          <textarea
            value={value.note}
            onChange={(event) => patch({ note: event.target.value })}
            rows={2}
            placeholder="مثلاً: جنس پارچه کشباف است؛ با آب سرد بشویید."
            style={{ ...field, lineHeight: 1.9, resize: "vertical" }}
          />
        </div>
      </div>

      {/* پیش‌نمایش زنده */}
      {showPreview && (
        <>
          <h3 style={groupTitle}>پیش‌نمایش در صفحهٔ محصول</h3>

          {canPreview ? (
            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                background: "#fff",
                padding: 16,
              }}
            >
              <p style={{ ...hint, marginTop: 0 }}>
                {value.is_enabled
                  ? "این بخش همان چیزی است که مشتری در مودال راهنمای سایز می‌بیند."
                  : "راهنما خاموش است؛ در سایت نمایش داده نمی‌شود."}
              </p>

              <ProductSizeGuidePreview
                guide={value}
                selectedSize={variantNames[0] ?? null}
              />
            </div>
          ) : (
            <p style={{ ...hint, marginTop: 0 }}>
              هنوز محتوایی وارد نشده است؛ با پر کردن عنوان، توضیح یا جدول،
              پیش‌نمایش همین‌جا نمایش داده می‌شود.
            </p>
          )}
        </>
      )}
    </div>
  );
}
