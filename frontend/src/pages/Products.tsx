import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronDown,
  Filter,
  Heart,
  Loader2,
  Search,
  SlidersHorizontal,
  Tag,
  X,
} from "lucide-react";

import Layout from "../components/Layout";
import { api } from "../services/api";
import { getStorageUrl } from "../utils/images";
import { calculateProductPrice } from "../utils/price";

interface ProductImage {
  id: number;
  path: string;
  alt?: string | null;
  sort_order?: number;
  is_primary?: boolean;
}

interface Product {
  id: number;
  name: string;
  slug: string;
  price: string | number;
  compare_price?: string | number | null;
  discount_percent?: string | number;
  stock: number;
  short_description?: string | null;
  description?: string | null;
  thumbnail?: string | null;
  images?: ProductImage[];
  category?: {
    id: number;
    name: string;
    slug: string;
  } | null;
  brand?: {
    id: number;
    name: string;
    slug: string;
  } | null;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  products_count?: number;
  children?: Category[];
}

function normalizeSearch(value: string) {
  return value
    .toLowerCase()
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u200c\u200d\u200e\u200f\uFEFF]/g, "")
    .replace(/ـ/g, "")
    .replace(/\s+/g, "")
    .trim();
}

/**
 * همهٔ اسلاگ‌های یک دسته را برمی‌گرداند؛ برای دستهٔ والد زیرمجموعه‌ها هم
 * اضافه می‌شوند تا با کلیک روی دستهٔ والد، محصولات زیرمجموعه‌ها هم دیده شوند.
 */
function collectCategorySlugs(categories: Category[], value: string): string[] {
  if (!value) {
    return [];
  }

  const matches = (category: Category) =>
    category.slug === value || String(category.id) === value;

  const slugs = new Set<string>();

  const addWithChildren = (category: Category) => {
    slugs.add(category.slug);
    (category.children ?? []).forEach(addWithChildren);
  };

  categories.forEach((category) => {
    if (matches(category)) {
      addWithChildren(category);
      return;
    }

    (category.children ?? []).forEach((child) => {
      if (matches(child)) {
        addWithChildren(child);
      }
    });
  });

  if (slugs.size === 0) {
    slugs.add(value);
  }

  return Array.from(slugs);
}

function getProductImage(product: Product) {
  const primaryImage =
    product.images?.find((image) => image.is_primary) ??
    [...(product.images ?? [])].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
    )[0];

  if (primaryImage?.path) {
    return getStorageUrl(primaryImage.path);
  }

  if (product.thumbnail) {
    return getStorageUrl(product.thumbnail);
  }

  return null;
}

function ProductImageBox({ product }: { product: Product }) {
  const imageUrl = getProductImage(product);

  return (
    <div className="group/image relative flex h-36 items-center justify-center overflow-hidden rounded-2xl bg-slate-50 sm:h-52 lg:h-56">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={product.name}
          className="h-full w-full object-contain p-3 transition-transform duration-500 ease-out group-hover:scale-105 sm:p-4"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-slate-300">
          <Tag size={36} />
          <span className="mt-2 text-xs">تصویر محصول</span>
        </div>
      )}

      {Number(product.discount_percent ?? 0) > 0 && (
        <div className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-lg bg-rose-500 px-2 py-1 text-[10px] font-black text-white shadow-sm sm:right-3 sm:top-3 sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-xs">
          <Tag size={12} />
          {Number(product.discount_percent)}٪ تخفیف
        </div>
      )}

      {product.stock <= 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
          <span className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white sm:px-4 sm:text-sm">
            ناموجود
          </span>
        </div>
      )}
    </div>
  );
}

function ProductPrice({ product }: { product: Product }) {
  const {
    originalPrice,
    discountPercent,
    discountAmount,
    finalPrice,
    hasDiscount,
  } = calculateProductPrice(product.price, product.discount_percent);

  return (
    <div
      className="mt-3"
      style={{
        direction: "ltr",
        textAlign: "left",
      }}
    >
      {hasDiscount ? (
        <>
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-lg bg-rose-50 px-2 py-1 text-[10px] font-black text-rose-600 sm:text-xs">
              {discountPercent}٪
            </span>
            <span className="text-xs text-slate-400 line-through sm:text-sm">
              {originalPrice.toLocaleString("fa-IR")} تومان
            </span>
          </div>

          <div className="text-base font-black text-slate-900 sm:text-xl">
            {finalPrice.toLocaleString("fa-IR")} تومان
          </div>

          <div className="mt-1 text-[10px] font-medium text-emerald-600 sm:text-xs">
            صرفه‌جویی {discountAmount.toLocaleString("fa-IR")} تومان
          </div>
        </>
      ) : (
        <>
          <div className="text-base font-black text-slate-900 sm:text-xl">
            {originalPrice.toLocaleString("fa-IR")} تومان
          </div>

          {product.compare_price &&
            Number(product.compare_price) > originalPrice && (
              <div className="mt-1 text-xs text-slate-400 line-through sm:text-sm">
                {Number(product.compare_price).toLocaleString("fa-IR")} تومان
              </div>
            )}
        </>
      )}
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const [favorite, setFavorite] = useState(false);

  return (
    <Link
      to={`/product/${product.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#cbdcc9] hover:shadow-lg sm:rounded-3xl"
    >
      <div className="flex h-full flex-1 flex-col p-2 sm:p-3">
        <div className="relative shrink-0">
          <ProductImageBox product={product} />

          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setFavorite((value) => !value);
            }}
            className={`absolute left-2 top-2 flex h-8 w-8 items-center justify-center rounded-xl border backdrop-blur-sm transition-all sm:left-3 sm:top-3 sm:h-9 sm:w-9 ${
              favorite
                ? "border-[#d9e6d5] bg-[#e8efe2] text-[#537653]"
                : "border-white bg-white/90 text-slate-400 hover:border-[#d9e6d5] hover:text-[#537653]"
            }`}
            aria-label="افزودن به علاقه‌مندی‌ها"
          >
            <Heart size={16} fill={favorite ? "currentColor" : "none"} />
          </button>
        </div>

        <div className="flex flex-1 flex-col px-1 pt-3">
          <div className="mb-1 h-4">
            {product.category?.name && (
              <div className="line-clamp-1 text-[10px] font-bold text-[#537653] sm:text-xs">
                {product.category.name}
              </div>
            )}
          </div>

          <h3 className="line-clamp-2 h-10 overflow-hidden text-sm font-black leading-5 text-slate-900 transition-colors group-hover:text-[#385e3e] sm:h-12 sm:text-base sm:leading-6">
            {product.name}
          </h3>

          <div className="mt-1 h-8 overflow-hidden sm:h-10">
            {product.short_description && (
              <p className="line-clamp-2 text-[10px] leading-4 text-slate-500 sm:text-xs sm:leading-5">
                {product.short_description}
              </p>
            )}
          </div>

          <div className="h-[76px] shrink-0 pt-1 sm:h-[84px]">
            <ProductPrice product={product} />
          </div>

          <div className="mt-2 flex h-5 shrink-0 items-center justify-between gap-1 text-[10px] sm:text-xs">
            {product.stock > 0 ? (
              <>
                <span className="font-bold text-emerald-600">
                  موجود در انبار
                </span>
                <span className="text-slate-400">
                  {product.stock.toLocaleString("fa-IR")} عدد
                </span>
              </>
            ) : (
              <span className="font-bold text-rose-500">فعلاً ناموجود</span>
            )}
          </div>

          <div className="mt-auto pt-2">
            <div className="group/button flex h-9 items-center justify-between gap-2 rounded-xl bg-[#e8efe2] px-2 py-2 transition-colors hover:bg-[#4f7353] sm:h-10 sm:px-3">
              <span className="text-xs font-bold text-[#385e3e] transition-colors group-hover/button:text-white sm:text-sm">
                مشاهده محصول
              </span>
              <ArrowLeft
                size={15}
                className="shrink-0 text-[#648767] transition-all group-hover/button:-translate-x-1 group-hover/button:text-white sm:size-[16px]"
              />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function Products() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [sort, setSort] = useState(searchParams.get("sort") ?? "newest");
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get("category") ?? "",
  );

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const urlCategory = searchParams.get("category") ?? "";
  const urlSearch = searchParams.get("search") ?? "";

  // لینک‌های منو/دسته‌بندی وقتی همین صفحه باز است فقط query string را عوض
  // می‌کنند و کامپوننت دوباره mount نمی‌شود؛ پس باید state را با آدرس همگام
  // کرد تا با کلیک روی دستهٔ دیگر، محتوا هم عوض شود.
  useEffect(() => {
    setSelectedCategory((current) =>
      current === urlCategory ? current : urlCategory,
    );
  }, [urlCategory]);

  useEffect(() => {
    setSearch((current) => (current.trim() === urlSearch ? current : urlSearch));
  }, [urlSearch]);

  useEffect(() => {
    let cancelled = false;

    const loadCategories = async () => {
      setCategoriesLoading(true);

      try {
        const response = await api.get("/categories");

        const result =
          response.data?.data?.data ??
          response.data?.data ??
          response.data?.categories ??
          response.data ??
          [];

        if (!cancelled) {
          setCategories(Array.isArray(result) ? result : []);
        }
      } catch (error) {
        console.error("Categories error:", error);

        if (!cancelled) {
          setCategories([]);
        }
      } finally {
        if (!cancelled) {
          setCategoriesLoading(false);
        }
      }
    };

    loadCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadProducts = async () => {
      setLoading(true);
      setError("");

      try {
        const params: Record<string, string> = {};

        if (search.trim()) {
          params.search = search.trim();
        }

        if (selectedCategory) {
          params.category = selectedCategory;
        }

        // مرتب‌سازی در این صفحه سمت مرورگر انجام می‌شود.
        // بنابراین مقدار sort را به API ارسال نمی‌کنیم.

        const response = await api.get("/products", {
          params,
        });

        const result =
          response.data?.data?.data ??
          response.data?.data ??
          response.data?.products ??
          response.data ??
          [];

        if (!Array.isArray(result)) {
          throw new Error("ساختار پاسخ محصولات معتبر نیست.");
        }

        if (!cancelled) {
          setProducts(result);
        }
      } catch (error: any) {
        console.error("Products error:", error);

        if (!cancelled) {
          setProducts([]);
          setError(
            error?.response?.data?.message ??
              error?.message ??
              "دریافت محصولات با خطا مواجه شد.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    const timer = window.setTimeout(loadProducts, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [search, selectedCategory]);

  useEffect(() => {
    const params = new URLSearchParams();

    if (search.trim()) {
      params.set("search", search.trim());
    }

    if (selectedCategory) {
      params.set("category", selectedCategory);
    }

    if (sort && sort !== "newest") {
      params.set("sort", sort);
    }

    setSearchParams(params, { replace: true });
  }, [search, selectedCategory, sort, setSearchParams]);

  const categorySlugs = useMemo(
    () => collectCategorySlugs(categories, selectedCategory),
    [categories, selectedCategory],
  );

  const filteredProducts = useMemo(() => {
    let result = [...products];

    const query = normalizeSearch(search);

    if (query) {
      result = result.filter((product) => {
        const searchableText = normalizeSearch(
          [
            product.name,
            product.short_description ?? "",
            product.description ?? "",
            product.category?.name ?? "",
            product.brand?.name ?? "",
          ].join(" "),
        );

        return searchableText.includes(query);
      });
    }

    if (selectedCategory) {
      const allowedSlugs = new Set(categorySlugs);

      result = result.filter((product) =>
        product.category ? allowedSlugs.has(product.category.slug) : false,
      );
    }

    switch (sort) {
      case "price-low":
        result.sort(
          (a, b) =>
            calculateProductPrice(a.price, a.discount_percent).finalPrice -
            calculateProductPrice(b.price, b.discount_percent).finalPrice,
        );
        break;

      case "price-high":
        result.sort(
          (a, b) =>
            calculateProductPrice(b.price, b.discount_percent).finalPrice -
            calculateProductPrice(a.price, a.discount_percent).finalPrice,
        );
        break;

      case "discount":
        result.sort(
          (a, b) =>
            Number(b.discount_percent ?? 0) - Number(a.discount_percent ?? 0),
        );
        break;

      case "newest":
      default:
        break;
    }

    return result;
  }, [products, search, selectedCategory, categorySlugs, sort]);

  const selectedCategoryName = useMemo(() => {
    if (!selectedCategory) {
      return null;
    }

    const matches = (category: Category) =>
      category.slug === selectedCategory ||
      category.id.toString() === selectedCategory;

    for (const category of categories) {
      if (matches(category)) {
        return category.name;
      }

      const child = (category.children ?? []).find(matches);

      if (child) {
        return child.name;
      }
    }

    return null;
  }, [categories, selectedCategory]);

  const clearFilters = () => {
    setSearch("");
    setSelectedCategory("");
    setSort("newest");
  };

  const hasFilters =
    search.trim() !== "" || selectedCategory !== "" || sort !== "newest";

  return (
    <Layout>
      <main className="min-h-screen bg-slate-50">
        <section className="border-b border-slate-100 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#e8efe2] px-4 py-2 text-xs font-black text-[#537653]">
                  <Tag size={14} />
                  کالکشن زنانه و ورزشی
                </div>

                <h1 className="text-3xl font-black text-slate-900 sm:text-4xl">
                  فروشگاه محصولات
                </h1>

                <p className="mt-3 max-w-2xl leading-7 text-slate-500">
                  لباس‌های زنانه، لباس زیر، پوشاک ورزشی و محصولات منتخب برای
                  استایل روزمره و فعالیت‌های ورزشی.
                </p>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-400">
                  {filteredProducts.length.toLocaleString("fa-IR")}
                </span>
                <span className="font-bold text-slate-700">محصول</span>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <div className="flex flex-col gap-6 lg:flex-row">
            <aside className="hidden w-64 flex-shrink-0 lg:block">
              <div className="sticky top-6 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8efe2] text-[#537653]">
                    <SlidersHorizontal size={19} />
                  </div>

                  <div>
                    <h2 className="font-black">فیلتر محصولات</h2>
                    <p className="mt-1 text-xs text-slate-400">انتخاب سریع</p>
                  </div>
                </div>

                <div className="pt-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-black">دسته‌بندی</h3>

                    {selectedCategory && (
                      <button
                        type="button"
                        onClick={() => setSelectedCategory("")}
                        className="text-xs font-bold text-[#537653] hover:text-[#385e3e]"
                      >
                        حذف
                      </button>
                    )}
                  </div>

                  {categoriesLoading ? (
                    <div className="flex items-center justify-center py-5">
                      <Loader2
                        size={20}
                        className="animate-spin text-[#537653]"
                      />
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedCategory("")}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-right text-sm font-bold transition ${
                          !selectedCategory
                            ? "bg-[#e8efe2] text-[#385e3e]"
                            : "text-slate-600 hover:bg-[#e8efe2] hover:text-[#385e3e]"
                        }`}
                      >
                        <span>همه محصولات</span>
                      </button>

                      {categories.map((category) => (
                        <button
                          key={category.id}
                          type="button"
                          onClick={() => setSelectedCategory(category.slug)}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-right text-sm font-bold transition ${
                            selectedCategory === category.slug
                              ? "bg-[#e8efe2] text-[#385e3e]"
                              : "text-slate-600 hover:bg-[#e8efe2] hover:text-[#385e3e]"
                          }`}
                        >
                          <span>{category.name}</span>

                          {category.products_count !== undefined && (
                            <span className="text-xs text-slate-400">
                              {category.products_count.toLocaleString("fa-IR")}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-6 border-t border-slate-100 pt-5">
                  <h3 className="mb-3 text-sm font-black">مرتب‌سازی</h3>

                  <div className="space-y-1.5">
                    {[
                      ["newest", "جدیدترین"],
                      ["price-low", "ارزان‌ترین"],
                      ["price-high", "گران‌ترین"],
                      ["discount", "بیشترین تخفیف"],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setSort(value)}
                        className={`w-full rounded-xl px-3 py-2.5 text-right text-sm font-bold transition ${
                          sort === value
                            ? "bg-[#648767] text-white"
                            : "text-slate-600 hover:bg-[#e8efe2] hover:text-[#385e3e]"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {hasFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-6 w-full rounded-xl bg-rose-50 py-3 text-sm font-bold text-rose-600 transition hover:bg-rose-100"
                  >
                    پاک کردن همه فیلترها
                  </button>
                )}
              </div>
            </aside>

            <div className="min-w-0 flex-1">
              <div className="mb-6 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative flex-1">
                    <Search
                      size={19}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="text"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="جستجوی محصول..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-10 pr-11 text-sm outline-none transition focus:border-[#648767] focus:bg-white focus:ring-4 focus:ring-[#e8efe2]"
                    />

                    {search && (
                      <button
                        type="button"
                        onClick={() => setSearch("")}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-[#537653]"
                      >
                        <X size={17} />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setMobileFiltersOpen((value) => !value)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#648767] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#385e3e] lg:hidden"
                  >
                    <Filter size={18} />
                    فیلتر و مرتب‌سازی
                  </button>

                  <div className="relative hidden min-w-[190px] sm:block">
                    <select
                      value={sort}
                      onChange={(event) => setSort(event.target.value)}
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3.5 pl-10 text-sm font-bold outline-none transition focus:border-[#648767]"
                    >
                      <option value="newest">جدیدترین</option>
                      <option value="price-low">ارزان‌ترین</option>
                      <option value="price-high">گران‌ترین</option>
                      <option value="discount">بیشترین تخفیف</option>
                    </select>

                    <ChevronDown
                      size={17}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                  </div>
                </div>

                {mobileFiltersOpen && (
                  <div className="mt-4 border-t border-slate-100 pt-4 lg:hidden">
                    <div className="mb-4">
                      <h3 className="mb-3 text-sm font-black">دسته‌بندی</h3>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedCategory("")}
                          className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                            !selectedCategory
                              ? "bg-[#648767] text-white"
                              : "bg-slate-50 text-slate-600 hover:bg-[#e8efe2] hover:text-[#385e3e]"
                          }`}
                        >
                          همه
                        </button>

                        {categories.map((category) => (
                          <button
                            key={category.id}
                            type="button"
                            onClick={() => setSelectedCategory(category.slug)}
                            className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                              selectedCategory === category.slug
                                ? "bg-[#648767] text-white"
                                : "bg-slate-50 text-slate-600 hover:bg-[#e8efe2] hover:text-[#385e3e]"
                            }`}
                          >
                            {category.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="mb-3 text-sm font-black">مرتب‌سازی</h3>

                      <div className="grid grid-cols-2 gap-2">
                        {[
                          ["newest", "جدیدترین"],
                          ["price-low", "ارزان‌ترین"],
                          ["price-high", "گران‌ترین"],
                          ["discount", "بیشترین تخفیف"],
                        ].map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setSort(value)}
                            className={`rounded-xl px-3 py-2.5 text-xs font-bold transition ${
                              sort === value
                                ? "bg-[#648767] text-white"
                                : "bg-slate-50 text-slate-600 hover:bg-[#e8efe2] hover:text-[#385e3e]"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {selectedCategoryName && (
                <div className="mb-5 flex items-center gap-2">
                  <span className="text-sm text-slate-400">دسته‌بندی:</span>

                  <button
                    type="button"
                    onClick={() => setSelectedCategory("")}
                    className="inline-flex items-center gap-2 rounded-full bg-[#e8efe2] px-3 py-1.5 text-xs font-bold text-[#385e3e] transition hover:bg-[#dce8d6]"
                  >
                    {selectedCategoryName}
                    <X size={13} />
                  </button>
                </div>
              )}

              {loading && (
                <div className="rounded-3xl border border-slate-100 bg-white py-20 text-center shadow-sm">
                  <Loader2
                    size={38}
                    className="mx-auto animate-spin text-[#537653]"
                  />
                  <p className="mt-4 font-medium text-slate-500">
                    در حال دریافت محصولات...
                  </p>
                </div>
              )}

              {!loading && error && (
                <div className="rounded-3xl border border-rose-100 bg-white p-8 text-center shadow-sm">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
                    <X size={26} />
                  </div>

                  <h2 className="mt-5 text-lg font-black">
                    دریافت محصولات انجام نشد
                  </h2>

                  <p className="mt-2 text-sm text-slate-500">{error}</p>

                  <button
                    type="button"
                    onClick={() => {
                      setSearch((value) => `${value} `);
                    }}
                    className="mt-5 inline-flex items-center justify-center rounded-xl bg-[#648767] px-6 py-3 font-bold text-white transition hover:bg-[#385e3e]"
                  >
                    تلاش مجدد
                  </button>
                </div>
              )}

              {!loading && !error && filteredProducts.length === 0 && (
                <div className="rounded-3xl border border-slate-100 bg-white px-6 py-16 text-center shadow-sm">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e8efe2] text-[#9aaf96]">
                    <Search size={30} />
                  </div>

                  <h2 className="mt-5 text-xl font-black">محصولی پیدا نشد</h2>

                  <p className="mt-2 text-slate-500">
                    عبارت جستجو یا فیلترهای انتخاب‌شده را تغییر دهید.
                  </p>

                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-5 inline-flex items-center justify-center rounded-xl bg-[#648767] px-6 py-3 font-bold text-white transition hover:bg-[#385e3e]"
                  >
                    پاک کردن فیلترها
                  </button>
                </div>
              )}

              {!loading && !error && filteredProducts.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3">
                  {filteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}

              {!loading && !error && filteredProducts.length > 0 && (
                <div className="mt-8 flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-5 py-4 sm:flex-row">
                  <p className="text-sm text-slate-500">
                    نمایش{" "}
                    <span className="font-black text-slate-800">
                      {filteredProducts.length.toLocaleString("fa-IR")}
                    </span>{" "}
                    محصول
                  </p>

                  <Link
                    to="/"
                    className="inline-flex items-center gap-2 text-sm font-bold text-[#537653] transition hover:text-[#385e3e]"
                  >
                    بازگشت به فروشگاه
                    <ArrowLeft size={16} />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
}

export default Products;
