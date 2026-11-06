<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * نشان اعتماد یا مجوز فروشگاه (اینماد، ساماندهی، نماد صنفی و ...).
 *
 * نشان‌ها در فوتر سایت در نوار «مجوزها و نمادهای اعتماد» نمایش داده می‌شوند و
 * همهٔ فیلدهای نمایشی (تصویر، عنوان، لینک، ترتیب) از پنل مدیران می‌آید؛ هیچ
 * نشان ثابتی در فرانت‌اند تعریف نشده است.
 */
class TrustBadge extends Model
{
    protected $fillable = [
        'title',
        'image',
        'link',
        'open_in_new_tab',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'open_in_new_tab' => 'boolean',
        'sort_order' => 'integer',
        'is_active' => 'boolean',
    ];

    /**
     * نشان‌های قابل نمایش در فروشگاه (فعال، به ترتیب نمایش).
     */
    public function scopeVisible(Builder $query): Builder
    {
        return $query
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('id');
    }
}
