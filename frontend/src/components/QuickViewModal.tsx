import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Heart,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Truck,
  X,
} from "lucide-react";

import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import type { WishlistProduct } from "../services/wishlist";
import { getStorageUrl } from "../utils/images";
import { calculateProductPrice } from "../utils/price";

/**
 * مودال «نمایش سریع» محصول.
 *
 * مشتری بدون ترک صفحهٔ فهرست، تصویرها، قیمت، سایزهای موجود و توضیح کوتاه
 * را می‌بیند و می‌تواند همان‌جا به سبد اضافه کند. برای دسترسی به توضیح
 * کامل و نظرات، لینک «مشاهدهٔ کامل» به صفحهٔ محصول می‌برد.
 *
 * مودال با portal روی body رندر می‌شود تا از جعبه‌های overflow-hidden
 * کارت‌های محصول بیرون بماند و کل صفحه را بپوشاند.
 */

interface Props {
  product: WishlistProduct;
  onClose: () => void;
}

/** ترتیب تصویرها مثل کارت محصول: is_primary اول، بعد sort_order. */
function orderedImageUrls(product: WishlistProduct): string[] {
  const sorted = [...(product.images ?? [])]
    .filter((image) => Boolean(image.path))
    .sort((a, b) => {
      if (Boolean(b.is_primary) !== Boolean(a.is_primary)) {
        return Number(Boolean(b.is_primary)) - Number(Boolean(a.is_primary));
      }

      const orderA = a.sort_order ?? 0;
      const orderB = b.sort_order ?? 0;

      if (orderA !== orderB) {
        return orderA - orderB;
      }

      return (a.id ?? 0) - (b.id ?? 0);
    })
    .map((image) => getStorageUrl(image.path))
    .filter((url): url is string => Boolean(url));

  if (sorted.length > 0) {
    return sorted;
  }

  const fallback = getStorageUrl(product.thumbnail);

  return fallback ? [fallback] : [];
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function QuickViewModal({ product, onClose }: Props) {
  const { addToCart } = useCart();
  const { isWishlisted, toggle } = useWishlist();

  const images = useMemo(() => orderedImageUrls(product), [product]);

  /** فقط تنوع‌های فعال با موجودی قابل انتخاب‌اند. */
  const variants = useMemo(
    () =>
      (product.variants ?? []).filter(
        (variant) =>
          variant.is_active !== false && Number(variant.stock ?? 0) > 0,
      ),
    [product.variants],
  );

  const [activeImage, setActiveImage] = useState(0);
  const [variantId, setVariantId] = useState<number | null>(
    () => variants[0]?.id ?? null,
  );
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [wishlistBusy, setWishlistBusy] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const addedTimer = useRef<number | null>(null);

  const selectedVariant =
    variants.find((variant) => variant.id === variantId) ?? null;

  const price = calculateProductPrice(
    product.price,
    product.discount_percent ?? undefined,
  );

  const stock = selectedVariant
    ? Number(selectedVariant.stock ?? 0)
    : Number(product.stock ?? 0);

  const inStock = stock > 0;
  const wishlisted = isWishlisted(product.id);
  const maxQuantity = Math.max(1, Math.min(stock, 10));
  const image = images[activeImage] ?? images[0] ?? null;

  // قفل اسکرول پس‌زمینه + بستن با Esc + تمرکز اولیه روی دکمهٔ بستن.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }

      // نگه‌داشتن تمرکز داخل مودال (trap ساده)
      if (event.key === "Tab" && panelRef.current) {
        const focusable = Array.from(
          panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
        ).filter((element) => element.offsetParent !== null);

        if (focusable.length === 0) {
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);

      if (addedTimer.current !== null) {
        window.clearTimeout(addedTimer.current);
        addedTimer.current = null;
      }
    };
  }, [onClose]);

  const handleAddToCart = () => {
    if (!inStock) {
      return;
    }

    addToCart({
      id: product.id,
      name: product.name,
      slug: product.slug,
      variant_id: selectedVariant?.id ?? null,
      variant_name: selectedVariant?.name ?? null,
      color_name: null,
      pack_colors: null,
      sku: null,
      price: price.finalPrice,
      originalPrice: price.originalPrice,
      discountPercent: price.discountPercent,
      thumbnail: image ?? undefined,
      stock,
      is_taxable: Boolean(product.is_taxable ?? true),
    });

    setAdded(true);

    if (addedTimer.current !== null) {
      window.clearTimeout(addedTimer.current);
    }

    addedTimer.current = window.setTimeout(() => {
      setAdded(false);
      addedTimer.current = null;
    }, 2800);
  };

  const handleWishlist = async () => {
    if (wishlistBusy) {
      return;
    }

    setWishlistBusy(true);

    try {
      await toggle(product);
    } catch {
      /* پیام خطا از خود WishlistContext نمایش داده می‌شود. */
    } finally {
      setWishlistBusy(false);
    }
  };

  return createPortal(
    <div
      className="quickview-backdrop fixed inset-0 z-[80] flex items-end justify-center bg-ink/50 backdrop-blur-[2px] sm:items-center sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quickview-title"
        onClick={(event) => event.stopPropagation()}
        className="quickview-panel relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-[0_24px_70px_rgba(40,59,45,0.28)] sm:max-h-[88vh] sm:rounded-3xl"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="بستن نمایش سریع"
          className="absolute left-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-ink-soft shadow-sm ring-1 ring-line transition hover:bg-blush-50 hover:text-discount"
        >
          <X size={18} />
        </button>

        <div className="grid min-h-0 flex-1 overflow-y-auto md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          {/* گالری تصویر */}
          <div className="bg-cream-deep p-4 sm:p-6">
            <div className="relative mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden rounded-2xl bg-white ring-1 ring-line/70">
              {image ? (
                <img
                  src={image}
                  alt={product.name}
                  className="h-full w-full object-contain p-3"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-soft">
                  <Tag size={38} strokeWidth={1.5} />
                  <span className="text-xs">تصویر محصول</span>
                </div>
              )}

              {price.hasDiscount && (
                <span className="absolute right-2 top-2 rounded-lg bg-blush-100 px-2 py-1 text-xs font-black text-blush-600">
                  {price.discountPercent.toLocaleString("fa-IR")}٪ تخفیف
                </span>
              )}
            </div>

            {images.length > 1 && (
              <div className="mx-auto mt-3 flex max-w-sm gap-2 overflow-x-auto pb-1">
                {images.map((url, index) => (
                  <button
                    key={`${url}-${index}`}
                    type="button"
                    onClick={() => setActiveImage(index)}
                    aria-label={`تصویر ${(index + 1).toLocaleString("fa-IR")}`}
                    aria-current={index === activeImage}
                    className={`h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white ring-1 transition ${
                      index === activeImage
                        ? "ring-2 ring-brand-500"
                        : "ring-line hover:ring-brand-300"
                    }`}
                  >
                    <img
                      src={url}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* جزئیات و خرید */}
          <div className="flex min-h-0 flex-col p-4 sm:p-6">
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-600">
                نمایش سریع
              </span>

              {product.brand?.name && (
                <span className="rounded-full bg-cream px-2.5 py-1 text-[11px] font-bold text-ink-soft ring-1 ring-line">
                  {product.brand.name}
                </span>
              )}

              {product.category?.name && (
                <span className="rounded-full bg-cream px-2.5 py-1 text-[11px] font-bold text-muted ring-1 ring-line">
                  {product.category.name}
                </span>
              )}
            </div>

            <h2
              id="quickview-title"
              className="break-words text-lg font-black leading-7 text-ink sm:text-xl"
            >
              {product.name}
            </h2>

            {product.short_description && (
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">
                {product.short_description}
              </p>
            )}

            {/* قیمت */}
            <div className="mt-4 rounded-2xl bg-cream p-3" dir="ltr">
              <div className="flex flex-wrap items-baseline justify-start gap-2">
                <span className="text-xl font-black text-ink sm:text-2xl">
                  {price.finalPrice.toLocaleString("fa-IR")}
                </span>
                <span className="text-xs font-medium text-muted-soft">
                  تومان
                </span>

                {price.hasDiscount && (
                  <span className="text-xs text-muted-soft line-through">
                    {price.originalPrice.toLocaleString("fa-IR")} تومان
                  </span>
                )}
              </div>

              {price.hasDiscount && (
                <div className="mt-1 text-[11px] font-bold text-save">
                  صرفه‌جویی {price.discountAmount.toLocaleString("fa-IR")} تومان
                </div>
              )}
            </div>

            {/* سایز */}
            {variants.length > 0 && (
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-ink-soft">
                    انتخاب سایز
                  </span>
                  <span className="text-[11px] text-muted-soft">
                    {variants.length.toLocaleString("fa-IR")} سایز موجود
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {variants.map((variant) => {
                    const active = variant.id === variantId;

                    return (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => {
                          setVariantId(variant.id);
                          setQuantity(1);
                        }}
                        aria-pressed={active}
                        className={`min-w-11 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                          active
                            ? "border-brand-500 bg-brand-50 text-brand-700"
                            : "border-line bg-white text-ink-soft hover:border-brand-300"
                        }`}
                      >
                        {variant.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* موجودی و تعداد */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                  inStock
                    ? "bg-brand-50 text-stock"
                    : "bg-blush-50 text-discount"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    inStock ? "bg-stock" : "bg-discount"
                  }`}
                />
                {inStock
                  ? `موجود در انبار (${stock.toLocaleString("fa-IR")} عدد)`
                  : "ناموجود"}
              </span>

              <div className="flex items-center gap-1 rounded-xl border border-line bg-white p-1">
                <button
                  type="button"
                  onClick={() =>
                    setQuantity((current) => Math.min(current + 1, maxQuantity))
                  }
                  disabled={!inStock || quantity >= maxQuantity}
                  aria-label="افزودن تعداد"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-soft transition hover:bg-brand-50 disabled:opacity-40"
                >
                  <Plus size={15} />
                </button>

                <span className="min-w-7 text-center text-sm font-black text-ink">
                  {quantity.toLocaleString("fa-IR")}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setQuantity((current) => Math.max(current - 1, 1))
                  }
                  disabled={!inStock || quantity <= 1}
                  aria-label="کاهش تعداد"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-soft transition hover:bg-brand-50 disabled:opacity-40"
                >
                  <Minus size={15} />
                </button>
              </div>
            </div>

            {/* دکمه‌های خرید */}
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!inStock}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-line-strong disabled:text-muted"
              >
                <ShoppingBag size={18} />
                افزودن به سبد خرید
              </button>

              <button
                type="button"
                onClick={handleWishlist}
                disabled={wishlistBusy}
                aria-pressed={wishlisted}
                aria-label={
                  wishlisted ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"
                }
                className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition disabled:opacity-60 ${
                  wishlisted
                    ? "border-blush-200 bg-blush-50 text-blush-600"
                    : "border-line bg-white text-ink-soft hover:border-blush-200 hover:text-blush-500"
                }`}
              >
                <Heart size={18} fill={wishlisted ? "currentColor" : "none"} />
                <span className="sm:hidden">
                  {wishlisted ? "ذخیره شد" : "علاقه‌مندی"}
                </span>
              </button>
            </div>

            {added && (
              <div
                role="status"
                className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-brand-50 px-3 py-2 text-xs font-bold text-brand-700"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Check size={15} />
                  به سبد خرید اضافه شد
                </span>

                <Link
                  to="/cart"
                  className="inline-flex items-center gap-1 text-brand-600 underline-offset-2 hover:underline"
                >
                  مشاهدهٔ سبد
                  <ArrowLeft size={13} />
                </Link>
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3 text-[11px] text-muted">
              <Link
                to={`/product/${product.slug}`}
                className="inline-flex items-center gap-1 font-bold text-brand-600 transition hover:text-brand-700"
              >
                مشاهدهٔ کامل محصول
                <ArrowLeft size={14} />
              </Link>

              <span className="inline-flex items-center gap-3">
                <span className="inline-flex items-center gap-1">
                  <Truck size={14} className="text-info" />
                  ارسال سریع
                </span>
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck size={14} className="text-brand-500" />
                  ضمانت اصالت
                </span>
              </span>
            </div>

          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default QuickViewModal;
