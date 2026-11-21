import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BadgeCheck } from "lucide-react";

import {
  fetchBrands,
  getCachedBrands,
  type StorefrontBrand,
} from "../services/brands";
import { getStorageUrl } from "../utils/images";

const SKELETON_COUNT = 6;

/**
 * بخش «برندهایی که می‌فروشیم» در صفحهٔ اصلی (بعد از جدیدترین محصولات).
 *
 * منبع داده همان endpoint عمومی `/brands` است که فیلتر صفحهٔ محصولات هم از آن
 * می‌خواند؛ پس برندی که مدیر در پنل «برندها» ایجاد، غیرفعال یا حذف کند، با
 * همان کش ۵ دقیقه‌ای سرور و کش مرورگر این‌جا هم منعکس می‌شود (نیازی به تنظیم
 * دوم نیست).
 *
 * - فقط برندهای فعال با حداقل یک محصول نمایش داده می‌شوند.
 * - ترتیب از `sort_order` پنل می‌آید (سرور مرتب می‌کند).
 * - هر کارت به `/products?brand=<slug>` لینک است.
 */
function BrandsShowcase() {
  const [brands, setBrands] = useState<StorefrontBrand[]>(
    () => getCachedBrands() ?? [],
  );
  const [loading, setLoading] = useState<boolean>(
    () => getCachedBrands() === null,
  );

  useEffect(() => {
    let active = true;

    fetchBrands()
      .then((data) => {
        if (active) {
          setBrands(data);
        }
      })
      .catch(() => {
        // در خطای شبکه، همان فهرست کش‌شده (یا هیچ) نمایش داده می‌شود.
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const visibleBrands = brands.filter(
    (brand) => (brand.products_count ?? 0) > 0,
  );

  // برندی برای نمایش نیست → بخش هم نباشد (نه عنوان خالی روی صفحه).
  if (!loading && visibleBrands.length === 0) {
    return null;
  }

  return (
    <section
      className="border-y border-line bg-surface py-12 sm:py-14"
      aria-labelledby="home-brands-title"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold text-gold">
              <BadgeCheck size={16} aria-hidden="true" />
              انتخاب‌شده برای شما
            </div>

            <h2
              id="home-brands-title"
              className="break-words text-2xl font-black text-brand-900 sm:text-3xl"
            >
              برندهایی که می‌فروشیم
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              همهٔ برندهای موجود در فروشگاه، اصیل و با ضمانت؛ با یک کلیک
              محصولات هر برند را ببینید.
            </p>
          </div>

          <Link
            to="/products"
            className="flex shrink-0 items-center gap-1 text-sm font-bold text-brand-500 transition hover:text-brand-700"
          >
            همه محصولات
            <ArrowLeft size={16} aria-hidden="true" />
          </Link>
        </div>

        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {loading
            ? Array.from({ length: SKELETON_COUNT }).map((_, index) => (
                <li
                  key={`brand-skeleton-${index}`}
                  className="h-28 animate-pulse rounded-2xl bg-cream-deep"
                  aria-hidden="true"
                />
              ))
            : visibleBrands.map((brand) => {
                const logoUrl = getStorageUrl(brand.logo);
                const initial = brand.name.trim().slice(0, 2);

                return (
                  <li key={brand.id}>
                    <Link
                      to={`/products?brand=${encodeURIComponent(brand.slug)}`}
                      className="group flex h-28 flex-col items-center justify-center gap-2 rounded-2xl border border-line-soft bg-cream-deep/60 px-3 py-4 text-center transition hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-50"
                      aria-label={`محصولات برند ${brand.name}`}
                    >
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt={`لوگوی ${brand.name}`}
                          loading="lazy"
                          className="max-h-12 w-auto max-w-full object-contain"
                        />
                      ) : (
                        <span
                          className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-sm font-black text-brand-700"
                          aria-hidden="true"
                        >
                          {initial}
                        </span>
                      )}

                      <span className="line-clamp-1 text-xs font-bold text-ink-soft transition group-hover:text-brand-700">
                        {brand.name}
                      </span>
                    </Link>
                  </li>
                );
              })}
        </ul>
      </div>
    </section>
  );
}

export default BrandsShowcase;
