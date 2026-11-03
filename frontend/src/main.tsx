import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import CartProvider from "./context/CartContext";
import AuthProvider from "./context/AuthContext";
import { migrateLegacyStorage } from "./utils/storageKeys";

import "./index.css";

// کلیدهای قدیمی localStorage یک‌بار به کلیدهای جدید منتقل می‌شوند.
migrateLegacyStorage();

ReactDOM.createRoot(
document.getElementById("root")!
).render(
<React.StrictMode> <AuthProvider> <CartProvider> <App /> </CartProvider> </AuthProvider>
</React.StrictMode>
);
