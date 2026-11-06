<?php

namespace App\Support;

use App\Models\StoreSetting;

/**
 * ساخت لینک گفتگو در پیام‌رسان‌های بیرونی (تلگرام، واتساپ، بله).
 *
 * ترتیب اولویت هر کانال:
 *   ۱) لینک کامل در .env (مثلاً TELEGRAM_SUPPORT_LINK)
 *   ۲) نام کاربری ربات در .env (TELEGRAM_BOT_USERNAME)
 *   ۳) مقدار ذخیره‌شده در تنظیمات فروشگاه (store_telegram / store_whatsapp)
 *
 * خروجی همیشه لینک کامل https است تا ویجت فروشگاه بدون منطق اضافی از آن
 * استفاده کند؛ اگر هیچ مقداری تنظیم نشده باشد null برمی‌گردد و کانال در
 * ویجت نمایش داده نمی‌شود.
 */
class SupportChannels
{
    public const TELEGRAM_BASE = 'https://t.me/';

    public const BALE_BASE = 'https://ble.ir/';

    /**
     * @param array<string, string> $settings
     * @return list<array{key: string, label: string, description: string, link: string, prefill: bool}>
     */
    public static function links(array $settings = []): array
    {
        $settings = $settings ?: StoreSetting::publicSettings();

        $candidates = [
            'telegram' => [
                'label' => 'تلگرام',
                'description' => 'گفتگوی آنی با پشتیبانی در تلگرام',
                'link' => self::telegramLink($settings),
                'prefill' => false,
            ],
            'whatsapp' => [
                'label' => 'واتساپ',
                'description' => 'ارسال پیام در واتساپ',
                'link' => self::whatsAppLink($settings),
                'prefill' => true,
            ],
            'bale' => [
                'label' => 'بله',
                'description' => 'گفتگو در پیام‌رسان بله',
                'link' => self::baleLink($settings),
                'prefill' => false,
            ],
        ];

        $links = [];

        foreach ($candidates as $key => $candidate) {
            if ($candidate['link'] === null) {
                continue;
            }

            $links[] = [
                'key' => $key,
                'label' => $candidate['label'],
                'description' => $candidate['description'],
                'link' => $candidate['link'],
                'prefill' => $candidate['prefill'],
            ];
        }

        return $links;
    }

    /**
     * @param array<string, string> $settings
     */
    public static function telegramLink(array $settings = []): ?string
    {
        return self::firstLink([
            config('support.links.telegram'),
            self::handleLink(config('support.bot_usernames.telegram'), self::TELEGRAM_BASE),
            $settings['store_telegram'] ?? null,
        ], self::TELEGRAM_BASE);
    }

    /**
     * @param array<string, string> $settings
     */
    public static function baleLink(array $settings = []): ?string
    {
        return self::firstLink([
            config('support.links.bale'),
            self::handleLink(config('support.bot_usernames.bale'), self::BALE_BASE),
            $settings['store_bale'] ?? null,
        ], self::BALE_BASE);
    }

    /**
     * @param array<string, string> $settings
     */
    public static function whatsAppLink(array $settings = []): ?string
    {
        $direct = trim((string) config('support.links.whatsapp'));

        if ($direct !== '') {
            return self::normalizeUrl($direct) ?? $direct;
        }

        $number = self::normalizeWhatsAppNumber(
            (string) (config('support.whatsapp_number') ?: ($settings['store_whatsapp'] ?? ''))
        );

        return $number === null ? null : 'https://wa.me/' . $number;
    }

    /**
     * شمارهٔ واتساپ به شکل بین‌المللی و بدون صفر ابتدایی (989121234567).
     */
    public static function normalizeWhatsAppNumber(string $raw): ?string
    {
        $digits = self::toLatinDigits($raw);
        $digits = preg_replace('/\D+/', '', $digits) ?? '';

        if ($digits === '') {
            return null;
        }

        if (str_starts_with($digits, '00')) {
            $digits = substr($digits, 2);
        }

        if (str_starts_with($digits, '0')) {
            $digits = '98' . substr($digits, 1);
        }

        return strlen($digits) >= 8 ? $digits : null;
    }

    /**
     * ارقام فارسی/عربی را به لاتین تبدیل می‌کند.
     */
    public static function toLatinDigits(string $value): string
    {
        return str_replace(
            ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹', '٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'],
            ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
            $value
        );
    }

    /**
     * @param list<string|null> $values
     */
    private static function firstLink(array $values, string $base): ?string
    {
        foreach ($values as $value) {
            $link = self::normalizeUrl($value, $base);

            if ($link !== null) {
                return $link;
            }
        }

        return null;
    }

    /**
     * مقدار ورودی را به لینک معتبر تبدیل می‌کند؛ برای مقدار خالی null می‌دهد.
     */
    private static function normalizeUrl(?string $value, string $base = self::TELEGRAM_BASE): ?string
    {
        $value = trim((string) $value);

        if ($value === '') {
            return null;
        }

        if (preg_match('~^https?://~i', $value) === 1) {
            return $value;
        }

        return self::handleLink($value, $base);
    }

    private static function handleLink(?string $value, string $base): ?string
    {
        $value = trim((string) $value);

        if ($value === '') {
            return null;
        }

        if (preg_match('~^https?://~i', $value) === 1) {
            return $value;
        }

        // مقدارهایی مثل t.me/username یا ble.ir/username که پروتکل ندارند.
        if (preg_match('~^[a-z0-9.-]+\.[a-z]{2,}/~i', $value) === 1) {
            return 'https://' . $value;
        }

        $handle = ltrim($value, '@/');

        return $handle === '' ? null : $base . $handle;
    }
}
