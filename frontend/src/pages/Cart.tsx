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
        <section className="mx-auto max-w-5xl px-6 py-16">
          <div className="rounded-3xl border border-slate-100 bg-white p-12 text-center">
            <div
              className="
                mx-auto flex h-20 w-20 items-center justify-center
                rounded-full bg-purple-50 text-purple-600
                transition-transform duration-300 hover:scale-110
              "
            >
              <ShoppingCart size={36} />
            </div>

            <h1 className="mt-6 text-2xl font-black text-slate-900">
              سبد خرید شما خالی است
            </h1>

            <p className="mt-3 text-slate-500">
              هنوز محصولی به سبد خرید اضافه نکرده‌اید.
            </p>

            <Link
              to="/products"
              className="
                mt-7 inline-flex items-center justify-center gap-2
                rounded-xl bg-purple-600 px-6 py-3 font-bold text-white
                transition-all duration-150
                hover:-translate-y-0.5 hover:bg-purple-700 hover:shadow-lg
                active:scale-95
              "
            >
              مشاهده محصولات
            </Link>
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="mx-auto max-w-7xl px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/products"
            className="
              inline-flex items-center gap-2 text-sm text-slate-500
              transition-all duration-200
              hover:-translate-x-0.5 hover:text-purple-600
            "
          >
            <ArrowRight size={18} />
            ادامه خرید
          </Link>

          <div className="mt-5 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-slate-900">سبد خرید</h1>

              <p className="mt-2 text-slate-500">
                {cartCount.toLocaleString("fa-IR")} کالا در سبد خرید شما
              </p>
            </div>

            <button
              type="button"
              onClick={clearCart}
              className="
                flex items-center gap-2 rounded-lg px-2 py-1.5
                text-sm font-medium text-red-500
                transition-all duration-200
                hover:-translate-y-0.5 hover:bg-red-50 hover:text-red-600
                active:scale-95
              "
            >
              <Trash2 size={17} />
              خالی کردن سبد
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Cart Items */}
          <div className="space-y-4 lg:col-span-2">
            {items.map((item) => {
              const originalPrice = item.originalPrice ?? item.price;
              const discountPercent = item.discountPercent ?? 0;
              const itemTotal = item.price * item.quantity;
              const itemSavings = (originalPrice - item.price) * item.quantity;

              return (
                <div
                  key={item.id}
                  className="
                    flex flex-col gap-5 rounded-2xl border border-slate-100
                    bg-white p-5 transition-all duration-300
                    hover:-translate-y-0.5 hover:shadow-lg
                    sm:flex-row
                  "
                >
                  {/* Product Image */}
                  <Link
                    to={`/product/${item.slug}`}
                    className="
                      flex h-32 w-full shrink-0 items-center justify-center
                      overflow-hidden rounded-xl bg-slate-50
                      transition-all duration-300 hover:shadow-md sm:w-32
                    "
                  >
                    {item.thumbnail ? (
                      <img
                        src={item.thumbnail}
                        alt={item.name}
                        className="
                          h-full w-full object-contain p-3
                          transition-transform duration-300 hover:scale-110
                        "
                      />
                    ) : (
                      <span className="text-sm text-slate-400">
                        تصویر محصول
                      </span>
                    )}
                  </Link>

                  {/* Product Info */}
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/product/${item.slug}`}
                      className="
                        block w-full min-w-0 truncate font-bold
                        text-slate-900 transition-colors duration-200
                        hover:text-purple-600
                      "
                    >
                      {item.name}
                    </Link>

                    {/* Unit Price */}
                    <div
                      className="
                        mt-4 flex w-full flex-col items-start
                        justify-start text-left
                      "
                      style={{ direction: "ltr", textAlign: "left" }}
                    >
                      {discountPercent > 0 && originalPrice > item.price ? (
                        <div className="mb-1 flex w-full flex-row items-center justify-start gap-2">
                          <span className="text-left text-sm text-slate-400 line-through">
                            {originalPrice.toLocaleString("fa-IR")} تومان
                          </span>

                          <span
                            className="
                              rounded-lg bg-red-500 px-2 py-1
                              text-xs font-bold text-white
                              transition-transform duration-200 hover:scale-105
                            "
                          >
                            {discountPercent.toLocaleString("fa-IR")}٪ تخفیف
                          </span>
                        </div>
                      ) : null}

                      <div className="w-full text-left text-lg font-black text-purple-600">
                        {item.price.toLocaleString("fa-IR")} تومان
                      </div>

                      {discountPercent > 0 && originalPrice > item.price ? (
                        <div className="mt-1 w-full text-left text-xs font-medium text-emerald-600">
                          صرفه‌جویی هر کالا:{" "}
                          {(originalPrice - item.price).toLocaleString("fa-IR")}{" "}
                          تومان
                        </div>
                      ) : null}
                    </div>

                    {/* Quantity + Remove */}
                    <div className="mt-6 flex items-center justify-between gap-4">
                      <div className="flex items-center overflow-hidden rounded-xl border border-slate-200">
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity - 1)
                          }
                          disabled={item.quantity <= 1}
                          aria-label="کاهش تعداد"
                          className="
                            flex h-10 w-10 items-center justify-center
                            text-slate-600 transition-all duration-150
                            hover:bg-purple-50 hover:text-purple-700
                            active:scale-90
                            disabled:cursor-not-allowed disabled:opacity-40
                            disabled:active:scale-100
                          "
                        >
                          <Minus size={16} />
                        </button>

                        <span className="w-10 text-center font-bold">
                          {item.quantity.toLocaleString("fa-IR")}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity + 1)
                          }
                          disabled={item.quantity >= item.stock}
                          aria-label="افزایش تعداد"
                          className="
                            flex h-10 w-10 items-center justify-center
                            text-slate-600 transition-all duration-150
                            hover:bg-purple-50 hover:text-purple-700
                            active:scale-90
                            disabled:cursor-not-allowed disabled:opacity-40
                            disabled:active:scale-100
                          "
                        >
                          <Plus size={16} />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className="
                          flex items-center gap-1.5 text-sm text-red-500
                          transition-all duration-150
                          hover:-translate-y-0.5 hover:text-red-600
                          active:scale-95
                        "
                      >
                        <Trash2 size={17} />
                        حذف
                      </button>
                    </div>
                  </div>

                  {/* Item Total */}
                  <div
                    className="
                      sm:flex sm:min-w-44 sm:items-start sm:justify-end
                      sm:self-stretch
                    "
                    style={{ direction: "ltr", textAlign: "left" }}
                  >
                    <div
                      className="
                        w-full rounded-xl border border-slate-100
                        bg-slate-50 px-4 py-3 text-left sm:w-44
                      "
                    >
                      <div className="text-left text-xs font-medium text-slate-400">
                        جمع این کالا
                      </div>

                      <div className="mt-1 text-left text-lg font-black text-slate-800">
                        {itemTotal.toLocaleString("fa-IR")} تومان
                      </div>

                      {item.quantity > 1 ? (
                        <div className="mt-1 text-left text-xs text-slate-400">
                          {item.price.toLocaleString("fa-IR")} ×{" "}
                          {item.quantity.toLocaleString("fa-IR")}
                        </div>
                      ) : null}

                      {discountPercent > 0 && originalPrice > item.price ? (
                        <div className="mt-2 text-left text-xs font-bold text-emerald-600">
                          صرفه‌جویی: {itemSavings.toLocaleString("fa-IR")} تومان
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <aside>
            <div className="sticky top-5 rounded-2xl border border-slate-100 bg-white p-6">
              <h2 className="text-xl font-black text-slate-900">خلاصه سفارش</h2>

              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">تعداد کالا</span>
                  <span className="font-bold text-slate-900">
                    {cartCount.toLocaleString("fa-IR")}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">مبلغ کالاها</span>

                  <span
                    className="text-left font-bold text-slate-900"
                    style={{ direction: "ltr", textAlign: "left" }}
                  >
                    {cartOriginalTotal.toLocaleString("fa-IR")} تومان
                  </span>
                </div>

                {cartDiscount > 0 ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">تخفیف</span>

                    <span
                      className="text-left font-bold text-red-500"
                      style={{ direction: "ltr", textAlign: "left" }}
                    >
                      - {cartDiscount.toLocaleString("fa-IR")} تومان
                    </span>
                  </div>
                ) : null}

                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">هزینه ارسال</span>
                  <span className="font-bold text-emerald-600">رایگان</span>
                </div>

                <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-5">
                  <span className="font-bold text-slate-700">
                    مبلغ قابل پرداخت
                  </span>

                  <span
                    className="text-left text-xl font-black text-purple-600"
                    style={{ direction: "ltr", textAlign: "left" }}
                  >
                    {cartTotal.toLocaleString("fa-IR")} تومان
                  </span>
                </div>
              </div>

              <Button
                type="button"
                onClick={() => navigate("/checkout")}
                variant="primary"
                size="lg"
                fullWidth
                icon={<ArrowRight size={19} />}
              >
                ادامه فرایند خرید
              </Button>
            </div>
          </aside>
        </div>
      </section>
    </Layout>
  );
}

export default Cart;
