<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * یک آیتم از نوار اطلاع‌رسانی بالای هدر.
 *
 * سه نوع آیتم پشتیبانی می‌شود:
 * - `text`: متن کوتاه (تبلیغ یا اطلاعیه)
 * - `image`: تصویر ثابت یا متحرک (GIF / WebP متحرک)
 * - `video`: ویدیوی کوتاه بی‌صدا که در حلقه پخش می‌شود
 *
 * قاعدهٔ نمایش: آیتم غیرفعال یا خارج از بازهٔ زمانی در سایت دیده نمی‌شود.
 */
class AnnouncementBarItem extends Model
{
    public const TYPE_TEXT = 'text';

    public const TYPE_IMAGE = 'image';

    public const TYPE_VIDEO = 'video';

    public const TYPES = [
        self::TYPE_TEXT,
        self::TYPE_IMAGE,
        self::TYPE_VIDEO,
    ];

    protected $fillable = [
        'type',
        'text',
        'image',
        'link',
        'open_in_new_tab',
        'sort_order',
        'is_active',
        'starts_at',
        'ends_at',
    ];

    protected $casts = [
        'open_in_new_tab' => 'boolean',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
    ];

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
