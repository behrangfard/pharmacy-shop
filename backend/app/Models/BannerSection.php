<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * تنظیمات بخش‌های بنر فروشگاه.
 *
 * چهار بخش قابل تنظیم است:
 * - `home_hero`          : اسلایدر بالای صفحهٔ اول (دسکتاپ)
 * - `home_grid`          : ردیف چندستونهٔ وسط صفحهٔ اول (دسکتاپ)
 * - `home_mobile_top`    : بنر بالای صفحهٔ اول در موبایل
 * - `home_mobile_middle` : بنر وسط صفحهٔ اول در موبایل
 *
 * هر بخش تعداد تصاویر، ارتفاع، گردی گوشه، انیمیشن هاور و نحوهٔ جاگیری تصویر
 * خودش را دارد؛ بنرها همچنان در جدول banners و با همان position ذخیره می‌شوند.
 */
class BannerSection extends Model
{
    /** بخش‌های قابل تنظیم. */
    public const POSITIONS = [
        'home_grid',
        'home_hero',
        'home_mobile_top',
        'home_mobile_middle',
    ];

    /** اسلایدر اصلی صفحهٔ اول؛ ابعاد و تعداد تصاویرش هم قابل تنظیم است. */
    public const HERO_POSITION = 'home_hero';

    /** بخش چندستونهٔ وسط صفحهٔ اول (دسکتاپ). */
    public const GRID_POSITION = 'home_grid';

    /** بنر بالای صفحهٔ اول در موبایل. */
    public const MOBILE_TOP_POSITION = 'home_mobile_top';

    /** بنر وسط صفحهٔ اول در موبایل. */
    public const MOBILE_MIDDLE_POSITION = 'home_mobile_middle';

    /** بخش‌هایی که فقط در موبایل رندر می‌شوند. */
    public const MOBILE_POSITIONS = [
        self::MOBILE_TOP_POSITION,
        self::MOBILE_MIDDLE_POSITION,
    ];

    /** بازهٔ مجاز گردی گوشهٔ هر بخش (پیکسل). */
    public const RADIUS_MIN = 0;

    public const RADIUS_MAX = 48;

    /**
     * انیمیشن‌های مجاز هاور برای بخش‌های دسکتاپ (بنر بالا و وسط صفحهٔ اول):
     * - none      : بدون انیمیشن
     * - zoom      : بزرگ‌نمایی ملایم تصویر
     * - lift      : بالا آمدن کادر همراه با سایه
     * - zoom_lift : بزرگ‌نمایی + بالا آمدن
     * - shine     : درخشش نور روی بنر
     */
    public const ANIMATIONS = [
        'none',
        'zoom',
        'lift',
        'zoom_lift',
        'shine',
    ];

    public const DEFAULT_ANIMATION = 'none';

    /**
     * نحوهٔ جاگیری تصویر در کادر بنر:
     * - contain: تصویر کامل دیده می‌شود، برشی ندارد و بزرگ‌تر از اندازهٔ اصلی
     *   خودش کشیده نمی‌شود (کیفیت پایین نمی‌آید).
     * - cover: کادر را پر می‌کند و بخشی از تصویر بریده می‌شود.
     */
    public const FITS = [
        'contain',
        'cover',
    ];

    public const DEFAULT_FIT = 'contain';

    /** چیدمان‌های مجاز بخش چندستونه. */
    public const LAYOUTS = [
        'one',
        'two',
        'three',
        'three_split',
        'four',
    ];

    public const DEFAULT_LAYOUT = 'two';

    /** تعداد بنری که هر چیدمان نمایش می‌دهد. */
    public const SLOTS = [
        'one' => 1,
        'two' => 2,
        'three' => 3,
        'three_split' => 3,
        'four' => 4,
    ];

    protected $fillable = [
        'position',
        'layout',
        'title',
        'subtitle',
        'image_count',
        'height_desktop',
        'height_mobile',
        'fit',
        'radius',
        'animation',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'image_count' => 'integer',
        'height_desktop' => 'integer',
        'height_mobile' => 'integer',
        'radius' => 'integer',
    ];

    /** چیدمان معتبر ذخیره‌شده؛ مقدار ناشناخته به پیش‌فرض برمی‌گردد. */
    public function normalizedLayout(): string
    {
        $layout = is_string($this->layout) ? $this->layout : '';

        return in_array($layout, self::LAYOUTS, true)
            ? $layout
            : self::DEFAULT_LAYOUT;
    }

    /** تعداد بنر قابل نمایش در این بخش (برای چیدمان چندستونه). */
    public function slots(): int
    {
        return self::SLOTS[$this->normalizedLayout()] ?? 1;
    }

    /** سقف تعداد تصویرهای بخش؛ null یعنی محدودیتی نیست. */
    public function imageLimit(): ?int
    {
        $count = (int) ($this->image_count ?? 0);

        return $count > 0 ? $count : null;
    }

    /** حداکثر ارتفاع بنر در یک نما؛ null یعنی ارتفاع طبیعی تصویر. */
    public function heightFor(string $viewport): ?int
    {
        $value = (int) ($viewport === 'mobile'
            ? ($this->height_mobile ?? 0)
            : ($this->height_desktop ?? 0));

        return $value > 0 ? $value : null;
    }

    /** نحوهٔ جاگیری تصویر؛ مقدار ناشناخته به contain (بدون برش/زوم) برمی‌گردد. */
    public function normalizedFit(): string
    {
        $fit = is_string($this->fit) ? $this->fit : '';

        return in_array($fit, self::FITS, true) ? $fit : self::DEFAULT_FIT;
    }

    /** این بخش فقط در موبایل رندر می‌شود؟ */
    public function isMobile(): bool
    {
        return in_array($this->position, self::MOBILE_POSITIONS, true);
    }

    /**
     * انیمیشن هاور بنرهای این بخش.
     * مقدار ثبت‌نشده/ناشناخته یعنی «بدون انیمیشن» (همان رفتار قبلی سایت).
     */
    public function normalizedAnimation(): string
    {
        $animation = is_string($this->animation) ? $this->animation : '';

        return in_array($animation, self::ANIMATIONS, true)
            ? $animation
            : self::DEFAULT_ANIMATION;
    }

    /**
     * گردی گوشهٔ کادر بنرهای این بخش (پیکسل).
     *
     * اگر برای بخش مقداری ثبت نشده باشد (نصب قدیمی/بخش تازه) همان پیش‌فرض
     * سراسری سایت برمی‌گردد؛ مقدار خارج از بازه هم به بازهٔ مجاز محدود می‌شود.
     */
    public function effectiveRadius(): int
    {
        $value = $this->radius;

        if ($value === null) {
            return StoreSetting::bannerRadius();
        }

        return min(max((int) $value, self::RADIUS_MIN), self::RADIUS_MAX);
    }

    /**
     * بخش را برمی‌گرداند و اگر در دیتابیس نبود (نصب قدیمی) با مقادیر پیش‌فرض
     * می‌سازد.
     */
    public static function forPosition(string $position): self
    {
        return self::query()->firstOrCreate(
            ['position' => $position],
            [
                'layout' => in_array($position, [...self::MOBILE_POSITIONS, self::HERO_POSITION], true)
                    ? 'one'
                    : self::DEFAULT_LAYOUT,
                'fit' => self::DEFAULT_FIT,
                'is_active' => true,
            ]
        );
    }

    /**
     * بخش‌ها برای پاسخ عمومی/فروشگاه.
     *
     * آرایه برگردانده می‌شود (نه Collection مدل) تا در کش database/file به
     * __PHP_Incomplete_Class تبدیل نشود؛ همان اشتباهی که یک‌بار باعث ناپدید
     * شدن بنرها بعد از رفرش شد.
     */
    public static function storefrontArray(): array
    {
        return self::query()
            ->whereIn('position', self::POSITIONS)
            ->orderBy('id')
            ->get()
            ->map(fn (self $section): array => [
                'position' => $section->position,
                'layout' => $section->normalizedLayout(),
                'title' => $section->title,
                'subtitle' => $section->subtitle,
                'slots' => $section->slots(),
                // تنظیمات ابعاد و تعداد تصاویر (اسلایدر هیرو و بخش چندستونه).
                'image_count' => (int) ($section->image_count ?? 0),
                'height_desktop' => (int) ($section->height_desktop ?? 0),
                'height_mobile' => (int) ($section->height_mobile ?? 0),
                'fit' => $section->normalizedFit(),
                // گردی گوشهٔ همین بخش (پیش‌فرض سراسری در نبود مقدار).
                'radius' => $section->effectiveRadius(),
                // انیمیشن هاور بنرهای همین بخش (none یعنی بدون انیمیشن).
                'animation' => $section->normalizedAnimation(),
                'is_mobile' => $section->isMobile(),
                'is_active' => (bool) $section->is_active,
            ])
            ->all();
    }

    public function scopeVisible($query)
    {
        return $query->where('is_active', true);
    }
}
