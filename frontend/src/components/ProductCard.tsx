import { Link } from "react-router-dom";
import { ShoppingCart } from "lucide-react";

import { useCart } from "../context/CartContext";
import { calculateProductPrice } from "../utils/price";

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

  const primaryImage =
    product.images?.find((image) => image.is_primary) ?? product.images?.[0];

  const imageUrl = primaryImage
    ? `http://127.0.0.1:8000/storage/${primaryImage.path}`
    : product.thumbnail
      ? product.thumbnail
      : null;

  const {
    originalPrice: price,
    discountPercent,
    finalPrice,
    hasDiscount,
  } = calculateProductPrice(product.price, product.discount_percent);

  const handleAddToCart = () => {
    if (product.stock <= 0) {
      return;
    }

    addToCart({
      id: product.id,
      name: product.name,
      slug: product.slug || "",
      price: finalPrice,
      originalPrice: price,
      discountPercent: discountPercent,
      thumbnail: imageUrl,
      stock: product.stock,
    });
  };

  return (
    <div
      className="
        bg-white
        rounded-2xl
        shadow-sm
        border
        border-slate-100
        overflow-hidden
        hover:shadow-lg
        transition
      "
    >
      <Link
        to={
          product.slug ? `/product/${product.slug}` : `/products/${product.id}`
        }
        className="block"
      >
        <div
          className="
            h-48
            bg-slate-50
            flex
            items-center
            justify-center
            overflow-hidden
            relative
          "
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={primaryImage?.alt || product.name}
              className="
                w-full
                h-full
                object-contain
                p-5
                transition
                duration-300
                hover:scale-105
              "
            />
          ) : (
            <span className="text-slate-400 text-sm">تصویر محصول</span>
          )}

          {hasDiscount && (
            <span
              className="
                absolute
                top-3
                right-3
                bg-red-500
                text-white
                text-xs
                font-black
                px-3
                py-1.5
                rounded-full
              "
            >
              {discountPercent}% تخفیف
            </span>
          )}
        </div>
      </Link>

      <div className="p-5">
        <Link
          to={
            product.slug
              ? `/product/${product.slug}`
              : `/products/${product.id}`
          }
          className="block"
        >
          <h3
            className="
              font-bold
              text-lg
              leading-7
              text-slate-900
              line-clamp-2
              hover:text-blue-600
              transition
            "
          >
            {product.name}
          </h3>
        </Link>

        {product.short_description && (
          <p
            className="
              text-slate-500
              text-sm
              mt-2
              line-clamp-2
              min-h-10
            "
          >
            {product.short_description}
          </p>
        )}

        <div className="mt-4">
          {hasDiscount ? (
            <>
              <div className="text-slate-400 text-sm line-through">
                {price.toLocaleString("fa-IR")} تومان
              </div>

              <div className="text-blue-600 font-black text-lg mt-1">
                {finalPrice.toLocaleString("fa-IR")} تومان
              </div>
            </>
          ) : (
            <div className="text-blue-600 font-black text-lg">
              {price.toLocaleString("fa-IR")} تومان
            </div>
          )}
        </div>

        <div
          className="
            mt-4
            flex
            items-center
            justify-between
            gap-3
          "
        >
          <span
            className={`text-xs font-bold ${
              product.stock > 0 ? "text-emerald-600" : "text-red-500"
            }`}
          >
            {product.stock > 0 ? "موجود در انبار" : "ناموجود"}
          </span>

          <button
            type="button"
            disabled={product.stock <= 0}
            onClick={handleAddToCart}
            className="
              flex
              items-center
              justify-center
              gap-2
              rounded-xl
              px-4
              py-2.5
              bg-blue-600
              text-white
              text-sm
              font-bold
              hover:bg-blue-700
              transition
              disabled:bg-slate-300
              disabled:cursor-not-allowed
            "
          >
            <ShoppingCart size={18} />

            {product.stock > 0 ? "افزودن به سبد" : "ناموجود"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProductCard;
