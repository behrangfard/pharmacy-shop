import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Heart, Loader2, ShoppingBag, Trash2 } from "lucide-react";

import Layout from "../components/Layout";
import ProductCard from "../components/ProductCard";
import { useAuth } from "../context/AuthContext";
import { useWishlist } from "../context/WishlistContext";
import { usePrivatePageMeta } from "../hooks/usePageMeta";

/**
 * صفحهٔ علاقه‌مندی‌ها.
 *
 * برای مهمان، فهرست از حافظهٔ مرورگر خوانده می‌شود و پس از ورود به حساب
 * به‌صورت خودکار روی سرور منتقل می‌شود (WishlistContext).
 */
function Wishlist() {
  usePrivatePageMeta("علاقه‌مندی‌های من", "/wishlist");

  const { user } = useAuth();
  const { entries, loading, remove } = useWishlist();
  const [removingId, setRemovingId] = useState<number | null>(null);

  const handleRemove = async (productId: number) => {
    if (removingId !== null) {
      return;
    }

    setRemovingId(productId);

    try {
      await remove(productId);
    } catch {
      // پیام خطا در کانتکست ثبت شده است.
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <Layout>
      <main className="min-h-screen bg-cream">
        <section className="border-b border-line bg-white">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blush-100 px-4 py-2 text-xs font-black text-blush-600">
                  <Heart size={14} />
                  ذخیره‌شده‌های شما
                </div>

                <h1 className="text-3xl font-black text-ink sm:text-4xl">
                  علاقه‌مندی‌های من
                </h1>

                <p className="mt-3 max-w-2xl leading-7 text-muted">
                  محصولاتی که دوست دارید را اینجا نگه دارید و بعداً راحت‌تر
                  پیدایشان کنید.
                </p>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-soft">
                  {entries.length.toLocaleString("fa-IR")}
                </span>
                <span className="font-bold text-ink-soft">محصول</span>
              </div>
            </div>

            {!user && entries.length > 0 && (
              <p className="mt-6 rounded-2xl border border-line bg-cream-deep px-4 py-3 text-xs leading-6 text-muted sm:text-sm">
                این فهرست فعلاً روی همین مرورگر ذخیره شده است. با ورود به حساب
                کاربری، علاقه‌مندی‌ها به حساب شما منتقل می‌شوند و در همهٔ
                دستگاه‌ها در دسترس خواهند بود.
              </p>
            )}
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          {loading && entries.length === 0 && (
            <div className="rounded-3xl border border-line bg-white py-20 text-center shadow-sm">
              <Loader2
                size={38}
                className="mx-auto animate-spin text-brand-550"
              />
              <p className="mt-4 font-medium text-muted">
                در حال دریافت علاقه‌مندی‌ها...
              </p>
            </div>
          )}

          {!loading && entries.length === 0 && (
            <div className="rounded-3xl border border-line bg-white px-6 py-16 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blush-100 text-blush-400">
                <ShoppingBag size={30} />
              </div>

              <h2 className="mt-5 text-xl font-black">
                هنوز محصولی ذخیره نکرده‌اید
              </h2>

              <p className="mt-2 text-muted">
                روی قلب کنار هر محصول بزنید تا اینجا ذخیره شود.
              </p>

              <Link
                to="/products"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-3 font-bold text-white transition hover:bg-brand-700"
              >
                رفتن به فروشگاه
                <ArrowLeft size={18} />
              </Link>
            </div>
          )}

          {entries.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
              {entries.map((entry) => (
                <div
                  key={entry.product_id}
                  className="flex h-full flex-col gap-2"
                >
                  <ProductCard product={entry.product} />

                  <button
                    type="button"
                    onClick={() => handleRemove(entry.product_id)}
                    disabled={removingId === entry.product_id}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-xs font-bold text-muted transition hover:border-blush-200 hover:text-discount disabled:cursor-wait disabled:opacity-60"
                  >
                    {removingId === entry.product_id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                    حذف از علاقه‌مندی‌ها
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </Layout>
  );
}

export default Wishlist;
