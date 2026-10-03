import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ShieldCheck,
  Truck,
  Headphones,
  RotateCcw,
} from "lucide-react";
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
      ? product.thumbnail
      : null;

  if (!imageUrl) {
    return (
      <div
        className="
          h-40
          rounded-xl
          bg-gray-100
          flex
          items-center
          justify-center
          text-gray-400
          mb-5
          transition-all
          duration-300
          group-hover:bg-gray-50
        "
      >
        تصویر محصول
      </div>
    );
  }

  return (
    <div
      className="
        h-40
        rounded-xl
        bg-gray-50
        flex
        items-center
        justify-center
        overflow-hidden
        mb-5
        transition-all
        duration-300
        group-hover:bg-blue-50/40
      "
    >
      <img
        src={imageUrl}
        alt={primaryImage?.alt || product.name}
        className="
          w-full
          h-full
          object-contain
          p-3
          transition-transform
          duration-500
          ease-out
          group-hover:scale-105
        "
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
    <div className="mt-5">
      {hasDiscount ? (
        <>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center justify-center bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-lg transition-transform duration-200 group-hover:scale-105">
              {discountPercent}% تخفیف
            </span>

            <span className="text-gray-400 text-sm line-through">
              {originalPrice.toLocaleString("fa-IR")} تومان
            </span>
          </div>

          <div className="text-blue-600 font-black text-xl transition-colors duration-200 group-hover:text-blue-700">
            {finalPrice.toLocaleString("fa-IR")} تومان
          </div>

          <div className="text-green-600 text-xs font-medium mt-1">
            صرفه‌جویی {discountAmount.toLocaleString("fa-IR")} تومان
          </div>
        </>
      ) : (
        <>
          <div className="text-blue-600 font-black text-xl transition-colors duration-200 group-hover:text-blue-700">
            {originalPrice.toLocaleString("fa-IR")} تومان
          </div>

          {product.compare_price &&
            Number(product.compare_price) > originalPrice && (
              <div className="text-gray-400 text-sm line-through mt-1">
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
        border
        rounded-2xl
        p-6
        bg-white
        hover:shadow-lg
        hover:-translate-y-1
        transition-all
        duration-300
        ease-out
      "
    >
      <ProductImageBox product={product} />

      <h3 className="font-bold text-lg leading-7 transition-colors duration-200 group-hover:text-blue-700">
        {product.name}
      </h3>

      {product.short_description && (
        <p className="text-gray-500 mt-3 text-sm leading-6">
          {product.short_description}
        </p>
      )}

      <ProductPrice product={product} />

      <ButtonLink
        to={`/product/${product.slug}`}
        variant="primary"
        size="md"
        className="
          w-full
          mt-5
          transition-all
          duration-150
          active:scale-95
        "
      >
        مشاهده محصول
        <ArrowLeft
          size={18}
          className="
            transition-transform
            duration-200
            group-hover:translate-x-1
          "
        />
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
      <section className="bg-gradient-to-l from-blue-700 to-blue-500 text-white">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="max-w-2xl">
            <div className="inline-block bg-white/10 px-4 py-2 rounded-full text-sm mb-5">
              آرسن شاپ
            </div>

            <h1 className="text-4xl md:text-5xl font-black leading-tight">
              فروشگاه تجهیزات پزشکی و سلامت
            </h1>

            <p className="mt-6 text-lg text-blue-100 leading-8">
              خرید آسان و مطمئن انواع تجهیزات پزشکی، محصولات سلامت، بهداشت و
              مراقبت شخصی
            </p>

            <div className="flex flex-wrap gap-4 mt-8">
              <ButtonLink
                to="/products"
                variant="secondary"
                size="lg"
                className="
    text-blue-700
    hover:bg-blue-50
    transition-all
    duration-150
    active:scale-95
  "
              >
                <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap">
                  <span>مشاهده محصولات</span>

                  <ArrowLeft
                    size={20}
                    className="shrink-0 transition-transform duration-200"
                  />
                </span>
              </ButtonLink>

              <ButtonLink
                to="/products?category=medical-equipment"
                variant="ghost"
                size="lg"
                className="
                  border
                  border-white/40
                  text-white
                  hover:bg-white/10
                  hover:text-white
                  transition-all
                  duration-150
                  active:scale-95
                "
              >
                تجهیزات پزشکی
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-center gap-4">
              <div className="bg-blue-50 text-blue-600 p-3 rounded-xl transition-transform duration-300 hover:scale-105">
                <Truck size={26} />
              </div>

              <div>
                <h3 className="font-bold">ارسال سریع</h3>

                <p className="text-sm text-gray-500 mt-1">
                  ارسال سریع سفارش‌ها
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="bg-green-50 text-green-600 p-3 rounded-xl transition-transform duration-300 hover:scale-105">
                <ShieldCheck size={26} />
              </div>

              <div>
                <h3 className="font-bold">تضمین اصالت</h3>

                <p className="text-sm text-gray-500 mt-1">
                  محصولات معتبر و اصل
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="bg-purple-50 text-purple-600 p-3 rounded-xl transition-transform duration-300 hover:scale-105">
                <Headphones size={26} />
              </div>

              <div>
                <h3 className="font-bold">پشتیبانی</h3>

                <p className="text-sm text-gray-500 mt-1">
                  پاسخگویی و پشتیبانی
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="bg-orange-50 text-orange-600 p-3 rounded-xl transition-transform duration-300 hover:scale-105">
                <RotateCcw size={26} />
              </div>

              <div>
                <h3 className="font-bold">ضمانت بازگشت</h3>

                <p className="text-sm text-gray-500 mt-1">خرید با خیال راحت</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black">دسته‌بندی محصولات</h2>

            <ButtonLink
              to="/products"
              variant="ghost"
              size="sm"
              className="
                text-blue-600
                transition-all
                duration-150
                active:scale-95
              "
            >
              همه محصولات
              <ArrowLeft
                size={18}
                className="transition-transform duration-200 group-hover:-translate-x-1"
              />
            </ButtonLink>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <ButtonLink
              to="/products?category=medicine"
              variant="ghost"
              size="lg"
              className="
                bg-white
                border
                text-right
                justify-start
                hover:border-blue-400
                hover:shadow-md
                h-full
                transition-all
                duration-200
                active:scale-[0.98]
              "
            >
              <div>
                <h3 className="font-bold">دارو و محصولات دارویی</h3>

                <p className="text-sm text-gray-500 mt-2 font-normal">
                  محصولات دارویی و سلامت
                </p>
              </div>
            </ButtonLink>

            <ButtonLink
              to="/products?category=medical-equipment"
              variant="ghost"
              size="lg"
              className="
                bg-white
                border
                text-right
                justify-start
                hover:border-blue-400
                hover:shadow-md
                h-full
                transition-all
                duration-200
                active:scale-[0.98]
              "
            >
              <div>
                <h3 className="font-bold">تجهیزات پزشکی</h3>

                <p className="text-sm text-gray-500 mt-2 font-normal">
                  تجهیزات و ابزار پزشکی
                </p>
              </div>
            </ButtonLink>

            <ButtonLink
              to="/products?category=personal-care"
              variant="ghost"
              size="lg"
              className="
                bg-white
                border
                text-right
                justify-start
                hover:border-blue-400
                hover:shadow-md
                h-full
                transition-all
                duration-200
                active:scale-[0.98]
              "
            >
              <div>
                <h3 className="font-bold">بهداشت و مراقبت شخصی</h3>

                <p className="text-sm text-gray-500 mt-2 font-normal">
                  محصولات مراقبت شخصی
                </p>
              </div>
            </ButtonLink>

            <ButtonLink
              to="/products?category=supplements"
              variant="ghost"
              size="lg"
              className="
                bg-white
                border
                text-right
                justify-start
                hover:border-blue-400
                hover:shadow-md
                h-full
                transition-all
                duration-200
                active:scale-[0.98]
              "
            >
              <div>
                <h3 className="font-bold">مکمل‌ها</h3>

                <p className="text-sm text-gray-500 mt-2 font-normal">
                  ویتامین و مکمل غذایی
                </p>
              </div>
            </ButtonLink>

            <ButtonLink
              to="/products?category=mother-child"
              variant="ghost"
              size="lg"
              className="
                bg-white
                border
                text-right
                justify-start
                hover:border-blue-400
                hover:shadow-md
                h-full
                transition-all
                duration-200
                active:scale-[0.98]
              "
            >
              <div>
                <h3 className="font-bold">مادر و کودک</h3>

                <p className="text-sm text-gray-500 mt-2 font-normal">
                  محصولات مادر و کودک
                </p>
              </div>
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="bg-white py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black">محصولات ویژه</h2>

            <ButtonLink
              to="/products"
              variant="ghost"
              size="sm"
              className="
                text-blue-600
                transition-all
                duration-150
                active:scale-95
              "
            >
              مشاهده همه
              <ArrowLeft
                size={18}
                className="transition-transform duration-200 group-hover:-translate-x-1"
              />
            </ButtonLink>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
                  <div className="text-gray-500">
                    در حال دریافت محصولات ویژه...
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Newest Products */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black">جدیدترین محصولات</h2>

            <ButtonLink
              to="/products"
              variant="ghost"
              size="sm"
              className="
                text-blue-600
                transition-all
                duration-150
                active:scale-95
              "
            >
              مشاهده همه
              <ArrowLeft
                size={18}
                className="transition-transform duration-200 group-hover:-translate-x-1"
              />
            </ButtonLink>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
                  <div className="text-gray-500">
                    در حال دریافت جدیدترین محصولات...
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div
            className="
              bg-blue-50
              border
              border-blue-100
              rounded-3xl
              p-8
              md:p-12
              flex
              flex-col
              md:flex-row
              items-center
              justify-between
              gap-6
            "
          >
            <div>
              <h2 className="text-2xl font-black">
                محصولات مورد نیازتان را پیدا کنید
              </h2>

              <p className="text-gray-600 mt-3">
                مجموعه‌ای از محصولات پزشکی، سلامت و بهداشت در آرسن شاپ
              </p>
            </div>

            <ButtonLink
              to="/products"
              variant="primary"
              size="lg"
              className="
                whitespace-nowrap
                transition-all
                duration-150
                active:scale-95
              "
            >
              مشاهده فروشگاه
            </ButtonLink>
          </div>
        </div>
      </section>
    </Layout>
  );
}

export default Home;
