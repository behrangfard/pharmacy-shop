<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * کانال ارتباطی فروشگاه در پیام‌رسان‌ها و شبکه‌های اجتماعی.
 *
 * هر کانال (تلگرام، واتساپ، بله، ایتا، اینستاگرام) دو لینک مستقل دارد:
 * «عضویت در کانال» و «ارسال پیام به اکانت فروشگاه». فهرست فعال‌ها در بخش
 * «همراه ما باشید» صفحه‌های ثبت‌نام و حساب کاربری نمایش داده می‌شود و همهٔ
 * مقادیر از پنل مدیران (/admin/channels) می‌آید؛ هیچ آدرسی در فرانت‌اند ثابت
 * نیست.
 */
class ContactChannel extends Model
{
    /** کلیدهای مجاز پلتفرم‌ها؛ هم‌نام با App\Support\ContactLinks. */
    public const KEYS = [
        'telegram',
        'whatsapp',
        'bale',
        'eitaa',
        'instagram',
    ];

    protected $fillable = [
        'key',
        'title',
        'description',
        'join_url',
        'join_label',
        'chat_url',
        'chat_label',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'sort_order' => 'integer',
        'is_active' => 'boolean',
    ];

    /**
     * کانال‌های قابل نمایش در فروشگاه (فعال، به ترتیب نمایش).
     */
    public function scopeVisible(Builder $query): Builder
    {
        return $query
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('id');
    }

    /**
     * کانالی که دست‌کم یک لینک قابل استفاده دارد.
     */
    public function hasLinks(): bool
    {
        return filled($this->join_url) || filled($this->chat_url);
    }
}
