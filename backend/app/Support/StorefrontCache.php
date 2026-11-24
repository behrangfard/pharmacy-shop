<?php

namespace App\Support;

use App\Http\Controllers\Api\AnnouncementBarController;
use App\Http\Controllers\Api\BannerController;
use App\Http\Controllers\Api\BannerFontController;
use App\Http\Controllers\Api\BrandController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\ContactChannelController;
use App\Http\Controllers\Api\PopupController;
use App\Http\Controllers\Api\StoryController;
use App\Http\Controllers\Api\TrustBadgeController;
use App\Models\StoreSetting;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * پاک‌سازی کش ویترین فروشگاه.
 *
 * کنترلرهای پنل پس از هر تغییر خودشان کش مربوطه را پاک می‌کنند؛ این کلاس برای
 * حالت‌هایی است که داده **بیرون از کنترلرهای پنل** عوض می‌شود (tinker، سیدر،
 * کامند، سرویس‌های داخلی مثل فاکتور خرید). `StorefrontCacheObserver` روی
 * مدل‌های مرتبط ثبت شده و همین متدها را صدا می‌زند تا حداکثر تا انقضای کش
 * (۵ تا ۱۰ دقیقه) محتوای کهنه به مشتری نشان داده نشود.
 */
class StorefrontCache
{
    /**
     * نسخهٔ کش گزینه‌های فیلتر محصولات.
     *
     * کلید کش فیلترها بر اساس رشتهٔ کوئری ساخته می‌شود و تعداد کلیدها نامحدود
     * است؛ به‌جای پاک‌کردن تک‌تک آن‌ها، نسخه را عوض می‌کنیم تا همهٔ کلیدهای
     * قبلی کنار گذاشته شوند (خودشان با TTL کوتاه ۶۰ ثانیه منقضی می‌شوند).
     */
    public const PRODUCT_FILTERS_VERSION_KEY = 'storefront:products:filters-version';

    /** کش سند فید Google Merchant (`/feed/google-merchant.xml`). */
    public const MERCHANT_FEED_CACHE_KEY = 'storefront:feed:google-merchant';

    public static function productsVersion(): string
    {
        return (string) Cache::get(self::PRODUCT_FILTERS_VERSION_KEY, 'v1');
    }

    public static function bumpProductsVersion(): void
    {
        Cache::forever(self::PRODUCT_FILTERS_VERSION_KEY, Str::uuid()->toString());
    }

    /** دسته‌بندی‌ها (منوی سایت) و facet های فیلتر محصولات. */
    public static function flushCategories(): void
    {
        Cache::forget(CategoryController::STOREFRONT_CACHE_KEY);
        self::bumpProductsVersion();
    }

    /** برندها (با تعداد محصولات) و facet های فیلتر محصولات. */
    public static function flushBrands(): void
    {
        Cache::forget(BrandController::STOREFRONT_CACHE_KEY);
        self::bumpProductsVersion();
    }

    /**
     * تغییر در کاتالوگ محصول/تنوع: هم فیلترها و هم شمارندهٔ محصولات برندها و
     * دسته‌ها ممکن است تغییر کند.
     */
    public static function flushCatalog(): void
    {
        self::bumpProductsVersion();
        Cache::forget(CategoryController::STOREFRONT_CACHE_KEY);
        Cache::forget(BrandController::STOREFRONT_CACHE_KEY);
        Cache::forget(self::MERCHANT_FEED_CACHE_KEY);
    }

    public static function flushBanners(): void
    {
        Cache::forget(BannerController::STOREFRONT_CACHE_KEY);
    }

    public static function flushBannerFonts(): void
    {
        Cache::forget(BannerFontController::STOREFRONT_CACHE_KEY);
    }

    public static function flushAnnouncementBar(): void
    {
        Cache::forget(AnnouncementBarController::STOREFRONT_CACHE_KEY);
    }

    public static function flushPopups(): void
    {
        Cache::forget(PopupController::STOREFRONT_CACHE_KEY);
    }

    public static function flushStories(): void
    {
        Cache::forget(StoryController::STOREFRONT_CACHE_KEY);
    }

    public static function flushTrustBadges(): void
    {
        Cache::forget(TrustBadgeController::STOREFRONT_CACHE_KEY);
    }

    public static function flushContactChannels(): void
    {
        Cache::forget(ContactChannelController::STOREFRONT_CACHE_KEY);
    }

    /**
     * تنظیمات فروشگاه؛ گردی گوشهٔ بنرها هم از تنظیمات می‌آید، بنابراین کش
     * بنرها هم پاک می‌شود.
     */
    public static function flushSettings(): void
    {
        StoreSetting::forgetCache();
        self::flushBanners();
        // هزینهٔ ارسال/نام فروشگاه در فید Merchant هم می‌آید.
        Cache::forget(self::MERCHANT_FEED_CACHE_KEY);
    }
}
