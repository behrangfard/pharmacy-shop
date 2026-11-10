<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Order extends Model
{
    use HasFactory;

    protected $fillable = [
        'idempotency_key',
        'recipient_name',
        'user_id',
        'order_number',
        'subtotal',
        'shipping_cost',
        'discount',
        'coupon_code',
        'coupon_discount',
        'tax_percent',
        'tax_amount',
        'total',
        'status',
        'payment_status',
        'phone',
        'address',
        'postal_code',
        'shipping_method',
        'tracking_code',
        'shipped_at',
        'delivered_at',
        'notes',
        'sales_channel',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'shipping_cost' => 'decimal:2',
        'discount' => 'decimal:2',
        'coupon_discount' => 'decimal:2',
        'tax_percent' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'total' => 'decimal:2',
        'shipped_at' => 'datetime',
        'delivered_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(ProductReview::class);
    }

    public function returnRequest(): HasOne
    {
        return $this->hasOne(ReturnRequest::class);
    }

    /**
     * مرسوله‌های این سفارش (یک سفارش می‌تواند چند بسته داشته باشد).
     */
    public function shipments(): HasMany
    {
        return $this->hasMany(Shipment::class);
    }
}