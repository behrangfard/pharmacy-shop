<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Coupon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CouponController extends Controller
{
    /**
     * بررسی اعتبار کد تخفیف برای مبلغ سبد خرید (قبل از ثبت سفارش).
     */
    public function check(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:60'],
            'subtotal' => ['required', 'numeric', 'min:0'],
            'phone' => ['nullable', 'string', 'max:30'],
        ]);

        $coupon = Coupon::findUsable($validated['code']);

        if (! $coupon) {
            return response()->json([
                'success' => false,
                'message' => 'کد تخفیف معتبر نیست یا منقضی شده است.',
            ], 422);
        }

        $subtotal = (float) $validated['subtotal'];

        $error = $coupon->validationError($subtotal);

        if ($error !== null) {
            return response()->json([
                'success' => false,
                'message' => $error,
            ], 422);
        }

        /*
         * مسیر «بررسی کد» عمومی است؛ اگر کاربر توکن داشته باشد سقف استفادهٔ
         * شخصی و اگر مهمان باشد سقف شمارهٔ تماس همان‌جا اعلام می‌شود تا پیام
         * خطا قبل از ثبت سفارش دیده شود. تصمیم نهایی و قابل اتکا در ثبت سفارش
         * (OrderController) گرفته می‌شود.
         */
        try {
            $user = auth('sanctum')->user();
        } catch (\Throwable) {
            $user = null;
        }

        $perUserError = $user !== null
            ? $coupon->perUserUsageError($user->id)
            : $coupon->perPhoneUsageError($validated['phone'] ?? null);

        if ($perUserError !== null) {
            return response()->json([
                'success' => false,
                'message' => $perUserError,
            ], 422);
        }

        $discount = $coupon->calculateDiscount($subtotal);

        if ($discount <= 0) {
            return response()->json([
                'success' => false,
                'message' => 'این کد تخفیف برای سبد خرید فعلی مبلغی کاهش نمی‌دهد.',
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'کد تخفیف اعمال شد.',
            'data' => [
                'code' => $coupon->code,
                'title' => $coupon->title,
                'type' => $coupon->type,
                'value' => (float) $coupon->value,
                'discount' => $discount,
            ],
        ]);
    }
}
