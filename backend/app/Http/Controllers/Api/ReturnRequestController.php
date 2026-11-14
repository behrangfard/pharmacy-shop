<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\ReturnRequest;
use App\Models\StoreSetting;
use App\Services\Notifications\AdminNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class ReturnRequestController extends Controller
{
    public function __construct(
        private readonly AdminNotificationService $notifications
    ) {
    }

    /**
     * فهرست درخواست‌های مرجوعی کاربر جاری.
     */
    public function index(Request $request): JsonResponse
    {
        $returns = ReturnRequest::query()
            ->where('user_id', $request->user()->id)
            ->with(['order:id,order_number,total,status,payment_status,created_at'])
            ->orderByDesc('id')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $returns,
        ]);
    }

    /**
     * ثبت درخواست مرجوعی برای یک سفارش تحویل‌شده.
     */
    public function store(Request $request, string $orderNumber): JsonResponse
    {
        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
        ]);

        $order = Order::query()
            ->where('user_id', $request->user()->id)
            ->where('order_number', $orderNumber)
            ->first();

        if (! $order) {
            return response()->json([
                'success' => false,
                'message' => 'سفارش موردنظر پیدا نشد.',
            ], 404);
        }

        if (in_array($order->status, ['cancelled', 'canceled'], true)) {
            return response()->json([
                'success' => false,
                'message' => 'برای سفارش لغوشده امکان ثبت مرجوعی وجود ندارد.',
            ], 422);
        }

        if (! in_array($order->status, ['delivered', 'completed'], true)) {
            return response()->json([
                'success' => false,
                'message' => 'درخواست مرجوعی فقط برای سفارش‌های تحویل‌شده ثبت می‌شود.',
            ], 422);
        }

        if ($order->payment_status !== 'paid') {
            return response()->json([
                'success' => false,
                'message' => 'فقط سفارش‌های پرداخت‌شده قابل مرجوع کردن هستند.',
            ], 422);
        }

        if ($order->returnRequest()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'برای این سفارش قبلاً درخواست مرجوعی ثبت شده است.',
            ], 422);
        }

        $policyDays = (int) StoreSetting::getValue('return_policy_days', 7);

        if (
            $policyDays > 0
            && $order->created_at !== null
            && $order->created_at->diffInDays(now()) > $policyDays
        ) {
            return response()->json([
                'success' => false,
                'message' => "مهلت مرجوعی این سفارش ({$policyDays} روز) به پایان رسیده است.",
            ], 422);
        }

        $returnRequest = ReturnRequest::create([
            'order_id' => $order->id,
            'user_id' => $request->user()->id,
            'status' => ReturnRequest::STATUS_PENDING,
            'reason' => $validated['reason'],
            'description' => $validated['description'] ?? null,
        ]);

        // اعلان زنگولهٔ پنل؛ خطای اعلان نباید ثبت درخواست را متوقف کند.
        try {
            $this->notifications->returnRequested($returnRequest->load('order'));
        } catch (Throwable) {
            // درخواست ثبت شده است.
        }

        return response()->json([
            'success' => true,
            'message' => 'درخواست مرجوعی شما ثبت شد و در انتظار بررسی است.',
            'data' => $returnRequest->load(
                'order:id,order_number,total,status,payment_status,created_at'
            ),
        ], 201);
    }
}
