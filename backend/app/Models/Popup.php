<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * پاپ‌آپ تبلیغاتی فروشگاه.
 *
 * پاپ‌آپ‌ها به‌صورت مودال/شیت در صفحه‌های هدف نمایش داده می‌شوند؛ محتوا، ظاهر،
 * هدف‌گیری و قواعد تکرار همه در همین رکورد ذخیره می‌شود. فهرست عمومی فقط
 * پاپ‌آپ‌های فعالِ داخل بازهٔ زمانی را برمی‌گرداند و تصمیم نهایی «برای این
 * بازدیدکننده نمایش داده شود یا نه» سمت مرورگر با قاعدهٔ frequency گرفته می‌شود.
 *
 * @property array<array-key, mixed>|null $display_pages
 */
class Popup extends Model
{
    /** صفحه‌های مجاز برای هدف‌گیری. */
    public const DISPLAY_PAGES = ['home', 'products', 'product', 'cart', 'checkout'];

    /** مقادیر مجاز ستون theme. */
    public const THEMES = ['light', 'dark', 'brand'];

    /** مقادیر مجاز ستون layout. */
    public const LAYOUTS = ['center', 'bottom', 'corner'];

    /** مقادیر مجاز ستون image_position. */
    public const IMAGE_POSITIONS = ['top', 'side'];

    /** مقادیر مجاز ستون devices. */
    public const DEVICES = ['all', 'desktop', 'mobile'];

    /** مقادیر مجاز ستون frequency. */
    public const FREQUENCIES = ['always', 'session', 'daily', 'weekly', 'once'];

    protected $fillable = [
        'title',
        'badge',
        'description',
        'image',
        'image_alt',
        'theme',
        'layout',
        'image_position',
        'cta_text',
        'cta_link',
        'secondary_text',
        'secondary_link',
        'coupon_code',
        'display_pages',
        'devices',
        'delay_seconds',
        'auto_close_seconds',
        'frequency',
        'starts_at',
        'ends_at',
        'countdown_to',
        'close_on_backdrop',
        'show_close',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'display_pages' => 'array',
        'delay_seconds' => 'integer',
        'auto_close_seconds' => 'integer',
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'countdown_to' => 'datetime',
        'close_on_backdrop' => 'boolean',
        'show_close' => 'boolean',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    /**
     * پاپ‌آپ‌های قابل نمایش (فعال) به ترتیب اولویت؛ فیلتر بازهٔ زمانی سمت
     * کنترلر انجام می‌شود تا در کش هم قابل اعمال باشد.
     */
    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('sort_order')->orderBy('id');
    }
}
