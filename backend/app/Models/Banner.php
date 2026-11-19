<?php

namespace App\Models;

use App\Support\BannerText;
use App\Support\Media\ImageDimensions;
use Illuminate\Database\Eloquent\Model;

class Banner extends Model
{
    public const POSITIONS = [
        'home_hero',
        'home_strip',
        'home_grid',
        'home_mobile_top',
        'home_mobile_middle',
        'products_top',
    ];

    /**
     * بنرهای مخصوص موبایل.
     *
     * این دو بخش کاملاً از بنرهای دسکتاپ جدا هستند: تصویر، تعداد، ارتفاع و
     * گردی گوشهٔ خودشان را دارند و فقط زیر ۷۶۸ پیکسل نمایش داده می‌شوند.
     */
    public const MOBILE_POSITIONS = [
        'home_mobile_top',
        'home_mobile_middle',
    ];

    /** بنر مخصوص موبایل است؟ (برای الزام تصویر موبایل هنگام ذخیره) */
    public static function isMobilePosition(?string $position): bool
    {
        return in_array($position, self::MOBILE_POSITIONS, true);
    }

    protected $fillable = [
        'title',
        'subtitle',
        'image',
        'mobile_image',
        'image_alt',
        'text_scrim',
        'text_layers',
        'link',
        'button_label',
        'position',
        'sort_order',
        'is_active',
        'starts_at',
        'ends_at',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'sort_order' => 'integer',
        'text_layers' => 'array',
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'image_width' => 'integer',
        'image_height' => 'integer',
        'mobile_image_width' => 'integer',
        'mobile_image_height' => 'integer',
    ];

    protected static function booted(): void
    {
        /*
         * پیش از ذخیره، ابعاد ذاتی تصویر از روی فایل خوانده می‌شود تا فروشگاه
         * بتواند width/height را روی تگ <img> بگذارد و ارتفاع بنر پیش از
         * بارگذاری رزرو شود (کاهش CLS). اگر فایل پیدا نشود، مقدارها null
         * می‌مانند و هیچ خطایی رخ نمی‌دهد.
         */
        static::saving(function (self $banner): void {
            $banner->syncImageDimensions();
        });
    }

    /**
     * پرکردن عرض/ارتفاع تصویر دسکتاپ و موبایل؛ فقط برای تصویری که تازه عوض
     * شده یا ابعادش خالی است (برای پرهیز از خواندن تکراری فایل در هر ذخیره).
     */
    public function syncImageDimensions(): void
    {
        $pairs = [
            ['image', 'image_width', 'image_height'],
            ['mobile_image', 'mobile_image_width', 'mobile_image_height'],
        ];

        foreach ($pairs as [$pathColumn, $widthColumn, $heightColumn]) {
            $path = $this->getAttribute($pathColumn);
            $needsSync = $this->isDirty($pathColumn)
                || $this->getAttribute($widthColumn) === null
                || $this->getAttribute($heightColumn) === null;

            if (! $needsSync) {
                continue;
            }

            $dimensions = ImageDimensions::forPath(is_string($path) ? $path : null);

            $this->setAttribute($widthColumn, $dimensions['width'] ?? null);
            $this->setAttribute($heightColumn, $dimensions['height'] ?? null);
        }
    }

    /**
     * متن لایه‌ای ثبت شده است؟
     *
     * در این حالت متن ساده title/subtitle/button_label در فروشگاه نمایش داده
     * نمی‌شود و متن‌های مدیریت‌شده (لایه‌ها) جای آن را می‌گیرند.
     */
    public function hasTextLayers(): bool
    {
        return is_array($this->text_layers) && $this->text_layers !== [];
    }

    /**
     * پرده تیره پشت متن. مقدار نامعتبر به none برمی‌گردد.
     */
    public function textScrim(): string
    {
        $scrim = is_string($this->text_scrim) ? $this->text_scrim : '';

        return in_array($scrim, BannerText::SCRIMS, true) ? $scrim : 'none';
    }

    public function scopeVisible($query)
    {
        return $query
            ->where('is_active', true)
            ->where(function ($subQuery) {
                $subQuery
                    ->whereNull('starts_at')
                    ->orWhere('starts_at', '<=', now());
            })
            ->where(function ($subQuery) {
                $subQuery
                    ->whereNull('ends_at')
                    ->orWhere('ends_at', '>=', now());
            });
    }
}
