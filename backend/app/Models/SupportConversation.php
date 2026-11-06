<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * گفتگوی پشتیبانی.
 *
 * هر گفتگو با یک «توکن» عمومی شناخته می‌شود؛ کاربر مهمان با همان توکن
 * (که در مرورگر خودش ذخیره می‌شود) به گفتگو دسترسی دارد و نیازی به
 * ورود به حساب کاربری نیست.
 */
class SupportConversation extends Model
{
    public const STATUS_OPEN = 'open';

    public const STATUS_PENDING = 'pending';

    public const STATUS_CLOSED = 'closed';

    public const STATUSES = [
        self::STATUS_OPEN,
        self::STATUS_PENDING,
        self::STATUS_CLOSED,
    ];

    public const CHANNEL_WEB = 'web';

    public const CHANNEL_TELEGRAM = 'telegram';

    public const CHANNEL_WHATSAPP = 'whatsapp';

    public const CHANNEL_BALE = 'bale';

    public const CHANNELS = [
        self::CHANNEL_WEB,
        self::CHANNEL_TELEGRAM,
        self::CHANNEL_WHATSAPP,
        self::CHANNEL_BALE,
    ];

    protected $fillable = [
        'token',
        'user_id',
        'name',
        'contact',
        'subject',
        'channel',
        'channel_chat_id',
        'status',
        'last_message_excerpt',
        'last_message_at',
        'admin_unread_count',
        'user_unread_count',
        'ip_address',
        'closed_at',
    ];

    protected $casts = [
        'last_message_at' => 'datetime',
        'closed_at' => 'datetime',
        'admin_unread_count' => 'integer',
        'user_unread_count' => 'integer',
    ];

    public function messages(): HasMany
    {
        return $this->hasMany(SupportMessage::class, 'conversation_id')
            ->orderBy('id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * برچسب فارسی کانال گفتگو.
     */
    public static function channelLabel(?string $channel): string
    {
        return match ($channel) {
            self::CHANNEL_WEB => 'چت سایت',
            self::CHANNEL_TELEGRAM => 'تلگرام',
            self::CHANNEL_WHATSAPP => 'واتساپ',
            self::CHANNEL_BALE => 'بله',
            default => 'نامشخص',
        };
    }

    /**
     * برچسب فارسی وضعیت گفتگو.
     */
    public static function statusLabel(?string $status): string
    {
        return match ($status) {
            self::STATUS_OPEN => 'باز',
            self::STATUS_PENDING => 'در انتظار پاسخ',
            self::STATUS_CLOSED => 'بسته‌شده',
            default => 'نامشخص',
        };
    }

    public function isClosed(): bool
    {
        return $this->status === self::STATUS_CLOSED;
    }
}
