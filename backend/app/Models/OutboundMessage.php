<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OutboundMessage extends Model
{
    public const CHANNEL_SMS = 'sms';

    public const CHANNEL_TELEGRAM = 'telegram';

    public const CHANNEL_WHATSAPP = 'whatsapp';

    public const CHANNEL_BALE = 'bale';

    public const CHANNELS = [
        self::CHANNEL_SMS,
        self::CHANNEL_TELEGRAM,
        self::CHANNEL_WHATSAPP,
        self::CHANNEL_BALE,
    ];

    public const STATUS_PENDING = 'pending';

    public const STATUS_SENT = 'sent';

    public const STATUS_FAILED = 'failed';

    public const STATUSES = [
        self::STATUS_PENDING,
        self::STATUS_SENT,
        self::STATUS_FAILED,
    ];

    protected $fillable = [
        'channel',
        'recipient',
        'body',
        'status',
        'provider_message_id',
        'error',
        'meta',
        'sent_by',
        'sent_at',
    ];

    protected $casts = [
        'meta' => 'array',
        'sent_at' => 'datetime',
    ];

    /**
     * مدیر ارسال‌کنندهٔ پیام.
     */
    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sent_by');
    }

    public function scopeChannel(Builder $query, ?string $channel): Builder
    {
        return $channel
            ? $query->where('channel', $channel)
            : $query;
    }

    public function scopeStatus(Builder $query, ?string $status): Builder
    {
        return $status
            ? $query->where('status', $status)
            : $query;
    }
}
