<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class StoreSetting extends Model
{
    /**
     * کلید کش تنظیمات عمومی فروشگاه (در اختیار فرانت‌اند).
     */
    public const CACHE_KEY = 'storefront:store-settings';

    /** کلید تنظیم گردی گوشهٔ بنرها. */
    public const BANNER_RADIUS_KEY = 'banner_radius';

    /** محدودهٔ مجاز گردی گوشهٔ بنرها (پیکسل). */
    public const BANNER_RADIUS_MIN = 0;
    public const BANNER_RADIUS_MAX = 48;

    /**
     * مقادیر پیش‌فرض تنظیمات فروشگاه.
     * پنل مدیران فقط همین کلیدها را می‌تواند ویرایش کند.
     */
    public const DEFAULTS = [
        'store_name' => 'بهرنگ شاپ',
        'store_slogan' => 'فروشگاه آنلاین لباس زیر با تمرکز بر کیفیت و راحتی',
        'store_phone' => '021-00000000',
        'store_mobile' => '09120000000',
        'store_email' => 'info@behrangshop.ir',
        'store_address' => 'تهران',
        'store_working_hours' => 'شنبه تا پنجشنبه، ۱۰ تا ۲۰',
        'store_instagram' => '',
        'store_telegram' => '',
        'store_whatsapp' => '',
        'vat_enabled' => '0',
        'vat_percent' => '10',
        'shipping_cost' => '0',
        'free_shipping_enabled' => '0',
        'free_shipping_threshold' => '0',
        'shipping_note' => 'ارسال سفارش‌ها ۱ تا ۳ روز کاری پس از تأیید پرداخت انجام می‌شود.',
        'return_policy_days' => '7',
        'support_note' => 'همراه شما در مسیر خرید',

        /*
         * ظاهر بنرهای فروشگاه: گردی گوشهٔ همهٔ بنرها (اسلایدر هیرو، بخش
         * چندستونه و نوار بنرهای کوتاه) به پیکسل. صفر یعنی گوشهٔ تیز و بدون
         * گردی. رنگ پس‌زمینه‌ای هم پشت بنرها وجود ندارد؛ کادر بنر شفاف است.
         */
        'banner_radius' => '16',

        /*
         * نوار اطلاع‌رسانی بالای هدر (تبلیغات و تخفیف‌های روزانه).
         * ارتفاع‌ها به پیکسل، رنگ‌ها به شکل #rrggbb و «فاصله» به ثانیه است.
         * مقدار «انیمیشن» یکی از fade | slide | none است.
         */
        'announcement_bar_enabled' => '0',
        'announcement_bar_height' => '44',
        'announcement_bar_mobile_height' => '40',
        'announcement_bar_bg_color' => '#385e3e',
        'announcement_bar_text_color' => '#f7f8f2',
        'announcement_bar_font_size' => '13',
        'announcement_bar_interval' => '6',
        'announcement_bar_animation' => 'fade',
    ];

    protected $fillable = [
        'key',
        'value',
    ];

    public static function getValue(
        string $key,
        mixed $default = null
    ): mixed {
        $setting = static::query()
            ->where('key', $key)
            ->value('value');

        if ($setting !== null) {
            return $setting;
        }

        return $default ?? (self::DEFAULTS[$key] ?? null);
    }

    /**
     * گردی گوشهٔ همهٔ بنرهای فروشگاه (پیکسل).
     * مقدار ذخیره‌شده خارج از محدودهٔ مجاز، به نزدیک‌ترین حد اصلاح می‌شود.
     */
    public static function bannerRadius(): int
    {
        $value = (int) static::getValue(
            self::BANNER_RADIUS_KEY,
            self::DEFAULTS[self::BANNER_RADIUS_KEY]
        );

        return min(max($value, self::BANNER_RADIUS_MIN), self::BANNER_RADIUS_MAX);
    }

    public static function setValue(
        string $key,
        string|int|float|bool|null $value
    ): self {
        return static::query()->updateOrCreate(
            ['key' => $key],
            ['value' => $value === null ? null : (string) $value],
        );
    }

    /**
     * همه تنظیمات، با اعمال مقادیر پیش‌فرض برای کلیدهای ذخیره‌نشده.
     *
     * @return array<string, string>
     */
    public static function allSettings(): array
    {
        $stored = static::query()
            ->pluck('value', 'key')
            ->all();

        return array_merge(
            self::DEFAULTS,
            array_intersect_key($stored, self::DEFAULTS)
        );
    }

    /**
     * تنظیمات عمومی مورد استفاده فروشگاه (با کش ۱۰ دقیقه‌ای).
     *
     * @return array<string, string>
     */
    public static function publicSettings(): array
    {
        return Cache::remember(
            self::CACHE_KEY,
            now()->addMinutes(10),
            fn (): array => static::allSettings()
        );
    }

    public static function forgetCache(): void
    {
        Cache::forget(self::CACHE_KEY);
    }
}

