import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Filter,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import Layout from "../components/Layout";
import ProductCard from "../components/ProductCard";
import { api } from "../services/api";

interface ProductImage {
  id: number;
  path: string;
  alt?: string | null;
  sort_order: number;
  is_primary: boolean;
}

interface Product {
  id: number;
  name: string;
  slug: string;
  price: number | string;
  compare_price?: number | string | null;
  discount_percent?: number | string;
  stock: number;
  short_description?: string | null;
  thumbnail?: string | null;
  images?: ProductImage[];
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface Brand {
  id: number;
  name: string;
  slug: string;
}

function Products() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);

  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);

  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";
  const brand = searchParams.get("brand") || "";
  const sort = searchParams.get("sort") || "newest";

  const [searchInput, setSearchInput] = useState(search);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const [categoriesResponse, brandsResponse] =
          await Promise.all([
            api.get("/categories"),
            api.get("/brands"),
          ]);

        setCategories(
          categoriesResponse.data?.data?.data ||
            categoriesResponse.data?.data ||
            []
        );

        setBrands(
          brandsResponse.data?.data?.data ||
            brandsResponse.data?.data ||
            []
        );
      } catch (error) {
        console.error(
          "خطا در دریافت فیلترها:",
          error
        );
      }
    };

    fetchFilters();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);

      try {
        const response = await api.get("/products", {
          params: {
            search: search || undefined,
            category: category || undefined,
            brand: brand || undefined,
            sort: sort || undefined,
          },
        });

        const result =
          response.data?.data?.data ||
          response.data?.data ||
          [];

        setProducts(result);
      } catch (error) {
        console.error(
          "خطا در دریافت محصولات:",
          error
        );

        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [search, category, brand, sort]);

  const handleSearch = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const params = new URLSearchParams(
      searchParams
    );

    if (searchInput.trim()) {
      params.set(
        "search",
        searchInput.trim()
      );
    } else {
      params.delete("search");
    }

    setSearchParams(params);
  };

  const handleCategoryChange = (
    value: string
  ) => {
    const params = new URLSearchParams(
      searchParams
    );

    if (value) {
      params.set("category", value);
    } else {
      params.delete("category");
    }

    setSearchParams(params);
  };

  const handleBrandChange = (
    value: string
  ) => {
    const params = new URLSearchParams(
      searchParams
    );

    if (value) {
      params.set("brand", value);
    } else {
      params.delete("brand");
    }

    setSearchParams(params);
  };

  const handleSortChange = (
    value: string
  ) => {
    const params = new URLSearchParams(
      searchParams
    );

    if (value) {
      params.set("sort", value);
    } else {
      params.delete("sort");
    }

    setSearchParams(params);
  };

  const clearFilters = () => {
    setSearchInput("");
    setSearchParams({});
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">

        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-black text-slate-900">
            محصولات
          </h1>

          <p className="mt-2 text-slate-500">
            مشاهده و انتخاب محصولات فروشگاه
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* Filters */}
          <aside className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-slate-200 p-5">

              <button
                type="button"
                onClick={() =>
                  setFilterOpen(!filterOpen)
                }
                className="
                  lg:hidden
                  w-full
                  flex
                  items-center
                  justify-between
                  mb-4
                "
              >
                <span className="font-bold text-slate-900">
                  فیلترها
                </span>

                <SlidersHorizontal size={20} />
              </button>

              <div
                className={
                  filterOpen
                    ? "block"
                    : "hidden lg:block"
                }
              >

                <div className="flex items-center justify-between mb-5">

                  <div className="flex items-center gap-2">

                    <Filter
                      size={20}
                      className="text-blue-600"
                    />

                    <h2 className="font-bold text-slate-900">
                      فیلتر محصولات
                    </h2>

                  </div>

                  <button
                    type="button"
                    onClick={clearFilters}
                    className="
                      text-xs
                      text-blue-600
                      hover:text-blue-700
                    "
                  >
                    حذف فیلترها
                  </button>

                </div>

                {/* Search */}
                <form
                  onSubmit={handleSearch}
                  className="mb-6"
                >
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    جستجو
                  </label>

                  <div className="relative">

                    <input
                      type="text"
                      value={searchInput}
                      onChange={(event) =>
                        setSearchInput(
                          event.target.value
                        )
                      }
                      placeholder="نام محصول..."
                      className="
                        w-full
                        rounded-xl
                        border
                        border-slate-200
                        py-3
                        pr-10
                        pl-3
                        outline-none
                        focus:border-blue-500
                        focus:ring-2
                        focus:ring-blue-100
                      "
                    />

                    <Search
                      size={18}
                      className="
                        absolute
                        right-3
                        top-3.5
                        text-slate-400
                      "
                    />

                  </div>

                  <button
                    type="submit"
                    className="
                      w-full
                      mt-3
                      rounded-xl
                      bg-blue-600
                      text-white
                      py-2.5
                      font-bold
                      hover:bg-blue-700
                      transition
                    "
                  >
                    جستجو
                  </button>
                </form>

                {/* Category */}
                <div className="mb-6">

                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    دسته‌بندی
                  </label>

                  <select
                    value={category}
                    onChange={(event) =>
                      handleCategoryChange(
                        event.target.value
                      )
                    }
                    className="
                      w-full
                      rounded-xl
                      border
                      border-slate-200
                      px-3
                      py-3
                      outline-none
                      focus:border-blue-500
                    "
                  >
                    <option value="">
                      همه دسته‌بندی‌ها
                    </option>

                    {categories.map((item) => (
                      <option
                        key={item.id}
                        value={item.slug}
                      >
                        {item.name}
                      </option>
                    ))}
                  </select>

                </div>

                {/* Brand */}
                <div className="mb-6">

                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    برند
                  </label>

                  <select
                    value={brand}
                    onChange={(event) =>
                      handleBrandChange(
                        event.target.value
                      )
                    }
                    className="
                      w-full
                      rounded-xl
                      border
                      border-slate-200
                      px-3
                      py-3
                      outline-none
                      focus:border-blue-500
                    "
                  >
                    <option value="">
                      همه برندها
                    </option>

                    {brands.map((item) => (
                      <option
                        key={item.id}
                        value={item.slug}
                      >
                        {item.name}
                      </option>
                    ))}
                  </select>

                </div>

              </div>

            </div>
          </aside>

          {/* Products */}
          <main className="lg:col-span-3">

            {/* Toolbar */}
            <div
              className="
                bg-white
                rounded-2xl
                border
                border-slate-200
                p-4
                mb-6
                flex
                flex-col
                md:flex-row
                items-start
                md:items-center
                justify-between
                gap-4
              "
            >

              <div className="text-sm text-slate-500">
                {loading
                  ? "در حال دریافت محصولات..."
                  : `${products.length.toLocaleString(
                      "fa-IR"
                    )} محصول`}
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">

                {sort === "price_asc" ? (
                  <ArrowUpAZ
                    size={18}
                    className="text-slate-500"
                  />
                ) : (
                  <ArrowDownAZ
                    size={18}
                    className="text-slate-500"
                  />
                )}

                <select
                  value={sort}
                  onChange={(event) =>
                    handleSortChange(
                      event.target.value
                    )
                  }
                  className="
                    w-full
                    md:w-auto
                    rounded-xl
                    border
                    border-slate-200
                    px-4
                    py-2.5
                    outline-none
                    focus:border-blue-500
                  "
                >
                  <option value="newest">
                    جدیدترین
                  </option>

                  <option value="price_asc">
                    ارزان‌ترین
                  </option>

                  <option value="price_desc">
                    گران‌ترین
                  </option>

                  <option value="name_asc">
                    نام: الف تا ی
                  </option>

                  <option value="name_desc">
                    نام: ی تا الف
                  </option>
                </select>

              </div>

            </div>

            {/* Loading */}
            {loading ? (
              <div
                className="
                  grid
                  grid-cols-1
                  sm:grid-cols-2
                  xl:grid-cols-3
                  gap-5
                "
              >
                {Array.from({ length: 6 }).map(
                  (_, index) => (
                    <div
                      key={index}
                      className="
                        bg-white
                        rounded-2xl
                        border
                        border-slate-200
                        overflow-hidden
                        animate-pulse
                      "
                    >
                      <div className="h-56 bg-slate-100" />

                      <div className="p-5">

                        <div className="h-5 bg-slate-100 rounded mb-3" />

                        <div className="h-4 bg-slate-100 rounded mb-5 w-2/3" />

                        <div className="h-10 bg-slate-100 rounded" />

                      </div>
                    </div>
                  )
                )}
              </div>

            ) : products.length === 0 ? (

              /* Empty */
              <div
                className="
                  bg-white
                  rounded-2xl
                  border
                  border-slate-200
                  p-12
                  text-center
                "
              >

                <div className="text-slate-400 mb-4">

                  <Search
                    size={48}
                    className="mx-auto"
                  />

                </div>

                <h2 className="text-xl font-bold text-slate-800 mb-2">
                  محصولی پیدا نشد
                </h2>

                <p className="text-slate-500 mb-5">
                  فیلترها یا عبارت جستجو را تغییر دهید.
                </p>

                <button
                  type="button"
                  onClick={clearFilters}
                  className="
                    inline-flex
                    items-center
                    justify-center
                    rounded-xl
                    bg-blue-600
                    text-white
                    px-5
                    py-3
                    font-bold
                    hover:bg-blue-700
                    transition
                  "
                >
                  نمایش همه محصولات
                </button>

              </div>

            ) : (

              /* Product Grid */
              <div
                className="
                  grid
                  grid-cols-1
                  sm:grid-cols-2
                  xl:grid-cols-3
                  gap-5
                "
              >
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                  />
                ))}
              </div>

            )}

          </main>

        </div>

      </div>
    </Layout>
  );
}

export default Products;