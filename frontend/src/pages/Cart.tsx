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
        {" "}
        <section className="max-w-5xl mx-auto px-6 py-16">
          {" "}
          <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center">
            {" "}
            <div
              className="
             w-20
             h-20
             mx-auto
             rounded-full
             bg-blue-50
             text-blue-600
             flex
             items-center
             justify-center
             transition-transform
             duration-300
             hover:scale-110
           "
            >
              {" "}
              <ShoppingCart size={36} />{" "}
            </div>
            <h1 className="text-2xl font-black text-slate-900 mt-6">
              سبد خرید شما خالی است
            </h1>
            <p className="text-slate-500 mt-3">
              هنوز محصولی به سبد خرید اضافه نکرده‌اید.
            </p>
            <Link
              to="/products"
              className="
            inline-flex
            items-center
            justify-center
            gap-2
            mt-7
            bg-blue-600
            hover:bg-blue-700
            hover:shadow-lg
            hover:-translate-y-0.5
            text-white
            px-6
            py-3
            rounded-xl
            font-bold
            transition-all
            duration-150
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
      {" "}
      <section className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}{" "}
        <div className="mb-8">
          {" "}
          <Link
            to="/products"
            className="
           inline-flex
           items-center
           gap-2
           text-sm
           text-slate-500
           hover:text-blue-600
           hover:-translate-x-0.5
           transition-all
           duration-200
         "
          >
            {" "}
            <ArrowRight size={18} />
            ادامه خرید{" "}
          </Link>
          ```
          <div className="flex items-center justify-between mt-5">
            <div>
              <h1 className="text-3xl font-black text-slate-900">سبد خرید</h1>

              <p className="text-slate-500 mt-2">
                {cartCount.toLocaleString("fa-IR")} کالا در سبد خرید شما
              </p>
            </div>

            <button
              type="button"
              onClick={clearCart}
              className="
            flex
            items-center
            gap-2
            text-sm
            text-red-500
            hover:text-red-600
            hover:-translate-y-0.5
            transition-all
            duration-150
            active:scale-95
          "
            >
              <Trash2 size={17} />
              خالی کردن سبد
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => {
              const originalPrice = item.originalPrice ?? item.price;
              const discountPercent = item.discountPercent ?? 0;
              const itemTotal = item.price * item.quantity;
              const itemSavings = (originalPrice - item.price) * item.quantity;

              return (
                <div
                  key={item.id}
                  className="
                bg-white
                rounded-2xl
                border
                border-slate-100
                p-5
                flex
                flex-col
                sm:flex-row
                gap-5
                transition-all
                duration-300
                hover:shadow-lg
                hover:-translate-y-0.5
              "
                >
                  {/* Product Image */}
                  <Link
                    to={`/product/${item.slug}`}
                    className="
                  w-full
                  sm:w-32
                  h-32
                  rounded-xl
                  bg-slate-50
                  flex
                  items-center
                  justify-center
                  overflow-hidden
                  shrink-0
                  transition-all
                  duration-300
                  hover:shadow-md
                "
                  >
                    {item.thumbnail ? (
                      <img
                        src={item.thumbnail}
                        alt={item.name}
                        className="
                      w-full
                      h-full
                      object-contain
                      p-3
                      transition-transform
                      duration-300
                      hover:scale-110
                    "
                      />
                    ) : (
                      <span className="text-sm text-slate-400">
                        تصویر محصول
                      </span>
                    )}
                  </Link>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/product/${item.slug}`}
                      className="
                    block
                    font-bold
                    text-slate-900
                    hover:text-blue-600
                    transition-colors
                    duration-200
                  "
                    >
                      {item.name}
                    </Link>

                    {/* Unit Price */}
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
                      {discountPercent > 0 && originalPrice > item.price ? (
                        <div className="w-full flex flex-row items-center justify-start gap-2 mb-1">
                          <span className="text-sm text-slate-400 line-through text-left">
                            {originalPrice.toLocaleString("fa-IR")} تومان
                          </span>

                          <span
                            className="
                          bg-red-500
                          text-white
                          text-xs
                          font-bold
                          px-2
                          py-1
                          rounded-lg
                          transition-transform
                          duration-200
                          hover:scale-105
                        "
                          >
                            {discountPercent.toLocaleString("fa-IR")}٪ تخفیف
                          </span>
                        </div>
                      ) : null}

                      <div className="w-full text-blue-600 font-black text-lg text-left">
                        {item.price.toLocaleString("fa-IR")} تومان
                      </div>

                      {discountPercent > 0 && originalPrice > item.price ? (
                        <div className="w-full text-emerald-600 text-xs font-medium mt-1 text-left">
                          صرفه‌جویی هر کالا:{" "}
                          {(originalPrice - item.price).toLocaleString("fa-IR")}{" "}
                          تومان
                        </div>
                      ) : null}
                    </div>

                    {/* Quantity + Remove */}
                    <div className="flex items-center justify-between gap-4 mt-6">
                      <div
                        className="
                      flex
                      items-center
                      border
                      border-slate-200
                      rounded-xl
                      overflow-hidden
                    "
                      >
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity - 1)
                          }
                          disabled={item.quantity <= 1}
                          aria-label="کاهش تعداد"
                          className="
                        w-10
                        h-10
                        flex
                        items-center
                        justify-center
                        text-slate-600
                        hover:bg-slate-50
                        hover:text-blue-600
                        transition-all
                        duration-150
                        active:scale-90
                        disabled:opacity-40
                        disabled:cursor-not-allowed
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
                        w-10
                        h-10
                        flex
                        items-center
                        justify-center
                        text-slate-600
                        hover:bg-slate-50
                        hover:text-blue-600
                        transition-all
                        duration-150
                        active:scale-90
                        disabled:opacity-40
                        disabled:cursor-not-allowed
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
                      flex
                      items-center
                      gap-1.5
                      text-sm
                      text-red-500
                      hover:text-red-600
                      hover:-translate-y-0.5
                      transition-all
                      duration-150
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
                  sm:min-w-44
                  sm:self-stretch
                  sm:flex
                  sm:items-start
                  sm:justify-end
                "
                    style={{
                      direction: "ltr",
                      textAlign: "left",
                    }}
                  >
                    <div
                      className="
                    w-full
                    sm:w-44
                    bg-slate-50
                    border
                    border-slate-100
                    rounded-xl
                    px-4
                    py-3
                    text-left
                  "
                    >
                      <div className="text-xs font-medium text-slate-400 text-left">
                        جمع این کالا
                      </div>

                      <div className="text-lg font-black text-slate-800 mt-1 text-left">
                        {itemTotal.toLocaleString("fa-IR")} تومان
                      </div>

                      {item.quantity > 1 ? (
                        <div className="text-xs text-slate-400 mt-1 text-left">
                          {item.price.toLocaleString("fa-IR")} ×{" "}
                          {item.quantity.toLocaleString("fa-IR")}
                        </div>
                      ) : null}

                      {discountPercent > 0 && originalPrice > item.price ? (
                        <div className="text-xs text-emerald-600 font-bold mt-2 text-left">
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
            <div className="bg-white rounded-2xl border border-slate-100 p-6 sticky top-5">
              <h2 className="text-xl font-black text-slate-900">خلاصه سفارش</h2>

              <div className="space-y-4 mt-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">تعداد کالا</span>

                  <span className="font-bold text-slate-900">
                    {cartCount.toLocaleString("fa-IR")}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">مبلغ کالاها</span>

                  <span
                    className="font-bold text-slate-900 text-left"
                    style={{
                      direction: "ltr",
                      textAlign: "left",
                    }}
                  >
                    {cartOriginalTotal.toLocaleString("fa-IR")} تومان
                  </span>
                </div>

                {cartDiscount > 0 ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">تخفیف</span>

                    <span
                      className="font-bold text-red-500 text-left"
                      style={{
                        direction: "ltr",
                        textAlign: "left",
                      }}
                    >
                      - {cartDiscount.toLocaleString("fa-IR")} تومان
                    </span>
                  </div>
                ) : null}

                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">هزینه ارسال</span>

                  <span className="font-bold text-emerald-600">رایگان</span>
                </div>

                <div className="border-t border-slate-100 pt-5 flex items-center justify-between gap-4">
                  <span className="font-bold text-slate-700">
                    مبلغ قابل پرداخت
                  </span>

                  <span
                    className="text-xl font-black text-blue-600 text-left"
                    style={{
                      direction: "ltr",
                      textAlign: "left",
                    }}
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
