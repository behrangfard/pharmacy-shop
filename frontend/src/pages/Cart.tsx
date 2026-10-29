import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";

import Layout from "../components/Layout";
import Button from "../components/Button";
import { useCart } from "../context/CartContext";

function Cart() {
  const navigate = useNavigate();

  const {
    items,
    cartCount,
    cartTotal,
    removeFromCart,
    updateQuantity,
    clearCart,
  } = useCart();

  const cartOriginalTotal = items.reduce(
    (total, item) => total + (item.originalPrice ?? item.price) * item.quantity,
    0,
  );

  const cartDiscount = Math.max(0, cartOriginalTotal - cartTotal);

  if (items.length === 0) {
    return (
      <Layout>
        <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="rounded-3xl border border-[#e6ecdf] bg-white px-5 py-12 text-center shadow-sm sm:px-12">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#e8efe2] text-[#4f7754] transition-transform duration-300 hover:scale-105">
              <ShoppingCart size={36} strokeWidth={1.7} />
            </div>

            <h1 className="mt-6 text-2xl font-black text-[#354a37]">
              سبد خرید شما خالی است
            </h1>

            <p className="mt-3 text-sm leading-7 text-[#788174] sm:text-base">
              هنوز محصولی به سبد خرید اضافه نکرده‌اید. محصولات موردعلاقه‌تان را
              پیدا کنید و به سبد خریدتان اضافه کنید.
            </p>

            <Link
              to="/products"
              className="mt-7 inline-flex items-center justify-center gap-2 rounded-xl bg-[#4f7754] px-6 py-3 font-bold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#385e3e] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f7754] focus-visible:ring-offset-2 active:scale-[0.98]"
            >
              مشاهده محصولات
              <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/products"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#788174] transition-colors duration-200 hover:text-[#4f7754]"
          >
            <ArrowRight size={18} />
            ادامه خرید
          </Link>

          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-black text-[#354a37] sm:text-3xl">
                سبد خرید
              </h1>

              <p className="mt-2 text-sm text-[#788174]">
                {cartCount.toLocaleString("fa-IR")} کالا در سبد خرید شما
              </p>
            </div>

            <button
              type="button"
              onClick={clearCart}
              className="inline-flex w-fit items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-red-500 transition-colors duration-200 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            >
              <Trash2 size={17} />
              خالی کردن سبد
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3 lg:gap-8">
          {/* Cart Items */}
          <div className="min-w-0 space-y-4 lg:col-span-2">
            {items.map((item) => {
              const originalPrice = item.originalPrice ?? item.price;
              const discountPercent = item.discountPercent ?? 0;
              const itemTotal = item.price * item.quantity;
              const itemSavings = (originalPrice - item.price) * item.quantity;
              const hasDiscount =
                discountPercent > 0 && originalPrice > item.price;

              return (
                <article
                  key={item.id}
                  className="flex min-w-0 flex-col gap-4 rounded-2xl border border-[#e6ecdf] bg-white p-4 shadow-sm transition-shadow duration-200 hover:shadow-md sm:flex-row sm:gap-5 sm:p-5"
                >
                  {/* Product Image */}
                  <Link
                    to={`/product/${item.slug}`}
                    aria-label={`مشاهده ${item.name}`}
                    className="flex h-44 w-full shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#faf9f4] sm:h-32 sm:w-32"
                  >
                    {item.thumbnail ? (
                      <img
                        src={item.thumbnail}
                        alt={item.name}
                        className="h-full w-full object-contain p-3 transition-transform duration-300 hover:scale-105"
                      />
                    ) : (
                      <ShoppingCart
                        size={28}
                        className="text-[#b4c2ad]"
                        aria-hidden="true"
                      />
                    )}
                  </Link>

                  {/* Product Info */}
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/product/${item.slug}`}
                      className="block truncate font-bold leading-7 text-[#354a37] transition-colors duration-200 hover:text-[#4f7754]"
                    >
                      {item.name}
                    </Link>

                    {/* Unit Price */}
                    <div
                      className="mt-3 flex w-full flex-col items-start text-left"
                      style={{ direction: "ltr", textAlign: "left" }}
                    >
                      {hasDiscount && (
                        <div className="mb-1 flex flex-wrap items-center justify-start gap-2">
                          <span className="text-sm text-[#9aa194] line-through">
                            {originalPrice.toLocaleString("fa-IR")} تومان
                          </span>

                          <span className="rounded-lg bg-[#f2eaf7] px-2 py-1 text-xs font-bold text-[#725a91]">
                            {discountPercent.toLocaleString("fa-IR")}٪ تخفیف
                          </span>
                        </div>
                      )}

                      <div className="w-full text-left text-lg font-black text-[#4f7754]">
                        {item.price.toLocaleString("fa-IR")} تومان
                      </div>

                      {hasDiscount && (
                        <div className="mt-1 w-full text-left text-xs font-medium text-[#4f7754]">
                          صرفه‌جویی هر کالا:{" "}
                          {(originalPrice - item.price).toLocaleString("fa-IR")}{" "}
                          تومان
                        </div>
                      )}
                    </div>

                    {/* Quantity + Remove */}
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                      <div
                        className="flex items-center overflow-hidden rounded-xl border border-[#dce5d7] bg-[#faf9f4]"
                        aria-label={`تعداد ${item.name}`}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity - 1)
                          }
                          disabled={item.quantity <= 1}
                          aria-label={`کاهش تعداد ${item.name}`}
                          className="flex h-10 w-10 items-center justify-center text-[#4b5f4a] transition-colors hover:bg-[#e8efe2] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Minus size={16} />
                        </button>

                        <span
                          className="w-10 text-center text-sm font-bold text-[#354a37]"
                          aria-live="polite"
                        >
                          {item.quantity.toLocaleString("fa-IR")}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity + 1)
                          }
                          disabled={item.quantity >= item.stock}
                          aria-label={`افزایش تعداد ${item.name}`}
                          className="flex h-10 w-10 items-center justify-center text-[#4b5f4a] transition-colors hover:bg-[#e8efe2] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Plus size={16} />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        aria-label={`حذف ${item.name} از سبد خرید`}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm text-red-500 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                      >
                        <Trash2 size={16} />
                        حذف
                      </button>
                    </div>
                  </div>

                  {/* Item Total */}
                  <div
                    className="sm:flex sm:min-w-0 sm:items-start sm:justify-end"
                    style={{ direction: "ltr", textAlign: "left" }}
                  >
                    <div className="w-full rounded-xl border border-[#e6ecdf] bg-[#faf9f4] px-4 py-3 text-left sm:w-44">
                      <div className="text-left text-xs font-medium text-[#788174]">
                        جمع این کالا
                      </div>

                      <div className="mt-1 text-left text-lg font-black text-[#354a37]">
                        {itemTotal.toLocaleString("fa-IR")} تومان
                      </div>

                      {item.quantity > 1 && (
                        <div className="mt-1 text-left text-xs text-[#788174]">
                          {item.price.toLocaleString("fa-IR")} ×{" "}
                          {item.quantity.toLocaleString("fa-IR")}
                        </div>
                      )}

                      {hasDiscount && (
                        <div className="mt-2 text-left text-xs font-bold text-[#4f7754]">
                          صرفه‌جویی: {itemSavings.toLocaleString("fa-IR")} تومان
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Summary */}
          <aside className="min-w-0">
            <div className="rounded-2xl border border-[#e6ecdf] bg-white p-5 shadow-sm sm:p-6 lg:sticky lg:top-24">
              <h2 className="text-xl font-black text-[#354a37]">خلاصه سفارش</h2>

              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-[#788174]">تعداد کالا</span>
                  <span className="font-bold text-[#354a37]">
                    {cartCount.toLocaleString("fa-IR")}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-[#788174]">مبلغ کالاها</span>

                  <span
                    className="text-left font-bold text-[#354a37]"
                    style={{ direction: "ltr", textAlign: "left" }}
                  >
                    {cartOriginalTotal.toLocaleString("fa-IR")} تومان
                  </span>
                </div>

                {cartDiscount > 0 && (
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-[#788174]">تخفیف</span>

                    <span
                      className="text-left font-bold text-[#725a91]"
                      style={{ direction: "ltr", textAlign: "left" }}
                    >
                      - {cartDiscount.toLocaleString("fa-IR")} تومان
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-[#788174]">هزینه ارسال</span>
                  <span className="font-bold text-[#4f7754]">رایگان</span>
                </div>

                <div className="border-t border-dashed border-[#dce5d7] pt-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm font-bold text-[#4b5f4a]">
                      مبلغ قابل پرداخت
                    </span>

                    <span
                      className="text-left text-lg font-black text-[#4f7754] sm:text-xl"
                      style={{ direction: "ltr", textAlign: "left" }}
                    >
                      {cartTotal.toLocaleString("fa-IR")} تومان
                    </span>
                  </div>
                </div>
              </div>

              <Button
                type="button"
                onClick={() => navigate("/checkout")}
                variant="primary"
                size="lg"
                fullWidth
                icon={<ArrowRight size={19} />}
                className="mt-6"
              >
                ادامه فرایند خرید
              </Button>

              <p className="mt-4 text-center text-xs leading-6 text-[#788174]">
                مبلغ نهایی سفارش را پیش از پرداخت بررسی کنید.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </Layout>
  );
}

export default Cart;
