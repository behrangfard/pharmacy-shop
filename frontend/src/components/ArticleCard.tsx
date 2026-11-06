import { Link } from "react-router-dom";
import { ArrowLeft, CalendarDays, Clock } from "lucide-react";

import { formatArticleDate, type ArticleSummary } from "../services/articles";
import { getStorageUrl } from "../utils/images";

interface ArticleCardProps {
  article: ArticleSummary;
  variant?: "grid" | "compact";
  headingLevel?: "h2" | "h3";
}

/**
 * کارت مقاله در صفحهٔ «مقالات»، بخش صفحهٔ اول و مقاله‌های مرتبط.
 */
function ArticleCard({
  article,
  variant = "grid",
  headingLevel = "h3",
}: ArticleCardProps) {
  const cover = getStorageUrl(article.cover_image) ?? "";
  const Heading = headingLevel;
  const compact = variant === "compact";

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-brand-100 bg-white transition-shadow duration-200 hover:shadow-[0_18px_40px_-28px_rgba(47,58,46,0.45)]">
      <Link
        to={`/articles/${encodeURIComponent(article.slug)}`}
        className="relative block aspect-[16/10] overflow-hidden bg-brand-50"
        tabIndex={-1}
        aria-hidden="true"
      >
        {cover ? (
          <img
            src={cover}
            alt={article.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-soft">
            <span className="text-4xl font-black">مقاله</span>
          </div>
        )}

        {article.category && (
          <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-brand-600 shadow-sm backdrop-blur">
            {article.category}
          </span>
        )}
      </Link>

      <div className={`flex flex-1 flex-col gap-2.5 ${compact ? "p-4" : "p-5"}`}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-soft">
          {article.published_at && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays size={13} aria-hidden="true" />
              {formatArticleDate(article.published_at)}
            </span>
          )}

          <span className="inline-flex items-center gap-1">
            <Clock size={13} aria-hidden="true" />
            {article.reading_minutes} دقیقه مطالعه
          </span>
        </div>

        <Heading
          className={`font-black leading-7 text-ink ${compact ? "text-sm" : "text-base"}`}
        >
          <Link
            to={`/articles/${encodeURIComponent(article.slug)}`}
            className="transition-colors hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          >
            {article.title}
          </Link>
        </Heading>

        {article.excerpt && (
          <p className="line-clamp-3 text-xs leading-6 text-muted-soft">
            {article.excerpt}
          </p>
        )}

        <div className="mt-auto pt-2">
          <Link
            to={`/articles/${encodeURIComponent(article.slug)}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 transition-colors hover:text-brand-700"
          >
            ادامهٔ مطلب
            <ArrowLeft size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export default ArticleCard;
