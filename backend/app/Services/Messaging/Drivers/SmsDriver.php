<?php

namespace App\Services\Messaging\Drivers;

use App\Services\Messaging\Contracts\MessageDriver;
use App\Services\Messaging\MessageResult;
use App\Services\Messaging\Support\PhoneNumber;
use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * ارسال پیامک از طریق سرویس‌های ایرانی.
 * درایورهای پشتیبانی‌شده: kavenegar | smsir | custom
 */
class SmsDriver implements MessageDriver
{
    public function channel(): string
    {
        return 'sms';
    }

    public function isEnabled(): bool
    {
        return (bool) $this->setting('enabled', false);
    }

    public function isConfigured(): bool
    {
        $apiKey = trim((string) $this->setting('api_key'));

        if ($apiKey === '') {
            return false;
        }

        if ($this->provider() === 'custom') {
            return trim((string) $this->setting('base_url')) !== '';
        }

        return true;
    }

    public function normalizeRecipient(string $recipient): string
    {
        return PhoneNumber::normalize($recipient);
    }

    public function send(string $recipient, string $body, array $options = []): MessageResult
    {
        $mobile = PhoneNumber::normalize($recipient);

        if ($mobile === '') {
            return MessageResult::failure('شمارهٔ موبایل گیرنده معتبر نیست.');
        }

        try {
            return match ($this->provider()) {
                'smsir' => $this->sendViaSmsIr($mobile, $body),
                'custom' => $this->sendViaCustom($mobile, $body),
                default => $this->sendViaKavenegar($mobile, $body),
            };
        } catch (Throwable $exception) {
            return MessageResult::failure(
                'خطا در ارتباط با سرویس پیامک: ' . $exception->getMessage()
            );
        }
    }

    private function sendViaKavenegar(string $mobile, string $body): MessageResult
    {
        $baseUrl = rtrim((string) ($this->setting('base_url') ?: 'https://api.kavenegar.com'), '/');

        $url = $baseUrl . '/' . rawurlencode((string) $this->setting('api_key')) . '/sms/send.json';

        $query = array_filter([
            'receptor' => $mobile,
            'sender' => $this->setting('sender'),
            'message' => $body,
        ], static fn ($value) => $value !== null && $value !== '');

        $response = Http::timeout($this->timeout())->acceptJson()->get($url, $query);
        $payload = $response->json() ?? [];
        $status = (int) data_get($payload, 'return.status', 0);

        if ($response->successful() && $status === 200) {
            return MessageResult::success(
                (string) data_get($payload, 'entries.0.messageid', ''),
                ['provider' => 'kavenegar', 'status' => $status]
            );
        }

        return MessageResult::failure(
            (string) data_get($payload, 'return.message', 'ارسال پیامک ناموفق بود.'),
            ['provider' => 'kavenegar', 'status' => $status]
        );
    }

    private function sendViaSmsIr(string $mobile, string $body): MessageResult
    {
        $response = Http::timeout($this->timeout())
            ->withHeaders([
                'x-api-key' => (string) $this->setting('api_key'),
                'Accept' => 'application/json',
            ])
            ->post('https://api.sms.ir/v1/send/bulk', array_filter([
                'lineNumber' => $this->setting('sender'),
                'messageText' => $body,
                'mobiles' => [$mobile],
            ], static fn ($value) => $value !== null && $value !== ''));

        $payload = $response->json() ?? [];

        if ($response->successful() && (int) data_get($payload, 'status', 0) === 1) {
            return MessageResult::success(
                (string) data_get($payload, 'data.packId', ''),
                ['provider' => 'smsir']
            );
        }

        return MessageResult::failure(
            (string) data_get($payload, 'message', 'ارسال پیامک ناموفق بود.'),
            ['provider' => 'smsir']
        );
    }

    private function sendViaCustom(string $mobile, string $body): MessageResult
    {
        $response = Http::timeout($this->timeout())
            ->withToken((string) $this->setting('api_key'))
            ->asJson()
            ->post((string) $this->setting('base_url'), [
                'sender' => $this->setting('sender'),
                'receptor' => $mobile,
                'message' => $body,
            ]);

        if ($response->successful()) {
            return MessageResult::success(
                (string) data_get($response->json() ?? [], 'message_id', ''),
                ['provider' => 'custom']
            );
        }

        return MessageResult::failure(
            'سرویس پیامک پاسخ خطا داد (کد ' . $response->status() . ').',
            ['provider' => 'custom', 'status' => $response->status()]
        );
    }

    private function provider(): string
    {
        $provider = strtolower(trim((string) $this->setting('driver', 'kavenegar')));

        return in_array($provider, ['kavenegar', 'smsir', 'custom'], true)
            ? $provider
            : 'kavenegar';
    }

    private function setting(string $key, mixed $default = null): mixed
    {
        return config("messaging.channels.sms.{$key}", $default);
    }

    private function timeout(): int
    {
        return max(3, (int) config('messaging.timeout', 15));
    }
}
