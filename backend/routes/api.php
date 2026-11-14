<?php

use App\Http\Controllers\Api\AdminAccountingController;
use App\Http\Controllers\Api\AdminAnnouncementBarController;
use App\Http\Controllers\Api\AdminArticleController;
use App\Http\Controllers\Api\AdminBannerController;
use App\Http\Controllers\Api\AdminBannerFontController;
use App\Http\Controllers\Api\AdminBrandController;
use App\Http\Controllers\Api\AdminCategoryController;
use App\Http\Controllers\Api\AdminChequeController;
use App\Http\Controllers\Api\AdminCouponController;
use App\Http\Controllers\Api\AdminCustomerController;
use App\Http\Controllers\Api\AdminExpenseController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AdminMessagingContactController;
use App\Http\Controllers\Api\AdminMessagingController;
use App\Http\Controllers\Api\AdminNotificationController;
use App\Http\Controllers\Api\AdminOrderController;
use App\Http\Controllers\Api\AdminPageController;
use App\Http\Controllers\Api\AdminProductController;
use App\Http\Controllers\Api\AdminProductImageController;
use App\Http\Controllers\Api\AdminProductImportController;
use App\Http\Controllers\Api\AdminPurchaseInvoiceController;
use App\Http\Controllers\Api\AdminProductReviewController;
use App\Http\Controllers\Api\AdminPopupController;
use App\Http\Controllers\Api\AdminReportController;
use App\Http\Controllers\Api\AdminReturnRequestController;
use App\Http\Controllers\Api\AdminShippingController;
use App\Http\Controllers\Api\AdminStoreSettingController;
use App\Http\Controllers\Api\AdminStoryController;
use App\Http\Controllers\Api\AdminSupplierController;
use App\Http\Controllers\Api\AdminSupportController;
use App\Http\Controllers\Api\AdminTrustBadgeController;
use App\Http\Controllers\Api\AdminUserController;
use App\Http\Controllers\Api\AdminWishlistController;
use App\Http\Controllers\Api\AddressController;
use App\Http\Controllers\Api\AnnouncementBarController;
use App\Http\Controllers\Api\ArticleController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BannerController;
use App\Http\Controllers\Api\BannerFontController;
use App\Http\Controllers\Api\BrandController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\CouponController;
use App\Http\Controllers\Api\HeaderFooterController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\OrderTrackingController;
use App\Http\Controllers\Api\PageController;
use App\Http\Controllers\Api\PasswordResetController;
use App\Http\Controllers\Api\PopupController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ProductReviewController;
use App\Http\Controllers\Api\ReturnRequestController;
use App\Http\Controllers\Api\ShippingInfoController;
use App\Http\Controllers\Api\StoreSettingController;
use App\Http\Controllers\Api\StoryController;
use App\Http\Controllers\Api\SupportController;
use App\Http\Controllers\Api\SupportWebhookController;
use App\Http\Controllers\Api\TrustBadgeController;
use App\Http\Controllers\Api\WishlistController;
use App\Support\AdminRole;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {

    // Authentication
    Route::post('/auth/register', [AuthController::class, 'register'])
        ->middleware('throttle:auth');
    Route::post('/auth/login', [AuthController::class, 'login'])
        ->middleware('throttle:auth');

    // Password Reset (بازیابی رمز عبور فراموش‌شده)
    Route::post(
        '/auth/forgot-password',
        [PasswordResetController::class, 'forgotPassword']
    )->middleware('throttle:auth');

    Route::post(
        '/auth/reset-password',
        [PasswordResetController::class, 'resetPassword']
    )->middleware('throttle:auth');

    /*
    |--------------------------------------------------------------------------
    | Guest Checkout & Public Tracking (سفارش مهمان و رهگیری عمومی)
    |--------------------------------------------------------------------------
    | ثبت سفارش با توکن Sanctum (در صورت وجود) کاربر را می‌شناسد؛ بدون توکن،
    | سفارش «مهمان» است و با هدر X-Guest-Token یکتا می‌شود. رهگیری فقط با
    | شماره سفارش + شماره تماس کار می‌کند.
    */
    Route::post('/orders', [OrderController::class, 'store'])
        ->middleware('throttle:orders');

    Route::post('/orders/track', [OrderTrackingController::class, 'track'])
        ->middleware('throttle:10,1');

    /*
     * بازیابی دسترسی مهمان در مرورگر جدید با «شماره سفارش + کد پیگیری»
     * (همان throttle رهگیری عمومی).
     */
    Route::post('/orders/recover', [OrderTrackingController::class, 'recoverAccess'])
        ->middleware('throttle:10,1');

    /*
     * مشاهده و لغو سفارش برای کاربر (Bearer) و مهمان (X-Guest-Token) باز است؛
     * مالکیت داخل OrderController سنجیده می‌شود و بدون هویت، 401 برمی‌گردد.
     */
    Route::get('/orders/{orderNumber}', [OrderController::class, 'show'])
        ->middleware('throttle:60,1');

    Route::post(
        '/orders/{orderNumber}/cancel',
        [OrderController::class, 'cancel']
    )->middleware('throttle:orders');

    // Authenticated Routes
    Route::middleware('auth:sanctum')->group(function () {

        // Authentication
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::put('/auth/profile', [AuthController::class, 'update']);
        Route::put('/auth/password', [AuthController::class, 'changePassword']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);

        // Customer Orders
        Route::get('/orders', [OrderController::class, 'index']);

        Route::delete(
            '/orders/{orderNumber}',
            [OrderController::class, 'destroy']
        );

        Route::post(
            '/orders/{orderNumber}/pay',
            [OrderController::class, 'pay']
        );

        // Customer Order Returns (مرجوعی)
        Route::get('/returns', [ReturnRequestController::class, 'index']);

        Route::post(
            '/orders/{orderNumber}/returns',
            [ReturnRequestController::class, 'store']
        );

        // Customer Addresses (دفترچهٔ آدرس)
        Route::get('/addresses', [AddressController::class, 'index']);
        Route::post('/addresses', [AddressController::class, 'store']);

        Route::put('/addresses/{address}', [AddressController::class, 'update']);

        Route::patch(
            '/addresses/{address}/default',
            [AddressController::class, 'setDefault']
        );

        Route::delete(
            '/addresses/{address}',
            [AddressController::class, 'destroy']
        );

        // Customer Wishlist (علاقه‌مندی‌ها)
        Route::get('/wishlist', [WishlistController::class, 'index']);

        Route::post('/wishlist', [WishlistController::class, 'store']);

        Route::delete(
            '/wishlist/{product}',
            [WishlistController::class, 'destroy']
        );

        // Submit Product Review
        Route::post(
            '/products/{slug}/reviews',
            [ProductReviewController::class, 'store']
        );

        /*
        |----------------------------------------------------------------------
        | Admin Routes (پنل مدیریت)
        |----------------------------------------------------------------------
        | هر بخش بر اساس مجوزهای نقش مدیر محدود شده است (App\Support\AdminRole).
        | میدلویر admin.permission کلید مجوز را می‌گیرد و در صورت نبود مجوز
        | پاسخ 403 با پیام فارسی برمی‌گرداند.
        */

        Route::middleware('admin')->prefix('admin')->group(function () {

            // Notification Bell (اعلان‌های پنل مدیریت)
            // زنگوله برای همهٔ مدیران فعال است؛ هر مدیر با هر سطح دسترسی
            // می‌تواند اعلان‌ها را ببیند و خوانده‌شده علامت بزند.
            Route::get(
                '/notifications',
                [AdminNotificationController::class, 'index']
            );

            Route::post(
                '/notifications/read-all',
                [AdminNotificationController::class, 'markAllRead']
            );

            Route::post(
                '/notifications/{notification}/read',
                [AdminNotificationController::class, 'markRead']
            );

            // Dashboard (نمای کلی)
            Route::middleware('admin.permission:'.AdminRole::DASHBOARD_VIEW)
                ->group(function () {
                    Route::get('/dashboard', [AdminController::class, 'dashboard']);

                    Route::get(
                        '/dashboard/sales-trend',
                        [AdminController::class, 'salesTrend']
                    );
                });

            // Customer Management (مشتریان)
            Route::middleware('admin.permission:'.AdminRole::CUSTOMERS_MANAGE)
                ->group(function () {
                    Route::get('/customers', [AdminCustomerController::class, 'index']);
                    Route::post('/customers', [AdminCustomerController::class, 'store']);

                    Route::get(
                        '/customers/{customerId}',
                        [AdminCustomerController::class, 'show']
                    );

                    Route::delete(
                        '/customers/{customerId}',
                        [AdminCustomerController::class, 'destroy']
                    );
                });

            // Wishlist Analytics (آمار علاقه‌مندی‌های مشتریان)
            Route::middleware('admin.permission:'.AdminRole::CUSTOMERS_MANAGE)
                ->group(function () {
                    Route::get(
                        '/wishlist/overview',
                        [AdminWishlistController::class, 'overview']
                    );

                    Route::get(
                        '/wishlist/products',
                        [AdminWishlistController::class, 'products']
                    );

                    Route::get(
                        '/wishlist/customers',
                        [AdminWishlistController::class, 'customers']
                    );

                    Route::get(
                        '/wishlist/customers/{customerId}',
                        [AdminWishlistController::class, 'customerItems']
                    );
                });

            // Category Management (دسته‌بندی‌ها)
            Route::middleware('admin.permission:'.AdminRole::CATEGORIES_MANAGE)
                ->group(function () {
                    Route::get('/categories', [AdminCategoryController::class, 'index']);
                    Route::post('/categories', [AdminCategoryController::class, 'store']);

                    Route::get(
                        '/categories/{category}',
                        [AdminCategoryController::class, 'show']
                    );

                    Route::put(
                        '/categories/{category}',
                        [AdminCategoryController::class, 'update']
                    );

                    Route::patch(
                        '/categories/{category}/status',
                        [AdminCategoryController::class, 'updateStatus']
                    );

                    Route::delete(
                        '/categories/{category}',
                        [AdminCategoryController::class, 'destroy']
                    );
                });

            // Product Review Management (نظرات محصولات)
            Route::middleware('admin.permission:'.AdminRole::REVIEWS_MANAGE)
                ->group(function () {
                    Route::get('/reviews', [AdminProductReviewController::class, 'index']);

                    Route::patch(
                        '/reviews/{reviewId}/status',
                        [AdminProductReviewController::class, 'updateStatus']
                    );

                    Route::patch(
                        '/reviews/{reviewId}/reply',
                        [AdminProductReviewController::class, 'reply']
                    );
                });

            // Product Management (محصولات)
            Route::middleware('admin.permission:'.AdminRole::PRODUCTS_MANAGE)
                ->group(function () {
                    Route::get('/products', [AdminProductController::class, 'index']);
                    Route::post('/products', [AdminProductController::class, 'store']);

                    // ورود گروهی محصولات از فایل اکسل/CSV
                    Route::get(
                        '/products/import/template',
                        [AdminProductImportController::class, 'template']
                    );

                    Route::post(
                        '/products/import',
                        [AdminProductImportController::class, 'import']
                    );

                    // تصویر راهنمای سایز اختصاصی محصول (مستقل از شناسهٔ محصول)
                    Route::post(
                        '/products/size-guide-image',
                        [AdminProductController::class, 'uploadSizeGuideImage']
                    );

                    Route::get(
                        '/products/{product}',
                        [AdminProductController::class, 'show']
                    );

                    Route::put(
                        '/products/{product}',
                        [AdminProductController::class, 'update']
                    );

                    Route::patch(
                        '/products/{product}/status',
                        [AdminProductController::class, 'updateStatus']
                    );

                    Route::delete(
                        '/products/{product}',
                        [AdminProductController::class, 'destroy']
                    );

                    // Product Image Management (تصاویر محصول)
                    Route::post(
                        '/products/{product}/images',
                        [AdminProductImageController::class, 'store']
                    );

                    Route::patch(
                        '/products/{product}/images/reorder',
                        [AdminProductImageController::class, 'reorder']
                    );

                    Route::patch(
                        '/products/{product}/images/{productImage}/primary',
                        [AdminProductImageController::class, 'setPrimary']
                    );

                    Route::delete(
                        '/products/{product}/images/{productImage}',
                        [AdminProductImageController::class, 'destroy']
                    );
                });

            // Order Management (سفارش‌ها و اطلاعات ارسال)
            Route::middleware('admin.permission:'.AdminRole::ORDERS_MANAGE)
                ->group(function () {
                    Route::get('/orders', [AdminOrderController::class, 'index']);

                    Route::get(
                        '/orders/{orderNumber}',
                        [AdminOrderController::class, 'show']
                    );

                    Route::patch(
                        '/orders/{orderNumber}/status',
                        [AdminOrderController::class, 'updateStatus']
                    );

                    // ثبت دریافت وجه سفارش «پرداخت در محل»
                    Route::patch(
                        '/orders/{orderNumber}/payment',
                        [AdminOrderController::class, 'updatePaymentStatus']
                    );

                    // Shipping Info (اطلاعات ارسال و کد رهگیری)
                    Route::patch(
                        '/orders/{orderNumber}/shipping',
                        [AdminOrderController::class, 'updateShipping']
                    );
                });

            // Shipping & Delivery (ارسال و حمل‌ونقل)
            Route::middleware('admin.permission:'.AdminRole::ORDERS_MANAGE)
                ->group(function () {
                    Route::get('/shipping', [AdminShippingController::class, 'overview']);

                    Route::get(
                        '/shipping/shipments',
                        [AdminShippingController::class, 'shipments']
                    );

                    Route::post(
                        '/shipping/shipments',
                        [AdminShippingController::class, 'storeShipment']
                    );

                    Route::post(
                        '/shipping/quote',
                        [AdminShippingController::class, 'quote']
                    );

                    Route::get(
                        '/shipping/shipments/{shipment}',
                        [AdminShippingController::class, 'showShipment']
                    );

                    Route::put(
                        '/shipping/shipments/{shipment}',
                        [AdminShippingController::class, 'updateShipment']
                    );

                    Route::patch(
                        '/shipping/shipments/{shipment}/status',
                        [AdminShippingController::class, 'updateShipmentStatus']
                    );

                    Route::post(
                        '/shipping/shipments/{shipment}/notify',
                        [AdminShippingController::class, 'notifyShipment']
                    );

                    Route::delete(
                        '/shipping/shipments/{shipment}',
                        [AdminShippingController::class, 'destroyShipment']
                    );

                    // تاریخچهٔ ارسال‌ها
                    Route::get(
                        '/shipping/history',
                        [AdminShippingController::class, 'history']
                    );

                    // صفحهٔ «روش‌های ارسال و اطلاعات ارسال» (محتوای سایت)
                    Route::get('/shipping/page', [AdminShippingController::class, 'page']);

                    Route::put(
                        '/shipping/page',
                        [AdminShippingController::class, 'updatePage']
                    );

                    // روش‌های ارسال
                    Route::get('/shipping/methods', [AdminShippingController::class, 'methods']);

                    Route::post(
                        '/shipping/methods',
                        [AdminShippingController::class, 'storeMethod']
                    );

                    Route::put(
                        '/shipping/methods/{method}',
                        [AdminShippingController::class, 'updateMethod']
                    );

                    Route::patch(
                        '/shipping/methods/{method}/status',
                        [AdminShippingController::class, 'updateMethodStatus']
                    );

                    Route::delete(
                        '/shipping/methods/{method}',
                        [AdminShippingController::class, 'destroyMethod']
                    );

                    // مناطق ارسال
                    Route::get('/shipping/zones', [AdminShippingController::class, 'zones']);

                    Route::post(
                        '/shipping/zones',
                        [AdminShippingController::class, 'storeZone']
                    );

                    Route::put(
                        '/shipping/zones/{zone}',
                        [AdminShippingController::class, 'updateZone']
                    );

                    Route::patch(
                        '/shipping/zones/{zone}/status',
                        [AdminShippingController::class, 'updateZoneStatus']
                    );

                    Route::delete(
                        '/shipping/zones/{zone}',
                        [AdminShippingController::class, 'destroyZone']
                    );

                    // تعرفه و هزینهٔ ارسال
                    Route::get('/shipping/rules', [AdminShippingController::class, 'rules']);

                    Route::post(
                        '/shipping/rules',
                        [AdminShippingController::class, 'storeRule']
                    );

                    Route::put(
                        '/shipping/rules/{rule}',
                        [AdminShippingController::class, 'updateRule']
                    );

                    Route::patch(
                        '/shipping/rules/{rule}/status',
                        [AdminShippingController::class, 'updateRuleStatus']
                    );

                    Route::delete(
                        '/shipping/rules/{rule}',
                        [AdminShippingController::class, 'destroyRule']
                    );
                });

            // Return Requests (مرجوعی‌ها)
            Route::middleware('admin.permission:'.AdminRole::RETURNS_MANAGE)
                ->group(function () {
                    Route::get('/returns', [AdminReturnRequestController::class, 'index']);

                    Route::patch(
                        '/returns/{returnRequest}/status',
                        [AdminReturnRequestController::class, 'updateStatus']
                    );
                });

            // Coupons (کدهای تخفیف)
            Route::middleware('admin.permission:'.AdminRole::COUPONS_MANAGE)
                ->group(function () {
                    Route::get('/coupons', [AdminCouponController::class, 'index']);
                    Route::post('/coupons', [AdminCouponController::class, 'store']);

                    Route::put('/coupons/{coupon}', [AdminCouponController::class, 'update']);

                    Route::patch(
                        '/coupons/{coupon}/status',
                        [AdminCouponController::class, 'updateStatus']
                    );

                    Route::delete(
                        '/coupons/{coupon}',
                        [AdminCouponController::class, 'destroy']
                    );
                });

            // Banners (بنرهای فروشگاه)
            Route::middleware('admin.permission:'.AdminRole::BANNERS_MANAGE)
                ->group(function () {
                    Route::get('/banners', [AdminBannerController::class, 'index']);
                    Route::post('/banners', [AdminBannerController::class, 'store']);

                    // Announcement Bar (نوار اطلاع‌رسانی بالای هدر)
                    Route::get(
                        '/announcement-bar',
                        [AdminAnnouncementBarController::class, 'index']
                    );

                    Route::put(
                        '/announcement-bar/settings',
                        [AdminAnnouncementBarController::class, 'updateSettings']
                    );

                    Route::post(
                        '/announcement-bar/media',
                        [AdminAnnouncementBarController::class, 'uploadMedia']
                    );

                    Route::post(
                        '/announcement-bar/items',
                        [AdminAnnouncementBarController::class, 'store']
                    );

                    Route::put(
                        '/announcement-bar/items/{item}',
                        [AdminAnnouncementBarController::class, 'update']
                    );

                    Route::patch(
                        '/announcement-bar/items/{item}/status',
                        [AdminAnnouncementBarController::class, 'updateStatus']
                    );

                    Route::delete(
                        '/announcement-bar/items/{item}',
                        [AdminAnnouncementBarController::class, 'destroy']
                    );

                    Route::post(
                        '/banners/image',
                        [AdminBannerController::class, 'uploadImage']
                    );

                    // بخش‌های بنر (چیدمان بخش چندستونهٔ صفحهٔ اول)
                    Route::get(
                        '/banner-sections',
                        [AdminBannerController::class, 'sections']
                    );

                    Route::put(
                        '/banner-sections/{position}',
                        [AdminBannerController::class, 'updateSection']
                    );

                    // ظاهر مشترک همهٔ بنرها (گردی گوشهٔ کادر بنر).
                    Route::put(
                        '/banner-appearance',
                        [AdminBannerController::class, 'updateAppearance']
                    );

                    Route::put('/banners/order', [AdminBannerController::class, 'reorder']);

                    Route::put('/banners/{banner}', [AdminBannerController::class, 'update']);

                    Route::patch(
                        '/banners/{banner}/status',
                        [AdminBannerController::class, 'updateStatus']
                    );

                    Route::delete(
                        '/banners/{banner}',
                        [AdminBannerController::class, 'destroy']
                    );

                    // Banner Fonts (کتابخانه فونت متن بنرها)
                    Route::get(
                        '/banner-fonts',
                        [AdminBannerFontController::class, 'index']
                    );

                    Route::post(
                        '/banner-fonts',
                        [AdminBannerFontController::class, 'store']
                    );

                    Route::patch(
                        '/banner-fonts/{bannerFont}/status',
                        [AdminBannerFontController::class, 'updateStatus']
                    );

                    Route::delete(
                        '/banner-fonts/{bannerFont}',
                        [AdminBannerFontController::class, 'destroy']
                    );

                    // Stories (استوری‌های صفحهٔ اول؛ دایره‌های بالای دسته‌بندی‌ها)
                    Route::get('/stories', [AdminStoryController::class, 'index']);
                    Route::post('/stories', [AdminStoryController::class, 'store']);

                    Route::post(
                        '/stories/image',
                        [AdminStoryController::class, 'uploadImage']
                    );

                    Route::put('/stories/{story}', [AdminStoryController::class, 'update']);

                    Route::patch(
                        '/stories/{story}/status',
                        [AdminStoryController::class, 'updateStatus']
                    );

                    Route::delete(
                        '/stories/{story}',
                        [AdminStoryController::class, 'destroy']
                    );

                    // Popups (پاپ‌آپ‌های تبلیغاتی سایت)
                    Route::get('/popups', [AdminPopupController::class, 'index']);
                    Route::post('/popups', [AdminPopupController::class, 'store']);

                    Route::post(
                        '/popups/image',
                        [AdminPopupController::class, 'uploadImage']
                    );

                    Route::put('/popups/{popup}', [AdminPopupController::class, 'update']);

                    Route::patch(
                        '/popups/{popup}/status',
                        [AdminPopupController::class, 'updateStatus']
                    );

                    Route::delete(
                        '/popups/{popup}',
                        [AdminPopupController::class, 'destroy']
                    );
                });

            // Pages (صفحات ثابت سایت)
            Route::middleware('admin.permission:'.AdminRole::PAGES_MANAGE)
                ->group(function () {
                    Route::get('/pages', [AdminPageController::class, 'index']);
                    Route::post('/pages', [AdminPageController::class, 'store']);

                    Route::get('/pages/{page}', [AdminPageController::class, 'show']);

                    Route::put('/pages/{page}', [AdminPageController::class, 'update']);

                    Route::patch(
                        '/pages/{page}/status',
                        [AdminPageController::class, 'updateStatus']
                    );

                    Route::delete('/pages/{page}', [AdminPageController::class, 'destroy']);
                });

            // Articles (مقالات فروشگاه)
            Route::middleware('admin.permission:'.AdminRole::ARTICLES_MANAGE)
                ->group(function () {
                    Route::get('/articles', [AdminArticleController::class, 'index']);
                    Route::post('/articles', [AdminArticleController::class, 'store']);

                    Route::post(
                        '/articles/cover',
                        [AdminArticleController::class, 'uploadCover']
                    );

                    Route::get(
                        '/articles/{article}',
                        [AdminArticleController::class, 'show']
                    );

                    Route::put(
                        '/articles/{article}',
                        [AdminArticleController::class, 'update']
                    );

                    Route::patch(
                        '/articles/{article}/status',
                        [AdminArticleController::class, 'updateStatus']
                    );

                    Route::delete(
                        '/articles/{article}',
                        [AdminArticleController::class, 'destroy']
                    );
                });

            // Brand Management (برندها)
            Route::middleware('admin.permission:'.AdminRole::BRANDS_MANAGE)
                ->group(function () {
                    Route::get('/brands', [AdminBrandController::class, 'index']);
                    Route::post('/brands', [AdminBrandController::class, 'store']);

                    Route::get('/brands/{brand}', [AdminBrandController::class, 'show']);

                    Route::put('/brands/{brand}', [AdminBrandController::class, 'update']);

                    Route::patch(
                        '/brands/{brand}/status',
                        [AdminBrandController::class, 'updateStatus']
                    );

                    Route::delete(
                        '/brands/{brand}',
                        [AdminBrandController::class, 'destroy']
                    );
                });

            // Messaging Panel (SMS / Telegram / WhatsApp / Bale)
            Route::middleware('admin.permission:'.AdminRole::MESSAGING_MANAGE)
                ->group(function () {
                    Route::get('/messaging', [AdminMessagingController::class, 'index']);

                    Route::get(
                        '/messaging/settings',
                        [AdminMessagingController::class, 'settings']
                    );

                    Route::post(
                        '/messaging/send',
                        [AdminMessagingController::class, 'send']
                    );

                    // تبریک تولد خودکار مشتریان
                    Route::get(
                        '/messaging/birthday',
                        [AdminMessagingController::class, 'birthdaySettings']
                    );

                    Route::put(
                        '/messaging/birthday',
                        [AdminMessagingController::class, 'updateBirthdaySettings']
                    );

                    Route::post(
                        '/messaging/birthday/send',
                        [AdminMessagingController::class, 'sendBirthdayGreetings']
                    );

                    // پیامک خودکار تغییر وضعیت سفارش
                    Route::get(
                        '/messaging/order-status',
                        [AdminMessagingController::class, 'orderStatusSettings']
                    );

                    Route::put(
                        '/messaging/order-status',
                        [AdminMessagingController::class, 'updateOrderStatusSettings']
                    );

                    Route::delete(
                        '/messaging/{messageId}',
                        [AdminMessagingController::class, 'destroy']
                    );

                    // دفترچهٔ مخاطبین (ورود شماره‌ها از اکسل/ورد)
                    Route::get(
                        '/messaging/contacts',
                        [AdminMessagingContactController::class, 'index']
                    );

                    Route::get(
                        '/messaging/contacts/groups',
                        [AdminMessagingContactController::class, 'groups']
                    );

                    Route::get(
                        '/messaging/contacts/template',
                        [AdminMessagingContactController::class, 'template']
                    );

                    Route::post(
                        '/messaging/contacts/import',
                        [AdminMessagingContactController::class, 'import']
                    );

                    Route::post(
                        '/messaging/contacts',
                        [AdminMessagingContactController::class, 'store']
                    );

                    Route::delete(
                        '/messaging/contacts/bulk',
                        [AdminMessagingContactController::class, 'bulkDestroy']
                    );

                    Route::patch(
                        '/messaging/contacts/{contact}',
                        [AdminMessagingContactController::class, 'update']
                    );

                    Route::delete(
                        '/messaging/contacts/{contact}',
                        [AdminMessagingContactController::class, 'destroy']
                    );
                });

            // Support Inbox (صندوق پشتیبانی — چت‌های فروشگاه)
            Route::middleware('admin.permission:'.AdminRole::MESSAGING_MANAGE)
                ->group(function () {
                    Route::get(
                        '/support/stats',
                        [AdminSupportController::class, 'stats']
                    );

                    Route::get(
                        '/support/conversations',
                        [AdminSupportController::class, 'index']
                    );

                    Route::get(
                        '/support/conversations/{conversationId}',
                        [AdminSupportController::class, 'show']
                    );

                    Route::post(
                        '/support/conversations/{conversationId}/messages',
                        [AdminSupportController::class, 'reply']
                    );

                    Route::patch(
                        '/support/conversations/{conversationId}/status',
                        [AdminSupportController::class, 'updateStatus']
                    );
                });

            // Accounting (حسابداری فروشگاه: خرید، هزینه، چک و سود)
            Route::middleware('admin.permission:'.AdminRole::ACCOUNTING_MANAGE)
                ->prefix('accounting')
                ->group(function () {
                    Route::get('/overview', [AdminAccountingController::class, 'overview']);
                    Route::get('/report', [AdminAccountingController::class, 'report']);

                    // تأمین‌کنندگان
                    Route::get('/suppliers', [AdminSupplierController::class, 'index']);
                    Route::post('/suppliers', [AdminSupplierController::class, 'store']);

                    Route::put(
                        '/suppliers/{supplier}',
                        [AdminSupplierController::class, 'update']
                    );

                    Route::delete(
                        '/suppliers/{supplier}',
                        [AdminSupplierController::class, 'destroy']
                    );

                    // جست‌وجوی محصول برای اقلام فاکتور
                    Route::get('/products', [AdminPurchaseInvoiceController::class, 'products']);

                    // فاکتورهای خرید
                    Route::get(
                        '/purchase-invoices',
                        [AdminPurchaseInvoiceController::class, 'index']
                    );

                    Route::post(
                        '/purchase-invoices',
                        [AdminPurchaseInvoiceController::class, 'store']
                    );

                    Route::get(
                        '/purchase-invoices/{purchaseInvoice}',
                        [AdminPurchaseInvoiceController::class, 'show']
                    );

                    Route::put(
                        '/purchase-invoices/{purchaseInvoice}',
                        [AdminPurchaseInvoiceController::class, 'update']
                    );

                    Route::patch(
                        '/purchase-invoices/{purchaseInvoice}/payment',
                        [AdminPurchaseInvoiceController::class, 'payment']
                    );

                    Route::delete(
                        '/purchase-invoices/{purchaseInvoice}',
                        [AdminPurchaseInvoiceController::class, 'destroy']
                    );

                    // هزینه‌ها
                    Route::get('/expenses', [AdminExpenseController::class, 'index']);
                    Route::post('/expenses', [AdminExpenseController::class, 'store']);

                    Route::put('/expenses/{expense}', [AdminExpenseController::class, 'update']);
                    Route::delete('/expenses/{expense}', [AdminExpenseController::class, 'destroy']);

                    // چک‌ها
                    Route::get('/cheques', [AdminChequeController::class, 'index']);
                    Route::post('/cheques', [AdminChequeController::class, 'store']);

                    Route::put('/cheques/{cheque}', [AdminChequeController::class, 'update']);

                    Route::patch(
                        '/cheques/{cheque}/status',
                        [AdminChequeController::class, 'status']
                    );

                    Route::delete('/cheques/{cheque}', [AdminChequeController::class, 'destroy']);
                });

            // Store Settings (تنظیمات فروشگاه)
            Route::middleware('admin.permission:'.AdminRole::SETTINGS_MANAGE)
                ->group(function () {
                    Route::get('/settings', [AdminStoreSettingController::class, 'index']);
                    Route::put('/settings', [AdminStoreSettingController::class, 'update']);

                    // Header & Footer (هدر و فوتر سایت)
                    Route::get(
                        '/header-footer',
                        [HeaderFooterController::class, 'show']
                    );

                    Route::put(
                        '/header-footer',
                        [HeaderFooterController::class, 'update']
                    );

                    // Trust Badges (اینماد و مجوزهای فوتر)
                    Route::get(
                        '/trust-badges',
                        [AdminTrustBadgeController::class, 'index']
                    );

                    Route::post(
                        '/trust-badges',
                        [AdminTrustBadgeController::class, 'store']
                    );

                    Route::post(
                        '/trust-badges/image',
                        [AdminTrustBadgeController::class, 'uploadImage']
                    );

                    Route::put(
                        '/trust-badges/{trustBadge}',
                        [AdminTrustBadgeController::class, 'update']
                    );

                    Route::patch(
                        '/trust-badges/{trustBadge}/status',
                        [AdminTrustBadgeController::class, 'updateStatus']
                    );

                    Route::delete(
                        '/trust-badges/{trustBadge}',
                        [AdminTrustBadgeController::class, 'destroy']
                    );
                });

            // Reports (گزارش فروش)
            Route::middleware('admin.permission:'.AdminRole::REPORTS_VIEW)
                ->group(function () {
                    Route::get('/reports/sales', [AdminReportController::class, 'sales']);
                });

            // Admin Accounts (مدیران فروشگاه)
            Route::middleware('admin.permission:'.AdminRole::ADMINS_MANAGE)
                ->group(function () {
                    Route::get('/admins', [AdminUserController::class, 'index']);
                    Route::post('/admins', [AdminUserController::class, 'store']);

                    Route::put(
                        '/admins/{adminId}',
                        [AdminUserController::class, 'update']
                    );

                    Route::delete(
                        '/admins/{adminId}',
                        [AdminUserController::class, 'destroy']
                    );
                });
        });
    });

    // Support Chat (چت پشتیبانی فروشگاه)
    Route::get('/support/config', [SupportController::class, 'config']);

    Route::post('/support/conversations', [SupportController::class, 'store'])
        ->middleware('throttle:20,1');

    Route::get(
        '/support/conversations/{token}',
        [SupportController::class, 'show']
    )->middleware('throttle:120,1');

    Route::post(
        '/support/conversations/{token}/messages',
        [SupportController::class, 'message']
    )->middleware('throttle:60,1');

    Route::post(
        '/support/conversations/{token}/close',
        [SupportController::class, 'close']
    )->middleware('throttle:20,1');

    // Inbound messenger webhooks (Telegram / Bale / WhatsApp)
    Route::get(
        '/support/webhooks/{secret}/whatsapp',
        [SupportWebhookController::class, 'whatsAppVerify']
    );

    Route::post(
        '/support/webhooks/{secret}/{channel}',
        [SupportWebhookController::class, 'handle']
    )->whereIn('channel', ['telegram', 'bale', 'whatsapp']);

    // Public Store Settings
    Route::get('/store-settings', [StoreSettingController::class, 'index']);

    // Public Header & Footer (متن‌ها و لینک‌های هدر/فوتر)
    Route::get('/header-footer', [HeaderFooterController::class, 'show']);

    Route::get(
        '/store-settings/tax',
        [StoreSettingController::class, 'tax']
    );

    // Public Trust Badges (اینماد و مجوزهای فوتر)
    Route::get('/trust-badges', [TrustBadgeController::class, 'index']);

    // Public Stories (استوری‌های صفحهٔ اول؛ دایره‌های بالای دسته‌بندی‌ها)
    Route::get('/stories', [StoryController::class, 'index']);

    // Public Popups (پاپ‌آپ‌های فعالِ داخل بازهٔ زمانی)
    Route::get('/popups', [PopupController::class, 'index']);

    // Public Coupon Validation
    Route::post('/coupons/check', [CouponController::class, 'check']);

    // Public Banners
    Route::get('/banners', [BannerController::class, 'index']);

    // Public Banner Fonts (فونت‌های سفارشی متن بنرها)
    Route::get('/banner-fonts', [BannerFontController::class, 'index']);

    Route::get(
        '/banner-fonts/{bannerFont}/file',
        [BannerFontController::class, 'file']
    );

    // Public Announcement Bar (نوار اطلاع‌رسانی بالای هدر)
    Route::get('/announcement-bar', [AnnouncementBarController::class, 'index']);

    // Public Articles (مقالات فروشگاه)
    Route::get('/articles', [ArticleController::class, 'index']);
    Route::get('/articles/{slug}', [ArticleController::class, 'show']);

    // Public Pages (صفحات ثابت سایت: درباره ما، تماس با ما، قوانین و ...)
    Route::get('/pages', [PageController::class, 'index']);
    Route::get('/pages/{slug}', [PageController::class, 'show']);

    // Public Shipping Info (روش‌های ارسال و اطلاعات ارسال)
    Route::get('/shipping-info', [ShippingInfoController::class, 'show']);

    // Public Categories
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/categories/{slug}', [CategoryController::class, 'show']);

    // Public Brands
    Route::get('/brands', [BrandController::class, 'index']);
    Route::get('/brands/{slug}', [BrandController::class, 'show']);

    // Public Products
    Route::get('/products', [ProductController::class, 'index']);

    Route::get(
        '/products/featured',
        [ProductController::class, 'featured']
    );

    Route::get(
        '/products/newest',
        [ProductController::class, 'newest']
    );

    // گزینه‌های فیلتر فهرست محصولات (برند/دسته/سایز + بازهٔ قیمت)
    Route::get('/products/filters', [ProductController::class, 'filters']);

    // Public Product Reviews
    Route::get(
        '/products/{slug}/reviews',
        [ProductReviewController::class, 'index']
    );

    // Product Details (keep this after specific product routes)
    Route::get('/products/{slug}', [ProductController::class, 'show']);
});



