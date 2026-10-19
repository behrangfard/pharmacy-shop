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
        className="min-h-12 border-b border-gray-100 bg-white lg:min-h-14"
        dir="rtl"
      >
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
          <div className="flex flex-wrap gap-3" aria-hidden="true">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-5 w-20 animate-pulse rounded-md bg-gray-100"
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
      className="relative z-40 border-b border-gray-100 bg-white"
      dir="rtl"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex min-h-12 items-center justify-between py-2 lg:min-h-14">
          <div className="hidden w-full flex-wrap items-center gap-x-6 gap-y-2 lg:flex">
            {activeCategories.map((category) => {
              const activeChildren = (category.children ?? []).filter(
                (child) => child.is_active !== false,
              );

              return (
                <div key={category.id} className="group relative">
                  <Link
                    to={`/products?category=${encodeURIComponent(category.slug)}`}
                    className="inline-flex items-center gap-1 py-2 text-sm font-medium text-gray-700 transition-colors hover:text-blue-600"
                  >
                    {category.name}

                    {activeChildren.length > 0 && (
                      <ChevronDown
                        size={14}
                        aria-hidden="true"
                        className="transition-transform group-hover:rotate-180"
                      />
                    )}
                  </Link>

                  {activeChildren.length > 0 && (
                    <div className="invisible absolute right-0 top-full min-w-48 translate-y-1 rounded-xl border border-gray-100 bg-white p-2 opacity-0 shadow-lg transition-all duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
                      {activeChildren.map((child) => (
                        <Link
                          key={child.id}
                          to={`/products?category=${encodeURIComponent(child.slug)}`}
                          className="block rounded-lg px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-blue-50 hover:text-blue-600"
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

          <button
            type="button"
            aria-label={mobileMenuOpen ? "بستن منو" : "باز کردن منو"}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 lg:hidden"
          >
            {mobileMenuOpen ? <X size={19} /> : <Menu size={19} />}
            دسته‌بندی محصولات
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-gray-100 py-2 lg:hidden">
            {activeCategories.map((category) => {
              const activeChildren = (category.children ?? []).filter(
                (child) => child.is_active !== false,
              );

              const expanded = expandedCategory === category.id;

              return (
                <div
                  key={category.id}
                  className="border-b border-gray-50 last:border-b-0"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      to={`/products?category=${encodeURIComponent(category.slug)}`}
                      onClick={closeMenu}
                      className="flex-1 py-3 text-sm font-medium text-gray-700 hover:text-blue-600"
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
                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-50"
                      >
                        <ChevronDown
                          size={17}
                          className={`transition-transform ${
                            expanded ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                    )}
                  </div>

                  {expanded && activeChildren.length > 0 && (
                    <div className="mb-2 mr-3 border-r-2 border-blue-100 pr-3">
                      {activeChildren.map((child) => (
                        <Link
                          key={child.id}
                          to={`/products?category=${encodeURIComponent(child.slug)}`}
                          onClick={closeMenu}
                          className="block rounded-lg px-3 py-2.5 text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-600"
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
