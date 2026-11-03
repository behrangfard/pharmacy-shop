import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ShieldCheck,
  Truck,
  Headphones,
  RotateCcw,
  Sparkles,
  Heart,
  Layers,
  Moon,
  Shirt,
  ShoppingBag,
} from "lucide-react";
import { Link } from "react-router-dom";
import { getStorageUrl } from "../utils/images";
import Layout from "../components/Layout";
import { ButtonLink } from "../components/Button";
import { api } from "../services/api";
import { calculateProductPrice } from "../utils/price";

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
  price: string | number;
  compare_price?: string | number | null;
  discount_percent?: string | number;
  stock: number;
  short_description?: string | null;
  thumbnail?: string | null;
  images?: ProductImage[];
}

function ProductImageBox({ product }: { product: Product }) {
  const primaryImage =
    product.images?.find((image) => image.is_primary) ?? product.images?.[0];

  const imageUrl = getStorageUrl(primaryImage?.path ?? product.thumbnail);

  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div
      className="
        mb-5 flex h-52 w-full shrink-0 items-center justify-center
        overflow-hidden rounded-2xl bg-[#f8f7f1]
        transition-colors duration-300
        group-hover:bg-[#f0f3e9]
        sm:h-56
      "
    >
      {imageUrl && !imageFailed ? (
        <img
          src={imageUrl}
          alt={primaryImage?.alt || product.name}
          loading="lazy"
          onError={() => setImageFailed(true)}
          className="
            h-full w-full object-contain p-4
            transition-transform duration-500 ease-out
            group-hover:scale-105
          "
        />
      ) : (
        <div className="flex flex-col items-center gap-2 text-[#9aaa96]">
          <ShoppingBag size={38} strokeWidth={1.5} />
          <span className="text-xs">تصویر محصول</span>
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
      className="
        mt-3 flex min-h-[84px] w-full flex-col
        items-start justify-end text-left
      "
      style={{ direction: "ltr", textAlign: "left" }}
    >
      {hasDiscount ? (
        <>
          <div className="mb-2 flex w-full flex-row items-center justify-start gap-2">
            <span
              className="
                inline-flex items-center justify-center rounded-lg
                bg-[#f4dfe5] px-2.5 py-1
                text-xs font-bold text-[#854c61]
              "
            >
              {discountPercent}% تخفیف
            </span>

            <span className="text-sm text-[#9ca39a] line-through">
              {originalPrice.toLocaleString("fa-IR")} تومان
            </span>
          </div>

          <div
            className="
              w-full text-left text-xl font-black
              text-[#4f7754] transition-colors
              group-hover:text-[#385e3e]
            "
          >
            {finalPrice.toLocaleString("fa-IR")} تومان
          </div>

          <div className="mt-1 w-full text-left text-xs font-medium text-[#648b65]">
            صرفه‌جویی {discountAmount.toLocaleString("fa-IR")} تومان
          </div>
        </>
      ) : (
        <>
          <div
            className="
              w-full text-left text-xl font-black
              text-[#4f7754] transition-colors
              group-hover:text-[#385e3e]
            "
          >
            {finalPrice.toLocaleString("fa-IR")} تومان
          </div>

          {product.compare_price &&
            Number(product.compare_price) > originalPrice && (
              <div className="mt-1 w-full text-left text-sm text-[#9ca39a] line-through">
                {Number(product.compare_price).toLocaleString("fa-IR")} تومان
              </div>
            )}
        </>
      )}
    </div>
  );
}

function ProductCardHome({ product }: { product: Product }) {
  return (
    <article
      className="
        group flex h-full min-w-0 flex-col
        rounded-3xl border border-[#e8eee5]
        bg-white p-4 shadow-sm
        transition-all duration-300 ease-out
        hover:-translate-y-1 hover:border-[#cbdcc9]
        hover:shadow-[0_14px_36px_rgba(61,92,63,0.10)]
        sm:p-5
      "
    >
      <Link
        to={`/product/${product.slug}`}
        className="block"
        aria-label={`مشاهده ${product.name}`}
      >
        <ProductImageBox product={product} />
      </Link>

      <div className="mb-2 flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-[#f0f3e9] px-2.5 py-1 text-xs font-bold text-[#537653]">
          <Sparkles size={12} />
          انتخاب ویژه
        </span>
      </div>

      <Link to={`/product/${product.slug}`} className="block">
        <h3
          className="
            min-h-12 break-words text-lg font-black leading-6
            text-[#283b2d] line-clamp-2
            transition-colors duration-200
            group-hover:text-[#537d58]
          "
        >
          {product.name}
        </h3>
      </Link>

      <p className="mt-2 min-h-10 break-words text-sm leading-5 text-[#7b847b] line-clamp-2">
        {product.short_description || "\u00a0"}
      </p>

      <ProductPrice product={product} />

      <ButtonLink
        to={`/product/${product.slug}`}
        variant="primary"
        size="md"
        className="
          mt-4 w-full !rounded-xl
          !bg-[#648767] !text-white
          transition-all duration-150
          hover:!bg-[#4f7353]
          active:scale-[0.98]
        "
      >
        <span className="inline-flex w-full items-center justify-center gap-2">
          مشاهده محصول
          <ArrowLeft
            size={18}
            className="transition-transform duration-200 group-hover:-translate-x-1"
          />
        </span>
      </ButtonLink>
    </article>
  );
}

function Home() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [newestProducts, setNewestProducts] = useState<Product[]>([]);
  const [featuredError, setFeaturedError] = useState("");
  const [newestError, setNewestError] = useState("");

  useEffect(() => {
    setFeaturedError("");

    api
      .get("/products/featured")
      .then((response) => {
        const result = response.data?.data ?? response.data;

        if (Array.isArray(result)) {
          setFeaturedProducts(result);
        } else {
          setFeaturedProducts([]);
          setFeaturedError("پاسخ محصولات ویژه آرایه نیست.");
        }
      })
      .catch((error) => {
        console.error("FEATURED API ERROR:", error);
        setFeaturedProducts([]);

        setFeaturedError(
          "خطا در دریافت محصولات ویژه: " +
            (error?.response?.status
              ? `HTTP ${error.response.status} - `
              : "") +
            (error?.message || "خطای نامشخص"),
        );
      });
  }, []);

  useEffect(() => {
    setNewestError("");

    api
      .get("/products/newest")
      .then((response) => {
        const result = response.data?.data ?? response.data;

        if (Array.isArray(result)) {
          setNewestProducts(result);
        } else {
          setNewestProducts([]);
          setNewestError("پاسخ جدیدترین محصولات آرایه نیست.");
        }
      })
      .catch((error) => {
        console.error("NEWEST API ERROR:", error);
        setNewestProducts([]);

        setNewestError(
          "خطا در دریافت جدیدترین محصولات: " +
            (error?.response?.status
              ? `HTTP ${error.response.status} - `
              : "") +
            (error?.message || "خطای نامشخص"),
        );
      });
  }, []);

  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#faf9f4]">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
          <div className="relative overflow-hidden rounded-[2rem] bg-[#f0f3e9] shadow-sm">
            <picture>
              <source
                media="(max-width: 639px)"
                srcSet="/images/women-sport-hero-mobile.png"
              />

              <img
                src="/images/women-sport-hero.png"
                alt="لباس زنانه و ورزشی"
                className="block h-auto w-full"
              />
            </picture>

            {/* ناحیه کلیک موبایل */}
            <Link
              to="/products"
              aria-label="مشاهده محصولات"
              title="مشاهده محصولات"
              className="
                absolute left-[67%] top-[67%] z-20
                h-[8%] w-[30%] cursor-pointer rounded-full
                focus-visible:outline focus-visible:outline-2
                focus-visible:outline-[#648767]
                sm:hidden
              "
            />

            {/* ناحیه کلیک دسکتاپ */}
            <Link
              to="/products"
              aria-label="مشاهده محصولات"
              title="مشاهده محصولات"
              className="
                absolute left-[6.8%] top-[55.5%] z-20
                hidden h-[6%] w-[14.5%] cursor-pointer rounded-full
                focus-visible:outline focus-visible:outline-2
                focus-visible:outline-[#648767]
                sm:block
              "
            />

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#537653]/5" />
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="border-b border-[#e8eee5] bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-4 rounded-2xl border border-[#e8eee5] bg-[#faf9f4] p-4 transition hover:border-[#cbdcc9] hover:bg-[#f4f6ee]">
              <div className="shrink-0 rounded-xl bg-[#e8efe2] p-3 text-[#537653]">
                <Truck size={25} />
              </div>
              <div>
                <h3 className="font-black text-[#283b2d]">ارسال سریع</h3>
                <p className="mt-1 text-sm text-[#7b847b]">
                  ارسال سریع سفارش‌ها
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-2xl border border-[#e8eee5] bg-[#faf9f4] p-4 transition hover:border-[#cbdcc9] hover:bg-[#f4f6ee]">
              <div className="shrink-0 rounded-xl bg-[#e8efe2] p-3 text-[#537653]">
                <ShieldCheck size={25} />
              </div>
              <div>
                <h3 className="font-black text-[#283b2d]">تضمین کیفیت</h3>
                <p className="mt-1 text-sm text-[#7b847b]">محصولات باکیفیت</p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-2xl border border-[#e8eee5] bg-[#faf9f4] p-4 transition hover:border-[#d9cbed] hover:bg-[#f8f4fb]">
              <div className="shrink-0 rounded-xl bg-[#eee6f7] p-3 text-[#8066a2]">
                <Headphones size={25} />
              </div>
              <div>
                <h3 className="font-black text-[#283b2d]">پشتیبانی</h3>
                <p className="mt-1 text-sm text-[#7b847b]">
                  پاسخگویی و پشتیبانی
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-2xl border border-[#e8eee5] bg-[#faf9f4] p-4 transition hover:border-[#d9cbed] hover:bg-[#f8f4fb]">
              <div className="shrink-0 rounded-xl bg-[#eee6f7] p-3 text-[#8066a2]">
                <RotateCcw size={25} />
              </div>
              <div>
                <h3 className="font-black text-[#283b2d]">ضمانت بازگشت</h3>
                <p className="mt-1 text-sm text-[#7b847b]">خرید با خیال راحت</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="bg-[#faf9f4] py-12 sm:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-8 flex items-center justify-between gap-3">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-bold text-[#8066a2]">
                <Sparkles size={16} />
                استایل زنانه
              </div>

              <h2 className="text-2xl font-black text-[#283b2d] sm:text-3xl">
                دسته‌بندی محصولات
              </h2>
            </div>

            <ButtonLink
              to="/products"
              variant="ghost"
              size="sm"
              className="shrink-0 text-[#648767] transition hover:text-[#385e3e] active:scale-95"
            >
              همه محصولات
              <ArrowLeft size={18} />
            </ButtonLink>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <ButtonLink
              to="/products?category=bra"
              variant="ghost"
              size="lg"
              className="
                group h-full justify-start rounded-2xl
                border border-[#e8eee5] bg-white text-right
                transition-all duration-200
                hover:border-[#e4c9d4] hover:shadow-lg
                active:scale-[0.98]
              "
            >
              <div className="w-full">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#f5e7ed] text-[#a56883] transition group-hover:bg-[#eed8e2]">
                  <Heart size={21} />
                </div>
                <h3 className="font-black text-[#283b2d]">سوتین</h3>
                <p className="mt-2 text-sm font-normal leading-6 text-[#7b847b]">
                  سوتین‌های سیم‌دار، بدون سیم و ورزشی
                </p>
              </div>
            </ButtonLink>

            <ButtonLink
              to="/products?category=panties"
              variant="ghost"
              size="lg"
              className="
                group h-full justify-start rounded-2xl
                border border-[#e8eee5] bg-white text-right
                transition-all duration-200
                hover:border-[#cbdcc9] hover:shadow-lg
                active:scale-[0.98]
              "
            >
              <div className="w-full">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#e8efe2] text-[#537653] transition group-hover:bg-[#dce8d4]">
                  <Layers size={21} />
                </div>
                <h3 className="font-black text-[#283b2d]">شورت</h3>
                <p className="mt-2 text-sm font-normal leading-6 text-[#7b847b]">
                  شورت‌های نخی و بدون درز
                </p>
              </div>
            </ButtonLink>

            <ButtonLink
              to="/products?category=lingerie-sets"
              variant="ghost"
              size="lg"
              className="
                group h-full justify-start rounded-2xl
                border border-[#e8eee5] bg-white text-right
                transition-all duration-200
                hover:border-[#d9cbed] hover:shadow-lg
                active:scale-[0.98]
              "
            >
              <div className="w-full">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#eee6f7] text-[#8066a2] transition group-hover:bg-[#e4d8f1]">
                  <Shirt size={21} />
                </div>
                <h3 className="font-black text-[#283b2d]">ست لباس زیر</h3>
                <p className="mt-2 text-sm font-normal leading-6 text-[#7b847b]">
                  ست‌های هماهنگ سوتین و شورت
                </p>
              </div>
            </ButtonLink>

            <ButtonLink
              to="/products?category=sleepwear"
              variant="ghost"
              size="lg"
              className="
                group h-full justify-start rounded-2xl
                border border-[#e8eee5] bg-white text-right
                transition-all duration-200
                hover:border-[#cbdcc9] hover:shadow-lg
                active:scale-[0.98]
              "
            >
              <div className="w-full">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#e8efe2] text-[#537653] transition group-hover:bg-[#dce8d4]">
                  <Moon size={21} />
                </div>
                <h3 className="font-black text-[#283b2d]">لباس خواب</h3>
                <p className="mt-2 text-sm font-normal leading-6 text-[#7b847b]">
                  پیراهن خواب و ست‌های خواب
                </p>
              </div>
            </ButtonLink>

            <ButtonLink
              to="/products?category=shapewear"
              variant="ghost"
              size="lg"
              className="
                group h-full justify-start rounded-2xl
                border border-[#e8eee5] bg-white text-right
                transition-all duration-200
                hover:border-[#d9cbed] hover:shadow-lg
                active:scale-[0.98]
              "
            >
              <div className="w-full">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#eee6f7] text-[#8066a2] transition group-hover:bg-[#e4d8f1]">
                  <Sparkles size={21} />
                </div>
                <h3 className="font-black text-[#283b2d]">گن و فرم‌دهنده</h3>
                <p className="mt-2 text-sm font-normal leading-6 text-[#7b847b]">
                  گن، بادی و فرم‌دهنده
                </p>
              </div>
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="bg-white py-12 sm:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-8 flex items-center justify-between gap-3">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-bold text-[#8066a2]">
                <Sparkles size={16} />
                پیشنهادهای منتخب
              </div>
              <h2 className="text-2xl font-black text-[#283b2d] sm:text-3xl">
                محصولات ویژه
              </h2>
            </div>

            <ButtonLink
              to="/products"
              variant="ghost"
              size="sm"
              className="shrink-0 text-[#648767] transition hover:text-[#385e3e] active:scale-95"
            >
              مشاهده همه
              <ArrowLeft size={18} />
            </ButtonLink>
          </div>

          <div className="grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
            {featuredProducts.map((product) => (
              <ProductCardHome key={product.id} product={product} />
            ))}

            {featuredProducts.length === 0 && (
              <div className="col-span-full py-12 text-center">
                {featuredError ? (
                  <div className="rounded-2xl border border-[#f0d6d8] bg-[#fff6f5] p-6 text-[#a64d57]">
                    <div className="mb-3 font-black">
                      خطا در دریافت محصولات ویژه
                    </div>
                    <div className="text-sm">{featuredError}</div>
                  </div>
                ) : (
                  <div className="text-[#7b847b]">
                    در حال دریافت محصولات ویژه...
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Newest Products */}
      <section className="bg-[#faf9f4] py-12 sm:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-8 flex items-center justify-between gap-3">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-bold text-[#8066a2]">
                <Sparkles size={16} />
                تازه‌واردها
              </div>
              <h2 className="text-2xl font-black text-[#283b2d] sm:text-3xl">
                جدیدترین محصولات
              </h2>
            </div>

            <ButtonLink
              to="/products"
              variant="ghost"
              size="sm"
              className="shrink-0 text-[#648767] transition hover:text-[#385e3e] active:scale-95"
            >
              مشاهده همه
              <ArrowLeft size={18} />
            </ButtonLink>
          </div>

          <div className="grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
            {newestProducts.map((product) => (
              <ProductCardHome key={product.id} product={product} />
            ))}

            {newestProducts.length === 0 && (
              <div className="col-span-full py-12 text-center">
                {newestError ? (
                  <div className="rounded-2xl border border-[#f0d6d8] bg-[#fff6f5] p-6 text-[#a64d57]">
                    <div className="mb-3 font-black">
                      خطا در دریافت جدیدترین محصولات
                    </div>
                    <div className="text-sm">{newestError}</div>
                  </div>
                ) : (
                  <div className="text-[#7b847b]">
                    در حال دریافت جدیدترین محصولات...
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-white py-12 sm:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div
            className="
              relative flex flex-col items-center justify-between
              gap-8 overflow-hidden rounded-[2rem]
              bg-gradient-to-l from-[#4e7052] to-[#789575]
              p-8 text-white md:flex-row md:p-12
            "
          >
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-bold">
                <Sparkles size={15} />
                استایل جدید خودت را پیدا کن
              </div>

              <h2 className="mt-5 text-2xl font-black sm:text-3xl">
                آماده‌ای استایل جدیدت را بسازی؟
              </h2>

              <p className="mt-3 max-w-xl leading-7 text-white/85">
                مجموعه‌ای از لباس‌های زنانه، لباس زیر و پوشاک ورزشی با طراحی
                مدرن و کیفیت مناسب.
              </p>
            </div>

            <ButtonLink
              to="/products"
              variant="secondary"
              size="lg"
              className="
                relative z-10 whitespace-nowrap
                !rounded-xl !bg-white !text-[#4e7052]
                transition-all duration-150
                hover:!bg-[#f4f6ee]
                active:scale-95
              "
            >
              <span className="inline-flex items-center gap-2">
                مشاهده فروشگاه
                <ArrowLeft size={19} />
              </span>
            </ButtonLink>

            <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-[#d9cbed]/15" />
          </div>
        </div>
      </section>
    </Layout>
  );
}

export default Home;
