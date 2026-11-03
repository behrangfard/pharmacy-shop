import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Package,
  ShieldCheck,
  Layers,
} from "lucide-react";

import Layout from "../components/Layout";
import { getStorageUrl } from "../utils/images";
import { useCart } from "../context/CartContext";

interface CartItemView {
  id: number;
  cartKey?: string;
  variant_id?: number | null;
  variant_name?: string | null;
  sku?: string;
  name: string;
  slug: string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  thumbnail?: string;
  quantity: number;
  stock: number;
  is_taxable?: boolean;
}

function Cart() {
  const { items, cartTotal, removeFromCart, updateQuantity, clearCart } =
    useCart();

  const cartItems = items as CartItemView[];

  const getCartKey = (item: CartItemView) =>
    item.cartKey ?? `${item.id}:${item.variant_id ?? "default"}`;

  const formatPrice = (price: number) =>
    Number(price || 0).toLocaleString("fa-IR");

  const getImageUrl = (path?: string | null) => {
    if (!path) return null;

    const trimmedPath = path.trim();

    if (!trimmedPath) return null;

    if (/^https?:\/\//i.test(trimmedPath) || trimmedPath.startsWith("data:")) {
      return trimmedPath;
    }

    return getStorageUrl(trimmedPath);
  };

  const cartOriginalTotal = cartItems.reduce((total, item) => {
    const originalPrice = Number(item.originalPrice ?? item.price);
    return total + originalPrice * item.quantity;
  }, 0);

  const calculatedCartTotal = cartItems.reduce(
    (total, item) => total + Number(item.price) * item.quantity,
    0,
  );

  const finalCartTotal = Number.isFinite(Number(cartTotal))
    ? Number(cartTotal)
    : calculatedCartTotal;

  const cartDiscount = Math.max(0, cartOriginalTotal - finalCartTotal);

  const totalQuantity = cartItems.reduce(
    (total, item) => total + item.quantity,
    0,
  );

  const handleIncrease = (item: CartItemView) => {
    if (item.quantity >= item.stock) return;

    updateQuantity(getCartKey(item), Math.min(item.stock, item.quantity + 1));
  };

  const handleDecrease = (item: CartItemView) => {
    if (item.quantity <= 1) return;

    updateQuantity(getCartKey(item), item.quantity - 1);
  };

  const handleRemove = (item: CartItemView) => {
    removeFromCart(getCartKey(item));
  };

  if (cartItems.length === 0) {
    return (
      <Layout>
        <section className="mx-auto max-w-5xl px-6 py-16">
          <div className="rounded-3xl border border-slate-100 bg-white p-8 text-center sm:p-12">
            <div
              className="
                mx-auto flex h-20 w-20 items-center justify-center
                rounded-full bg-[#f0f3e9] text-[#385e3e]
                transition-transform duration-300 hover:scale-110
              "
            >
              <ShoppingCart size={36} />
            </div>

            <h1 className="mt-6 text-2xl font-black text-slate-900">
              سبد خرید شما خالی است
            </h1>

            <p className="mt-3 text-sm leading-8 text-slate-500">
              هنوز محصولی به سبد خرید خود اضافه نکرده‌اید. می‌توانید محصولات
              فروشگاه را مشاهده کنید و خرید خود را شروع کنید.
            </p>

            <Link
              to="/products"
              className="
                mt-7 inline-flex items-center justify-center gap-2
                rounded-xl bg-[#385e3e] px-6 py-3
                font-bold text-white transition
                hover:bg-[#2d4d33]
              "
            >
              مشاهده محصولات
              <ArrowLeft size={18} />
            </Link>
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {/* Page Header */}
        <div className="mb-8">
          <Link
            to="/products"
            className="
              inline-flex items-center gap-2 text-sm
              text-slate-500 transition hover:text-[#385e3e]
            "
          >
            <ArrowRight size={17} />
            ادامه خرید
          </Link>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
                سبد خرید
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                {totalQuantity.toLocaleString("fa-IR")} عدد محصول در سبد خرید
                شما
              </p>
            </div>

            <button
              type="button"
              onClick={clearCart}
              className="
                inline-flex items-center gap-2 rounded-xl
                border border-red-100 px-4 py-2.5
                text-sm font-bold text-red-500 transition
                hover:bg-red-50
              "
            >
              <Trash2 size={16} />
              خالی کردن سبد خرید
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
          {/* Cart Items */}
          <div className="space-y-4 lg:col-span-2">
            {cartItems.map((item) => {
              const imageUrl = getImageUrl(item.thumbnail);
              const itemTotal = Number(item.price) * item.quantity;
              const originalPrice = Number(item.originalPrice ?? item.price);
              const hasDiscount = originalPrice > Number(item.price);

              return (
                <article
                  key={getCartKey(item)}
                  className="
                    overflow-hidden rounded-2xl border
                    border-slate-100 bg-white p-4 sm:p-5
                  "
                >
                  <div className="flex flex-col gap-5 sm:flex-row">
                    {/* Product Image */}
                    <Link
                      to={`/product/${item.slug}`}
                      className="
                        flex h-36 w-full shrink-0 items-center
                        justify-center overflow-hidden rounded-xl
                        bg-slate-50 sm:h-36 sm:w-36
                      "
                    >
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={item.name}
                          className="h-full w-full object-contain p-3"
                        />
                      ) : (
                        <Package size={38} className="text-slate-300" />
                      )}
                    </Link>

                    {/* Product Information */}
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            to={`/product/${item.slug}`}
                            className="
                              text-base font-black text-slate-800
                              transition hover:text-[#385e3e]
                            "
                          >
                            {item.name}
                          </Link>

                          {item.variant_name && (
                            <div className="mt-2 flex items-center gap-2 text-sm text-[#385e3e]">
                              <Layers size={15} />
                              <span className="font-bold">
                                تنوع: {item.variant_name}
                              </span>
                            </div>
                          )}

                          {item.sku && (
                            <p className="mt-2 text-xs text-slate-400">
                              کد کالا: {item.sku}
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemove(item)}
                          aria-label={`حذف ${item.name} از سبد خرید`}
                          className="
                            inline-flex shrink-0 items-center gap-1.5
                            rounded-lg px-2 py-1.5 text-sm
                            text-red-500 transition
                            hover:bg-red-50 hover:text-red-600
                          "
                        >
                          <Trash2 size={16} />
                          حذف
                        </button>
                      </div>

                      {/* Price */}
                      <div
                        className="mt-4 flex flex-wrap items-center gap-3"
                        style={{ direction: "ltr" }}
                      >
                        {hasDiscount && (
                          <span className="text-sm text-slate-400 line-through">
                            {formatPrice(originalPrice)} تومان
                          </span>
                        )}

                        <span className="text-lg font-black text-[#385e3e]">
                          {formatPrice(Number(item.price))} تومان
                        </span>
                      </div>

                      {/* Quantity and Total */}
                      <div className="mt-5 flex flex-col justify-between gap-4 border-t border-slate-100 pt-4 sm:flex-row sm:items-end">
                        <div>
                          <div className="mb-2 text-xs text-slate-400">
                            تعداد
                          </div>

                          <div
                            className="
                              inline-flex items-center overflow-hidden
                              rounded-xl border border-slate-200 bg-white
                            "
                          >
                            <button
                              type="button"
                              onClick={() => handleDecrease(item)}
                              disabled={item.quantity <= 1}
                              aria-label="کاهش تعداد"
                              className="
                                flex h-10 w-10 items-center justify-center
                                text-slate-600 transition
                                hover:bg-[#f0f3e9] hover:text-[#385e3e]
                                disabled:cursor-not-allowed disabled:opacity-40
                              "
                            >
                              <Minus size={16} />
                            </button>

                            <span className="w-12 text-center text-sm font-bold text-slate-800">
                              {item.quantity.toLocaleString("fa-IR")}
                            </span>

                            <button
                              type="button"
                              onClick={() => handleIncrease(item)}
                              disabled={item.quantity >= item.stock}
                              aria-label="افزایش تعداد"
                              className="
                                flex h-10 w-10 items-center justify-center
                                text-slate-600 transition
                                hover:bg-[#f0f3e9] hover:text-[#385e3e]
                                disabled:cursor-not-allowed disabled:opacity-40
                              "
                            >
                              <Plus size={16} />
                            </button>
                          </div>

                          <p className="mt-2 text-xs text-slate-400">
                            موجودی: {item.stock.toLocaleString("fa-IR")} عدد
                          </p>
                        </div>

                        <div
                          className="
                            w-full rounded-xl border border-slate-100
                            bg-slate-50 px-4 py-3 text-left sm:w-auto
                            sm:min-w-44
                          "
                          style={{ direction: "ltr" }}
                        >
                          <div className="text-xs font-medium text-slate-400">
                            مبلغ این ردیف
                          </div>

                          <div className="mt-1 text-lg font-black text-slate-800">
                            {formatPrice(itemTotal)} تومان
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}

            {/* Continue Shopping */}
            <Link
              to="/products"
              className="
                inline-flex items-center gap-2 rounded-xl
                px-2 py-3 text-sm font-bold text-[#385e3e]
                transition hover:gap-3
              "
            >
              <ArrowRight size={17} />
              افزودن محصولات دیگر
            </Link>
          </div>

          {/* Order Summary */}
          <aside className="lg:sticky lg:top-6">
            <div className="rounded-2xl border border-slate-100 bg-white p-5 sm:p-6">
              <h2 className="text-lg font-black text-slate-900">خلاصه سفارش</h2>

              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">تعداد کالا</span>

                  <span className="font-bold text-slate-800">
                    {totalQuantity.toLocaleString("fa-IR")} عدد
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">قیمت محصولات</span>

                  <span className="font-bold text-slate-800">
                    {formatPrice(cartOriginalTotal)} تومان
                  </span>
                </div>

                {cartDiscount > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">تخفیف محصولات</span>

                    <span className="font-bold text-green-600">
                      {formatPrice(cartDiscount)} تومان
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">هزینه ارسال</span>

                  <span className="font-bold text-green-600">رایگان</span>
                </div>

                <div className="border-t border-dashed border-slate-200 pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold text-slate-700">
                      مبلغ قابل پرداخت
                    </span>

                    <div className="text-left" style={{ direction: "ltr" }}>
                      <div className="text-xl font-black text-[#385e3e]">
                        {formatPrice(finalCartTotal)}
                      </div>

                      <div className="mt-1 text-xs text-slate-400">تومان</div>
                    </div>
                  </div>
                </div>
              </div>

              <Link
                to="/checkout"
                className="
                  mt-6 flex w-full items-center justify-center gap-2
                  rounded-xl bg-[#385e3e] px-5 py-4
                  text-sm font-black text-white transition
                  hover:bg-[#2d4d33]
                "
              >
                ادامه و تکمیل خرید
                <ArrowLeft size={18} />
              </Link>

              <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-400">
                <ShieldCheck size={16} className="text-green-600" />
                خرید امن و پرداخت مطمئن
              </div>
            </div>
          </aside>
        </div>
      </section>
    </Layout>
  );
}

export default Cart;
