import { useState } from "react";

import { Link } from "react-router-dom";

import { CheckCircle2, ShoppingCart } from "lucide-react";

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
      discountPercent: discountPercent,
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
    <div
      className="
        group
        bg-white
        rounded-2xl
        shadow-sm
        border
        border-slate-100
        overflow-hidden
        transition-all
        duration-300
        hover:-translate-y-1
        hover:shadow-xl
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
                transition-transform
                duration-500
                group-hover:scale-110
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
                transition-transform
                duration-300
                group-hover:scale-105
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
              transition-all
              duration-200
              hover:text-blue-600
              hover:translate-x-0.5
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

        <div
          className="
            mt-4
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
                  text-slate-400
                  text-sm
                  line-through
                  text-left
                "
              >
                {price.toLocaleString("fa-IR")} تومان
              </div>

              <div
                className="
                  w-full
                  text-blue-600
                  font-black
                  text-lg
                  mt-1
                  text-left
                  transition-transform
                  duration-200
                  group-hover:translate-x-0.5
                "
              >
                {finalPrice.toLocaleString("fa-IR")} تومان
              </div>
            </>
          ) : (
            <div
              className="
                w-full
                text-blue-600
                font-black
                text-lg
                text-left
                transition-transform
                duration-200
                group-hover:translate-x-0.5
              "
            >
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
          >
            {product.stock <= 0
              ? "ناموجود"
              : addedToCart
                ? "به سبد اضافه شد"
                : "افزودن به سبد"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ProductCard;
