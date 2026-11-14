import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Compass,
  FileText,
  Home as HomeIcon,
  Newspaper,
  PackageSearch,
  Ruler,
  Search,
} from "lucide-react";

import Layout from "../components/Layout";
import { usePageMeta } from "../hooks/usePageMeta";
import { useSitePages } from "../hooks/useSitePages";
import { NO_INDEX_ROBOTS, SITE_NAME } from "../utils/seo";

/** میان‌برهای همیشه موجود در صفحهٔ ۴۰۴. */
const QUICK_LINKS = [
  {
    to: "/products",
    label: "همهٔ محصولات",
    icon: PackageSearch,
  },
  {
    to: "/articles",
    label: "مقالات",
    icon: Newspaper,
  },
  {
    to: "/size-guide",
    label: "راهنمای سایز",
    icon: Ruler,
  },
];

/**
 * صفحهٔ ۴۰۴ فروشگاه (/هر آدرس ناشناخته).
 *
 * قبلاً آدرس‌های اشتباه به صفحهٔ سفید می‌رسیدند؛ این صفحه مسیر بازگشت
 * می‌دهد: جست‌وجوی سریع محصول، میان‌برها و لینک صفحات ثابتی که مدیر در
 * بخش «مدیریت محتوا» ساخته است (مثلاً تماس با ما).
 */
function NotFound() {
  const location = useLocation();
  const navigate = useNavigate();
  const sitePages = useSitePages();
  const [query, setQuery] = useState("");

  usePageMeta({
    title: `صفحه پیدا نشد | ${SITE_NAME}`,
    description:
      "آدرسی که باز کردید در فروشگاه وجود ندارد. از این صفحه می‌توانید محصولات را جست‌وجو کنید یا به صفحهٔ اصلی برگردید.",
    path: location.pathname,
    robots: NO_INDEX_ROBOTS,
  });

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const value = query.trim();

    navigate(
      value === ""
        ? "/products"
        : `/products?search=${encodeURIComponent(value)}`,
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-4 pb-8 pt-8 sm:px-6 sm:pt-12">
        <section className="rounded-3xl border border-brand-100 bg-white px-5 py-9 text-center shadow-sm sm:px-10 sm:py-12">
          <span
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-2xl font-black text-brand-600"
            aria-hidden="true"
          >
            ۴۰۴
          </span>

          <h1 className="text-2xl font-black leading-9 text-ink sm:text-3xl sm:leading-[2.9rem]">
            این صفحه پیدا نشد
          </h1>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-8 text-muted-soft">
            شاید آدرس تغییر کرده یا محصول/صفحه حذف شده است. می‌توانید نام محصول
            را جست‌وجو کنید یا از میان‌برهای زیر ادامه دهید.
          </p>

          {/* جست‌وجوی سریع: همان پارامتری که صفحهٔ محصولات می‌خواند. */}
          <form
            onSubmit={handleSearch}
            className="mx-auto mt-6 flex w-full max-w-md items-center gap-2"
            role="search"
          >
            <div className="relative flex-1">
              <Search
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-soft"
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="نام محصول را بنویسید..."
                aria-label="جست‌وجوی محصول"
                className="w-full rounded-xl border border-line bg-white py-3 pr-9 pl-3 text-sm font-medium text-ink outline-none transition-colors focus:border-brand-400"
              />
            </div>

            <button
              type="submit"
              className="shrink-0 rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700"
            >
              جست‌وجو
            </button>
          </form>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-bold text-ink-soft transition-colors hover:border-brand-250 hover:text-brand-600"
            >
              <HomeIcon size={16} aria-hidden="true" />
              صفحهٔ اصلی
            </Link>

            {QUICK_LINKS.map((link) => {
              const Icon = link.icon;

              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-bold text-ink-soft transition-colors hover:border-brand-250 hover:text-brand-600"
                >
                  <Icon size={16} aria-hidden="true" />
                  {link.label}
                </Link>
              );
            })}
          </div>
        </section>

        {/* صفحات ثابت سایت (تماس با ما، قوانین و ...) که مدیر ساخته است. */}
        {sitePages.length > 0 && (
          <section className="mt-5 rounded-3xl border border-brand-100 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="flex items-center gap-2 text-sm font-black text-ink">
              <Compass size={16} className="text-brand-600" aria-hidden="true" />
              شاید دنبال این صفحه‌ها بودید
            </h2>

            <ul className="mt-3 flex flex-wrap gap-2">
              {sitePages.slice(0, 6).map((sitePage) => (
                <li key={sitePage.id}>
                  <Link
                    to={`/pages/${sitePage.slug}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-brand-50 px-3 py-2 text-xs font-bold text-brand-700 transition-colors hover:bg-brand-100"
                  >
                    <FileText size={13} aria-hidden="true" />
                    {sitePage.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs font-bold text-muted-soft">
          <ArrowLeft size={13} aria-hidden="true" />
          اگر فکر می‌کنید این خطاست، از دکمهٔ پشتیبانی پایین صفحه به ما خبر دهید.
        </p>
      </div>
    </Layout>
  );
}

export default NotFound;

