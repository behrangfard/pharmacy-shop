import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { getStorageUrl } from "../utils/images";
import {
  ArrowRight,
  ShoppingCart,
  CheckCircle2,
  Package,
  ChevronLeft,
  ChevronRight,
  Star,
  MessageSquare,
  Send,
  User,
  CalendarDays,
  Layers,
  Ruler,
} from "lucide-react";

import Layout from "../components/Layout";
import Button from "../components/Button";
import SizeGuideModal from "../components/SizeGuide";
import ProductSizeGuide from "../components/ProductSizeGuide";
import { resolveSizeGuideTab, type SizeGuideTabId } from "../data/sizeGuide";
import {
  findSizeGuideRow,
  normalizeProductSizeGuide,
} from "../utils/productSizeGuide";
import api from "../services/api";
import { useCart } from "../context/CartContext";
import { calculateProductPrice } from "../utils/price";
import { usePageMeta } from "../hooks/usePageMeta";
import { SITE_NAME, plainText, type PageMeta } from "../utils/seo";
import {
  breadcrumbJsonLd,
  productJsonLd,
  type BreadcrumbItem,
} from "../utils/structuredData";

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
  sku?: string | null;
  price?: string | number | null;
  compare_price?: string | number | null;
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
  is_taxable?: boolean | number;
  average_rating?: number | string | null;
  reviews_count?: number;
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
  /** راهنمای سایز اختصاصی همین محصول (از پنل مدیریت) */
  size_guide?: unknown;
}

interface ProductReview {
  id: number;
  rating: number;
  title?: string | null;
  comment: string;
  admin_reply?: string | null;
  replied_at?: string | null;
  created_at: string;
  user?: {
    id: number;
    name: string;
  };
}

interface CustomerOrderItem {
  id: number;
  product_id: number | null;
  product_name?: string;
  quantity: number;
}

interface CustomerOrder {
  id: number;
  order_number: string;
  status: string;
  payment_status: string;
  created_at?: string;
  items?: CustomerOrderItem[];
}

function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const { addToCart } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(
    null,
  );
  const [addingToCart, setAddingToCart] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(
    () => searchParams.get("size-guide") === "1",
  );

  // Reviews
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewsCount, setReviewsCount] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState("");

  // Review form and customer orders
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState("");
  const [reviewFormError, setReviewFormError] = useState("");

  /*
   * متای صفحهٔ محصول + دادهٔ ساختاریافته.
   * قیمت اعلام‌شده در JSON-LD همان قیمت نهایی (پس از تخفیف) است؛ تصویر از
   * گالری همان محصول گرفته می‌شود تا در نتایج گوگل درست دیده شود.
   */
  const pageMeta = useMemo<PageMeta | null>(() => {
    if (!product) return null;

    const { finalPrice } = calculateProductPrice(
      product.price,
      product.discount_percent,
    );

    const primaryImage =
      product.thumbnail ||
      product.images?.find((image) => image.is_primary)?.path ||
      product.images?.[0]?.path ||
      null;

    const crumbs: BreadcrumbItem[] = [{ name: "خانه", path: "/" }];

    if (product.category) {
      crumbs.push({
        name: product.category.name,
        path: `/products?category=${product.category.slug}`,
      });
    }

    crumbs.push({ name: product.name, path: `/product/${product.slug}` });

    const description =
      plainText(product.short_description) ||
      plainText(product.description) ||
      `خرید ${product.name} از ${SITE_NAME}`;

    return {
      title: `${product.name} | ${SITE_NAME}`,
      description,
      path: `/product/${product.slug}`,
      image: primaryImage ? getStorageUrl(primaryImage) : null,
      type: "product",
      jsonLd: [
        productJsonLd({
          name: product.name,
          slug: product.slug,
          sku: product.sku,
          price: finalPrice,
          stock: Number(product.stock),
          description,
          image: primaryImage ? getStorageUrl(primaryImage) : null,
          brand: product.brand?.name ?? null,
          category: product.category?.name ?? null,
          averageRating:
            product.average_rating != null
              ? Number(product.average_rating)
              : null,
          reviewsCount: product.reviews_count ?? null,
        }),
        breadcrumbJsonLd(crumbs),
      ],
    };
  }, [product]);

  usePageMeta(pageMeta);


  // Load product
  useEffect(() => {
    if (!slug) {
      setError("محصول مورد نظر پیدا نشد.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    setLoading(true);
    setError("");

    api
      .get(`/products/${slug}`)
      .then((response) => {
        if (cancelled) return;

        const productData = response.data?.data as Product | undefined;

        if (!productData) {
          setError("محصول مورد نظر پیدا نشد.");
          return;
        }

        setProduct(productData);
        setSelectedImageIndex(0);
        setQuantity(1);
        setAddedToCart(false);

        // Select the first available active variant.
        const firstAvailableVariant = (productData.variants ?? []).find(
          (variant) => variant.is_active && Number(variant.stock) > 0,
        );

        setSelectedVariantId(firstAvailableVariant?.id ?? null);
      })
      .catch((error) => {
        if (cancelled) return;

        console.error("Product detail error:", error);
        setError("دریافت اطلاعات محصول با مشکل مواجه شد.");
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Load public approved reviews.
  useEffect(() => {
    if (!slug) return;

    let cancelled = false;

    setReviewsLoading(true);
    setReviewsError("");
    setReviews([]);
    setReviewsCount(0);
    setAverageRating(0);

    api
      .get(`/products/${slug}/reviews`)
      .then((response) => {
        if (cancelled) return;

        const data = response.data?.data;

        const reviewData = data?.reviews;
        const reviewList = Array.isArray(reviewData)
          ? reviewData
          : Array.isArray(reviewData?.data)
            ? reviewData.data
            : [];

        setReviews(reviewList);
        setReviewsCount(
          Number(data?.total ?? reviewData?.total ?? reviewList.length),
        );
        setAverageRating(Number(data?.average_rating ?? 0));
      })
      .catch((error) => {
        if (cancelled) return;

        console.error("Product reviews error:", error);
        setReviewsError("دریافت نظرات محصول با مشکل مواجه شد.");
      })
      .finally(() => {
        if (!cancelled) {
          setReviewsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Load customer orders.
  useEffect(() => {
    if (!slug || !product) return;

    let cancelled = false;

    setOrdersLoading(true);
    setIsLoggedIn(false);
    setOrders([]);

    api
      .get("/orders")
      .then((response) => {
        if (cancelled) return;

        const orderData = response.data?.data;
        const orderList = Array.isArray(orderData) ? orderData : [];

        setOrders(orderList);
        setIsLoggedIn(true);
      })
      .catch((error) => {
        if (cancelled) return;

        setIsLoggedIn(false);
        setOrders([]);

        if (error?.response?.status !== 401) {
          console.error("Customer orders error:", error);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setOrdersLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [slug, product?.id]);

  // Active variants
  const activeVariants = (product?.variants ?? []).filter(
    (variant) => variant.is_active,
  );

  const hasVariants = activeVariants.length > 0;

  const sizeGuideTab: SizeGuideTabId = resolveSizeGuideTab(
    product?.category?.slug,
    activeVariants.map((variant) => variant.name),
  );

  /**
   * راهنمای سایز اختصاصی این محصول؛ اگر مدیر برای همین محصول راهنما
   * نساخته باشد (یا آن را خاموش کرده باشد) مقدار null است و مودال به
   * راهنمای عمومی سایت برمی‌گردد.
   */
  const productSizeGuide = normalizeProductSizeGuide(product?.size_guide);

  const availableVariants = activeVariants.filter(
    (variant) => Number(variant.stock) > 0,
  );

  const selectedVariant =
    activeVariants.find((variant) => variant.id === selectedVariantId) ?? null;

  /** سطر جدول راهنمای سایز که با تنوع انتخاب‌شده می‌خواند */
  const matchedSizeRow =
    productSizeGuide && selectedVariant
      ? findSizeGuideRow(productSizeGuide, selectedVariant.name)
      : null;

  const currentStock = hasVariants
    ? Number(selectedVariant?.stock ?? 0)
    : Number(product?.stock ?? 0);

  const currentBasePrice =
    selectedVariant?.price != null
      ? Number(selectedVariant.price)
      : Number(product?.price ?? 0);

  const currentDiscountPercent = Number(product?.discount_percent ?? 0);

  const currentPrice = calculateProductPrice(
    currentBasePrice,
    currentDiscountPercent,
  );

  const {
    originalPrice,
    discountPercent,
    discountAmount,
    finalPrice,
    hasDiscount,
  } = currentPrice;

  // Product gallery
  const sortedImages = [...(product?.images || [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  );

  const galleryImages =
    sortedImages.length > 0
      ? sortedImages
      : product?.thumbnail
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
    if (!path) return null;

    const trimmedPath = path.trim();

    if (!trimmedPath) return null;

    if (/^https?:\/\//i.test(trimmedPath) || trimmedPath.startsWith("data:")) {
      return trimmedPath;
    }

    return getStorageUrl(trimmedPath);
  };

  // Variant image has priority; otherwise use the selected product image.
  const displayedImagePath = selectedVariant?.image || selectedImage?.path;
  const imageUrl = getImageUrl(displayedImagePath);

  const handleSelectVariant = (variant: ProductVariant) => {
    if (!variant.is_active || Number(variant.stock) <= 0) return;

    setSelectedVariantId(variant.id);
    setQuantity(1);
    setSelectedImageIndex(0);
    setAddedToCart(false);
  };

  const handlePreviousImage = () => {
    if (galleryImages.length <= 1) return;

    setSelectedImageIndex((current) =>
      current === 0 ? galleryImages.length - 1 : current - 1,
    );
  };

  const handleNextImage = () => {
    if (galleryImages.length <= 1) return;

    setSelectedImageIndex((current) =>
      current === galleryImages.length - 1 ? 0 : current + 1,
    );
  };

  const handleAddToCart = async () => {
    if (!product || currentStock <= 0 || addingToCart) return;

    if (hasVariants && !selectedVariant) {
      return;
    }

    if (quantity > currentStock) {
      setQuantity(currentStock);
      return;
    }

    setAddingToCart(true);
    setAddedToCart(false);

    try {
      const cartProduct = {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: finalPrice,
        originalPrice,
        discountPercent,
        thumbnail: imageUrl || undefined,
        stock: currentStock,
        is_taxable: Boolean(product.is_taxable),
        ...(selectedVariant
          ? {
              variant_id: selectedVariant.id,
              variant_name: selectedVariant.name,
              sku: selectedVariant.sku || product.sku,
            }
          : {
              sku: product.sku,
            }),
      };

      for (let index = 0; index < quantity; index++) {
        addToCart(cartProduct);
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

  // Only paid and delivered orders containing this product are eligible.
  const eligibleOrders = orders.filter((order) => {
    const hasProduct = order.items?.some(
      (item) => Number(item.product_id) === product?.id,
    );

    return (
      order.status === "delivered" &&
      order.payment_status === "paid" &&
      hasProduct
    );
  });

  const handleSubmitReview = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setReviewMessage("");
    setReviewFormError("");

    if (!selectedOrderId) {
      setReviewFormError("لطفاً سفارش موردنظر را انتخاب کن.");
      return;
    }

    if (reviewComment.trim().length < 5) {
      setReviewFormError("متن نظر باید حداقل ۵ کاراکتر باشد.");
      return;
    }

    setSubmittingReview(true);

    try {
      const response = await api.post(`/products/${slug}/reviews`, {
        order_id: Number(selectedOrderId),
        rating: reviewRating,
        title: reviewTitle.trim() || null,
        comment: reviewComment.trim(),
      });

      setReviewMessage(
        response.data?.message ||
          "نظر شما با موفقیت ثبت شد و پس از تأیید مدیر نمایش داده می‌شود.",
      );

      setSelectedOrderId("");
      setReviewRating(5);
      setReviewTitle("");
      setReviewComment("");
    } catch (error: any) {
      console.error("Submit product review error:", error);

      const validationErrors = error?.response?.data?.errors;
      const firstValidationError = validationErrors
        ? Object.values(validationErrors).flat()[0]
        : null;

      setReviewFormError(
        (typeof firstValidationError === "string" && firstValidationError) ||
          error?.response?.data?.message ||
          "ثبت نظر با مشکل مواجه شد. لطفاً دوباره تلاش کن.",
      );
    } finally {
      setSubmittingReview(false);
    }
  };

  const renderStars = (rating: number, size = 17) => (
    <div className="inline-flex items-center gap-0.5" dir="ltr">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          className={
            star <= rating ? "fill-gold text-gold" : "text-line-strong"
          }
        />
      ))}
    </div>
  );

  const formatReviewDate = (date?: string) => {
    if (!date) return "";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) return "";

    return parsedDate.toLocaleDateString("fa-IR");
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-6 py-20 text-center text-muted">
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
            <div className="text-xl font-black text-ink">
              {error || "محصول پیدا نشد."}
            </div>

            <Link
              to="/products"
              className="
                inline-flex
                items-center
                gap-2
                mt-6
                bg-brand-600
                text-white
                px-5
                py-3
                rounded-xl
                font-bold
                hover:bg-brand-700
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
              text-muted
              hover:text-brand-600
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
            border-line
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
                  bg-cream
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
                  <div className="text-muted-soft">تصویر محصول</div>
                )}

                {hasDiscount && (
                  <span
                    className="
                      absolute
                      right-4
                      top-4
                      rounded-full
                      bg-discount
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
                        text-ink-soft
                        shadow-md
                        transition-all
                        duration-200
                        hover:bg-brand-600
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
                        text-ink-soft
                        shadow-md
                        transition-all
                        duration-200
                        hover:bg-brand-600
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
                          bg-cream
                          transition-all
                          duration-200
                          ${
                            selectedImageIndex === index
                              ? "scale-100 border-brand-600 ring-2 ring-brand-100"
                              : "border-line hover:border-brand-300"
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
                          <div className="flex h-full w-full items-center justify-center text-muted-soft">
                            <Package size={22} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {galleryImages.length > 1 && (
                <div className="mt-1 text-center text-xs text-muted-soft">
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
                      bg-brand-50
                      text-brand-600
                      px-3
                      py-1.5
                      rounded-lg
                      font-medium
                      transition
                      hover:bg-brand-100
                    "
                  >
                    {product.category.name}
                  </Link>
                )}

                {product.brand && (
                  <span
                    className="
                      text-sm
                      bg-line
                      text-muted
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
                  text-ink
                  leading-relaxed
                "
              >
                {product.name}
              </h1>

              {/* Rating summary */}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {renderStars(Math.round(averageRating))}
                <span className="text-sm font-bold text-ink-soft">
                  {averageRating > 0
                    ? averageRating.toLocaleString("fa-IR", {
                        maximumFractionDigits: 1,
                      })
                    : "بدون امتیاز"}
                </span>
                <a
                  href="#product-reviews"
                  className="text-sm text-brand-600 hover:text-brand-700 transition"
                >
                  ({reviewsCount.toLocaleString("fa-IR")} نظر)
                </a>
              </div>

              {product.short_description && (
                <p className="text-muted leading-8 mt-5">
                  {product.short_description}
                </p>
              )}

              {/* Product Variants */}
              {hasVariants && (
                <div className="mt-7">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Layers size={19} className="text-brand-600" />
                      <h2 className="font-bold text-ink">
                        انتخاب تنوع محصول
                      </h2>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSizeGuideOpen(true)}
                      className="
                        inline-flex items-center gap-1.5 rounded-xl
                        border border-brand-250 bg-brand-50 px-3 py-2
                        text-xs font-bold text-brand-600 transition-colors
                        hover:border-brand-300 hover:bg-brand-100
                        focus-visible:outline-none focus-visible:ring-2
                        focus-visible:ring-brand-400
                      "
                    >
                      <Ruler size={15} aria-hidden="true" />
                      {productSizeGuide
                        ? "راهنمای سایز این محصول"
                        : "راهنمای انتخاب سایز"}
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {activeVariants.map((variant) => {
                      const isSelected = selectedVariantId === variant.id;
                      const isAvailable = Number(variant.stock) > 0;

                      return (
                        <button
                          key={variant.id}
                          type="button"
                          disabled={!isAvailable}
                          onClick={() => handleSelectVariant(variant)}
                          aria-pressed={isSelected}
                          className={`
                            rounded-xl
                            border
                            px-4
                            py-3
                            text-sm
                            font-bold
                            transition
                            ${
                              isSelected
                                ? "border-brand-700 bg-brand-75 text-brand-700 ring-2 ring-brand-700/10"
                                : "border-line bg-white text-ink-soft hover:border-brand-400"
                            }
                            ${
                              !isAvailable
                                ? "cursor-not-allowed opacity-40 line-through"
                                : ""
                            }
                          `}
                        >
                          {variant.name}
                          {!isAvailable && (
                            <span className="mr-1 text-xs">(ناموجود)</span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {availableVariants.length === 0 ? (
                    <p className="mt-3 text-sm text-discount">
                      تمام تنوع‌های این محصول در حال حاضر ناموجود هستند.
                    </p>
                  ) : !selectedVariant ? (
                    <p className="mt-3 text-sm text-discount">
                      لطفاً یکی از تنوع‌های موجود را انتخاب کن.
                    </p>
                  ) : null}

                  {/* خلاصهٔ اندازه‌های سایز انتخاب‌شده از راهنمای سایز خود محصول */}
                  {productSizeGuide && selectedVariant && (
                    <div className="mt-3 rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3">
                      <p className="text-[11.5px] font-bold text-brand-700">
                        اندازه‌های سایز «{selectedVariant.name}» در این محصول
                      </p>

                      {matchedSizeRow &&
                      productSizeGuide.columns.length > 1 ? (
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-muted">
                          {productSizeGuide.columns
                            .slice(1)
                            .map((column, index) => (
                              <span key={`${column}-${index}`}>
                                {column}:{" "}
                                <b className="text-ink">
                                  {matchedSizeRow[index + 1] || "—"}
                                </b>
                              </span>
                            ))}
                        </div>
                      ) : (
                        <p className="mt-1.5 text-[11px] leading-6 text-muted-soft">
                          برای دیدن اندازه‌های دقیق، جدول راهنمای سایز این
                          محصول را باز کنید.
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={() => setSizeGuideOpen(true)}
                        className="mt-2 text-[11px] font-bold text-brand-600 underline underline-offset-4 hover:text-brand-700"
                      >
                        مشاهدهٔ راهنمای کامل این مدل
                      </button>
                    </div>
                  )}
                </div>
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
                          bg-discount
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
                          text-muted-soft
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
                        text-brand-600
                        text-left
                      "
                    >
                      {finalPrice.toLocaleString("fa-IR")} تومان
                    </div>

                    <div
                      className="
                        w-full
                        text-stock
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
                      text-brand-600
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
                    bg-cream
                    rounded-xl
                    p-4
                  "
                >
                  <Package size={21} className="text-brand-600" />

                  <div>
                    <div className="text-xs text-muted-soft">وضعیت موجودی</div>

                    <div className="font-bold text-ink-soft mt-1">
                      {currentStock > 0
                        ? `${currentStock.toLocaleString("fa-IR")} عدد موجود`
                        : "ناموجود"}
                    </div>
                  </div>
                </div>

                <div
                  className="
                    flex
                    items-center
                    gap-3
                    bg-cream
                    rounded-xl
                    p-4
                  "
                >
                  <CheckCircle2 size={21} className="text-stock" />

                  <div>
                    <div className="text-xs text-muted-soft">وضعیت محصول</div>

                    <div className="font-bold text-ink-soft mt-1">
                      محصول فعال
                    </div>
                  </div>
                </div>
              </div>

              {/* Quantity + Cart */}
              {currentStock > 0 && (!hasVariants || selectedVariant) && (
                <div className="mt-8">
                  <div className="flex items-center gap-3">
                    <div
                      className="
                        flex
                        items-center
                        border
                        border-line
                        rounded-xl
                        overflow-hidden
                        bg-white
                      "
                    >
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                        className="
                          w-11
                          h-11
                          flex
                          items-center
                          justify-center
                          text-lg
                          transition-all
                          duration-150
                          hover:bg-brand-75
                          hover:text-brand-700
                          active:scale-90
                          disabled:opacity-40
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
                          setQuantity(Math.min(currentStock, quantity + 1))
                        }
                        disabled={quantity >= currentStock}
                        className="
                          w-11
                          h-11
                          flex
                          items-center
                          justify-center
                          text-lg
                          transition-all
                          duration-150
                          hover:bg-brand-75
                          hover:text-brand-700
                          active:scale-90
                          disabled:opacity-40
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

              {currentStock <= 0 && (
                <div
                  className="
                    mt-8
                    rounded-xl
                    bg-blush-50
                    text-discount
                    p-4
                    text-center
                    font-bold
                  "
                >
                  {hasVariants &&
                  availableVariants.length > 0 &&
                  !selectedVariant
                    ? "برای مشاهده موجودی، یک تنوع انتخاب کن."
                    : "این محصول در حال حاضر موجود نیست."}
                </div>
              )}

              <div className="mt-8 pt-6 border-t border-line">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center whitespace-nowrap">
                    <span className="text-muted-soft">
                      {selectedVariant ? "کد تنوع:" : "کد محصول:"}
                    </span>

                    <span className="font-bold text-ink-soft mr-2 whitespace-nowrap">
                      {selectedVariant?.sku || product.sku}
                    </span>
                  </div>

                  {product.weight && (
                    <div>
                      <span className="text-muted-soft">وزن:</span>

                      <span className="font-bold text-ink-soft mr-2">
                        {product.weight}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Product Description */}
        {product.description && (
          <div className="mt-8 bg-white rounded-3xl border border-line p-8">
            <h2 className="text-2xl font-black text-ink mb-5">
              توضیحات محصول
            </h2>

            <div
              className="
                text-muted
                leading-9
                whitespace-pre-line
              "
            >
              {product.description}
            </div>
          </div>
        )}

        {/* Product Reviews */}
        <section
          id="product-reviews"
          className="mt-8 bg-white rounded-3xl border border-line p-6 sm:p-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 border-b border-line pb-6">
            <div>
              <div className="flex items-center gap-2">
                <MessageSquare className="text-brand-600" size={23} />
                <h2 className="text-2xl font-black text-ink">
                  نظرات کاربران
                </h2>
              </div>

              <p className="text-sm text-muted mt-2">
                تجربه خرید و نظر کاربران درباره این محصول
              </p>
            </div>

            <div className="flex items-center gap-4 rounded-2xl bg-cream px-5 py-4">
              <div className="text-center">
                <div className="text-3xl font-black text-ink">
                  {averageRating > 0
                    ? averageRating.toLocaleString("fa-IR", {
                        maximumFractionDigits: 1,
                      })
                    : "—"}
                </div>
                <div className="mt-1">
                  {renderStars(Math.round(averageRating), 15)}
                </div>
              </div>

              <div className="border-r border-line pr-4">
                <div className="font-bold text-ink">
                  {reviewsCount.toLocaleString("fa-IR")}
                </div>
                <div className="text-xs text-muted mt-1">نظر ثبت‌شده</div>
              </div>
            </div>
          </div>

          {/* Review List */}
          <div className="py-6">
            {reviewsLoading ? (
              <div className="py-8 text-center text-muted-soft">
                در حال دریافت نظرات...
              </div>
            ) : reviewsError ? (
              <div className="py-6 text-center text-sm text-discount">
                {reviewsError}
              </div>
            ) : reviews.length === 0 ? (
              <div className="py-10 text-center">
                <MessageSquare size={36} className="mx-auto text-line-strong" />
                <p className="font-bold text-muted mt-3">
                  هنوز نظری برای این محصول ثبت نشده است.
                </p>
                <p className="text-sm text-muted-soft mt-2">
                  اولین نفری باش که تجربه‌اش را با دیگران به اشتراک می‌گذارد.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {reviews.map((review) => (
                  <article
                    key={review.id}
                    className="rounded-2xl border border-line p-5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                          <User size={21} />
                        </div>

                        <div>
                          <div className="font-bold text-ink">
                            {review.user?.name || "کاربر"}
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-muted-soft mt-1">
                            <CalendarDays size={13} />
                            {formatReviewDate(review.created_at)}
                          </div>
                        </div>
                      </div>

                      {renderStars(review.rating)}
                    </div>

                    {review.title && (
                      <h3 className="font-bold text-ink mt-4">
                        {review.title}
                      </h3>
                    )}

                    <p className="text-sm text-muted leading-8 mt-3 whitespace-pre-line">
                      {review.comment}
                    </p>

                    {review.admin_reply && (
                      <div className="mt-5 rounded-xl bg-brand-50 border border-brand-100 p-4">
                        <div className="flex items-center gap-2 text-sm font-bold text-brand-700">
                          <MessageSquare size={16} />
                          پاسخ فروشگاه
                        </div>

                        <p className="text-sm text-muted leading-7 mt-2 whitespace-pre-line">
                          {review.admin_reply}
                        </p>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>

          {/* Review Form */}
          <div className="border-t border-line pt-7">
            <div className="flex items-center gap-2 mb-2">
              <Send size={20} className="text-brand-600" />
              <h3 className="text-xl font-black text-ink">
                ثبت نظر درباره محصول
              </h3>
            </div>

            <p className="text-sm text-muted leading-7 mb-6">
              ثبت نظر فقط برای سفارش‌های پرداخت‌شده و تحویل‌شده امکان‌پذیر است.
              نظر شما پس از بررسی مدیر در صفحه محصول نمایش داده می‌شود.
            </p>

            {!isLoggedIn && !ordersLoading && (
              <div className="rounded-2xl bg-brand-50 border border-brand-100 p-5">
                <p className="text-sm text-ink-soft leading-7">
                  برای ثبت نظر ابتدا وارد حساب کاربری خود شوید.
                </p>

                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 mt-4 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-700 transition"
                >
                  ورود به حساب کاربری
                  <ArrowRight size={16} />
                </Link>
              </div>
            )}

            {isLoggedIn && ordersLoading && (
              <div className="py-6 text-center text-sm text-muted-soft">
                در حال بررسی سفارش‌های شما...
              </div>
            )}

            {isLoggedIn && !ordersLoading && eligibleOrders.length === 0 && (
              <div className="rounded-2xl bg-cream border border-line p-5">
                <p className="text-sm text-muted leading-7">
                  در حال حاضر سفارش پرداخت‌شده و تحویل‌شده‌ای شامل این محصول
                  برای ثبت نظر پیدا نشد.
                </p>
              </div>
            )}

            {isLoggedIn && !ordersLoading && eligibleOrders.length > 0 && (
              <form onSubmit={handleSubmitReview} className="space-y-5">
                <div>
                  <label
                    htmlFor="review-order"
                    className="block text-sm font-bold text-ink-soft mb-2"
                  >
                    انتخاب سفارش
                  </label>

                  <select
                    id="review-order"
                    value={selectedOrderId}
                    onChange={(event) => setSelectedOrderId(event.target.value)}
                    required
                    className="
                      w-full
                      rounded-xl
                      border
                      border-line
                      bg-white
                      px-4
                      py-3
                      text-sm
                      text-ink-soft
                      outline-none
                      focus:border-brand-500
                      focus:ring-2
                      focus:ring-brand-100
                    "
                  >
                    <option value="">سفارش موردنظر را انتخاب کنید</option>

                    {eligibleOrders.map((order) => (
                      <option key={order.id} value={order.id}>
                        {order.order_number}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-ink-soft mb-3">
                    امتیاز شما به محصول
                  </label>

                  <div className="flex items-center gap-2" dir="ltr">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => setReviewRating(rating)}
                        aria-label={`${rating} ستاره`}
                        aria-pressed={reviewRating === rating}
                        className="rounded-lg p-1 transition-transform hover:scale-110"
                      >
                        <Star
                          size={29}
                          className={
                            rating <= reviewRating
                              ? "fill-gold text-gold"
                              : "text-line-strong"
                          }
                        />
                      </button>
                    ))}
                  </div>

                  <p className="text-xs text-muted-soft mt-2">
                    {reviewRating.toLocaleString("fa-IR")} از ۵
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="review-title"
                    className="block text-sm font-bold text-ink-soft mb-2"
                  >
                    عنوان نظر (اختیاری)
                  </label>

                  <input
                    id="review-title"
                    type="text"
                    maxLength={150}
                    value={reviewTitle}
                    onChange={(event) => setReviewTitle(event.target.value)}
                    placeholder="خلاصه‌ای از تجربه شما"
                    className="
                      w-full
                      rounded-xl
                      border
                      border-line
                      bg-white
                      px-4
                      py-3
                      text-sm
                      outline-none
                      transition
                      focus:border-brand-500
                      focus:ring-2
                      focus:ring-brand-100
                    "
                  />
                </div>

                <div>
                  <label
                    htmlFor="review-comment"
                    className="block text-sm font-bold text-ink-soft mb-2"
                  >
                    متن نظر
                  </label>

                  <textarea
                    id="review-comment"
                    rows={5}
                    maxLength={3000}
                    required
                    minLength={5}
                    value={reviewComment}
                    onChange={(event) => setReviewComment(event.target.value)}
                    placeholder="تجربه خود از خرید و استفاده این محصول را بنویسید..."
                    className="
                      w-full
                      resize-y
                      rounded-xl
                      border
                      border-line
                      bg-white
                      px-4
                      py-3
                      text-sm
                      leading-7
                      outline-none
                      transition
                      focus:border-brand-500
                      focus:ring-2
                      focus:ring-brand-100
                    "
                  />

                  <div className="text-left text-xs text-muted-soft mt-1">
                    {reviewComment.length.toLocaleString("fa-IR")} / ۳۰۰۰
                  </div>
                </div>

                {reviewFormError && (
                  <div className="rounded-xl bg-blush-50 border border-blush-100 px-4 py-3 text-sm text-discount leading-7">
                    {reviewFormError}
                  </div>
                )}

                {reviewMessage && (
                  <div className="rounded-xl bg-brand-50 border border-brand-100 px-4 py-3 text-sm text-stock-700 leading-7">
                    <div className="flex items-center gap-2 font-bold mb-1">
                      <CheckCircle2 size={17} />
                      نظر ثبت شد
                    </div>
                    {reviewMessage}
                  </div>
                )}

                <Button
                  type="submit"
                  loading={submittingReview}
                  disabled={submittingReview}
                  variant="primary"
                  size="lg"
                  fullWidth
                  icon={<Send size={18} />}
                >
                  ثبت نظر
                </Button>
              </form>
            )}
          </div>
        </section>
      </section>

      <SizeGuideModal
        open={sizeGuideOpen}
        onClose={() => setSizeGuideOpen(false)}
        initialTab={sizeGuideTab}
        title={productSizeGuide?.title || undefined}
        subtitle={
          productSizeGuide
            ? "اندازه‌ها و توضیحات سایزبندی همین محصول."
            : undefined
        }
      >
        {productSizeGuide ? (
          <ProductSizeGuide
            guide={productSizeGuide}
            selectedSize={selectedVariant?.name ?? null}
          />
        ) : undefined}
      </SizeGuideModal>
    </Layout>
  );
}

export default ProductDetail;
