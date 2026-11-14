<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * یک اعلان در زنگولهٔ پنل مدیریت.
 *
 * برخلاف سیستم Notification لاراول، این جدول عمداً ساده است: اعلان‌ها
 * «عمومیِ پنل» هستند و اولین مدیری که آن‌ها را ببیند خوانده‌شده علامت می‌زند.
 */
class AdminNotification extends Model
{
    public const TYPE_ORDER = 'order';

    public const TYPE_ORDER_STATUS = 'order_status';

    public const TYPE_SUPPORT = 'support';

    public const TYPE_RETURN = 'return';

    public const TYPES = [
        self::TYPE_ORDER,
        self::TYPE_ORDER_STATUS,
        self::TYPE_SUPPORT,
        self::TYPE_RETURN,
    ];

    protected $fillable = [
        'type',
        'title',
        'body',
        'url',
        'meta',
        'read_at',
    ];

    protected $casts = [
        'meta' => 'array',
        'read_at' => 'datetime',
    ];

    public function scopeUnread(Builder $query): Builder
    {
        return $query->whereNull('read_at');
    }

    public function isRead(): bool
    {
        return $this->read_at !== null;
    }

    /**
     * خوانده‌شده علامت زدن اعلان (تکرارپذیر و بدون تغییر زمان اولیه).
     */
    public function markAsRead(): self
    {
        if ($this->read_at === null) {
            $this->forceFill(['read_at' => now()])->save();
        }

        return $this;
    }
}
