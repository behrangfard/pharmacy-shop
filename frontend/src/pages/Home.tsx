import { useEffect, useState } from "react";

import {
  ArrowLeft,
  ShieldCheck,
  Truck,
  Headphones,
  RotateCcw,
  Sparkles,
  Heart,
  Dumbbell,
  Shirt,
  ShoppingBag,
} from "lucide-react";

import { Link } from "react-router-dom";
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

  const imageUrl = primaryImage
    ? `http://127.0.0.1:8000/storage/${primaryImage.path}`
    : product.thumbnail
      ? product.thumbnail.startsWith("http")
        ? product.thumbnail
        : `http://127.0.0.1:8000/storage/${product.thumbnail}`
      : null;

  if (!imageUrl) {
    return (
      <div
        className="
          h-52
          sm:h-56
          w-full
          shrink-0
          rounded-2xl
          bg-slate-50
          flex
          items-center
          justify-center
          text-slate-300
          mb-5
          transition-all
          duration-300
          group-hover:bg-purple-50
        "
      >
        <ShoppingBag size={42} />
      </div>
    );
  }

  return (
    <div
      className="
        h-52
        sm:h-56
        w-full
        shrink-0
        rounded-2xl
        bg-slate-50
        flex
        items-center
        justify-center
        overflow-hidden
        mb-5
        transition-all
        duration-300
        group-hover:bg-purple-50/50
      "
    >
      <img
        src={imageUrl}
        alt={primaryImage?.alt || product.name}
        className="
          w-full
          h-full
          object-contain
          p-4
          transition-transform
          duration-500
          ease-out
          group-hover:scale-105
        "
        onError={(event) => {
          event.currentTarget.style.display = "none";
        }}
      />
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
        mt-3
        min-h-[84px]
        w-full
        flex
        flex-col
        justify-end
        items-start
        text-left
      "
      style={{
        direction: "ltr",
        textAlign: "left",
      }}
    >
      {hasDiscount ? (
        <>
          <div
            className="
              w-full
              flex
              flex-row
              items-center
              justify-start
              gap-2
              mb-2
            "
          >
            <span
              className="
                inline-flex
                items-center
                justify-center
                bg-red-500
                text-white
                text-xs
                font-bold
                px-2.5
                py-1
                rounded-lg
              "
            >
              {discountPercent}% تخفیف
            </span>

            <span
              className="
                text-slate-400
                text-sm
                line-through
              "
            >
              {originalPrice.toLocaleString("fa-IR")} تومان
            </span>
          </div>

          <div
            className="
              w-full
              text-left
              text-purple-700
              font-black
              text-xl
              group-hover:text-purple-800
              transition-colors
            "
          >
            {finalPrice.toLocaleString("fa-IR")} تومان
          </div>

          <div
            className="
              w-full
              text-left
              text-green-600
              text-xs
              font-medium
              mt-1
            "
          >
            صرفه‌جویی {discountAmount.toLocaleString("fa-IR")} تومان
          </div>
        </>
      ) : (
        <>
          <div
            className="
              w-full
              text-left
              text-purple-700
              font-black
              text-xl
              group-hover:text-purple-800
              transition-colors
            "
          >
            {originalPrice.toLocaleString("fa-IR")} تومان
          </div>

          {product.compare_price &&
            Number(product.compare_price) > originalPrice && (
              <div
                className="
                  w-full
                  text-left
                  text-slate-400
                  text-sm
                  line-through
                  mt-1
                "
              >
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
    <div
      className="
        group
        flex
        flex-col
        h-full
        min-w-0
        border
        border-slate-100
        rounded-3xl
        p-4
        sm:p-5
        bg-white
        hover:border-purple-200
        hover:shadow-xl
        hover:-translate-y-1
        transition-all
        duration-300
        ease-out
      "
    >
      <ProductImageBox product={product} />

      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full">
          <Sparkles size={12} />
          انتخاب ویژه
        </span>
      </div>

      <h3
        className="
          font-black
          text-lg
          leading-6
          text-slate-900
          min-h-12
          line-clamp-2
          break-words
          transition-colors
          duration-200
          group-hover:text-purple-700
        "
      >
        {product.name}
      </h3>

      <p
        className="
          mt-2
          min-h-10
          text-sm
          leading-5
          text-slate-500
          line-clamp-2
          break-words
        "
      >
        {product.short_description || "\u00a0"}
      </p>

      <ProductPrice product={product} />

      <ButtonLink
        to={`/product/${product.slug}`}
        variant="primary"
        size="md"
        className="
          w-full
          mt-4
          !bg-purple-600
          hover:!bg-purple-700
          transition-all
          duration-150
          active:scale-95
        "
      >
        <span className="inline-flex items-center justify-center gap-2 w-full">
          مشاهده محصول
          <ArrowLeft
            size={18}
            className="
              transition-transform
              duration-200
              group-hover:-translate-x-1
            "
          />
        </span>
      </ButtonLink>
    </div>
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
        console.log("FEATURED RESPONSE:", response);
        console.log("FEATURED DATA:", response.data);

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
        console.log("NEWEST RESPONSE:", response);
        console.log("NEWEST DATA:", response.data);

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
      <section className="relative overflow-hidden bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
          <div className="relative overflow-hidden rounded-[2rem] shadow-sm">
            <picture>
              <source
                media="(max-width: 639px)"
                srcSet="/images/women-sport-hero-mobile.png"
              />

              <img
                src="/images/women-sport-hero.png"
                alt="لباس زنانه و ورزشی"
                className="block w-full h-auto"
              />
            </picture>

            {/* دکمه قابل کلیک در نسخه موبایل */}
            <Link
              to="/products"
              aria-label="مشاهده محصولات"
              title="مشاهده محصولات"
              className="
          absolute
          left-[67%]
          top-[67%]
          w-[30%]
          h-[8%]
          z-20
          rounded-full
          cursor-pointer
          focus-visible:outline
          focus-visible:outline-2
          focus-visible:outline-purple-600
          sm:hidden
        "
            />

            {/* دکمه قابل کلیک در نسخه دسکتاپ */}
            <Link
              to="/products"
              aria-label="مشاهده محصولات"
              title="مشاهده محصولات"
              className="
          hidden
          sm:block
          absolute
          left-[6.8%]
          top-[55.5%]
          w-[14.5%]
          h-[6%]
          z-20
          rounded-full
          cursor-pointer
          focus-visible:outline
          focus-visible:outline-2
          focus-visible:outline-purple-600
        "
            />

            <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-transparent to-purple-900/5" />
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div
              className="
                flex
                items-center
                gap-4
                rounded-2xl
                bg-slate-50
                border
                border-slate-100
                p-4
                hover:border-purple-100
                hover:bg-purple-50/40
                transition
              "
            >
              <div className="bg-purple-50 text-purple-600 p-3 rounded-xl shrink-0">
                <Truck size={25} />
              </div>

              <div>
                <h3 className="font-black text-slate-800">ارسال سریع</h3>

                <p className="text-sm text-slate-500 mt-1">
                  ارسال سریع سفارش‌ها
                </p>
              </div>
            </div>

            <div
              className="
                flex
                items-center
                gap-4
                rounded-2xl
                bg-slate-50
                border
                border-slate-100
                p-4
                hover:border-purple-100
                hover:bg-purple-50/40
                transition
              "
            >
              <div className="bg-green-50 text-green-600 p-3 rounded-xl shrink-0">
                <ShieldCheck size={25} />
              </div>

              <div>
                <h3 className="font-black text-slate-800">تضمین کیفیت</h3>

                <p className="text-sm text-slate-500 mt-1">محصولات باکیفیت</p>
              </div>
            </div>

            <div
              className="
                flex
                items-center
                gap-4
                rounded-2xl
                bg-slate-50
                border
                border-slate-100
                p-4
                hover:border-purple-100
                hover:bg-purple-50/40
                transition
              "
            >
              <div className="bg-blue-50 text-blue-600 p-3 rounded-xl shrink-0">
                <Headphones size={25} />
              </div>

              <div>
                <h3 className="font-black text-slate-800">پشتیبانی</h3>

                <p className="text-sm text-slate-500 mt-1">
                  پاسخگویی و پشتیبانی
                </p>
              </div>
            </div>

            <div
              className="
                flex
                items-center
                gap-4
                rounded-2xl
                bg-slate-50
                border
                border-slate-100
                p-4
                hover:border-purple-100
                hover:bg-purple-50/40
                transition
              "
            >
              <div className="bg-orange-50 text-orange-600 p-3 rounded-xl shrink-0">
                <RotateCcw size={25} />
              </div>

              <div>
                <h3 className="font-black text-slate-800">ضمانت بازگشت</h3>

                <p className="text-sm text-slate-500 mt-1">خرید با خیال راحت</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-12 sm:py-14 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 text-purple-600 text-sm font-bold mb-2">
                <Sparkles size={16} />
                استایل زنانه
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                دسته‌بندی محصولات
              </h2>
            </div>

            <ButtonLink
              to="/products"
              variant="ghost"
              size="sm"
              className="
                text-purple-600
                hover:text-purple-700
                transition-all
                duration-150
                active:scale-95
              "
            >
              همه محصولات
              <ArrowLeft size={18} />
            </ButtonLink>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <ButtonLink
              to="/products?category=women-underwear"
              variant="ghost"
              size="lg"
              className="
                group
                bg-white
                border
                border-slate-100
                text-right
                justify-start
                hover:border-purple-300
                hover:shadow-lg
                h-full
                rounded-2xl
                transition-all
                duration-200
                active:scale-[0.98]
              "
            >
              <div className="w-full">
                <div className="w-11 h-11 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center mb-4">
                  <Heart size={21} />
                </div>

                <h3 className="font-black text-slate-800">لباس زیر زنانه</h3>

                <p className="text-sm text-slate-500 mt-2 font-normal leading-6">
                  انواع لباس زیر و راحتی
                </p>
              </div>
            </ButtonLink>

            <ButtonLink
              to="/products?category=women-sportswear"
              variant="ghost"
              size="lg"
              className="
                group
                bg-white
                border
                border-slate-100
                text-right
                justify-start
                hover:border-purple-300
                hover:shadow-lg
                h-full
                rounded-2xl
                transition-all
                duration-200
                active:scale-[0.98]
              "
            >
              <div className="w-full">
                <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
                  <Dumbbell size={21} />
                </div>

                <h3 className="font-black text-slate-800">لباس ورزشی</h3>

                <p className="text-sm text-slate-500 mt-2 font-normal leading-6">
                  لباس مناسب ورزش و باشگاه
                </p>
              </div>
            </ButtonLink>

            <ButtonLink
              to="/products?category=tops-tshirts"
              variant="ghost"
              size="lg"
              className="
                group
                bg-white
                border
                border-slate-100
                text-right
                justify-start
                hover:border-purple-300
                hover:shadow-lg
                h-full
                rounded-2xl
                transition-all
                duration-200
                active:scale-[0.98]
              "
            >
              <div className="w-full">
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                  <Shirt size={21} />
                </div>

                <h3 className="font-black text-slate-800">تاپ و تیشرت</h3>

                <p className="text-sm text-slate-500 mt-2 font-normal leading-6">
                  تاپ، تیشرت و لباس‌های روزمره
                </p>
              </div>
            </ButtonLink>

            <ButtonLink
              to="/products?category=leggings-pants"
              variant="ghost"
              size="lg"
              className="
                group
                bg-white
                border
                border-slate-100
                text-right
                justify-start
                hover:border-purple-300
                hover:shadow-lg
                h-full
                rounded-2xl
                transition-all
                duration-200
                active:scale-[0.98]
              "
            >
              <div className="w-full">
                <div className="w-11 h-11 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mb-4">
                  <ShoppingBag size={21} />
                </div>

                <h3 className="font-black text-slate-800">شلوار و لگ</h3>

                <p className="text-sm text-slate-500 mt-2 font-normal leading-6">
                  لگ، شلوار و پوشاک ورزشی
                </p>
              </div>
            </ButtonLink>

            <ButtonLink
              to="/products?category=hoodies-jackets"
              variant="ghost"
              size="lg"
              className="
                group
                bg-white
                border
                border-slate-100
                text-right
                justify-start
                hover:border-purple-300
                hover:shadow-lg
                h-full
                rounded-2xl
                transition-all
                duration-200
                active:scale-[0.98]
              "
            >
              <div className="w-full">
                <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mb-4">
                  <Shirt size={21} />
                </div>

                <h3 className="font-black text-slate-800">هودی و سویشرت</h3>

                <p className="text-sm text-slate-500 mt-2 font-normal leading-6">
                  پوشاک گرم و اسپرت زنانه
                </p>
              </div>
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="bg-white py-12 sm:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 text-purple-600 text-sm font-bold mb-2">
                <Sparkles size={16} />
                پیشنهادهای منتخب
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                محصولات ویژه
              </h2>
            </div>

            <ButtonLink
              to="/products"
              variant="ghost"
              size="sm"
              className="
                text-purple-600
                hover:text-purple-700
                transition-all
                duration-150
                active:scale-95
              "
            >
              مشاهده همه
              <ArrowLeft size={18} />
            </ButtonLink>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 items-stretch gap-5 sm:gap-6">
            {featuredProducts.map((product) => (
              <ProductCardHome key={product.id} product={product} />
            ))}

            {featuredProducts.length === 0 && (
              <div className="col-span-full text-center py-12">
                {featuredError ? (
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700">
                    <div className="font-black mb-3">
                      خطا در دریافت محصولات ویژه
                    </div>

                    <div className="text-sm">{featuredError}</div>
                  </div>
                ) : (
                  <div className="text-slate-500">
                    در حال دریافت محصولات ویژه...
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Newest Products */}
      <section className="bg-slate-50 py-12 sm:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 text-purple-600 text-sm font-bold mb-2">
                <Sparkles size={16} />
                تازه واردها
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                جدیدترین محصولات
              </h2>
            </div>

            <ButtonLink
              to="/products"
              variant="ghost"
              size="sm"
              className="
                text-purple-600
                hover:text-purple-700
                transition-all
                duration-150
                active:scale-95
              "
            >
              مشاهده همه
              <ArrowLeft size={18} />
            </ButtonLink>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 items-stretch gap-5 sm:gap-6">
            {newestProducts.map((product) => (
              <ProductCardHome key={product.id} product={product} />
            ))}

            {newestProducts.length === 0 && (
              <div className="col-span-full text-center py-12">
                {newestError ? (
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700">
                    <div className="font-black mb-3">
                      خطا در دریافت جدیدترین محصولات
                    </div>

                    <div className="text-sm">{newestError}</div>
                  </div>
                ) : (
                  <div className="text-slate-500">
                    در حال دریافت جدیدترین محصولات...
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-12 sm:py-14 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div
            className="
              relative
              overflow-hidden
              bg-gradient-to-l
              from-purple-700
              to-purple-600
              rounded-[2rem]
              p-8
              md:p-12
              flex
              flex-col
              md:flex-row
              items-center
              justify-between
              gap-8
              text-white
            "
          >
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 px-3 py-1.5 rounded-full text-sm font-bold">
                <Sparkles size={15} />
                استایل جدید خودت را پیدا کن
              </div>

              <h2 className="text-2xl sm:text-3xl font-black mt-5">
                آماده‌ای استایل جدیدت را بسازی؟
              </h2>

              <p className="text-purple-100 mt-3 leading-7 max-w-xl">
                مجموعه‌ای از لباس‌های زنانه، لباس زیر و پوشاک ورزشی با طراحی
                مدرن و کیفیت مناسب.
              </p>
            </div>

            <ButtonLink
              to="/products"
              variant="secondary"
              size="lg"
              className="
                relative
                z-10
                whitespace-nowrap
                !bg-white
                !text-purple-700
                hover:!bg-purple-50
                transition-all
                duration-150
                active:scale-95
              "
            >
              <span className="inline-flex items-center gap-2">
                مشاهده فروشگاه
                <ArrowLeft size={19} />
              </span>
            </ButtonLink>

            <div className="absolute -left-16 -bottom-24 w-64 h-64 rounded-full bg-white/10" />
            <div className="absolute -right-20 -top-28 w-72 h-72 rounded-full bg-white/10" />
          </div>
        </div>
      </section>
    </Layout>
  );
}

export default Home;
