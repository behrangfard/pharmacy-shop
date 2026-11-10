<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * آدرس ذخیره‌شدهٔ مشتری در دفترچهٔ آدرس.
 */
class Address extends Model
{
    protected $fillable = [
        'user_id',
        'title',
        'recipient_name',
        'phone',
        'province',
        'city',
        'address',
        'postal_code',
        'latitude',
        'longitude',
        'is_default',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * آدرسی که برای نمایش در فرم تسویه حساب استفاده می‌شود؛ استان و شهر در
     * ابتدای آدرس تکرار می‌شوند تا با ساختار آدرس سفارش‌های قبلی یکسان باشد.
     */
    public function fullAddress(): string
    {
        return collect([$this->province, $this->city, $this->address])
            ->map(fn ($part) => trim((string) $part))
            ->filter()
            ->implode('، ');
    }

    protected function casts(): array
    {
        return [
            'latitude' => 'float',
            'longitude' => 'float',
            'is_default' => 'boolean',
        ];
    }
}
