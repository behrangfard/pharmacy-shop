import { useEffect, useRef } from "react";
import { ExternalLink, Eye, X } from "lucide-react";

import RichTextContent from "./RichTextContent";

/** دادهٔ لازم برای پیش‌نمایش یک صفحهٔ سایت. */
export interface PagePreviewData {
  title: string;
  slug: string;
  excerpt?: string | null;
  content: string;
  isPublished?: boolean;
}

interface PagePreviewDialogProps {
  page: PagePreviewData | null;
  loading?: boolean;
  onClose: () => void;
}

/**
 * پیش‌نمایش صفحهٔ سایت داخل پنل مدیریت.
 *
 * چرا لازم است؟ متن صفحات با نشانه‌گذاری سبک (##، -، >، **) نوشته می‌شود و
 * مدیر تا قبل از انتشار نمی‌دانست خروجی نهایی چطور دیده می‌شود؛ صفحهٔ پیش‌نویس
 * هم در سایت وجود ندارد که بتوان بازش کرد. این پنجره همان قالب Article صفحهٔ
 * /pages/{slug} را با دادهٔ فعلی (حتی ذخیره‌نشده) نشان می‌دهد.
 */
function PagePreviewDialog({
  page,
  loading = false,
  onClose,
}: PagePreviewDialogProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);

    // اسکرول پس‌زمینه قفل می‌شود تا با چرخ ماوس، پنل جابه‌جا نشود.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    closeRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  if (!page && !loading) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-[rgba(22,34,25,0.52)] p-3 backdrop-blur-sm sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="page-preview-title"
        dir="rtl"
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-line-soft px-4 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Eye size={19} aria-hidden="true" />
            </span>

            <div>
              <h2
                id="page-preview-title"
                className="text-base font-black text-ink"
              >
                پیش‌نمایش صفحه
              </h2>
              <p className="mt-0.5 text-[11px] font-bold text-muted-soft">
                همان چیزی که مشتری در سایت می‌بیند
              </p>
            </div>
          </div>

          <button
            type="button"
            ref={closeRef}
            onClick={onClose}
            className="admin-btn admin-btn-sm"
            aria-label="بستن پیش‌نمایش"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto bg-cream px-3 py-4 sm:px-6 sm:py-6">
          {loading || !page ? (
            <div className="rounded-2xl border border-line bg-white p-5">
              <div className="h-4 w-32 animate-pulse rounded bg-brand-100" />
              <div className="mt-4 h-6 w-2/3 animate-pulse rounded bg-brand-100" />
              <div className="mt-5 space-y-2">
                <div className="h-3 w-full animate-pulse rounded bg-brand-50" />
                <div className="h-3 w-11/12 animate-pulse rounded bg-brand-50" />
                <div className="h-3 w-9/12 animate-pulse rounded bg-brand-50" />
              </div>
            </div>
          ) : (
            <article className="rounded-2xl border border-line bg-white px-4 py-5 shadow-sm sm:px-7 sm:py-7">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-[11px] font-bold text-brand-600">
                  <Eye size={12} aria-hidden="true" />
                  پیش‌نمایش
                </span>

                <span
                  className={`admin-badge ${
                    page.isPublished ? "admin-badge-green" : "admin-badge-amber"
                  }`}
                >
                  {page.isPublished ? "منتشرشده" : "پیش‌نویس"}
                </span>
              </div>

              <h1 className="mt-3 text-xl font-black leading-9 text-ink sm:text-2xl sm:leading-[2.6rem]">
                {page.title.trim() === "" ? "بدون عنوان" : page.title}
              </h1>

              {page.excerpt && page.excerpt.trim() !== "" && (
                <p className="mt-2 text-xs leading-7 text-muted-soft">
                  {page.excerpt}
                </p>
              )}

              <div className="mt-4 border-t border-line-soft pt-4">
                {page.content.trim() === "" ? (
                  <p className="text-xs font-bold text-muted-soft">
                    هنوز متنی برای این صفحه نوشته نشده است.
                  </p>
                ) : (
                  <RichTextContent content={page.content} />
                )}
              </div>
            </article>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-line-soft px-4 py-3 sm:px-6">
          <span
            dir="ltr"
            className="text-[11px] font-bold text-muted-soft"
            title="آدرس نهایی صفحه"
          >
            /pages/{page?.slug?.trim() || "..."}
          </span>

          <div className="flex items-center gap-2">
            {page?.isPublished && page.slug.trim() !== "" && (
              <a
                href={`/pages/${encodeURIComponent(page.slug)}`}
                target="_blank"
                rel="noreferrer"
                className="admin-btn admin-btn-sm"
              >
                <ExternalLink size={13} aria-hidden="true" />
                مشاهده در سایت
              </a>
            )}

            <button
              type="button"
              className="admin-btn admin-btn-sm admin-btn-primary"
              onClick={onClose}
            >
              بستن
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

export default PagePreviewDialog;
