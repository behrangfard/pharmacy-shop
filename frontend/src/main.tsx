import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import CartProvider from "./context/CartContext";
import AuthProvider from "./context/AuthContext";
import WishlistProvider from "./context/WishlistContext";
import { prefetchCategories } from "./services/categories";
import { migrateLegacyStorage } from "./utils/storageKeys";
import { initTheme } from "./utils/theme";

import "./index.css";

// تم انتخاب‌شدهٔ فروشگاه (?theme= یا localStorage) پیش از رندر اعمال می‌شود
// تا اولین نقاشی صفحه با رنگ درست انجام شود.
initTheme();

// کلیدهای قدیمی localStorage یک‌بار به کلیدهای جدید منتقل می‌شوند.
migrateLegacyStorage();

// منوی دسته‌بندی بلافاصله بعد از باز شدن سایت شروع به دریافت می‌کند تا
// زودتر از درخواست‌های صفحه‌ها به سرور برسد (سرور توسعه تک‌رشته‌ای است).
prefetchCategories();

ReactDOM.createRoot(
document.getElementById("root")!
).render(
<React.StrictMode> <AuthProvider> <WishlistProvider> <CartProvider> <App /> </CartProvider> </WishlistProvider> </AuthProvider>
</React.StrictMode>
);
