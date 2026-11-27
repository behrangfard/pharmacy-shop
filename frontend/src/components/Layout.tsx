import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

import AnnouncementBar from "./AnnouncementBar";
import Header from "./Header";
import Footer from "./Footer";
import CategoryMenu from "./CategoryMenu";
import MobileBottomNav from "./MobileBottomNav";
import InstallPwaPrompt from "./InstallPwaPrompt";
import StorefrontPopup from "./StorefrontPopup";
import SupportWidget from "./SupportWidget";
import ThemeSwitcher from "./ThemeSwitcher";
import { useHeaderFooter } from "../hooks/useHeaderFooter";

interface LayoutProps {
  children: ReactNode;
}

function Layout({ children }: LayoutProps) {
  // پشتهٔ چسبان (نوار اطلاع‌رسانی + هدر) برای محاسبهٔ آفست اسکرول/فوکوس
  const stickyRef = useRef<HTMLDivElement>(null);
  // نوار پایین موبایل می‌تواند از پنل مدیریت خاموش شود؛ در آن حالت جای خالی
  // انتهای محتوا هم نباید رندر شود (کش مشترک است، درخواست تازه‌ای نمی‌زند).
  const { mobile_nav_enabled: mobileNavEnabled } = useHeaderFooter();

  useEffect(() => {
    const stickyElement = stickyRef.current;

    if (!stickyElement) {
      return;
    }

    const applyOffset = () => {
      // ۸px نفس برای دیده‌شدن کامل حلقهٔ فوکوس زیر هدر
      const offset = stickyElement.offsetHeight + 8;

      document.documentElement.style.setProperty(
        "--sticky-header-offset",
        `${offset}px`,
      );
    };

    applyOffset();

    // ارتفاع هدر با تغییر عرض صفحه/تعداد خط‌ها عوض می‌شود؛ همیشه به‌روز بماند.
    let disconnect = () => {};
    let removeResize = () => {};

    if (typeof ResizeObserver === "function") {
      const observer = new ResizeObserver(applyOffset);

      observer.observe(stickyElement);
      disconnect = () => observer.disconnect();
    } else {
      window.addEventListener("resize", applyOffset);
      removeResize = () => window.removeEventListener("resize", applyOffset);
    }

    /*
      WCAG 2.4.11 (Focus Not Obscured): عنصری که با کیبورد فوکوس می‌گیرد
      نباید زیر هدر چسبان پنهان بماند. scroll-padding در اکثر مرورگرها کافی
      است، ولی اگر مرورگر عنصرِ «داخل ویوپورت» را اسکرول نکند، این‌جا دستی
      آن را به وسط ویوپورت می‌آوریم.
    */
    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target;

      if (!(target instanceof HTMLElement)) {
        return;
      }

      // فقط فوکوس باکیبورد (نه کلیک ماوس/لمس)؛ در مرورگرهای قدیمی که
      // :focus-visible را نمی‌شناسند، محافظه‌کارانه همهٔ فوکوس‌ها را می‌پذیریم.
      let keyboardFocus = true;

      try {
        keyboardFocus = target.matches(":focus-visible");
      } catch {
        keyboardFocus = true;
      }

      if (!keyboardFocus) {
        return;
      }

      const offset = stickyElement.offsetHeight + 8;
      const { top } = target.getBoundingClientRect();

      if (top >= offset) {
        return;
      }

      const reduceMotion =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      target.scrollIntoView({
        block: "center",
        behavior: reduceMotion ? "auto" : "smooth",
      });
    };

    document.addEventListener("focusin", handleFocusIn);

    return () => {
      disconnect();
      removeResize();
      document.removeEventListener("focusin", handleFocusIn);
    };
  }, []);

  return (
    <div className="sf-theme min-h-screen bg-cream">
      {/*
        نوار اطلاع‌رسانی و هدر داخل یک wrapper چسبان قرار می‌گیرند تا مانند
        همیشه هنگام اسکرول ناپدید نشوند و نوار همیشه بالای هدر بماند.
      */}
      <div ref={stickyRef} className="sticky top-0 z-50">
        <AnnouncementBar />

        <Header />
      </div>

      <CategoryMenu />

      <main>{children}</main>

      <Footer />

      {/* جای خالی زیر محتوا تا نوار ناوبری پایین موبایل روی فوتر/دکمه‌ها نیفتد. */}
      {mobileNavEnabled && (
        <div className="mobile-nav-spacer" aria-hidden="true" />
      )}

      <SupportWidget />

      {/* پاپ‌آپ تبلیغاتی؛ انتخاب پاپ‌آپ و زمان نمایش را خودش مدیریت می‌کند */}
      <StorefrontPopup />

      {/* پیشنهاد نصب اپلیکیشن؛ فقط اگر مرورگر نصب را پیشنهاد داده باشد */}
      <InstallPwaPrompt />

      {/* ابزار مقایسهٔ تم (پیش‌فرض/اقیانوس)؛ در نسخهٔ تولید فقط با تم غیرپیش‌فرض */}
      <ThemeSwitcher />

      {/* ناوبری پایین + دکمهٔ شناور دسترسی سریع؛ فقط در نمای موبایل دیده می‌شود */}
      <MobileBottomNav />
    </div>
  );
}

export default Layout;
