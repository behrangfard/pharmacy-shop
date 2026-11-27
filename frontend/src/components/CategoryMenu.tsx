import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  ChevronDown,
  LayoutGrid,
  Lock,
  Menu,
  Ruler,
  X,
} from "lucide-react";

import {
  fetchCategories,
  getCachedCategories,
  type StorefrontCategory,
} from "../services/categories";
import { getStorageUrl } from "../utils/images";

/**
 * تصویر کوچک دسته‌بندی در ردیف‌های منو.
 *
 * مسیر تصویر از پنل مدیریت می‌آید («دسته‌بندی‌ها → تصویر دسته‌بندی»؛ بارگذاری فایل
 * یا آدرس دستی) و در سمت راست نام دسته نمایش داده می‌شود. اگر دسته تصویری
 * نداشته باشد، جعبهٔ جانشین با حرف اول نام می‌آید تا ردیف‌ها هم‌تراز بمانند؛ در
 * دراپ‌داون دسکتاپ (`fallback={false}`) فقط تصویر واقعی نشان داده می‌شود.
 */
function CategoryThumb({
  image,
  name,
  size,
  fallback = true,
}: {
  image?: string | null;
  name: string;
  size: "md" | "sm" | "xs";
  fallback?: boolean;
}) {
  const url = getStorageUrl(image);

  const boxClassName =
    size === "md"
      ? "h-10 w-10 rounded-xl text-sm"
      : size === "sm"
        ? "h-9 w-9 rounded-xl text-xs"
        : "h-8 w-8 rounded-lg text-[11px]";

  if (!url) {
    if (!fallback) {
      return null;
    }

    return (
      <span
        aria-hidden="true"
        className={`flex shrink-0 items-center justify-center bg-brand-75 font-black text-brand-500 ${boxClassName}`}
      >
        {name.trim().slice(0, 1) || "؟"}
      </span>
    );
  }

  return (
    // متن نام دسته کنار تصویر آمده؛ پس تصویر تزئینی است و alt خالی می‌ماند.
    <img
      src={url}
      alt=""
      aria-hidden="true"
      loading="lazy"
      className={`shrink-0 border border-line-soft object-cover ${boxClassName}`}
    />
  );
}

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
          {/* نوار دسکتاپ همیشه یک‌ردیفه است: دسته‌بندی‌ها فضای آزاد را می‌گیرند
              و در تنگنا کوتاه (truncate) می‌شوند تا گروه راهنما + بخش ویژه
              هرگز به خط دوم پرت نشود؛ فاصله‌ها هم فشرده شده‌اند. */}
          <div className="hidden w-full min-w-0 items-center gap-1.5 lg:flex xl:gap-2">
            {/* تا وقتی دسته‌بندی‌ها نرسیده‌اند، جای لینک‌ها با اسکلت پر می‌شود
                تا ارتفاع نوار منو ثابت بماند و صفحه جابه‌جا نشود. */}
            {loading && activeCategories.length === 0 && (
              <div className="flex items-center gap-1.5" aria-hidden="true">
                {[1, 2, 3, 4].map((item) => (
                  <div
                    key={item}
                    className="h-8 w-16 animate-pulse rounded-xl bg-line"
                  />
                ))}
              </div>
            )}
            {activeCategories.map((category) => {
              const activeChildren = (category.children ?? []).filter(
                (child) => child.is_active !== false,
              );

              return (
                <div key={category.id} className="group relative min-w-0">
                  <Link
                    to={`/products?category=${encodeURIComponent(category.slug)}`}
                    className="
                      inline-flex min-w-0 max-w-full items-center gap-1
                      rounded-xl px-2.5 py-2 text-[13px] font-medium
                      text-ink-soft transition-colors
                      hover:bg-brand-100 hover:text-brand-700
                      focus-visible:outline-none
                      focus-visible:ring-2 focus-visible:ring-brand-400
                      xl:gap-1.5 xl:px-3 xl:text-[13.5px]
                    "
                  >
                    <span className="truncate">{category.name}</span>

                    {activeChildren.length > 0 && (
                      <ChevronDown
                        size={14}
                        aria-hidden="true"
                        className="shrink-0 transition-transform duration-200 group-hover:rotate-180 group-focus-within:rotate-180"
                      />
                    )}
                  </Link>

                  {activeChildren.length > 0 && (
                    <div
                      className="
                        invisible absolute right-0 top-full z-50
                        min-w-52 translate-y-2 rounded-2xl
                        border border-line bg-surface p-2
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
                            flex min-w-0 items-center gap-2.5 rounded-xl
                            px-3.5 py-3 text-sm text-muted
                            transition-colors
                            hover:bg-brand-75 hover:text-brand-600
                            focus-visible:bg-brand-75
                            focus-visible:outline-none
                          "
                        >
                          <CategoryThumb
                            image={child.image}
                            name={child.name}
                            size="xs"
                            fallback={false}
                          />
                          <span className="min-w-0 flex-1">{child.name}</span>
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
            <div className="ms-auto flex shrink-0 items-center gap-2 xl:gap-2.5">
              <Link
                to="/size-guide"
                title="راهنمای انتخاب سایز"
                className="
                  inline-flex items-center gap-1.5 rounded-xl border
                  border-plum-200 bg-plum-50 px-2.5 py-2
                  text-[13px] font-bold text-plum-600 transition-colors
                  hover:bg-plum-100 hover:text-plum-700
                  focus-visible:outline-none
                  focus-visible:ring-2 focus-visible:ring-plum-300
                  xl:px-3
                "
              >
                <Ruler size={15} aria-hidden="true" className="shrink-0" />
                <span className="hidden xl:inline">راهنمای انتخاب سایز</span>
                <span className="sr-only xl:hidden">راهنمای انتخاب سایز</span>
              </Link>

              <Link
                to="/articles"
                title="مقالات و راهنما"
                className="
                  inline-flex items-center gap-1.5 rounded-xl border
                  border-brand-250 bg-brand-50 px-2.5 py-2
                  text-[13px] font-bold text-brand-600 transition-colors
                  hover:bg-brand-100 hover:text-brand-700
                  focus-visible:outline-none
                  focus-visible:ring-2 focus-visible:ring-brand-400
                  xl:px-3
                "
              >
                <BookOpen size={15} aria-hidden="true" className="shrink-0" />
                <span className="hidden xl:inline">مقالات و راهنما</span>
                <span className="sr-only xl:hidden">مقالات و راهنما</span>
              </Link>

              {/* بخش ویژهٔ بزرگسالان: جدا از دسته‌بندی‌ها و با گرادیان متحرک
                  (کلاس adult-nav-button) تا در یک نگاه متفاوت دیده شود. */}
              <Link
                to="/adult"
                className="
                  adult-nav-button inline-flex shrink-0 items-center gap-1.5
                  rounded-full border border-rose-300/70 px-3 py-2 text-[13px]
                  font-black text-white transition-transform
                  hover:-translate-y-0.5 focus-visible:outline-none
                  focus-visible:ring-2 focus-visible:ring-rose-300 xl:px-3.5
                "
              >
                <Lock
                  size={15}
                  aria-hidden="true"
                  className="relative z-10 shrink-0"
                />
                <span className="relative z-10 whitespace-nowrap">
                  بخش ویژه ۱۸+
                </span>
              </Link>
            </div>
          </div>

          {/* Mobile navigation button
              در موبایل تنها عنصر این ردیف است و تمام‌عرض می‌شود تا با پنل
              لبه‌به‌لبِ پایین هم‌تراز باشد (برچسب راست، فلش چپ). */}
          <button
            type="button"
            aria-label={mobileMenuOpen ? "بستن منو" : "باز کردن منو"}
            aria-expanded={mobileMenuOpen}
            onClick={() => {
              setMobileMenuOpen((open) => !open);
              setExpandedCategory(null);
            }}
            className="
              flex w-full items-center justify-between gap-2 rounded-xl
              border border-brand-250 bg-surface px-3.5 py-2.5
              text-sm font-bold text-ink-soft
              transition-colors hover:bg-brand-100
              focus-visible:outline-none
              focus-visible:ring-2 focus-visible:ring-brand-400
              lg:hidden
            "
          >
            <span className="inline-flex items-center gap-2">
              {mobileMenuOpen ? <X size={19} /> : <Menu size={19} />}
              دسته‌بندی محصولات
            </span>
            <ChevronDown
              size={15}
              className={`transition-transform ${
                mobileMenuOpen ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>

        {/* Mobile navigation menu
            پنل لبه‌به‌لب: با حاشیهٔ منفی از عرض داخلی کانتینر بیرون می‌زند و
            پدینگ خودش را برمی‌گرداند تا پس‌زمینهٔ پنل تمام عرض صفحه را بگیرد،
            ولی متن‌ها همان ترازِ بقیهٔ صفحه بمانند. */}
        {mobileMenuOpen && (
          <div className="-mx-4 border-t border-brand-100 px-4 pb-3 pt-2 sm:-mx-6 sm:px-6 lg:hidden">
            {/* «همه محصولات» با همان قالب ردیف‌های دسته‌بندی چیده می‌شود
                (تصویر سمت راست، متن کنارش) تا در موبایل هم‌تراز دسته‌ها باشد. */}
            <Link
              to="/products"
              onClick={closeMenu}
              className="
                flex min-w-0 items-center gap-3 border-b border-brand-75
                py-2.5 text-sm font-bold text-brand-600 transition-colors
                hover:text-brand-700
              "
            >
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600"
              >
                <LayoutGrid size={18} />
              </span>
              <span className="min-w-0 flex-1 truncate">همه محصولات</span>
            </Link>

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
                        flex min-w-0 flex-1 items-center gap-3 rounded-xl py-2.5
                        text-sm font-medium
                        text-ink-soft transition-colors
                        hover:text-brand-600
                      "
                    >
                      <CategoryThumb
                        image={category.image}
                        name={category.name}
                        size="md"
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {category.name}
                      </span>
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
                            flex min-w-0 items-center gap-2.5 rounded-xl
                            px-3 py-2 text-sm text-muted-soft
                            transition-colors
                            hover:bg-plum-100 hover:text-plum-600
                          "
                        >
                          <CategoryThumb
                            image={child.image}
                            name={child.name}
                            size="sm"
                          />
                          <span className="min-w-0 flex-1 truncate">
                            {child.name}
                          </span>
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

            {/* بخش ویژهٔ بزرگسالان در موبایل یک ردیف مستقل است و همان گرادیان
                متحرک دسکتاپ را می‌گیرد تا از دسته‌بندی‌های عادی جدا بماند. */}
            <Link
              to="/adult"
              onClick={closeMenu}
              className="
                adult-nav-button mt-3 flex items-center justify-between gap-2
                rounded-2xl border border-rose-300/70 px-3.5 py-3 text-sm
                font-black text-white
              "
            >
              <span className="relative z-10 inline-flex items-center gap-2">
                <Lock size={16} aria-hidden="true" className="shrink-0" />
                بخش ویژهٔ بزرگسالان
              </span>

              <span className="relative z-10 rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-black text-rose-700">
                ۱۸+
              </span>
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}

export default CategoryMenu;
