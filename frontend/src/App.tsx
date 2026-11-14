import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import AdminRoute from "./components/AdminRoute";
import AdminLayout from "./components/AdminLayout";
import AdminPermissionGuard from "./components/AdminPermissionGuard";
import { RouteErrorBoundary } from "./components/ErrorBoundary";
import ScrollToTop from "./components/ScrollToTop";
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
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const TrackOrder = lazy(() => import("./pages/TrackOrder"));
const Account = lazy(() => import("./pages/Account"));
const OrderDetail = lazy(() => import("./pages/OrderDetail"));
const InvoiceView = lazy(() => import("./pages/InvoiceView"));
const SizeGuide = lazy(() => import("./pages/SizeGuide"));
const ShippingInfo = lazy(() => import("./pages/ShippingInfo"));
const Articles = lazy(() => import("./pages/Articles"));
const ArticleDetail = lazy(() => import("./pages/ArticleDetail"));
const PageView = lazy(() => import("./pages/PageView"));
const NotFound = lazy(() => import("./pages/NotFound"));

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
const AdminShipping = lazy(() => import("./pages/AdminShipping"));
const AdminSupport = lazy(() => import("./pages/AdminSupport"));
const AdminContent = lazy(() => import("./pages/AdminContent"));
const AdminAnnouncementBar = lazy(() => import("./pages/AdminAnnouncementBar"));
const AdminTrustBadges = lazy(() => import("./pages/AdminTrustBadges"));
const AdminStories = lazy(() => import("./pages/AdminStories"));
const AdminPopups = lazy(() => import("./pages/AdminPopups"));
const AdminHeaderFooter = lazy(() => import("./pages/AdminHeaderFooter"));
const AdminArticles = lazy(() => import("./pages/AdminArticles"));
const AdminReports = lazy(() => import("./pages/AdminReports"));
const AdminAccounting = lazy(() => import("./pages/AdminAccounting"));
const AdminWishlist = lazy(() => import("./pages/AdminWishlist"));

function App() {
  return (
    <BrowserRouter>
      {/* هر صفحهٔ جدید از بالای خودش باز می‌شود، نه از موقعیت اسکرول صفحهٔ قبلی */}
      <ScrollToTop />

      <AdminAuthProvider>
        <RouteErrorBoundary>
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
              <Route path="/shipping-info" element={<ShippingInfo />} />
              <Route path="/articles" element={<Articles />} />
              <Route path="/articles/:slug" element={<ArticleDetail />} />
              <Route path="/pages/:slug" element={<PageView />} />

              <Route path="/cart" element={<Cart />} />
              <Route path="/wishlist" element={<Wishlist />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/payment/:orderNumber" element={<Payment />} />

              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route
                path="/reset-password/:token"
                element={<ResetPassword />}
              />
              <Route path="/track-order" element={<TrackOrder />} />

              <Route path="/account" element={<Account />} />
              <Route
                path="/account/orders/:orderNumber"
                element={<OrderDetail />}
              />
              <Route
                path="/account/orders/:orderNumber/invoice"
                element={<InvoiceView />}
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
                    path="shipping"
                    element={
                      <AdminPermissionGuard
                        permission={ADMIN_PERMISSIONS.orders}
                        section="ارسال و حمل‌ونقل"
                      >
                        <AdminShipping />
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
                    path="content"
                    element={
                      <AdminPermissionGuard
                        permission={ADMIN_PERMISSIONS.banners}
                        section="مدیریت محتوا"
                      >
                        <AdminContent />
                      </AdminPermissionGuard>
                    }
                  />
                  {/* آدرس قدیمی بنرها به تب «بنرها» در بخش مدیریت محتوا منتقل شده است. */}
                  <Route
                    path="banners"
                    element={
                      <Navigate to="/admin/content?tab=banners" replace />
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
                    path="stories"
                    element={
                      <AdminPermissionGuard
                        permission={ADMIN_PERMISSIONS.banners}
                        section="استوری‌ها"
                      >
                        <AdminStories />
                      </AdminPermissionGuard>
                    }
                  />
                  <Route
                    path="popups"
                    element={
                      <AdminPermissionGuard
                        permission={ADMIN_PERMISSIONS.banners}
                        section="پاپ‌آپ‌ها"
                      >
                        <AdminPopups />
                      </AdminPermissionGuard>
                    }
                  />
                  <Route
                    path="header-footer"
                    element={
                      <AdminPermissionGuard
                        permission={ADMIN_PERMISSIONS.settings}
                        section="هدر و فوتر"
                      >
                        <AdminHeaderFooter />
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
                    path="wishlist"
                    element={
                      <AdminPermissionGuard
                        permission={ADMIN_PERMISSIONS.customers}
                        section="علاقه‌مندی‌های مشتریان"
                      >
                        <AdminWishlist />
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

                  <Route
                    path="accounting"
                    element={
                      <AdminPermissionGuard
                        permission={ADMIN_PERMISSIONS.accounting}
                        section="حسابداری"
                      >
                        <AdminAccounting />
                      </AdminPermissionGuard>
                    }
                  />
                  {/* آدرس ناشناختهٔ پنل: بازگشت به داشبورد تا کاربر از پنل بیرون نیفتد */}
                  <Route path="*" element={<Navigate to="/admin" replace />} />
                </Route>
              </Route>

              {/* هر آدرس ناشناختهٔ فروشگاه: صفحهٔ ۴۰۴ با جست‌وجو و میان‌برها */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </RouteErrorBoundary>
      </AdminAuthProvider>
    </BrowserRouter>
  );
}

export default App;
