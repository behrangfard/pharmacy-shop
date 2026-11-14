<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * چک پرداختی به تأمین‌کننده یا دریافتی از مشتری.
 */
class Cheque extends Model
{
    use HasFactory;

    public const DIRECTION_RECEIVED = 'received';

    public const DIRECTION_PAID = 'paid';

    public const STATUS_PENDING = 'pending';

    public const STATUS_CLEARED = 'cleared';

    public const STATUS_BOUNCED = 'bounced';

    public const STATUS_CANCELLED = 'cancelled';

    public const STATUSES = [
        self::STATUS_PENDING,
        self::STATUS_CLEARED,
        self::STATUS_BOUNCED,
        self::STATUS_CANCELLED,
    ];

    protected $fillable = [
        'direction',
        'amount',
        'due_date',
        'bank_name',
        'serial',
        'party_name',
        'supplier_id',
        'status',
        'cleared_at',
        'note',
        'created_by',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'due_date' => 'date',
        'cleared_at' => 'datetime',
    ];

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    public function scopeDirection(Builder $query, ?string $direction): Builder
    {
        return $direction === null || $direction === ''
            ? $query
            : $query->where('direction', $direction);
    }
}
