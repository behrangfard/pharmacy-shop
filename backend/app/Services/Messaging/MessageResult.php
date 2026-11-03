<?php

namespace App\Services\Messaging;

/**
 * نتیجهٔ ارسال یک پیام از طریق یک کانال (پیامک/تلگرام/واتساپ/بله).
 */
final class MessageResult
{
    public function __construct(
        public readonly bool $success,
        public readonly ?string $providerMessageId = null,
        public readonly ?string $error = null,
        public readonly array $payload = [],
    ) {
    }

    public static function success(?string $providerMessageId = null, array $payload = []): self
    {
        return new self(true, $providerMessageId, null, $payload);
    }

    public static function failure(string $error, array $payload = []): self
    {
        return new self(false, null, $error, $payload);
    }
}
