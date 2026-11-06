<?php

use App\Http\Controllers\Api\AdminAnnouncementBarController;
use App\Http\Controllers\Api\AdminArticleController;
use App\Http\Controllers\Api\AdminBannerController;
use App\Http\Controllers\Api\AdminBannerFontController;
use App\Http\Controllers\Api\AdminBrandController;
use App\Http\Controllers\Api\AdminCategoryController;
use App\Http\Controllers\Api\AdminCouponController;
use App\Http\Controllers\Api\AdminCustomerController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AdminMessagingController;
use App\Http\Controllers\Api\AdminOrderController;
use App\Http\Controllers\Api\AdminProductController;
use App\Http\Controllers\Api\AdminProductImageController;
use App\Http\Controllers\Api\AdminProductReviewController;
use App\Http\Controllers\Api\AdminReportController;
use App\Http\Controllers\Api\AdminReturnRequestController;
use App\Http\Controllers\Api\AdminStoreSettingController;
use App\Http\Controllers\Api\AdminSupportController;
use App\Http\Controllers\Api\AdminTrustBadgeController;
use App\Http\Controllers\Api\AdminUserController;
use App\Http\Controllers\Api\AnnouncementBarController;
use App\Http\Controllers\Api\ArticleController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BannerController;
use App\Http\Controllers\Api\BannerFontController;
use App\Http\Controllers\Api\BrandController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\CouponController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ProductReviewController;
use App\Http\Controllers\Api\ReturnRequestController;
use App\Http\Controllers\Api\StoreSettingController;
use App\Http\Controllers\Api\SupportController;
use App\Http\Controllers\Api\SupportWebhookController;
use App\Http\Controllers\Api\TrustBadgeController;
use App\Http\Controllers\Api\WishlistController;
use App\Support\AdminRole;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {

    // Authentication
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login']);

    // Authenticated Routes
    Route::middleware('auth:sanctum')->group(function () {

        // Authentication
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::put('/auth/profile', [AuthController::class, 'update']);
        Route::put('/auth/password', [AuthController::class, 'changePassword']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);

        // Customer Orders
        Route::post('/orders', [OrderController::class, 'store']);
        Route::get('/orders', [OrderController::class, 'index']);
        Route::get('/orders/{orderNumber}', [OrderController::class, 'show']);

        Route::post(
            '/orders/{orderNumber}/cancel',
            [OrderController::class, 'cancel']
        );

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

                    // Shipping Info (اطلاعات ارسال و کد رهگیری)
                    Route::patch(
                        '/orders/{orderNumber}/shipping',
                        [AdminOrderController::class, 'updateShipping']
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

                    Route::delete(
                        '/messaging/{messageId}',
                        [AdminMessagingController::class, 'destroy']
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

            // Store Settings (تنظیمات فروشگاه)
            Route::middleware('admin.permission:'.AdminRole::SETTINGS_MANAGE)
                ->group(function () {
                    Route::get('/settings', [AdminStoreSettingController::class, 'index']);
                    Route::put('/settings', [AdminStoreSettingController::class, 'update']);

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

    Route::get(
        '/store-settings/tax',
        [StoreSettingController::class, 'tax']
    );

    // Public Trust Badges (اینماد و مجوزهای فوتر)
    Route::get('/trust-badges', [TrustBadgeController::class, 'index']);

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



