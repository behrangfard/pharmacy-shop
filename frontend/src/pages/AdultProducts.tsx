import { useCallback, useEffect, useState } from "react";
import { ChevronDown, LogOut, Lock, Search, ShieldAlert, X } from "lucide-react";

import AdultGate from "../components/AdultGate";
import Layout from "../components/Layout";
import ProductCard from "../components/ProductCard";
import { useAdultConsent } from "../hooks/useAdultConsent";
import { usePageMeta } from "../hooks/usePageMeta";
import { api } from "../services/api";
import {
  fetchProductFilters,
  type CategoryFacet,
} from "../services/productFilters";
import type { WishlistProduct } from "../services/wishlist";
import { ADULT_MIN_AGE } from "../utils/adultGate";
import { NO_INDEX_ROBOTS, SITE_NAME } from "../utils/seo";

/**
 * بخش ویژهٔ بزرگسالان (۱۸+).
 *
 * دو قاعدهٔ اصلی این صفحه:
 *  ۱) پیش از تأیید سن هیچ محتوایی رندر نمی‌شود و هیچ درخواستی برای محصولات
 *     ۱۸+ به سرور فرستاده نمی‌شود (درخواست با پرچم `adult=1` بعد از تأیید).
 *  ۲) این محصولات فقط همین‌جا دیده می‌شوند؛ سرور آن‌ها را از فهرست عمومی،
 *     صفحهٔ دسته و برند، ویترین صفحهٔ اصلی، فید گوگل و sitemap بیرون
 *     گذاشته است.
 */
const PRODUCTS_PER_PAGE = 24;

/** نگاشت مرتب‌سازی رابط کاربری به پارامتر API. */
const SORT_PARAM: Record<string, string> = {
  newest: "latest",
  "price-low": "price_asc",
  "price-high": "price_desc",
  popular: "popular",
  discount: "discount",
};

/** گزینه‌های مرتب‌سازی (مقدار، برچسب). */
const SORT_OPTIONS: [string, string][] = [
  ["newest", "جدیدترین"],
  ["popular", "پرفروش‌ترین"],
  ["price-low", "ارزان‌ترین"],
  ["price-high", "گران‌ترین"],
  ["discount", "بیشترین تخفیف"],
];

const MIN_AGE_LABEL = ADULT_MIN_AGE.toLocaleString("fa-IR");

function AdultProducts() {
  const { confirmed, confirm, revoke } = useAdultConsent();

  const [products, setProducts] = useState<WishlistProduct[]>([]);
  const [categories, setCategories] = useState<CategoryFacet[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // این صفحه در نتایج گوگل ایندکس نمی‌شود.
  usePageMeta({
    title: `بخش ویژهٔ بزرگسالان (${MIN_AGE_LABEL}+) | ${SITE_NAME}`,
    description: `محصولات و پوشاک ویژهٔ بزرگسالان (${MIN_AGE_LABEL}+) در ${SITE_NAME}؛ نمایش این بخش فقط پس از تأیید سن.`,
    path: "/adult",
    robots: NO_INDEX_ROBOTS,
  });

  // جست‌وجو با تأخیر کوتاه تا با هر تایپ درخواست فرستاده نشود.
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [category, sort]);

  // چیپ‌های دستهٔ همین بخش؛ فقط دسته‌هایی که کالای ۱۸+ دارند.
  useEffect(() => {
    if (!confirmed) return;

    let cancelled = false;

    fetchProductFilters({ adult: 1 })
      .then((facets) => {
        if (cancelled) return;

        setCategories(
          facets.categories.filter((item) => Number(item.count) > 0),
        );
      })
      .catch((facetsError) => {
        console.error("Adult facets error:", facetsError);
      });

    return () => {
      cancelled = true;
    };
  }, [confirmed]);

  useEffect(() => {
    if (!confirmed) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");

      const params: Record<string, string | number> = {
        adult: 1,
        page,
        per_page: PRODUCTS_PER_PAGE,
        sort: SORT_PARAM[sort] ?? "latest",
      };

      if (debouncedSearch) params.search = debouncedSearch;
      if (category) params.category = category;

      try {
        const response = await api.get("/products", { params });
        const payload = response.data?.data;

        const result = Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload)
            ? payload
            : [];

        if (cancelled) return;

        setProducts(result);
        setTotal(Number(payload?.total ?? result.length) || result.length);
        setLastPage(Math.max(Number(payload?.last_page ?? 1) || 1, 1));
      } catch (loadError: any) {
        if (cancelled) return;

        console.error("Adult products error:", loadError);

        setProducts([]);
        setTotal(0);
        setLastPage(1);
        setError(
          loadError?.response?.data?.message ??
            "دریافت محصولات این بخش با خطا مواجه شد.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [confirmed, page, debouncedSearch, category, sort]);

  const goToPage = useCallback(
    (nextPage: number) => {
      const target = Math.min(Math.max(nextPage, 1), lastPage);

      if (target !== page) {
        setPage(target);
      }
    },
    [lastPage, page],
  );

  /* تا تأیید سن، هیچ محتوایی از این بخش رندر نمی‌شود. */
  if (!confirmed) {
    return (
      <Layout>
        <AdultGate
          title={`فروشگاه محصولات ویژهٔ بزرگسالان (${MIN_AGE_LABEL}+)`}
          onConfirm={confirm}
        />
      </Layout>
    );
  }

  return (
    <Layout>
      <main className="min-h-screen bg-cream">
        {/* نوار عنوان بخش ویژه؛ ظاهر تیره/رز تا از فروشگاه عادی جدا باشد. */}
        <section className="border-b border-rose-900/20 bg-gradient-to-l from-slate-900 via-slate-900 to-rose-950">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-rose-400/40 bg-rose-500/10 px-4 py-2 text-xs font-black text-rose-200">
                  <ShieldAlert size={14} aria-hidden="true" />
                  بخش ویژهٔ بزرگسالان — {MIN_AGE_LABEL}+
                </span>

                <h1 className="mt-4 flex items-center gap-2 text-3xl font-black text-white sm:text-4xl">
                  <Lock size={26} aria-hidden="true" className="text-rose-300" />
                  فروشگاه ویژهٔ بزرگسالان
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200 sm:text-[15px]">
                  این بخش جدا از فروشگاه اصلی است: محصولات آن فقط همین‌جا نمایش
                  داده می‌شوند و وارد فهرست عمومی، جست‌وجو و پیشنهادهای صفحهٔ
                  اصلی نمی‌شوند.
                </p>
              </div>

              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <span className="text-sm text-slate-300">
                  {total.toLocaleString("fa-IR")} محصول در این بخش
                </span>

                <button
                  type="button"
                  onClick={revoke}
                  className="
                    inline-flex items-center gap-2 rounded-xl border
                    border-white/25 px-4 py-2.5 text-xs font-bold text-white
                    transition-colors hover:bg-white/10
                    focus-visible:outline-none focus-visible:ring-2
                    focus-visible:ring-white/40
                  "
                >
                  <LogOut size={15} aria-hidden="true" />
                  خروج از بخش ویژه
                </button>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          {/* جست‌وجو و مرتب‌سازی */}
          <div className="mb-5 rounded-2xl border border-line bg-surface p-3 shadow-sm sm:p-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search
                  size={18}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-soft"
                />

                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="جست‌وجو در محصولات این بخش..."
                  className="h-11 w-full rounded-xl border border-line bg-cream pl-9 pr-10 text-[13px] outline-none transition focus:border-rose-500 focus:bg-surface focus:ring-4 focus:ring-rose-100"
                />

                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="پاک کردن جست‌وجو"
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-soft transition hover:text-rose-600"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              <div className="relative min-w-[175px]">
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                  aria-label="مرتب‌سازی محصولات این بخش"
                  className="h-11 w-full appearance-none rounded-xl border border-line bg-surface px-3 pl-9 text-[13px] font-bold outline-none transition focus:border-rose-500"
                >
                  {SORT_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>

                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-soft"
                />
              </div>
            </div>

            {categories.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                <span className="text-xs text-muted-soft">دسته‌ها:</span>

                <button
                  type="button"
                  onClick={() => setCategory("")}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                    category === ""
                      ? "bg-rose-600 text-white"
                      : "bg-cream text-muted hover:bg-rose-50 hover:text-rose-700"
                  }`}
                >
                  همه
                </button>

                {categories.map((item) => (
                  <button
                    key={item.slug}
                    type="button"
                    onClick={() => setCategory(item.slug)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                      category === item.slug
                        ? "bg-rose-600 text-white"
                        : "bg-cream text-muted hover:bg-rose-50 hover:text-rose-700"
                    }`}
                  >
                    {item.name}
                    <span className="opacity-70">
                      {Number(item.count).toLocaleString("fa-IR")}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {loading && (
            <div
              className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4"
              aria-busy="true"
              aria-live="polite"
            >
              <span className="sr-only">در حال دریافت محصولات...</span>

              {Array.from({ length: 8 }, (_, index) => (
                <div
                  key={index}
                  aria-hidden="true"
                  className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm"
                >
                  <div className="aspect-square animate-pulse bg-rose-50" />

                  <div className="space-y-2 p-3 sm:p-4">
                    <div className="h-3 w-3/4 animate-pulse rounded-full bg-rose-100" />
                    <div className="h-3 w-1/2 animate-pulse rounded-full bg-rose-100" />
                    <div className="mt-3 h-5 w-2/5 animate-pulse rounded-full bg-rose-100" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="rounded-3xl border border-blush-100 bg-surface p-8 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blush-50 text-discount">
                <X size={26} />
              </div>

              <h2 className="mt-5 text-lg font-black">
                دریافت محصولات انجام نشد
              </h2>

              <p className="mt-2 text-sm text-muted">{error}</p>
            </div>
          )}

          {!loading && !error && products.length === 0 && (
            <div className="rounded-3xl border border-line bg-surface px-6 py-16 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
                <Lock size={26} aria-hidden="true" />
              </div>

              <h2 className="mt-5 text-lg font-black">
                محصولی در این بخش پیدا نشد
              </h2>

              <p className="mt-2 text-sm leading-7 text-muted">
                {total === 0
                  ? "هنوز کالایی با برچسب «ویژهٔ ۱۸+» ثبت نشده است. این محصولات از پنل مدیریت، در فرم هر محصول با تیک «۱۸+» مشخص می‌شوند."
                  : "با این جست‌وجو یا فیلتر نتیجه‌ای نبود؛ شرط‌ها را تغییر دهید."}
              </p>
            </div>
          )}

          {!loading && !error && products.length > 0 && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4">
                {products.map((item) => (
                  <ProductCard key={item.id} product={item} />
                ))}
              </div>

              {lastPage > 1 && (
                <div className="mt-7 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => goToPage(page + 1)}
                    disabled={page >= lastPage}
                    className="inline-flex items-center justify-center rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    صفحهٔ بعد
                  </button>

                  <span className="text-sm font-bold text-muted">
                    صفحهٔ {page.toLocaleString("fa-IR")} از{" "}
                    {lastPage.toLocaleString("fa-IR")}
                  </span>

                  <button
                    type="button"
                    onClick={() => goToPage(page - 1)}
                    disabled={page <= 1}
                    className="inline-flex items-center justify-center rounded-xl border border-line bg-surface px-4 py-2 text-sm font-bold text-ink-soft transition hover:bg-cream disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    صفحهٔ قبل
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </Layout>
  );
}

export default AdultProducts;

