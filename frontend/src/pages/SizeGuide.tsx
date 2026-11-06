import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Ruler, Sparkles } from "lucide-react";

import Layout from "../components/Layout";
import { SizeGuideContent } from "../components/SizeGuide";
import { usePageMeta } from "../hooks/usePageMeta";
import { SITE_NAME } from "../utils/seo";
import { breadcrumbJsonLd } from "../utils/structuredData";

/**
 * صفحهٔ مستقل «راهنمای انتخاب سایز».
 *
 * همین محتوا به‌صورت مودال در صفحهٔ محصول هم باز می‌شود؛ این صفحه برای
 * دسترسی مستقیم از منو و فوتر است.
 */
function SizeGuide() {
  const pageMeta = useMemo(
    () => ({
      title: `راهنمای انتخاب سایز | ${SITE_NAME}`,
      description:
        "راهنمای کامل انتخاب سایز سوتین، شورت، ست و لباس خواب؛ اندازه‌گیری دور سینه و باسن و جدول تبدیل سایزها.",
      path: "/size-guide",
      jsonLd: breadcrumbJsonLd([
        { name: "خانه", path: "/" },
        { name: "راهنمای انتخاب سایز", path: "/size-guide" },
      ]),
    }),
    [],
  );

  usePageMeta(pageMeta);

  return (
    <Layout>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        {/* مسیر صفحه */}
        <nav
          aria-label="مسیر صفحه"
          className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted-soft"
        >
          <Link to="/" className="transition-colors hover:text-brand-600">
            خانه
          </Link>
          <span aria-hidden="true">/</span>
          <span className="font-bold text-ink-soft">
            راهنمای انتخاب سایز
          </span>
        </nav>

        {/* هدر */}
        <header className="overflow-hidden rounded-3xl border border-brand-100 bg-gradient-to-l from-brand-75 via-cream to-plum-50 p-6 sm:p-9">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-brand-600 shadow-sm">
                <Sparkles size={14} aria-hidden="true" />
                سایز درست، راحتی بیشتر
              </div>

              <h1 className="mt-4 text-2xl font-black leading-relaxed text-ink sm:text-3xl">
                راهنمای انتخاب سایز
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-8 text-muted">
                برای سوتین، شورت، ست و لباس خواب، کافی است یک نوار اندازه‌گیری
                بردارید و چهار اندازهٔ ساده را یادداشت کنید. با جدول‌های زیر
                سایز دقیق خود را پیدا کنید.
              </p>
            </div>

            <div className="flex h-20 w-20 shrink-0 items-center justify-center self-start rounded-3xl bg-white/80 text-plum-500 shadow-sm sm:self-center">
              <Ruler size={38} aria-hidden="true" />
            </div>
          </div>
        </header>

        {/* محتوا */}
        <section className="mt-6 rounded-3xl border border-brand-100 bg-white p-4 sm:p-7">
          <SizeGuideContent initialTab="bra" />
        </section>

        {/* بازگشت به فروشگاه */}
        <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-2xl bg-brand-50 px-5 py-4 text-center sm:flex-row sm:text-right">
          <p className="text-xs leading-7 text-muted-soft">
            سایز محصولات را کنار هم مقایسه کنید و با خیال راحت خرید کنید.
          </p>

          <Link
            to="/products"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            مشاهده محصولات
          </Link>
        </div>
      </div>
    </Layout>
  );
}

export default SizeGuide;
