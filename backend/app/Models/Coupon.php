<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Coupon extends Model
{
    public const TYPE_PERCENT = 'percent';
    public const TYPE_FIXED = 'fixed';

    protected $fillable = [
        'code',
        'title',
        'type',
        'value',
        'min_order_total',
        'max_discount',
        'usage_limit',
        'used_count',
        'starts_at',
        'expires_at',
        'is_active',
    ];

    protected $casts = [
        'value' => 'decimal:2',
        'min_order_total' => 'decimal:2',
        'max_discount' => 'decimal:2',
        'usage_limit' => 'integer',
        'used_count' => 'integer',
        'starts_at' => 'datetime',
        'expires_at' => 'datetime',
        'is_active' => 'boolean',
    ];

    public static function normalizeCode(string $code): string
    {
        return strtoupper(trim($code));
    }

    /**
     * کد تخفیف فعال و در بازه زمانی را پیدا می‌کند.
     */
    public static function findUsable(?string $code): ?self
    {
        if ($code === null || trim($code) === '') {
            return null;
        }

        return static::query()
            ->where('code', self::normalizeCode($code))
            ->where('is_active', true)
            ->where(function ($query) {
                $query
                    ->whereNull('starts_at')
                    ->orWhere('starts_at', '<=', now());
            })
            ->where(function ($query) {
                $query
                    ->whereNull('expires_at')
                    ->orWhere('expires_at', '>=', now());
            })
            ->first();
    }

    /**
     * دلیل نامعتبر بودن کد برای مبلغ سبد خرید (یا null اگر معتبر باشد).
     */
    public function validationError(float $subtotal): ?string
    {
        if ($this->usage_limit !== null && $this->used_count >= $this->usage_limit) {
            return 'ظرفیت استفاده از این کد تخفیف به پایان رسیده است.';
        }

        if ((float) $this->min_order_total > 0 && $subtotal < (float) $this->min_order_total) {
            $minimum = number_format((float) $this->min_order_total);

            return "این کد تخفیف برای سبد خرید بالای {$minimum} تومان قابل استفاده است.";
        }

        return null;
    }

    /**
     * مبلغ تخفیف این کد برای مبلغ سبد خرید.
     */
    public function calculateDiscount(float $subtotal): float
    {
        if ($subtotal <= 0) {
            return 0.0;
        }

        $discount = $this->type === self::TYPE_FIXED
            ? (float) $this->value
            : $subtotal * (float) $this->value / 100;

        if ($this->max_discount !== null) {
            $discount = min($discount, (float) $this->max_discount);
        }

        return round(min(max($discount, 0), $subtotal), 2);
    }
}
