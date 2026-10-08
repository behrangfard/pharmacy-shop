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
import { ButtonLink } from "../components/Button";
import { api } from "../services/api";
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
}

function getStorageUrl(path?: string | null) {
  if (!path) {
    return null;
  }

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const cleanPath = path.replace(/^\/+/, "");

  return `http://127.0.0.1:8000/storage/${cleanPath}`;
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
    <div className="relative h-64 sm:h-72 rounded-2xl bg-slate-50 overflow-hidden flex items-center justify-center">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={product.name}
          className="w-full h-full object-contain p-4 transition-transform duration-500 ease-out group-hover:scale-105"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-slate-300">
          {" "}
          <Tag size={42} />{" "}
          <span className="text-sm mt-3">تصویر محصول</span>{" "}
        </div>
      )}

      {Number(product.discount_percent ?? 0) > 0 && (
        <div className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-xl bg-rose-500 text-white px-3 py-1.5 text-xs font-black shadow-sm">
          <Tag size={13} />
          {Number(product.discount_percent)}٪ تخفیف
        </div>
      )}

      {product.stock <= 0 && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
          <span className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-bold">
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
      className="mt-5"
      style={{
        direction: "ltr",
        textAlign: "left",
      }}
    >
      {hasDiscount ? (
        <>
          {" "}
          <div className="flex items-center gap-2 mb-2">
            {" "}
            <span className="inline-flex items-center rounded-lg bg-rose-50 text-rose-600 px-2 py-1 text-xs font-black">
              {discountPercent}٪{" "}
            </span>
            <span className="text-sm text-slate-400 line-through">
              {originalPrice.toLocaleString("fa-IR")} تومان
            </span>
          </div>
          <div className="text-xl font-black text-slate-900">
            {finalPrice.toLocaleString("fa-IR")} تومان
          </div>
          <div className="text-xs font-medium text-emerald-600 mt-1">
            صرفه‌جویی {discountAmount.toLocaleString("fa-IR")} تومان
          </div>
        </>
      ) : (
        <>
          <div className="text-xl font-black text-slate-900">
            {originalPrice.toLocaleString("fa-IR")} تومان
          </div>

          {product.compare_price &&
            Number(product.compare_price) > originalPrice && (
              <div className="text-sm text-slate-400 line-through mt-1">
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
      className="group block bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-pink-200 transition-all duration-300"
    >
      {" "}
      <div className="p-3 sm:p-4">
        {" "}
        <div className="relative">
          {" "}
          <ProductImageBox product={product} />
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setFavorite((value) => !value);
            }}
            className={`absolute top-3 left-3 w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-sm border transition-all ${
              favorite
                ? "bg-pink-50 text-pink-600 border-pink-100"
                : "bg-white/90 text-slate-400 border-white hover:text-pink-600 hover:border-pink-100"
            }`}
            aria-label="افزودن به علاقه‌مندی‌ها"
          >
            <Heart size={18} fill={favorite ? "currentColor" : "none"} />
          </button>
        </div>
        <div className="px-1 pt-4">
          {product.category?.name && (
            <div className="text-xs font-bold text-pink-500 mb-2">
              {product.category.name}
            </div>
          )}

          <h3 className="font-black text-slate-900 leading-7 line-clamp-2 min-h-[56px] group-hover:text-pink-600 transition-colors">
            {product.name}
          </h3>

          {product.short_description && (
            <p className="text-sm text-slate-500 mt-2 leading-6 line-clamp-2 min-h-[48px]">
              {product.short_description}
            </p>
          )}

          <ProductPrice product={product} />

          <div className="mt-5">
            {product.stock > 0 ? (
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-600 font-bold">
                  موجود در انبار
                </span>

                <span className="text-slate-400">
                  {product.stock.toLocaleString("fa-IR")} عدد
                </span>
              </div>
            ) : (
              <div className="text-xs font-bold text-rose-500">
                فعلاً ناموجود
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 group-hover:bg-pink-50 px-4 py-3 transition-colors">
            <span className="text-sm font-bold text-slate-600 group-hover:text-pink-600 transition-colors">
              مشاهده محصول
            </span>

            <ArrowLeft
              size={17}
              className="text-slate-400 group-hover:text-pink-600 group-hover:-translate-x-1 transition-all"
            />
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

  useEffect(() => {
    const loadCategories = async () => {
      setCategoriesLoading(true);

      try {
        const response = await api.get("/categories");

        const result =
          response.data?.data ??
          response.data?.categories ??
          response.data ??
          [];

        setCategories(Array.isArray(result) ? result : []);
      } catch (error) {
        console.error("Categories error:", error);
        setCategories([]);
      } finally {
        setCategoriesLoading(false);
      }
    };

    loadCategories();
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("/products");

        const result =
          response.data?.data?.data ??
          response.data?.data ??
          response.data?.products ??
          response.data ??
          [];

        if (!Array.isArray(result)) {
          setProducts([]);
          setError("اطلاعات محصولات در قالب صحیح دریافت نشد.");
          return;
        }

        setProducts(result);
      } catch (error: any) {
        console.error("Products error:", error);

        setProducts([]);

        setError(
          error?.response?.data?.message ?? "دریافت محصولات با خطا مواجه شد.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

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

  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (search.trim()) {
      const query = search.trim().toLowerCase();

      result = result.filter((product) => {
        return (
          product.name.toLowerCase().includes(query) ||
          product.short_description?.toLowerCase().includes(query) ||
          product.category?.name?.toLowerCase().includes(query) ||
          product.brand?.name?.toLowerCase().includes(query)
        );
      });
    }

    if (selectedCategory) {
      result = result.filter((product) => {
        return (
          product.category?.slug === selectedCategory ||
          product.category?.id?.toString() === selectedCategory
        );
      });
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
  }, [products, search, selectedCategory, sort]);

  const selectedCategoryName = useMemo(() => {
    if (!selectedCategory) {
      return null;
    }

    return (
      categories.find(
        (category) =>
          category.slug === selectedCategory ||
          category.id.toString() === selectedCategory,
      )?.name ?? null
    );
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
      {" "}
      <main className="bg-slate-50 min-h-screen">
        {" "}
        <section className="bg-white border-b border-slate-100">
          {" "}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
            {" "}
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              {" "}
              <div>
                {" "}
                <div className="inline-flex items-center gap-2 rounded-full bg-pink-50 text-pink-600 px-4 py-2 text-xs font-black mb-4">
                  {" "}
                  <Tag size={14} />
                  کالکشن زنانه و ورزشی{" "}
                </div>
                <h1 className="text-3xl sm:text-4xl font-black text-slate-900">
                  فروشگاه محصولات
                </h1>
                <p className="text-slate-500 mt-3 max-w-2xl leading-7">
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col lg:flex-row gap-6">
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 sticky top-6">
                <div className="flex items-center gap-3 pb-5 border-b border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center">
                    <SlidersHorizontal size={19} />
                  </div>

                  <div>
                    <h2 className="font-black">فیلتر محصولات</h2>

                    <p className="text-xs text-slate-400 mt-1">انتخاب سریع</p>
                  </div>
                </div>

                <div className="pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-black text-sm">دسته‌بندی</h3>

                    {selectedCategory && (
                      <button
                        type="button"
                        onClick={() => setSelectedCategory("")}
                        className="text-xs text-pink-600 font-bold"
                      >
                        حذف
                      </button>
                    )}
                  </div>

                  {categoriesLoading ? (
                    <div className="flex items-center justify-center py-5">
                      <Loader2
                        size={20}
                        className="animate-spin text-pink-500"
                      />
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedCategory("")}
                        className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-bold text-right transition ${
                          !selectedCategory
                            ? "bg-pink-50 text-pink-600"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <span>همه محصولات</span>
                      </button>

                      {categories.map((category) => (
                        <button
                          key={category.id}
                          type="button"
                          onClick={() => setSelectedCategory(category.slug)}
                          className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-bold text-right transition ${
                            selectedCategory === category.slug
                              ? "bg-pink-50 text-pink-600"
                              : "text-slate-600 hover:bg-slate-50"
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

                <div className="mt-6 pt-5 border-t border-slate-100">
                  <h3 className="font-black text-sm mb-3">مرتب‌سازی</h3>

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
                        className={`w-full text-right rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                          sort === value
                            ? "bg-slate-900 text-white"
                            : "text-slate-600 hover:bg-slate-50"
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
                    className="w-full mt-6 rounded-xl bg-rose-50 text-rose-600 py-3 text-sm font-bold hover:bg-rose-100 transition"
                  >
                    پاک کردن همه فیلترها
                  </button>
                )}
              </div>
            </aside>

            <div className="flex-1 min-w-0">
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 sm:p-5 mb-6">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search
                      size={19}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="text"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="جستجوی لباس، لباس زیر، پوشاک ورزشی..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 pr-11 pl-10 py-3.5 text-sm outline-none focus:bg-white focus:border-pink-400 focus:ring-4 focus:ring-pink-50 transition"
                    />

                    {search && (
                      <button
                        type="button"
                        onClick={() => setSearch("")}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      >
                        <X size={17} />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setMobileFiltersOpen((value) => !value)}
                    className="lg:hidden inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 text-white px-5 py-3.5 text-sm font-bold"
                  >
                    <Filter size={18} />
                    فیلتر و مرتب‌سازی
                  </button>

                  <div className="hidden sm:block relative min-w-[190px]">
                    <select
                      value={sort}
                      onChange={(event) => setSort(event.target.value)}
                      className="appearance-none w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 pl-10 text-sm font-bold outline-none focus:border-pink-400"
                    >
                      <option value="newest">جدیدترین</option>
                      <option value="price-low">ارزان‌ترین</option>
                      <option value="price-high">گران‌ترین</option>
                      <option value="discount">بیشترین تخفیف</option>
                    </select>

                    <ChevronDown
                      size={17}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                  </div>
                </div>

                {mobileFiltersOpen && (
                  <div className="lg:hidden mt-4 pt-4 border-t border-slate-100">
                    <div className="mb-4">
                      <h3 className="font-black text-sm mb-3">دسته‌بندی</h3>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedCategory("")}
                          className={`rounded-xl px-3 py-2 text-xs font-bold ${
                            !selectedCategory
                              ? "bg-pink-600 text-white"
                              : "bg-slate-50 text-slate-600"
                          }`}
                        >
                          همه
                        </button>

                        {categories.map((category) => (
                          <button
                            key={category.id}
                            type="button"
                            onClick={() => setSelectedCategory(category.slug)}
                            className={`rounded-xl px-3 py-2 text-xs font-bold ${
                              selectedCategory === category.slug
                                ? "bg-pink-600 text-white"
                                : "bg-slate-50 text-slate-600"
                            }`}
                          >
                            {category.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-black text-sm mb-3">مرتب‌سازی</h3>

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
                            className={`rounded-xl px-3 py-2.5 text-xs font-bold ${
                              sort === value
                                ? "bg-slate-900 text-white"
                                : "bg-slate-50 text-slate-600"
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
                <div className="flex items-center gap-2 mb-5">
                  <span className="text-sm text-slate-400">دسته‌بندی:</span>

                  <button
                    type="button"
                    onClick={() => setSelectedCategory("")}
                    className="inline-flex items-center gap-2 rounded-full bg-pink-50 text-pink-600 px-3 py-1.5 text-xs font-bold"
                  >
                    {selectedCategoryName}
                    <X size={13} />
                  </button>
                </div>
              )}

              {loading && (
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm py-20 text-center">
                  <Loader2
                    size={38}
                    className="mx-auto animate-spin text-pink-600"
                  />

                  <p className="mt-4 text-slate-500 font-medium">
                    در حال دریافت محصولات...
                  </p>
                </div>
              )}

              {!loading && error && (
                <div className="bg-white rounded-3xl border border-rose-100 shadow-sm p-8 text-center">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center">
                    <X size={26} />
                  </div>

                  <h2 className="font-black text-lg mt-5">
                    دریافت محصولات انجام نشد
                  </h2>

                  <p className="text-sm text-slate-500 mt-2">{error}</p>

                  <Link
                    to="/products"
                    className="inline-flex items-center justify-center mt-5 rounded-xl bg-pink-600 text-white px-6 py-3 font-bold hover:bg-pink-700 transition"
                  >
                    تلاش مجدد
                  </Link>
                </div>
              )}

              {!loading && !error && filteredProducts.length === 0 && (
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm py-16 px-6 text-center">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-50 text-slate-300 flex items-center justify-center">
                    <Search size={30} />
                  </div>

                  <h2 className="font-black text-xl mt-5">محصولی پیدا نشد</h2>

                  <p className="text-slate-500 mt-2">
                    عبارت جستجو یا فیلترهای انتخاب‌شده را تغییر دهید.
                  </p>

                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-5 inline-flex items-center justify-center rounded-xl bg-pink-600 text-white px-6 py-3 font-bold hover:bg-pink-700 transition"
                  >
                    پاک کردن فیلترها
                  </button>
                </div>
              )}

              {!loading && !error && filteredProducts.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {filteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}

              {!loading && !error && filteredProducts.length > 0 && (
                <div className="mt-8 bg-white rounded-2xl border border-slate-100 px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <p className="text-sm text-slate-500">
                    نمایش{" "}
                    <span className="font-black text-slate-800">
                      {filteredProducts.length.toLocaleString("fa-IR")}
                    </span>{" "}
                    محصول
                  </p>

                  <Link
                    to="/"
                    className="inline-flex items-center gap-2 text-sm font-bold text-pink-600 hover:text-pink-700"
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
