import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, FileText, Home as HomeIcon } from "lucide-react";

import Layout from "../components/Layout";
import RichTextContent from "../components/RichTextContent";
import { usePageMeta } from "../hooks/usePageMeta";
import { fetchSitePage, type SitePage } from "../services/pages";
import { SITE_NAME, plainText } from "../utils/seo";

/**
 * نمایش یک صفحهٔ ثابت سایت (/pages/{slug}).
 *
 * محتوای صفحه از بخش «مدیریت محتوا»ی پنل می‌آید و با همان قالب متن مقاله‌ها
 * رندر می‌شود. صفحهٔ پیش‌نویس/حذف‌شده از سرور ۴۰۴ می‌گیرد و پیام «یافت نشد»
 * نمایش داده می‌شود.
 */
function PageView() {
  const { slug = "" } = useParams();
  const [page, setPage] = useState<SitePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");
    setPage(null);

    if (slug.trim() === "") {
      setLoading(false);
      setError("آدرس صفحه معتبر نیست.");
      return () => {
        active = false;
      };
    }

    fetchSitePage(slug)
      .then((result) => {
        if (!active) return;

        setPage(result);
      })
      .catch((err) => {
        if (!active) return;

        setError(
          err?.response?.status === 404
            ? "این صفحه وجود ندارد یا منتشر نشده است."
            : "دریافت صفحه ناموفق بود. لطفاً دوباره تلاش کنید.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [slug]);

  const metaTitle = page
    ? `${page.seo_title || page.title} | ${SITE_NAME}`
    : undefined;

  usePageMeta(
    page
      ? {
          title: metaTitle ?? SITE_NAME,
          description:
            page.seo_description ||
            page.excerpt ||
            plainText(page.content) ||
            `صفحهٔ ${page.title} در ${SITE_NAME}`,
          path: `/pages/${page.slug}`,
        }
      : null,
  );

  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-4 pb-6 pt-6 sm:px-6 sm:pt-8">
        {/* مسیر صفحه */}
        <nav
          aria-label="مسیر صفحه"
          className="mb-5 flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-muted-soft"
        >
          <Link
            to="/"
            className="inline-flex items-center gap-1 transition-colors hover:text-brand-600"
          >
            <HomeIcon size={13} aria-hidden="true" />
            خانه
          </Link>

          <ArrowRight size={12} className="opacity-60" aria-hidden="true" />

          <span className="text-ink-soft">{page?.title ?? "صفحه"}</span>
        </nav>

        {loading && (
          <div className="rounded-3xl border border-brand-100 bg-white p-10 text-center text-sm font-bold text-muted">
            در حال دریافت صفحه...
          </div>
        )}

        {!loading && error && (
          <div
            role="alert"
            className="rounded-3xl border border-blush-100 bg-blush-50 p-8 text-center"
          >
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-discount">
              <FileText size={22} aria-hidden="true" />
            </div>

            <p className="text-sm font-black text-discount">{error}</p>

            <Link
              to="/"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-700"
            >
              <ArrowRight size={16} aria-hidden="true" />
              بازگشت به صفحهٔ اصلی
            </Link>
          </div>
        )}

        {!loading && page && (
          <article className="rounded-3xl border border-brand-100 bg-white px-5 py-7 shadow-sm sm:px-10 sm:py-10">
            <header className="border-b border-brand-75 pb-5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-[11px] font-bold text-brand-600">
                <FileText size={13} aria-hidden="true" />
                {SITE_NAME}
              </span>

              <h1 className="mt-3 text-2xl font-black leading-[2.2rem] text-ink sm:text-3xl sm:leading-[2.8rem]">
                {page.title}
              </h1>

              {page.excerpt && (
                <p className="mt-3 text-sm leading-8 text-muted-soft">
                  {page.excerpt}
                </p>
              )}
            </header>

            <div className="article-body pb-2">
              <RichTextContent content={page.content} />
            </div>
          </article>
        )}
      </div>
    </Layout>
  );
}

export default PageView;
