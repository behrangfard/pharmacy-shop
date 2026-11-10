<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * رویداد تاریخچهٔ مرسوله (تغییر وضعیت، ثبت کد رهگیری، تأخیر و ...).
 */
class ShipmentEvent extends Model
{
    protected $fillable = [
        'shipment_id',
        'status',
        'note',
        'happened_at',
        'created_by',
    ];

    protected $casts = [
        'happened_at' => 'datetime',
    ];

    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function statusLabel(): string
    {
        return Shipment::statusLabels()[$this->status] ?? $this->status;
    }
}
