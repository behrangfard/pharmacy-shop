<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * یک رکورد «تبریک تولد» برای هر مشتری در هر سال شمسی.
 * وجود این رکورد مانع ارسال تکراری در همان سال می‌شود.
 */
class BirthdayGreeting extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_SENT = 'sent';

    public const STATUS_FAILED = 'failed';

    protected $fillable = [
        'user_id',
        'jalali_year',
        'jalali_date',
        'channel',
        'recipient',
        'body',
        'status',
        'provider_message_id',
        'error',
        'outbound_message_id',
        'sent_at',
    ];

    protected $casts = [
        'jalali_year' => 'integer',
        'sent_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function outboundMessage(): BelongsTo
    {
        return $this->belongsTo(OutboundMessage::class);
    }
}
