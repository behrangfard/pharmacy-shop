import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FileText,
  Gift,
  Headset,
  Heart,
  Home,
  Lock,
  MonitorSmartphone,
  PackageCheck,
  Phone,
  Ruler,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Store,
  Tag,
  TicketPercent,
  Truck,
  UserRound,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { HEADER_SEARCH_INPUT_ID } from "./HeaderSearch";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { useHeaderFooter } from "../hooks/useHeaderFooter";
import {
  DEFAULT_HEADER_FOOTER,
  type MobileNavIcon,
  type MobileNavItem,
} from "../services/headerFooter";
import { getStorageUrl } from "../utils/images";

/**
 * نوار ناوبری پایین فروشگاه در نمای موبایل، همراه دکمهٔ شناور (FAB) وسط نوار.
 *
 * چرا: در موبایل دسترسی به سبد خرید، علاقه‌مندی‌ها و بخش‌های اصلی سایت فقط از
 * هدر (بالای صفحه) ممکن بود و کاربر برای هر جابه‌جایی باید به بالای صفحه
 * برمی‌گشت. این نوار همیشه در دسترس است و دکمهٔ وسطش یک پنل «دسترسی سریع»
 * باز می‌کند.
 *
 * نکته‌های پیاده‌سازی:
 * - همهٔ متن‌ها، نشانی‌ها، آیکن‌ها و لوگوی دکمهٔ شناور از پنل مدیریت
 *   («هدر و فوتر» → بخش «منوی پایین موبایل») و از `services/headerFooter.ts`
 *   می‌آیند؛ مقدار خالی/خراب یعنی همان پیش‌فرض‌های `DEFAULT_HEADER_FOOTER`.
 * - فقط در نمای موبایل (`md:hidden`) رندر می‌شود و پنل بازشو داخل خودش است؛
 *   پس با پنهان‌شدن نوار، پنل هم از دسترس خارج می‌شود. اگر مدیر نوار را
 *   خاموش کند، این کامپوننت و همچنین `.mobile-nav-spacer` در `Layout`
 *   رندر نمی‌شوند.
 * - ردیف «جست‌وجوی محصولات» (فوکوس کادر جست‌وجوی هدر) و ردیف «بخش ویژهٔ ۱۸+»
 *   ثابت‌اند و از پنل ویرایش نمی‌شوند؛ بقیهٔ ردیف‌ها قابل ویرایش‌اند.
 * - عدد سبد خرید و علاقه‌مندی از همان Context هدر می‌آید (بدون درخواست تازه)
 *   تا نشان‌ها با هدر ناهم‌خوان نشوند.
 * - قوس وسط نوار با `mask` روی `.mobile-nav-surface` ساخته می‌شود و همان لایه
 *   شیشهٔ نیمه‌شفاف (`backdrop-filter`) است؛ ماسک و فیلتر روی والد این لایه
 *   ممنوع است (backdrop root) و سایهٔ نرم بالای نوار با گرادیان روی
 *   `.mobile-nav-shell::before` می‌آید. شعاع قوس از قطر دکمهٔ شناور ساخته
 *   می‌شود تا حلقهٔ فاصله دور دکمه یکنواخت بماند. گرادیان متحرک دکمهٔ شناور هم
 *   در `styles/storefront-extras.css` است (با `prefers-reduced-motion` خاموش).
 * - ارتفاع نوار در متغیر `--mobile-nav-height` نگه داشته می‌شود و
 *   `.mobile-nav-spacer` در `Layout` فضای زیر محتوا را جبران می‌کند.
 */

interface NavItem {
  key: string;
  to: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  badge?: number;
}

interface QuickLink {
  key: string;
  to: string;
  label: string;
  hint: string;
  icon: LucideIcon;
}

/**
 * نقشهٔ آیکن‌های نوار پایین.
 * کلیدها با `MOBILE_NAV_ICONS` در `services/headerFooter.ts` و `NAV_ICONS` در
 * `HeaderFooterController` هماهماند؛ آیکن تازه باید در هر سه جا اضافه شود.
 */
const NAV_ICON_COMPONENTS: Record<MobileNavIcon, LucideIcon> = {
  home: Home,
  store: Store,
  "shopping-cart": ShoppingCart,
  "shopping-bag": ShoppingBag,
  heart: Heart,
  "user-round": UserRound,
  search: Search,
  sparkles: Sparkles,
  truck: Truck,
  tag: Tag,
  ruler: Ruler,
  "file-text": FileText,
  lock: Lock,
  headset: Headset,
  phone: Phone,
  "package-check": PackageCheck,
  "ticket-percent": TicketPercent,
  gift: Gift,
  "monitor-smartphone": MonitorSmartphone,
  "shield-check": ShieldCheck,
};

/** آیکن یک میان‌بر؛ مقدار ناشناخته یعنی آیکن پیش‌فرض (هماهنگ با بک‌اند). */
function navIcon(name: MobileNavIcon): LucideIcon {
  return NAV_ICON_COMPONENTS[name] ?? Sparkles;
}

/**
 * آیا این میان‌بر در مسیر جاری فعال است؟
 *
 * مسیر `/products` روی صفحهٔ محصول هم فعال می‌ماند (رفتار قبلی نوار) و
 * پارامترهای پرس‌وجو در مقایسه نادیده گرفته می‌شوند.
 */
function isNavItemActive(url: string, pathname: string): boolean {
  const path = url.split("?")[0].split("#")[0].trim();

  if (path === "" || !path.startsWith("/")) {
    return false;
  }

  if (path === "/") {
    return pathname === "/";
  }

  return (
    pathname === path ||
    pathname.startsWith(`${path}/`) ||
    (path === "/products" && pathname.startsWith("/product/"))
  );
}

/** آیا کاربر «انیمیشن کمتر» خواسته است؟ (برای نرمی جابه‌جایی فوکوس) */
function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function MobileBottomNav() {
  const { pathname, search } = useLocation();
  const { cartCount } = useCart();
  const { count: wishlistCount } = useWishlist();
  const { user } = useAuth();
  const settings = useHeaderFooter();
  const [panelOpen, setPanelOpen] = useState(false);

  // با هر جابه‌جایی صفحه پنل بسته می‌ماند (لینک‌ها هم خودشان می‌بندند).
  useEffect(() => {
    setPanelOpen(false);
  }, [pathname, search]);

  // Esc پنل را می‌بندد.
  useEffect(() => {
    if (!panelOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPanelOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [panelOpen]);

  /*
   * میان‌برهای نوار و ردیف‌های «دسترسی سریع» از تنظیمات پنل مدیریت می‌آیند
   * («هدر و فوتر» → «منوی پایین موبایل»). فهرست خالی یعنی تنظیمات خراب یا
   * کش قدیمی؛ در آن حالت پیش‌فرض‌ها می‌آیند تا نوار هرگز بی‌میان‌بر نماند.
   */
  const configuredItems =
    settings.mobile_nav_items.length > 0
      ? settings.mobile_nav_items
      : DEFAULT_HEADER_FOOTER.mobile_nav_items;

  const items: NavItem[] = configuredItems.map(
    (item: MobileNavItem, index: number) => ({
      key: `${item.url}-${index}`,
      to: item.url,
      label: item.label,
      icon: navIcon(item.icon),
      active: isNavItemActive(item.url, pathname),
      badge:
        item.badge === "cart"
          ? cartCount
          : item.badge === "wishlist"
            ? wishlistCount
            : undefined,
    }),
  );

  /**
   * میان‌برها در دو گروه هم‌عرض پیش و پس از جای خالی وسط چیده می‌شوند تا جای
   * خالی (و دکمهٔ شناور) همیشه دقیقاً وسط نوار بماند. تقسیم تک‌تکِ flexها با
   * تعداد فرد میان‌بر، جای خالی و دکمه را نیم‌آیتم از مرکز جابه‌جا می‌کرد و
   * دکمه روی تب کنارش می‌افتاد.
   */
  const firstGroupCount = Math.floor(items.length / 2);

  const quickLinks: QuickLink[] = settings.mobile_nav_quick_links.map(
    (link, index) => ({
      key: `${link.url}-${index}`,
      /*
       * نشانی `/account` برای مهمان به صفحهٔ ورود می‌رود (رفتار پیش‌فرض
       * قبلی)؛ هر نشانی دیگری بدون تغییر باز می‌شود.
       */
      to: link.url === "/account" && !user ? "/login" : link.url,
      label: link.label,
      hint: link.hint,
      icon: navIcon(link.icon),
    }),
  );

  /** نوار از پنل مدیریت خاموش شده است؛ نه نوار و نه پنل بازشو رندر نمی‌شود. */
  if (!settings.mobile_nav_enabled) {
    return null;
  }

  /** محتوای دکمهٔ شناور: لوگوی پنل، وگرنه آیکن پیش‌فرض. */
  const fabLogo = getStorageUrl(settings.mobile_nav_fab_logo);

  const fabContent = fabLogo ? (
    <img className="mobile-fab-logo" src={fabLogo} alt="" />
  ) : (
    <Sparkles size={24} aria-hidden="true" />
  );

  /*
   * حالت «بازکردن یک نشانی»: خودِ دکمهٔ شناور لینک می‌شود؛ در حالت پیش‌فرض
   * (`panel`) دکمه پنل «دسترسی سریع» را باز و بسته می‌کند.
   */
  const fabLink =
    settings.mobile_nav_fab_mode === "link"
      ? settings.mobile_nav_fab_url.trim() || null
      : null;

  const closePanel = () => setPanelOpen(false);

  /** فوکوس روی کادر جست‌وجوی هدر (کادر بالای صفحه همیشه دیده می‌شود). */
  const focusHeaderSearch = () => {
    setPanelOpen(false);

    const input = document.getElementById(HEADER_SEARCH_INPUT_ID);

    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    input.focus();
    input.scrollIntoView({
      block: "center",
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  };

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    const showBadge = (item.badge ?? 0) > 0;

    return (
      <Link
        key={item.key}
        to={item.to}
        aria-current={item.active ? "page" : undefined}
        className={`mobile-nav-item${item.active ? " is-active" : ""}`}
      >
        <span className="mobile-nav-icon">
          <Icon size={21} strokeWidth={1.9} aria-hidden="true" />

          {showBadge && (
            <span className="mobile-nav-badge">
              {item.badge?.toLocaleString("fa-IR")}
            </span>
          )}
        </span>

        <span className="mobile-nav-label">{item.label}</span>
      </Link>
    );
  };

  return (
    <nav className="mobile-bottom-nav md:hidden" aria-label="ناوبری سریع فروشگاه">
      {panelOpen && (
        <>
          {/* کلیک روی پس‌زمینهٔ تار، پنل را می‌بندد */}
          <button
            type="button"
            className="mobile-quick-backdrop"
            aria-label="بستن پنل دسترسی سریع"
            onClick={closePanel}
          />

          <div
            id="mobile-quick-panel"
            role="group"
            aria-label="دسترسی سریع"
            className="mobile-quick-panel"
          >
            <p className="mobile-quick-title">دسترسی سریع</p>

            <button
              type="button"
              className="mobile-quick-link"
              onClick={focusHeaderSearch}
            >
              <span className="mobile-quick-icon" aria-hidden="true">
                <Search size={17} />
              </span>
              <span className="mobile-quick-text">
                <strong>جست‌وجو در فروشگاه</strong>
                <small>کادر جست‌وجوی بالای صفحه</small>
              </span>
            </button>

            {quickLinks.map((link) => {
              const Icon = link.icon;

              return (
                <Link
                  key={link.key}
                  to={link.to}
                  className="mobile-quick-link"
                  onClick={closePanel}
                >
                  <span className="mobile-quick-icon" aria-hidden="true">
                    <Icon size={17} />
                  </span>
                  <span className="mobile-quick-text">
                    <strong>{link.label}</strong>
                    <small>{link.hint}</small>
                  </span>
                </Link>
              );
            })}

            <Link
              to="/adult"
              className="mobile-quick-link mobile-quick-link--adult"
              onClick={closePanel}
            >
              <span className="mobile-quick-icon" aria-hidden="true">
                <Lock size={17} />
              </span>
              <span className="mobile-quick-text">
                <strong>بخش ویژهٔ بزرگسالان</strong>
                <small>فقط برای ۱۸ سال به بالا</small>
              </span>
              <span className="mobile-quick-badge">۱۸+</span>
            </Link>
          </div>
        </>
      )}

      <div className="mobile-nav-shell">
        {/* سطح نوار: پس‌زمینه و خط بالایی، با قوس وسطِ ماسک‌دار برای دکمه. */}
        <span className="mobile-nav-surface" aria-hidden="true" />

        <div className="mobile-bottom-nav-bar">
          <div className="mobile-nav-group">
            {items.slice(0, firstGroupCount).map(renderItem)}
          </div>
          <div className="mobile-nav-slot" aria-hidden="true" />
          <div className="mobile-nav-group">
            {items.slice(firstGroupCount).map(renderItem)}
          </div>
        </div>
      </div>

      <div className="mobile-fab-hub">
        {fabLink ? (
          <Link
            to={fabLink}
            className="mobile-fab"
            aria-label={settings.store_name}
          >
            {fabContent}
          </Link>
        ) : (
          <button
            type="button"
            className="mobile-fab"
            aria-expanded={panelOpen}
            aria-controls={panelOpen ? "mobile-quick-panel" : undefined}
            aria-label={
              panelOpen ? "بستن دسترسی سریع" : "باز کردن دسترسی سریع"
            }
            onClick={() => setPanelOpen((open) => !open)}
          >
            {panelOpen ? <X size={24} aria-hidden="true" /> : fabContent}
          </button>
        )}
      </div>
    </nav>
  );
}

export default MobileBottomNav;
