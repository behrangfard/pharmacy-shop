<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Coupon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AdminCouponController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['nullable', 'string', Rule::in(['active', 'inactive'])],
            'search' => ['nullable', 'string', 'max:100'],
        ]);

        $coupons = Coupon::query()
            ->when(
                ($validated['status'] ?? null) === 'active',
                fn ($query) => $query->where('is_active', true)
            )
            ->when(
                ($validated['status'] ?? null) === 'inactive',
                fn ($query) => $query->where('is_active', false)
            )
            ->when(
                isset($validated['search']) && trim($validated['search']) !== '',
                function ($query) use ($validated) {
                    $search = trim($validated['search']);

                    $query->where(function ($subQuery) use ($search) {
                        $subQuery
                            ->where('code', 'like', "%{$search}%")
                            ->orWhere('title', 'like', "%{$search}%");
                    });
                }
            )
            ->orderByDesc('id')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $coupons,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validateCoupon($request);

        $validated['code'] = Coupon::normalizeCode($validated['code']);

        $coupon = Coupon::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'کد تخفیف با موفقیت ایجاد شد.',
            'data' => $coupon,
        ], 201);
    }

    public function update(Request $request, Coupon $coupon): JsonResponse
    {
        $validated = $this->validateCoupon($request, $coupon);

        $validated['code'] = Coupon::normalizeCode($validated['code']);

        $coupon->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'کد تخفیف با موفقیت ویرایش شد.',
            'data' => $coupon->fresh(),
        ]);
    }

    public function updateStatus(Request $request, Coupon $coupon): JsonResponse
    {
        $validated = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $coupon->update(['is_active' => $validated['is_active']]);

        return response()->json([
            'success' => true,
            'message' => $validated['is_active']
                ? 'کد تخفیف فعال شد.'
                : 'کد تخفیف غیرفعال شد.',
            'data' => $coupon->fresh(),
        ]);
    }

    public function destroy(Coupon $coupon): JsonResponse
    {
        $usedInOrders = $coupon->used_count > 0
            || DB::table('orders')
                ->where('coupon_code', $coupon->code)
                ->exists();

        if ($usedInOrders) {
            $coupon->update(['is_active' => false]);

            return response()->json([
                'success' => true,
                'message' => 'این کد در سفارش‌ها استفاده شده است؛ به‌جای حذف، غیرفعال شد.',
                'data' => $coupon->fresh(),
            ]);
        }

        $coupon->delete();

        return response()->json([
            'success' => true,
            'message' => 'کد تخفیف حذف شد.',
        ]);
    }

    private function validateCoupon(
        Request $request,
        ?Coupon $coupon = null
    ): array {
        $type = $request->input('type', Coupon::TYPE_PERCENT);

        $rules = [
            'code' => [
                'required',
                'string',
                'max:60',
                Rule::unique('coupons', 'code')->ignore($coupon?->id),
            ],
            'title' => ['nullable', 'string', 'max:255'],
            'type' => ['required', Rule::in([Coupon::TYPE_PERCENT, Coupon::TYPE_FIXED])],
            'value' => $type === Coupon::TYPE_PERCENT
                ? ['required', 'numeric', 'min:0.01', 'max:100']
                : ['required', 'numeric', 'min:0.01'],
            'min_order_total' => ['nullable', 'numeric', 'min:0'],
            'max_discount' => ['nullable', 'numeric', 'min:0'],
            'usage_limit' => ['nullable', 'integer', 'min:1'],
            'per_user_limit' => ['nullable', 'integer', 'min:1'],
            'starts_at' => ['nullable', 'date'],
            'expires_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'is_active' => ['sometimes', 'boolean'],
        ];

        $validated = $request->validate($rules);

        return array_merge([
            'type' => Coupon::TYPE_PERCENT,
            'min_order_total' => 0,
            'is_active' => true,
        ], $validated);
    }
}
