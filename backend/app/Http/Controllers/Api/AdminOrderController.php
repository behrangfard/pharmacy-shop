<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminOrderController extends Controller
{
    /**
     * نمایش فهرست سفارش‌ها برای مدیر
     */
    public function index(Request $request)
    {
        $validated = $request->validate([
            'status' => [
                'nullable',
                'string',
                Rule::in([
                    'pending',
                    'processing',
                    'shipped',
                    'delivered',
                    'cancelled',
                ]),
            ],
            'payment_status' => [
                'nullable',
                'string',
                Rule::in([
                    'unpaid',
                    'paid',
                    'failed',
                    'refunded',
                ]),
            ],
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $orders = Order::query()
            ->with(['items.product.images', 'user'])
            ->when(
                $validated['status'] ?? null,
                fn ($query, $status) => $query->where('status', $status)
            )
            ->when(
                $validated['payment_status'] ?? null,
                fn ($query, $paymentStatus) => $query->where(
                    'payment_status',
                    $paymentStatus
                )
            )
            ->when(
                isset($validated['search']) && trim($validated['search']) !== '',
                function ($query) use ($validated) {
                    $search = trim($validated['search']);

                    $query->where(function ($subQuery) use ($search) {
                        $subQuery
                            ->where('order_number', 'like', "%{$search}%")
                            ->orWhere('recipient_name', 'like', "%{$search}%")
                            ->orWhere('phone', 'like', "%{$search}%")
                            ->orWhereHas('user', function ($userQuery) use ($search) {
                                $userQuery
                                    ->where('name', 'like', "%{$search}%")
                                    ->orWhere('email', 'like', "%{$search}%");
                            });
                    });
                }
            )
            ->latest()
            ->paginate($validated['per_page'] ?? 15);

        return response()->json([
            'success' => true,
            'data' => $orders,
        ]);
    }

    /**
     * نمایش جزئیات یک سفارش برای مدیر
     */
    public function show(string $orderNumber)
    {
        $order = Order::query()
            ->with(['items.product.images', 'user'])
            ->where('order_number', $orderNumber)
            ->first();

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'سفارش موردنظر پیدا نشد.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $order,
        ]);
    }

    /**
     * تغییر وضعیت سفارش توسط مدیر
     */
    public function updateStatus(Request $request, string $orderNumber)
    {
        $validated = $request->validate([
            'status' => [
                'required',
                'string',
                Rule::in([
                    'pending',
                    'processing',
                    'shipped',
                    'delivered',
                    'cancelled',
                ]),
            ],
        ]);

        $order = Order::query()
            ->where('order_number', $orderNumber)
            ->first();

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'سفارش موردنظر پیدا نشد.',
            ], 404);
        }

        $newStatus = $validated['status'];

        if ($order->status === 'cancelled' && $newStatus !== 'cancelled') {
            return response()->json([
                'success' => false,
                'message' => 'سفارش لغوشده را نمی‌توان دوباره فعال کرد.',
            ], 422);
        }

        if ($order->status === 'delivered' && $newStatus !== 'delivered') {
            return response()->json([
                'success' => false,
                'message' => 'وضعیت سفارش تحویل‌شده قابل تغییر نیست.',
            ], 422);
        }

        if ($newStatus === 'cancelled') {
            if ($order->payment_status === 'paid') {
                return response()->json([
                    'success' => false,
                    'message' => 'لغو سفارش پرداخت‌شده از این مسیر امکان‌پذیر نیست.',
                ], 422);
            }

            return response()->json([
                'success' => false,
                'message' => 'لغو سفارش تا زمان پیاده‌سازی بازگرداندن امن موجودی پشتیبانی نمی‌شود.',
            ], 422);
        }

        if (
            in_array($newStatus, ['processing', 'shipped', 'delivered'], true)
            && $order->payment_status !== 'paid'
        ) {
            return response()->json([
                'success' => false,
                'message' => 'برای انتخاب این وضعیت، سفارش باید پرداخت شده باشد.',
            ], 422);
        }

        $order->update([
            'status' => $newStatus,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'وضعیت سفارش با موفقیت به‌روزرسانی شد.',
            'data' => $order->fresh()->load([
                'items.product.images',
                'user',
            ]),
        ]);
    }
}
