<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * فاکتور خرید (ورود کالا از تأمین‌کننده).
 */
class PurchaseInvoice extends Model
{
    use HasFactory;

    public const STATUS_UNPAID = 'unpaid';

    public const STATUS_PARTIAL = 'partial';

    public const STATUS_PAID = 'paid';

    protected $fillable = [
        'invoice_number',
        'supplier_id',
        'issued_at',
        'items_total',
        'discount',
        'shipping_cost',
        'tax_amount',
        'total',
        'paid_amount',
        'payment_status',
        'note',
        'created_by',
    ];

    protected $casts = [
        'issued_at' => 'date',
        'items_total' => 'decimal:2',
        'discount' => 'decimal:2',
        'shipping_cost' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'total' => 'decimal:2',
        'paid_amount' => 'decimal:2',
    ];

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(PurchaseInvoiceItem::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** ماندهٔ بدهی این فاکتور. */
    public function getRemainingAttribute(): float
    {
        return round(max((float) $this->total - (float) $this->paid_amount, 0), 2);
    }
}
