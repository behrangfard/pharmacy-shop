<?php

namespace App\Services\Notifications;

use App\Models\AdminNotification;
use App\Models\Order;
use App\Models\OutboundMessage;
use App\Models\ReturnRequest;
use App\Models\SupportConversation;
use App\Models\SupportMessage;
use App\Support\OrderStatus;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * ساخت و خواندن اعلان‌های زنگولهٔ پنل مدیریت.
 *
 * همهٔ نقاط برنامه (ثبت سفارش، تغییر وضعیت، پیام پشتیبانی و مرجوعی) از همین
 * سرویس استفاده می‌کنند تا قالب اعلان‌ها یکجا نگهداری شود.
 */
class AdminNotificationService
{
    /**
     * ثبت یک اعلان جدید در زنگولهٔ پنل.
     */
    public function push(
        string $type,
        string $title,
        ?string $body = null,
        ?string $url = null,
        array $meta = []
    ): AdminNotification {
        return AdminNotification::create([
            'type' => $type,
            'title' => Str::limit(trim($title), 180, '…'),
            'body' => $body !== null && trim($body) !== ''
                ? Str::limit(trim($body), 460, '…')
                : null,
            'url' => $url,
            'meta' => $meta === [] ? null : $meta,
        ]);
    }

    /**
     * اعلان ثبت سفارش جدید توسط مشتری.
     */
    public function orderPlaced(Order $order): AdminNotification
    {
        return $this->push(
            AdminNotification::TYPE_ORDER,
            "سفارش جدید {$order->order_number} ثبت شد",
            trim(sprintf(
                '%s • %s تومان',
                (string) $order->recipient_name,
                number_format((float) $order->total),
            )),
            '/admin/orders',
            ['order_number' => $order->order_number],
        );
    }

    /**
     * اعلان تغییر وضعیت سفارش؛ نتیجهٔ ارسال پیامک هم در متن می‌آید.
     */
    public function orderStatusChanged(
        Order $order,
        string $previousStatus,
        ?OutboundMessage $sms = null
    ): AdminNotification {
        $parts = [
            (string) $order->order_number,
            OrderStatus::label($previousStatus) . ' ← ' . OrderStatus::label($order->status),
        ];

        if ($sms !== null) {
            $parts[] = $sms->status === OutboundMessage::STATUS_SENT
                ? 'پیامک برای مشتری ارسال شد'
                : 'ارسال پیامک ناموفق بود';
        }

        return $this->push(
            AdminNotification::TYPE_ORDER_STATUS,
            "وضعیت سفارش {$order->order_number} تغییر کرد",
            implode(' • ', $parts),
            '/admin/orders',
            [
                'order_number' => $order->order_number,
                'status' => $order->status,
                'sms_status' => $sms?->status,
            ],
        );
    }

    /**
     * اعلان پیام جدید مشتری در چت پشتیبانی.
     */
    public function supportMessage(
        SupportConversation $conversation,
        SupportMessage $message
    ): AdminNotification {
        return $this->push(
            AdminNotification::TYPE_SUPPORT,
            'پیام جدید در گفتگوی پشتیبانی',
            (string) $message->body,
            '/admin/support',
            [
                'conversation_id' => $conversation->id,
                'conversation_token' => $conversation->token ?? null,
            ],
        );
    }

    /**
     * اعلان ثبت درخواست مرجوعی جدید.
     */
    public function returnRequested(ReturnRequest $returnRequest): AdminNotification
    {
        $orderNumber = $returnRequest->order?->order_number;

        return $this->push(
            AdminNotification::TYPE_RETURN,
            'درخواست مرجوعی جدید ثبت شد',
            trim(sprintf(
                '%s • %s',
                $orderNumber ? "سفارش {$orderNumber}" : 'سفارش نامشخص',
                (string) $returnRequest->reason,
            )),
            '/admin/returns',
            ['return_request_id' => $returnRequest->id, 'order_number' => $orderNumber],
        );
    }

    /**
     * آخرین اعلان‌ها برای نمایش در کشوی زنگوله.
     *
     * @return Collection<int, AdminNotification>
     */
    public function recent(int $limit = 15): Collection
    {
        return AdminNotification::query()
            ->latest()
            ->limit(max(1, min($limit, 50)))
            ->get();
    }

    public function unreadCount(): int
    {
        return AdminNotification::query()->unread()->count();
    }

    /**
     * خوانده‌شدن همهٔ اعلان‌های خوانده‌نشده؛ تعداد تغییرکرده را برمی‌گرداند.
     */
    public function markAllRead(): int
    {
        return AdminNotification::query()
            ->unread()
            ->update(['read_at' => now()]);
    }
}
