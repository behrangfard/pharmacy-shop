import { useId } from "react";
import { Link } from "react-router-dom";
import { History, Tag, Trash2, X } from "lucide-react";

import { useRecentlyViewed } from "../hooks/useRecentlyViewed";
import { getStorageUrl } from "../utils/images";
import { calculateProductPrice } from "../utils/price";

/**
 * ریل «بازدیدهای اخیر».
 *
 * محصولاتی که کاربر در همین مرورگر دیده است، به‌صورت کارت‌های کوچک و
 * اسکرول افقی نمایش داده می‌شوند. اگر صفحهٔ جاری خودش یکی از آن‌ها باشد
 * (صفحهٔ محصول)، با `excludeIds` کنار گذاشته می‌شود.
 */
interface Props {
  title?: string;
  /** حداکثر کارت نمایش‌داده‌شده. */
  limit?: number;
  /** محصولاتی که نباید نمایش داده شوند (مثلاً محصول صفحهٔ جاری). */
  excludeIds?: number[];
  className?: string;
}

function RecentlyViewed({
  title = "بازدیدهای اخیر شما",
  limit = 8,
  excludeIds = [],
  className = "",
}: Props) {
  const headingId = useId();
  const { items, remove, clear } = useRecentlyViewed();

  const excluded = new Set(excludeIds);
  const visible = items
    .filter((item) => !excluded.has(item.id))
    .slice(0, limit);

  // بدون بازدید قبلی، هیچ فضایی از صفحه اشغال نمی‌شود.
  if (visible.length === 0) {
    return null;
  }

  return (
    <section className={`min-w-0 ${className}`} aria-labelledby={headingId}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600">
            <History size={16} />
          </span>

          <div>
            <h2
              id={headingId}
              className="text-base font-black text-ink sm:text-lg"
            >
              {title}
            </h2>
            <p className="text-[11px] text-muted-soft">
              {visible.length.toLocaleString("fa-IR")} محصول اخیراً دیده‌شده
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={clear}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-muted-soft transition hover:bg-blush-50 hover:text-discount"
        >
          <Trash2 size={13} />
          پاک کردن تاریخچه
        </button>
      </div>

      <div className="rail-scroll -mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2">
        {visible.map((item) => {
          const image = item.thumbnail ? getStorageUrl(item.thumbnail) : null;
          const { finalPrice, discountPercent, hasDiscount } =
            calculateProductPrice(item.price, item.discount_percent);

          return (
            <article
              key={item.id}
              className="group relative w-32 shrink-0 snap-start sm:w-40"
            >
              <Link
                to={`/product/${item.slug}`}
                className="block h-full rounded-2xl border border-line bg-white p-2 transition duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
              >
                <div className="relative mb-2 aspect-square overflow-hidden rounded-xl bg-cream-deep">
                  {image ? (
                    <img
                      src={image}
                      alt={item.name}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-muted-soft">
                      <Tag size={20} strokeWidth={1.5} />
                    </span>
                  )}

                  {hasDiscount && (
                    <span className="absolute right-1.5 top-1.5 rounded bg-blush-100 px-1.5 py-0.5 text-[10px] font-black text-blush-600">
                      {discountPercent.toLocaleString("fa-IR")}٪
                    </span>
                  )}
                </div>

                <h3 className="line-clamp-2 min-h-8 text-[11px] font-bold leading-4 text-ink transition group-hover:text-brand-700 sm:min-h-10 sm:text-xs sm:leading-5">
                  {item.name}
                </h3>

                <div
                  className="mt-1.5 flex items-baseline justify-between gap-1"
                  dir="ltr"
                >
                  <span className="text-xs font-black text-brand-700 sm:text-sm">
                    {finalPrice.toLocaleString("fa-IR")}
                  </span>
                  <span className="text-[9px] text-muted-soft sm:text-[10px]">
                    تومان
                  </span>
                </div>
              </Link>

              <button
                type="button"
                onClick={() => remove(item.id)}
                aria-label={`حذف ${item.name} از بازدیدهای اخیر`}
                title="حذف از بازدیدهای اخیر"
                className="absolute left-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white/95 text-muted-soft shadow-sm ring-1 ring-line transition hover:bg-blush-50 hover:text-discount"
              >
                <X size={12} />
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default RecentlyViewed;
