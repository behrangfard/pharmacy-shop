import { useEffect, useState } from "react";

import { Link } from "react-router-dom";

import {
  ArrowLeft,
  ShieldCheck,
  Truck,
  Headphones,
  RotateCcw,
} from "lucide-react";

import Layout from "../components/Layout";
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
            <span className="inline-flex items-center justify-center bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-lg">
              {discountPercent}% تخفیف
            </span>

            <span className="text-gray-400 text-sm line-through">
              {originalPrice.toLocaleString("fa-IR")} تومان
            </span>
          </div>

          <div className="text-blue-600 font-black text-xl">
            {finalPrice.toLocaleString("fa-IR")} تومان
          </div>

          <div className="text-green-600 text-xs font-medium mt-1">
            صرفه‌جویی {discountAmount.toLocaleString("fa-IR")} تومان
          </div>
        </>
      ) : (
        <>
          <div className="text-blue-600 font-black text-xl">
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
        border
        rounded-2xl
        p-6
        bg-white
        hover:shadow-lg
        transition
      "
    >
      <ProductImageBox product={product} />

      <h3 className="font-bold text-lg leading-7">{product.name}</h3>

      {product.short_description && (
        <p className="text-gray-500 mt-3 text-sm leading-6">
          {product.short_description}
        </p>
      )}

      <ProductPrice product={product} />

      <Link
        to={`/product/${product.slug}`}
        className="
          block
          text-center
          bg-blue-600
          text-white
          rounded-xl
          py-3
          mt-5
          font-bold
          hover:bg-blue-700
          transition
        "
      >
        مشاهده محصول
      </Link>
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
              <Link
                to="/products"
                className="
                  inline-flex
                  items-center
                  gap-2
                  bg-white
                  text-blue-700
                  px-6
                  py-3
                  rounded-xl
                  font-bold
                  hover:bg-blue-50
                  transition
                "
              >
                مشاهده محصولات
                <ArrowLeft size={20} />
              </Link>

              <Link
                to="/products?category=medical-equipment"
                className="
                  inline-flex
                  items-center
                  gap-2
                  border
                  border-white/40
                  px-6
                  py-3
                  rounded-xl
                  font-bold
                  hover:bg-white/10
                  transition
                "
              >
                تجهیزات پزشکی
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-center gap-4">
              <div className="bg-blue-50 text-blue-600 p-3 rounded-xl">
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
              <div className="bg-green-50 text-green-600 p-3 rounded-xl">
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
              <div className="bg-purple-50 text-purple-600 p-3 rounded-xl">
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
              <div className="bg-orange-50 text-orange-600 p-3 rounded-xl">
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

            <Link
              to="/products"
              className="
                text-blue-600
                font-bold
                flex
                items-center
                gap-1
              "
            >
              همه محصولات
              <ArrowLeft size={18} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Link
              to="/products?category=medicine"
              className="
                bg-white
                border
                rounded-2xl
                p-6
                hover:border-blue-400
                hover:shadow-md
                transition
              "
            >
              <h3 className="font-bold">دارو و محصولات دارویی</h3>

              <p className="text-sm text-gray-500 mt-2">
                محصولات دارویی و سلامت
              </p>
            </Link>

            <Link
              to="/products?category=medical-equipment"
              className="
                bg-white
                border
                rounded-2xl
                p-6
                hover:border-blue-400
                hover:shadow-md
                transition
              "
            >
              <h3 className="font-bold">تجهیزات پزشکی</h3>

              <p className="text-sm text-gray-500 mt-2">
                تجهیزات و ابزار پزشکی
              </p>
            </Link>

            <Link
              to="/products?category=personal-care"
              className="
                bg-white
                border
                rounded-2xl
                p-6
                hover:border-blue-400
                hover:shadow-md
                transition
              "
            >
              <h3 className="font-bold">بهداشت و مراقبت شخصی</h3>

              <p className="text-sm text-gray-500 mt-2">محصولات مراقبت شخصی</p>
            </Link>

            <Link
              to="/products?category=supplements"
              className="
                bg-white
                border
                rounded-2xl
                p-6
                hover:border-blue-400
                hover:shadow-md
                transition
              "
            >
              <h3 className="font-bold">مکمل‌ها</h3>

              <p className="text-sm text-gray-500 mt-2">ویتامین و مکمل غذایی</p>
            </Link>

            <Link
              to="/products?category=mother-child"
              className="
                bg-white
                border
                rounded-2xl
                p-6
                hover:border-blue-400
                hover:shadow-md
                transition
              "
            >
              <h3 className="font-bold">مادر و کودک</h3>

              <p className="text-sm text-gray-500 mt-2">محصولات مادر و کودک</p>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="bg-white py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black">محصولات ویژه</h2>

            <Link
              to="/products"
              className="
                text-blue-600
                font-bold
                flex
                items-center
                gap-1
              "
            >
              مشاهده همه
              <ArrowLeft size={18} />
            </Link>
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

            <Link
              to="/products"
              className="
                text-blue-600
                font-bold
                flex
                items-center
                gap-1
              "
            >
              مشاهده همه
              <ArrowLeft size={18} />
            </Link>
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

            <Link
              to="/products"
              className="
                bg-blue-600
                text-white
                px-7
                py-3
                rounded-xl
                font-bold
                whitespace-nowrap
                hover:bg-blue-700
                transition
              "
            >
              مشاهده فروشگاه
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}

export default Home;
