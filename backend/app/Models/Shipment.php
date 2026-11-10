<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * مرسوله: بستهٔ فیزیکی یک سفارش.
 *
 * وضعیت مرسوله از وضعیت سفارش جدا نگه داشته می‌شود؛ یک سفارش می‌تواند
 * چند مرسوله داشته باشد و هر مرسوله چرخهٔ عمر و تاریخچهٔ خودش را دارد.
 */
class Shipment extends Model
{
    public const STATUS_AWAITING_PACKAGING = 'awaiting_packaging';

    public const STATUS_PACKAGING = 'packaging';

    public const STATUS_READY_TO_SHIP = 'ready_to_ship';

    public const STATUS_HANDED_TO_CARRIER = 'handed_to_carrier';

    public const STATUS_IN_TRANSIT = 'in_transit';

    public const STATUS_DELIVERED = 'delivered';

    public const STATUS_DELIVERY_FAILED = 'delivery_failed';

    public const STATUS_RETURNED = 'returned';

    public const STATUSES = [
        self::STATUS_AWAITING_PACKAGING,
        self::STATUS_PACKAGING,
        self::STATUS_READY_TO_SHIP,
        self::STATUS_HANDED_TO_CARRIER,
        self::STATUS_IN_TRANSIT,
        self::STATUS_DELIVERED,
        self::STATUS_DELIVERY_FAILED,
        self::STATUS_RETURNED,
    ];

    /** وضعیت‌هایی که مرسوله هنوز در جریان است. */
    public const OPEN_STATUSES = [
        self::STATUS_AWAITING_PACKAGING,
        self::STATUS_PACKAGING,
        self::STATUS_READY_TO_SHIP,
        self::STATUS_HANDED_TO_CARRIER,
        self::STATUS_IN_TRANSIT,
    ];

    /** وضعیت‌هایی که مرسوله دیگر در جریان نیست. */
    public const CLOSED_STATUSES = [
        self::STATUS_DELIVERED,
        self::STATUS_RETURNED,
    ];

    /**
     * برچسب فارسی وضعیت‌ها و رنگ پیشنهادی برای نشان (badge) پنل.
     *
     * @return array<string, array{label: string, tone: string}>
     */
    public static function statusMeta(): array
    {
        return [
            self::STATUS_AWAITING_PACKAGING => [
                'label' => 'در انتظار بسته‌بندی',
                'tone' => 'gray',
            ],
            self::STATUS_PACKAGING => [
                'label' => 'در حال بسته‌بندی',
                'tone' => 'amber',
            ],
            self::STATUS_READY_TO_SHIP => [
                'label' => 'آماده ارسال',
                'tone' => 'blue',
            ],
            self::STATUS_HANDED_TO_CARRIER => [
                'label' => 'تحویل به شرکت حمل',
                'tone' => 'blue',
            ],
            self::STATUS_IN_TRANSIT => [
                'label' => 'در حال ارسال',
                'tone' => 'blue',
            ],
            self::STATUS_DELIVERED => [
                'label' => 'تحویل مشتری شده',
                'tone' => 'green',
            ],
            self::STATUS_DELIVERY_FAILED => [
                'label' => 'ناموفق در تحویل',
                'tone' => 'red',
            ],
            self::STATUS_RETURNED => [
                'label' => 'مرجوع شده',
                'tone' => 'red',
            ],
        ];
    }

    /**
     * @return array<int, string>
     */
    public static function statusLabels(): array
    {
        return array_map(
            fn (array $meta) => $meta['label'],
            self::statusMeta()
        );
    }

    protected $fillable = [
        'shipment_number',
        'order_id',
        'shipping_method_id',
        'status',
        'carrier',
        'recipient_name',
        'phone',
        'province',
        'city',
        'address',
        'postal_code',
        'tracking_code',
        'cost',
        'weight_grams',
        'volumetric_weight_grams',
        'package_count',
        'notes',
        'delay_reason',
        'return_reason',
        'shipped_at',
        'delivered_at',
        'expected_delivery_at',
        'created_by',
    ];

    protected $casts = [
        'cost' => 'decimal:2',
        'weight_grams' => 'integer',
        'volumetric_weight_grams' => 'integer',
        'package_count' => 'integer',
        'shipped_at' => 'datetime',
        'delivered_at' => 'datetime',
        'expected_delivery_at' => 'datetime',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function method(): BelongsTo
    {
        return $this->belongsTo(ShippingMethod::class, 'shipping_method_id');
    }

    public function events(): HasMany
    {
        return $this->hasMany(ShipmentEvent::class)->orderByDesc('happened_at');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function statusLabel(): string
    {
        return self::statusMeta()[$this->status]['label'] ?? $this->status;
    }

    /**
     * آیا مرسوله از موعد تحویل تخمینی عقب افتاده است؟
     */
    public function isDelayed(): bool
    {
        return $this->expected_delivery_at !== null
            && in_array($this->status, self::OPEN_STATUSES, true)
            && $this->expected_delivery_at->isPast();
    }

    /**
     * وزن مؤثر بسته: بزرگ‌تر از وزن واقعی و وزن حجمی (گرم).
     */
    public function effectiveWeightGrams(): int
    {
        return max(
            (int) ($this->weight_grams ?? 0),
            (int) ($this->volumetric_weight_grams ?? 0)
        );
    }
}
