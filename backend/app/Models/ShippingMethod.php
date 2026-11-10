<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * روش ارسال (پست پیشتاز، تیپاکس، پیک موتوری، تحویل حضوری و ...).
 *
 * روش‌ها پویا هستند؛ مدیر فروشگاه می‌تواند روش جدید بسازد یا روشی را
 * غیرفعال کند. هزینهٔ نهایی از ترکیب «هزینهٔ پایه + هزینهٔ هر کیلوگرم»
 * و قوانین تعرفه (shipping_rules) و منطقهٔ مقصد (shipping_zones) به‌دست
 * می‌آید — منطق محاسبه در App\Services\Shipping\ShippingService است.
 */
class ShippingMethod extends Model
{
    /** همهٔ مناطق تحت پوشش */
    public const COVERAGE_ALL = 'all';

    /** فقط مناطق انتخاب‌شده در zone_ids */
    public const COVERAGE_ZONES = 'zones';

    protected $fillable = [
        'name',
        'code',
        'carrier',
        'description',
        'base_cost',
        'cost_per_kg',
        'min_weight_grams',
        'max_weight_grams',
        'min_days',
        'max_days',
        'free_over_amount',
        'is_express',
        'is_active',
        'sort_order',
        'zone_ids',
    ];

    protected $casts = [
        'base_cost' => 'decimal:2',
        'cost_per_kg' => 'decimal:2',
        'free_over_amount' => 'decimal:2',
        'min_weight_grams' => 'integer',
        'max_weight_grams' => 'integer',
        'min_days' => 'integer',
        'max_days' => 'integer',
        'is_express' => 'boolean',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
        'zone_ids' => 'array',
    ];

    public function shipments(): HasMany
    {
        return $this->hasMany(Shipment::class);
    }

    public function rules(): HasMany
    {
        return $this->hasMany(ShippingRule::class);
    }

    /**
     * محدودهٔ پوشش: خالی بودن zone_ids یعنی همهٔ مناطق.
     */
    public function coverage(): string
    {
        return empty($this->zone_ids) ? self::COVERAGE_ALL : self::COVERAGE_ZONES;
    }

    public function deliveryEstimate(): ?string
    {
        if ($this->min_days === null && $this->max_days === null) {
            return null;
        }

        $min = $this->min_days ?? 0;
        $max = $this->max_days ?? $min;

        if ($max <= 0) {
            return 'همان روز';
        }

        return $min === $max ? "{$min} روز کاری" : "{$min} تا {$max} روز کاری";
    }
}
