import { useState } from "react";
import type { MouseEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Heart, Sparkles, Tag } from "lucide-react";

import { useWishlist } from "../context/WishlistContext";
import type { WishlistProduct } from "../services/wishlist";
import { getStorageUrl } from "../utils/images";
import { calculateProductPrice } from "../utils/price";

/**
 * دو نمای کارت محصول:
 * - grid: شبکهٔ صفحهٔ محصولات (فشرده، مناسب موبایل)
 * - home: ریل‌های صفحهٔ اصلی (بزرگ‌تر، با نشان «انتخاب ویژه»)
 */
export type ProductCardVariant = "grid" | "home";

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
  product: WishlistProduct;
  primaryUrl: string | null;
  secondaryUrl: string | null;
  imageClassName: string;
}

/**
 * تصویر کارت با افکت هاور.
 *
 * اگر تصویر اصلی خطا بدهد، تصویر دوم جای آن را می‌گیرد تا کارت بی‌تصویر
 * نماند. تصویرها داخل جعبهٔ نسبت‌ثابتِ والد به‌صورت absolute می‌نشینند تا
 * ارتفاع کارت هنگام لود تصویر نپرد.
 */
function CardMedia({
  product,
  primaryUrl,
  secondaryUrl,
  imageClassName,
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
        alt={product.name}
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

function GridPrice({ product }: { product: WishlistProduct }) {
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
    </div>
  );
}

function HomePrice({ product }: { product: WishlistProduct }) {
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
              w-full text-left text-xl font-black
              text-brand-600 transition-colors
              group-hover:text-brand-700
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
              w-full text-left text-xl font-black
              text-brand-600 transition-colors
              group-hover:text-brand-700
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
    </div>
  );
}

/**
 * کارت شبکهٔ صفحهٔ محصولات؛ تمام کارت یک لینک است و دکمهٔ علاقه‌مندی
 * جلوگیری از ناوبری می‌کند.
 */
function GridCard({
  product,
  className = "",
  showWishlistButton,
}: Props & { showWishlistButton: boolean }) {
  const imageUrl = productCardImageUrl(product);
  const hoverImageUrl = productCardHoverImageUrl(product);
  const sizeChips = productCardSizeChips(product);

  return (
    <Link
      to={`/product/${product.slug}`}
      className={`
        group flex h-full flex-col overflow-hidden rounded-2xl border
        border-line bg-white shadow-sm transition-all duration-300
        hover:-translate-y-1 hover:border-brand-300 hover:shadow-lg
        sm:rounded-card ${className}
      `}
    >
      <div className="flex h-full flex-1 flex-col p-2 sm:p-3">
        <div className="relative shrink-0">
          {/* نسبت ثابت ۴:۵ → ارتفاع کارت هنگام لود تصویر نمی‌پرد */}
          <div className="group/image relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-cream-deep transition-colors duration-300 group-hover:bg-brand-50">
            <CardMedia
              product={product}
              primaryUrl={imageUrl}
              secondaryUrl={hoverImageUrl}
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

          {showWishlistButton && (
            <WishlistButton
              product={product}
              className="absolute left-2 top-2 h-8 w-8 sm:left-3 sm:top-3 sm:h-9 sm:w-9"
            />
          )}
        </div>

        <div className="flex flex-1 flex-col px-1 pt-3">
          <div className="mb-1 h-4">
            {product.category?.name && (
              <div className="line-clamp-1 text-[10px] font-bold text-brand-600 sm:text-xs">
                {product.category.name}
              </div>
            )}
          </div>

          <h3 className="line-clamp-2 h-10 overflow-hidden text-sm font-black leading-5 text-ink transition-colors group-hover:text-brand-700 sm:h-12 sm:text-base sm:leading-6">
            {product.name}
          </h3>

          <div className="mt-1 h-8 overflow-hidden sm:h-10">
            {product.short_description && (
              <p className="line-clamp-2 text-[10px] leading-4 text-muted sm:text-xs sm:leading-5">
                {product.short_description}
              </p>
            )}
          </div>

          {/* سایزهای موجود؛ ارتفاع رزرو شده تا کارت‌های بدون سایز هم‌تراز بمانند */}
          <div className="mt-1 flex h-5 shrink-0 items-center sm:h-6">
            <SizeChips chips={sizeChips.chips} extra={sizeChips.extra} />
          </div>

          <div className="h-[68px] shrink-0 pt-1 sm:h-[76px]">
            <GridPrice product={product} />
          </div>

          <div className="mt-2 flex h-5 shrink-0 items-center justify-between gap-1 text-[10px] sm:text-xs">
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
            <div className="group/button flex h-9 items-center justify-between gap-2 rounded-xl bg-brand-100 px-2 py-2 transition-colors hover:bg-brand-600 sm:h-10 sm:px-3">
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
  );
}

/**
 * کارت ریل‌های صفحهٔ اصلی؛ شبیه نسخهٔ قبلی صفحهٔ اصلی ولی با قلب
 * علاقه‌مندی مشترک.
 */
function HomeCard({ product, className = "", showWishlistButton }: Props & { showWishlistButton: boolean }) {
  const imageUrl = productCardImageUrl(product);
  const hoverImageUrl = productCardHoverImageUrl(product);
  const sizeChips = productCardSizeChips(product);

  return (
    <article
      className={`
        group flex h-full min-w-0 flex-col
        rounded-3xl border border-line
        bg-white p-4 shadow-sm
        transition-all duration-300 ease-out
        hover:-translate-y-1 hover:border-brand-300
        hover:shadow-[0_14px_36px_rgba(61,92,63,0.10)]
        sm:p-5 ${className}
      `}
    >
      <Link
        to={`/product/${product.slug}`}
        className="relative block"
        aria-label={`مشاهده ${product.name}`}
      >
        <div
          className="
            group/image relative mb-5 aspect-[4/5] w-full shrink-0
            overflow-hidden rounded-2xl bg-cream-deep
            transition-colors duration-300
            group-hover:bg-brand-50
          "
        >
          <CardMedia
            product={product}
            primaryUrl={imageUrl}
            secondaryUrl={hoverImageUrl}
            imageClassName="absolute inset-0 h-full w-full object-contain p-4 transition-[opacity,transform] duration-500 ease-out group-hover/image:scale-[1.03] motion-reduce:transition-none"
          />
        </div>

        {showWishlistButton && (
          <WishlistButton
            product={product}
            className="absolute left-2 top-2 h-9 w-9"
          />
        )}
      </Link>

      <div className="mb-2 flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-600">
          <Sparkles size={12} />
          انتخاب ویژه
        </span>
      </div>

      <Link to={`/product/${product.slug}`} className="block">
        <h3
          className="
            min-h-12 break-words text-lg font-black leading-6
            text-ink line-clamp-2
            transition-colors duration-200
            group-hover:text-brand-600
          "
        >
          {product.name}
        </h3>
      </Link>

      <p className="mt-2 min-h-10 break-words text-sm leading-5 text-muted line-clamp-2">
        {product.short_description || "\u00a0"}
      </p>

      <div className="mt-2 flex h-6 shrink-0 items-center">
        <SizeChips chips={sizeChips.chips} extra={sizeChips.extra} />
      </div>

      <HomePrice product={product} />

      <Link
        to={`/product/${product.slug}`}
        className="
          mt-4 w-full !rounded-xl
          inline-flex items-center justify-center gap-2
          bg-brand-500 px-4 py-2.5
          text-sm font-bold text-white
          transition-all duration-150
          hover:bg-brand-600
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
      </Link>
    </article>
  );
}

/**
 * کارت محصول مشترک فروشگاه؛ تنها نقطهٔ رندر کارت محصول در سایت.
 */
export default function ProductCard({
  product,
  variant = "grid",
  className = "",
  showWishlistButton = true,
}: Props) {
  if (variant === "home") {
    return (
      <HomeCard
        product={product}
        className={className}
        showWishlistButton={showWishlistButton}
      />
    );
  }

  return (
    <GridCard
      product={product}
      className={className}
      showWishlistButton={showWishlistButton}
    />
  );
}


