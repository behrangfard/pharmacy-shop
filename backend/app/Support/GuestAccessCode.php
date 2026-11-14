<?php

namespace App\Support;

/**
 * کد پیگیری مهمان.
 *
 * سفارش مهمان به شناسهٔ مرورگر (UUID در localStorage) گره خورده است؛ با پاک
 * شدن مرورگر، مشتری دسترسی به فاکتور و لغو سفارش را از دست می‌دهد. این کد
 * کوتاه و خوانا به‌جای آن ذخیره می‌شود: مشتری با «شماره سفارش + کد پیگیری»
 * هویت قبلی خودش را بازیابی می‌کند.
 *
 * حروف گیج‌کننده (`I`, `O`, `0`, `1`) حذف شده‌اند تا کد روی کاغذ/پیامک
 * اشتباه خوانده نشود. مقایسه همیشه با `hash_equals` انجام می‌شود.
 */
final class GuestAccessCode
{
    /** حروف بزرگ و ارقام بدون کاراکترهای مبهم. */
    public const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    public const LENGTH = 8;

    /** نمونهٔ ۸ کاراکتری؛ ~۴۰ بیت آنتروپی. */
    public static function generate(): string
    {
        $code = '';
        $max = strlen(self::ALPHABET) - 1;

        for ($index = 0; $index < self::LENGTH; $index++) {
            $code .= self::ALPHABET[random_int(0, $max)];
        }

        return $code;
    }

    /**
     * حذف خط تیره/فاصله، تبدیل ارقام فارسی/عربی و حروف کوچک.
     */
    public static function normalize(?string $code): string
    {
        $normalized = strtr((string) $code, [
            '۰' => '0', '۱' => '1', '۲' => '2', '۳' => '3', '۴' => '4',
            '۵' => '5', '۶' => '6', '۷' => '7', '۸' => '8', '۹' => '9',
            '٠' => '0', '١' => '1', '٢' => '2', '٣' => '3', '٤' => '4',
            '٥' => '5', '٦' => '6', '٧' => '7', '٨' => '8', '٩' => '9',
        ]);

        return strtoupper((string) preg_replace('/[^A-Za-z0-9]/', '', $normalized));
    }

    public static function isValid(?string $code): bool
    {
        return preg_match('/^[A-Z0-9]{'.self::LENGTH.'}$/', self::normalize($code)) === 1;
    }

    /**
     * آیا کد واردشده با کد ذخیره‌شدهٔ سفارش یکی است؟
     */
    public static function matches(?string $stored, ?string $provided): bool
    {
        if ($stored === null || $stored === '' || $provided === null || $provided === '') {
            return false;
        }

        return hash_equals(strtoupper($stored), self::normalize($provided));
    }
}
