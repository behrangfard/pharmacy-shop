<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ReturnRequest;
use App\Services\Orders\OrderCouponService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AdminReturnRequestController extends Controller
{
    public function __construct(
        private readonly OrderCouponService $coupons
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['nullable', Rule::in(ReturnRequest::STATUSES)],
            'search' => ['nullable', 'string', 'max:100'],
        ]);

        // شماره تماس مشتری روی سفارش (تلفن گیرنده) نگهداری می‌شود، نه روی کاربر.
        $returns = ReturnRequest::query()
            ->with([
                'order:id,order_number,total,status,payment_status,created_at,user_id,phone',
                'user:id,name,email',
            ])
            ->when(
                $validated['status'] ?? null,
                fn ($query, $status) => $query->where('status', $status)
            )
            ->when(
                isset($validated['search']) && trim($validated['search']) !== '',
                function ($query) use ($validated) {
                    $search = trim($validated['search']);

                    $query->where(function ($subQuery) use ($search) {
                        $subQuery
                            ->where('reason', 'like', "%{$search}%")
                            ->orWhereHas('order', function ($orderQuery) use ($search) {
                                $orderQuery
                                    ->where('order_number', 'like', "%{$search}%")
                                    ->orWhere('phone', 'like', "%{$search}%");
                            })
                            ->orWhereHas('user', function ($userQuery) use ($search) {
                                $userQuery
                                    ->where('name', 'like', "%{$search}%")
                                    ->orWhere('email', 'like', "%{$search}%");
                            });
                    });
                }
            )
            ->orderByDesc('id')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $returns,
        ]);
    }

    public function updateStatus(
        Request $request,
        ReturnRequest $returnRequest
    ): JsonResponse {
        $validated = $request->validate([
            'status' => ['required', Rule::in(ReturnRequest::STATUSES)],
            'admin_note' => ['nullable', 'string', 'max:2000'],
            'refund_amount' => ['nullable', 'numeric', 'min:0'],
        ]);

        $result = DB::transaction(function () use ($returnRequest, $validated) {
            $returnRequest->status = $validated['status'];
            $returnRequest->admin_note = $validated['admin_note']
                ?? $returnRequest->admin_note;

            if (array_key_exists('refund_amount', $validated)) {
                $returnRequest->refund_amount = $validated['refund_amount'];
            }

            if ($validated['status'] === ReturnRequest::STATUS_REFUNDED) {
                $order = $returnRequest->order;

                if ($order === null) {
                    return [
                        'error' => 'سفارش مربوط به این درخواست پیدا نشد.',
                        'status' => 404,
                    ];
                }

                if ($returnRequest->refund_amount === null) {
                    $returnRequest->refund_amount = $order->total;
                }

                /*
                 * بازپرداخت یعنی تخفیف کوپن هم برگشته است؛ سهمیه فقط یک‌بار
                 * آزاد می‌شود (اگر سفارش قبلاً refunded باشد دوباره کم نمی‌کنیم).
                 */
                $alreadyRefunded = $order->payment_status === 'refunded';

                $order->payment_status = 'refunded';
                $order->save();

                if (! $alreadyRefunded) {
                    $this->coupons->release($order);
                }
            }

            $returnRequest->save();

            return [
                'return_request' => $returnRequest->fresh()->load([
                    'order:id,order_number,total,status,payment_status,created_at,user_id,phone',
                    'user:id,name,email',
                ]),
            ];
        }, 3);

        if (isset($result['error'])) {
            return response()->json([
                'success' => false,
                'message' => $result['error'],
            ], $result['status']);
        }

        return response()->json([
            'success' => true,
            'message' => 'وضعیت درخواست مرجوعی به‌روزرسانی شد.',
            'data' => $result['return_request'],
        ]);
    }
}
