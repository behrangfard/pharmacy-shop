<?php

namespace App\Support;

/**
 * نقش‌ها و مجوزهای مدیران فروشگاه.
 *
 * هر نقش مجموعه‌ای از مجوزهای «صفحه‌محور» دارد؛ میدلویر admin.permission
 * مسیرهای API را بر اساس همین مجوزها محدود می‌کند و پنل مدیریت هم منو و
 * صفحه‌ها را با همین کلیدها نشان می‌دهد.
 *
 * نقش خالی (admin_role = null) برای مدیرانی که پیش از افزودن این قابلیت
 * ساخته شده‌اند، «مدیر ارشد» در نظر گرفته می‌شود تا دسترسی آن‌ها تغییر نکند.
 */
class AdminRole
{
    public const SUPER_ADMIN = 'super_admin';

    public const PRODUCT_MANAGER = 'product_manager';

    public const ORDER_MANAGER = 'order_manager';

    public const SUPPORT = 'support';

    public const DASHBOARD_VIEW = 'dashboard.view';

    public const PRODUCTS_MANAGE = 'products.manage';

    public const CATEGORIES_MANAGE = 'categories.manage';

    public const BRANDS_MANAGE = 'brands.manage';

    public const BANNERS_MANAGE = 'banners.manage';

    public const ARTICLES_MANAGE = 'articles.manage';

    public const REVIEWS_MANAGE = 'reviews.manage';

    public const ORDERS_MANAGE = 'orders.manage';

    public const RETURNS_MANAGE = 'returns.manage';

    public const COUPONS_MANAGE = 'coupons.manage';

    public const CUSTOMERS_MANAGE = 'customers.manage';

    public const MESSAGING_MANAGE = 'messaging.manage';

    public const REPORTS_VIEW = 'reports.view';

    public const SETTINGS_MANAGE = 'settings.manage';

    public const ADMINS_MANAGE = 'admins.manage';

    /**
     * برچسب فارسی نقش‌ها برای نمایش در پنل.
     *
     * @return array<string, string>
     */
    public static function labels(): array
    {
        return [
            self::SUPER_ADMIN => 'مدیر ارشد',
            self::PRODUCT_MANAGER => 'مدیر محصولات',
            self::ORDER_MANAGER => 'مدیر سفارش‌ها',
            self::SUPPORT => 'پشتیبانی',
        ];
    }

    /**
     * توضیح کوتاه دسترسی هر نقش (برای انتخاب نقش در پنل).
     *
     * @return array<string, string>
     */
    public static function descriptions(): array
    {
        return [
            self::SUPER_ADMIN => 'دسترسی کامل به همه بخش‌های پنل، از جمله مدیران و تنظیمات',
            self::PRODUCT_MANAGER => 'محصولات، دسته‌بندی‌ها، برندها، بنرها، مقالات و نظرات',
            self::ORDER_MANAGER => 'سفارش‌ها، مرجوعی‌ها، کدهای تخفیف، مشتریان و گزارش فروش',
            self::SUPPORT => 'سفارش‌ها، مرجوعی‌ها، مشتریان و پیام‌رسانی',
        ];
    }

    /**
     * همه مجوزهای شناخته‌شده.
     *
     * @return list<string>
     */
    public static function permissions(): array
    {
        return [
            self::DASHBOARD_VIEW,
            self::PRODUCTS_MANAGE,
            self::CATEGORIES_MANAGE,
            self::BRANDS_MANAGE,
            self::BANNERS_MANAGE,
            self::ARTICLES_MANAGE,
            self::REVIEWS_MANAGE,
            self::ORDERS_MANAGE,
            self::RETURNS_MANAGE,
            self::COUPONS_MANAGE,
            self::CUSTOMERS_MANAGE,
            self::MESSAGING_MANAGE,
            self::REPORTS_VIEW,
            self::SETTINGS_MANAGE,
            self::ADMINS_MANAGE,
        ];
    }

    /**
     * نقش‌های قابل انتخاب.
     *
     * @return list<string>
     */
    public static function roles(): array
    {
        return array_keys(self::labels());
    }

    /**
     * مجوزهای هر نقش.
     *
     * @return array<string, list<string>>
     */
    public static function matrix(): array
    {
        return [
            self::SUPER_ADMIN => self::permissions(),

            self::PRODUCT_MANAGER => [
                self::DASHBOARD_VIEW,
                self::PRODUCTS_MANAGE,
                self::CATEGORIES_MANAGE,
                self::BRANDS_MANAGE,
                self::BANNERS_MANAGE,
                self::ARTICLES_MANAGE,
                self::REVIEWS_MANAGE,
            ],

            self::ORDER_MANAGER => [
                self::DASHBOARD_VIEW,
                self::ORDERS_MANAGE,
                self::RETURNS_MANAGE,
                self::COUPONS_MANAGE,
                self::CUSTOMERS_MANAGE,
                self::REPORTS_VIEW,
            ],

            self::SUPPORT => [
                self::DASHBOARD_VIEW,
                self::ORDERS_MANAGE,
                self::RETURNS_MANAGE,
                self::CUSTOMERS_MANAGE,
                self::MESSAGING_MANAGE,
            ],
        ];
    }

    public static function isValid(?string $role): bool
    {
        return is_string($role) && array_key_exists($role, self::labels());
    }

    public static function label(?string $role): ?string
    {
        return self::isValid($role) ? self::labels()[$role] : null;
    }

    /**
     * مجوزهای یک نقش؛ نقش ناشناخته هیچ مجوزی ندارد.
     *
     * @return list<string>
     */
    public static function permissionsFor(?string $role): array
    {
        if (! self::isValid($role)) {
            return [];
        }

        return self::matrix()[$role] ?? [];
    }

    public static function has(?string $role, string $permission): bool
    {
        return in_array($permission, self::permissionsFor($role), true);
    }
}
