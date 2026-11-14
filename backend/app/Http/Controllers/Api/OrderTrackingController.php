<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\Messaging\Support\PhoneNumber;
use App\Support\GuestAccessCode;
use App\Support\OrderStatus;
use App\Support\PaymentMethod;
use Illuminate\Http\Request;

/**
 * رهگیری عمومی سفارش.
 *
 * مشتری (به‌ویژه سفارش مهمان) با ترکیب «شماره سفارش + شماره تماس» وضعیت
 * سفارش را می‌بیند؛ هیچ بخشی از پاسخ، هویت کامل یا امکان تغییر سفارش را
 * نمی‌دهد. شماره تماس در پاسخ ماسک می‌شود.
 */
class OrderTrackingController extends Controller
{
    public function track(Request $request)
    {
        $validated = $request->validate([
            'order_number' => ['required', 'string', 'max:50'],
            'phone' => ['required', 'string', 'max:30'],
        ]);

        $orderNumber = trim($validated['order_number']);
        $phone = PhoneNumber::normalize($validated['phone']);

        $order = Order::query()
            ->where('order_number', $orderNumber)
            ->where(function ($query) use ($validated, $phone): void {
                $query->where('phone', $validated['phone']);

                if ($phone !== '') {
                    $query->orWhere('phone', $phone);
                }
            })
            ->with([
                'items.product.images',
                'items.variant',
                'shipments.events',
            ])
            ->first();

        if ($order === null) {
            return response()->json([
                'success' => false,
                'message' => 'سفارشی با این شماره سفارش و شماره تماس پیدا نشد.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'order_number' => $order->order_number,
                'status' => $order->status,
                'status_label' => OrderStatus::label($order->status),
                'payment_status' => $order->payment_status,
                'payment_method' => $order->payment_method
                    ?? PaymentMethod::ONLINE,
                'recipient_name' => $order->recipient_name,
                'phone_masked' => $this->maskPhone($order->phone),
                'address' => $order->address,
                'created_at' => $order->created_at?->toIso8601String(),
                'shipped_at' => $order->shipped_at?->toIso8601String(),
                'delivered_at' => $order->delivered_at?->toIso8601String(),
                'shipping_method' => $order->shipping_method,
                'tracking_code' => $order->tracking_code,
                'notes' => $order->notes,
                'subtotal' => (float) $order->subtotal,
                'discount' => (float) $order->discount,
                'coupon_discount' => (float) $order->coupon_discount,
                'shipping_cost' => (float) $order->shipping_cost,
                'tax_amount' => (float) $order->tax_amount,
                'total' => (float) $order->total,
                'items' => $order->items->map(
                    fn ($item): array => [
                        'product_name' => $item->product_name,
                        'variant_name' => $item->variant_name,
                        'color_name' => $item->color_name,
                        'pack_colors' => $item->pack_colors,
                        'quantity' => (int) $item->quantity,
                        'unit_price' => (float) $item->unit_price,
                        'total_price' => (float) $item->total_price,
                    ]
                )->values(),
                'shipments' => $order->shipments->map(
                    fn ($shipment): array => [
                        'shipment_number' => $shipment->shipment_number,
                        'status' => $shipment->status,
                        'status_label' => $shipment->statusLabel(),
                        'carrier' => $shipment->carrier,
                        'tracking_code' => $shipment->tracking_code,
                        'shipped_at' => $shipment->shipped_at?->toIso8601String(),
                        'delivered_at' => $shipment->delivered_at?->toIso8601String(),
                        'events' => $shipment->events->map(
                            fn ($event): array => [
                                'status' => $event->status,
                                'note' => $event->note,
                                'happened_at' => $event->happened_at?->toIso8601String(),
                            ]
                        )->values(),
                    ]
                )->values(),
            ],
        ]);
    }

    /**
     * بازیابی دسترسی مهمان با «شماره سفارش + کد پیگیری».
     *
     * هویت مهمان در localStorage نگه داشته می‌شود؛ اگر مرورگر عوض شود یا
     * داده‌هایش پاک شود، این مسیر همان شناسهٔ مرورگر را برمی‌گرداند تا
     * فاکتور و لغو سفارش دوباره در دسترس باشد. فقط سفارش مهمان (بدون
     * user_id) کد پیگیری دارد؛ پاسخ برای هر خطا یکسان است تا وجود سفارش لو نرود.
     */
    public function recoverAccess(Request $request)
    {
        $validated = $request->validate([
            'order_number' => ['required', 'string', 'max:50'],
            'access_code' => ['required', 'string', 'max:20'],
        ]);

        // کد با قالب نادرست پیش از هر جست‌وجویی در دیتابیس رد می‌شود.
        $order = GuestAccessCode::isValid($validated['access_code'])
            ? Order::query()
                ->where('order_number', trim($validated['order_number']))
                ->whereNull('user_id')
                ->first()
            : null;

        if (
            $order === null
            || $order->guest_token === null
            || ! GuestAccessCode::matches(
                $order->guest_access_code,
                $validated['access_code']
            )
        ) {
            return response()->json([
                'success' => false,
                'message' => 'شماره سفارش یا کد پیگیری درست نیست.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'دسترسی به این سفارش بازیابی شد.',
            'data' => [
                'guest_token' => $order->guest_token,
                'guest_access_code' => $order->guest_access_code,
                'order_number' => $order->order_number,
                'status' => $order->status,
                'status_label' => OrderStatus::label($order->status),
                'total' => (float) $order->total,
                'created_at' => $order->created_at?->toIso8601String(),
            ],
        ]);
    }

    /**
     * ماسک شمارهٔ تماس: 0912***4567
     */
    private function maskPhone(?string $phone): string
    {
        $digits = PhoneNumber::normalize($phone);

        if (strlen($digits) === 11) {
            return substr($digits, 0, 4)
                .'***'
                .substr($digits, -4);
        }

        return $digits;
    }
}
