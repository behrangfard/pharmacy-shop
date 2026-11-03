import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import AdminRoute from "./components/AdminRoute";
import AdminLayout from "./components/AdminLayout";
import { AdminAuthProvider } from "./context/AdminAuthContext";

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
const SizeGuide = lazy(() => import("./pages/SizeGuide"));

const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminCategories = lazy(() => import("./pages/AdminCategories"));
const AdminCustomers = lazy(() => import("./pages/AdminCustomers"));
const AdminCustomerDetail = lazy(() => import("./pages/AdminCustomerDetail"));
const AdminOrders = lazy(() => import("./pages/AdminOrders"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminProducts = lazy(() => import("./pages/AdminProducts"));
const AdminProductForm = lazy(() => import("./pages/AdminProductForm"));
const AdminProductReviews = lazy(() => import("./pages/AdminProductReviews"));
const AdminAdmins = lazy(() => import("./pages/AdminAdmins"));
const AdminMessaging = lazy(() => import("./pages/AdminMessaging"));

function App() {
  return (
    <BrowserRouter>
      <AdminAuthProvider>
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
            <Route path="/product/:slug" element={<ProductDetail />} />
            <Route path="/size-guide" element={<SizeGuide />} />

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

            <Route path="/admin/login" element={<AdminLogin />} />

            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />

                <Route path="products" element={<AdminProducts />} />
                <Route path="products/create" element={<AdminProductForm />} />
                <Route
                  path="products/:id/edit"
                  element={<AdminProductForm />}
                />

                <Route path="categories" element={<AdminCategories />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="reviews" element={<AdminProductReviews />} />

                <Route path="customers" element={<AdminCustomers />} />
                <Route
                  path="customers/:customerId"
                  element={<AdminCustomerDetail />}
                />

                <Route path="admins" element={<AdminAdmins />} />
                <Route path="messaging" element={<AdminMessaging />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </AdminAuthProvider>
    </BrowserRouter>
  );
}

export default App;
