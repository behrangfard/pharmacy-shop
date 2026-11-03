<?php

namespace App\Services\Messaging\Drivers;

use App\Services\Messaging\Contracts\MessageDriver;
use App\Services\Messaging\MessageResult;
use App\Services\Messaging\Support\PhoneNumber;
use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * ارسال پیام واتساپ از طریق WhatsApp Cloud API (Meta).
 */
class WhatsAppDriver implements MessageDriver
{
    public function channel(): string
    {
        return 'whatsapp';
    }

    public function isEnabled(): bool
    {
        return (bool) $this->setting('enabled', false);
    }

    public function isConfigured(): bool
    {
        return trim((string) $this->setting('token')) !== ''
            && trim((string) $this->setting('phone_number_id')) !== '';
    }

    public function defaultRecipient(): ?string
    {
        $recipient = trim((string) $this->setting('default_recipient'));

        return $recipient === '' ? null : PhoneNumber::toInternational($recipient);
    }

    /**
     * نام قالب (template) تنظیم‌شده؛ برای ارسال خارج از پنجرهٔ ۲۴ ساعته لازم است.
     */
    public function templateName(): ?string
    {
        $template = trim((string) $this->setting('template_name'));

        return $template === '' ? null : $template;
    }

    public function normalizeRecipient(string $recipient): string
    {
        return PhoneNumber::toInternational($recipient);
    }

    public function send(string $recipient, string $body, array $options = []): MessageResult
    {
        $to = PhoneNumber::toInternational($recipient);

        if ($to === '') {
            return MessageResult::failure('شمارهٔ واتساپ گیرنده معتبر نیست.');
        }

        try {
            $url = rtrim((string) ($this->setting('api_url') ?: 'https://graph.facebook.com/v21.0'), '/')
                . '/' . rawurlencode(trim((string) $this->setting('phone_number_id')))
                . '/messages';

            $useTemplate = (bool) ($options['as_template'] ?? false) && $this->templateName() !== null;

            $payload = $useTemplate
                ? [
                    'messaging_product' => 'whatsapp',
                    'recipient_type' => 'individual',
                    'to' => $to,
                    'type' => 'template',
                    'template' => [
                        'name' => $this->templateName(),
                        'language' => ['code' => (string) $this->setting('template_language', 'fa')],
                        'components' => [[
                            'type' => 'body',
                            'parameters' => [['type' => 'text', 'text' => $body]],
                        ]],
                    ],
                ]
                : [
                    'messaging_product' => 'whatsapp',
                    'recipient_type' => 'individual',
                    'to' => $to,
                    'type' => 'text',
                    'text' => ['preview_url' => false, 'body' => $body],
                ];

            $response = Http::timeout($this->timeout())
                ->withToken(trim((string) $this->setting('token')))
                ->acceptJson()
                ->asJson()
                ->post($url, $payload);

            $responsePayload = $response->json() ?? [];

            if ($response->successful() && data_get($responsePayload, 'messages.0.id')) {
                return MessageResult::success(
                    (string) data_get($responsePayload, 'messages.0.id'),
                    ['channel' => 'whatsapp', 'mode' => $useTemplate ? 'template' : 'text']
                );
            }

            return MessageResult::failure(
                (string) data_get($responsePayload, 'error.message', 'ارسال پیام واتساپ ناموفق بود.'),
                ['channel' => 'whatsapp', 'status' => $response->status()]
            );
        } catch (Throwable $exception) {
            return MessageResult::failure(
                'خطا در ارتباط با WhatsApp Cloud API: ' . $exception->getMessage(),
                ['channel' => 'whatsapp']
            );
        }
    }

    private function setting(string $key, mixed $default = null): mixed
    {
        return config("messaging.channels.whatsapp.{$key}", $default);
    }

    private function timeout(): int
    {
        return max(3, (int) config('messaging.timeout', 15));
    }
}
