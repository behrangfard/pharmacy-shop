<?php

namespace App\Services\Messaging;

use App\Models\OutboundMessage;
use App\Services\Messaging\Contracts\MessageDriver;
use App\Services\Messaging\Drivers\BaleDriver;
use App\Services\Messaging\Drivers\SmsDriver;
use App\Services\Messaging\Drivers\TelegramDriver;
use App\Services\Messaging\Drivers\WhatsAppDriver;
use InvalidArgumentException;
use Throwable;

/**
 * مدیر یکپارچهٔ کانال‌های پیام‌رسانی (پیامک، تلگرام، واتساپ، بله).
 */
class MessagingManager
{
    /**
     * @var array<string, MessageDriver>|null
     */
    private ?array $drivers = null;

    /**
     * @return array<string, MessageDriver>
     */
    public function drivers(): array
    {
        return $this->drivers ??= [
            'sms' => new SmsDriver(),
            'telegram' => new TelegramDriver(),
            'whatsapp' => new WhatsAppDriver(),
            'bale' => new BaleDriver(),
        ];
    }

    public function driver(string $channel): MessageDriver
    {
        $drivers = $this->drivers();

        if (! isset($drivers[$channel])) {
            throw new InvalidArgumentException('کانال پیام‌رسانی انتخاب‌شده پشتیبانی نمی‌شود.');
        }

        return $drivers[$channel];
    }

    public function isAvailable(string $channel): bool
    {
        $driver = $this->driver($channel);

        return $driver->isEnabled() && $driver->isConfigured();
    }

    public function defaultRecipient(string $channel): ?string
    {
        $driver = $this->driver($channel);

        if (! method_exists($driver, 'defaultRecipient')) {
            return null;
        }

        $recipient = $driver->defaultRecipient();

        return $recipient === null || $recipient === '' ? null : $recipient;
    }

    /**
     * ارسال پیام و ثبت آن در تاریخچه.
     */
    public function send(
        string $channel,
        string $recipient,
        string $body,
        array $options = [],
        ?int $sentBy = null
    ): OutboundMessage {
        $driver = $this->driver($channel);
        $recipient = $driver->normalizeRecipient($recipient);

        $message = OutboundMessage::create([
            'channel' => $channel,
            'recipient' => $recipient !== '' ? $recipient : '—',
            'body' => $body,
            'status' => OutboundMessage::STATUS_PENDING,
            'meta' => ['options' => $options],
            'sent_by' => $sentBy,
        ]);

        try {
            $result = $driver->send($recipient, $body, $options);
        } catch (Throwable $exception) {
            $result = MessageResult::failure(
                'خطای غیرمنتظره در ارسال: ' . $exception->getMessage()
            );
        }

        $message->status = $result->success
            ? OutboundMessage::STATUS_SENT
            : OutboundMessage::STATUS_FAILED;

        $message->provider_message_id = $result->providerMessageId;
        $message->error = $result->success
            ? null
            : ($result->error ?: 'ارسال پیام ناموفق بود.');
        $message->meta = array_merge($message->meta ?? [], [
            'result' => $result->payload,
        ]);
        $message->sent_at = now();
        $message->save();

        return $message;
    }

    /**
     * وضعیت و اطلاعات نمایشی هر کانال برای پنل مدیریت.
     *
     * @return array<int, array<string, mixed>>
     */
    public function channelsStatus(): array
    {
        $items = [];

        foreach ($this->drivers() as $key => $driver) {
            $enabled = $driver->isEnabled();
            $configured = $driver->isConfigured();

            $items[] = array_merge([
                'key' => $key,
                'label' => (string) config("messaging.channels.{$key}.label", $key),
                'enabled' => $enabled,
                'configured' => $configured,
                'available' => $enabled && $configured,
                'default_recipient' => $this->defaultRecipient($key),
                'template_name' => $driver instanceof WhatsAppDriver
                    ? $driver->templateName()
                    : null,
            ], $this->channelMeta($key));
        }

        return $items;
    }

    /**
     * @return array<string, string>
     */
    private function channelMeta(string $channel): array
    {
        return match ($channel) {
            'sms' => [
                'description' => 'ارسال پیامک به شمارهٔ موبایل مشتریان از طریق کاوه‌نگار، SMS.ir یا وب‌سرویس اختصاصی.',
                'recipient_label' => 'شمارهٔ موبایل',
                'recipient_placeholder' => '09121234567',
                'setup' => 'SMS_ENABLED=true و SMS_API_KEY (و SMS_SENDER) را در فایل .env تنظیم کنید.',
            ],
            'telegram' => [
                'description' => 'ارسال پیام به کانال، گروه یا چت خصوصی از طریق ربات تلگرام.',
                'recipient_label' => 'شناسهٔ گفتگو (chat_id)',
                'recipient_placeholder' => '-1001234567890 یا @my_channel',
                'setup' => 'TELEGRAM_ENABLED=true و TELEGRAM_BOT_TOKEN و TELEGRAM_CHAT_ID را تنظیم کنید.',
            ],
            'whatsapp' => [
                'description' => 'ارسال پیام واتساپ با WhatsApp Cloud API متا (متن یا قالب تأییدشده).',
                'recipient_label' => 'شمارهٔ واتساپ',
                'recipient_placeholder' => '09121234567',
                'setup' => 'WHATSAPP_ENABLED=true و WHATSAPP_TOKEN و WHATSAPP_PHONE_NUMBER_ID را تنظیم کنید.',
            ],
            'bale' => [
                'description' => 'ارسال پیام به پیام‌رسان بله از طریق ربات بله (API سازگار با تلگرام).',
                'recipient_label' => 'شناسهٔ گفتگو (chat_id)',
                'recipient_placeholder' => '123456789',
                'setup' => 'BALE_ENABLED=true و BALE_BOT_TOKEN و BALE_CHAT_ID را تنظیم کنید.',
            ],
            default => [
                'description' => '',
                'recipient_label' => 'گیرنده',
                'recipient_placeholder' => '',
                'setup' => '',
            ],
        };
    }
}
