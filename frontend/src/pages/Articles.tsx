import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Search,
  Sparkles,
} from "lucide-react";

import ArticleCard from "../components/ArticleCard";
import Layout from "../components/Layout";
import {
  fetchArticles,
  type ArticleSummary,
  type PaginationMeta,
} from "../services/articles";
import { usePageMeta } from "../hooks/usePageMeta";
import { NO_INDEX_ROBOTS, SITE_NAME } from "../utils/seo";
import { breadcrumbJsonLd } from "../utils/structuredData";

const EMPTY_META: PaginationMeta = {
  current_page: 1,
  last_page: 1,
  per_page: 9,
  total: 0,
};

/**
 * صفحهٔ «مقالات» فروشگاه.
 *
 * مقاله‌ها از پنل مدیریت منتشر می‌شوند و اینجا با جست‌وجو، فیلتر دسته و
 * صفحه‌بندی نمایش داده می‌شوند.
 */
function Articles() {
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /*
   * متای صفحهٔ مقالات: صفحهٔ اول و صفحهٔ دسته ایندکس می‌شوند؛ صفحه‌بندی بعدی و
   * نتیجهٔ جست‌وجو noindex می‌شوند تا محتوای تکراری ساخته نشود.
   */
  const pageMeta = useMemo(() => {
    const title = category
      ? `مقالات دستهٔ «${category}» | ${SITE_NAME}`
      : `مقالات و راهنمای خرید | ${SITE_NAME}`;

    const path = category
      ? `/articles?category=${encodeURIComponent(category)}`
      : "/articles";

    return {
      title,
      description:
        "مقالات آموزشی بهرنگ شاپ: راهنمای انتخاب سایز، نکات نگهداری لباس زیر، انتخاب ست مناسب و راهنمای خرید.",
      path,
      robots: activeQuery || page > 1 ? NO_INDEX_ROBOTS : undefined,
      jsonLd: breadcrumbJsonLd([
        { name: "خانه", path: "/" },
        { name: category ? `مقالات ${category}` : "مقالات", path },
      ]),
    };
  }, [category, activeQuery, page]);

  usePageMeta(pageMeta);

  useEffect(() => {
    let ignore = false;

    setLoading(true);
    setError("");

    fetchArticles({
      page,
      perPage: 9,
      category: category || undefined,
      q: activeQuery || undefined,
    })
      .then((result) => {
        if (ignore) return;

        setArticles(result.articles);
        setMeta(result.meta);
        setCategories(result.categories);
      })
      .catch(() => {
        if (ignore) return;

        setError("دریافت مقاله‌ها انجام نشد. لطفاً دوباره تلاش کنید.");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [page, category, activeQuery]);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setActiveQuery(searchInput.trim());
  }

  function selectCategory(nextCategory: string) {
    setCategory(nextCategory);
    setPage(1);
  }

  const hasFilters = Boolean(category || activeQuery);

  return (
    <Layout>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <nav
          aria-label="مسیر صفحه"
          className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted-soft"
        >
          <Link to="/" className="transition-colors hover:text-brand-600">
            خانه
          </Link>
          <span aria-hidden="true">/</span>
          <span className="font-bold text-ink-soft">مقالات</span>
        </nav>

        <header className="overflow-hidden rounded-3xl border border-brand-100 bg-gradient-to-l from-brand-75 via-cream to-plum-50 p-6 sm:p-9">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-brand-600 shadow-sm">
                <Sparkles size={14} aria-hidden="true" />
                هر روز یک نکتهٔ تازه
              </div>

              <h1 className="mt-4 text-2xl font-black leading-relaxed text-ink sm:text-3xl">
                مقالات بهرنگ شاپ
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-8 text-muted">
                راهنمای انتخاب سایز، نگهداری از لباس، جنس پارچه و نکته‌های خرید؛
                همه در یک جا تا با آگاهی بیشتری انتخاب کنید.
              </p>
            </div>

            <div className="flex h-20 w-20 shrink-0 items-center justify-center self-start rounded-3xl bg-white/80 text-plum-500 shadow-sm sm:self-center">
              <BookOpen size={36} aria-hidden="true" />
            </div>
          </div>
        </header>

        <section className="mt-6 rounded-3xl border border-brand-100 bg-white p-4 sm:p-6">
          <form
            onSubmit={handleSearchSubmit}
            className="flex flex-col gap-3 sm:flex-row sm:items-center"
            role="search"
          >
            <div className="relative flex-1">
              <Search
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-soft"
              />
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="جست‌وجو در مقاله‌ها..."
                aria-label="جست‌وجو در مقاله‌ها"
                className="h-11 w-full rounded-xl border border-brand-100 bg-brand-50 pr-9 pl-3 text-sm text-ink outline-none transition-colors placeholder:text-muted-soft focus:border-brand-400 focus:bg-white"
              />
            </div>

            <button
              type="submit"
              className="h-11 shrink-0 rounded-xl bg-brand-600 px-5 text-sm font-bold text-white transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
            >
              جست‌وجو
            </button>
          </form>

          {categories.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => selectCategory("")}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                  category === ""
                    ? "bg-brand-600 text-white"
                    : "bg-brand-50 text-ink-soft hover:bg-brand-100"
                }`}
              >
                همهٔ مقاله‌ها
              </button>

              {categories.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => selectCategory(item)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                    category === item
                      ? "bg-brand-600 text-white"
                      : "bg-brand-50 text-ink-soft hover:bg-brand-100"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="mt-6">
          {error && (
            <div
              role="alert"
              className="rounded-2xl border border-blush-100 bg-blush-50 px-5 py-4 text-sm text-discount"
            >
              {error}
            </div>
          )}

          {!error && loading && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((item) => (
                <div
                  key={item}
                  className="h-72 animate-pulse rounded-3xl border border-brand-75 bg-brand-50"
                />
              ))}
            </div>
          )}

          {!error && !loading && articles.length === 0 && (
            <div className="rounded-3xl border border-dashed border-brand-100 bg-white px-6 py-14 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-400">
                <BookOpen size={28} aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-base font-black text-ink">
                {hasFilters
                  ? "مقاله‌ای با این فیلترها پیدا نشد"
                  : "هنوز مقاله‌ای منتشر نشده است"}
              </h2>
              <p className="mt-2 text-sm leading-7 text-muted-soft">
                {hasFilters
                  ? "عبارت جست‌وجو یا دسته را تغییر دهید."
                  : "به‌زودی مقاله‌های تازه در این بخش منتشر می‌شوند."}
              </p>
            </div>
          )}

          {!error && !loading && articles.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          )}
        </section>

        {meta.last_page > 1 && (
          <nav
            aria-label="صفحه‌بندی مقاله‌ها"
            className="mt-8 flex items-center justify-center gap-3"
          >
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={meta.current_page <= 1 || loading}
              className="inline-flex h-10 items-center gap-1 rounded-xl border border-brand-100 bg-white px-4 text-xs font-bold text-ink-soft transition-colors hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronRight size={16} aria-hidden="true" />
              قبلی
            </button>

            <span className="text-xs font-bold text-muted-soft">
              صفحهٔ {meta.current_page} از {meta.last_page}
            </span>

            <button
              type="button"
              onClick={() =>
                setPage((current) => Math.min(meta.last_page, current + 1))
              }
              disabled={meta.current_page >= meta.last_page || loading}
              className="inline-flex h-10 items-center gap-1 rounded-xl border border-brand-100 bg-white px-4 text-xs font-bold text-ink-soft transition-colors hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              بعدی
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
          </nav>
        )}

      </div>
    </Layout>
  );
}

export default Articles;
