<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * مخاطب پیام‌رسانی (شماره‌ای که برای ارسال پیامک/پیام ذخیره شده است).
 *
 * شماره‌ها همیشه به شکل استاندارد ایران (09xxxxxxxxx) ذخیره می‌شوند و برای
 * هر شماره فقط یک ردیف وجود دارد؛ ورود دوبارهٔ همان فایل ردیف تکراری نمی‌سازد.
 */
class MessagingContact extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'phone',
        'group_name',
        'note',
        'source',
        'is_active',
        'created_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeGroup(Builder $query, ?string $group): Builder
    {
        $group = trim((string) $group);

        return $group === ''
            ? $query
            : $query->where('group_name', $group);
    }
}
