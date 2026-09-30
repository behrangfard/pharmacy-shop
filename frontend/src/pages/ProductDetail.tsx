import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  ShoppingCart,
  CheckCircle2,
  Package,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import Layout from "../components/Layout";
import api from "../services/api";
import { useCart } from "../context/CartContext";

interface ProductImage {
  id: number;
  path: string;
  alt?: string | null;
  sort_order: number;
  is_primary: boolean;
}

interface ProductVariant {
  id: number;
  name: string;
  sku: string;
  price?: string | null;
  compare_price?: string | null;
  stock: number;
  image?: string | null;
  is_active: boolean;
}

interface Product {
  id: number;
  name: string;
  slug: string;
  sku: string;
  price: string | number;
  compare_price?: string | number | null;
  discount_percent?: string | number;
  stock: number;
  weight?: string | null;
  thumbnail?: string | null;
  short_description?: string | null;
  description?: string | null;

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

  images?: ProductImage[];
  variants?: ProductVariant[];
}

function ProductDetail() {
  const { slug } = useParams();

  const { addToCart } = useCart();

  const [product, setProduct] =
    useState<Product | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [quantity, setQuantity] =
    useState(1);

  const [selectedImageIndex, setSelectedImageIndex] =
    useState(0);

  useEffect(() => {
    if (!slug) {
      setError("محصول مورد نظر پیدا نشد.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    api
      .get(`/products/${slug}`)
      .then((response) => {
        const productData =
          response.data.data;

        setProduct(productData);
        setSelectedImageIndex(0);
      })
      .catch((error) => {
        console.error(
          "Product detail error:",
          error
        );

        setError(
          "دریافت اطلاعات محصول با مشکل مواجه شد."
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-6 py-20 text-center text-slate-500">
          در حال دریافت اطلاعات محصول...
        </div>
      </Layout>
    );
  }

  if (error || !product) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="bg-white rounded-2xl p-10 text-center">
            <div className="text-xl font-black text-slate-800">
              {error || "محصول پیدا نشد."}
            </div>

            <Link
              to="/products"
              className="
                inline-flex
                items-center
                gap-2
                mt-6
                bg-blue-600
                text-white
                px-5
                py-3
                rounded-xl
                font-bold
                hover:bg-blue-700
                transition
              "
            >
              <ArrowRight size={18} />
              بازگشت به محصولات
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const originalPrice =
    Number(product.price);

  const discountPercent = Math.min(
    Math.max(
      Number(product.discount_percent ?? 0),
      0
    ),
    100
  );

  const discountAmount =
    Math.round(
      (originalPrice * discountPercent) /
        100
    );

  const finalPrice =
    originalPrice - discountAmount;

  const hasDiscount =
    discountPercent > 0 &&
    discountAmount > 0;

  const sortedImages = [
    ...(product.images || []),
  ].sort(
    (a, b) =>
      a.sort_order - b.sort_order
  );

  const galleryImages =
    sortedImages.length > 0
      ? sortedImages
      : product.thumbnail
      ? [
          {
            id: 0,
            path: product.thumbnail,
            alt: product.name,
            sort_order: 0,
            is_primary: true,
          },
        ]
      : [];

  const selectedImage =
    galleryImages[selectedImageIndex] ||
    galleryImages[0];

  const imageUrl = selectedImage
    ? selectedImage.path.startsWith("http")
      ? selectedImage.path
      : `http://127.0.0.1:8000/storage/${selectedImage.path}`
    : null;

  const handlePreviousImage = () => {
    if (galleryImages.length <= 1) {
      return;
    }

    setSelectedImageIndex((current) =>
      current === 0
        ? galleryImages.length - 1
        : current - 1
    );
  };

  const handleNextImage = () => {
    if (galleryImages.length <= 1) {
      return;
    }

    setSelectedImageIndex((current) =>
      current === galleryImages.length - 1
        ? 0
        : current + 1
    );
  };

  const handleAddToCart = () => {
    if (product.stock <= 0) {
      return;
    }

    addToCart({
      id: product.id,
      name: product.name,
      slug: product.slug,

      // قیمت نهایی بعد از تخفیف
      price: finalPrice,

      // قیمت قبل از تخفیف
      originalPrice: originalPrice,

      // درصد تخفیف
      discountPercent: discountPercent,

      thumbnail:
        imageUrl || undefined,

      stock: product.stock,
    });

    // چون addToCart یک عدد به تعداد اضافه می‌کند،
    // برای تعداد بیشتر از یک، باقی موارد را اضافه می‌کنیم.
    for (
      let index = 1;
      index < quantity;
      index++
    ) {
      addToCart({
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: finalPrice,
        originalPrice: originalPrice,
        discountPercent: discountPercent,
        thumbnail:
          imageUrl || undefined,
        stock: product.stock,
      });
    }
  };

  return (
    <Layout>
      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-6">
          <Link
            to="/products"
            className="
              inline-flex
              items-center
              gap-2
              text-sm
              text-slate-500
              hover:text-blue-600
              transition
            "
          >
            <ArrowRight size={17} />
            بازگشت به محصولات
          </Link>
        </div>

        <div
          className="
            bg-white
            rounded-3xl
            border
            border-slate-100
            overflow-hidden
          "
        >
          <div
            className="
              grid
              grid-cols-1
              lg:grid-cols-2
            "
          >
            {/* Images */}
            <div className="p-6 lg:p-8">
              <div
                className="
                  min-h-[420px]
                  bg-slate-50
                  rounded-2xl
                  flex
                  items-center
                  justify-center
                  p-8
                  relative
                  overflow-hidden
                "
              >
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={
                      selectedImage?.alt ||
                      product.name
                    }
                    className="
                      max-w-full
                      max-h-[420px]
                      object-contain
                      transition
                      duration-300
                    "
                  />
                ) : (
                  <div className="text-slate-400">
                    تصویر محصول
                  </div>
                )}

                {hasDiscount && (
                  <span
                    className="
                      absolute
                      top-5
                      right-5
                      bg-red-500
                      text-white
                      px-4
                      py-2
                      rounded-full
                      font-bold
                    "
                  >
                    {discountPercent}% تخفیف
                  </span>
                )}

                {galleryImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={
                        handlePreviousImage
                      }
                      className="
                        absolute
                        right-4
                        top-1/2
                        -translate-y-1/2
                        w-10
                        h-10
                        rounded-full
                        bg-white
                        shadow-md
                        flex
                        items-center
                        justify-center
                        text-slate-700
                        hover:bg-blue-600
                        hover:text-white
                        transition
                      "
                      aria-label="تصویر قبلی"
                    >
                      <ChevronRight
                        size={21}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={
                        handleNextImage
                      }
                      className="
                        absolute
                        left-4
                        top-1/2
                        -translate-y-1/2
                        w-10
                        h-10
                        rounded-full
                        bg-white
                        shadow-md
                        flex
                        items-center
                        justify-center
                        text-slate-700
                        hover:bg-blue-600
                        hover:text-white
                        transition
                      "
                      aria-label="تصویر بعدی"
                    >
                      <ChevronLeft
                        size={21}
                      />
                    </button>
                  </>
                )}
              </div>

              {galleryImages.length > 0 && (
                <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                  {galleryImages.map(
                    (image, index) => {
                      const thumbnailUrl =
                        image.path.startsWith(
                          "http"
                        )
                          ? image.path
                          : `http://127.0.0.1:8000/storage/${image.path}`;

                      return (
                        <button
                          key={
                            image.id ||
                            index
                          }
                          type="button"
                          onClick={() =>
                            setSelectedImageIndex(
                              index
                            )
                          }
                          className={`
                            shrink-0
                            w-20
                            h-20
                            rounded-xl
                            border-2
                            bg-slate-50
                            overflow-hidden
                            transition
                            ${
                              selectedImageIndex ===
                              index
                                ? "border-blue-600 ring-2 ring-blue-100"
                                : "border-slate-200 hover:border-blue-300"
                            }
                          `}
                        >
                          <img
                            src={
                              thumbnailUrl
                            }
                            alt={
                              image.alt ||
                              product.name
                            }
                            className="
                              w-full
                              h-full
                              object-contain
                              p-2
                            "
                          />
                        </button>
                      );
                    }
                  )}
                </div>
              )}

              {galleryImages.length > 1 && (
                <div className="text-center text-xs text-slate-400 mt-2">
                  {(
                    selectedImageIndex + 1
                  ).toLocaleString("fa-IR")}{" "}
                  از{" "}
                  {galleryImages.length.toLocaleString(
                    "fa-IR"
                  )}{" "}
                  تصویر
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="p-8 lg:p-12">
              <div className="flex flex-wrap items-center gap-3 mb-5">
                {product.category && (
                  <Link
                    to={`/products?category=${product.category.slug}`}
                    className="
                      text-sm
                      bg-blue-50
                      text-blue-600
                      px-3
                      py-1.5
                      rounded-lg
                      font-medium
                    "
                  >
                    {product.category.name}
                  </Link>
                )}

                {product.brand && (
                  <span
                    className="
                      text-sm
                      bg-slate-100
                      text-slate-600
                      px-3
                      py-1.5
                      rounded-lg
                    "
                  >
                    {product.brand.name}
                  </span>
                )}
              </div>

              <h1
                className="
                  text-3xl
                  lg:text-4xl
                  font-black
                  text-slate-900
                  leading-relaxed
                "
              >
                {product.name}
              </h1>

              {product.short_description && (
                <p
                  className="
                    text-slate-500
                    leading-8
                    mt-5
                  "
                >
                  {product.short_description}
                </p>
              )}

              {/* Price */}
              <div className="mt-8">
                {hasDiscount ? (
                  <div>
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <span className="inline-flex items-center bg-red-500 text-white px-3 py-1.5 rounded-lg text-sm font-bold">
                        {discountPercent}% تخفیف
                      </span>

                      <span
                        className="
                          text-lg
                          text-slate-400
                          line-through
                        "
                      >
                        {originalPrice.toLocaleString(
                          "fa-IR"
                        )}{" "}
                        تومان
                      </span>
                    </div>

                    <div className="text-3xl font-black text-blue-600">
                      {finalPrice.toLocaleString(
                        "fa-IR"
                      )}{" "}
                      تومان
                    </div>

                    <div className="text-green-600 text-sm font-medium mt-2">
                      صرفه‌جویی{" "}
                      {discountAmount.toLocaleString(
                        "fa-IR"
                      )}{" "}
                      تومان
                    </div>
                  </div>
                ) : (
                  <div className="text-3xl font-black text-blue-600">
                    {originalPrice.toLocaleString(
                      "fa-IR"
                    )}{" "}
                    تومان
                  </div>
                )}
              </div>

              {/* Product Status */}
              <div
                className="
                  mt-8
                  grid
                  grid-cols-1
                  sm:grid-cols-2
                  gap-3
                "
              >
                <div
                  className="
                    flex
                    items-center
                    gap-3
                    bg-slate-50
                    rounded-xl
                    p-4
                  "
                >
                  <Package
                    size={21}
                    className="text-blue-600"
                  />

                  <div>
                    <div className="text-xs text-slate-400">
                      وضعیت موجودی
                    </div>

                    <div className="font-bold text-slate-700 mt-1">
                      {product.stock > 0
                        ? `${product.stock.toLocaleString(
                            "fa-IR"
                          )} عدد موجود`
                        : "ناموجود"}
                    </div>
                  </div>
                </div>

                <div
                  className="
                    flex
                    items-center
                    gap-3
                    bg-slate-50
                    rounded-xl
                    p-4
                  "
                >
                  <CheckCircle2
                    size={21}
                    className="text-green-600"
                  />

                  <div>
                    <div className="text-xs text-slate-400">
                      وضعیت محصول
                    </div>

                    <div className="font-bold text-slate-700 mt-1">
                      محصول فعال
                    </div>
                  </div>
                </div>
              </div>

              {/* Quantity + Cart */}
              {product.stock > 0 && (
                <div className="mt-8">
                  <div className="flex items-center gap-3">
                    <div
                      className="
                        flex
                        items-center
                        border
                        border-slate-200
                        rounded-xl
                        overflow-hidden
                      "
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setQuantity(
                            Math.max(
                              1,
                              quantity - 1
                            )
                          )
                        }
                        className="
                          w-11
                          h-11
                          flex
                          items-center
                          justify-center
                          text-lg
                          hover:bg-slate-50
                        "
                      >
                        −
                      </button>

                      <div
                        className="
                          w-12
                          text-center
                          font-bold
                        "
                      >
                        {quantity.toLocaleString(
                          "fa-IR"
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setQuantity(
                            Math.min(
                              product.stock,
                              quantity + 1
                            )
                          )
                        }
                        className="
                          w-11
                          h-11
                          flex
                          items-center
                          justify-center
                          text-lg
                          hover:bg-slate-50
                        "
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={
                        handleAddToCart
                      }
                      className="
                        flex-1
                        h-12
                        rounded-xl
                        bg-blue-600
                        text-white
                        font-bold
                        flex
                        items-center
                        justify-center
                        gap-2
                        hover:bg-blue-700
                        transition
                      "
                    >
                      <ShoppingCart
                        size={20}
                      />

                      افزودن به سبد خرید
                    </button>
                  </div>
                </div>
              )}

              {product.stock <= 0 && (
                <div
                  className="
                    mt-8
                    rounded-xl
                    bg-red-50
                    text-red-600
                    p-4
                    text-center
                    font-bold
                  "
                >
                  این محصول در حال حاضر موجود نیست.
                </div>
              )}

              <div className="mt-8 pt-6 border-t border-slate-100">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400">
                      کد محصول:
                    </span>

                    <span className="font-bold text-slate-700 mr-2">
                      {product.sku}
                    </span>
                  </div>

                  {product.weight && (
                    <div>
                      <span className="text-slate-400">
                        وزن:
                      </span>

                      <span className="font-bold text-slate-700 mr-2">
                        {product.weight}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {product.description && (
          <div className="mt-8 bg-white rounded-3xl border border-slate-100 p-8">
            <h2 className="text-2xl font-black text-slate-900 mb-5">
              توضیحات محصول
            </h2>

            <div
              className="
                text-slate-600
                leading-9
                whitespace-pre-line
              "
            >
              {product.description}
            </div>
          </div>
        )}
      </section>
    </Layout>
  );
}

export default ProductDetail;