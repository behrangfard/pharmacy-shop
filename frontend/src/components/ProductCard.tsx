import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ShoppingCart, ImageOff } from "lucide-react";
import { useCart } from "../context/CartContext";
import { calculateProductPrice } from "../utils/price";
import Button from "./Button";

interface ProductImage {
  id: number;
  path: string;
  is_primary: boolean;
  sort_order: number;
  alt?: string | null;
}

interface Product {
  id: number;
  name: string;
  price: string | number;
  discount_percent?: string | number;
  short_description?: string | null;
  slug?: string;
  stock: number;
  thumbnail?: string | null;
  images?: ProductImage[];
}

interface Props {
  product: Product;
}

function ProductCard({ product }: Props) {
  const { addToCart } = useCart();
  const [addingToCart, setAddingToCart] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const primaryImage =
    product.images?.find((image) => image.is_primary) ?? product.images?.[0];

  const imageUrl = primaryImage
    ? `http://127.0.0.1:8000/storage/${primaryImage.path}`
    : product.thumbnail || null;

  const {
    originalPrice: price,
    discountPercent,
    finalPrice,
    hasDiscount,
  } = calculateProductPrice(product.price, product.discount_percent);

  const productUrl = product.slug
    ? `/product/${product.slug}`
    : `/products/${product.id}`;

  const handleAddToCart = () => {
    if (product.stock <= 0 || addingToCart) {
      return;
    }

    setAddingToCart(true);
    setAddedToCart(false);

    addToCart({
      id: product.id,
      name: product.name,
      slug: product.slug || "",
      price: finalPrice,
      originalPrice: price,
      discountPercent,
      thumbnail: imageUrl,
      stock: product.stock,
    });

    window.setTimeout(() => {
      setAddingToCart(false);
      setAddedToCart(true);
    }, 350);

    window.setTimeout(() => {
      setAddedToCart(false);
    }, 1600);
  };

  return (
    <article
      className="
        group flex h-full flex-col overflow-hidden
        rounded-3xl border border-[#e8eee5]
        bg-white shadow-sm
        transition-all duration-300
        hover:-translate-y-1 hover:border-[#cbdcc9]
        hover:shadow-[0_14px_36px_rgba(61,92,63,0.10)]
      "
    >
      <Link to={productUrl} className="block">
        <div
          className="
            relative flex h-52 items-center justify-center
            overflow-hidden bg-[#f8f7f1]
            sm:h-56
          "
        >
          {imageUrl && !imageFailed ? (
            <img
              src={imageUrl}
              alt={primaryImage?.alt || product.name}
              loading="lazy"
              onError={() => setImageFailed(true)}
              className="
                h-full w-full object-contain p-5
                transition-transform duration-500
                group-hover:scale-105
              "
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-[#9ba99a]">
              <ImageOff size={32} strokeWidth={1.5} />
              <span className="text-xs">تصویر محصول موجود نیست</span>
            </div>
          )}

          {hasDiscount && (
            <span
              className="
                absolute right-3 top-3 rounded-full
                bg-[#e8b7c5] px-3 py-1.5
                text-xs font-extrabold text-[#713d50]
                shadow-sm
              "
            >
              {discountPercent}% تخفیف
            </span>
          )}

          {product.stock <= 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/65">
              <span className="rounded-full bg-slate-800/90 px-4 py-2 text-sm font-bold text-white">
                ناموجود
              </span>
            </div>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <Link to={productUrl} className="block">
          <h3
            className="
              line-clamp-2 min-h-14
              text-base font-extrabold leading-7
              text-[#283b2d]
              transition-colors duration-200
              group-hover:text-[#537d58]
            "
          >
            {product.name}
          </h3>
        </Link>

        {product.short_description ? (
          <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-6 text-[#7b847b]">
            {product.short_description}
          </p>
        ) : (
          <div className="mt-2 min-h-10" />
        )}

        <div
          className="mt-4 flex flex-col items-start text-left"
          style={{ direction: "ltr", textAlign: "left" }}
        >
          {hasDiscount && (
            <span className="text-sm text-[#9ca39a] line-through">
              {price.toLocaleString("fa-IR")} تومان
            </span>
          )}

          <span
            className={`
              mt-1 text-lg font-black
              ${hasDiscount ? "text-[#537d58]" : "text-[#344d38]"}
            `}
          >
            {finalPrice.toLocaleString("fa-IR")} تومان
          </span>
        </div>

        <div className="mt-auto pt-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span
              className={`
                inline-flex items-center gap-1.5
                text-xs font-bold
                ${product.stock > 0 ? "text-[#537d58]" : "text-[#c45c67]"}
              `}
            >
              <span
                className={`
                  h-2 w-2 rounded-full
                  ${product.stock > 0 ? "bg-[#83aa7d]" : "bg-[#d9828b]"}
                `}
              />
              {product.stock > 0 ? "موجود در انبار" : "ناموجود"}
            </span>
          </div>

          <Button
            type="button"
            onClick={handleAddToCart}
            disabled={product.stock <= 0 || addingToCart}
            loading={addingToCart}
            variant={addedToCart ? "success" : "primary"}
            size="sm"
            icon={
              addedToCart ? (
                <CheckCircle2 size={18} />
              ) : (
                <ShoppingCart size={18} />
              )
            }
            className="w-full !rounded-xl"
          >
            {product.stock <= 0
              ? "ناموجود"
              : addedToCart
                ? "به سبد اضافه شد"
                : "افزودن به سبد خرید"}
          </Button>
        </div>
      </div>
    </article>
  );
}

export default ProductCard;
