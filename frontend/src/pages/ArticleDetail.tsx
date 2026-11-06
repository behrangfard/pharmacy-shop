import { Fragment, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Clock,
  Share2,
  User,
} from "lucide-react";

import ArticleCard from "../components/ArticleCard";
import Layout from "../components/Layout";
import {
  fetchArticleBySlug,
  formatArticleDate,
  type ArticleDetail as ArticleDetailData,
  type ArticleSummary,
} from "../services/articles";
import { getStorageUrl } from "../utils/images";
import { usePageMeta } from "../hooks/usePageMeta";
import { NO_INDEX_ROBOTS, SITE_NAME, plainText } from "../utils/seo";
import {
  articleJsonLd,
  breadcrumbJsonLd,
} from "../utils/structuredData";

/** متن ساده + نشانه‌گذاری سبک (**پررنگ**) را به متن امن تبدیل می‌کند. */
function renderInline(text: string, keyPrefix: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={`${keyPrefix}-${index}`} className="font-black text-ink">
          {part.slice(2, -2)}
        </strong>
      );
    }

    return <Fragment key={`${keyPrefix}-${index}`}>{part}</Fragment>;
  });
}

/**
 * رندر سادهٔ متن مقاله: پاراگراف‌ها با خط خالی جدا می‌شوند و این نشانه‌ها
 * پشتیبانی می‌شوند: «## سرتیتر»، «### زیرتیتر»، «- لیست» و «> نقل‌قول».
 */
function renderContent(content: string) {
  const blocks = content.replace(/\r\n/g, "\n").trim().split(/\n{2,}/);

  return blocks.map((block, index) => {
    const trimmed = block.trim();

    if (trimmed === "") return null;

    if (trimmed.startsWith("### ")) {
      return (
        <h3
          key={index}
          className="mt-7 text-base font-black leading-8 text-ink"
        >
          {renderInline(trimmed.slice(4), `h3-${index}`)}
        </h3>
      );
    }

    if (trimmed.startsWith("## ")) {
      return (
        <h2
          key={index}
          className="mt-8 border-r-4 border-brand-400 pr-3 text-lg font-black leading-9 text-ink"
        >
          {renderInline(trimmed.slice(3), `h2-${index}`)}
        </h2>
      );
    }

    if (trimmed.startsWith("> ")) {
      return (
        <blockquote
          key={index}
          className="my-5 rounded-2xl border border-brand-100 bg-brand-50 px-5 py-4 text-sm leading-8 text-ink-soft"
        >
          {renderInline(trimmed.slice(2), `quote-${index}`)}
        </blockquote>
      );
    }

    const lines = trimmed.split("\n").map((line) => line.trim());

    const isList = lines.every(
      (line) => line.startsWith("- ") || line.startsWith("* "),
    );

    if (isList) {
      return (
        <ul
          key={index}
          className="my-5 list-disc space-y-2 pr-5 text-sm leading-8 text-ink-soft marker:text-brand-400"
        >
          {lines.map((line, lineIndex) => (
            <li key={lineIndex}>
              {renderInline(line.slice(2), `li-${index}-${lineIndex}`)}
            </li>
          ))}
        </ul>
      );
    }

    return (
      <p
        key={index}
        className="mt-4 whitespace-pre-line text-sm leading-8 text-ink-soft sm:text-[15px] sm:leading-9"
      >
        {renderInline(trimmed, `p-${index}`)}
      </p>
    );
  });
}

/**
 * صفحهٔ یک مقالهٔ کامل در فروشگاه.
 */
function ArticleDetail() {
  const { slug = "" } = useParams<{ slug: string }>();

  const [article, setArticle] = useState<ArticleDetailData | null>(null);
  const [related, setRelated] = useState<ArticleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [slug]);

  useEffect(() => {
    if (!slug) {
      setError("مقالهٔ موردنظر پیدا نشد.");
      setLoading(false);
      return;
    }

    let ignore = false;

    setLoading(true);
    setError("");

    fetchArticleBySlug(slug)
      .then((result) => {
        if (ignore) return;

        setArticle(result.article);
        setRelated(result.related);
      })
      .catch(() => {
        if (ignore) return;

        setArticle(null);
        setError("مقالهٔ موردنظر پیدا نشد یا حذف شده است.");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [slug]);

  /*
   * متای صفحهٔ مقاله + دادهٔ ساختاریافتهٔ Article.
   * صفحهٔ خطا (مقالهٔ حذف‌شده) noindex می‌شود تا در نتایج گوگل نماند.
   */
  const pageMeta = useMemo(() => {
    if (!article) {
      return {
        title: `مقالات | ${SITE_NAME}`,
        path: "/articles",
        robots: NO_INDEX_ROBOTS,
      };
    }

    return {
      title: `${article.title} | ${SITE_NAME}`,
      description:
        plainText(article.excerpt) ||
        plainText(article.content) ||
        article.title,
      path: `/articles/${article.slug}`,
      image: getStorageUrl(article.cover_image),
      type: "article" as const,
      publishedTime: article.published_at,
      modifiedTime: article.published_at,
      jsonLd: [
        articleJsonLd({
          title: article.title,
          slug: article.slug,
          excerpt: article.excerpt,
          coverImage: getStorageUrl(article.cover_image),
          authorName: article.author_name,
          publishedAt: article.published_at,
        }),
        breadcrumbJsonLd([
          { name: "خانه", path: "/" },
          { name: "مقالات", path: "/articles" },
          { name: article.title, path: `/articles/${article.slug}` },
        ]),
      ],
    };
  }, [article]);

  usePageMeta(pageMeta);

  const cover = useMemo(
    () => getStorageUrl(article?.cover_image) ?? "",
    [article],
  );

  async function handleShare() {
    const url = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({ title: article?.title ?? "", url });
        return;
      }

      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // امکان اشتراک‌گذاری در دسترس نبود یا کاربر لغو کرد.
    }
  }

  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <nav
          aria-label="مسیر صفحه"
          className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted-soft"
        >
          <Link to="/" className="transition-colors hover:text-brand-600">
            خانه
          </Link>
          <span aria-hidden="true">/</span>
          <Link
            to="/articles"
            className="transition-colors hover:text-brand-600"
          >
            مقالات
          </Link>
          <span aria-hidden="true">/</span>
          <span className="line-clamp-1 font-bold text-ink-soft">
            {article?.title ?? "مقاله"}
          </span>
        </nav>

        {loading && (
          <div className="animate-pulse space-y-4 rounded-3xl border border-brand-75 bg-white p-5">
            <div className="h-56 rounded-2xl bg-brand-50" />
            <div className="h-6 w-2/3 rounded-lg bg-brand-75" />
            <div className="h-4 w-1/3 rounded-lg bg-brand-75" />
            <div className="h-40 rounded-xl bg-brand-50" />
          </div>
        )}

        {!loading && error && (
          <div className="rounded-3xl border border-blush-100 bg-blush-50 px-6 py-12 text-center">
            <h1 className="text-lg font-black text-discount">{error}</h1>
            <p className="mt-2 text-sm leading-7 text-blush-400">
              ممکن است این مقاله هنوز منتشر نشده باشد.
            </p>
            <Link
              to="/articles"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-700"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              بازگشت به همهٔ مقاله‌ها
            </Link>
          </div>
        )}

        {!loading && !error && article && (
          <article className="overflow-hidden rounded-3xl border border-brand-100 bg-white">
            {cover && (
              <img
                src={cover}
                alt={article.title}
                className="h-52 w-full object-cover sm:h-72"
              />
            )}

            <div className="p-5 sm:p-8">
              {article.category && (
                <span className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-[11px] font-bold text-brand-600">
                  {article.category}
                </span>
              )}

              <h1 className="mt-3 text-xl font-black leading-9 text-ink sm:text-2xl sm:leading-[2.6rem]">
                {article.title}
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-brand-75 pb-5 text-[11px] text-muted-soft">
                {article.published_at && (
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays size={14} aria-hidden="true" />
                    {formatArticleDate(article.published_at)}
                  </span>
                )}

                <span className="inline-flex items-center gap-1.5">
                  <Clock size={14} aria-hidden="true" />
                  {article.reading_minutes} دقیقه مطالعه
                </span>

                {article.author_name && (
                  <span className="inline-flex items-center gap-1.5">
                    <User size={14} aria-hidden="true" />
                    {article.author_name}
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => void handleShare()}
                  className="mr-auto inline-flex items-center gap-1.5 rounded-lg border border-brand-100 px-2.5 py-1.5 font-bold text-ink-soft transition-colors hover:bg-brand-50"
                >
                  {copied ? (
                    <>
                      <Check size={13} aria-hidden="true" />
                      لینک کپی شد
                    </>
                  ) : (
                    <>
                      <Share2 size={13} aria-hidden="true" />
                      اشتراک‌گذاری
                    </>
                  )}
                </button>
              </div>

              <div className="article-body pb-2">{renderContent(article.content)}</div>

              <div className="mt-8 flex flex-col items-center justify-between gap-3 rounded-2xl bg-brand-50 px-5 py-4 text-center sm:flex-row sm:text-right">
                <p className="text-xs leading-7 text-muted-soft">
                  سؤال یا ابهامی دارید؟ بخش پشتیبانی فروشگاه پاسخ می‌دهد.
                </p>

                <Link
                  to="/products"
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                >
                  <ArrowLeft size={16} aria-hidden="true" />
                  مشاهدهٔ محصولات
                </Link>
              </div>
            </div>
          </article>
        )}


        {!loading && !error && related.length > 0 && (
          <section className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-black text-ink">
                مقاله‌های مرتبط
              </h2>

              <Link
                to="/articles"
                className="text-xs font-bold text-brand-600 transition-colors hover:text-brand-700"
              >
                همهٔ مقاله‌ها
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <ArticleCard key={item.id} article={item} variant="compact" />
              ))}
            </div>
          </section>
        )}

      </div>
    </Layout>
  );
}

export default ArticleDetail;

