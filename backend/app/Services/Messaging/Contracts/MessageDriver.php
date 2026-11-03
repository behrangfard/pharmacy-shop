<?php

namespace App\Services\Messaging\Contracts;

use App\Services\Messaging\MessageResult;

interface MessageDriver
{
    /**
     * شناسهٔ کانال: sms | telegram | whatsapp | bale
     */
    public function channel(): string;

    /**
     * آیا اطلاعات اتصال (توکن/کلید/شماره خط) تنظیم شده است؟
     */
    public function isConfigured(): bool;

    /**
     * آیا این کانال برای ارسال فعال شده است؟
     */
    public function isEnabled(): bool;

    /**
     * استانداردسازی مقدار گیرنده (مثلاً تبدیل ارقام فارسی به لاتین).
     */
    public function normalizeRecipient(string $recipient): string;

    /**
     * ارسال پیام به یک گیرنده. خروجی هرگز Exception پرتاب نمی‌کند.
     */
    public function send(string $recipient, string $body, array $options = []): MessageResult;
}
