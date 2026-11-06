<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * یک پیام داخل گفتگوی پشتیبانی.
 */
class SupportMessage extends Model
{
    public const SENDER_USER = 'user';

    public const SENDER_ADMIN = 'admin';

    public const SENDER_SYSTEM = 'system';

    public const SENDERS = [
        self::SENDER_USER,
        self::SENDER_ADMIN,
        self::SENDER_SYSTEM,
    ];

    protected $fillable = [
        'conversation_id',
        'admin_id',
        'sender',
        'body',
        'meta',
    ];

    protected $casts = [
        'meta' => 'array',
    ];

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(SupportConversation::class, 'conversation_id');
    }

    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_id');
    }
}
