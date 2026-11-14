import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Clock,
  Headset,
  MessageCircle,
  Phone,
  Sparkles,
  Truck,
  Wallet,
} from "lucide-react";

import Layout from "../components/Layout";
import RichTextContent from "../components/RichTextContent";
import { usePageMeta } from "../hooks/usePageMeta";
import { requestSupportChat } from "../utils/supportChat";
import { SITE_NAME } from "../utils/seo";
import { breadcrumbJsonLd } from "../utils/structuredData";
import {
  DEFAULT_SHIPPING_INFO,
  fetchShippingInfo,
  type ShippingInfoMethod,
  type ShippingInfoSettings,
} from "../services/shippingInfo";

const formatPrice = (value: number) =>
  new Intl.NumberFormat("fa-IR").format(Math.round(value || 0));

/** متن هزینهٔ یک روش ارسال؛ هزینهٔ دقیق در مرحلهٔ پرداخت محاسبه می‌شود. */
function methodCost(method: ShippingInfoMethod): string {
  if (method.base_cost <= 0 && method.cost_per_kg <= 0) return "رایگان";

  const parts: string[] = [];

  if (method.base_cost > 0) {
    parts.push(`از ${formatPrice(method.base_cost)} تومان`);
  }

  if (method.cost_per_kg > 0) {
    parts.push(
      `${formatPrice(method.cost_per_kg)} تومان برای هر کیلوگرم اضافه`,
    );
  }

  return parts.join(" + ");
}

/**
 * صفحهٔ «روش‌های ارسال و اطلاعات ارسال».
 *
 * محتوای صفحه از پنل مدیریت (بخش ارسال و حمل‌ونقل ← تب «صفحهٔ ارسال») و
 * روش‌های ارسال فعال فروشگاه می‌آید؛ بنابراین مدیر بدون تغییر کد می‌تواند
 * متن، نکته‌ها، هزینه و زمان تحویل را به‌روزرسانی کند.
 */
function ShippingInfo() {
  const [data, setData] = useState<ShippingInfoSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    void fetchShippingInfo().then((next) => {
      if (!active) return;

      setData(next);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const info = data ?? DEFAULT_SHIPPING_INFO;

  const pageMeta = useMemo(
    () => ({
      title: `${info.title} | ${SITE_NAME}`,
      description:
        info.intro ||
        "روش‌های ارسال فروشگاه، هزینه و زمان تقریبی تحویل، ارسال رایگان و نکته‌های بسته‌بندی و رهگیری سفارش.",
      path: "/shipping-info",
      jsonLd: breadcrumbJsonLd([
        { name: "خانه", path: "/" },
        { name: info.title, path: "/shipping-info" },
      ]),
    }),
    [info.title, info.intro],
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
          <span className="font-bold text-ink-soft">{info.title}</span>
        </nav>

        {/* هدر */}
        <header className="overflow-hidden rounded-3xl border border-brand-100 bg-gradient-to-l from-brand-75 via-cream to-plum-50 p-6 sm:p-9">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-brand-600 shadow-sm">
                <Sparkles size={14} aria-hidden="true" />
                ارسال مطمئن به سراسر ایران
              </div>

              <h1 className="mt-4 text-2xl font-black leading-relaxed text-ink sm:text-3xl">
                {info.title}
              </h1>

              {info.intro && (
                <p className="mt-2 max-w-2xl text-sm leading-8 text-muted">
                  {info.intro}
                </p>
              )}
            </div>

            <div className="flex h-20 w-20 shrink-0 items-center justify-center self-start rounded-3xl bg-white/80 text-plum-500 shadow-sm sm:self-center">
              <Truck size={38} aria-hidden="true" />
            </div>
          </div>

          {info.free_shipping.enabled && info.free_shipping.threshold > 0 && (
            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-brand-100 bg-white/80 px-4 py-3">
              <Wallet
                size={18}
                className="mt-0.5 shrink-0 text-brand-550"
                aria-hidden="true"
              />
              <p className="text-xs leading-6 text-ink-soft sm:text-sm">
                ارسال سفارش‌های بالای{" "}
                <strong className="font-black text-brand-700">
                  {formatPrice(info.free_shipping.threshold)} تومان
                </strong>{" "}
                رایگان است.
              </p>
            </div>
          )}
        </header>

        {/* روش‌های ارسال */}
        <section className="mt-6 rounded-3xl border border-brand-100 bg-white p-4 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-black text-brand-800">
              <span className="h-6 w-1 rounded-full bg-brand-400" />
              روش‌های ارسال و هزینه
            </h2>

            <span className="rounded-full bg-cream px-3 py-1 text-[11px] font-bold text-muted-soft">
              {info.methods.length > 0
                ? `${formatPrice(info.methods.length)} روش فعال`
                : "به‌زودی"}
            </span>
          </div>

          {loading && !data && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[0, 1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-40 animate-pulse rounded-2xl bg-cream"
                  aria-hidden="true"
                />
              ))}
            </div>
          )}

          {!loading && info.methods.length === 0 && (
            <p className="mt-4 rounded-2xl border border-dashed border-line-strong bg-cream px-4 py-6 text-center text-sm leading-7 text-muted-soft">
              در حال حاضر روش ارسال فعالی ثبت نشده است؛ برای هماهنگی با
              پشتیبانی در ارتباط باشید.
            </p>
          )}

          {info.methods.length > 0 && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {info.methods.map((method) => (
                <article
                  key={method.id}
                  className="flex flex-col rounded-2xl border border-line bg-white p-5 transition-colors hover:border-brand-250"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-550">
                        <Truck size={18} aria-hidden="true" />
                      </span>

                      <div className="min-w-0">
                        <h3 className="break-words font-black text-ink">
                          {method.name}
                        </h3>

                        {method.carrier && (
                          <p className="mt-0.5 break-words text-xs text-muted-soft">
                            {method.carrier}
                          </p>
                        )}
                      </div>
                    </div>

                    {method.is_express && (
                      <span className="shrink-0 rounded-full bg-plum-50 px-2.5 py-1 text-[11px] font-bold text-plum-500">
                        ارسال سریع
                      </span>
                    )}
                  </div>

                  {method.description && (
                    <p className="mt-3 text-sm leading-7 text-muted">
                      {method.description}
                    </p>
                  )}

                  <dl className="mt-4 space-y-2 border-t border-line pt-4 text-xs">
                    {method.delivery && (
                      <div className="flex items-center gap-2 text-ink-soft">
                        <Clock
                          size={15}
                          className="shrink-0 text-brand-500"
                          aria-hidden="true"
                        />
                        <dt className="font-bold">زمان تحویل:</dt>
                        <dd>{method.delivery}</dd>
                      </div>
                    )}

                    {info.show_costs && (
                      <div className="flex items-center gap-2 text-ink-soft">
                        <Wallet
                          size={15}
                          className="shrink-0 text-brand-500"
                          aria-hidden="true"
                        />
                        <dt className="font-bold">هزینه:</dt>
                        <dd>{methodCost(method)}</dd>
                      </div>
                    )}

                    {method.free_over_amount !== null &&
                      method.free_over_amount > 0 && (
                        <dd className="rounded-xl bg-brand-50 px-3 py-2 text-[11px] leading-6 text-brand-700">
                          ارسال با این روش برای خرید بالای{" "}
                          {formatPrice(method.free_over_amount)} تومان رایگان
                          است.
                        </dd>
                      )}
                  </dl>
                </article>
              ))}
            </div>
          )}

          {info.show_costs && (
            <p className="mt-4 rounded-2xl bg-cream px-4 py-3 text-[11px] leading-6 text-muted-soft">
              هزینهٔ نمایش‌داده‌شده پایه است؛ مبلغ نهایی پس از انتخاب آدرس و
              بر اساس وزن مرسوله در مرحلهٔ پرداخت محاسبه می‌شود.
            </p>
          )}
        </section>


        {/* اطلاعات ارسال */}
        {info.notes.length > 0 && (
          <section className="mt-6 rounded-3xl border border-brand-100 bg-white p-4 sm:p-7">
            <h2 className="flex items-center gap-2 font-black text-brand-800">
              <span className="h-6 w-1 rounded-full bg-brand-400" />
              اطلاعات ارسال
            </h2>

            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {info.notes.map((note, index) => (
                <li
                  key={`${index}-${note.slice(0, 12)}`}
                  className="flex items-start gap-2.5 rounded-2xl border border-line bg-cream/60 p-4 text-sm leading-7 text-ink-soft"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600">
                    <Check size={12} aria-hidden="true" />
                  </span>
                  <span className="break-words">{note}</span>
                </li>
              ))}
            </ul>

            {info.shipping_note && (
              <p className="mt-4 border-t border-line pt-4 text-xs leading-6 text-muted-soft">
                {info.shipping_note}
              </p>
            )}
          </section>
        )}


        {/* متن تکمیلی از پنل */}
        {info.content.trim() !== "" && (
          <section className="mt-6 rounded-3xl border border-brand-100 bg-white p-4 sm:p-7">
            <RichTextContent content={info.content} />
          </section>
        )}


        {/* پشتیبانی */}
        <section className="mt-6 rounded-3xl border border-brand-100 bg-white p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-brand-550">
                <Headset size={22} aria-hidden="true" />
              </span>

              <div>
                <h2 className="font-black text-ink">
                  سؤالی دربارهٔ ارسال دارید؟
                </h2>

                <p className="mt-1 text-xs leading-6 text-muted-soft">
                  {info.support_note}
                  {info.store_working_hours
                    ? ` · ${info.store_working_hours}`
                    : ""}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={requestSupportChat}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
              >
                <MessageCircle size={16} aria-hidden="true" />
                گفت‌وگو با پشتیبانی
              </button>

              {info.store_phone && (
                <a
                  href={`tel:${info.store_phone}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm font-bold text-ink-soft transition-colors hover:border-brand-250 hover:text-brand-600"
                >
                  <Phone size={16} aria-hidden="true" />
                  {info.store_phone}
                </a>
              )}
            </div>
          </div>
        </section>


        {/* بازگشت به فروشگاه */}
        <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-2xl bg-brand-50 px-5 py-4 text-center sm:flex-row sm:text-right">
          <p className="text-xs leading-7 text-muted-soft">
            روش ارسال دلخواهتان را ببینید و با خیال راحت سفارش دهید.
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

export default ShippingInfo;
