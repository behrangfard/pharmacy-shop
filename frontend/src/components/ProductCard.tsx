import { useState } from "react";
import type { MouseEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Eye, Heart, Sparkles, Tag } from "lucide-react";

import QuickViewModal from "./QuickViewModal";
import { useWishlist } from "../context/WishlistContext";
import { useStoreSettings } from "../hooks/useStoreSettings";
import type { WishlistProduct } from "../services/wishlist";
import { getStorageUrl } from "../utils/images";
import { calculateProductPrice, calculateVatAmount } from "../utils/price";

/**
 * سه نمای کارت محصول:
 * - grid: شبکهٔ صفحهٔ محصولات (فشرده، مناسب موبایل)
 * - home: کارت‌های صفحهٔ اصلی (بزرگ‌تر، با نشان «انتخاب ویژه»)
 * - rail: کاروسل افقی صفحهٔ اصلی (کوتاه‌تر: بدون چیپ سایز و بدون خط
 *   ارزش افزوده، تا ریل یک‌ردیفه و کم‌ارتفاع بماند)
 */
export type ProductCardVariant = "grid" | "home" | "rail";

interface Props {
  product: WishlistProduct;
  variant?: ProductCardVariant;
  className?: string;
  showWishlistButton?: boolean;
}

export function productCardImageUrl(product: WishlistProduct): string | null {
  const primaryImage =
    product.images?.find((image) => image.is_primary) ?? product.images?.[0];

  if (primaryImage?.path) {
    return getStorageUrl(primaryImage.path);
  }

  if (product.thumbnail) {
    return getStorageUrl(product.thumbnail);
  }

  return null;
}

/**
 * متن جایگزین تصویر کارت.
 *
 * اولویت: alt ثبت‌شدهٔ تصویر اصلی در پنل، بعد نام محصول. تا وقتی مدیر alt
 * تصویر را پر نکرده، رفتار قبلی (نام محصول) حفظ می‌شود.
 */
export function productCardImageAlt(product: WishlistProduct): string {
  const primaryImage =
    product.images?.find((image) => image.is_primary) ?? product.images?.[0];

  const alt = primaryImage?.alt?.trim();

  return alt && alt.length > 0 ? alt : product.name;
}

/**
 * ابعاد ذاتی تصویر اصلی کارت (اگر API فرستاده باشد). کارت نسبت ثابت ۴:۵
 * دارد؛ این ابعاد فقط به مرورگر کمک می‌کند پیش از دانلود نسبت را بداند.
 */
export function productCardImageSize(
  product: WishlistProduct,
): { width: number; height: number } | null {
  const primaryImage =
    product.images?.find((image) => image.is_primary) ?? product.images?.[0];

  const width = primaryImage?.width;
  const height = primaryImage?.height;

  if (
    typeof width !== "number" ||
    typeof height !== "number" ||
    width < 1 ||
    height < 1
  ) {
    return null;
  }

  return { width: Math.round(width), height: Math.round(height) };
}

/**
 * تصویر دوم کارت برای افکت هاور.
 *
 * تصویر اصلی همان است که در حالت عادی دیده می‌شود؛ از میان بقیه تصاویر،
 * اولی به‌ترتیب sort_order (و در نبود آن شناسه) برداشته می‌شود. اگر محصول
 * فقط یک تصویر داشته باشد null برمی‌گردد و کارت افکت هاور نمی‌گیرد.
 */
export function productCardHoverImageUrl(
  product: WishlistProduct,
): string | null {
  const images = [...(product.images ?? [])]
    .filter((image) => Boolean(image.path))
    .sort((a, b) => {
      const orderA = a.sort_order ?? 0;
      const orderB = b.sort_order ?? 0;

      if (orderA !== orderB) {
        return orderA - orderB;
      }

      return (a.id ?? 0) - (b.id ?? 0);
    });

  if (images.length < 2) {
    return null;
  }

  const primary = images.find((image) => image.is_primary) ?? images[0];
  const secondary = images.find((image) => image.path !== primary.path);

  return secondary?.path ? getStorageUrl(secondary.path) : null;
}

/** حداکثر چیپ سایز روی کارت؛ بقیه با «+n» خلاصه می‌شوند. */
const CARD_SIZE_LIMIT = 5;

/** ترتیب مرسوم سایزهای حرفی. */
const LETTER_SIZE_ORDER = [
  "XXS",
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "3XL",
  "4XL",
];

/**
 * وزن سایز برای چیدن چیپ‌ها: عددها صعودی (۷۵، ۸۰، ۸۵…)، سایزهای حرفی
 * به ترتیب مرسوم و بقیه (مثل «فری‌سایز») در انتها.
 */
function sizeWeight(size: string): number {
  const upper = size.toUpperCase();
  const letterIndex = LETTER_SIZE_ORDER.indexOf(upper);

  if (letterIndex >= 0) {
    return 100 + letterIndex;
  }

  const digits = upper.replace(/[^0-9.]/g, "");

  if (digits !== "" && Number.isFinite(Number(digits))) {
    return Number(digits);
  }

  return 1000;
}

export interface CardSizeChip {
  label: string;
  available: boolean;
}

/**
 * سایزهای همین محصول برای نمایش روی کارت.
 *
 * از تنوع‌های فعال ساخته می‌شود؛ سایزی که دست‌کم یک تنوع موجود دارد
 * «موجود» شمرده می‌شود و سایز بدون موجودی با خط خوردگی نشان داده می‌شود.
 */
export function productCardSizeChips(product: WishlistProduct): {
  chips: CardSizeChip[];
  extra: number;
} {
  const map = new Map<string, CardSizeChip>();

  (product.variants ?? []).forEach((variant) => {
    if (variant.is_active === false) {
      return;
    }

    const label = (variant.size ?? "").trim();

    if (!label) {
      return;
    }

    const key = label.toUpperCase();
    const available = Number(variant.stock ?? 0) > 0;
    const existing = map.get(key);

    if (!existing) {
      map.set(key, { label, available });

      return;
    }

    if (available) {
      existing.available = true;
    }
  });

  const all = [...map.values()].sort(
    (a, b) =>
      sizeWeight(a.label) - sizeWeight(b.label) ||
      a.label.localeCompare(b.label, "fa"),
  );

  return {
    chips: all.slice(0, CARD_SIZE_LIMIT),
    extra: Math.max(0, all.length - CARD_SIZE_LIMIT),
  };
}

interface WishlistButtonProps {
  product: WishlistProduct;
  className?: string;
  size?: number;
}

/**
 * دکمهٔ علاقه‌مندی؛ برای مهمان در حافظهٔ مرورگر و برای کاربر وارد‌شده روی
 * سرور ذخیره می‌شود (useWishlist هر دو حالت را پوشش می‌دهد).
 */
function WishlistButton({
  product,
  className = "",
  size = 16,
}: WishlistButtonProps) {
  const { isWishlisted, toggle } = useWishlist();
  const [busy, setBusy] = useState(false);

  const active = isWishlisted(product.id);

  const handleClick = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (busy) {
      return;
    }

    setBusy(true);

    try {
      await toggle(product);
    } catch {
      // خطا در کنسول کانتکست ثبت می‌شود؛ ظاهر کارت باید پایدار بماند.
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={active}
      aria-label={active ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"}
      title={active ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"}
      className={`
        flex items-center justify-center rounded-xl border backdrop-blur-sm
        transition-all disabled:cursor-wait
        ${
          active
            ? "border-brand-300 bg-brand-100 text-brand-600"
            : "border-white bg-white/90 text-muted-soft hover:border-brand-300 hover:text-brand-600"
        }
        ${className}
      `}
    >
      <Heart size={size} fill={active ? "currentColor" : "none"} />
    </button>
  );
}

/** چیپ سایزهای موجود روی کارت محصول (فقط وقتی محصول تنوع سایز دارد). */
function SizeChips({
  chips,
  extra,
}: {
  chips: CardSizeChip[];
  extra: number;
}) {
  if (chips.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1" dir="ltr">
      {chips.map((chip) => (
        <span
          key={chip.label}
          title={
            chip.available
              ? `سایز ${chip.label} موجود است`
              : `سایز ${chip.label} ناموجود است`
          }
          className={
            chip.available
              ? "inline-flex h-5 min-w-6 items-center justify-center rounded-md border border-line bg-cream px-1 text-[10px] font-bold text-ink-soft sm:h-6 sm:min-w-7 sm:text-xs"
              : "inline-flex h-5 min-w-6 items-center justify-center rounded-md border border-line-soft bg-white px-1 text-[10px] font-bold text-muted-soft line-through sm:h-6 sm:min-w-7 sm:text-xs"
          }
        >
          {chip.label}
        </span>
      ))}

      {extra > 0 && (
        <span className="text-[10px] font-bold text-muted-soft sm:text-xs">
          +{extra.toLocaleString("fa-IR")}
        </span>
      )}
    </div>
  );
}

interface CardMediaProps {
  primaryUrl: string | null;
  secondaryUrl: string | null;
  imageClassName: string;
  /** متن جایگزین از alt پنل (یا نام محصول). */
  imageAlt: string;
  /** ابعاد ذاتی تصویر اصلی؛ برای رزرو فضا پیش از بارگذاری. */
  imageSize?: { width: number; height: number } | null;
}

/**
 * تصویر کارت با افکت هاور.
 *
 * اگر تصویر اصلی خطا بدهد، تصویر دوم جای آن را می‌گیرد تا کارت بی‌تصویر
 * نماند. تصویرها داخل جعبهٔ نسبت‌ثابتِ والد به‌صورت absolute می‌نشینند تا
 * ارتفاع کارت هنگام لود تصویر نپرد.
 */
function CardMedia({
  primaryUrl,
  secondaryUrl,
  imageClassName,
  imageAlt,
  imageSize,
}: CardMediaProps) {
  const [primaryFailed, setPrimaryFailed] = useState(false);

  const url = primaryFailed ? secondaryUrl : primaryUrl;
  const hoverUrl = primaryFailed ? null : secondaryUrl;

  if (!url) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-soft">
        <Tag size={36} strokeWidth={1.5} />
        <span className="text-xs">تصویر محصول</span>
      </div>
    );
  }

  return (
    <>
      <img
        src={url}
        alt={imageAlt}
        width={imageSize?.width}
        height={imageSize?.height}
        loading="lazy"
        decoding="async"
        className={`${imageClassName} ${
          hoverUrl ? "group-hover/image:opacity-0" : ""
        }`}
        onError={() => setPrimaryFailed(true)}
      />

      {hoverUrl && (
        <img
          src={hoverUrl}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          className={`${imageClassName} opacity-0 group-hover/image:opacity-100`}
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      )}
    </>
  );
}

function GridPrice({
  product,
  vatPercent,
}: {
  product: WishlistProduct;
  vatPercent: number;
}) {
  const {
    originalPrice,
    discountPercent,
    discountAmount,
    finalPrice,
    hasDiscount,
  } = calculateProductPrice(
    product.price,
    product.discount_percent ?? undefined,
  );

  return (
    <div style={{ direction: "ltr", textAlign: "left" }}>
      {/* قیمت نهایی، قوی‌ترین لایهٔ سلسله‌مراتب */}
      <div className="flex items-baseline gap-1 text-lg font-black leading-tight text-ink sm:text-2xl">
        {finalPrice.toLocaleString("fa-IR")}
        <span className="text-[10px] font-medium text-muted-soft sm:text-xs">
          تومان
        </span>
      </div>

      {hasDiscount ? (
        <>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="rounded-md bg-blush-100 px-1.5 py-0.5 text-[10px] font-black text-blush-600 sm:text-xs">
              {discountPercent}٪
            </span>
            <span className="text-[10px] text-muted-soft line-through sm:text-xs">
              {originalPrice.toLocaleString("fa-IR")} تومان
            </span>
          </div>

          <div className="mt-1 truncate text-[10px] font-medium text-save sm:text-xs">
            صرفه‌جویی {discountAmount.toLocaleString("fa-IR")} تومان
          </div>
        </>
      ) : (
        product.compare_price &&
        Number(product.compare_price) > originalPrice && (
          <div className="mt-1 text-[10px] text-muted-soft line-through sm:text-xs">
            {Number(product.compare_price).toLocaleString("fa-IR")} تومان
          </div>
        )
      )}

      {/* ارزش افزوده همین‌جا روی کارت دیده می‌شود، نه فقط در مرحلهٔ پرداخت */}
      {vatPercent > 0 && Boolean(product.is_taxable) && (
        <div className="mt-1 text-[10px] font-medium text-muted-soft sm:text-xs">
          ارزش افزوده ({vatPercent.toLocaleString("fa-IR")}٪):{" "}
          {calculateVatAmount(finalPrice, vatPercent).toLocaleString("fa-IR")}{" "}
          تومان
        </div>
      )}
    </div>
  );
}

function HomePrice({
  product,
  vatPercent,
  showVat = true,
  compact = false,
}: {
  product: WishlistProduct;
  vatPercent: number;
  /* در کارت کاروسل، خط ارزش افزوده پنهان می‌شود تا ارتفاع کارت کم بماند. */
  showVat?: boolean;
  /* حالت فشرده: بدون ارتفاع رزروشده تا ارتفاع کارت از محتوا بیاید. */
  compact?: boolean;
}) {
  const {
    originalPrice,
    discountPercent,
    discountAmount,
    finalPrice,
    hasDiscount,
  } = calculateProductPrice(
    product.price,
    product.discount_percent ?? undefined,
  );

  return (
    <div
      className={`
        flex w-full flex-col items-start justify-end text-left
        ${compact ? "mt-2" : "mt-3 min-h-[70px] sm:min-h-[84px]"}
      `}
      style={{ direction: "ltr", textAlign: "left" }}
    >
      {hasDiscount ? (
        <>
          <div className="mb-2 flex w-full flex-row items-center justify-start gap-2">
            <span
              className="
                inline-flex items-center justify-center rounded-lg
                bg-blush-100 px-2.5 py-1
                text-xs font-bold text-blush-600
              "
            >
              {discountPercent}% تخفیف
            </span>

            <span className="text-sm text-muted-soft line-through">
              {originalPrice.toLocaleString("fa-IR")} تومان
            </span>
          </div>

          <div
            className="
              w-full text-left text-lg font-black leading-tight
              text-brand-600 transition-colors
              group-hover:text-brand-700
              sm:text-xl
            "
          >
            {finalPrice.toLocaleString("fa-IR")} تومان
          </div>

          <div className="mt-1 w-full text-left text-xs font-medium text-save">
            صرفه‌جویی {discountAmount.toLocaleString("fa-IR")} تومان
          </div>
        </>
      ) : (
        <>
          <div
            className="
              w-full text-left text-lg font-black leading-tight
              text-brand-600 transition-colors
              group-hover:text-brand-700
              sm:text-xl
            "
          >
            {finalPrice.toLocaleString("fa-IR")} تومان
          </div>

          {product.compare_price &&
            Number(product.compare_price) > originalPrice && (
              <div className="mt-1 w-full text-left text-sm text-muted-soft line-through">
                {Number(product.compare_price).toLocaleString("fa-IR")} تومان
              </div>
            )}
        </>
      )}

      {/* مبلغ ارزش افزوده؛ فقط برای کالاهای مشمول و وقتی مالیات فعال است */}
      {showVat && vatPercent > 0 && Boolean(product.is_taxable) && (
        <div className="mt-1 w-full text-left text-xs font-medium text-muted-soft">
          ارزش افزوده ({vatPercent.toLocaleString("fa-IR")}٪):{" "}
          {calculateVatAmount(finalPrice, vatPercent).toLocaleString("fa-IR")}{" "}
          تومان
        </div>
      )}
    </div>
  );
}

/**
 * کارت شبکهٔ صفحهٔ محصولات؛ تمام کارت یک لینک است و دکمه‌های علاقه‌مندی و
 * نمایش سریع با جلوگیری از ناوبری، عمل خودشان را انجام می‌دهند.
 */
function GridCard({
  product,
  className = "",
  showWishlistButton,
  onQuickView,
  vatPercent,
}: Props & {
  showWishlistButton: boolean;
  onQuickView: () => void;
  vatPercent: number;
}) {
  const imageUrl = productCardImageUrl(product);
  const hoverImageUrl = productCardHoverImageUrl(product);
  const imageAlt = productCardImageAlt(product);
  const imageSize = productCardImageSize(product);
  const sizeChips = productCardSizeChips(product);

  return (
    /*
      دکمه‌های علاقه‌مندی و نمایش سریع «خواهر» لینک کارت‌اند، نه داخل آن؛
      قرار دادن button داخل a (HTML نامعتبر) هم فوکوس را خراب می‌کرد و هم
      در تست‌های دسترس‌پذیری به‌عنوان هم‌پوشانی گزارش می‌شد.
    */
    <article
      className={`
        group relative flex h-full flex-col rounded-2xl border
        border-line bg-white shadow-sm transition-all duration-300
        hover:-translate-y-1 hover:border-brand-300 hover:shadow-lg
        sm:rounded-card ${className}
      `}
    >
      <Link
        to={`/product/${product.slug}`}
        aria-label={`مشاهده ${product.name}`}
        className="
          flex h-full flex-col overflow-hidden rounded-2xl
          focus-visible:outline-none focus-visible:ring-2
          focus-visible:ring-brand-400 sm:rounded-card
        "
      >
        <div className="flex h-full flex-1 flex-col p-2 sm:p-3">
          <div className="relative shrink-0">
            {/* نسبت ثابت ۴:۵ → ارتفاع کارت هنگام لود تصویر نمی‌پرد */}
            <div className="group/image relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-cream-deep transition-colors duration-300 group-hover:bg-brand-50">
              <CardMedia
                primaryUrl={imageUrl}
                secondaryUrl={hoverImageUrl}
                imageAlt={imageAlt}
                imageSize={imageSize}
                imageClassName="absolute inset-0 h-full w-full object-contain p-3 transition-[opacity,transform] duration-500 ease-out group-hover/image:scale-[1.03] motion-reduce:transition-none sm:p-4"
              />

              {Number(product.discount_percent ?? 0) > 0 && (
                <div className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-lg bg-discount px-2 py-1 text-[10px] font-black text-white shadow-sm sm:right-3 sm:top-3 sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-xs">
                  <Tag size={12} />
                  {Number(product.discount_percent)}٪ تخفیف
                </div>
              )}

              {product.stock <= 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
                  <span className="rounded-xl bg-ink px-3 py-2 text-xs font-bold text-white sm:px-4 sm:text-sm">
                    ناموجود
                  </span>
                </div>
              )}
            </div>
          </div>

        <div className="flex flex-1 flex-col px-1 pt-3">
          {/* ارتفاع‌ها «min-h» هستند تا با فاصله‌گذاری بزرگ‌تر متن
              (WCAG 1.4.12) متن روی بلوک بعدی نیفتد. */}
          <div className="mb-1 min-h-4">
            {product.category?.name && (
              <div className="line-clamp-1 text-[10px] font-bold text-brand-600 sm:text-xs">
                {product.category.name}
              </div>
            )}
          </div>

          <h3 className="line-clamp-2 min-h-10 text-sm font-black leading-5 text-ink transition-colors group-hover:text-brand-700 sm:min-h-12 sm:text-base sm:leading-6">
            {product.name}
          </h3>

          <div className="mt-1 min-h-8 sm:min-h-10">
            {product.short_description && (
              <p className="line-clamp-2 text-[10px] leading-4 text-muted sm:text-xs sm:leading-5">
                {product.short_description}
              </p>
            )}
          </div>

          {/* سایزهای موجود؛ ارتفاع رزرو شده تا کارت‌های بدون سایز هم‌تراز بمانند */}
          <div className="mt-1 flex min-h-5 shrink-0 items-center sm:min-h-6">
            <SizeChips chips={sizeChips.chips} extra={sizeChips.extra} />
          </div>

          <div className="min-h-[68px] shrink-0 pt-1 sm:min-h-[76px]">
            <GridPrice product={product} vatPercent={vatPercent} />
          </div>

          <div className="mt-2 flex min-h-5 shrink-0 flex-wrap items-center justify-between gap-1 text-[10px] sm:text-xs">
            {product.stock > 0 ? (
              <>
                <span className="font-bold text-stock">
                  موجود در انبار
                </span>
                <span className="text-muted-soft">
                  {product.stock.toLocaleString("fa-IR")} عدد
                </span>
              </>
            ) : (
              <span className="font-bold text-discount">فعلاً ناموجود</span>
            )}
          </div>

          <div className="mt-auto pt-2">
            <div className="group/button flex min-h-9 items-center justify-between gap-2 rounded-xl bg-brand-100 px-2 py-2 transition-colors hover:bg-brand-600 sm:min-h-10 sm:px-3">
              <span className="text-xs font-bold text-brand-700 transition-colors group-hover/button:text-white sm:text-sm">
                مشاهده محصول
              </span>
              <ArrowLeft
                size={15}
                className="shrink-0 text-brand-500 transition-all group-hover/button:-translate-x-1 group-hover/button:text-white sm:size-[16px]"
              />
            </div>
          </div>
        </div>
      </div>
      </Link>

      {showWishlistButton && (
        <WishlistButton
          product={product}
          className="absolute left-4 top-4 z-10 h-8 w-8 sm:left-6 sm:top-6 sm:h-9 sm:w-9"
        />
      )}

      {/* نمایش سریع: مودال بدون ترک صفحهٔ فهرست */}
      <button
        type="button"
        onClick={onQuickView}
        aria-label={`نمایش سریع ${product.name}`}
        title="نمایش سریع"
        className="absolute left-4 top-14 z-10 flex h-8 w-8 items-center justify-center rounded-xl border border-white bg-white/90 text-muted-soft backdrop-blur-sm transition-all hover:border-brand-300 hover:text-brand-600 sm:left-6 sm:top-[68px] sm:h-9 sm:w-9"
      >
        <Eye size={16} />
      </button>
    </article>
  );
}

/**
 * کارت ریل‌های صفحهٔ اصلی؛ شبیه نسخهٔ قبلی صفحهٔ اصلی ولی با قلب
 * علاقه‌مندی مشترک.
 */
function HomeCard({
  product,
  className = "",
  showWishlistButton,
  onQuickView,
  vatPercent,
}: Props & {
  showWishlistButton: boolean;
  onQuickView: () => void;
  vatPercent: number;
}) {
  const imageUrl = productCardImageUrl(product);
  const hoverImageUrl = productCardHoverImageUrl(product);
  const imageAlt = productCardImageAlt(product);
  const imageSize = productCardImageSize(product);
  const sizeChips = productCardSizeChips(product);

  return (
    <article
      className={`
        group relative flex h-full min-w-0 flex-col
        rounded-2xl border border-line
        bg-white p-3 shadow-sm
        transition-all duration-300 ease-out
        hover:-translate-y-1 hover:border-brand-300
        hover:shadow-[0_14px_36px_rgba(61,92,63,0.10)]
        sm:rounded-3xl sm:p-4 lg:p-5 ${className}
      `}
    >
      <div className="relative">
        <Link
          to={`/product/${product.slug}`}
          className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          aria-label={`مشاهده ${product.name}`}
        >
          <div
            className="
              group/image relative mb-3 aspect-[4/5] w-full shrink-0
              overflow-hidden rounded-2xl bg-cream-deep
              transition-colors duration-300
              group-hover:bg-brand-50
              sm:mb-5
            "
          >
            <CardMedia
              primaryUrl={imageUrl}
              secondaryUrl={hoverImageUrl}
              imageAlt={imageAlt}
              imageSize={imageSize}
              imageClassName="absolute inset-0 h-full w-full object-contain p-3 transition-[opacity,transform] duration-500 ease-out group-hover/image:scale-[1.03] motion-reduce:transition-none sm:p-4"
            />
          </div>
        </Link>

        {/* دکمه‌ها بیرون از لینک‌اند تا button داخل a (HTML نامعتبر) نداشته باشیم */}
        {showWishlistButton && (
          <WishlistButton
            product={product}
            className="absolute left-2 top-2 z-10 h-8 w-8 sm:h-9 sm:w-9"
          />
        )}

        <button
          type="button"
          onClick={onQuickView}
          aria-label={`نمایش سریع ${product.name}`}
          title="نمایش سریع"
          className="absolute left-2 top-12 z-10 flex h-8 w-8 items-center justify-center rounded-xl border border-white bg-white/90 text-muted-soft backdrop-blur-sm transition-all hover:border-brand-300 hover:text-brand-600 sm:top-14 sm:h-9 sm:w-9"
        >
          <Eye size={15} />
        </button>
      </div>

      <div className="mb-1.5 flex items-center gap-2 sm:mb-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-600 sm:px-2.5 sm:py-1 sm:text-xs">
          <Sparkles size={11} />
          انتخاب ویژه
        </span>
      </div>

      <Link to={`/product/${product.slug}`} className="block">
        <h3
          className="
            min-h-10 break-words text-[15px] font-black leading-5
            text-ink line-clamp-2
            transition-colors duration-200
            group-hover:text-brand-600
            sm:min-h-12 sm:text-lg sm:leading-6
          "
        >
          {product.name}
        </h3>
      </Link>

      <p className="mt-1.5 min-h-8 break-words text-[11px] leading-4 text-muted line-clamp-2 sm:mt-2 sm:min-h-10 sm:text-sm sm:leading-5">
        {product.short_description || "\u00a0"}
      </p>

      <div className="mt-1.5 flex min-h-5 shrink-0 items-center sm:mt-2 sm:min-h-6">
        <SizeChips chips={sizeChips.chips} extra={sizeChips.extra} />
      </div>

      <HomePrice product={product} vatPercent={vatPercent} />

      <Link
        to={`/product/${product.slug}`}
        className="
          mt-3 w-full !rounded-xl
          inline-flex items-center justify-center gap-2
          bg-brand-500 px-3 py-2
          text-xs font-bold text-white
          transition-all duration-150
          hover:bg-brand-600
          active:scale-[0.98]
          sm:mt-4 sm:px-4 sm:py-2.5 sm:text-sm
        "
      >
        <span className="inline-flex w-full items-center justify-center gap-2">
          مشاهده محصول
          <ArrowLeft
            size={16}
            className="transition-transform duration-200 group-hover:-translate-x-1"
          />
        </span>
      </Link>
    </article>
  );
}

/**
 * کارت کاروسل افقی صفحهٔ اصلی (بخش «محصولات ویژه»).
 *
 * برای اینکه ریل یک‌ردیفه و کم‌ارتفاع بماند فقط اطلاعات تعیین‌کننده نمایش داده
 * می‌شود: تصویر مربعی، نام، قیمت و وضعیت موجودی. چیپ سایزها و خط ارزش افزوده
 * روی این کارت نمی‌آیند (در کارت شبکه و صفحهٔ محصول دیده می‌شوند) و به‌جای
 * ارتفاع‌های رزروشده از `mt-auto` استفاده می‌شود تا دکمهٔ همهٔ کارت‌ها در یک
 * خط پایین بنشیند. عرض هر کارت هم اینجا تعیین می‌شود تا در موبایل یک کارت و
 * کمی از کارت بعدی و در دسکتاپ چهار کارت در دید باشد.
 */
function RailCard({
  product,
  className = "",
  showWishlistButton,
  onQuickView,
  vatPercent,
}: Props & {
  showWishlistButton: boolean;
  onQuickView: () => void;
  vatPercent: number;
}) {
  const imageUrl = productCardImageUrl(product);
  const hoverImageUrl = productCardHoverImageUrl(product);
  const imageAlt = productCardImageAlt(product);
  const imageSize = productCardImageSize(product);

  return (
    <article
      className={`
        group relative flex h-full w-full snap-start flex-col
        rounded-2xl border border-line bg-white p-3 shadow-sm
        transition-all duration-300 ease-out
        hover:-translate-y-1 hover:border-brand-300
        hover:shadow-[0_14px_36px_rgba(61,92,63,0.10)]
        sm:p-4 ${className}
      `}
    >
      <Link
        to={`/product/${product.slug}`}
        aria-label={`مشاهده ${product.name}`}
        className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
      >
        {/* نسبت مربعی به‌جای ۴:۵ کارت صفحهٔ اصلی؛ ارتفاع ریل را کوتاه می‌کند */}
        <div className="group/image relative aspect-square w-full shrink-0 overflow-hidden rounded-xl bg-cream-deep transition-colors duration-300 group-hover:bg-brand-50">
          <CardMedia
            primaryUrl={imageUrl}
            secondaryUrl={hoverImageUrl}
            imageAlt={imageAlt}
            imageSize={imageSize}
            imageClassName="absolute inset-0 h-full w-full object-contain p-3 transition-[opacity,transform] duration-500 ease-out group-hover/image:scale-[1.03] motion-reduce:transition-none"
          />

          {Number(product.discount_percent ?? 0) > 0 && (
            <div className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-lg bg-discount px-1.5 py-0.5 text-[10px] font-black text-white shadow-sm">
              <Tag size={11} />
              {Number(product.discount_percent)}٪ تخفیف
            </div>
          )}

          {product.stock <= 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
              <span className="rounded-xl bg-ink px-3 py-1.5 text-xs font-bold text-white">
                ناموجود
              </span>
            </div>
          )}
        </div>
      </Link>

      {/* دکمه‌ها بیرون از لینک‌اند تا button داخل a (HTML نامعتبر) نداشته باشیم */}
      {showWishlistButton && (
        <WishlistButton
          product={product}
          className="absolute left-2 top-2 z-10 h-8 w-8"
        />
      )}

      <button
        type="button"
        onClick={onQuickView}
        aria-label={`نمایش سریع ${product.name}`}
        title="نمایش سریع"
        className="absolute left-2 top-[46px] z-10 flex h-8 w-8 items-center justify-center rounded-xl border border-white bg-white/90 text-muted-soft backdrop-blur-sm transition-all hover:border-brand-300 hover:text-brand-600"
      >
        <Eye size={15} />
      </button>

      <Link to={`/product/${product.slug}`} className="mt-2 block">
        <h3 className="line-clamp-2 min-h-10 break-words text-sm font-black leading-5 text-ink transition-colors duration-200 group-hover:text-brand-700">
          {product.name}
        </h3>
      </Link>

      <HomePrice product={product} vatPercent={vatPercent} showVat={false} compact />

      <div className="mt-1 flex min-h-4 items-center justify-between gap-2 text-[10px] sm:text-xs">
        {product.stock > 0 ? (
          <>
            <span className="font-bold text-stock">موجود در انبار</span>
            <span className="text-muted-soft">
              {product.stock.toLocaleString("fa-IR")} عدد
            </span>
          </>
        ) : (
          <span className="font-bold text-discount">فعلاً ناموجود</span>
        )}
      </div>

      <div className="mt-auto pt-3">
        <Link
          to={`/product/${product.slug}`}
          className="
            group/button flex min-h-9 w-full items-center justify-between
            gap-1.5 rounded-xl bg-brand-100 px-2.5 py-2
            transition-colors hover:bg-brand-600
          "
        >
          <span className="text-xs font-bold text-brand-700 transition-colors group-hover/button:text-white">
            مشاهده محصول
          </span>
          <ArrowLeft
            size={14}
            className="shrink-0 text-brand-500 transition-all group-hover/button:-translate-x-1 group-hover/button:text-white"
          />
        </Link>
      </div>
    </article>
  );
}

/**
 * کارت محصول مشترک فروشگاه؛ تنها نقطهٔ رندر کارت محصول در سایت.
 *
 * دکمهٔ «نمایش سریع» مودالی را باز می‌کند که همین‌جا مدیریت می‌شود تا هر
 * کارت مستقلاً و بدون context اضافه کار کند.
 */
export default function ProductCard({
  product,
  variant = "grid",
  className = "",
  showWishlistButton = true,
}: Props) {
  const [quickViewOpen, setQuickViewOpen] = useState(false);

  /*
   * درصد ارزش افزوده از تنظیمات فروشگاه می‌آید (همان منبعی که چک‌اوت استفاده
   * می‌کند)؛ اگر مالیات خاموش باشد یا درصد صفر باشد، خط ارزش افزوده روی کارت
   * نمایش داده نمی‌شود.
   */
  const { vat_enabled, vat_percent } = useStoreSettings();
  const vatPercent = vat_enabled
    ? Math.min(Math.max(Number(vat_percent) || 0, 0), 100)
    : 0;

  return (
    <>
      {variant === "home" ? (
        <HomeCard
          product={product}
          className={className}
          showWishlistButton={showWishlistButton}
          onQuickView={() => setQuickViewOpen(true)}
          vatPercent={vatPercent}
        />
      ) : variant === "rail" ? (
        <RailCard
          product={product}
          className={className}
          showWishlistButton={showWishlistButton}
          onQuickView={() => setQuickViewOpen(true)}
          vatPercent={vatPercent}
        />
      ) : (
        <GridCard
          product={product}
          className={className}
          showWishlistButton={showWishlistButton}
          onQuickView={() => setQuickViewOpen(true)}
          vatPercent={vatPercent}
        />
      )}

      {quickViewOpen && (
        <QuickViewModal
          product={product}
          onClose={() => setQuickViewOpen(false)}
        />
      )}
    </>
  );
}


