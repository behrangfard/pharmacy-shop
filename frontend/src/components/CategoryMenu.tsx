import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ChevronDown, Menu, Ruler, X } from "lucide-react";

import {
  fetchCategories,
  getCachedCategories,
  type StorefrontCategory,
} from "../services/categories";

function CategoryMenu() {
  // مقدار اولیه از کش (حافظه/localStorage) خوانده می‌شود تا منو در همان
  // اولین رندر نمایش داده شود و اسکلت لودینگ فقط در اولین بازدید دیده شود.
  const [categories, setCategories] = useState<StorefrontCategory[]>(
    () => getCachedCategories() ?? [],
  );

  const [loading, setLoading] = useState(() => getCachedCategories() === null);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    // اگر کش موجود باشد، منو بدون معطلی نمایش داده می‌شود و این درخواست
    // صرفاً در پس‌زمینه داده‌ها را تازه می‌کند.
    fetchCategories()
      .then((data) => {
        if (!cancelled) {
          setCategories(data);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error("دریافت دسته‌بندی‌های فروشگاه ناموفق بود:", error);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const activeCategories = categories.filter(
    (category) => category.is_active !== false,
  );

  const closeMenu = () => {
    setMobileMenuOpen(false);
    setExpandedCategory(null);
  };

  return (
    <nav
      aria-label="دسته‌بندی محصولات"
      aria-busy={loading}
      className="relative z-40 border-b border-brand-100 bg-cream"
      dir="rtl"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex min-h-12 items-center justify-between py-2 lg:min-h-14">
          {/* Desktop navigation */}
          <div className="hidden w-full flex-wrap items-center gap-x-3 gap-y-2 lg:flex">
            {/* تا وقتی دسته‌بندی‌ها نرسیده‌اند، جای لینک‌ها با اسکلت پر می‌شود
                تا ارتفاع نوار منو ثابت بماند و صفحه جابه‌جا نشود. */}
            {loading && activeCategories.length === 0 && (
              <div className="flex flex-wrap gap-3" aria-hidden="true">
                {[1, 2, 3, 4].map((item) => (
                  <div
                    key={item}
                    className="h-8 w-20 animate-pulse rounded-xl bg-line"
                  />
                ))}
              </div>
            )}
            {activeCategories.map((category) => {
              const activeChildren = (category.children ?? []).filter(
                (child) => child.is_active !== false,
              );

              return (
                <div key={category.id} className="group relative">
                  <Link
                    to={`/products?category=${encodeURIComponent(category.slug)}`}
                    className="
                      inline-flex items-center gap-1.5 rounded-xl
                      px-3.5 py-2.5 text-sm font-medium
                      text-ink-soft transition-colors
                      hover:bg-brand-100 hover:text-brand-700
                      focus-visible:outline-none
                      focus-visible:ring-2 focus-visible:ring-brand-400
                    "
                  >
                    {category.name}

                    {activeChildren.length > 0 && (
                      <ChevronDown
                        size={15}
                        aria-hidden="true"
                        className="transition-transform duration-200 group-hover:rotate-180 group-focus-within:rotate-180"
                      />
                    )}
                  </Link>

                  {activeChildren.length > 0 && (
                    <div
                      className="
                        invisible absolute right-0 top-full z-50
                        min-w-52 translate-y-2 rounded-2xl
                        border border-line bg-white p-2
                        opacity-0 shadow-lg
                        transition-all duration-200
                        group-hover:visible group-hover:translate-y-0
                        group-hover:opacity-100
                        group-focus-within:visible
                        group-focus-within:translate-y-0
                        group-focus-within:opacity-100
                      "
                    >
                      {activeChildren.map((child) => (
                        <Link
                          key={child.id}
                          to={`/products?category=${encodeURIComponent(child.slug)}`}
                          className="
                            block rounded-xl px-3.5 py-3
                            text-sm text-muted
                            transition-colors
                            hover:bg-brand-75 hover:text-brand-600
                            focus-visible:bg-brand-75
                            focus-visible:outline-none
                          "
                        >
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* این گروه با ms-auto به انتهای خط (سمت چپ نوار) هل داده
                می‌شود؛ در RTL فضای میان دسته‌بندی‌ها و این گروه خودکار پر
                می‌شود. shrink-0 مانع شکستن گروه بین دو خط می‌شود. */}
            <div className="ms-auto flex shrink-0 items-center gap-3">
              <Link
                to="/size-guide"
                className="
                  inline-flex items-center gap-1.5 rounded-xl border
                  border-plum-200 bg-plum-50 px-3.5 py-2.5
                  text-sm font-bold text-plum-600 transition-colors
                  hover:bg-plum-100 hover:text-plum-700
                  focus-visible:outline-none
                  focus-visible:ring-2 focus-visible:ring-plum-300
                "
              >
                <Ruler size={16} aria-hidden="true" />
                راهنمای انتخاب سایز
              </Link>

              <Link
                to="/articles"
                className="
                  inline-flex items-center gap-1.5 rounded-xl border
                  border-brand-250 bg-brand-50 px-3.5 py-2.5
                  text-sm font-bold text-brand-600 transition-colors
                  hover:bg-brand-100 hover:text-brand-700
                  focus-visible:outline-none
                  focus-visible:ring-2 focus-visible:ring-brand-400
                "
              >
                <BookOpen size={16} aria-hidden="true" />
                مقالات و راهنما
              </Link>
            </div>
          </div>

          {/* Mobile navigation button */}
          <button
            type="button"
            aria-label={mobileMenuOpen ? "بستن منو" : "باز کردن منو"}
            aria-expanded={mobileMenuOpen}
            onClick={() => {
              setMobileMenuOpen((open) => !open);
              setExpandedCategory(null);
            }}
            className="
              inline-flex items-center gap-2 rounded-xl
              border border-brand-250 bg-white px-3.5 py-2.5
              text-sm font-bold text-ink-soft
              transition-colors hover:bg-brand-100
              focus-visible:outline-none
              focus-visible:ring-2 focus-visible:ring-brand-400
              lg:hidden
            "
          >
            {mobileMenuOpen ? <X size={19} /> : <Menu size={19} />}
            دسته‌بندی محصولات
            <ChevronDown
              size={15}
              className={`transition-transform ${
                mobileMenuOpen ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>

        {/* Mobile navigation menu */}
        {mobileMenuOpen && (
          <div className="border-t border-brand-100 py-2 lg:hidden">
            {loading && activeCategories.length === 0 && (
              <p className="px-3 py-3 text-sm text-muted-soft">
                در حال بارگذاری دسته‌بندی‌ها…
              </p>
            )}

            {activeCategories.map((category) => {
              const activeChildren = (category.children ?? []).filter(
                (child) => child.is_active !== false,
              );

              const expanded = expandedCategory === category.id;

              return (
                <div
                  key={category.id}
                  className="border-b border-brand-75 last:border-b-0"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      to={`/products?category=${encodeURIComponent(category.slug)}`}
                      onClick={closeMenu}
                      className="
                        flex-1 rounded-xl py-3 text-sm font-medium
                        text-ink-soft transition-colors
                        hover:text-brand-600
                      "
                    >
                      {category.name}
                    </Link>

                    {activeChildren.length > 0 && (
                      <button
                        type="button"
                        aria-label={`نمایش زیرمجموعه‌های ${category.name}`}
                        aria-expanded={expanded}
                        onClick={() =>
                          setExpandedCategory(expanded ? null : category.id)
                        }
                        className="
                          rounded-xl p-2.5 text-brand-500
                          transition-colors hover:bg-brand-100
                          focus-visible:outline-none
                          focus-visible:ring-2 focus-visible:ring-brand-400
                        "
                      >
                        <ChevronDown
                          size={17}
                          className={`transition-transform duration-200 ${
                            expanded ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                    )}
                  </div>

                  {expanded && activeChildren.length > 0 && (
                    <div className="mb-3 mr-2 space-y-1 border-r-2 border-plum-300 pr-3">
                      {activeChildren.map((child) => (
                        <Link
                          key={child.id}
                          to={`/products?category=${encodeURIComponent(child.slug)}`}
                          onClick={closeMenu}
                          className="
                            block rounded-xl px-3 py-2.5
                            text-sm text-muted-soft
                            transition-colors
                            hover:bg-plum-100 hover:text-plum-600
                          "
                        >
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* دو لینک راهنما در موبایل هم مثل دسکتاپ یک گروهاند و به سمت
                چپ پنل چیده می‌شوند تا از بلوک‌های تمام‌عرض دسته‌بندی‌ها جدا
                باشند و انتهای منو شلوغ نشود. */}
            <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
              <Link
                to="/size-guide"
                onClick={closeMenu}
                className="
                  inline-flex items-center gap-2 rounded-xl
                  bg-plum-50 px-3 py-2.5 text-sm font-bold
                  text-plum-600 transition-colors
                  hover:bg-plum-100 hover:text-plum-700
                  focus-visible:outline-none
                  focus-visible:ring-2 focus-visible:ring-plum-300
                "
              >
                <Ruler size={16} aria-hidden="true" />
                راهنمای انتخاب سایز
              </Link>

              <Link
                to="/articles"
                onClick={closeMenu}
                className="
                  inline-flex items-center gap-2 rounded-xl
                  bg-brand-50 px-3 py-2.5 text-sm font-bold
                  text-brand-600 transition-colors
                  hover:bg-brand-100 hover:text-brand-700
                  focus-visible:outline-none
                  focus-visible:ring-2 focus-visible:ring-brand-400
                "
              >
                <BookOpen size={16} aria-hidden="true" />
                مقالات و راهنما
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

export default CategoryMenu;
