import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BookOpen } from "lucide-react";

import ArticleCard from "./ArticleCard";
import { fetchLatestArticles, type ArticleSummary } from "../services/articles";

/**
 * بخش «تازه‌ترین مقالات» در صفحهٔ اول فروشگاه.
 *
 * مقاله‌ها از پنل مدیریت منتشر می‌شوند؛ اگر هنوز مقاله‌ای منتشر نشده باشد این
 * بخش به‌طور کامل نمایش داده نمی‌شود.
 */
function LatestArticles() {
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    fetchLatestArticles(3)
      .then((items) => {
        if (!ignore) setArticles(items);
      })
      .catch(() => {
        if (!ignore) setArticles([]);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  if (!loading && articles.length === 0) {
    return null;
  }

  return (
    <section className="bg-brand-50 py-12 sm:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-brand-600 shadow-sm">
              <BookOpen size={14} aria-hidden="true" />
              مجلهٔ بهرنگ شاپ
            </div>

            <h2 className="mt-3 text-xl font-black text-ink sm:text-2xl">
              تازه‌ترین مقالات
            </h2>

            <p className="mt-1.5 text-sm leading-7 text-muted-soft">
              راهنمای خرید، نگهداری از لباس و نکته‌های سلامت؛ هر روز یک مطلب تازه.
            </p>
          </div>

          <Link
            to="/articles"
            className="inline-flex items-center gap-2 self-start rounded-xl border border-brand-100 bg-white px-4 py-2.5 text-xs font-bold text-ink-soft transition-colors hover:bg-brand-50 sm:self-auto"
          >
            همهٔ مقاله‌ها
            <ArrowLeft size={15} aria-hidden="true" />
          </Link>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-72 animate-pulse rounded-3xl border border-brand-75 bg-white"
              />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default LatestArticles;
