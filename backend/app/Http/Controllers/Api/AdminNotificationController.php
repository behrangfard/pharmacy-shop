<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdminNotification;
use App\Services\Notifications\AdminNotificationService;
use Illuminate\Http\JsonResponse;

/**
 * API زنگولهٔ اعلان پنل مدیریت.
 */
class AdminNotificationController extends Controller
{
    public function __construct(
        private readonly AdminNotificationService $notifications
    ) {
    }

    /**
     * آخرین اعلان‌ها و تعداد خوانده‌نشده‌ها.
     */
    public function index(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => [
                'unread_count' => $this->notifications->unreadCount(),
                'items' => $this->notifications
                    ->recent(15)
                    ->map(fn (AdminNotification $notification) => $this->present($notification))
                    ->values(),
            ],
        ]);
    }

    /**
     * خوانده‌شده علامت زدن یک اعلان.
     */
    public function markRead(AdminNotification $notification): JsonResponse
    {
        $notification->markAsRead();

        return response()->json([
            'success' => true,
            'data' => [
                'unread_count' => $this->notifications->unreadCount(),
                'item' => $this->present($notification->fresh()),
            ],
        ]);
    }

    /**
     * خوانده‌شده علامت زدن همهٔ اعلان‌ها.
     */
    public function markAllRead(): JsonResponse
    {
        $updated = $this->notifications->markAllRead();

        return response()->json([
            'success' => true,
            'message' => $updated > 0
                ? 'همهٔ اعلان‌ها خوانده‌شده شدند.'
                : 'اعلان خوانده‌نشده‌ای وجود ندارد.',
            'data' => [
                'unread_count' => $this->notifications->unreadCount(),
                'updated' => $updated,
            ],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function present(AdminNotification $notification): array
    {
        return [
            'id' => $notification->id,
            'type' => $notification->type,
            'title' => $notification->title,
            'body' => $notification->body,
            'url' => $notification->url,
            'meta' => $notification->meta ?? [],
            'read' => $notification->isRead(),
            'created_at' => $notification->created_at?->toIso8601String(),
        ];
    }
}
