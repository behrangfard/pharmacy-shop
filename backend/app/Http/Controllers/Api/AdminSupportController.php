<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SupportConversation;
use App\Services\Support\SupportManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

/**
 * صندوق پشتیبانی پنل مدیریت.
 *
 * دسترسی این بخش با مجوز «messaging.manage» کنترل می‌شود؛ همان مجوزی که
 * نقش «پشتیبانی» در App\Support\AdminRole دارد.
 */
class AdminSupportController extends Controller
{
    public function __construct(private readonly SupportManager $support)
    {
    }

    /**
     * فهرست گفتگوها همراه با آمار کوتاه صندوق.
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['nullable', Rule::in(SupportConversation::STATUSES)],
            'channel' => ['nullable', Rule::in(SupportConversation::CHANNELS)],
            'search' => ['nullable', 'string', 'max:150'],
            'unread' => ['nullable', 'boolean'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $query = SupportConversation::query()
            ->withCount('messages')
            ->with('user:id,name,email');

        if (! empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        if (! empty($validated['channel'])) {
            $query->where('channel', $validated['channel']);
        }

        if (! empty($validated['unread'])) {
            $query->where('admin_unread_count', '>', 0);
        }

        if (! empty($validated['search'])) {
            $search = $validated['search'];

            $query->where(function ($inner) use ($search): void {
                $inner->where('name', 'like', "%{$search}%")
                    ->orWhere('contact', 'like', "%{$search}%")
                    ->orWhere('subject', 'like', "%{$search}%")
                    ->orWhere('last_message_excerpt', 'like', "%{$search}%")
                    ->orWhere('token', 'like', "%{$search}%");
            });
        }

        $conversations = $query
            ->orderByDesc('last_message_at')
            ->orderByDesc('id')
            ->paginate($validated['per_page'] ?? 15);

        return response()->json([
            'success' => true,
            'data' => $conversations,
            'stats' => $this->statsPayload(),
        ]);
    }

    /**
     * آمار صندوق پشتیبانی (برای نشان‌دادن روی منو و داشبورد).
     */
    public function stats(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->statsPayload(),
        ]);
    }

    /**
     * مشاهدهٔ یک گفتگو همراه با همهٔ پیام‌ها.
     */
    public function show(int $conversationId): JsonResponse
    {
        $conversation = SupportConversation::query()
            ->with(['messages.admin:id,name', 'user:id,name,email'])
            ->find($conversationId);

        if ($conversation === null) {
            return $this->error('گفتگوی موردنظر پیدا نشد.', Response::HTTP_NOT_FOUND);
        }

        if ((int) $conversation->admin_unread_count > 0) {
            $conversation->forceFill(['admin_unread_count' => 0])->save();
        }

        return response()->json([
            'success' => true,
            'data' => $conversation,
        ]);
    }

    /**
     * پاسخ مدیر به گفتگو.
     */
    public function reply(Request $request, int $conversationId): JsonResponse
    {
        $conversation = SupportConversation::query()->find($conversationId);

        if ($conversation === null) {
            return $this->error('گفتگوی موردنظر پیدا نشد.', Response::HTTP_NOT_FOUND);
        }

        $validated = $request->validate([
            'body' => ['required', 'string', 'min:1', 'max:2000'],
        ], [
            'body.required' => 'متن پاسخ را بنویسید.',
            'body.max' => 'پاسخ حداکثر ۲۰۰۰ نویسه می‌تواند باشد.',
        ]);

        $message = $this->support->postAdminMessage(
            $conversation,
            $request->user(),
            $validated['body']
        );

        return response()->json([
            'success' => true,
            'message' => 'پاسخ شما ثبت شد.',
            'data' => [
                'message' => $message->load('admin:id,name'),
                'status' => $conversation->fresh()->status,
            ],
        ], Response::HTTP_CREATED);
    }

    /**
     * تغییر وضعیت گفتگو (باز / در انتظار پاسخ / بسته‌شده).
     */
    public function updateStatus(Request $request, int $conversationId): JsonResponse
    {
        $conversation = SupportConversation::query()->find($conversationId);

        if ($conversation === null) {
            return $this->error('گفتگوی موردنظر پیدا نشد.', Response::HTTP_NOT_FOUND);
        }

        $validated = $request->validate([
            'status' => ['required', Rule::in(SupportConversation::STATUSES)],
        ], [
            'status.required' => 'وضعیت جدید را انتخاب کنید.',
            'status.in' => 'وضعیت انتخاب‌شده معتبر نیست.',
        ]);

        $conversation->status = $validated['status'];
        $conversation->closed_at = $validated['status'] === SupportConversation::STATUS_CLOSED
            ? now()
            : null;
        $conversation->save();

        return response()->json([
            'success' => true,
            'message' => 'وضعیت گفتگو به‌روزرسانی شد.',
            'data' => $conversation,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function statsPayload(): array
    {
        $counts = SupportConversation::query()
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status')
            ->all();

        return [
            'open' => (int) ($counts[SupportConversation::STATUS_OPEN] ?? 0),
            'pending' => (int) ($counts[SupportConversation::STATUS_PENDING] ?? 0),
            'closed' => (int) ($counts[SupportConversation::STATUS_CLOSED] ?? 0),
            'total' => (int) array_sum(array_map('intval', $counts)),
            'today' => (int) SupportConversation::query()
                ->whereDate('created_at', now()->toDateString())
                ->count(),
            'unread' => (int) SupportConversation::query()
                ->where('admin_unread_count', '>', 0)
                ->where('status', '!=', SupportConversation::STATUS_CLOSED)
                ->sum('admin_unread_count'),
        ];
    }

    private function error(string $message, int $status): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $message,
        ], $status);
    }
}
