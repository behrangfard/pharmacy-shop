<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SupportConversation;
use App\Models\SupportMessage;
use App\Models\User;
use App\Services\Support\SupportManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * API عمومی چت پشتیبانی فروشگاه.
 *
 * کاربران مهمان با «توکن گفتگو» به گفتگوی خودشان دسترسی دارند؛ نیازی به
 * ورود به حساب کاربری نیست و توکن در مرورگر همان کاربر ذخیره می‌شود.
 */
class SupportController extends Controller
{
    public function __construct(private readonly SupportManager $support)
    {
    }

    /**
     * تنظیمات ویجت: کانال‌های فعال، ساعات کاری و شماره‌های تماس.
     */
    public function config(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->support->publicConfig(),
        ]);
    }

    /**
     * شروع گفتگوی جدید (پیام اول اجباری است).
     */
    public function store(Request $request): JsonResponse
    {
        if (! config('support.web_chat_enabled', true)) {
            return $this->error('چت پشتیبانی در حال حاضر غیرفعال است.', Response::HTTP_FORBIDDEN);
        }

        $validated = $request->validate([
            'name' => ['nullable', 'string', 'max:100'],
            'contact' => ['nullable', 'string', 'max:191'],
            'subject' => ['nullable', 'string', 'max:191'],
            'message' => ['required', 'string', 'min:2', 'max:2000'],
            'page_url' => ['nullable', 'string', 'max:500'],
        ], [
            'message.required' => 'متن پیام را بنویسید.',
            'message.min' => 'پیام باید حداقل ۲ نویسه باشد.',
            'message.max' => 'پیام حداکثر ۲۰۰۰ نویسه می‌تواند باشد.',
            'name.max' => 'نام حداکثر ۱۰۰ نویسه می‌تواند باشد.',
            'contact.max' => 'اطلاعات تماس حداکثر ۱۹۱ نویسه می‌تواند باشد.',
        ]);

        $conversation = $this->support->openConversation(
            $validated,
            $this->currentUser($request),
            $request
        );

        return response()->json([
            'success' => true,
            'message' => 'پیام شما ثبت شد؛ هرچه زودتر پاسخ می‌دهیم.',
            'data' => $this->payload($conversation),
        ], Response::HTTP_CREATED);
    }

    /**
     * دریافت گفتگو و پیام‌های آن با توکن.
     */
    public function show(Request $request, string $token): JsonResponse
    {
        $conversation = $this->resolveConversation($request, $token);

        if ($conversation instanceof JsonResponse) {
            return $conversation;
        }

        if ((int) $conversation->user_unread_count > 0) {
            $conversation->forceFill(['user_unread_count' => 0])->save();
        }

        return response()->json([
            'success' => true,
            'data' => $this->payload($conversation),
        ]);
    }

    /**
     * ارسال پیام جدید از سمت کاربر.
     */
    public function message(Request $request, string $token): JsonResponse
    {
        $conversation = $this->resolveConversation($request, $token);

        if ($conversation instanceof JsonResponse) {
            return $conversation;
        }

        if ($conversation->isClosed()) {
            return $this->error(
                'این گفتگو بسته شده است؛ لطفاً گفتگوی جدیدی شروع کنید.',
                Response::HTTP_CONFLICT
            );
        }

        $validated = $request->validate([
            'message' => ['required', 'string', 'min:1', 'max:2000'],
        ], [
            'message.required' => 'متن پیام را بنویسید.',
            'message.max' => 'پیام حداکثر ۲۰۰۰ نویسه می‌تواند باشد.',
        ]);

        $message = $this->support->postUserMessage(
            $conversation,
            $validated['message'],
            [],
            $this->currentUser($request)
        );

        return response()->json([
            'success' => true,
            'data' => $this->messagePayload($message),
        ], Response::HTTP_CREATED);
    }

    /**
     * بستن گفتگو توسط کاربر.
     */
    public function close(Request $request, string $token): JsonResponse
    {
        $conversation = $this->resolveConversation($request, $token);

        if ($conversation instanceof JsonResponse) {
            return $conversation;
        }

        if (! $conversation->isClosed()) {
            $conversation->status = SupportConversation::STATUS_CLOSED;
            $conversation->closed_at = now();
            $conversation->save();
        }

        return response()->json([
            'success' => true,
            'message' => 'گفتگو بسته شد. ممنون از همراهی شما.',
            'data' => $this->payload($conversation->refresh()),
        ]);
    }

    /**
     * یافتن گفتگو با توکن و بررسی مالکیت آن (در صورت ورود کاربر).
     */
    private function resolveConversation(
        Request $request,
        string $token
    ): SupportConversation|JsonResponse {
        $conversation = SupportConversation::query()
            ->where('token', $token)
            ->first();

        if ($conversation === null) {
            return $this->error('گفتگوی موردنظر پیدا نشد.', Response::HTTP_NOT_FOUND);
        }

        $user = $this->currentUser($request);

        if (
            $conversation->user_id !== null
            && $user !== null
            && (int) $conversation->user_id !== (int) $user->id
        ) {
            return $this->error(
                'این گفتگو به حساب کاربری دیگری تعلق دارد.',
                Response::HTTP_FORBIDDEN
            );
        }

        return $conversation;
    }

    /**
     * کاربر جاری (اگر توکن ورود در درخواست باشد)؛ برای مهمان null است.
     *
     * این مسیرها میدلویر auth ندارند تا مهمان‌ها هم بتوانند چت کنند،
     * اما اگر کاربر وارد شده باشد گفتگو به حساب او متصل می‌شود.
     */
    private function currentUser(Request $request): ?User
    {
        $user = $request->user() ?? auth('sanctum')->user();

        return $user instanceof User ? $user : null;
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(SupportConversation $conversation): array
    {
        $conversation->loadMissing('messages.admin:id,name');

        return [
            'token' => $conversation->token,
            'status' => $conversation->status,
            'status_label' => SupportConversation::statusLabel($conversation->status),
            'channel' => $conversation->channel,
            'subject' => $conversation->subject,
            'name' => $conversation->name,
            'contact' => $conversation->contact,
            'user_unread_count' => (int) $conversation->user_unread_count,
            'last_message_at' => optional($conversation->last_message_at)->toIso8601String(),
            'created_at' => optional($conversation->created_at)->toIso8601String(),
            'messages' => $conversation->messages
                ->map(fn (SupportMessage $message): array => $this->messagePayload($message))
                ->values()
                ->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function messagePayload(SupportMessage $message): array
    {
        return [
            'id' => $message->id,
            'sender' => $message->sender,
            'body' => $message->body,
            'admin_name' => $message->admin?->name,
            'created_at' => optional($message->created_at)->toIso8601String(),
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
