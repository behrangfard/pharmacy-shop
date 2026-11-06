import { Lightbulb, Ruler, Sparkles } from "lucide-react";

import { getStorageUrl } from "../utils/images";
import {
  productSizeGuideUnitLabel,
  sizeGuideRowMatchesSize,
  type ProductSizeGuide as ProductSizeGuideData,
} from "../utils/productSizeGuide";

export interface ProductSizeGuideProps {
  /** راهنمای سایز اختصاصی محصول */
  guide: ProductSizeGuideData;
  /** نام تنوع انتخاب‌شده؛ سطر متناظر در جدول برجسته می‌شود */
  selectedSize?: string | null;
  className?: string;
}

/**
 * نمایش «راهنمای سایز اختصاصی محصول» در صفحهٔ محصول.
 *
 * محتوای هر بخش اختیاری است و فقط بخش‌هایی که داده دارند رندر می‌شوند؛
 * بنابراین یک محصول می‌تواند فقط یک جدول کوچک داشته باشد یا راهنمای کامل
 * (توضیحات، تصویر اندازه‌گیری، مراحل، ابعاد دوخت، توصیه و نکته‌ها).
 */
export default function ProductSizeGuide({
  guide,
  selectedSize,
  className = "",
}: ProductSizeGuideProps) {
  const unitLabel = productSizeGuideUnitLabel(guide.unit);
  const hasChart = guide.columns.length > 0 && guide.rows.length > 0;
  const imageUrl = getStorageUrl(guide.measure_image);

  return (
    <div dir="rtl" className={`space-y-5 ${className}`}>
      {guide.intro && (
        <p className="text-sm leading-8 text-muted">{guide.intro}</p>
      )}

      {imageUrl && (
        <figure className="overflow-hidden rounded-2xl border border-brand-100 bg-cream p-2">
          <img
            src={imageUrl}
            alt={guide.title ? `نحوهٔ اندازه‌گیری ${guide.title}` : "نحوهٔ اندازه‌گیری"}
            loading="lazy"
            className="mx-auto max-h-72 w-full object-contain"
          />
        </figure>
      )}

      {guide.measure_steps.length > 0 && (
        <section>
          <h3 className="flex items-center gap-2 text-sm font-black text-brand-700 sm:text-base">
            <Ruler size={17} aria-hidden="true" />
            نحوهٔ اندازه‌گیری
          </h3>

          <ol className="mt-3 space-y-2.5">
            {guide.measure_steps.map((step, index) => (
              <li
                key={`${step.title}-${index}`}
                className="flex gap-3 rounded-2xl bg-brand-50 px-3 py-2.5"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">
                  {index + 1}
                </span>

                <div>
                  {step.title && (
                    <p className="text-xs font-bold text-brand-700">
                      {step.title}
                    </p>
                  )}
                  {step.description && (
                    <p className="mt-0.5 text-[11.5px] leading-6 text-muted-soft">
                      {step.description}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {hasChart && (
        <section>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-black text-brand-700 sm:text-base">
              جدول اندازه‌های این محصول
            </h3>

            {unitLabel && (
              <span className="rounded-full bg-brand-75 px-2.5 py-1 text-[11px] font-bold text-brand-600">
                واحد: {unitLabel}
              </span>
            )}
          </div>

          <div className="mt-3 overflow-x-auto overscroll-x-contain rounded-2xl border border-brand-100">
            <table className="w-full min-w-[420px] border-collapse text-center text-[11.5px] sm:text-sm">
              <thead>
                <tr className="bg-brand-50 text-brand-700">
                  {guide.columns.map((column, index) => (
                    <th
                      key={`${column}-${index}`}
                      scope="col"
                      className={`border-b border-brand-100 px-2 py-2.5 font-bold ${
                        index === 0 ? "font-black" : ""
                      }`}
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {guide.rows.map((row, rowIndex) => {
                  const isMatch = sizeGuideRowMatchesSize(row, selectedSize);

                  return (
                    <tr
                      key={`row-${rowIndex}`}
                      className={
                        isMatch
                          ? "bg-brand-75"
                          : rowIndex % 2 === 1
                            ? "bg-brand-50"
                            : "bg-white"
                      }
                    >
                      {row.map((cell, cellIndex) => (
                        <td
                          key={`cell-${cellIndex}`}
                          className={`border-b border-brand-75 px-2 py-2 ${
                            cellIndex === 0
                              ? "font-bold text-ink"
                              : "text-muted"
                          } ${isMatch ? "text-brand-800" : ""}`}
                        >
                          {cell || "—"}

                          {isMatch && cellIndex === 0 && (
                            <span className="mr-1 inline-flex items-center rounded-full bg-brand-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                              انتخاب شما
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {guide.specs.length > 0 && (
        <section>
          <h3 className="flex items-center gap-2 text-sm font-black text-brand-700 sm:text-base">
            <Sparkles size={16} aria-hidden="true" />
            ابعاد و مشخصات دوخت
          </h3>

          <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {guide.specs.map((spec, index) => (
              <div
                key={`${spec.label}-${index}`}
                className="rounded-xl border border-brand-75 bg-brand-50 px-3 py-2"
              >
                <dt className="text-[10.5px] text-muted-soft">
                  {spec.label || "مشخصه"}
                </dt>
                <dd className="mt-0.5 text-xs font-bold text-ink">
                  {spec.value || "—"}
                  {spec.value !== "" && unitLabel ? ` ${unitLabel}` : ""}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {guide.fit_note && (
        <p className="rounded-2xl border border-brand-250 bg-brand-50 px-4 py-3 text-xs leading-7 text-brand-700">
          <span className="ml-1 font-black">توصیهٔ انتخاب سایز:</span>
          {guide.fit_note}
        </p>
      )}

      {guide.tips.length > 0 && (
        <section>
          <h3 className="flex items-center gap-2 text-sm font-black text-brand-700 sm:text-base">
            <Lightbulb size={16} aria-hidden="true" />
            نکته‌های این مدل
          </h3>

          <ul className="mt-2 list-disc space-y-1.5 pr-5 text-xs leading-7 text-muted">
            {guide.tips.map((tip, index) => (
              <li key={`tip-${index}`}>{tip}</li>
            ))}
          </ul>
        </section>
      )}

      {guide.note && (
        <p className="rounded-xl border border-dashed border-brand-250 px-4 py-3 text-[11px] leading-6 text-muted-soft">
          {guide.note}
        </p>
      )}
    </div>
  );
}
