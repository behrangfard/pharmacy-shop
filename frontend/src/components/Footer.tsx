import { Link } from "react-router-dom";
import { useMemo, useState, type ComponentType } from "react";
import {
  ArrowLeft,
  CreditCard,
  FileText,
  Gift,
  Heart,
  HelpCircle,
  ShoppingBag,
  Sparkles,
  Headset,
  Truck,
  PackageCheck,
  Phone,
  Mail,
  MapPin,
  Camera,
  RotateCcw,
  Send,
  MessageCircle,
  ShieldCheck,
  Wallet,
} from "lucide-react";

import { useStoreSettings } from "../hooks/useStoreSettings";
import { useSitePages } from "../hooks/useSitePages";
import { useTrustBadges } from "../hooks/useTrustBadges";
import { useHeaderFooter } from "../hooks/useHeaderFooter";
import type { TrustBadge } from "../services/trustBadges";
import type {
  FooterServiceIcon,
  FooterServiceItem,
} from "../services/headerFooter";
import { requestSupportChat } from "../utils/supportChat";
import { getStorageUrl } from "../utils/images";

/**
 * یک نشان اعتماد (اینماد/مجوز) در فوتر.
 *
 * نشان‌ها از پنل مدیران می‌آیند؛ اگر تصویر پیدا نشود، همان نشان حذف می‌شود تا
 * آیکن شکسته روی سایت نماند. نشان بدون لینک هم نمایش داده می‌شود (غیرکلیک‌پذیر).
 */
function TrustBadgeTile({ badge }: { badge: TrustBadge }) {
  const [broken, setBroken] = useState(false);
  const source = getStorageUrl(badge.image);

  if (!source || broken) return null;

  const content = (
    <>
      <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-cream">
        <img
          src={source}
          alt={badge.title || "نشان اعتماد فروشگاه"}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-contain"
          onError={() => setBroken(true)}
        />
      </span>

      {badge.title && (
        <span className="mt-1.5 line-clamp-1 w-full text-center text-[10px] font-bold leading-4 text-muted">
          {badge.title}
        </span>
      )}
    </>
  );

  const tileClassName =
    "flex w-[88px] flex-col items-center rounded-2xl border border-line bg-white p-2 transition-colors";

  if (!badge.link) {
    return (
      <div className={tileClassName} title={badge.title || undefined}>
        {content}
      </div>
    );
  }

  return (
    <a
      href={badge.link}
      title={badge.title || undefined}
      target={badge.open_in_new_tab ? "_blank" : undefined}
      rel={badge.open_in_new_tab ? "noopener noreferrer" : undefined}
      className={`${tileClassName} hover:border-brand-250 hover:bg-brand-75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400`}
    >
      {content}
    </a>
  );
}

/** نقشهٔ آیکن هر ردیف «خدمات مشتریان»؛ کلیدها با بک‌اند هماهنگ‌اند. */
const SERVICE_ICON_COMPONENTS: Record<
  FooterServiceIcon,
  ComponentType<{ size?: number; className?: string }>
> = {
  "shopping-bag": ShoppingBag,
  truck: Truck,
  headset: Headset,
  "package-check": PackageCheck,
  phone: Phone,
  mail: Mail,
  "map-pin": MapPin,
  "shield-check": ShieldCheck,
  sparkles: Sparkles,
  heart: Heart,
  "credit-card": CreditCard,
  gift: Gift,
  "help-circle": HelpCircle,
  "file-text": FileText,
  wallet: Wallet,
  "rotate-ccw": RotateCcw,
};

/**
 * یک ردیف ستون «خدمات مشتریان» فوتر.
 *
 * ردیف‌ها از پنل («هدر و فوتر») می‌آیند و بسته به «اقدام» یکی از سه حالت را
 * دارند: متن ساده، لینک (داخلی/خارجی/تلفن/ایمیل) یا دکمه‌ای که پنجرهٔ چت
 * پشتیبانی را باز می‌کند.
 */
function ServiceRow({
  item,
  accent,
}: {
  item: FooterServiceItem;
  accent: "brand" | "plum";
}) {
  const Icon = SERVICE_ICON_COMPONENTS[item.icon] ?? Sparkles;

  const body = (
    <>
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
          accent === "brand"
            ? "bg-brand-100 text-brand-550"
            : "bg-plum-100 text-plum-500"
        } ${item.description ? "mt-0.5" : ""}`}
      >
        <Icon size={16} aria-hidden="true" />
      </span>

      <span className="min-w-0">
        <span className="block break-words font-bold text-ink-soft transition-colors group-hover:text-brand-600">
          {item.title}
        </span>

        {item.description && (
          <span className="mt-1 block break-words text-xs leading-6">
            {item.description}
          </span>
        )}
      </span>
    </>
  );

  const rowClass =
    "group flex w-full min-w-0 items-start gap-3 rounded-lg text-right transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400";

  // ردیف «پشتیبانی»: به‌جای لینک، چت پشتیبانی سایت را باز می‌کند.
  if (item.action === "support") {
    return (
      <button
        type="button"
        onClick={requestSupportChat}
        className={`${rowClass} hover:text-brand-600`}
      >
        {body}
      </button>
    );
  }

  if (item.action === "url" && item.url) {
    // مسیر داخلی با Router و بقیه (http، tel، mailto) با تگ a باز می‌شود.
    if (item.url.startsWith("/")) {
      return (
        <Link to={item.url} className={`${rowClass} hover:text-brand-600`}>
          {body}
        </Link>
      );
    }

    const external = /^https?:\/\//i.test(item.url);

    return (
      <a
        href={item.url}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className={`${rowClass} hover:text-brand-600`}
      >
        {body}
      </a>
    );
  }

  return <div className={rowClass}>{body}</div>;
}

function Footer() {
  const settings = useStoreSettings();
  const trustBadges = useTrustBadges();
  const sitePages = useSitePages();
  const headerFooter = useHeaderFooter();

  /** کلاس مشترک ردیف‌های ستون «دسترسی سریع». */
  const quickLinkClass =
    "group flex items-center justify-between gap-2 transition-colors hover:text-brand-600";

  /** عنوان ستون درباره؛ اگر مدیر عنوانی نگذاشته باشد، نام فروشگاه می‌آید. */
  const aboutTitle =
    headerFooter.footer_about_title || `درباره ${settings.store_name}`;

  /** فقط صفحه‌هایی که مدیر «نمایش در فوتر» را برایشان روشن کرده است. */
  const footerPages = useMemo(
    () => sitePages.filter((page) => page.show_in_footer),
    [sitePages],
  );

  /** ردیف‌های ستون «خدمات مشتریان»؛ عنوان خالی یعنی همان عنوان پیش‌فرض. */
  const services = headerFooter.footer_services;
  const servicesTitle =
    headerFooter.footer_services_title || "خدمات مشتریان";
  const hasSocialLinks = Boolean(
    settings.store_instagram ||
      settings.store_telegram ||
      settings.store_whatsapp,
  );
  const showServicesColumn =
    services.length > 0 || headerFooter.footer_show_contact || hasSocialLinks;

  /** ناحیهٔ نشان‌ها در حالت توسعه حتی وقتی نشانی ثبت نشده دیده می‌شود. */
  const showTrustArea = trustBadges.length > 0 || import.meta.env.DEV;

  return (
    <footer className="mt-16 border-t border-brand-100 bg-cream">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12">
        {/* Main footer */}
        <div className="grid grid-cols-1 gap-9 sm:grid-cols-2 md:grid-cols-4 md:gap-8">
          {/* Brand */}
          <div>
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-xl font-black text-brand-600 transition-colors hover:text-brand-700"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-100">
                <ShoppingBag size={21} />
              </span>
              {settings.store_name}
            </Link>

            <p className="mt-4 text-sm leading-8 text-muted-soft">
              {settings.store_slogan}
            </p>

            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-plum-100 px-3 py-2 text-xs font-medium text-plum-600">
              <Heart size={14} />
              <span>انتخابی برای راحتی شما</span>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="mb-5 flex items-center gap-2 font-black text-brand-800">
              <span className="h-6 w-1 rounded-full bg-brand-400" />
              دسترسی سریع
            </h4>

            <div className="space-y-3.5 text-sm text-muted-soft">
              {/* لینک‌های ستون «دسترسی سریع» از پنل مدیران می‌آیند؛ لینک‌های
                  داخلی با router و لینک‌های خارجی در تب جدید باز می‌شوند. */}
              {headerFooter.footer_quick_links.map((link) => {
                const key = `${link.label}-${link.url}`;

                return link.url.startsWith("/") ? (
                  <Link key={key} to={link.url} className={quickLinkClass}>
                    <span>{link.label}</span>
                    <ArrowLeft
                      size={15}
                      className="opacity-0 transition-all group-hover:translate-x-[-3px] group-hover:opacity-100"
                    />
                  </Link>
                ) : (
                  <a
                    key={key}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={quickLinkClass}
                  >
                    <span>{link.label}</span>
                    <ArrowLeft
                      size={15}
                      className="opacity-0 transition-all group-hover:translate-x-[-3px] group-hover:opacity-100"
                    />
                  </a>
                );
              })}

              {/* صفحه‌های ثابت سایت که مدیر برایشان «نمایش در فوتر» را فعال کرده است. */}
              {footerPages.map((page) => (
                <Link
                  key={page.id}
                  to={`/pages/${page.slug}`}
                  className="group flex items-center justify-between gap-2 transition-colors hover:text-brand-600"
                >
                  <span>{page.title}</span>
                  <ArrowLeft
                    size={15}
                    className="opacity-0 transition-all group-hover:translate-x-[-3px] group-hover:opacity-100"
                  />
                </Link>
              ))}

              {/* رهگیری سفارش برای مهمان و کاربر واردشده (بدون نیاز به ورود) */}
              <Link to="/track-order" className={quickLinkClass}>
                <span>رهگیری سفارش</span>
                <ArrowLeft
                  size={15}
                  className="opacity-0 transition-all group-hover:translate-x-[-3px] group-hover:opacity-100"
                />
              </Link>
            </div>
          </div>

          {/*
            Customer services
            ردیف‌ها و عنوان این ستون از پنل («هدر و فوتر») ویرایش می‌شوند؛
            ردیفی که اقدامش «پشتیبانی» باشد چت پشتیبانی را باز می‌کند.
          */}
          {showServicesColumn && (
            <div>
              <h4 className="mb-5 flex items-center gap-2 font-black text-brand-800">
                <span className="h-6 w-1 rounded-full bg-plum-300" />
                {servicesTitle}
              </h4>

              <div className="space-y-4 text-sm text-muted-soft">
                {services.map((item, index) => (
                  <ServiceRow
                    key={`${item.title}-${index}`}
                    item={item}
                    accent={index % 2 === 0 ? "brand" : "plum"}
                  />
                ))}

                {headerFooter.footer_show_contact && settings.store_phone && (
                  <a
                    href={`tel:${settings.store_phone}`}
                    className="flex min-w-0 items-center gap-3 transition-colors hover:text-brand-600"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-550">
                      <Phone size={16} />
                    </span>
                    <span className="min-w-0 break-all" dir="ltr">
                      {settings.store_phone}
                    </span>
                  </a>
                )}

                {headerFooter.footer_show_contact && settings.store_email && (
                  <a
                    href={`mailto:${settings.store_email}`}
                    className="flex min-w-0 items-center gap-3 transition-colors hover:text-brand-600"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-plum-100 text-plum-500">
                      <Mail size={16} />
                    </span>
                    <span className="min-w-0 break-all" dir="ltr">
                      {settings.store_email}
                    </span>
                  </a>
                )}

                {headerFooter.footer_show_contact && settings.store_address && (
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-550">
                      <MapPin size={16} />
                    </span>
                    <span className="min-w-0 break-words leading-6">
                      {settings.store_address}
                    </span>
                  </div>
                )}

                {hasSocialLinks && (
                  <div className="flex items-center gap-2 pt-1">
                    {settings.store_instagram && (
                      <a
                        href={settings.store_instagram}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="اینستاگرام"
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-plum-100 text-plum-500 transition-colors hover:bg-plum-200"
                      >
                        <Camera size={17} />
                      </a>
                    )}

                    {settings.store_telegram && (
                      <a
                        href={settings.store_telegram}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="تلگرام"
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-info-100 text-info transition-colors hover:bg-info-200"
                      >
                        <Send size={17} />
                      </a>
                    )}

                    {settings.store_whatsapp && (
                      <a
                        href={settings.store_whatsapp}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="واتس‌اپ"
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100 text-brand-550 transition-colors hover:bg-brand-250"
                      >
                        <MessageCircle size={17} />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* About */}
          <div>
            <h4 className="mb-5 flex items-center gap-2 font-black text-brand-800">
              <span className="h-6 w-1 rounded-full bg-brand-400" />
              {aboutTitle}
            </h4>

            <p className="text-sm leading-8 text-muted-soft">
              {headerFooter.footer_about_text}
            </p>

            <div className="mt-5 rounded-2xl border border-line bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-brand-600">
                <Sparkles size={17} />
                <span>{headerFooter.footer_highlight_title}</span>
              </div>
              <p className="mt-2 text-xs leading-6 text-muted-soft">
                {headerFooter.footer_highlight_text}
              </p>
            </div>
          </div>
        </div>

        {/* Trust badges: اینماد و مجوزهای فروشگاه (سمت چپ پایین صفحه) */}
        {showTrustArea && (
          <div className="mt-10 flex flex-col gap-5 rounded-3xl border border-line bg-white px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="sm:max-w-sm">
              <h4 className="flex items-center justify-center gap-2 text-sm font-black text-brand-800 sm:justify-start">
                <ShieldCheck
                  size={17}
                  className="shrink-0 text-brand-550"
                  aria-hidden="true"
                />
                مجوزها و نمادهای اعتماد
              </h4>

              <p className="mt-2 text-center text-xs leading-6 text-muted-soft sm:text-right">
                نماد اعتماد الکترونیکی و مجوزهای رسمی {settings.store_name}؛
                برای دیدن جزئیات هر نشان روی آن بزنید.
              </p>
            </div>

            <ul className="flex flex-wrap items-stretch justify-center gap-2.5 sm:justify-start">
              {trustBadges.map((badge) => (
                <li key={badge.id}>
                  <TrustBadgeTile badge={badge} />
                </li>
              ))}

              {trustBadges.length === 0 && (
                // فقط در محیط توسعه: پیش‌نمایش جای نشان‌ها تا مدیر بداند این
                // ناحیه در فوتر وجود دارد و باید از پنل پر شود.
                <li className="flex w-[88px] flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-line-strong bg-cream px-2 py-3 text-center">
                  <ShieldCheck
                    size={20}
                    className="text-muted-soft"
                    aria-hidden="true"
                  />
                  <span className="text-[10px] font-bold leading-4 text-muted-soft">
                    جای نشان
                  </span>
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Bottom bar */}
        <div className="mt-10 border-t border-brand-100 pt-6">
          <div className="flex flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-right">
            <p className="text-xs leading-6 text-muted-soft">
              {headerFooter.footer_copyright ||
                `تمامی حقوق این وب‌سایت متعلق به ${settings.store_name} است.`}
            </p>

            <Link
              to="/"
              className="text-xs font-bold text-muted transition-colors hover:text-plum-500"
            >
              بازگشت به صفحهٔ اصلی
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
