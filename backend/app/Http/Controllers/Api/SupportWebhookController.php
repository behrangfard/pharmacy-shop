<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SupportConversation;
use App\Services\Support\SupportManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * دریافت پیام از پیام‌رسان‌ها (وب‌هوک).
 *
 * تلگرام و بله هر دو از Bot API سازگار با تلگرام استفاده می‌کنند، بنابراین
 * بدنهٔ به‌روزرسانی آن‌ها یکسان پردازش می‌شود. واتساپ از WhatsApp Cloud API
 * متا استفاده می‌کند و ساختار متفاوتی دارد.
 *
 * آدرس وب‌هوک باید با «رمز» پیکربندی‌شده در .env فراخوانی شود:
 *   POST /api/v1/support/webhooks/{SUPPORT_WEBHOOK_SECRET}/{telegram|bale|whatsapp}
 */
class SupportWebhookController extends Controller
{
    public function __construct(private readonly SupportManager $support)
    {
    }

    /**
     * دریافت به‌روزرسانی پیام‌رسان.
     */
    public function handle(Request $request, string $secret, string $channel): JsonResponse
    {
        if (! $this->isAuthorized($secret)) {
            return $this->error('درخواست غیرمجاز است.', Response::HTTP_FORBIDDEN);
        }

        if ($channel === SupportConversation::CHANNEL_WHATSAPP) {
            return $this->whatsAppMessage($request);
        }

        return $this->botApiMessage($request, $channel);
    }

    /**
     * تأیید آدرس وب‌هوک واتساپ (متا با درخواست GET آن را بررسی می‌کند).
     */
    public function whatsAppVerify(Request $request, string $secret): Response
    {
        $verifyToken = (string) config('support.webhook_secret');

        $mode = (string) $request->query('hub_mode', '');
        $token = (string) $request->query('hub_verify_token', '');
        $challenge = (string) $request->query('hub_challenge', '');

        if (
            $verifyToken === ''
            || ! hash_equals($verifyToken, $secret)
            || $mode !== 'subscribe'
            || ! hash_equals($verifyToken, $token)
        ) {
            return response('', Response::HTTP_FORBIDDEN);
        }

        return response($challenge, Response::HTTP_OK)
            ->header('Content-Type', 'text/plain');
    }

    /**
     * پردازش به‌روزرسانی تلگرام/بله.
     */
    private function botApiMessage(Request $request, string $channel): JsonResponse
    {
        $payload = $request->all();
        $message = data_get($payload, 'message') ?? data_get($payload, 'edited_message');

        $chatId = trim((string) data_get($message, 'chat.id', ''));
        $text = trim((string) (data_get($message, 'text') ?? data_get($message, 'caption') ?? ''));

        if ($chatId === '' || $text === '') {
            return response()->json([
                'success' => true,
                'data' => ['ignored' => true],
            ]);
        }

        $name = trim((string) data_get($message, 'from.first_name', ''))
            ?: trim((string) data_get($message, 'chat.title', ''));

        $text = $this->stripCommand($text);

        if ($text === '') {
            $text = 'سلام، نیاز به پشتیبانی دارم.';
        }

        $conversation = $this->support->ingestInbound($channel, $chatId, $text, $name);

        return response()->json([
            'success' => true,
            'data' => [
                'conversation_id' => $conversation->id,
                'status' => $conversation->status,
            ],
        ]);
    }

    /**
     * پردازش پیام دریافتی واتساپ (WhatsApp Cloud API).
     */
    private function whatsAppMessage(Request $request): JsonResponse
    {
        $message = data_get($request->all(), 'entry.0.changes.0.value.messages.0');

        $from = trim((string) data_get($message, 'from', ''));
        $text = trim((string) (data_get($message, 'text.body')
            ?? data_get($message, 'button.text')
            ?? data_get($message, 'interactive.button_reply.title')
            ?? ''));

        if ($from === '' || $text === '') {
            return response()->json([
                'success' => true,
                'data' => ['ignored' => true],
            ]);
        }

        $name = trim((string) data_get(
            $request->all(),
            'entry.0.changes.0.value.contacts.0.profile.name',
            ''
        ));

        $conversation = $this->support->ingestInbound(
            SupportConversation::CHANNEL_WHATSAPP,
            $from,
            $text,
            $name !== '' ? $name : null
        );

        // متا انتظار پاسخ ۲۰۰ دارد و در غیر این صورت پیام را دوباره ارسال می‌کند.
        return response()->json([
            'success' => true,
            'data' => [
                'conversation_id' => $conversation->id,
                'status' => $conversation->status,
            ],
        ]);
    }

    /**
     * حذف بخش دستور (مثل /start) از ابتدای متن.
     */
    private function stripCommand(string $text): string
    {
        return trim((string) preg_replace('~^/\w+(@\w+)?\s*~u', '', $text));
    }

    private function isAuthorized(string $secret): bool
    {
        $expected = (string) config('support.webhook_secret');

        if ($expected === '') {
            return false;
        }

        return hash_equals($expected, $secret);
    }

    private function error(string $message, int $status): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $message,
        ], $status);
    }
}
