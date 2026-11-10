import type { ReactNode } from "react";

import AnnouncementBar from "./AnnouncementBar";
import Header from "./Header";
import Footer from "./Footer";
import CategoryMenu from "./CategoryMenu";
import SupportWidget from "./SupportWidget";
import ThemeSwitcher from "./ThemeSwitcher";

interface LayoutProps {
  children: ReactNode;
}

function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-cream">
      {/*
        نوار اطلاع‌رسانی و هدر داخل یک wrapper چسبان قرار می‌گیرند تا مانند
        همیشه هنگام اسکرول ناپدید نشوند و نوار همیشه بالای هدر بماند.
      */}
      <div className="sticky top-0 z-50">
        <AnnouncementBar />

        <Header />
      </div>

      <CategoryMenu />

      <main>{children}</main>

      <Footer />

      <SupportWidget />

      {/* ابزار مقایسهٔ تم (پیش‌فرض/اقیانوس)؛ در نسخهٔ تولید فقط با تم غیرپیش‌فرض */}
      <ThemeSwitcher />
    </div>
  );
}

export default Layout;
