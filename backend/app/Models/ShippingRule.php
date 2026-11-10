<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * قانون تعرفهٔ ارسال.
 *
 * انواع قانون:
 * - fixed: مبلغ ثابت
 * - free_over_amount: ارسال رایگان برای خرید بالاتر از آستانهٔ مبلغ
 * - weight_based: مبلغ ثابت + هزینهٔ هر کیلوگرم وزن
 * - zone_based: مبلغ ثابت برای استان/شهر مشخص
 */
class ShippingRule extends Model
{
    public const TYPE_FIXED = 'fixed';

    public const TYPE_FREE_OVER_AMOUNT = 'free_over_amount';

    public const TYPE_WEIGHT_BASED = 'weight_based';

    public const TYPE_ZONE_BASED = 'zone_based';

    public const TYPES = [
        self::TYPE_FIXED,
        self::TYPE_FREE_OVER_AMOUNT,
        self::TYPE_WEIGHT_BASED,
        self::TYPE_ZONE_BASED,
    ];

    /**
     * برچسب فارسی انواع قانون (برای پنل مدیریت و گزارش‌ها).
     *
     * @return array<string, string>
     */
    public static function labels(): array
    {
        return [
            self::TYPE_FIXED => 'هزینهٔ ثابت',
            self::TYPE_FREE_OVER_AMOUNT => 'ارسال رایگان بالای مبلغ مشخص',
            self::TYPE_WEIGHT_BASED => 'هزینه بر اساس وزن',
            self::TYPE_ZONE_BASED => 'هزینهٔ منطقه‌ای',
        ];
    }

    protected $fillable = [
        'title',
        'type',
        'shipping_method_id',
        'province',
        'city',
        'threshold_amount',
        'amount',
        'cost_per_kg',
        'priority',
        'is_active',
        'note',
    ];

    protected $casts = [
        'threshold_amount' => 'decimal:2',
        'amount' => 'decimal:2',
        'cost_per_kg' => 'decimal:2',
        'priority' => 'integer',
        'is_active' => 'boolean',
    ];

    /**
     * برچسب نوع قانون در پاسخ‌های API (فرانت‌اند پنل از همین استفاده می‌کند).
     *
     * @var list<string>
     */
    protected $appends = ['type_label'];

    public function getTypeLabelAttribute(): string
    {
        return $this->typeLabel();
    }

    public function method(): BelongsTo
    {
        return $this->belongsTo(ShippingMethod::class, 'shipping_method_id');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function typeLabel(): string
    {
        return self::labels()[$this->type] ?? $this->type;
    }
}
