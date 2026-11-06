<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TrustBadge;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;

/**
 * مدیریت نشان‌های اعتماد و مجوزهای فروشگاه (اینماد، ساماندهی و ...).
 *
 * این نشان‌ها در فوتر سایت نمایش داده می‌شوند. دسترسی صفحه با مجوز
 * settings.manage کنترل می‌شود (همان مجوز تنظیمات فروشگاه).
 */
class AdminTrustBadgeController extends Controller
{
    public function index(): JsonResponse
    {
        $badges = TrustBadge::query()
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $badges,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $badge = TrustBadge::create($this->validateBadge($request));

        $this->forgetStorefrontCache();

        return response()->json([
            'success' => true,
            'message' => 'نشان اعتماد با موفقیت افزوده شد.',
            'data' => $badge,
        ], 201);
    }

    public function update(Request $request, TrustBadge $trustBadge): JsonResponse
    {
        $trustBadge->update($this->validateBadge($request));

        $this->forgetStorefrontCache();

        return response()->json([
            'success' => true,
            'message' => 'نشان اعتماد ویرایش شد.',
            'data' => $trustBadge->fresh(),
        ]);
    }

    public function updateStatus(Request $request, TrustBadge $trustBadge): JsonResponse
    {
        $validated = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $trustBadge->update(['is_active' => $validated['is_active']]);

        $this->forgetStorefrontCache();

        return response()->json([
            'success' => true,
            'message' => $validated['is_active']
                ? 'نشان اعتماد فعال شد.'
                : 'نشان اعتماد غیرفعال شد.',
            'data' => $trustBadge->fresh(),
        ]);
    }

    public function destroy(TrustBadge $trustBadge): JsonResponse
    {
        $trustBadge->delete();

        $this->forgetStorefrontCache();

        return response()->json([
            'success' => true,
            'message' => 'نشان اعتماد حذف شد.',
        ]);
    }

    /**
     * بارگذاری تصویر نشان (اینماد/مجوز)؛ مسیر ذخیره‌شده در فرم قرار می‌گیرد.
     */
    public function uploadImage(Request $request): JsonResponse
    {
        $request->validate([
            'image' => [
                'required',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:2048',
            ],
        ]);

        $path = $request->file('image')->store('trust-badges', 'public');

        if (! $path) {
            return response()->json([
                'success' => false,
                'message' => 'بارگذاری تصویر انجام نشد.',
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'تصویر نشان بارگذاری شد.',
            'data' => [
                'path' => $path,
                'url' => Storage::disk('public')->url($path),
            ],
        ], 201);
    }

    private function forgetStorefrontCache(): void
    {
        Cache::forget(TrustBadgeController::STOREFRONT_CACHE_KEY);
    }

    /**
     * اعتبارسنجی و نرمال‌سازی داده‌های نشان.
     *
     * @return array<string, mixed>
     */
    private function validateBadge(Request $request): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:120'],
            'image' => ['required', 'string', 'max:2048'],
            'link' => ['nullable', 'string', 'max:2048'],
            'open_in_new_tab' => ['sometimes', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:9999'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
    }
}
