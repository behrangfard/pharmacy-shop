import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Truck,
  Headphones,
  RotateCcw,
  Sparkles,
  Heart,
  Layers,
  Moon,
  Shirt,
} from "lucide-react";
import { Link } from "react-router-dom";
import BannerFontStyles from "../components/BannerFontStyles";
import BannerImage from "../components/BannerImage";
import BannerTextLayers from "../components/BannerTextLayers";
import Layout from "../components/Layout";
import LatestArticles from "../components/LatestArticles";
import { ButtonLink } from "../components/Button";
import ProductCard from "../components/ProductCard";
import { api } from "../services/api";
import {
  bannerTarget,
  bannerTextLayers,
  bannerTextScrim,
  bannerViewportClass,
  filterBannersForViewport,
  hasBannerTextLayers,
  hasDesktopImage,
  hasMobileImage,
  isExternalBannerLink,
  viewportVisibilityClass,
  type BannerViewport,
  type StorefrontBanner,
} from "../utils/banners";
import { usePageMeta } from "../hooks/usePageMeta";
import { DEFAULT_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from "../utils/seo";
import {
  organizationJsonLd,
  websiteJsonLd,
} from "../utils/structuredData";

interface ProductImage {
  id: number;
  path: string;
  alt?: string | null;
  sort_order: number;
  is_primary: boolean;
}

interface Product {
  id: number;
  name: string;
  slug: string;
  price: string | number;
  compare_price?: string | number | null;
  discount_percent?: string | number;
  stock: number;
  short_description?: string | null;
  thumbnail?: string | null;
  images?: ProductImage[];
}


const BANNER_AUTOPLAY_MS = 5000;

const CAROUSEL_VISIBILITY: Record<BannerViewport, string> = {
  desktop: "hidden md:block",
  mobile: "md:hidden",
};

const CAROUSEL_LABELS: Record<BannerViewport, string> = {
  desktop: "بنرهای صفحهٔ اصلی",
  mobile: "بنرهای صفحهٔ اصلی (موبایل)",
};

/**
 * لینک بنر؛ لینک‌های خارجی در تب جدید و لینک‌های داخلی با react-router باز
 * می‌شوند. در اسلایدر، اسلایدهای غیرفعال از دسترس کیبورد خارج می‌مانند.
 */
function BannerLink({
  banner,
  className,
  tabIndex,
  children,
}: {
  banner: StorefrontBanner;
  className?: string;
  tabIndex?: number;
  children: ReactNode;
}) {
  const target = bannerTarget(banner);

  if (isExternalBannerLink(target)) {
    return (
      <a
        href={target}
        target="_blank"
        rel="noreferrer"
        className={className}
        tabIndex={tabIndex}
      >
        {children}
      </a>
    );
  }

  return (
    <Link to={target} className={className} tabIndex={tabIndex}>
      {children}
    </Link>
  );
}

/**
 * اسلایدر بنرهای «هیرو» برای یک نما (دسکتاپ یا موبایل).
 *
 * برای هر نما یک نمونهٔ مستقل رندر می‌شود؛ به این ترتیب فهرست اسلایدها، ایندکس
 * فعال و اسلاید خودکار هر نما مستقل است و بنرهایی که تصویر همان نما را ندارند
 * اصلاً وارد اسلاید نمی‌شوند. اگر هیچ بنری تصویر آن نما را نداشته باشد، کل
 * اسلایدر آن نما رندر نمی‌شود (هیچ بنر پیش‌فرضی جای آن نمی‌نشیند).
 */
function HeroBannerCarousel({
  banners,
  view,
}: {
  banners: StorefrontBanner[];
  view: BannerViewport;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const count = banners.length;

  useEffect(() => {
    setActiveIndex(0);
  }, [count]);

  useEffect(() => {
    if (count < 2 || paused) return;

    // برای کاربرانی که انیمیشن کمتر می‌خواهند، اسلاید خودکار اجرا نمی‌شود.
    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % count);
    }, BANNER_AUTOPLAY_MS);

    return () => window.clearInterval(timer);
  }, [count, paused]);

  if (count === 0) return null;

  const goTo = (next: number) => {
    setActiveIndex(((next % count) + count) % count);
  };

  return (
    <section
      className={`relative w-full overflow-hidden bg-brand-75 ${CAROUSEL_VISIBILITY[view]}`}
      aria-roledescription="carousel"
      aria-label={CAROUSEL_LABELS[view]}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="grid">
        {banners.map((banner, index) => {
          const isActive = index === activeIndex;

          // متن لایه‌ای (مدیریت‌شده در پنل) مقدم است: متن‌ها HTML واقعی‌اند و
          // روی تصویر رندر می‌شوند تا برای سئو خوانا باشند. اگر بنر لایه‌ای
          // نداشته باشد، متن سادهٔ title/subtitle مثل قبل نمایش داده می‌شود.
          const layers = bannerTextLayers(banner);
          const hasLayers = hasBannerTextLayers(banner);

          const hasOverlayText =
            !hasLayers &&
            Boolean(banner.title || banner.subtitle || banner.button_label);

          return (
            <div
              key={banner.id}
              className={`col-start-1 row-start-1 relative transition-opacity duration-700 ease-out ${
                isActive ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
              aria-hidden={!isActive}
            >
              <BannerLink
                banner={banner}
                tabIndex={isActive ? 0 : -1}
                className="group relative block"
              >
                {/*
                  هر نما فقط تصویر خودش را نمایش می‌دهد: دسکتاپ «image» و
                  موبایل «mobile_image». بنر هیرو در تمام عرض صفحه و با نسبت
                  تصویر خودش (h-auto) رندر می‌شود تا ۱۹۲۰×۶۵۰، ۱۹۲۰×۷۵۰،
                  ۱۴۴۰×۶۰۰ و ۷۵۰×۱۰۰۰ بریده نشوند.
                */}
                <BannerImage
                  banner={banner}
                  view={view}
                  loading={index === 0 ? "eager" : "lazy"}
                  fetchPriority={index === 0 ? "high" : "low"}
                  desktopClassName="block h-auto w-full"
                  mobileClassName="block h-auto w-full"
                />

                {hasLayers && (
                  <BannerTextLayers
                    layers={layers}
                    viewport={view}
                    scrim={bannerTextScrim(banner)}
                  />
                )}

                {hasOverlayText && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                    <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-8">
                      {banner.title && (
                        <p className="max-w-2xl text-xl font-black leading-8 sm:text-3xl sm:leading-10">
                          {banner.title}
                        </p>
                      )}

                      {banner.subtitle && (
                        <p className="mt-2 max-w-xl text-xs leading-6 opacity-90 sm:text-sm">
                          {banner.subtitle}
                        </p>
                      )}

                      {banner.button_label && (
                        <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/95 px-5 py-2 text-xs font-bold text-brand-700">
                          {banner.button_label}
                          <ArrowLeft size={14} />
                        </span>
                      )}
                    </div>
                  </>
                )}
              </BannerLink>
            </div>
          );
        })}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => goTo(activeIndex - 1)}
            aria-label="بنر قبلی"
            className="
              absolute right-3 top-1/2 z-20 -translate-y-1/2
              rounded-full bg-white/85 p-2 text-brand-700 shadow
              transition hover:bg-white active:scale-95
            "
          >
            <ChevronRight size={20} />
          </button>

          <button
            type="button"
            onClick={() => goTo(activeIndex + 1)}
            aria-label="بنر بعدی"
            className="
              absolute left-3 top-1/2 z-20 -translate-y-1/2
              rounded-full bg-white/85 p-2 text-brand-700 shadow
              transition hover:bg-white active:scale-95
            "
          >
            <ChevronLeft size={20} />
          </button>

          <div className="absolute left-4 top-4 z-20 flex items-center gap-2">
            {banners.map((banner, index) => (
              <button
                key={banner.id}
                type="button"
                onClick={() => goTo(index)}
                aria-label={`نمایش بنر ${index + 1}`}
                aria-current={index === activeIndex}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === activeIndex
                    ? "w-7 bg-white"
                    : "w-2 bg-white/60 hover:bg-white/90"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

interface CategoryCardProps {
  to: string;
  title: string;
  description: string;
  icon: ReactNode;
  /** کلاس‌های رنگ آیکون (پس‌زمینه و متن) */
  iconClassName: string;
  /** کلاس رنگ حاشیه در حالت هاور */
  hoverClassName?: string;
}

/**
 * کارت دسته‌بندی صفحهٔ اول.
 *
 * این کارت عمداً از `Link` استفاده می‌کند و نه `ButtonLink`؛ چون `ButtonLink`
 * برای دکمه‌های یک‌خطی ساخته شده و `whitespace-nowrap` دارد. اگر متن چندخطی
 * (عنوان + توضیح) داخلش بگذاریم، متن از کادر بیرون می‌زند.
 */
function CategoryCard({
  to,
  title,
  description,
  icon,
  iconClassName,
  hoverClassName = "",
}: CategoryCardProps) {
  return (
    <Link
      to={to}
      className={`
        group flex h-full min-w-0 flex-col items-start gap-4
        overflow-hidden rounded-2xl border border-line bg-white p-5 text-right
        transition-all duration-200 hover:shadow-lg active:scale-[0.98]
        focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-brand-400 focus-visible:ring-offset-2
        ${hoverClassName}
      `}
    >
      <span
        aria-hidden="true"
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition ${iconClassName}`}
      >
        {icon}
      </span>

      <span className="block w-full min-w-0">
        <span className="block break-words font-black leading-7 text-ink">
          {title}
        </span>

        <span className="mt-2 block break-words text-sm font-normal leading-6 text-muted">
          {description}
        </span>
      </span>
    </Link>
  );
}


function Home() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [newestProducts, setNewestProducts] = useState<Product[]>([]);
  const [featuredError, setFeaturedError] = useState("");
  const [newestError, setNewestError] = useState("");
  const [heroBanners, setHeroBanners] = useState<StorefrontBanner[]>([]);
  const [stripBanners, setStripBanners] = useState<StorefrontBanner[]>([]);

  // متای صفحهٔ اصلی: عنوان/توضیحات ثابت + معرفی فروشگاه و سایت برای گوگل.
  usePageMeta({
    title: `${SITE_NAME} | ${SITE_TAGLINE}`,
    description: DEFAULT_DESCRIPTION,
    path: "/",
    type: "website",
    jsonLd: [organizationJsonLd(), websiteJsonLd()],
  });

  useEffect(() => {
    api
      .get("/banners")
      .then((response) => {
        const result = response.data?.data;

        if (!Array.isArray(result)) return;

        setHeroBanners(
          result.filter(
            (banner: StorefrontBanner) => banner.position === "home_hero",
          ),
        );
        setStripBanners(
          result.filter(
            (banner: StorefrontBanner) => banner.position === "home_strip",
          ),
        );
      })
      .catch((error) => {
        // بنرها اختیاری هستند؛ خطای دریافت آن‌ها نباید صفحه را خراب کند.
        console.error("BANNERS API ERROR:", error);
      });
  }, []);

  useEffect(() => {
    setFeaturedError("");

    api
      .get("/products/featured")
      .then((response) => {
        const result = response.data?.data ?? response.data;

        if (Array.isArray(result)) {
          setFeaturedProducts(result);
        } else {
          setFeaturedProducts([]);
          setFeaturedError("پاسخ محصولات ویژه آرایه نیست.");
        }
      })
      .catch((error) => {
        console.error("FEATURED API ERROR:", error);
        setFeaturedProducts([]);

        setFeaturedError(
          "خطا در دریافت محصولات ویژه: " +
            (error?.response?.status
              ? `HTTP ${error.response.status} - `
              : "") +
            (error?.message || "خطای نامشخص"),
        );
      });
  }, []);

  useEffect(() => {
    setNewestError("");

    api
      .get("/products/newest")
      .then((response) => {
        const result = response.data?.data ?? response.data;

        if (Array.isArray(result)) {
          setNewestProducts(result);
        } else {
          setNewestProducts([]);
          setNewestError("پاسخ جدیدترین محصولات آرایه نیست.");
        }
      })
      .catch((error) => {
        console.error("NEWEST API ERROR:", error);
        setNewestProducts([]);

        setNewestError(
          "خطا در دریافت جدیدترین محصولات: " +
            (error?.response?.status
              ? `HTTP ${error.response.status} - `
              : "") +
            (error?.message || "خطای نامشخص"),
        );
      });
  }, []);

  /**
   * بنرهای هیرو برای هر نما جدا فیلتر می‌شوند؛ بنری که تصویر موبایل ندارد در
   * موبایل و بنری که تصویر دسکتاپ ندارد در دسکتاپ نمایش داده نمی‌شود.
   */
  const desktopHeroBanners = filterBannersForViewport(heroBanners, "desktop");
  const mobileHeroBanners = filterBannersForViewport(heroBanners, "mobile");

  const stripHasDesktopImage = stripBanners.some(hasDesktopImage);
  const stripHasMobileImage = stripBanners.some(hasMobileImage);

  return (
    <Layout>
      {/* فونت‌های سفارشی متن بنرها (یک‌بار برای کل صفحه) */}
      <BannerFontStyles />

      {/*
        هیرو فقط از بنرهای پنل مدیریت ساخته می‌شود و در هر نما (موبایل/دسکتاپ)
        تصویر همان نما نمایش داده می‌شود. در نبود بنر، هیچ بنر و هیچ تصویر
        پیش‌فرضی نمایش داده نمی‌شود.
      */}
      {heroBanners.length > 0 && (
        <section className="relative bg-cream">
          <HeroBannerCarousel banners={desktopHeroBanners} view="desktop" />
          <HeroBannerCarousel banners={mobileHeroBanners} view="mobile" />
        </section>
      )}

      {/* نوار بنرهای کوتاه (home_strip) - مستقل از وجود بنر هیرو */}
      {stripBanners.length > 0 && (
        <section
          className={`bg-cream py-5 ${viewportVisibilityClass(
            stripHasDesktopImage,
            stripHasMobileImage,
          )}`}
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="flex gap-3 overflow-x-auto pb-1">
              {stripBanners.map((banner) => {
                const stripLayers = bannerTextLayers(banner);
                const stripHasLayers = hasBannerTextLayers(banner);

                // متن لایه‌ای مقدم است؛ در نبود آن متن سادهٔ عنوان/زیرعنوان.
                const stripText = stripHasLayers
                  ? null
                  : banner.title || banner.subtitle;

                return (
                  <BannerLink
                    key={banner.id}
                    banner={banner}
                    className={`
                      group relative flex min-w-[260px] flex-1 overflow-hidden
                      rounded-2xl border border-brand-100 bg-white
                      transition-colors hover:border-brand-300
                      ${bannerViewportClass(banner)}
                    `}
                  >
                    <BannerImage
                      banner={banner}
                      alt={stripText || undefined}
                      desktopClassName="block h-auto w-full transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                      mobileClassName="block h-auto w-full transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                    />

                    {stripHasLayers && (
                      <>
                        <BannerTextLayers
                          layers={stripLayers}
                          viewport="mobile"
                          scrim={bannerTextScrim(banner)}
                          className="md:hidden"
                        />

                        <BannerTextLayers
                          layers={stripLayers}
                          viewport="desktop"
                          scrim={bannerTextScrim(banner)}
                          className="hidden md:block"
                        />
                      </>
                    )}

                    {stripText && (
                      <span className="pointer-events-none absolute inset-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/60 via-black/10 to-transparent p-3">
                        <span className="line-clamp-2 text-xs font-bold leading-5 text-white sm:text-sm">
                          {stripText}
                        </span>
                        <ArrowLeft size={16} className="shrink-0 text-white" />
                      </span>
                    )}
                  </BannerLink>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Benefits */}
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-4 rounded-2xl border border-line bg-cream p-4 transition hover:border-brand-300 hover:bg-brand-50">
              <div className="shrink-0 rounded-xl bg-brand-100 p-3 text-brand-550">
                <Truck size={25} />
              </div>
              <div>
                <h3 className="font-black text-brand-900">ارسال سریع</h3>
                <p className="mt-1 text-sm text-muted">
                  ارسال سریع سفارش‌ها
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-2xl border border-line bg-cream p-4 transition hover:border-brand-300 hover:bg-brand-50">
              <div className="shrink-0 rounded-xl bg-brand-100 p-3 text-brand-550">
                <ShieldCheck size={25} />
              </div>
              <div>
                <h3 className="font-black text-brand-900">تضمین کیفیت</h3>
                <p className="mt-1 text-sm text-muted">محصولات باکیفیت</p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-2xl border border-line bg-cream p-4 transition hover:border-plum-200 hover:bg-plum-50">
              <div className="shrink-0 rounded-xl bg-plum-100 p-3 text-plum-500">
                <Headphones size={25} />
              </div>
              <div>
                <h3 className="font-black text-brand-900">پشتیبانی</h3>
                <p className="mt-1 text-sm text-muted">
                  پاسخگویی و پشتیبانی
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-2xl border border-line bg-cream p-4 transition hover:border-plum-200 hover:bg-plum-50">
              <div className="shrink-0 rounded-xl bg-plum-100 p-3 text-plum-500">
                <RotateCcw size={25} />
              </div>
              <div>
                <h3 className="font-black text-brand-900">ضمانت بازگشت</h3>
                <p className="mt-1 text-sm text-muted">خرید با خیال راحت</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="bg-cream py-12 sm:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-8 flex items-center justify-between gap-3">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-bold text-plum-500">
                <Sparkles size={16} />
                استایل زنانه
              </div>

              <h2 className="text-2xl font-black text-brand-900 sm:text-3xl">
                دسته‌بندی محصولات
              </h2>
            </div>

            <ButtonLink
              to="/products"
              variant="ghost"
              size="sm"
              className="shrink-0 text-brand-500 transition hover:text-brand-700 active:scale-95"
            >
              همه محصولات
              <ArrowLeft size={18} />
            </ButtonLink>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <CategoryCard
              to="/products?category=bra"
              title="سوتین"
              description="سوتین‌های سیم‌دار، بدون سیم و ورزشی"
              icon={<Heart size={21} />}
              iconClassName="bg-blush-100 text-blush-400 group-hover:bg-blush-200"
              hoverClassName="hover:border-blush-200"
            />

            <CategoryCard
              to="/products?category=panties"
              title="شورت"
              description="شورت‌های نخی و بدون درز"
              icon={<Layers size={21} />}
              iconClassName="bg-brand-100 text-brand-550 group-hover:bg-brand-250"
              hoverClassName="hover:border-brand-300"
            />

            <CategoryCard
              to="/products?category=lingerie-sets"
              title="ست لباس زیر"
              description="ست‌های هماهنگ سوتین و شورت"
              icon={<Shirt size={21} />}
              iconClassName="bg-plum-100 text-plum-500 group-hover:bg-plum-200"
              hoverClassName="hover:border-plum-200"
            />

            <CategoryCard
              to="/products?category=sleepwear"
              title="لباس خواب"
              description="پیراهن خواب و ست‌های خواب"
              icon={<Moon size={21} />}
              iconClassName="bg-brand-100 text-brand-550 group-hover:bg-brand-250"
              hoverClassName="hover:border-brand-300"
            />

            <CategoryCard
              to="/products?category=shapewear"
              title="گن و فرم‌دهنده"
              description="گن، بادی و فرم‌دهنده"
              icon={<Sparkles size={21} />}
              iconClassName="bg-plum-100 text-plum-500 group-hover:bg-plum-200"
              hoverClassName="hover:border-plum-200"
            />
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="bg-white py-12 sm:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-8 flex items-center justify-between gap-3">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-bold text-plum-500">
                <Sparkles size={16} />
                پیشنهادهای منتخب
              </div>
              <h2 className="text-2xl font-black text-brand-900 sm:text-3xl">
                محصولات ویژه
              </h2>
            </div>

            <ButtonLink
              to="/products"
              variant="ghost"
              size="sm"
              className="shrink-0 text-brand-500 transition hover:text-brand-700 active:scale-95"
            >
              مشاهده همه
              <ArrowLeft size={18} />
            </ButtonLink>
          </div>

          <div className="grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} variant="home" />
            ))}

            {featuredProducts.length === 0 && (
              <div className="col-span-full py-12 text-center">
                {featuredError ? (
                  <div className="rounded-2xl border border-blush-100 bg-blush-50 p-6 text-discount">
                    <div className="mb-3 font-black">
                      خطا در دریافت محصولات ویژه
                    </div>
                    <div className="text-sm">{featuredError}</div>
                  </div>
                ) : (
                  <div className="text-muted">
                    در حال دریافت محصولات ویژه...
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Newest Products */}
      <section className="bg-cream py-12 sm:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-8 flex items-center justify-between gap-3">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-bold text-plum-500">
                <Sparkles size={16} />
                تازه‌واردها
              </div>
              <h2 className="text-2xl font-black text-brand-900 sm:text-3xl">
                جدیدترین محصولات
              </h2>
            </div>

            <ButtonLink
              to="/products"
              variant="ghost"
              size="sm"
              className="shrink-0 text-brand-500 transition hover:text-brand-700 active:scale-95"
            >
              مشاهده همه
              <ArrowLeft size={18} />
            </ButtonLink>
          </div>

          <div className="grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
            {newestProducts.map((product) => (
              <ProductCard key={product.id} product={product} variant="home" />
            ))}

            {newestProducts.length === 0 && (
              <div className="col-span-full py-12 text-center">
                {newestError ? (
                  <div className="rounded-2xl border border-blush-100 bg-blush-50 p-6 text-discount">
                    <div className="mb-3 font-black">
                      خطا در دریافت جدیدترین محصولات
                    </div>
                    <div className="text-sm">{newestError}</div>
                  </div>
                ) : (
                  <div className="text-muted">
                    در حال دریافت جدیدترین محصولات...
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* تازه‌ترین مقالات (از پنل مدیریت) */}
      <LatestArticles />

      {/* Bottom CTA */}
      <section className="bg-white py-12 sm:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div
            className="
              relative flex flex-col items-center justify-between
              gap-8 overflow-hidden rounded-[2rem]
              bg-gradient-to-l from-brand-550 to-brand-400
              p-8 text-white md:flex-row md:p-12
            "
          >
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-bold">
                <Sparkles size={15} />
                استایل جدید خودت را پیدا کن
              </div>

              <h2 className="mt-5 text-2xl font-black sm:text-3xl">
                آماده‌ای استایل جدیدت را بسازی؟
              </h2>

              <p className="mt-3 max-w-xl leading-7 text-white/85">
                مجموعه‌ای از لباس‌های زنانه، لباس زیر و پوشاک ورزشی با طراحی
                مدرن و کیفیت مناسب.
              </p>
            </div>

            <ButtonLink
              to="/products"
              variant="secondary"
              size="lg"
              className="
                relative z-10 whitespace-nowrap
                !rounded-xl !bg-white !text-brand-550
                transition-all duration-150
                hover:!bg-brand-50
                active:scale-95
              "
            >
              <span className="inline-flex items-center gap-2">
                مشاهده فروشگاه
                <ArrowLeft size={19} />
              </span>
            </ButtonLink>

            <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-plum-200/15" />
          </div>
        </div>
      </section>
    </Layout>
  );
}

export default Home;
