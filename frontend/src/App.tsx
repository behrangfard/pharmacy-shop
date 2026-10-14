import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import AdminRoute from "./components/AdminRoute";
import AdminLayout from "./components/AdminLayout";

const Home = lazy(() => import("./pages/Home"));
const Products = lazy(() => import("./pages/Products"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Payment = lazy(() => import("./pages/Payment"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Account = lazy(() => import("./pages/Account"));
const OrderDetail = lazy(() => import("./pages/OrderDetail"));

const AdminOrders = lazy(() => import("./pages/AdminOrders"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminProducts = lazy(() => import("./pages/AdminProducts"));
const AdminProductForm = lazy(() => import("./pages/AdminProductForm"));

function App() {
  return (
    <BrowserRouter>
      <Suspense
        fallback={
          <div
            role="status"
            style={{
              minHeight: "50vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#6b7280",
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            در حال بارگذاری صفحه...
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />

          {/* Product detail */}
          <Route path="/product/:slug" element={<ProductDetail />} />

          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/payment/:orderNumber" element={<Payment />} />

          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/account" element={<Account />} />
          <Route
            path="/account/orders/:orderNumber"
            element={<OrderDetail />}
          />

          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="products/create" element={<AdminProductForm />} />
              <Route path="products/:id/edit" element={<AdminProductForm />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
