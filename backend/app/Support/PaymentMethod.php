<?php

namespace App\Support;

/**
 * روش‌های مجاز پرداخت سفارش.
 *
 * ستون orders.payment_method مقدار لاتین را نگه می‌دارد و برچسب فارسی
 * همین کلاس در پاسخ‌ها و مستندات استفاده می‌شود.
 *
 * «online» شامل پرداخت آزمایشی فعلی و درگاه واقعی آینده است؛ «cod»
 * یعنی پرداخت در محل که وجه هنگام تحویل دریافت می‌شود.
 */
final class PaymentMethod
{
    public const ONLINE = 'online';

    public const COD = 'cod';

    /** همهٔ روش‌ها به ترتیب نمایش. */
    public const ALL = [
        self::ONLINE,
        self::COD,
    ];

    /** @var array<string, string> */
    public const LABELS = [
        self::ONLINE => 'پرداخت آنلاین',
        self::COD => 'پرداخت در محل',
    ];

    public static function label(?string $method): string
    {
        return self::LABELS[$method ?? ''] ?? 'نامشخص';
    }

    public static function exists(?string $method): bool
    {
        return in_array($method, self::ALL, true);
    }
}
