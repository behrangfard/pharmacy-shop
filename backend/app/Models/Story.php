<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * استوری صفحهٔ اول فروشگاه (مجموعه‌ای از اسلایدهای تصویری).
 *
 * استوری‌ها در نوار بالای بخش دسته‌بندی‌های صفحهٔ اول به شکل دایره‌های گرد
 * نمایش داده می‌شوند و با کلیک، اسلایدهایشان در نمایشگر تمام‌صفحه مرور می‌شود.
 * همهٔ محتوا (تصویر، عنوان، اسلایدها، ترتیب) از پنل مدیران می‌آید و هیچ استوری
 * ثابتی در فرانت‌اند تعریف نشده است.
 */
class Story extends Model
{
    protected $fillable = [
        'title',
        'cover_image',
        'slides',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'slides' => 'array',
        'sort_order' => 'integer',
        'is_active' => 'boolean',
    ];

    /**
     * استوری‌های قابل نمایش در فروشگاه (فعال، به ترتیب نمایش).
     */
    public function scopeVisible(Builder $query): Builder
    {
        return $query
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('id');
    }
}
