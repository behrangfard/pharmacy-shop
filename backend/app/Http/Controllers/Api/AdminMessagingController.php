<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OutboundMessage;
use App\Services\Messaging\BirthdayGreetingService;
use App\Services\Messaging\MessagingManager;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AdminMessagingController extends Controller
{
    public function __construct(
        private readonly MessagingManager $messaging,
        private readonly BirthdayGreetingService $birthday
    ) {
    }

    /**
     * وضعیت کانال‌ها، آمار کلی و تعداد گیرندگان قابل استفاده.
     */
    public function settings()
    {
        return response()->json([
            'success' => true,
            'data' => [
                'channels' => $this->messaging->channelsStatus(),
                'audiences' => [
                    'order_phones' => $this->orderPhonesCount(),
                ],
                'stats' => [
                    'total' => OutboundMessage::query()->count(),
                    'sent' => OutboundMessage::query()
                        ->where('status', OutboundMessage::STATUS_SENT)
                        ->count(),
                    'failed' => OutboundMessage::query()
                        ->where('status', OutboundMessage::STATUS_FAILED)
                        ->count(),
                    'today' => OutboundMessage::query()
                        ->whereDate('created_at', now()->toDateString())
                        ->count(),
                ],
                'audience_limit' => $this->audienceLimit(),
            ],
        ]);
    }

    /**
     * تاریخچهٔ پیام‌های ارسال‌شده.
     */
    public function index(Request $request)
    {
        $validated = $request->validate([
            'channel' => ['nullable', Rule::in(OutboundMessage::CHANNELS)],
            'status' => ['nullable', Rule::in(OutboundMessage::STATUSES)],
            'search' => ['nullable', 'string', 'max:150'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = OutboundMessage::query()
            ->with(['sender:id,name'])
            ->latest();

        if (! empty($validated['channel'])) {
            $query->where('channel', $validated['channel']);
        }

        if (! empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        if (! empty($validated['search'])) {
            $search = $validated['search'];

            $query->where(function ($inner) use ($search) {
                $inner->where('recipient', 'like', "%{$search}%")
                    ->orWhere('body', 'like', "%{$search}%");
            });
        }

        $messages = $query->paginate($validated['per_page'] ?? 12);

        return response()->json([
            'success' => true,
            'data' => $messages,
        ]);
    }

    /**
     * ارسال پیام از طریق کانال انتخاب‌شده.
     */
    public function send(Request $request)
    {
        $limit = $this->audienceLimit();

        $validated = $request->validate([
            'channel' => ['required', Rule::in(OutboundMessage::CHANNELS)],
            'body' => ['required', 'string', 'min:1', 'max:3000'],
            'audience' => ['nullable', Rule::in(['custom', 'order_phones', 'default'])],
            'recipients' => ['nullable', 'array', "max:{$limit}"],
            'recipients.*' => ['nullable', 'string', 'max:191'],
            'as_template' => ['nullable', 'boolean'],
        ], [
            'channel.required' => 'کانال ارسال را انتخاب کنید.',
            'channel.in' => 'کانال انتخاب‌شده معتبر نیست.',
            'body.required' => 'متن پیام را وارد کنید.',
            'body.max' => 'متن پیام بیش از حد طولانی است (حداکثر ۳۰۰۰ نویسه).',
            'recipients.max' => "حداکثر {$limit} گیرنده در هر ارسال مجاز است.",
        ]);

        $channel = $validated['channel'];

        if (! $this->messaging->isAvailable($channel)) {
            throw ValidationException::withMessages([
                'channel' => 'این کانال هنوز فعال یا تنظیم نشده است. ابتدا اطلاعات اتصال را در فایل .env وارد کنید.',
            ]);
        }

        $recipients = $this->resolveRecipients(
            $channel,
            $validated['audience'] ?? 'custom',
            $validated['recipients'] ?? [],
            $limit
        );

        if ($recipients->isEmpty()) {
            throw ValidationException::withMessages([
                'recipients' => 'حداقل یک گیرنده وارد کنید.',
            ]);
        }

        $sent = 0;
        $failed = 0;
        $results = [];

        foreach ($recipients as $recipient) {
            $message = $this->messaging->send(
                $channel,
                $recipient,
                $validated['body'],
                ['as_template' => (bool) ($validated['as_template'] ?? false)],
                $request->user()?->id
            );

            if ($message->status === OutboundMessage::STATUS_SENT) {
                $sent++;
            } else {
                $failed++;
            }

            $results[] = [
                'id' => $message->id,
                'recipient' => $message->recipient,
                'status' => $message->status,
                'error' => $message->error,
                'provider_message_id' => $message->provider_message_id,
            ];
        }

        return response()->json([
            'success' => $failed === 0,
            'message' => $failed === 0
                ? 'پیام با موفقیت ارسال شد.'
                : "ارسال انجام شد؛ {$sent} موفق و {$failed} ناموفق.",
            'data' => [
                'sent' => $sent,
                'failed' => $failed,
                'total' => $recipients->count(),
                'results' => $results,
            ],
        ]);
    }

    /**
     * حذف یک رکورد از تاریخچه.
     */
    public function destroy(int $messageId)
    {
        $message = OutboundMessage::query()->findOrFail($messageId);
        $message->delete();

        return response()->json([
            'success' => true,
            'message' => 'رکورد از تاریخچه حذف شد.',
        ]);
    }

    /**
     * تنظیمات، آمار و فهرست تولدهای امروز/هفتهٔ آینده برای بخش «تبریک تولد».
     */
    public function birthdaySettings()
    {
        return response()->json([
            'success' => true,
            'data' => $this->birthday->overview(),
        ]);
    }

    /**
     * ذخیرهٔ تنظیمات تبریک تولد خودکار.
     */
    public function updateBirthdaySettings(Request $request)
    {
        $validated = $request->validate([
            'enabled' => ['required', 'boolean'],
            'channel' => ['required', Rule::in(OutboundMessage::CHANNELS)],
            'template' => ['required', 'string', 'min:10', 'max:1000'],
            'send_time' => ['required', 'date_format:H:i'],
        ]);

        $this->birthday->updateSettings($validated);

        return response()->json([
            'success' => true,
            'message' => 'تنظیمات تبریک تولد ذخیره شد.',
            'data' => $this->birthday->overview(),
        ]);
    }

    /**
     * ارسال دستی تبریک تولد امروز (مستقل از ساعت زمان‌بندی).
     */
    public function sendBirthdayGreetings(Request $request)
    {
        $validated = $request->validate([
            'force' => ['nullable', 'boolean'],
        ]);

        $channel = $this->birthday->settings()['channel'];

        if (! $this->messaging->isAvailable($channel)) {
            throw ValidationException::withMessages([
                'channel' => 'کانال انتخاب‌شده برای تبریک تولد فعال یا تنظیم نشده است. ابتدا آن را در فایل .env تنظیم کنید.',
            ]);
        }

        $result = $this->birthday->sendForDate(
            now()->startOfDay(),
            $request->user()?->id,
            (bool) ($validated['force'] ?? false)
        );

        $message = match (true) {
            $result['total'] === 0 => 'امروز تولدی ثبت نشده است.',
            $result['skipped'] === $result['total'] => 'تبریک تولد امروز قبلاً برای همهٔ این مشتریان ارسال شده است.',
            $result['failed'] === 0 => "تبریک تولد برای {$result['sent']} مشتری ارسال شد.",
            default => "{$result['sent']} موفق و {$result['failed']} ناموفق از {$result['total']} گیرنده.",
        };

        return response()->json([
            'success' => $result['failed'] === 0,
            'message' => $message,
            'data' => array_merge($result, [
                'overview' => $this->birthday->overview(),
            ]),
        ]);
    }

    /**
     * @param  array<int, mixed>  $customRecipients
     * @return \Illuminate\Support\Collection<int, string>
     */
    private function resolveRecipients(
        string $channel,
        string $audience,
        array $customRecipients,
        int $limit
    ) {
        $recipients = match ($audience) {
            'order_phones' => Order::query()
                ->whereNotNull('phone')
                ->where('phone', '!=', '')
                ->distinct()
                ->orderBy('phone')
                ->limit($limit)
                ->pluck('phone')
                ->all(),
            'default' => array_filter([$this->messaging->defaultRecipient($channel)]),
            default => $customRecipients,
        };

        return collect($recipients)
            ->map(static fn ($value) => trim((string) $value))
            ->filter(static fn (string $value) => $value !== '')
            ->unique()
            ->take($limit)
            ->values();
    }

    private function orderPhonesCount(): int
    {
        return Order::query()
            ->whereNotNull('phone')
            ->where('phone', '!=', '')
            ->distinct()
            ->count('phone');
    }

    private function audienceLimit(): int
    {
        return max(1, (int) config('messaging.audience_limit', 300));
    }
}
