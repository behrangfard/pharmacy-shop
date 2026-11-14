<?php

namespace App\Support\Spreadsheet;

/**
 * یکسان‌سازی متن‌هایی که از اکسل/CSV/ورد می‌آید.
 *
 * کاربران فایل‌ها را با اکسل فارسی، اعداد فارسی، فاصله‌های اضافی یا عنوان‌های
 * متفاوت می‌سازند؛ این کلاس همه را به شکل قابل مقایسه تبدیل می‌کند.
 */
class ImportText
{
    /**
     * متن را برای مقایسه یکسان می‌کند: اعداد فارسی/عربی به لاتین، «ك/ي» عربی
     * به فارسی، حذف نیم‌فاصله و کاراکترهای نگارشی و فشرده‌کردن فاصله‌ها.
     */
    public static function fold(?string $value): string
    {
        $value = self::digits((string) $value);
        $value = str_replace(['ك', 'ي', 'ى', 'ة', 'أ', 'إ', 'آ'], ['ک', 'ی', 'ی', 'ه', 'ا', 'ا', 'ا'], $value);
        $value = str_replace(["\u{200c}", "\u{200d}", "\u{200e}", "\u{200f}", "\u{feff}"], '', $value);
        $value = str_replace(['(', ')', '[', ']', '{', '}', '*', ':', '.', '،', ',', '؛', ';', '"', "'", '`', '-', '_', '/', '\\'], ' ', $value);
        $value = preg_replace('/\s+/u', ' ', $value) ?? $value;

        return mb_strtolower(trim($value));
    }

    /**
     * اعداد فارسی و عربی را به اعداد لاتین تبدیل می‌کند.
     */
    public static function digits(string $value): string
    {
        return strtr($value, [
            '۰' => '0', '۱' => '1', '۲' => '2', '۳' => '3', '۴' => '4',
            '۵' => '5', '۶' => '6', '۷' => '7', '۸' => '8', '۹' => '9',
            '٠' => '0', '١' => '1', '٢' => '2', '٣' => '3', '٤' => '4',
            '٥' => '5', '٦' => '6', '٧' => '7', '٨' => '8', '٩' => '9',
            '٫' => '.', '٬' => '', ',' => '', '،' => '',
        ]);
    }

    /**
     * کلید مقایسه برای سرصفحه‌ها و نام‌ها: fold به‌علاوهٔ حذف کامل فاصله‌ها
     * تا «دسته‌بندی» و «دسته بندی» یکی شوند.
     */
    public static function key(?string $value): string
    {
        return str_replace(' ', '', self::fold((string) $value));
    }

    /**
     * متن تمیز برای ذخیره در دیتابیس (فاصله‌های اضافی حذف می‌شود).
     */
    public static function text(mixed $value): string
    {
        $value = str_replace(["\u{200c}", "\u{feff}"], [' ', ''], (string) $value);
        $value = preg_replace('/[ \t]+/u', ' ', $value) ?? $value;

        return trim($value);
    }

    /**
     * عدد را از رشته‌هایی مثل «۱۲۵,۰۰۰ تومان» بیرون می‌کشد.
     */
    public static function number(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        $value = self::digits((string) $value);
        $value = str_replace(['تومان', 'ریال', 'هزار', ' '], '', $value);
        $value = preg_replace('/[^0-9.\-]/u', '', $value) ?? '';

        if ($value === '' || $value === '-' || $value === '.') {
            return null;
        }

        return is_numeric($value) ? (float) $value : null;
    }

    public static function integer(mixed $value): ?int
    {
        $number = self::number($value);

        return $number === null ? null : (int) round($number);
    }

    /**
     * «بله/خیر», «فعال/غیرفعال», 1/0, true/false و ... را به بولین تبدیل می‌کند.
     */
    public static function boolean(mixed $value, bool $default = false): bool
    {
        if ($value === null || $value === '') {
            return $default;
        }

        $folded = self::key((string) $value);

        if ($folded === '') {
            return $default;
        }

        $truthy = array_map(self::key(...), [
            '1', 'true', 'yes', 'y', 'on', 'بله', 'آری', 'اره', 'فعال', 'دارد', 'درست', 'هست', 'بلی',
        ]);

        if (in_array($folded, $truthy, true)) {
            return true;
        }

        $falsy = array_map(self::key(...), [
            '0', 'false', 'no', 'n', 'off', 'خیر', 'نه', 'غیرفعال', 'غیر فعال', 'ندارد', 'غلط', 'نیست',
        ]);

        if (in_array($folded, $falsy, true)) {
            return false;
        }

        return $default;
    }

    /**
     * شمارهٔ موبایل/تلفن را به شکل استاندارد ایران برمی‌گرداند.
     *
     * پشتیبانی از +98، 0098، 98، بدون صفر (912...) و ارقام فارسی.
     * اگر شماره معتبر نباشد null برمی‌گردد.
     */
    public static function phone(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $raw = self::digits((string) $value);
        $raw = preg_replace('/[^0-9+]/', '', $raw) ?? '';

        if ($raw === '') {
            return null;
        }

        $raw = str_replace('+', '', $raw);

        if (str_starts_with($raw, '0098')) {
            $raw = '0'.substr($raw, 4);
        } elseif (str_starts_with($raw, '98') && strlen($raw) === 12) {
            $raw = '0'.substr($raw, 2);
        } elseif (str_starts_with($raw, '9') && strlen($raw) === 10) {
            $raw = '0'.$raw;
        }

        // موبایل: 09xxxxxxxxx
        if (preg_match('/^09\d{9}$/', $raw) === 1) {
            return $raw;
        }

        // تلفن ثابت با کد شهر: 0xxxxxxxxxx
        if (preg_match('/^0\d{10}$/', $raw) === 1) {
            return $raw;
        }

        return null;
    }
}
