import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronDown,
  Filter,
  Search,
  SlidersHorizontal,
  Tag,
  X,
} from "lucide-react";

import Layout from "../components/Layout";
import BannerImage from "../components/BannerImage";
import ProductCard from "../components/ProductCard";
import ProductFilterPanel, {
  type FilterFlagKey,
} from "../components/ProductFilterPanel";
import { api } from "../services/api";
import { fetchBrands, getCachedBrands, type StorefrontBrand } from "../services/brands";
import { fetchCategories, getCachedCategories } from "../services/categories";
import {
  fetchProductFilters,
  type ProductFilterFacets,
} from "../services/productFilters";
import {
  bannerTarget,
  bannerViewportClass,
  hasDesktopImage,
  hasMobileImage,
  isExternalBannerLink,
  viewportVisibilityClass,
  type StorefrontBanner,
} from "../utils/banners";
import { usePageMeta } from "../hooks/usePageMeta";
import {
  DEFAULT_BANNER_RADIUS,
  bannerRadiusStyle,
  parseBannerAppearance,
} from "../utils/bannerGrid";
import { NO_INDEX_ROBOTS, SITE_NAME } from "../utils/seo";
import { breadcrumbJsonLd } from "../utils/structuredData";

/** تعداد محصول در هر صفحهٔ فهرست فروشگاه. */
const PRODUCTS_PER_PAGE = 24;

/** نگاشت مرتب‌سازی رابط کاربری به پارامتر API. */
const SORT_PARAM: Record<string, string> = {
  newest: "latest",
  "price-low": "price_asc",
  "price-high": "price_desc",
  popular: "popular",
  discount: "discount",
};

/** گزینه‌های مرتب‌سازی رابط کاربری (مقدار، برچسب). */
const SORT_OPTIONS: [string, string][] = [
  ["newest", "جدیدترین"],
  ["popular", "پرفروش‌ترین"],
  ["price-low", "ارزان‌ترین"],
  ["price-high", "گران‌ترین"],
  ["discount", "بیشترین تخفیف"],
];


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

/**
 * بنر بالای صفحهٔ محصولات (position = products_top)؛ از همان API بنرهای
 * پنل مدیریت خوانده می‌شود و با کلیک به لینک مقصد می‌رود.
 *
 * تصویر دسکتاپ و موبایل کاملاً مستقل‌اند (BannerImage): در دسکتاپ `image` و در
 * موبایل `mobile_image`. بنر بدون تصویرِ یک نما در همان نما نمایش داده نمی‌شود.
 */
function TopBannerCard({
  banner,
  radius,
}: {
  banner: StorefrontBanner;
  /** گردی گوشهٔ کادر بنر (از تنظیم «ظاهر بنرها» در پنل مدیریت). */
  radius: number;
}) {
  const target = bannerTarget(banner);
  const isExternal = isExternalBannerLink(target);

  const content = (
    <>
      <BannerImage
        banner={banner}
        desktopClassName="
          block h-36 w-full object-cover
          transition-transform duration-500 ease-out
          group-hover:scale-[1.02]
          sm:h-44
        "
        mobileClassName="
          block h-40 w-full object-cover
          transition-transform duration-500 ease-out
          group-hover:scale-[1.02]
        "
      />

      <div className="absolute inset-0 bg-gradient-to-l from-black/50 via-black/10 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 p-5 text-white">
        {banner.title && (
          <p className="text-base font-black sm:text-lg">{banner.title}</p>
        )}

        {banner.subtitle && (
          <p className="mt-1 text-xs leading-6 opacity-90">{banner.subtitle}</p>
        )}
      </div>
    </>
  );

  const className = `
    group relative block overflow-hidden shadow-sm
    ${bannerViewportClass(banner)}
  `;
  // گردی گوشهٔ بنر از تنظیم «ظاهر بنرها» می‌آید؛ پس‌زمینهٔ رنگی پشت بنر نیست.
  const radiusStyle = bannerRadiusStyle(radius);

  if (isExternal) {
    return (
      <a href={target} target="_blank" rel="noreferrer" className={className} style={radiusStyle}>
        {content}
      </a>
    );
  }

  return (
    <Link to={target} className={className} style={radiusStyle}>
      {content}
    </Link>
  );
}

/** ورودی قیمت را به عدد صحیح تومان تبدیل می‌کند (ارقام فارسی هم پذیرفته می‌شود). */
function normalizePriceInput(value: string): string {
  const digits = value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/\D/g, "");

  return digits === "" ? "" : String(Number(digits));
}

/** محدوده‌های آمادهٔ قیمت برای انتخاب سریع. */
const PRICE_PRESETS: { label: string; min: string; max: string }[] = [
  { label: "زیر ۲۰۰ هزار", min: "", max: "200000" },
  { label: "۲۰۰ تا ۵۰۰ هزار", min: "200000", max: "500000" },
  { label: "بالای ۵۰۰ هزار", min: "500000", max: "" },
];

/** عدد فیلتر قیمت را با جداکنندهٔ هزارگان فارسی نمایش می‌دهد. */
function formatFilterPrice(value: string): string {
  const amount = Number(value);

  return value !== "" && Number.isFinite(amount)
    ? amount.toLocaleString("fa-IR")
    : value;
}

/**
 * یک مقدار را به لیست فیلترهای چندتایی اضافه یا از آن حذف می‌کند.
 */
function toggleValue(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}


function Products() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  // دسته‌بندی‌ها از کش مشترک (همان کش منوی سایت) خوانده می‌شوند تا در
  // ورود به این صفحه هم درخواست تکراری زده نشود.
  const [categories, setCategories] = useState<Category[]>(
    () => getCachedCategories() ?? [],
  );

  const [loading, setLoading] = useState(true);
  const [topBanners, setTopBanners] = useState<StorefrontBanner[]>([]);
  // گردی گوشهٔ بنر بالای صفحه (از تنظیم «ظاهر بنرها» در پنل مدیریت).
  const [bannerRadius, setBannerRadius] = useState<number>(
    DEFAULT_BANNER_RADIUS,
  );
  const [categoriesLoading, setCategoriesLoading] = useState(
    () => getCachedCategories() === null,
  );
  const [error, setError] = useState("");

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [sort, setSort] = useState(searchParams.get("sort") ?? "newest");
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get("category") ?? "",
  );

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // برندها از کش مشترک خوانده می‌شوند تا فیلتر برند بلافاصله نمایش داده شود.
  const [brands, setBrands] = useState<StorefrontBrand[]>(
    () => getCachedBrands() ?? [],
  );
  const [brandsLoading, setBrandsLoading] = useState(
    () => getCachedBrands() === null,
  );

  /*
   * فیلترهای پیشرفته؛ همه سمت سرور اعمال می‌شوند تا روی همهٔ صفحه‌ها درست
   * باشند و در آدرس صفحه هم ذخیره شوند (لینک قابل اشتراک‌گذاری).
   */
  const [selectedBrands, setSelectedBrands] = useState<string[]>(() =>
    (searchParams.get("brand") ?? "")
      .split(",")
      .map((slug) => slug.trim())
      .filter(Boolean),
  );
  const [minPrice, setMinPrice] = useState(searchParams.get("min_price") ?? "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("max_price") ?? "");
  // ورودی‌های قیمت تا زدن دکمهٔ «اعمال» (یا Enter/خروج از فیلد) درخواست نمی‌فرستند.
  const [minPriceDraft, setMinPriceDraft] = useState(minPrice);
  const [maxPriceDraft, setMaxPriceDraft] = useState(maxPrice);
  const [priceError, setPriceError] = useState("");
  const [inStockOnly, setInStockOnly] = useState(
    searchParams.get("in_stock") === "1",
  );
  const [discountOnly, setDiscountOnly] = useState(
    searchParams.get("discount_only") === "1",
  );
  // سایزها با همان قاعدهٔ سرور نرمال شده‌اند (حروف بزرگ لاتین، بدون «سایز»).
  const [selectedSizes, setSelectedSizes] = useState<string[]>(() =>
    (searchParams.get("size") ?? "")
      .split(",")
      .map((size) => size.trim())
      .filter(Boolean),
  );
  const [newOnly, setNewOnly] = useState(searchParams.get("new") === "1");
  const [featuredOnly, setFeaturedOnly] = useState(
    searchParams.get("featured") === "1",
  );
  // گزینه‌ها و شمار نتیجهٔ هر فیلتر (برند/دسته/سایز + بازهٔ قیمت) از سرور.
  const [facets, setFacets] = useState<ProductFilterFacets | null>(null);

  // صفحه‌بندی سمت سرور: فهرست فروشگاه فقط یک صفحه را در هر درخواست می‌گیرد.
  const [page, setPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [pageLoading, setPageLoading] = useState(false);

  const urlCategory = searchParams.get("category") ?? "";
  const urlSearch = searchParams.get("search") ?? "";
  const urlBrands = searchParams.get("brand") ?? "";
  const urlMinPrice = searchParams.get("min_price") ?? "";
  const urlMaxPrice = searchParams.get("max_price") ?? "";
  const urlInStock = searchParams.get("in_stock") === "1";
  const urlDiscountOnly = searchParams.get("discount_only") === "1";
  const urlSizes = searchParams.get("size") ?? "";
  const urlNewOnly = searchParams.get("new") === "1";
  const urlFeaturedOnly = searchParams.get("featured") === "1";

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

  // فیلترهای برند/قیمت/موجودی/تخفیف هم با آدرس همگام می‌شوند تا دکمهٔ
  // بازگشت مرورگر و لینک‌های اشتراکی همان نتیجه را نشان دهند.
  useEffect(() => {
    const next = urlBrands
      .split(",")
      .map((slug) => slug.trim())
      .filter(Boolean);

    setSelectedBrands((current) =>
      current.join(",") === next.join(",") ? current : next,
    );
  }, [urlBrands]);

  useEffect(() => {
    setMinPrice((current) => (current === urlMinPrice ? current : urlMinPrice));
    setMinPriceDraft((current) =>
      current === urlMinPrice ? current : urlMinPrice,
    );
  }, [urlMinPrice]);

  useEffect(() => {
    setMaxPrice((current) => (current === urlMaxPrice ? current : urlMaxPrice));
    setMaxPriceDraft((current) =>
      current === urlMaxPrice ? current : urlMaxPrice,
    );
  }, [urlMaxPrice]);

  useEffect(() => {
    setInStockOnly((current) => (current === urlInStock ? current : urlInStock));
  }, [urlInStock]);

  useEffect(() => {
    setDiscountOnly((current) =>
      current === urlDiscountOnly ? current : urlDiscountOnly,
    );
  }, [urlDiscountOnly]);

  useEffect(() => {
    const next = urlSizes
      .split(",")
      .map((size) => size.trim())
      .filter(Boolean);

    setSelectedSizes((current) =>
      current.join(",") === next.join(",") ? current : next,
    );
  }, [urlSizes]);

  useEffect(() => {
    setNewOnly((current) => (current === urlNewOnly ? current : urlNewOnly));
  }, [urlNewOnly]);

  useEffect(() => {
    setFeaturedOnly((current) =>
      current === urlFeaturedOnly ? current : urlFeaturedOnly,
    );
  }, [urlFeaturedOnly]);

  useEffect(() => {
    let cancelled = false;

    // اگر کش موجود باشد، فیلترها همان لحظه نمایش داده می‌شوند و این درخواست
    // فقط برای تازه‌سازی داده‌ها در پس‌زمینه اجرا می‌شود.
    if (getCachedCategories() === null) {
      setCategoriesLoading(true);
    }

    fetchCategories()
      .then((data) => {
        if (!cancelled) {
          setCategories(data);
        }
      })
      .catch((error) => {
        console.error("Categories error:", error);
      })
      .finally(() => {
        if (!cancelled) {
          setCategoriesLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    // برندها هم مثل دسته‌بندی‌ها از کش خوانده می‌شوند؛ درخواست فقط برای
    // تازه‌سازی داده در پس‌زمینه است و خطای آن فیلتر را خالی نمی‌کند.
    if (getCachedBrands() === null) {
      setBrandsLoading(true);
    }

    fetchBrands()
      .then((data) => {
        if (!cancelled) {
          setBrands(data);
        }
      })
      .catch((error) => {
        console.error("Brands error:", error);
      })
      .finally(() => {
        if (!cancelled) {
          setBrandsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadFacets = async () => {
      try {
        const data = await fetchProductFilters({
          search: search.trim(),
          category: selectedCategory,
          brand: selectedBrands.join(","),
          size: selectedSizes.join(","),
          min_price: minPrice,
          max_price: maxPrice,
          in_stock: inStockOnly ? 1 : "",
          discount_only: discountOnly ? 1 : "",
          new: newOnly ? 1 : "",
          featured: featuredOnly ? 1 : "",
        });

        if (!cancelled) {
          setFacets(data);
        }
      } catch (error) {
        // خطای شمارش فیلترها نباید فهرست محصولات را از کار بیندازد؛ در این
        // حالت همان فهرست کامل برندها/سایزهای کش‌شده نمایش داده می‌شود.
        console.error("Product filters error:", error);
      }
    };

    const timer = window.setTimeout(loadFacets, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    search,
    selectedCategory,
    selectedBrands,
    selectedSizes,
    minPrice,
    maxPrice,
    inStockOnly,
    discountOnly,
    newOnly,
    featuredOnly,
  ]);

  useEffect(() => {
    let cancelled = false;

    // بنرهای بالای صفحهٔ محصولات اختیاری هستند؛ خطای دریافت نباید صفحه را
    // خراب کند.
    api
      .get("/banners", { params: { position: "products_top" } })
      .then((response) => {
        const result = response.data?.data;

        if (!cancelled && Array.isArray(result)) {
          setTopBanners(result);
        }

        // ظاهر مشترک بنرها (گردی گوشه) در همان پاسخ و زیر کلید appearance است.
        if (!cancelled) {
          setBannerRadius(parseBannerAppearance(response.data).radius);
        }
      })
      .catch((error) => {
        console.error("Products top banners error:", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadProducts = async () => {
      // صفحهٔ اول اسکلت کامل دارد؛ صفحه‌های بعدی فقط محو می‌شوند تا پرش
      // ارتفاع صفحه آزاردهنده نباشد.
      if (page === 1) {
        setLoading(true);
      } else {
        setPageLoading(true);
      }

      setError("");

      try {
        const params: Record<string, string | number> = {
          page,
          per_page: PRODUCTS_PER_PAGE,
          sort: SORT_PARAM[sort] ?? "latest",
        };

        if (search.trim()) {
          params.search = search.trim();
        }

        if (selectedCategory) {
          params.category = selectedCategory;
        }

        if (selectedBrands.length > 0) {
          params.brand = selectedBrands.join(",");
        }

        if (minPrice) {
          params.min_price = minPrice;
        }

        if (maxPrice) {
          params.max_price = maxPrice;
        }

        if (inStockOnly) {
          params.in_stock = 1;
        }

        if (discountOnly) {
          params.discount_only = 1;
        }

        if (selectedSizes.length > 0) {
          params.size = selectedSizes.join(",");
        }

        if (newOnly) {
          params.new = 1;
        }

        if (featuredOnly) {
          params.featured = 1;
        }

        const response = await api.get("/products", {
          params,
        });

        const payload = response.data?.data;
        const result = Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload)
            ? payload
            : [];

        if (!Array.isArray(result)) {
          throw new Error("ساختار پاسخ محصولات معتبر نیست.");
        }

        if (!cancelled) {
          setProducts(result);
          setTotalProducts(
            Number(payload?.total ?? result.length) || result.length,
          );
          setLastPage(Math.max(Number(payload?.last_page ?? 1) || 1, 1));
        }
      } catch (error: any) {
        console.error("Products error:", error);

        if (!cancelled) {
          setProducts([]);
          setTotalProducts(0);
          setLastPage(1);
          setError(
            error?.response?.data?.message ??
              error?.message ??
              "دریافت محصولات با خطا مواجه شد.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setPageLoading(false);
        }
      }
    };

    const timer = window.setTimeout(loadProducts, page === 1 ? 350 : 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    search,
    selectedCategory,
    sort,
    page,
    selectedBrands,
    minPrice,
    maxPrice,
    inStockOnly,
    discountOnly,
    selectedSizes,
    newOnly,
    featuredOnly,
  ]);

  // تغییر جست‌وجو، دسته یا هر فیلتر دیگری فهرست را به صفحهٔ اول برمی‌گرداند.
  useEffect(() => {
    setPage(1);
  }, [
    search,
    selectedCategory,
    sort,
    selectedBrands,
    minPrice,
    maxPrice,
    inStockOnly,
    discountOnly,
    selectedSizes,
    newOnly,
    featuredOnly,
  ]);

  useEffect(() => {
    const params = new URLSearchParams();

    if (search.trim()) {
      params.set("search", search.trim());
    }

    if (selectedCategory) {
      params.set("category", selectedCategory);
    }

    if (selectedBrands.length > 0) {
      params.set("brand", selectedBrands.join(","));
    }

    if (minPrice) {
      params.set("min_price", minPrice);
    }

    if (maxPrice) {
      params.set("max_price", maxPrice);
    }

    if (inStockOnly) {
      params.set("in_stock", "1");
    }

    if (discountOnly) {
      params.set("discount_only", "1");
    }

    if (selectedSizes.length > 0) {
      params.set("size", selectedSizes.join(","));
    }

    if (newOnly) {
      params.set("new", "1");
    }

    if (featuredOnly) {
      params.set("featured", "1");
    }

    if (sort && sort !== "newest") {
      params.set("sort", sort);
    }

    setSearchParams(params, { replace: true });
  }, [
    search,
    selectedCategory,
    sort,
    selectedBrands,
    minPrice,
    maxPrice,
    inStockOnly,
    discountOnly,
    selectedSizes,
    newOnly,
    featuredOnly,
    setSearchParams,
  ]);

  /*
   * فیلتر و مرتب‌سازی سمت سرور انجام می‌شوند، پس همان نتیجهٔ API نمایش
   * داده می‌شود. فیلتر دوبارهٔ سمت کلاینت می‌توانست محصولات همین صفحه را
   * به‌اشتباه حذف کند (مثلاً وقتی جست‌وجو با SKU مطابقت دارد).
   */
  const visibleProducts = products;

  /*
   * گزینه‌های فیلتر برند.
   * وقتی facet ها آمده باشند، شمار هر برند «تعداد نتیجه با فیلترهای فعلی»
   * است و برندهای بی‌نتیجه پنهان می‌شوند (برندهای انتخاب‌شده همیشه می‌مانند
   * تا کاربر بتواند انتخابش را بردارد). پیش از رسیدن facet ها همان فهرست
   * کامل برندهای کش‌شده نمایش داده می‌شود.
   */
  const brandOptions = useMemo(() => {
    const counts = new Map(
      (facets?.brands ?? []).map((brand) => [brand.slug, brand.count]),
    );
    const hasFacets = facets !== null && facets.brands.length > 0;

    return brands
      .filter((brand) =>
        hasFacets
          ? (counts.get(brand.slug) ?? 0) > 0 ||
            selectedBrands.includes(brand.slug)
          : (brand.products_count ?? 0) > 0,
      )
      .map((brand) => ({
        ...brand,
        products_count: counts.get(brand.slug) ?? brand.products_count,
      }));
  }, [brands, facets, selectedBrands]);

  // سایزهای قابل انتخاب؛ سایز انتخاب‌شده حتی با نتیجهٔ صفر می‌ماند.
  const sizeOptions = useMemo(
    () =>
      (facets?.sizes ?? []).filter(
        (size) => size.count > 0 || selectedSizes.includes(size.value),
      ),
    [facets, selectedSizes],
  );

  /*
   * میان‌بُرهای قیمت از بازهٔ واقعی نتایج ساخته می‌شوند؛ اگر facet ها نرسیده
   * باشند یا بازهٔ داده‌ها خیلی کوچک باشد، همان محدوده‌های ثابت قبلی می‌آید.
   */
  const pricePresets = useMemo(() => {
    const min = facets?.price.min ?? null;
    const max = facets?.price.max ?? null;

    if (min === null || max === null || max - min < 20000) {
      return PRICE_PRESETS;
    }

    const round = (value: number) =>
      Math.max(Math.round(value / 10000) * 10000, 10000);

    const low = round(min + (max - min) / 3);
    const high = round(min + ((max - min) * 2) / 3);

    if (high <= low) {
      return PRICE_PRESETS;
    }

    return [
      {
        label: `زیر ${formatFilterPrice(String(low))}`,
        min: "",
        max: String(low),
      },
      {
        label: `${formatFilterPrice(String(low))} تا ${formatFilterPrice(String(high))}`,
        min: String(low),
        max: String(high),
      },
      {
        label: `بالای ${formatFilterPrice(String(high))}`,
        min: String(high),
        max: "",
      },
    ];
  }, [facets]);

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

  /*
   * متای صفحهٔ فهرست محصولات.
   * - صفحهٔ دسته و صفحهٔ اصلی فهرست ایندکس می‌شوند.
   * - نتیجهٔ جست‌وجو ایندکس نمی‌شود (محتوای تکراری/بی‌پایان) و canonical آن
   *   به همان نشانی جست‌وجو اشاره می‌کند.
   */
  const pageMeta = useMemo(() => {
    const query = search.trim();
    const categoryName = selectedCategoryName;

    const title = query
      ? `جست‌وجوی «${query}» | ${SITE_NAME}`
      : categoryName
        ? `${categoryName} | ${SITE_NAME}`
        : `فروشگاه محصولات | ${SITE_NAME}`;

    const description = categoryName
      ? `خرید ${categoryName} از ${SITE_NAME}؛ جدیدترین محصولات، قیمت روز و ارسال سریع به سراسر ایران.`
      : `فهرست کامل محصولات ${SITE_NAME}؛ لباس زیر زنانه، ست، سوتین، شورت و لباس خواب با قیمت روز و ارسال سریع.`;

    const path = selectedCategory
      ? `/products?category=${encodeURIComponent(selectedCategory)}`
      : "/products";

    return {
      title,
      description,
      path,
      robots: query ? NO_INDEX_ROBOTS : undefined,
      jsonLd: breadcrumbJsonLd([
        { name: "خانه", path: "/" },
        { name: categoryName ?? "فروشگاه محصولات", path },
      ]),
    };
  }, [search, selectedCategory, selectedCategoryName]);

  usePageMeta(pageMeta);

  /**
   * اعمال محدودهٔ قیمت. ورودی خالی یعنی «بدون محدودیت». اگر کمترین از
   * بیشترین بزرگ‌تر باشد، مقدارها جابه‌جا می‌شوند تا کاربر گیر نکند.
   */
  const applyPriceRange = (
    rawMin: string = minPriceDraft,
    rawMax: string = maxPriceDraft,
  ) => {
    let nextMin = normalizePriceInput(rawMin);
    let nextMax = normalizePriceInput(rawMax);

    if (nextMin !== "" && nextMax !== "" && Number(nextMin) > Number(nextMax)) {
      [nextMin, nextMax] = [nextMax, nextMin];
      setPriceError("کمترین و بیشترین قیمت با هم جابه‌جا شد.");
    } else {
      setPriceError("");
    }

    setMinPriceDraft(nextMin);
    setMaxPriceDraft(nextMax);
    setMinPrice(nextMin);
    setMaxPrice(nextMax);
  };

  const toggleBrand = (slug: string) => {
    setSelectedBrands((current) => toggleValue(current, slug));
  };

  const toggleSize = (size: string) => {
    setSelectedSizes((current) => toggleValue(current, size));
  };

  const clearFilters = () => {
    setSearch("");
    setSelectedCategory("");
    setSort("newest");
    setSelectedBrands([]);
    setSelectedSizes([]);
    applyPriceRange("", "");
    setInStockOnly(false);
    setDiscountOnly(false);
    setNewOnly(false);
    setFeaturedOnly(false);
    setPage(1);
  };

  /**
   * جابه‌جایی بین صفحه‌های فهرست؛ صفحهٔ هدف محدود می‌شود و صفحه به بالا
   * برمی‌گردد تا کاربر ابتدای نتایج جدید را ببیند.
   */
  const goToPage = (nextPage: number) => {
    const target = Math.min(Math.max(nextPage, 1), lastPage);

    if (target === page) {
      return;
    }

    setPage(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const priceRangeLabel =
    minPrice !== "" && maxPrice !== ""
      ? `از ${formatFilterPrice(minPrice)} تا ${formatFilterPrice(maxPrice)} تومان`
      : minPrice !== ""
        ? `از ${formatFilterPrice(minPrice)} تومان`
        : maxPrice !== ""
          ? `تا ${formatFilterPrice(maxPrice)} تومان`
          : "";

  // شمار فیلترهای فعال (برای نشانگر دکمهٔ فیلتر در موبایل).
  const activeFilterCount =
    selectedBrands.length +
    selectedSizes.length +
    (priceRangeLabel ? 1 : 0) +
    (inStockOnly ? 1 : 0) +
    (discountOnly ? 1 : 0) +
    (newOnly ? 1 : 0) +
    (featuredOnly ? 1 : 0);

  const hasFilters =
    search.trim() !== "" ||
    selectedCategory !== "" ||
    sort !== "newest" ||
    activeFilterCount > 0;

  /** یکی از چهار کلید «ویژگی‌ها» را روشن/خاموش می‌کند. */
  const toggleFilterFlag = (key: FilterFlagKey) => {
    if (key === "inStock") {
      setInStockOnly((value) => !value);
    } else if (key === "discount") {
      setDiscountOnly((value) => !value);
    } else if (key === "isNew") {
      setNewOnly((value) => !value);
    } else {
      setFeaturedOnly((value) => !value);
    }
  };

  /*
   * پراپ‌های مشترک پنل فیلتر؛ سایدبار دسکتاپ و کشوی موبایل هر دو همین پنل
   * را رندر می‌کنند تا چیدمان و فاصله‌ها دقیقاً یکسان بماند.
   */
  const filterPanelProps = {
    categories,
    categoriesLoading,
    selectedCategory,
    onSelectCategory: setSelectedCategory,
    brands: brandOptions,
    brandsLoading,
    selectedBrands,
    onToggleBrand: toggleBrand,
    onClearBrands: () => setSelectedBrands([]),
    sizes: sizeOptions,
    selectedSizes,
    onToggleSize: toggleSize,
    priceMinBound: facets?.price.min ?? null,
    priceMaxBound: facets?.price.max ?? null,
    minPriceDraft,
    maxPriceDraft,
    onChangeMinPriceDraft: setMinPriceDraft,
    onChangeMaxPriceDraft: setMaxPriceDraft,
    onApplyPriceRange: applyPriceRange,
    priceError,
    pricePresets,
    activeMinPrice: minPrice,
    activeMaxPrice: maxPrice,
    flags: {
      inStock: inStockOnly,
      discount: discountOnly,
      isNew: newOnly,
      featured: featuredOnly,
    },
    onToggleFlag: toggleFilterFlag,
    sort,
    sortOptions: SORT_OPTIONS,
    onSortChange: setSort,
    hasFilters,
    onClearFilters: clearFilters,
    resultCount: totalProducts,
  };

  return (
    <Layout>
      <main className="min-h-screen bg-cream">
        <section className="border-b border-line bg-white">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-100 px-4 py-2 text-xs font-black text-brand-550">
                  <Tag size={14} />
                  کالکشن زنانه و ورزشی
                </div>

                <h1 className="text-3xl font-black text-ink sm:text-4xl">
                  فروشگاه محصولات
                </h1>

                <p className="mt-3 max-w-2xl leading-7 text-muted">
                  لباس‌های زنانه، لباس زیر، پوشاک ورزشی و محصولات منتخب برای
                  استایل روزمره و فعالیت‌های ورزشی.
                </p>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-soft">
                  {totalProducts.toLocaleString("fa-IR")}
                </span>
                <span className="font-bold text-ink-soft">محصول</span>
              </div>
            </div>
          </div>
        </section>

        {topBanners.length > 0 && (
          <div
            className={`mx-auto max-w-7xl px-4 pt-6 sm:px-6 ${viewportVisibilityClass(
              topBanners.some(hasDesktopImage),
              topBanners.some(hasMobileImage),
            )}`}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {topBanners.map((banner) => (
                <TopBannerCard
                  key={banner.id}
                  banner={banner}
                  radius={bannerRadius}
                />
              ))}
            </div>
          </div>
        )}

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <div className="flex flex-col gap-6 lg:flex-row">
            <aside className="hidden w-64 flex-shrink-0 lg:block">
              <div className="sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto overscroll-contain rounded-2xl border border-line bg-white p-3.5 shadow-sm">
                <div className="mb-3 flex items-center gap-2 border-b border-line pb-3">
                  <div className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-brand-100 text-brand-550">
                    <SlidersHorizontal size={16} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-black leading-5">
                      فیلتر محصولات
                    </h2>
                    <p className="text-[10px] text-muted-soft">
                      انتخاب سریع و دقیق
                    </p>
                  </div>
                </div>

                <ProductFilterPanel {...filterPanelProps} />
              </div>
            </aside>

            <div className="min-w-0 flex-1">
              <div className="mb-5 rounded-2xl border border-line bg-white p-3 shadow-sm sm:p-4">
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
                      placeholder="جستجوی محصول..."
                      className="h-11 w-full rounded-xl border border-line bg-cream pl-9 pr-10 text-[13px] outline-none transition focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-100"
                    />

                    {search && (
                      <button
                        type="button"
                        onClick={() => setSearch("")}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-soft transition hover:text-brand-550"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setMobileFiltersOpen((value) => !value)}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 text-[13px] font-bold text-white transition hover:bg-brand-700 lg:hidden"
                  >
                    <Filter size={17} />
                    فیلتر و مرتب‌سازی
                    {activeFilterCount > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-[11px] font-black text-brand-700">
                        {activeFilterCount.toLocaleString("fa-IR")}
                      </span>
                    )}
                  </button>

                  <div className="relative hidden min-w-[175px] sm:block">
                    <select
                      value={sort}
                      onChange={(event) => setSort(event.target.value)}
                      aria-label="مرتب‌سازی محصولات"
                      className="h-11 w-full appearance-none rounded-xl border border-line bg-white px-3 pl-9 text-[13px] font-bold outline-none transition focus:border-brand-500"
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

                {mobileFiltersOpen && (
                  <div className="mt-3 border-t border-line pt-3 lg:hidden">
                    <ProductFilterPanel
                      {...filterPanelProps}
                      onClose={() => setMobileFiltersOpen(false)}
                    />
                  </div>
                )}
              </div>

              {(selectedCategoryName ||
                selectedBrands.length > 0 ||
                selectedSizes.length > 0 ||
                priceRangeLabel !== "" ||
                inStockOnly ||
                discountOnly ||
                newOnly ||
                featuredOnly) && (
                <div className="mb-5 flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-soft">فیلترها:</span>

                  {selectedCategoryName && (
                    <button
                      type="button"
                      onClick={() => setSelectedCategory("")}
                      className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-3 py-1.5 text-xs font-bold text-brand-700 transition hover:bg-brand-250"
                    >
                      {selectedCategoryName}
                      <X size={13} />
                    </button>
                  )}

                  {selectedBrands.map((slug) => {
                    const brand = brands.find((item) => item.slug === slug);

                    return (
                      <button
                        key={slug}
                        type="button"
                        onClick={() => toggleBrand(slug)}
                        className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-3 py-1.5 text-xs font-bold text-brand-700 transition hover:bg-brand-250"
                      >
                        برند: {brand?.name ?? slug}
                        <X size={13} />
                      </button>
                    );
                  })}

                  {priceRangeLabel !== "" && (
                    <button
                      type="button"
                      onClick={() => applyPriceRange("", "")}
                      className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-3 py-1.5 text-xs font-bold text-brand-700 transition hover:bg-brand-250"
                    >
                      {priceRangeLabel}
                      <X size={13} />
                    </button>
                  )}

                  {selectedSizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => toggleSize(size)}
                      className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-3 py-1.5 text-xs font-bold text-brand-700 transition hover:bg-brand-250"
                    >
                      سایز: {size}
                      <X size={13} />
                    </button>
                  ))}

                  {inStockOnly && (
                    <button
                      type="button"
                      onClick={() => setInStockOnly(false)}
                      className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-3 py-1.5 text-xs font-bold text-brand-700 transition hover:bg-brand-250"
                    >
                      فقط کالاهای موجود
                      <X size={13} />
                    </button>
                  )}

                  {discountOnly && (
                    <button
                      type="button"
                      onClick={() => setDiscountOnly(false)}
                      className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-3 py-1.5 text-xs font-bold text-brand-700 transition hover:bg-brand-250"
                    >
                      فقط کالاهای تخفیف‌دار
                      <X size={13} />
                    </button>
                  )}

                  {newOnly && (
                    <button
                      type="button"
                      onClick={() => setNewOnly(false)}
                      className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-3 py-1.5 text-xs font-bold text-brand-700 transition hover:bg-brand-250"
                    >
                      فقط کالاهای جدید
                      <X size={13} />
                    </button>
                  )}

                  {featuredOnly && (
                    <button
                      type="button"
                      onClick={() => setFeaturedOnly(false)}
                      className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-3 py-1.5 text-xs font-bold text-brand-700 transition hover:bg-brand-250"
                    >
                      فقط پیشنهادهای ویژه
                      <X size={13} />
                    </button>
                  )}
                </div>
              )}

              {loading && (
                <div
                  className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3"
                  aria-busy="true"
                  aria-live="polite"
                >
                  <span className="sr-only">در حال دریافت محصولات...</span>

                  {Array.from({ length: 12 }, (_, index) => (
                    <div
                      key={index}
                      aria-hidden="true"
                      className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm"
                    >
                      <div className="aspect-square animate-pulse bg-brand-50" />

                      <div className="space-y-2 p-3 sm:p-4">
                        <div className="h-3 w-3/4 animate-pulse rounded-full bg-brand-100" />
                        <div className="h-3 w-1/2 animate-pulse rounded-full bg-brand-100" />

                        <div className="mt-3 h-5 w-2/5 animate-pulse rounded-full bg-brand-100" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!loading && error && (
                <div className="rounded-3xl border border-blush-100 bg-white p-8 text-center shadow-sm">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blush-50 text-discount">
                    <X size={26} />
                  </div>

                  <h2 className="mt-5 text-lg font-black">
                    دریافت محصولات انجام نشد
                  </h2>

                  <p className="mt-2 text-sm text-muted">{error}</p>

                  <button
                    type="button"
                    onClick={() => {
                      setSearch((value) => `${value} `);
                    }}
                    className="mt-5 inline-flex items-center justify-center rounded-xl bg-brand-500 px-6 py-3 font-bold text-white transition hover:bg-brand-700"
                  >
                    تلاش مجدد
                  </button>
                </div>
              )}

              {!loading && !error && visibleProducts.length === 0 && (
                <div className="rounded-3xl border border-line bg-white px-6 py-16 text-center shadow-sm">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100 text-brand-400">
                    <Search size={30} />
                  </div>

                  <h2 className="mt-5 text-xl font-black">محصولی پیدا نشد</h2>

                  <p className="mt-2 text-muted">
                    عبارت جستجو یا فیلترهای انتخاب‌شده را تغییر دهید.
                  </p>

                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-5 inline-flex items-center justify-center rounded-xl bg-brand-500 px-6 py-3 font-bold text-white transition hover:bg-brand-700"
                  >
                    پاک کردن فیلترها
                  </button>
                </div>
              )}

              {!loading && !error && visibleProducts.length > 0 && (
                <div
                  className={`grid grid-cols-2 gap-3 transition-opacity duration-200 sm:gap-5 xl:grid-cols-3 ${
                    pageLoading ? "pointer-events-none opacity-50" : ""
                  }`}
                  aria-busy={pageLoading}
                >
                  {visibleProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}

              {!loading && !error && visibleProducts.length > 0 && (
                <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl border border-line bg-white px-5 py-4 sm:flex-row">
                  <p className="text-sm text-muted">
                    نمایش{" "}
                    <span className="font-black text-ink">
                      {(
                        (page - 1) * PRODUCTS_PER_PAGE + 1
                      ).toLocaleString("fa-IR")}
                    </span>{" "}
                    تا{" "}
                    <span className="font-black text-ink">
                      {Math.min(
                        page * PRODUCTS_PER_PAGE,
                        totalProducts,
                      ).toLocaleString("fa-IR")}
                    </span>{" "}
                    از{" "}
                    <span className="font-black text-ink">
                      {totalProducts.toLocaleString("fa-IR")}
                    </span>{" "}
                    محصول
                  </p>

                  {lastPage > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => goToPage(page - 1)}
                        disabled={page <= 1}
                        className="inline-flex items-center justify-center rounded-xl border border-line px-4 py-2 text-sm font-bold text-ink-soft transition hover:border-brand-300 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        قبلی
                      </button>

                      <span className="px-1 text-sm font-bold text-muted">
                        صفحهٔ {page.toLocaleString("fa-IR")} از{" "}
                        {lastPage.toLocaleString("fa-IR")}
                      </span>

                      <button
                        type="button"
                        onClick={() => goToPage(page + 1)}
                        disabled={page >= lastPage}
                        className="inline-flex items-center justify-center rounded-xl bg-brand-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-550 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        بعدی
                      </button>
                    </div>
                  )}

                  <Link
                    to="/"
                    className="inline-flex items-center gap-2 text-sm font-bold text-brand-550 transition hover:text-brand-700"
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
