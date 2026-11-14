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

    /** بیشینهٔ تعداد نکته‌های «اطلاعات ارسال» صفحهٔ روش‌های ارسال. */
    public const SHIPPING_PAGE_NOTES_MAX = 10;

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
         * صفحهٔ «روش‌های ارسال و اطلاعات ارسال» (مسیر سایت: /shipping-info).
         *
         * عنوان، متن معرفی، نکته‌های «اطلاعات ارسال» (JSON آرایه‌ای از متن)
         * و متن تکمیلی با همان قواعد RichTextContent از پنل مدیریت، بخش
         * «ارسال و حمل‌ونقل» قابل ویرایش است. روش‌ها از جدول
         * shipping_methods (تب «روش‌های ارسال») خوانده می‌شوند و
         * «..._show_costs» نمایش هزینه‌ها روی صفحه را روشن/خاموش می‌کند.
         */
        'shipping_page_title' => 'روش‌های ارسال و اطلاعات ارسال',
        'shipping_page_intro' => 'سفارش‌های شما با بسته‌بندی ایمن و محرمانه ارسال می‌شود. در این صفحه روش‌های ارسال، هزینه و زمان تقریبی تحویل را می‌بینید؛ هزینهٔ نهایی هنگام ثبت سفارش و بر اساس مقصد و وزن مرسوله محاسبه می‌شود.',
        'shipping_page_notes' => '["بسته‌بندی همهٔ سفارش‌ها کاملاً محرمانه و بدون نام فروشگاه انجام می‌شود.","سفارش‌ها پس از تأیید پرداخت، در اولین روز کاری بسته‌بندی و تحویل پست یا پیک می‌شوند.","کد رهگیری مرسوله پس از تحویل به پست، در بخش «حساب کاربری ← سفارش‌ها» نمایش داده می‌شود.","اگر مرسوله تحویل نشود، با هماهنگی شما دوباره ارسال می‌شود."]',
        'shipping_page_content' => '',
        'shipping_page_show_costs' => '1',

        /*
         * هدر سایت: متن لوگو، شعار کوتاه کنار لوگو، نمایش کادر جست‌وجو و
         * دکمهٔ اقدام (CTA) سمت چپ هدر. کلیدهای «..._enabled» و
         * «..._new_tab» به‌صورت '1'/'0' ذخیره می‌شوند.
         */
        'header_logo_text' => 'بهرنگ شاپ',
        'header_tagline' => '',
        'header_show_search' => '1',
        'header_cta_enabled' => '0',
        'header_cta_label' => 'تخفیف‌های امروز',
        'header_cta_url' => '/products',
        'header_cta_new_tab' => '0',

        /*
         * فوتر سایت: عنوان و متن ستون «درباره»، کارت تأکید کنار آن، لینک‌های
         * سریع (JSON آرایه‌ای از label/url) و خط کپی‌رایت. هر مقدار خالی
         * یعنی سایت همان متن پیش‌فرض خودش را نشان دهد.
         */
        'footer_about_title' => '',
        'footer_about_text' => 'تلاش ما ارائه تجربه‌ای ساده، سریع و مطمئن برای خرید لباس زیر باکیفیت و راحت است. می‌خواهیم انتخاب محصولات موردنیازتان تجربه‌ای دلنشین و آسان باشد.',
        'footer_highlight_title' => 'خریدی آسان و دلنشین',
        'footer_highlight_text' => 'از انتخاب محصول تا ثبت سفارش، تجربه‌ای ساده و راحت داشته باشید.',
        'footer_copyright' => '',
        'footer_quick_links' => '[{"label":"فروشگاه","url":"/products"},{"label":"ست لباس زیر","url":"/products?category=lingerie-sets"},{"label":"لباس خواب","url":"/products?category=sleepwear"},{"label":"مشاهده محصولات","url":"/products"},{"label":"روش‌های ارسال","url":"/shipping-info"},{"label":"راهنمای انتخاب سایز","url":"/size-guide"},{"label":"مقالات و راهنمای خرید","url":"/articles"}]',

        /*
         * ستون «خدمات مشتریان» فوتر: عنوان ستون، فهرست ردیف‌ها (JSON آرایه‌ای
         * از title/description/icon/action/url) و نمایش یا حذف ردیف‌های
         * خودکار تلفن، ایمیل و نشانی.
         *
         * action یکی از none | url | support است؛ مقدار support یعنی کلیک روی
         * همان ردیف، پنجرهٔ چت پشتیبانی سایت را باز می‌کند و url خالی یعنی
         * ردیف فقط متن راهنماست.
         */
        'footer_services_title' => '',
        'footer_services' => '[{"title":"راهنمای خرید","description":"انتخاب و ثبت سفارش محصولات","icon":"shopping-bag","action":"none","url":""},{"title":"روش‌های ارسال","description":"اطلاعات ارسال سفارش‌ها","icon":"truck","action":"url","url":"/shipping-info"},{"title":"پشتیبانی","description":"همراه شما در مسیر خرید","icon":"headset","action":"support","url":""},{"title":"حساب کاربری و سفارش‌ها","description":"","icon":"package-check","action":"url","url":"/account"}]',
        'footer_show_contact' => '1',


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

    /**
     * محتوای صفحهٔ «روش‌های ارسال و اطلاعات ارسال».
     *
     * هم پنل مدیریت (AdminShippingController) و هم مسیر عمومی سایت
     * (ShippingInfoController) از همین متد می‌خوانند تا پیش‌فرض‌ها، سقف
     * نکته‌ها و پاک‌سازی متن‌ها یکسان بماند. ردیف‌های خالی نکته‌ها حذف
     * می‌شوند.
     *
     * @return array{
     *     title: string,
     *     intro: string,
     *     notes: list<string>,
     *     content: string,
     *     show_costs: bool
     * }
     */
    public static function shippingPage(): array
    {
        $settings = static::publicSettings();

        try {
            $decoded = json_decode(
                (string) ($settings['shipping_page_notes'] ?? '[]'),
                true,
                4,
                JSON_THROW_ON_ERROR
            );
        } catch (\JsonException) {
            $decoded = [];
        }

        $notes = [];

        foreach (is_array($decoded) ? $decoded : [] as $note) {
            $note = trim((string) $note);

            if ($note !== '') {
                $notes[] = $note;
            }

            if (count($notes) >= self::SHIPPING_PAGE_NOTES_MAX) {
                break;
            }
        }

        $title = trim((string) ($settings['shipping_page_title'] ?? ''));

        return [
            'title' => $title !== ''
                ? $title
                : self::DEFAULTS['shipping_page_title'],
            'intro' => trim((string) ($settings['shipping_page_intro'] ?? '')),
            'notes' => $notes,
            'content' => (string) ($settings['shipping_page_content'] ?? ''),
            'show_costs' => filter_var(
                (string) ($settings['shipping_page_show_costs'] ?? '1'),
                FILTER_VALIDATE_BOOLEAN
            ),
        ];
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

