import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import CartProvider from "./context/CartContext";
import AuthProvider from "./context/AuthContext";
import WishlistProvider from "./context/WishlistContext";
import { prefetchCategories } from "./services/categories";
import { migrateLegacyStorage } from "./utils/storageKeys";
import { initTheme } from "./utils/theme";
import { registerServiceWorker } from "./pwa";

// هستهٔ استایل (Tailwind + توکن‌ها). بقیهٔ استایل‌ها به ترتیب سند و به‌صورت
// ماژول‌های جدا ایمپورت می‌شوند؛ ترتیب ایمپورت عمدی است و آبشار CSS را حفظ
// می‌کند (جزئیات در index.css).
import "./index.css";
import "./styles/base.css";
import "./styles/admin-screens.css";
import "./styles/admin-responsive.css";
import "./styles/admin-page-widths.css";
import "./styles/admin-sidebar-icons.css";
import "./styles/admin-responsive-wide.css";
import "./styles/storefront.css";
import "./styles/admin-components.css";
import "./styles/admin-sidebar.css";
import "./styles/support-widget.css";
import "./styles/support-inbox.css";
import "./styles/admin-sidebar-custom.css";
import "./styles/jalali-picker.css";
import "./styles/theme-preview.css";
import "./styles/storefront-extras.css";

// تم انتخاب‌شدهٔ فروشگاه (?theme= یا localStorage) پیش از رندر اعمال می‌شود
// تا اولین نقاشی صفحه با رنگ درست انجام شود.
initTheme();

// کلیدهای قدیمی localStorage یک‌بار به کلیدهای جدید منتقل می‌شوند.
migrateLegacyStorage();

// منوی دسته‌بندی بلافاصله بعد از باز شدن سایت شروع به دریافت می‌کند تا
// زودتر از درخواست‌های صفحه‌ها به سرور برسد (سرور توسعه تک‌رشته‌ای است).
prefetchCategories();

// سرویس‌ورکر فقط در build نهایی ثبت می‌شود (نصب‌پذیری و کارکرد آفلاین).
registerServiceWorker();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <WishlistProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </WishlistProvider>
    </AuthProvider>
  </React.StrictMode>,
);
