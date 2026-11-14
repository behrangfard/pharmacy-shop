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
  Heart,
  Loader2,
  Palette,
  Check,
  CreditCard,
  Link2,
  MessageCircle,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react";

import Layout from "../components/Layout";
import Button from "../components/Button";
import ProductCard from "../components/ProductCard";
import RecentlyViewed from "../components/RecentlyViewed";
import SizeGuideModal from "../components/SizeGuide";
import ProductSizeGuide from "../components/ProductSizeGuide";
import { resolveSizeGuideTab, type SizeGuideTabId } from "../data/sizeGuide";
import {
  findSizeGuideRow,
  normalizeProductSizeGuide,
} from "../utils/productSizeGuide";
import api from "../services/api";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import type { WishlistProduct } from "../services/wishlist";
import { recordProductView } from "../services/recentlyViewed";
import { calculateProductPrice } from "../utils/price";
import { formatJalaliDateTime } from "../utils/jalali";
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

interface ProductColor {
  id: number;
  name: string;
  hex?: string | null;
  image?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

interface ProductPackItem {
  id: number;
  name: string;
  quantity: number;
  /** نام رنگ‌های مجاز این قطعه از پالت رنگ محصول. */
  colors?: string[] | null;
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
  /**
   * آیا این کالا ضمانت بازگشت دارد؟ کالاهای بهداشتی (مثل لباس زیر) این
   * قابلیت را ندارند و پنل مدیریت این گزینه را برایشان خاموش می‌کند.
   */
  is_returnable?: boolean | number;
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
  /** پالت رنگ محصول؛ مشتری یکی از آن‌ها را انتخاب می‌کند. */
  colors?: ProductColor[];
  /** قطعات پک چندعددی؛ هر قطعه می‌تواند رنگ جداگانه داشته باشد. */
  pack_items?: ProductPackItem[];
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

/**
 * نشان‌های اعتمادِ کنار جعبهٔ خرید (مثل فروشگاه‌های مرجع).
 *
 * متن‌ها ثابت و کوتاه‌اند و فقط نقش اطمینان‌بخشی دارند؛ آیکن هر مورد هم
 * همان‌جای همین آرایه تعیین می‌شود تا چیدمان بالا شلوغ نشود.
 */
const TRUST_ITEMS = [
  {
    key: "authentic",
    label: "ضمانت اصالت کالا",
    hint: "تضمین اصل بودن",
    icon: ShieldCheck,
  },
  {
    key: "return",
    label: "ضمانت بازگشت",
    hint: "تا ۷ روز",
    icon: RotateCcw,
  },
  {
    key: "express",
    label: "تحویل اکسپرس",
    hint: "ارسال سریع",
    icon: Truck,
  },
  {
    key: "payment",
    label: "پرداخت امن",
    hint: "درگاه مطمئن",
    icon: CreditCard,
  },
];

/** حداکثر تعداد کارت در ردیف «محصولات مرتبط» پایین صفحه. */
const RELATED_PRODUCTS_LIMIT = 5;

function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const { addToCart } = useCart();
  const {
    isWishlisted,
    toggle: toggleWishlist,
    count: wishlistCount,
  } = useWishlist();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(
    null,
  );
  /** رنگ انتخاب‌شدهٔ محصول (نام رنگ از پالت). */
  const [selectedColorName, setSelectedColorName] = useState("");
  /** رنگ انتخاب‌شده برای هر قطعهٔ پک، کلید = شناسهٔ قطعه. */
  const [selectedPackColors, setSelectedPackColors] = useState<
    Record<number, string>
  >({});
  const [addingToCart, setAddingToCart] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [wishlistBusy, setWishlistBusy] = useState(false);
  const [wishlistError, setWishlistError] = useState("");
  const [sizeGuideOpen, setSizeGuideOpen] = useState(
    () => searchParams.get("size-guide") === "1",
  );
  /** بازخورد کوتاه «لینک کپی شد» در ردیف اشتراک‌گذاری گالری. */
  const [shareCopied, setShareCopied] = useState(false);
  /** محصولات مرتبط برای ردیف پایین صفحه. */
  const [relatedProducts, setRelatedProducts] = useState<WishlistProduct[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);

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

        // ثبت بازدید برای ریل «بازدیدهای اخیر»؛ خطا هرگز صفحه را نمی‌شکند.
        try {
          recordProductView(productData);
        } catch (viewError) {
          console.error("Recently viewed error:", viewError);
        }

        // Select the first available active variant.
        const firstAvailableVariant = (productData.variants ?? []).find(
          (variant) => variant.is_active && Number(variant.stock) > 0,
        );

        setSelectedVariantId(firstAvailableVariant?.id ?? null);

        /*
         * اگر محصول فقط یک رنگ داشته باشد همان انتخاب می‌شود؛ در غیر این
         * صورت مشتری خودش رنگ را انتخاب می‌کند.
         */
        const selectableColors = (productData.colors ?? []).filter(
          (color) => color.is_active !== false,
        );

        setSelectedColorName(
          selectableColors.length === 1 ? selectableColors[0].name : "",
        );

        // برای پک، اگر هر قطعه فقط یک رنگ مجاز داشته باشد خودکار انتخاب می‌شود.
        const initialPackColors: Record<number, string> = {};

        for (const packItem of productData.pack_items ?? []) {
          const allowed = (packItem.colors ?? []).filter(Boolean);

          if (allowed.length === 1) {
            initialPackColors[packItem.id] = allowed[0];
          }
        }

        setSelectedPackColors(initialPackColors);
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

  /*
   * محصولات مرتبط (ردیف پایین صفحه).
   *
   * اول از همان دستهٔ محصول درخواست می‌شود؛ اگر آن دسته محصول دیگری نداشت،
   * جدیدترین محصولات فروشگاه آورده می‌شود تا ردیف هیچ‌وقت خالی نماند.
   */
  useEffect(() => {
    if (!product) {
      setRelatedProducts([]);
      return;
    }

    let cancelled = false;

    const loadRelated = async () => {
      setRelatedLoading(true);

      const fetchList = async (categorySlug?: string) => {
        const params: Record<string, string | number> = {
          per_page: 12,
          sort: "latest",
        };

        if (categorySlug) {
          params.category = categorySlug;
        }

        const response = await api.get("/products", { params });
        const payload = response.data?.data;

        return (
          Array.isArray(payload?.data)
            ? payload.data
            : Array.isArray(payload)
              ? payload
              : []
        ) as WishlistProduct[];
      };

      try {
        const categorySlug = product.category?.slug;

        let list = categorySlug ? await fetchList(categorySlug) : [];

        const withoutCurrent = (items: WishlistProduct[]) =>
          items.filter((item) => Number(item?.id) !== product.id);

        if (withoutCurrent(list).length === 0) {
          list = await fetchList();
        }

        if (cancelled) return;

        setRelatedProducts(withoutCurrent(list).slice(0, RELATED_PRODUCTS_LIMIT));
      } catch (error) {
        if (cancelled) return;

        console.error("Related products error:", error);
        setRelatedProducts([]);
      } finally {
        if (!cancelled) {
          setRelatedLoading(false);
        }
      }
    };

    void loadRelated();

    return () => {
      cancelled = true;
    };
  }, [product?.id, product?.category?.slug]);

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

  /* ---------------------------------------------------------------- */
  /* رنگ محصول و اجزای پک                                              */
  /* ---------------------------------------------------------------- */

  /** پالت رنگ فعال محصول؛ مشتری یکی از این رنگ‌ها را انتخاب می‌کند. */
  const activeColors = (product?.colors ?? []).filter(
    (color) => color.is_active !== false,
  );

  const hasColors = activeColors.length > 0;

  /** قطعات پک چندعددی (مثلاً پک سه‌عددی شورت). */
  const packItems = product?.pack_items ?? [];

  const hasPack = packItems.length > 0;

  /** قطعاتی از پک که برای هرکدام باید رنگ انتخاب شود. */
  const packItemsWithColors = packItems.filter(
    (item) => (item.colors ?? []).filter(Boolean).length > 0,
  );

  const selectedColor =
    activeColors.find((color) => color.name === selectedColorName) ?? null;

  /** رنگ سواچ؛ اگر مدیر کد رنگ نداده باشد خاکستری روشن نمایش داده می‌شود. */
  const colorSwatchValue = (color: ProductColor) =>
    color.hex?.trim() || "#e5e7eb";

  /**
   * انتخاب رنگ کامل است؟
   *
   * برای محصول ساده، رنگ محصول و برای پک، رنگ همهٔ قطعاتی که رنگ مجاز
   * دارند باید انتخاب شده باشد.
   */
  const colorsReady = hasPack
    ? packItemsWithColors.every((item) => Boolean(selectedPackColors[item.id]))
    : !hasColors || selectedColorName !== "";

  /** رنگ‌های انتخابی قطعات پک برای ثبت در سبد خرید. */
  const selectedPackColorList = packItemsWithColors.map((item) => ({
    name: item.name,
    color: selectedPackColors[item.id] ?? "",
  }));

  const currentStock = hasVariants
    ? Number(selectedVariant?.stock ?? 0)
    : Number(product?.stock ?? 0);

  /*
   * شرط فعال بودن «افزودن به سبد خرید»: موجودی داشته باشد، اگر تنوع دارد
   * یکی انتخاب شده باشد و اگر رنگ دارد رنگ‌ها (یا رنگ قطعات پک) انتخاب شده
   * باشند. علاقه‌مندی به این شرط وابسته نیست و همیشه نمایش داده می‌شود.
   */
  const canAddToCart =
    currentStock > 0 &&
    (!hasVariants || Boolean(selectedVariant)) &&
    colorsReady;

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

  /*
   * ترتیب اولویت تصویر: تصویر رنگ انتخاب‌شده ← تصویر تنوع ← تصویر گالری.
   * بنابراین با انتخاب رنگ، تصویر همان رنگ در گالری دیده می‌شود.
   */
  const displayedImagePath =
    selectedColor?.image || selectedVariant?.image || selectedImage?.path;
  const imageUrl = getImageUrl(displayedImagePath);

  /*
   * ویژگی‌های کلیدی محصول برای بلوک «ویژگی‌های محصول» زیر عنوان.
   *
   * مشخصات فنی جداگانه‌ای برای محصول ثبت نمی‌شود؛ پس خلاصه‌ای از همان
   * اطلاعات موجود (برند، دسته، رنگ‌ها، تنوع‌ها، پک، وزن و کد کالا) ساخته
   * می‌شود تا خریدار بدون باز کردن توضیحات، تصویر کلی محصول را ببیند.
   */
  const highlightSpecs: { label: string; value: string }[] = [];

  if (product) {
    if (product.brand) {
      highlightSpecs.push({ label: "برند", value: product.brand.name });
    }

    if (product.category) {
      highlightSpecs.push({ label: "دسته‌بندی", value: product.category.name });
    }

    if (activeColors.length > 0) {
      highlightSpecs.push({
        label: "رنگ‌ها",
        value: activeColors.map((color) => color.name).join("، "),
      });
    }

    if (activeVariants.length > 0) {
      highlightSpecs.push({
        label: "تنوع‌ها",
        value: activeVariants.map((variant) => variant.name).join("، "),
      });
    }

    if (hasPack) {
      highlightSpecs.push({
        label: "پک",
        value: `${packItems.length.toLocaleString("fa-IR")} قطعه`,
      });
    }

    if (product.weight) {
      highlightSpecs.push({ label: "وزن", value: product.weight });
    }

    highlightSpecs.push({
      label: "کد کالا",
      value: selectedVariant?.sku || product.sku,
    });
  }

  /** آدرس همین صفحه برای ردیف اشتراک‌گذاری گالری. */
  const productShareUrl =
    typeof window === "undefined" ? "" : window.location.href;

  const productShareText = product ? `${product.name} | ${SITE_NAME}` : "";

  /** کپی لینک محصول در کلیپ‌بورد، همراه با بازخورد کوتاه. */
  const handleCopyProductLink = async () => {
    if (!productShareUrl) return;

    try {
      await navigator.clipboard.writeText(productShareUrl);
      setShareCopied(true);

      window.setTimeout(() => setShareCopied(false), 1800);
    } catch {
      setShareCopied(false);
    }
  };

  const handleSelectVariant = (variant: ProductVariant) => {
    if (!variant.is_active || Number(variant.stock) <= 0) return;

    setSelectedVariantId(variant.id);
    setQuantity(1);
    setSelectedImageIndex(0);
    setAddedToCart(false);
  };

  /** انتخاب رنگ محصول از پالت رنگ. */
  const handleSelectColor = (color: ProductColor) => {
    setSelectedColorName(color.name);
    setQuantity(1);
    setAddedToCart(false);
  };

  /** انتخاب رنگ یکی از قطعات پک. */
  const handleSelectPackColor = (packItemId: number, color: string) => {
    setSelectedPackColors((current) => ({ ...current, [packItemId]: color }));
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

    // رنگ (یا رنگ قطعات پک) باید انتخاب شده باشد.
    if (!colorsReady) {
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
        // رنگ محصول ساده یا رنگ قطعات پک، همراه با قلم سبد خرید ذخیره می‌شود.
        color_name: hasPack ? null : selectedColorName || null,
        pack_colors: hasPack && selectedPackColorList.length > 0
          ? selectedPackColorList
          : null,
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

  /**
   * افزودن/حذف محصول از علاقه‌مندی‌ها.
   *
   * برای مهمان در حافظهٔ مرورگر و برای کاربر وارد‌شده روی سرور ذخیره می‌شود؛
   * هر دو حالت در WishlistContext مدیریت می‌شوند.
   */
  const handleToggleWishlist = async () => {
    if (!product || wishlistBusy) return;

    const wishlistProduct: WishlistProduct = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      compare_price: product.compare_price ?? null,
      discount_percent: product.discount_percent ?? null,
      short_description: product.short_description ?? null,
      description: product.description ?? null,
      stock: product.stock,
      thumbnail: product.thumbnail ?? null,
      is_taxable: product.is_taxable ?? null,
      images: product.images,
      variants: product.variants,
      category: product.category ?? null,
      brand: product.brand ?? null,
    };

    setWishlistBusy(true);
    setWishlistError("");

    try {
      await toggleWishlist(wishlistProduct);
    } catch {
      setWishlistError(
        "ثبت علاقه‌مندی انجام نشد. لطفاً یک‌بار دیگر تلاش کنید.",
      );
    } finally {
      setWishlistBusy(false);
    }
  };

  /** وضعیت فعلی این محصول در فهرست علاقه‌مندی‌ها. */
  const wishlisted = product ? isWishlisted(product.id) : false;

  /*
   * ضمانت بازگشت کالا در پنل مدیریت برای هر محصول قابل خاموش‌کردن است
   * (کالاهای بهداشتی مثل لباس زیر مرجوعی ندارند). اگر فیلد از سرور نیامده
   * باشد، پیش‌فرض «دارد» است.
   */
  const isReturnable = !(
    product?.is_returnable === false || product?.is_returnable === 0
  );

  /** نشان‌های اعتماد؛ برای کالای بدون مرجوعی، «ضمانت بازگشت» حذف می‌شود. */
  const trustItems = isReturnable
    ? TRUST_ITEMS
    : TRUST_ITEMS.filter((item) => item.key !== "return");

  /** محتوای آیکنی دکمهٔ علاقه‌مندی روی تصویر محصول. */
  const wishlistIcon = wishlistBusy ? (
    <Loader2 size={18} className="animate-spin" />
  ) : (
    <Heart size={18} fill={wishlisted ? "currentColor" : "none"} />
  );

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

  /**
   * تاریخ ثبت نظر با تقویم شمسی؛ مستقل از تقویم مرورگر و هم‌خوان با بقیهٔ
   * تاریخ‌های فروشگاه که با formatJalaliDateTime نمایش داده می‌شوند.
   */
  const formatReviewDate = (date?: string) => formatJalaliDateTime(date);

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
      {/* نوار مسیر صفحه؛ جای لینک «بازگشت به محصولات» را می‌گیرد. */}
      <div className="border-b border-line bg-cream">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-1.5 px-4 py-3 text-xs text-muted sm:px-6">
          <Link to="/" className="transition hover:text-brand-600">
            خانه
          </Link>

          <ChevronLeft size={14} className="text-line-strong" aria-hidden="true" />

          <Link to="/products" className="transition hover:text-brand-600">
            فروشگاه
          </Link>

          {product.category && (
            <>
              <ChevronLeft
                size={14}
                className="text-line-strong"
                aria-hidden="true"
              />

              <Link
                to={`/products?category=${product.category.slug}`}
                className="transition hover:text-brand-600"
              >
                {product.category.name}
              </Link>
            </>
          )}

          <ChevronLeft size={14} className="text-line-strong" aria-hidden="true" />

          <span className="line-clamp-1 font-bold text-ink-soft">
            {product.name}
          </span>
        </div>
      </div>

      <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
        {/*
          کارت اصلی محصول: گالری سمت راست و اطلاعات خرید سمت چپ، در یک ردیف.
          هر دو ستون تا انتهای کارت کشیده می‌شوند تا بالا و پایینشان هم‌تراز
          بماند و محتوای داخل کارت به اسکرول نیاز پیدا نکند.
        */}
        <div
          className="
            grid grid-cols-1 gap-4 rounded-3xl border border-line bg-white
            p-4 sm:p-5
            lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-6
          "
        >
          {/* گالری تصاویر */}
          <div className="flex min-w-0 flex-col gap-3">
            <div
              className="
                relative flex aspect-[4/3] w-full items-center justify-center
                overflow-hidden rounded-2xl bg-cream p-4
                sm:aspect-square sm:p-6
              "
            >
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={selectedImage?.alt || product.name}
                  className="block h-full w-full object-contain transition duration-300"
                />
              ) : (
                <div className="text-muted-soft">تصویر محصول</div>
              )}

              {hasDiscount && (
                <span className="absolute right-3 top-3 rounded-full bg-discount px-2.5 py-1 text-[11px] font-bold text-white">
                  {discountPercent}% تخفیف
                </span>
              )}

              {galleryImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePreviousImage}
                    aria-label="تصویر قبلی"
                    className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white text-ink-soft shadow-md transition-all duration-200 hover:bg-brand-600 hover:text-white active:scale-90"
                  >
                    <ChevronRight size={19} />
                  </button>

                  <button
                    type="button"
                    onClick={handleNextImage}
                    aria-label="تصویر بعدی"
                    className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white text-ink-soft shadow-md transition-all duration-200 hover:bg-brand-600 hover:text-white active:scale-90"
                  >
                    <ChevronLeft size={19} />
                  </button>
                </>
              )}

              {/*
                علاقه‌مندی و اشتراک‌گذاری روی خود تصویر می‌نشینند: در موبایل یک
                ردیف افقی و از دسکتاپ یک ستون عمودی در گوشهٔ چپ بالا، تا نه
                نشان تخفیف (راست بالا) و نه فلش‌های گالری (وسط) تداخل کنند.
              */}
              <div className="absolute left-3 top-3 z-10 flex flex-wrap items-center gap-1.5 sm:flex-col sm:items-start">
                <button
                  type="button"
                  onClick={handleToggleWishlist}
                  disabled={wishlistBusy}
                  aria-pressed={wishlisted}
                  aria-label={
                    wishlisted
                      ? "حذف از علاقه‌مندی‌ها"
                      : "افزودن به علاقه‌مندی‌ها"
                  }
                  title={
                    wishlisted
                      ? "حذف از علاقه‌مندی‌ها"
                      : "افزودن به علاقه‌مندی‌ها"
                  }
                  className={`
                    inline-flex h-9 w-9 items-center justify-center rounded-full
                    border shadow-sm backdrop-blur transition-all duration-150
                    active:scale-90 disabled:cursor-wait disabled:opacity-60
                    ${
                      wishlisted
                        ? "border-blush-400 bg-white text-blush-600"
                        : "border-line bg-white/95 text-ink-soft hover:border-brand-300 hover:text-brand-600"
                    }
                  `}
                >
                  {wishlistIcon}
                </button>

                <div
                  role="group"
                  aria-label="اشتراک‌گذاری محصول"
                  className="flex items-center gap-1.5 sm:flex-col"
                >
                  <button
                    type="button"
                    onClick={handleCopyProductLink}
                    title={shareCopied ? "لینک کپی شد" : "کپی لینک محصول"}
                    aria-label={shareCopied ? "لینک کپی شد" : "کپی لینک محصول"}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white/95 text-muted shadow-sm backdrop-blur transition-all duration-150 hover:border-brand-300 hover:text-brand-600 active:scale-90"
                  >
                    {shareCopied ? <Check size={15} /> : <Link2 size={15} />}
                  </button>

                  <a
                    href={`https://t.me/share/url?url=${encodeURIComponent(
                      productShareUrl,
                    )}&text=${encodeURIComponent(productShareText)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="اشتراک‌گذاری در تلگرام"
                    aria-label="اشتراک‌گذاری در تلگرام"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white/95 text-muted shadow-sm backdrop-blur transition-all duration-150 hover:border-brand-300 hover:text-brand-600 active:scale-90"
                  >
                    <Send size={15} />
                  </a>

                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      `${productShareText} ${productShareUrl}`,
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="اشتراک‌گذاری در واتساپ"
                    aria-label="اشتراک‌گذاری در واتساپ"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white/95 text-muted shadow-sm backdrop-blur transition-all duration-150 hover:border-brand-300 hover:text-brand-600 active:scale-90"
                  >
                    <MessageCircle size={15} />
                  </a>
                </div>
              </div>
            </div>

            {/* بندانگشتی‌ها شبکه‌ای می‌چینند تا هیچ اسکرول افقی لازم نباشد. */}
            {galleryImages.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
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
                        relative aspect-square overflow-hidden rounded-xl border-2
                        bg-cream p-1 transition-all duration-200
                        ${
                          selectedImageIndex === index
                            ? "border-brand-600 ring-2 ring-brand-100"
                            : "border-line hover:border-brand-300"
                        }
                      `}
                    >
                      {thumbnailUrl ? (
                        <img
                          src={thumbnailUrl}
                          alt={image.alt || product.name}
                          className="block h-full w-full object-contain"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-soft">
                          <Package size={18} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* خطای ثبت علاقه‌مندی، نزدیک به دکمهٔ قلب روی تصویر. */}
            {wishlistError && (
              <p role="alert" className="text-[11px] font-bold text-discount">
                {wishlistError}
              </p>
            )}
          </div>

          {/* اطلاعات خرید */}
          <div className="flex min-w-0 flex-col gap-3.5">
              {/* برند، دسته‌بندی و موجودی */}
              <div className="flex flex-wrap items-center gap-1.5">
                {product.brand && (
                  <span className="rounded-lg bg-line px-2.5 py-1 text-[11.5px] font-bold text-muted">
                    {product.brand.name}
                  </span>
                )}

                {product.category && (
                  <Link
                    to={`/products?category=${product.category.slug}`}
                    className="rounded-lg bg-brand-50 px-2.5 py-1 text-[11.5px] font-bold text-brand-600 transition hover:bg-brand-100"
                  >
                    {product.category.name}
                  </Link>
                )}

                <span
                  className={`rounded-lg px-2.5 py-1 text-[11.5px] font-bold ${
                    currentStock > 0
                      ? "bg-brand-50 text-stock-700"
                      : "bg-blush-50 text-discount"
                  }`}
                >
                  {currentStock > 0
                    ? `${currentStock.toLocaleString("fa-IR")} عدد موجود`
                    : "ناموجود"}
                </span>
              </div>

              <div>
                <h1 className="text-lg font-black leading-7 text-ink sm:text-xl lg:text-2xl lg:leading-9">
                  {product.name}
                </h1>

                {product.short_description && (
                  <p className="mt-1.5 line-clamp-2 text-xs leading-6 text-muted">
                    {product.short_description}
                  </p>
                )}
              </div>

              {/* امتیاز، کد کالا و وزن در یک ردیف فشرده */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11.5px] text-muted-soft">
                <span className="inline-flex items-center gap-1.5">
                  {renderStars(Math.round(averageRating), 14)}

                  <b className="font-bold text-ink-soft">
                    {averageRating > 0
                      ? averageRating.toLocaleString("fa-IR", {
                          maximumFractionDigits: 1,
                        })
                      : "بدون امتیاز"}
                  </b>

                  <a
                    href="#product-reviews"
                    className="font-bold text-brand-600 transition hover:text-brand-700"
                  >
                    ({reviewsCount.toLocaleString("fa-IR")} نظر)
                  </a>
                </span>

                <span>
                  کد کالا:{" "}
                  <b className="font-bold text-ink-soft">
                    {selectedVariant?.sku || product.sku}
                  </b>
                </span>

                {product.weight && (
                  <span>
                    وزن: <b className="font-bold text-ink-soft">{product.weight}</b>
                  </span>
                )}
              </div>

              {/* ویژگی‌های محصول؛ خلاصهٔ مشخصات در دو ستون */}
              {highlightSpecs.length > 0 && (
                <div className="rounded-2xl border border-line bg-cream px-3.5 py-3">
                  <div className="mb-2 flex items-center gap-1.5 text-[11.5px] font-bold text-ink">
                    <Sparkles
                      size={14}
                      className="text-brand-600"
                      aria-hidden="true"
                    />
                    ویژگی‌های محصول
                  </div>

                  <ul className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
                    {highlightSpecs.map((spec) => (
                      <li
                        key={spec.label}
                        className="flex min-w-0 items-center gap-1.5 text-[11.5px]"
                      >
                        <CheckCircle2
                          size={13}
                          className="shrink-0 text-brand-500"
                          aria-hidden="true"
                        />

                        <span className="shrink-0 text-muted-soft">
                          {spec.label}:
                        </span>

                        <span
                          className="truncate font-bold text-ink-soft"
                          title={spec.value}
                        >
                          {spec.value}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* انتخاب تنوع (سایز/مدل) */}
              {hasVariants && (
                <div>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Layers size={15} className="text-brand-600" />
                      <h2 className="text-[11.5px] font-bold text-ink">
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
                            rounded-lg border px-3 py-2 text-xs font-bold
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
                    <p className="mt-2 text-[11.5px] text-discount">
                      تمام تنوع‌های این محصول در حال حاضر ناموجود هستند.
                    </p>
                  ) : !selectedVariant ? (
                    <p className="mt-2 text-[11.5px] text-discount">
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

              {/* پالت رنگ محصول */}
              {hasColors && !hasPack && (
                <div>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Palette size={15} className="text-brand-600" />
                      <h2 className="text-[11.5px] font-bold text-ink">
                        انتخاب رنگ
                      </h2>
                    </div>

                    {selectedColorName && (
                      <span className="rounded-lg bg-brand-50 px-2 py-1 text-[11px] font-bold text-brand-700">
                        رنگ انتخاب‌شده: {selectedColorName}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {activeColors.map((color) => {
                      const isSelected = selectedColorName === color.name;

                      return (
                        <button
                          key={color.id}
                          type="button"
                          onClick={() => handleSelectColor(color)}
                          aria-pressed={isSelected}
                          title={color.name}
                          className={`
                            flex items-center gap-1.5 rounded-lg border
                            px-2.5 py-1.5 text-xs font-bold transition
                            ${
                              isSelected
                                ? "border-brand-700 bg-brand-75 text-brand-700 ring-2 ring-brand-700/10"
                                : "border-line bg-white text-ink-soft hover:border-brand-400"
                            }
                          `}
                        >
                          <span
                            aria-hidden="true"
                            className="h-4 w-4 rounded-full border border-black/10 shadow-inner"
                            style={{ backgroundColor: colorSwatchValue(color) }}
                          />
                          {color.name}
                        </button>
                      );
                    })}
                  </div>

                  {!selectedColorName && (
                    <p className="mt-2 text-[11.5px] text-discount">
                      برای ادامه، رنگ موردنظرت را انتخاب کن.
                    </p>
                  )}
                </div>
              )}

              {/* رنگ اجزای پک چندعددی */}
              {hasPack && (
                <div>
                  <div className="mb-2 flex items-center gap-1.5">
                    <Layers size={15} className="text-brand-600" />
                    <h2 className="text-[11.5px] font-bold text-ink">
                      انتخاب رنگ اجزای پک
                    </h2>
                  </div>

                  <p className="mb-2 text-[11px] leading-6 text-muted-soft">
                    این محصول یک پک چندعددی است؛ رنگ هر قطعه را جداگانه انتخاب
                    کن.
                  </p>

                  <div className="space-y-2">
                    {packItems.map((item) => {
                      const allowed = (item.colors ?? []).filter(Boolean);
                      const chosen = selectedPackColors[item.id] ?? "";

                      return (
                        <div
                          key={item.id}
                          className="rounded-xl border border-line bg-white p-3"
                        >
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <div className="text-xs font-bold text-ink">
                              {item.name}
                              {item.quantity > 1 && (
                                <span className="mr-1 text-[11px] font-medium text-muted">
                                  × {item.quantity.toLocaleString("fa-IR")}
                                </span>
                              )}
                            </div>

                            {chosen ? (
                              <span className="text-[11px] font-bold text-brand-700">
                                رنگ: {chosen}
                              </span>
                            ) : allowed.length > 0 ? (
                              <span className="text-[11px] font-bold text-discount">
                                انتخاب نشده
                              </span>
                            ) : (
                              <span className="text-[11px] text-muted-soft">
                                بدون انتخاب رنگ
                              </span>
                            )}
                          </div>

                          {allowed.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {allowed.map((colorName) => {
                                const color =
                                  activeColors.find(
                                    (entry) => entry.name === colorName,
                                  ) ?? null;

                                const isSelected = chosen === colorName;

                                return (
                                  <button
                                    key={`${item.id}-${colorName}`}
                                    type="button"
                                    onClick={() =>
                                      handleSelectPackColor(item.id, colorName)
                                    }
                                    aria-pressed={isSelected}
                                    className={`
                                      flex items-center gap-1.5 rounded-lg border
                                      px-2.5 py-1.5 text-xs font-bold transition
                                      ${
                                        isSelected
                                          ? "border-brand-700 bg-brand-75 text-brand-700"
                                          : "border-line bg-white text-ink-soft hover:border-brand-400"
                                      }
                                    `}
                                  >
                                    <span
                                      aria-hidden="true"
                                      className="h-4 w-4 rounded-full border border-black/10"
                                      style={{
                                        backgroundColor: color
                                          ? colorSwatchValue(color)
                                          : "#e5e7eb",
                                      }}
                                    />
                                    {colorName}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* جعبهٔ قیمت و خرید؛ همهٔ اقدام‌های خرید در یک بلوک هم‌تراز */}
              <div className="mt-auto rounded-2xl border border-line bg-cream px-3.5 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <ShieldCheck
                      size={13}
                      className="text-stock"
                      aria-hidden="true"
                    />
                    گارانتی اصالت و سلامت فیزیکی کالا
                  </span>

                  {currentStock > 0 && (
                    <span className="font-bold text-stock-700">
                      {currentStock.toLocaleString("fa-IR")} عدد باقی مانده
                    </span>
                  )}
                </div>

                {/* کالای بدون مرجوعی (بهداشتی) صریح به خریدار اعلام می‌شود. */}
                {!isReturnable && (
                  <p className="mt-1.5 flex items-start gap-1.5 text-[11px] font-bold leading-5 text-discount">
                    <RotateCcw
                      size={13}
                      className="mt-0.5 shrink-0"
                      aria-hidden="true"
                    />
                    این کالا بهداشتی است و امکان مرجوعی ندارد.
                  </p>
                )}

                <div className="mt-2 flex flex-wrap items-end gap-2" dir="ltr">
                  <span className="text-2xl font-black leading-8 text-brand-600">
                    {finalPrice.toLocaleString("fa-IR")}
                    <span className="mr-1 text-xs font-bold text-muted">
                      تومان
                    </span>
                  </span>

                  {hasDiscount && (
                    <>
                      <span className="rounded-md bg-discount px-1.5 py-0.5 text-[11px] font-bold text-white">
                        {discountPercent}%
                      </span>

                      <span className="text-sm text-muted-soft line-through">
                        {originalPrice.toLocaleString("fa-IR")}
                      </span>
                    </>
                  )}
                </div>

                {hasDiscount && (
                  <p className="mt-1 text-[11px] font-bold text-stock">
                    {discountAmount.toLocaleString("fa-IR")} تومان صرفه‌جویی
                  </p>
                )}

              {/* تعداد و افزودن به سبد در یک ردیف هم‌تراز */}
              {canAddToCart && (
                <div className="mt-3 flex items-stretch gap-2">
                  <div className="flex items-stretch overflow-hidden rounded-xl border border-line bg-white">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                      className="flex h-11 w-9 items-center justify-center text-lg transition-all duration-150 hover:bg-brand-75 hover:text-brand-700 active:scale-90 disabled:opacity-40"
                    >
                      −
                    </button>

                    <div className="flex w-10 select-none items-center justify-center text-sm font-bold">
                      {quantity.toLocaleString("fa-IR")}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setQuantity(Math.min(currentStock, quantity + 1))
                      }
                      disabled={quantity >= currentStock}
                      className="flex h-11 w-9 items-center justify-center text-lg transition-all duration-150 hover:bg-brand-75 hover:text-brand-700 active:scale-90 disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>

                  <div className="min-w-0 flex-1">
                    <Button
                      type="button"
                      onClick={handleAddToCart}
                      loading={addingToCart}
                      disabled={addingToCart}
                      variant={addedToCart ? "success" : "primary"}
                      size="md"
                      fullWidth
                      icon={
                        addedToCart ? (
                          <CheckCircle2 size={18} />
                        ) : (
                          <ShoppingCart size={18} />
                        )
                      }
                    >
                      {addedToCart
                        ? "به سبد خرید اضافه شد"
                        : "افزودن به سبد خرید"}
                    </Button>
                  </div>
                </div>
              )}

                {currentStock <= 0 && (
                  <div className="mt-3 rounded-xl bg-blush-50 px-3 py-2.5 text-center text-xs font-bold text-discount">
                    {hasVariants &&
                    availableVariants.length > 0 &&
                    !selectedVariant
                      ? "برای مشاهده موجودی، یک تنوع انتخاب کن."
                      : "این محصول در حال حاضر موجود نیست."}
                  </div>
                )}

                {/*
                 * «افزودن به علاقه‌مندی» روی خود تصویر محصول است (حتی در حالت
                 * ناموجود هم در دسترس می‌ماند)؛ اینجا فقط کارت «مشاهدهٔ فهرست
                 * علاقه‌مندی‌ها» می‌آید: تأییدِ ذخیره‌شدن محصول به‌همراه دکمهٔ
                 * پررنگ و شمارندهٔ تعداد، تا مسیر رفتن به فهرست علاقه‌مندی‌ها
                 * واضح و قابل‌دیدن باشد.
                 */}
                {wishlisted && (
                  <div
                    role="status"
                    aria-live="polite"
                    className="mt-3 rounded-xl border border-blush-200 bg-blush-50 p-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blush-600 text-white shadow-sm">
                        <Check size={13} strokeWidth={3} aria-hidden="true" />
                      </span>

                      <div className="min-w-0">
                        <p className="truncate text-xs font-black text-blush-600">
                          در فهرست علاقه‌مندی‌های شماست
                        </p>

                        <p className="truncate text-[10.5px] text-muted-soft">
                          هر زمان بخواهید از فهرست علاقه‌مندی‌ها پیدایش می‌کنید
                        </p>
                      </div>
                    </div>

                    <Link
                      to="/wishlist"
                      className="
                        mt-2 flex h-10 w-full items-center justify-center gap-2
                        rounded-xl bg-blush-600 text-xs font-black text-white
                        shadow-sm transition-all duration-200
                        hover:shadow-md active:scale-[0.98]
                        focus-visible:outline-none focus-visible:ring-2
                        focus-visible:ring-blush-400 focus-visible:ring-offset-1
                      "
                    >
                      <Heart size={15} fill="currentColor" aria-hidden="true" />

                      <span className="whitespace-nowrap">
                        مشاهدهٔ فهرست علاقه‌مندی‌ها
                      </span>

                      {wishlistCount > 0 && (
                        <span className="rounded-full bg-white/25 px-1.5 py-px text-[10px] font-black leading-4">
                          {wishlistCount.toLocaleString("fa-IR")}
                        </span>
                      )}
                    </Link>
                  </div>
                )}

                {/* اگر این محصول ذخیره نشده ولی فهرست خالی هم نیست، میان‌بر آرام
                    به فهرست علاقه‌مندی‌ها نمایش داده می‌شود. */}
                {!wishlisted && wishlistCount > 0 && (
                  <Link
                    to="/wishlist"
                    className="
                      group mt-2 flex h-10 w-full items-center justify-center gap-2
                      rounded-xl border border-line bg-white text-xs font-bold
                      text-ink-soft shadow-sm transition-all duration-200
                      hover:border-blush-200 hover:bg-blush-50 hover:text-blush-600
                      hover:shadow-md active:scale-[0.98]
                      focus-visible:outline-none focus-visible:ring-2
                      focus-visible:ring-blush-400 focus-visible:ring-offset-1
                    "
                  >
                    <Heart size={15} className="shrink-0" aria-hidden="true" />

                    مشاهدهٔ فهرست علاقه‌مندی‌ها

                    <span
                      className="
                        rounded-full bg-blush-100 px-1.5 text-[10px] font-black
                        leading-4 text-blush-600 transition-colors duration-200
                        group-hover:bg-blush-200
                      "
                    >
                      {wishlistCount.toLocaleString("fa-IR")}
                    </span>

                    <ChevronLeft
                      size={14}
                      className="shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5"
                      aria-hidden="true"
                    />
                  </Link>
                )}
              </div>

              {/* نشان‌های اعتماد */}
              <div
                className={`grid grid-cols-2 gap-2 border-t border-line pt-3 ${
                  trustItems.length >= 4 ? "sm:grid-cols-4" : "sm:grid-cols-3"
                }`}
              >
                {trustItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div key={item.key} className="flex items-center gap-1.5">
                      <Icon
                        size={16}
                        className="shrink-0 text-brand-600"
                        aria-hidden="true"
                      />

                      <div className="min-w-0">
                        <div className="truncate text-[11px] font-bold text-ink-soft">
                          {item.label}
                        </div>

                        <div className="truncate text-[10.5px] text-muted-soft">
                          {item.hint}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        {/* Product Description */}
        {product.description && (
          <div className="mt-4 rounded-3xl border border-line bg-white p-5 sm:p-6">
            <h2 className="mb-4 text-lg font-black text-ink">توضیحات محصول</h2>

            <div className="whitespace-pre-line leading-8 text-muted">
              {product.description}
            </div>
          </div>
        )}

        {/* مشخصات محصول؛ همان خلاصهٔ ویژگی‌ها در قالب جدول خوانا */}
        {highlightSpecs.length > 0 && (
          <div className="mt-4 rounded-3xl border border-line bg-white p-5 sm:p-6">
            <h2 className="mb-3 text-lg font-black text-ink">مشخصات محصول</h2>

            <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
              {highlightSpecs.map((spec) => (
                <div
                  key={`spec-${spec.label}`}
                  className="flex items-start justify-between gap-3 border-b border-line-soft py-2.5 text-xs"
                >
                  <dt className="shrink-0 text-muted-soft">{spec.label}</dt>

                  <dd className="min-w-0 break-words text-left font-bold text-ink-soft">
                    {spec.value}
                  </dd>
                </div>
              ))}
            </dl>
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

        {/* محصولات مرتبط؛ ردیف آخر صفحه */}
        {(relatedLoading || relatedProducts.length > 0) && (
          <section className="mt-4 rounded-3xl border border-line bg-white p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles
                  size={17}
                  className="text-brand-600"
                  aria-hidden="true"
                />
                <h2 className="text-base font-black text-ink sm:text-lg">
                  محصولات مرتبط
                </h2>
              </div>

              <Link
                to={
                  product.category
                    ? `/products?category=${product.category.slug}`
                    : "/products"
                }
                className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 transition hover:text-brand-700"
              >
                مشاهده همه
                <ChevronLeft size={14} />
              </Link>
            </div>

            {relatedLoading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {Array.from({ length: RELATED_PRODUCTS_LIMIT }).map(
                  (_, index) => (
                    <div
                      key={index}
                      className="h-56 animate-pulse rounded-2xl bg-cream"
                      aria-hidden="true"
                    />
                  ),
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {relatedProducts.map((item) => (
                  <ProductCard key={item.id} product={item} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* بازدیدهای اخیر کاربر؛ محصول جاری کنار گذاشته می‌شود */}
        <div className="mt-4">
          <RecentlyViewed
            excludeIds={[product.id]}
            limit={6}
            className="rounded-3xl border border-line bg-white p-4 sm:p-5"
          />
        </div>
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
