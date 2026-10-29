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
import Button from "../components/Button";
import api from "../services/api";
import { useCart } from "../context/CartContext";
import { calculateProductPrice } from "../utils/price";

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
  const { slug } = useParams<{ slug: string }>();
  const { addToCart } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

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
        const productData = response.data?.data;

        if (!productData) {
          setError("محصول مورد نظر پیدا نشد.");
          return;
        }

        setProduct(productData);
        setSelectedImageIndex(0);
        setQuantity(1);
        setAddedToCart(false);
      })
      .catch((error) => {
        console.error("Product detail error:", error);
        setError("دریافت اطلاعات محصول با مشکل مواجه شد.");
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

  const {
    originalPrice,
    discountPercent,
    discountAmount,
    finalPrice,
    hasDiscount,
  } = calculateProductPrice(product.price, product.discount_percent);

  const sortedImages = [...(product.images || [])].sort(
    (a, b) => a.sort_order - b.sort_order,
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

  const selectedImage = galleryImages[selectedImageIndex] || galleryImages[0];

  const getImageUrl = (path?: string | null) => {
    if (!path) {
      return null;
    }

    const trimmedPath = path.trim();

    if (!trimmedPath) {
      return null;
    }

    if (/^https?:\/\//i.test(trimmedPath) || trimmedPath.startsWith("data:")) {
      return trimmedPath;
    }

    // VITE_API_URL may be either the API root (for example, /api) or
    // the backend root. Image files are served from the backend /storage path.
    const configuredApiUrl = import.meta.env.VITE_API_URL as string | undefined;
    const backendUrl = (configuredApiUrl?.trim() || "http://127.0.0.1:8000")
      .replace(/\/+$/, "")
      .replace(/\/api$/i, "");

    // Handle paths stored as "products/file.jpg", "/products/file.jpg",
    // or "storage/products/file.jpg" without duplicating /storage.
    const cleanPath = trimmedPath
      .replace(/^\/+/, "")
      .replace(/^storage\//i, "");

    return `${backendUrl}/storage/${cleanPath}`;
  };

  const imageUrl = getImageUrl(selectedImage?.path);

  const handlePreviousImage = () => {
    if (galleryImages.length <= 1) {
      return;
    }

    setSelectedImageIndex((current) =>
      current === 0 ? galleryImages.length - 1 : current - 1,
    );
  };

  const handleNextImage = () => {
    if (galleryImages.length <= 1) {
      return;
    }

    setSelectedImageIndex((current) =>
      current === galleryImages.length - 1 ? 0 : current + 1,
    );
  };

  const handleAddToCart = async () => {
    if (product.stock <= 0 || addingToCart) {
      return;
    }

    setAddingToCart(true);
    setAddedToCart(false);

    try {
      addToCart({
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: finalPrice,
        originalPrice,
        discountPercent,
        thumbnail: imageUrl || undefined,
        stock: product.stock,
      });

      for (let index = 1; index < quantity; index++) {
        addToCart({
          id: product.id,
          name: product.name,
          slug: product.slug,
          price: finalPrice,
          originalPrice,
          discountPercent,
          thumbnail: imageUrl || undefined,
          stock: product.stock,
        });
      }

      setAddedToCart(true);

      window.setTimeout(() => {
        setAddedToCart(false);
      }, 1800);
    } finally {
      window.setTimeout(() => {
        setAddingToCart(false);
      }, 450);
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
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Images */}
            <div className="min-w-0 p-6 lg:p-8">
              <div
                className="
                  relative
                  flex
                  min-h-[420px]
                  w-full
                  items-center
                  justify-center
                  overflow-hidden
                  rounded-2xl
                  bg-slate-50
                  p-6
                  sm:p-8
                "
              >
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={selectedImage?.alt || product.name}
                    className="
                      block
                      max-h-[420px]
                      max-w-full
                      object-contain
                      transition
                      duration-300
                    "
                  />
                ) : (
                  <div className="text-slate-400">تصویر محصول</div>
                )}

                {hasDiscount && (
                  <span
                    className="
                      absolute
                      right-4
                      top-4
                      rounded-full
                      bg-red-500
                      px-4
                      py-2
                      font-bold
                      text-white
                    "
                  >
                    {discountPercent}% تخفیف
                  </span>
                )}

                {galleryImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={handlePreviousImage}
                      className="
                        absolute
                        right-3
                        top-1/2
                        flex
                        h-10
                        w-10
                        -translate-y-1/2
                        items-center
                        justify-center
                        rounded-full
                        bg-white
                        text-slate-700
                        shadow-md
                        transition-all
                        duration-200
                        hover:bg-blue-600
                        hover:text-white
                        active:scale-90
                      "
                      aria-label="تصویر قبلی"
                    >
                      <ChevronRight size={21} />
                    </button>

                    <button
                      type="button"
                      onClick={handleNextImage}
                      className="
                        absolute
                        left-3
                        top-1/2
                        flex
                        h-10
                        w-10
                        -translate-y-1/2
                        items-center
                        justify-center
                        rounded-full
                        bg-white
                        text-slate-700
                        shadow-md
                        transition-all
                        duration-200
                        hover:bg-blue-600
                        hover:text-white
                        active:scale-90
                      "
                      aria-label="تصویر بعدی"
                    >
                      <ChevronLeft size={21} />
                    </button>
                  </>
                )}
              </div>

              {galleryImages.length > 0 && (
                <div
                  className="
                    relative
                    mt-5
                    flex
                    w-full
                    min-w-0
                    flex-nowrap
                    items-center
                    gap-3
                    overflow-x-auto
                    overflow-y-hidden
                    px-1
                    py-2
                  "
                >
                  {galleryImages.map((image, index) => {
                    const thumbnailUrl = getImageUrl(image.path);

                    return (
                      <button
                        key={image.id || index}
                        type="button"
                        onClick={() => setSelectedImageIndex(index)}
                        aria-label={`نمایش تصویر شماره ${index + 1}`}
                        aria-pressed={selectedImageIndex === index}
                        className={`
                          relative
                          box-border
                          h-20
                          w-20
                          shrink-0
                          overflow-hidden
                          rounded-xl
                          border-2
                          bg-slate-50
                          transition-all
                          duration-200
                          ${
                            selectedImageIndex === index
                              ? "scale-100 border-blue-600 ring-2 ring-blue-100"
                              : "border-slate-200 hover:border-blue-300"
                          }
                        `}
                      >
                        {thumbnailUrl ? (
                          <img
                            src={thumbnailUrl}
                            alt={image.alt || product.name}
                            className="block h-full w-full object-contain p-2"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-slate-400">
                            <Package size={22} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {galleryImages.length > 1 && (
                <div className="mt-1 text-center text-xs text-slate-400">
                  {(selectedImageIndex + 1).toLocaleString("fa-IR")} از{" "}
                  {galleryImages.length.toLocaleString("fa-IR")} تصویر
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
                      transition
                      hover:bg-blue-100
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
              <div
                className="
                  mt-8
                  w-full
                  flex
                  flex-col
                  items-start
                  justify-start
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
                        gap-3
                        mb-3
                      "
                    >
                      <span
                        className="
                          inline-flex
                          items-center
                          bg-red-500
                          text-white
                          px-3
                          py-1.5
                          rounded-lg
                          text-sm
                          font-bold
                        "
                      >
                        {discountPercent}% تخفیف
                      </span>

                      <span
                        className="
                          text-lg
                          text-slate-400
                          line-through
                          text-left
                        "
                      >
                        {originalPrice.toLocaleString("fa-IR")} تومان
                      </span>
                    </div>

                    <div
                      className="
                        w-full
                        text-3xl
                        font-black
                        text-blue-600
                        text-left
                      "
                    >
                      {finalPrice.toLocaleString("fa-IR")} تومان
                    </div>

                    <div
                      className="
                        w-full
                        text-green-600
                        text-sm
                        font-medium
                        mt-2
                        text-left
                      "
                    >
                      صرفه‌جویی {discountAmount.toLocaleString("fa-IR")} تومان
                    </div>
                  </>
                ) : (
                  <div
                    className="
                      w-full
                      text-3xl
                      font-black
                      text-blue-600
                      text-left
                    "
                  >
                    {originalPrice.toLocaleString("fa-IR")} تومان
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
                  <Package size={21} className="text-blue-600" />

                  <div>
                    <div className="text-xs text-slate-400">وضعیت موجودی</div>

                    <div className="font-bold text-slate-700 mt-1">
                      {product.stock > 0
                        ? `${product.stock.toLocaleString("fa-IR")} عدد موجود`
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
                  <CheckCircle2 size={21} className="text-green-600" />

                  <div>
                    <div className="text-xs text-slate-400">وضعیت محصول</div>

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
                        bg-white
                      "
                    >
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="
                          w-11
                          h-11
                          flex
                          items-center
                          justify-center
                          text-lg
                          transition-all
                          duration-150
                          hover:bg-[#f0f3e9]
                          hover:text-[#385e3e]
                          active:scale-90
                        "
                      >
                        −
                      </button>
                      <div
                        className="
                          w-12
                          text-center
                          font-bold
                          select-none
                        "
                      >
                        {quantity.toLocaleString("fa-IR")}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setQuantity(Math.min(product.stock, quantity + 1))
                        }
                        className="
                          w-11
                          h-11
                          flex
                          items-center
                          justify-center
                          text-lg
                          transition-all
                          duration-150
                          hover:bg-[#f0f3e9]
                          hover:text-[#385e3e]
                          active:scale-90
                        "
                      >
                        +
                      </button>
                    </div>

                    <div className="flex-1">
                      <Button
                        type="button"
                        onClick={handleAddToCart}
                        loading={addingToCart}
                        disabled={addingToCart}
                        variant={addedToCart ? "success" : "primary"}
                        size="lg"
                        fullWidth
                        icon={
                          addedToCart ? (
                            <CheckCircle2 size={20} />
                          ) : (
                            <ShoppingCart size={20} />
                          )
                        }
                      >
                        {addedToCart
                          ? "به سبد خرید اضافه شد"
                          : "افزودن به سبد خرید"}
                      </Button>
                    </div>
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
                  <div className="flex items-center whitespace-nowrap">
                    <span className="text-slate-400">کد محصول:</span>

                    <span className="font-bold text-slate-700 mr-2 whitespace-nowrap">
                      {product.sku}
                    </span>
                  </div>

                  {product.weight && (
                    <div>
                      <span className="text-slate-400">وزن:</span>

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
