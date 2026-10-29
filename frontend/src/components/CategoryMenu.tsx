import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Menu, X } from "lucide-react";
import api from "../services/api";

interface Category {
  id: number;
  name: string;
  slug: string;
  is_active?: boolean;
  children?: Category[];
}

interface CategoryCache {
  data: Category[];
  expiresAt: number;
}

const CATEGORY_CACHE_KEY = "storefront_categories_cache";
const CATEGORY_CACHE_TTL = 5 * 60 * 1000;

function readCategoryCache(): Category[] | null {
  try {
    const raw = sessionStorage.getItem(CATEGORY_CACHE_KEY);
    if (!raw) return null;

    const cached = JSON.parse(raw) as CategoryCache;

    if (
      !Array.isArray(cached.data) ||
      typeof cached.expiresAt !== "number" ||
      cached.expiresAt <= Date.now()
    ) {
      sessionStorage.removeItem(CATEGORY_CACHE_KEY);
      return null;
    }

    return cached.data;
  } catch {
    return null;
  }
}

function writeCategoryCache(data: Category[]): void {
  try {
    const cache: CategoryCache = {
      data,
      expiresAt: Date.now() + CATEGORY_CACHE_TTL,
    };

    sessionStorage.setItem(CATEGORY_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // در صورت در دسترس نبودن Storage، دریافت API همچنان کار می‌کند.
  }
}

function CategoryMenu() {
  const [categories, setCategories] = useState<Category[]>(
    () => readCategoryCache() ?? [],
  );

  const [loading, setLoading] = useState(() => readCategoryCache() === null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      try {
        const response = await api.get("/categories");
        const data = response.data?.data;

        if (!Array.isArray(data)) {
          throw new Error("Invalid categories response");
        }

        if (cancelled) return;

        setCategories(data);
        writeCategoryCache(data);
      } catch (error) {
        if (!cancelled) {
          console.error("دریافت دسته‌بندی‌های فروشگاه ناموفق بود:", error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadCategories();

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

  if (loading && activeCategories.length === 0) {
    return (
      <nav
        aria-label="دسته‌بندی محصولات"
        className="min-h-12 border-b border-[#e6ecdf] bg-[#faf9f4] lg:min-h-14"
        dir="rtl"
      >
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
          <div className="flex flex-wrap gap-3" aria-hidden="true">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-8 w-20 animate-pulse rounded-xl bg-[#e8eee3]"
              />
            ))}
          </div>
        </div>
      </nav>
    );
  }

  if (activeCategories.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="دسته‌بندی محصولات"
      className="relative z-40 border-b border-[#e6ecdf] bg-[#faf9f4]"
      dir="rtl"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex min-h-12 items-center justify-between py-2 lg:min-h-14">
          {/* Desktop navigation */}
          <div className="hidden w-full flex-wrap items-center gap-x-3 gap-y-2 lg:flex">
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
                      text-[#526451] transition-colors
                      hover:bg-[#e8efe2] hover:text-[#385e3e]
                      focus-visible:outline-none
                      focus-visible:ring-2 focus-visible:ring-[#91ad8d]
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
                        border border-[#e5eadd] bg-white p-2
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
                            text-sm text-[#687565]
                            transition-colors
                            hover:bg-[#f0f4eb] hover:text-[#4f7754]
                            focus-visible:bg-[#f0f4eb]
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
              border border-[#e2e9dc] bg-white px-3.5 py-2.5
              text-sm font-bold text-[#526b55]
              transition-colors hover:bg-[#e8efe2]
              focus-visible:outline-none
              focus-visible:ring-2 focus-visible:ring-[#91ad8d]
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
          <div className="border-t border-[#e6ecdf] py-2 lg:hidden">
            {activeCategories.map((category) => {
              const activeChildren = (category.children ?? []).filter(
                (child) => child.is_active !== false,
              );

              const expanded = expandedCategory === category.id;

              return (
                <div
                  key={category.id}
                  className="border-b border-[#edf0e8] last:border-b-0"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      to={`/products?category=${encodeURIComponent(category.slug)}`}
                      onClick={closeMenu}
                      className="
                        flex-1 rounded-xl py-3 text-sm font-medium
                        text-[#526451] transition-colors
                        hover:text-[#4f7754]
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
                          rounded-xl p-2.5 text-[#7b947a]
                          transition-colors hover:bg-[#e8efe2]
                          focus-visible:outline-none
                          focus-visible:ring-2 focus-visible:ring-[#91ad8d]
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
                    <div className="mb-3 mr-2 space-y-1 border-r-2 border-[#c9b6df] pr-3">
                      {activeChildren.map((child) => (
                        <Link
                          key={child.id}
                          to={`/products?category=${encodeURIComponent(child.slug)}`}
                          onClick={closeMenu}
                          className="
                            block rounded-xl px-3 py-2.5
                            text-sm text-[#788174]
                            transition-colors
                            hover:bg-[#eee7f5] hover:text-[#725a91]
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
          </div>
        )}
      </div>
    </nav>
  );
}

export default CategoryMenu;
