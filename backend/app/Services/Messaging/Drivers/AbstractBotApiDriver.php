<?php

namespace App\Services\Messaging\Drivers;

use App\Services\Messaging\Contracts\MessageDriver;
use App\Services\Messaging\MessageResult;
use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * پایهٔ درایورهای سازگار با Bot API تلگرام (تلگرام و پیام‌رسان بله).
 */
abstract class AbstractBotApiDriver implements MessageDriver
{
    /**
     * کلید کانال در config/messaging.php (telegram | bale)
     */
    abstract protected function configKey(): string;

    abstract protected function defaultApiUrl(): string;

    public function isEnabled(): bool
    {
        return (bool) $this->setting('enabled', false);
    }

    public function isConfigured(): bool
    {
        return trim((string) $this->setting('bot_token')) !== ''
            && trim((string) $this->setting('chat_id')) !== '';
    }

    /**
     * مقصد پیش‌فرض (chat_id) برای ارسال‌های گروهی/آزمایشی.
     */
    public function defaultRecipient(): ?string
    {
        $chatId = trim((string) $this->setting('chat_id'));

        return $chatId === '' ? null : $chatId;
    }

    public function normalizeRecipient(string $recipient): string
    {
        return trim($recipient);
    }

    public function send(string $recipient, string $body, array $options = []): MessageResult
    {
        $chatId = trim($recipient) !== '' ? trim($recipient) : (string) $this->defaultRecipient();

        if ($chatId === '') {
            return MessageResult::failure('شناسهٔ گفتگو (chat_id) گیرنده مشخص نیست.');
        }

        try {
            $url = rtrim((string) ($this->setting('api_url') ?: $this->defaultApiUrl()), '/')
                . '/bot' . trim((string) $this->setting('bot_token')) . '/sendMessage';

            $response = Http::timeout($this->timeout())
                ->acceptJson()
                ->asJson()
                ->post($url, [
                    'chat_id' => $chatId,
                    'text' => $body,
                    'disable_web_page_preview' => true,
                ]);

            $payload = $response->json() ?? [];

            if ($response->successful() && ($payload['ok'] ?? false) === true) {
                return MessageResult::success(
                    (string) data_get($payload, 'result.message_id', ''),
                    ['channel' => $this->channel(), 'chat_id' => $chatId]
                );
            }

            return MessageResult::failure(
                (string) ($payload['description'] ?? 'ارسال پیام ناموفق بود.'),
                ['channel' => $this->channel(), 'status' => $response->status()]
            );
        } catch (Throwable $exception) {
            return MessageResult::failure(
                'خطا در ارتباط با سرویس پیام‌رسان: ' . $exception->getMessage(),
                ['channel' => $this->channel()]
            );
        }
    }

    protected function setting(string $key, mixed $default = null): mixed
    {
        return config("messaging.channels.{$this->configKey()}.{$key}", $default);
    }

    protected function timeout(): int
    {
        return max(3, (int) config('messaging.timeout', 15));
    }
}
