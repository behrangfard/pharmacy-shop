<?php

namespace App\Support;

/**
 * وضعیت‌های مجاز سفارش و برچسب فارسی آن‌ها.
 *
 * ستون orders.status مقدار لاتین را نگه می‌دارد؛ برای متن پیامک و اعلان‌های
 * پنل مدیریت از برچسب فارسی همین کلاس استفاده می‌شود تا در همهٔ بخش‌ها یکسان
 * باشد.
 */
final class OrderStatus
{
    public const PENDING = 'pending';

    public const PROCESSING = 'processing';

    public const SHIPPED = 'shipped';

    public const DELIVERED = 'delivered';

    public const CANCELLED = 'cancelled';

    /** همهٔ وضعیت‌ها به ترتیب چرخهٔ سفارش. */
    public const ALL = [
        self::PENDING,
        self::PROCESSING,
        self::SHIPPED,
        self::DELIVERED,
        self::CANCELLED,
    ];

    /** وضعیت‌هایی که به‌طور پیش‌فرض تغییرشان به مشتری پیامک می‌شود. */
    public const NOTIFIABLE = [
        self::PROCESSING,
        self::SHIPPED,
        self::DELIVERED,
        self::CANCELLED,
    ];

    /** @var array<string, string> */
    public const LABELS = [
        self::PENDING => 'در انتظار پرداخت',
        self::PROCESSING => 'در حال آماده‌سازی',
        self::SHIPPED => 'ارسال‌شده',
        self::DELIVERED => 'تحویل‌شده',
        self::CANCELLED => 'لغوشده',
    ];

    public static function label(?string $status): string
    {
        return self::LABELS[$status ?? ''] ?? 'نامشخص';
    }

    public static function exists(?string $status): bool
    {
        return in_array($status, self::ALL, true);
    }
}
