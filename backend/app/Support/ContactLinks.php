<?php

namespace App\Support;

/**
 * ساخت لینک‌های کانال‌های ارتباطی فروشگاه (تلگرام، واتساپ، بله، ایتا، اینستاگرام).
 *
 * مدیر فروشگاه در پنل می‌تواند هر مقدار را به یکی از این شکل‌ها وارد کند:
 *   - لینک کامل: https://t.me/behrangshop
 *   - دامنه بدون پروتکل: t.me/behrangshop
 *   - نام کاربری/آیدی: @behrangshop یا behrangshop
 *   - شمارهٔ واتساپ: 09121234567 (فقط برای واتساپ)
 *
 * خروجی همیشه لینک کامل https است تا فرانت‌اند بدون منطق اضافی از آن استفاده
 * کند؛ اگر مقدار قابل تبدیل نباشد null برمی‌گردد و کنترلر ادمین خطای اعتبارسنجی
 * نشان می‌دهد.
 */
class ContactLinks
{
    /** پلتفرم‌های پشتیبانی‌شده (هم‌نام با ContactChannel::KEYS). */
    public const PLATFORMS = [
        'telegram',
        'whatsapp',
        'bale',
        'eitaa',
        'instagram',
    ];

    /** آدرس پروفایل/کانال هر پلتفرم برای مقدارهای «نام کاربری». */
    private const PROFILE_BASES = [
        'telegram' => 'https://t.me/',
        'bale' => 'https://ble.ir/',
        'eitaa' => 'https://eitaa.com/',
        'instagram' => 'https://instagram.com/',
    ];

    /** آدرس ارسال پیام مستقیم اینستاگرام (Direct). */
    private const INSTAGRAM_DM_BASE = 'https://ig.me/m/';

    /** لینک عضویت در کانال/دنبال‌کردن صفحهٔ فروشگاه. */
    public static function joinUrl(?string $value, string $platform): ?string
    {
        return self::normalize($value, $platform, false);
    }

    /** لینک ارسال پیام مستقیم به اکانت فروشگاه. */
    public static function chatUrl(?string $value, string $platform): ?string
    {
        return self::normalize($value, $platform, true);
    }

    public static function isPlatform(string $platform): bool
    {
        return in_array($platform, self::PLATFORMS, true);
    }

    /**
     * تبدیل مقدار ورودی به لینک کامل؛ مقدار خالی یا نامعتبر null می‌دهد.
     */
    private static function normalize(?string $value, string $platform, bool $chat): ?string
    {
        $value = trim((string) $value);

        if ($value === '') {
            return null;
        }

        if (preg_match('~^https?://~i', $value) === 1) {
            return $value;
        }

        if ($platform === 'whatsapp') {
            $number = SupportChannels::normalizeWhatsAppNumber($value);

            return $number === null ? null : 'https://wa.me/' . $number;
        }

        // مقدارهایی مثل t.me/username یا ble.ir/username که پروتکل ندارند.
        if (preg_match('~^[a-z0-9-]+\.[a-z]{2,}/~i', $value) === 1) {
            return 'https://' . $value;
        }

        $handle = ltrim($value, '@/');

        if ($handle === '' || preg_match('~^[A-Za-z0-9._-]+$~', $handle) !== 1) {
            return null;
        }

        if ($platform === 'instagram') {
            return $chat
                ? self::INSTAGRAM_DM_BASE . $handle
                : self::PROFILE_BASES['instagram'] . $handle;
        }

        $base = self::PROFILE_BASES[$platform] ?? null;

        return $base === null ? null : $base . $handle;
    }
}
