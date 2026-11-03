<?php

namespace App\Services\Messaging\Support;

final class PhoneNumber
{
    /**
     * ارقام فارسی/عربی را به ارقام لاتین تبدیل می‌کند.
     */
    public static function toLatinDigits(?string $value): string
    {
        $value = (string) $value;

        $persian = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
        $arabic = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

        $value = str_replace($persian, range(0, 9), $value);

        return str_replace($arabic, range(0, 9), $value);
    }

    /**
     * شمارهٔ موبایل ایران را به شکل استاندارد 09xxxxxxxxx برمی‌گرداند.
     * اگر شماره ایرانی نباشد، فقط ارقام آن بازگردانده می‌شود.
     */
    public static function normalize(?string $value): string
    {
        $digits = preg_replace('/\D+/', '', self::toLatinDigits($value)) ?? '';

        if ($digits === '') {
            return '';
        }

        if (str_starts_with($digits, '0098')) {
            $digits = substr($digits, 4);
        } elseif (str_starts_with($digits, '98') && strlen($digits) === 12) {
            $digits = substr($digits, 2);
        }

        if (str_starts_with($digits, '9') && strlen($digits) === 10) {
            $digits = '0' . $digits;
        }

        return $digits;
    }

    /**
     * فرمت بین‌المللی (بدون +) برای واتساپ: 98912xxxxxxx
     */
    public static function toInternational(?string $value): string
    {
        $digits = self::normalize($value);

        if (str_starts_with($digits, '0') && strlen($digits) === 11) {
            return '98' . substr($digits, 1);
        }

        return $digits;
    }
}
