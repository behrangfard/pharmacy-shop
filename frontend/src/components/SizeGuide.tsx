import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Check, Heart, Lightbulb, Ruler, Shirt, Sparkles, X } from "lucide-react";

import {
  generalTips,
  measureSteps,
  sizeGuideFooterNote,
  sizeGuideTabs,
  type SizeGuideTabId,
} from "../data/sizeGuide";

const tabIcons: Record<SizeGuideTabId, typeof Heart> = {
  bra: Heart,
  panties: Sparkles,
  clothes: Shirt,
};

export interface SizeGuideContentProps {
  /** تبی که در ابتدا باز می‌شود */
  initialTab?: SizeGuideTabId;
  className?: string;
}

/**
 * محتوای راهنمای سایز؛ هم داخل مودال صفحهٔ محصول استفاده می‌شود و هم
 * داخل صفحهٔ مستقل «راهنمای انتخاب سایز».
 */
export function SizeGuideContent({
  initialTab = "bra",
  className = "",
}: SizeGuideContentProps) {
  const uid = useId();
  const [activeTab, setActiveTab] = useState<SizeGuideTabId>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const tab =
    sizeGuideTabs.find((item) => item.id === activeTab) ?? sizeGuideTabs[0];

  return (
    <div className={className}>
      {/* انتخاب دسته */}
      <div
        role="tablist"
        aria-label="دسته‌بندی راهنمای سایز"
        className="flex flex-wrap gap-2 rounded-2xl bg-brand-50 p-2"
      >
        {sizeGuideTabs.map((item) => {
          const Icon = tabIcons[item.id];
          const isActive = item.id === tab.id;

          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`${uid}-tab-${item.id}`}
              aria-selected={isActive}
              aria-controls={`${uid}-panel-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className={`
                flex flex-1 items-center justify-center gap-2
                whitespace-nowrap rounded-xl px-2 py-2
                text-[11.5px] font-bold transition-all
                sm:px-3 sm:py-2.5 sm:text-sm
                focus-visible:outline-none focus-visible:ring-2
                focus-visible:ring-brand-400
                ${
                  isActive
                    ? "bg-brand-600 text-white shadow-sm"
                    : "bg-white text-ink-soft hover:bg-brand-75"
                }
              `}
            >
              <Icon size={16} aria-hidden="true" />
              {item.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`${uid}-panel-${tab.id}`}
        aria-labelledby={`${uid}-tab-${tab.id}`}
        className="mt-5"
      >
        <p className="text-sm leading-8 text-muted">{tab.intro}</p>

        <div className="mt-5 space-y-6">
          {tab.tables.map((table) => (
            <section key={table.title}>
              <h3 className="text-sm font-black text-brand-700 sm:text-base">
                {table.title}
              </h3>

              {table.description && (
                <p className="mt-1.5 text-xs leading-6 text-muted-soft">
                  {table.description}
                </p>
              )}

              {/* موبایل: جدول فشرده و بدون اسکرول افقی تا همهٔ ستون‌ها دیده شوند؛
                  از sm به بالا ظاهر عادی جدول برمی‌گردد. */}
              <div className="mt-3 overflow-x-auto overscroll-x-contain rounded-2xl border border-brand-100">
                <table className="w-full table-fixed border-collapse text-[11px] sm:table-auto sm:min-w-[420px] sm:text-sm">
                  <thead>
                    <tr className="bg-brand-50">
                      {table.columns.map((column) => (
                        <th
                          key={column}
                          scope="col"
                          className="px-1 py-2 text-right text-[10px] font-bold leading-4 text-brand-600 first:w-[16%] sm:w-auto sm:whitespace-nowrap sm:px-3 sm:py-3 sm:text-xs"
                        >
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {table.rows.map((row) => (
                      <tr
                        key={row.join("|")}
                        className="border-t border-brand-75 transition-colors odd:bg-white even:bg-brand-50 hover:bg-brand-50"
                      >
                        {row.map((cell, cellIndex) => (
                          <td
                            key={`${cell}-${cellIndex}`}
                            className={`
                              px-1 py-2 text-right leading-5
                              text-ink-soft
                              sm:whitespace-nowrap sm:px-3 sm:py-2.5
                              ${cellIndex === 0 ? "font-black text-ink" : ""}
                            `}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {table.note && (
                <p className="mt-2.5 rounded-xl bg-cream px-3.5 py-2.5 text-[11px] leading-6 text-muted-soft">
                  {table.note}
                </p>
              )}

            </section>
          ))}
        </div>

        <section className="mt-6 rounded-2xl border border-brand-75 bg-cream p-4 sm:p-5">
          <h3 className="flex items-center gap-2 text-sm font-black text-brand-700">
            <Lightbulb size={16} className="text-gold" aria-hidden="true" />
            نکته‌های مهم این دسته
          </h3>

          <ul className="mt-3 space-y-2.5">
            {tab.tips.map((tip) => (
              <li
                key={tip}
                className="flex items-start gap-2 text-xs leading-7 text-muted"
              >
                <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* راهنمای اندازه‌گیری */}
      <section className="mt-8 rounded-2xl border border-brand-75 bg-white p-4 sm:p-5">
        <h3 className="flex items-center gap-2 text-base font-black text-ink">
          <Ruler size={18} className="text-plum-500" aria-hidden="true" />
          چطور اندازه بگیریم؟
        </h3>

        <p className="mt-1.5 text-xs leading-6 text-muted-soft">
          یک نوار اندازه‌گیری پارچه‌ای کافی است؛ چهار عدد زیر را یادداشت کنید.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {measureSteps.map((step, index) => (
            <div
              key={step.title}
              className="rounded-2xl bg-brand-50 p-4 ring-1 ring-brand-75"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-plum-100 text-xs font-black text-plum-600">
                  {(index + 1).toLocaleString("fa-IR")}
                </span>

                <span className="text-sm font-bold text-brand-700">
                  {step.title}
                </span>
              </div>

              <p className="mt-2 text-xs leading-7 text-muted">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* نکته‌های عمومی */}
      <section className="mt-6 rounded-2xl bg-brand-50 p-4 sm:p-5">
        <h3 className="flex items-center gap-2 text-base font-black text-ink">
          <Check size={18} className="text-brand-400" aria-hidden="true" />
          قبل از سفارش این‌ها را در نظر بگیرید
        </h3>

        <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {generalTips.map((tip) => (
            <li
              key={tip}
              className="flex items-start gap-2 text-xs leading-7 text-muted"
            >
              <Check
                size={14}
                className="mt-1.5 shrink-0 text-brand-400"
                aria-hidden="true"
              />
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-5 rounded-2xl border border-dashed border-brand-250 px-4 py-3 text-[11px] leading-6 text-muted-soft">
        {sizeGuideFooterNote}
      </p>

    </div>
  );
}

export interface SizeGuideModalProps {
  open: boolean;
  onClose: () => void;
  /** تب پیش‌فرض؛ از دستهٔ محصول تعیین می‌شود */
  initialTab?: SizeGuideTabId;
  /** عنوان سفارشی مودال (برای راهنمای سایز اختصاصی محصول) */
  title?: string;
  /** توضیح زیر عنوان */
  subtitle?: string;
  /**
   * محتوای سفارشی؛ اگر ارسال شود به‌جای راهنمای عمومی سایت نمایش داده
   * می‌شود (راهنمای سایز اختصاصی همان محصول).
   */
  children?: ReactNode;
}

/**
 * مودال راهنمای سایز برای صفحهٔ محصول.
 * با کلید Esc، دکمهٔ بستن یا کلیک روی پس‌زمینه بسته می‌شود.
 */
function SizeGuideModal({
  open,
  onClose,
  initialTab,
  title,
  subtitle,
  children,
}: SizeGuideModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="presentation"
      dir="rtl"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[70] flex items-end justify-center bg-brand-900/55 backdrop-blur-sm sm:items-center sm:p-6"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="size-guide-modal-title"
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-brand-250 bg-white shadow-2xl sm:max-h-[88vh] sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-brand-75 bg-cream px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
              <Ruler size={20} aria-hidden="true" />
            </span>

            <div>
              <h2
                id="size-guide-modal-title"
                className="text-lg font-black text-ink"
              >
                {title ?? "راهنمای انتخاب سایز"}
              </h2>

              <p className="mt-1 text-xs leading-6 text-muted-soft">
                {subtitle ??
                  "با چند اندازه‌گیری ساده، سایز درست را انتخاب کنید."}
              </p>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="بستن راهنمای سایز"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-soft transition-colors hover:bg-brand-75 hover:text-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          >
            <X size={19} aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
          {children ?? <SizeGuideContent initialTab={initialTab} />}
        </div>
      </div>
    </div>
  );
}

export default SizeGuideModal;

