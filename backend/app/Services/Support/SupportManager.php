<?php

namespace App\Services\Support;

use App\Models\StoreSetting;
use App\Models\SupportConversation;
use App\Models\SupportMessage;
use App\Models\User;
use App\Services\Messaging\MessagingManager;
use App\Support\SupportChannels;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Throwable;

/**
 * منطق مشترک سیستم پشتیبانی.
 *
 * سه وظیفهٔ اصلی:
 *   ۱) ساخت گفتگو و ثبت پیام‌های کاربر/مدیر با شمارنده‌های خوانده‌نشده
 *   ۲) اطلاع‌رسانی به مدیران در تلگرام/بله/واتساپ (به‌صورت «بهترین تلاش»)
 *   ۳) دریافت پیام از پیام‌رسان‌ها و ادامهٔ همان گفتگو (وب‌هوک)
 */
class SupportManager
{
    public function __construct(private readonly MessagingManager $messaging)
    {
    }

    /**
     * شروع گفتگوی جدید از داخل فروشگاه.
     *
     * @param array{name?: string|null, contact?: string|null, subject?: string|null, message: string, channel?: string|null, page_url?: string|null} $data
     */
    public function openConversation(
        array $data,
        ?User $user = null,
        ?Request $request = null
    ): SupportConversation {
        $channel = in_array($data['channel'] ?? null, SupportConversation::CHANNELS, true)
            ? (string) $data['channel']
            : SupportConversation::CHANNEL_WEB;

        $conversation = SupportConversation::query()->create([
            'token' => (string) Str::uuid(),
            'user_id' => $user?->id,
            'name' => $this->clean($data['name'] ?? null) ?? $user?->name,
            'contact' => $this->clean($data['contact'] ?? null) ?? $user?->email,
            'subject' => $this->clean($data['subject'] ?? null),
            'channel' => $channel,
            'status' => SupportConversation::STATUS_OPEN,
            'ip_address' => $request?->ip(),
        ]);

        $message = $this->postUserMessage($conversation, (string) $data['message'], [
            'page_url' => $data['page_url'] ?? null,
            'source' => 'web',
        ], $user);

        $this->notifyAdmins($conversation, $message);

        return $conversation->refresh();
    }

    /**
     * ثبت پیام کاربر در گفتگو.
     *
     * @param array<string, mixed> $meta
     */
    public function postUserMessage(
        SupportConversation $conversation,
        string $body,
        array $meta = [],
        ?User $user = null
    ): SupportMessage {
        $message = $conversation->messages()->create([
            'sender' => SupportMessage::SENDER_USER,
            'admin_id' => null,
            'body' => $body,
            'meta' => $this->cleanMeta($meta),
        ]);

        if ($conversation->user_id === null && $user !== null) {
            $conversation->user_id = $user->id;
        }

        if ($conversation->isClosed()) {
            $conversation->status = SupportConversation::STATUS_OPEN;
            $conversation->closed_at = null;
        }

        $conversation->admin_unread_count = (int) $conversation->admin_unread_count + 1;
        $conversation->user_unread_count = 0;

        $this->touch($conversation, $body);

        return $message;
    }

    /**
     * ثبت پاسخ مدیر؛ در صورت اتصال گفتگو به پیام‌رسان، پاسخ به همان چت ارسال می‌شود.
     */
    public function postAdminMessage(
        SupportConversation $conversation,
        User $admin,
        string $body
    ): SupportMessage {
        $message = $conversation->messages()->create([
            'sender' => SupportMessage::SENDER_ADMIN,
            'admin_id' => $admin->id,
            'body' => $body,
        ]);

        $conversation->user_unread_count = (int) $conversation->user_unread_count + 1;
        $conversation->admin_unread_count = 0;

        if ($conversation->isClosed()) {
            $conversation->status = SupportConversation::STATUS_OPEN;
            $conversation->closed_at = null;
        }

        $this->touch($conversation, $body);
        $this->relayToChannel($conversation, $body, $admin);

        return $message;
    }

    /**
     * پیام دریافتی از پیام‌رسان را به گفتگوی متناظر اضافه می‌کند
     * (و در صورت نبود، گفتگوی جدید می‌سازد).
     */
    public function ingestInbound(
        string $channel,
        string $chatId,
        string $body,
        ?string $displayName = null
    ): SupportConversation {
        $conversation = SupportConversation::query()
            ->where('channel', $channel)
            ->where('channel_chat_id', $chatId)
            ->first();

        $isNew = $conversation === null;

        if ($conversation === null) {
            $conversation = SupportConversation::query()->create([
                'token' => (string) Str::uuid(),
                'name' => $this->clean($displayName),
                'contact' => $chatId,
                'subject' => 'گفتگو از ' . SupportConversation::channelLabel($channel),
                'channel' => $channel,
                'channel_chat_id' => $chatId,
                'status' => SupportConversation::STATUS_OPEN,
            ]);
        }

        $message = $this->postUserMessage($conversation, $body, [
            'channel' => $channel,
            'chat_id' => $chatId,
        ]);

        if ($isNew) {
            $this->notifyAdmins($conversation, $message);
        }

        return $conversation->refresh();
    }

    /**
     * اطلاع‌رسانی درخواست جدید به مدیران در کانال‌های فعال.
     * خطای ارسال هرگز مانع ثبت درخواست کاربر نمی‌شود.
     */
    public function notifyAdmins(
        SupportConversation $conversation,
        SupportMessage $message
    ): void {
        $text = $this->alertText($conversation, $message);

        foreach ((array) config('support.alert_channels', []) as $channel) {
            try {
                if (! $this->messaging->isAvailable($channel)) {
                    continue;
                }

                $recipient = $this->messaging->defaultRecipient($channel);

                if (! $recipient) {
                    continue;
                }

                $this->messaging->send($channel, $recipient, $text, [
                    'context' => 'support.new',
                    'conversation_id' => $conversation->id,
                ]);
            } catch (Throwable) {
                // اعلان ناموفق نباید جریان پشتیبانی را متوقف کند.
            }
        }
    }

    /**
     * تنظیمات عمومی ویجت پشتیبانی برای فروشگاه.
     *
     * @return array<string, mixed>
     */
    public function publicConfig(): array
    {
        $settings = StoreSetting::publicSettings();

        return [
            'enabled' => (bool) config('support.web_chat_enabled', true),
            'poll_seconds' => max(3, (int) config('support.poll_seconds', 5)),
            'store_name' => (string) ($settings['store_name'] ?? ''),
            'working_hours' => (string) ($settings['store_working_hours'] ?? ''),
            'support_note' => (string) ($settings['support_note'] ?? ''),
            'phone' => (string) ($settings['store_phone'] ?? ''),
            'mobile' => (string) ($settings['store_mobile'] ?? ''),
            'email' => (string) ($settings['store_email'] ?? ''),
            'channels' => SupportChannels::links($settings),
        ];
    }

    /**
     * ارسال پاسخ مدیر به چت پیام‌رسان متصل (اگر وجود داشته باشد).
     */
    private function relayToChannel(
        SupportConversation $conversation,
        string $body,
        ?User $admin = null
    ): void {
        $channel = $conversation->channel;

        if (! in_array($channel, [
            SupportConversation::CHANNEL_TELEGRAM,
            SupportConversation::CHANNEL_BALE,
            SupportConversation::CHANNEL_WHATSAPP,
        ], true)) {
            return;
        }

        $recipient = trim((string) ($conversation->channel_chat_id ?: $conversation->contact));

        if ($recipient === '') {
            return;
        }

        try {
            if (! $this->messaging->isAvailable($channel)) {
                return;
            }

            $this->messaging->send($channel, $recipient, $body, [
                'context' => 'support.reply',
                'conversation_id' => $conversation->id,
            ], $admin?->id);
        } catch (Throwable) {
            // ارسال به پیام‌رسان اختیاری است؛ پیام در پنل ذخیره شده است.
        }
    }

    /**
     * متن اعلان درخواست جدید برای مدیران.
     */
    private function alertText(
        SupportConversation $conversation,
        SupportMessage $message
    ): string {
        $lines = [
            'درخواست پشتیبانی جدید',
            'کانال: ' . SupportConversation::channelLabel($conversation->channel),
        ];

        if ($conversation->name) {
            $lines[] = 'نام: ' . $conversation->name;
        }

        if ($conversation->contact) {
            $lines[] = 'تماس: ' . $conversation->contact;
        }

        if ($conversation->subject) {
            $lines[] = 'موضوع: ' . $conversation->subject;
        }

        $lines[] = 'پیام: ' . $message->body;
        $lines[] = 'کد گفتگو: ' . $conversation->token;

        return implode("\n", $lines);
    }

    /**
     * به‌روزرسانی خلاصه و زمان آخرین پیام گفتگو.
     */
    private function touch(SupportConversation $conversation, string $body): void
    {
        $flat = trim((string) preg_replace('/\s+/u', ' ', $body));

        $conversation->last_message_excerpt = Str::limit($flat, 120);
        $conversation->last_message_at = now();
        $conversation->save();
    }

    private function clean(?string $value): ?string
    {
        $value = trim((string) $value);

        return $value === '' ? null : $value;
    }

    /**
     * @param array<string, mixed> $meta
     * @return array<string, mixed>|null
     */
    private function cleanMeta(array $meta): ?array
    {
        $meta = array_filter(
            $meta,
            static fn ($value): bool => $value !== null && $value !== ''
        );

        return $meta === [] ? null : $meta;
    }
}
