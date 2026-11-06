import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import AdminRoute from "./components/AdminRoute";
import AdminLayout from "./components/AdminLayout";
import AdminPermissionGuard from "./components/AdminPermissionGuard";
import { AdminAuthProvider } from "./context/AdminAuthContext";
import { ADMIN_PERMISSIONS } from "./utils/adminPermissions";

const Home = lazy(() => import("./pages/Home"));
const Products = lazy(() => import("./pages/Products"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Cart = lazy(() => import("./pages/Cart"));
const Wishlist = lazy(() => import("./pages/Wishlist"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Payment = lazy(() => import("./pages/Payment"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Account = lazy(() => import("./pages/Account"));
const OrderDetail = lazy(() => import("./pages/OrderDetail"));
const SizeGuide = lazy(() => import("./pages/SizeGuide"));
const Articles = lazy(() => import("./pages/Articles"));
const ArticleDetail = lazy(() => import("./pages/ArticleDetail"));

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
const AdminSettings = lazy(() => import("./pages/AdminSettings"));
const AdminBrands = lazy(() => import("./pages/AdminBrands"));
const AdminCoupons = lazy(() => import("./pages/AdminCoupons"));
const AdminReturns = lazy(() => import("./pages/AdminReturns"));
const AdminSupport = lazy(() => import("./pages/AdminSupport"));
const AdminBanners = lazy(() => import("./pages/AdminBanners"));
const AdminAnnouncementBar = lazy(() => import("./pages/AdminAnnouncementBar"));
const AdminTrustBadges = lazy(() => import("./pages/AdminTrustBadges"));
const AdminArticles = lazy(() => import("./pages/AdminArticles"));
const AdminReports = lazy(() => import("./pages/AdminReports"));

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
                color: "var(--color-muted)",
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
            <Route path="/articles" element={<Articles />} />
            <Route path="/articles/:slug" element={<ArticleDetail />} />

            <Route path="/cart" element={<Cart />} />
            <Route path="/wishlist" element={<Wishlist />} />
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
                <Route
                  index
                  element={
                    <AdminPermissionGuard
                      permission={ADMIN_PERMISSIONS.dashboard}
                      section="نمای کلی"
                    >
                      <AdminDashboard />
                    </AdminPermissionGuard>
                  }
                />

                <Route
                  path="products"
                  element={
                    <AdminPermissionGuard
                      permission={ADMIN_PERMISSIONS.products}
                      section="محصولات"
                    >
                      <AdminProducts />
                    </AdminPermissionGuard>
                  }
                />
                <Route
                  path="products/create"
                  element={
                    <AdminPermissionGuard
                      permission={ADMIN_PERMISSIONS.products}
                      section="محصولات"
                    >
                      <AdminProductForm />
                    </AdminPermissionGuard>
                  }
                />
                <Route
                  path="products/:id/edit"
                  element={
                    <AdminPermissionGuard
                      permission={ADMIN_PERMISSIONS.products}
                      section="محصولات"
                    >
                      <AdminProductForm />
                    </AdminPermissionGuard>
                  }
                />

                <Route
                  path="categories"
                  element={
                    <AdminPermissionGuard
                      permission={ADMIN_PERMISSIONS.categories}
                      section="دسته‌بندی‌ها"
                    >
                      <AdminCategories />
                    </AdminPermissionGuard>
                  }
                />
                <Route
                  path="brands"
                  element={
                    <AdminPermissionGuard
                      permission={ADMIN_PERMISSIONS.brands}
                      section="برندها"
                    >
                      <AdminBrands />
                    </AdminPermissionGuard>
                  }
                />
                <Route
                  path="orders"
                  element={
                    <AdminPermissionGuard
                      permission={ADMIN_PERMISSIONS.orders}
                      section="سفارش‌ها"
                    >
                      <AdminOrders />
                    </AdminPermissionGuard>
                  }
                />
                <Route
                  path="returns"
                  element={
                    <AdminPermissionGuard
                      permission={ADMIN_PERMISSIONS.returns}
                      section="مرجوعی‌ها"
                    >
                      <AdminReturns />
                    </AdminPermissionGuard>
                  }
                />
                <Route
                  path="coupons"
                  element={
                    <AdminPermissionGuard
                      permission={ADMIN_PERMISSIONS.coupons}
                      section="کدهای تخفیف"
                    >
                      <AdminCoupons />
                    </AdminPermissionGuard>
                  }
                />
                <Route
                  path="banners"
                  element={
                    <AdminPermissionGuard
                      permission={ADMIN_PERMISSIONS.banners}
                      section="بنرها"
                    >
                      <AdminBanners />
                    </AdminPermissionGuard>
                  }
                />
                <Route
                  path="announcement-bar"
                  element={
                    <AdminPermissionGuard
                      permission={ADMIN_PERMISSIONS.banners}
                      section="نوار اطلاع‌رسانی"
                    >
                      <AdminAnnouncementBar />
                    </AdminPermissionGuard>
                  }
                />
                <Route
                  path="trust-badges"
                  element={
                    <AdminPermissionGuard
                      permission={ADMIN_PERMISSIONS.settings}
                      section="نمادها و مجوزها"
                    >
                      <AdminTrustBadges />
                    </AdminPermissionGuard>
                  }
                />
                <Route
                  path="articles"
                  element={
                    <AdminPermissionGuard
                      permission={ADMIN_PERMISSIONS.articles}
                      section="مقالات"
                    >
                      <AdminArticles />
                    </AdminPermissionGuard>
                  }
                />
                <Route
                  path="reports"
                  element={
                    <AdminPermissionGuard
                      permission={ADMIN_PERMISSIONS.reports}
                      section="گزارش فروش"
                    >
                      <AdminReports />
                    </AdminPermissionGuard>
                  }
                />
                <Route
                  path="settings"
                  element={
                    <AdminPermissionGuard
                      permission={ADMIN_PERMISSIONS.settings}
                      section="تنظیمات فروشگاه"
                    >
                      <AdminSettings />
                    </AdminPermissionGuard>
                  }
                />
                <Route
                  path="reviews"
                  element={
                    <AdminPermissionGuard
                      permission={ADMIN_PERMISSIONS.reviews}
                      section="نظرات محصولات"
                    >
                      <AdminProductReviews />
                    </AdminPermissionGuard>
                  }
                />

                <Route
                  path="customers"
                  element={
                    <AdminPermissionGuard
                      permission={ADMIN_PERMISSIONS.customers}
                      section="مشتریان"
                    >
                      <AdminCustomers />
                    </AdminPermissionGuard>
                  }
                />
                <Route
                  path="customers/:customerId"
                  element={
                    <AdminPermissionGuard
                      permission={ADMIN_PERMISSIONS.customers}
                      section="مشتریان"
                    >
                      <AdminCustomerDetail />
                    </AdminPermissionGuard>
                  }
                />

                <Route
                  path="admins"
                  element={
                    <AdminPermissionGuard
                      permission={ADMIN_PERMISSIONS.admins}
                      section="مدیران"
                    >
                      <AdminAdmins />
                    </AdminPermissionGuard>
                  }
                />
                <Route
                  path="messaging"
                  element={
                    <AdminPermissionGuard
                      permission={ADMIN_PERMISSIONS.messaging}
                      section="پیام‌رسانی"
                    >
                      <AdminMessaging />
                    </AdminPermissionGuard>
                  }
                />

                <Route
                  path="support"
                  element={
                    <AdminPermissionGuard
                      permission={ADMIN_PERMISSIONS.messaging}
                      section="پشتیبانی"
                    >
                      <AdminSupport />
                    </AdminPermissionGuard>
                  }
                />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </AdminAuthProvider>
    </BrowserRouter>
  );
}

export default App;
