<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\WishlistItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class WishlistController extends Controller
{
    /**
     * فهرست علاقه‌مندی‌های کاربر جاری.
     *
     * فهرست کامل (بدون صفحه‌بندی) برگردانده می‌شود تا قلب محصولات در همهٔ
     * صفحه‌ها وضعیت درست داشته باشد؛ حجم واقعی علاقه‌مندی‌ها کوچک است.
     */
    public function index(Request $request): JsonResponse
    {
        $items = WishlistItem::query()
            ->where('user_id', $request->user()->id)
            ->whereHas('product', function ($query) {
                $query->where('is_active', true);
            })
            ->with([
                'product' => function ($query) {
                    $query
                        ->with([
                            'category:id,name,slug',
                            'brand:id,name,slug',
                            'images',
                            'variants' => function ($variantQuery) {
                                $variantQuery
                                    ->where('is_active', true)
                                    ->orderBy('id');
                            },
                        ])
                        ->withAvg([
                            'reviews as average_rating' => function ($q) {
                                $q->where('status', 'approved');
                            },
                        ], 'rating')
                        ->withCount([
                            'reviews as reviews_count' => function ($q) {
                                $q->where('status', 'approved');
                            },
                        ]);
                },
            ])
            ->latest()
            ->get();

        $payload = $items
            ->filter(function (WishlistItem $item) {
                return $item->product !== null;
            })
            ->values()
            ->map(function (WishlistItem $item) {
                return [
                    'id' => $item->id,
                    'product_id' => $item->product_id,
                    'created_at' => $item->created_at,
                    'product' => $item->product,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => [
                'items' => $payload->all(),
                'product_ids' => $payload->pluck('product_id')->values()->all(),
                'total' => $payload->count(),
            ],
        ]);
    }

    /**
     * افزودن محصول به علاقه‌مندی‌ها (تکرارپذیر).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
        ]);

        $product = Product::query()
            ->whereKey($validated['product_id'])
            ->where('is_active', true)
            ->first();

        if (! $product) {
            throw ValidationException::withMessages([
                'product_id' => 'این محصول در دسترس نیست.',
            ]);
        }

        $item = WishlistItem::firstOrCreate([
            'user_id' => $request->user()->id,
            'product_id' => $product->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => $item->wasRecentlyCreated
                ? 'محصول به علاقه‌مندی‌ها اضافه شد.'
                : 'این محصول از قبل در علاقه‌مندی‌ها بود.',
            'data' => [
                'id' => $item->id,
                'product_id' => $item->product_id,
                'is_wishlisted' => true,
            ],
        ], $item->wasRecentlyCreated ? 201 : 200);
    }

    /**
     * حذف محصول از علاقه‌مندی‌ها (اگر نبود هم خطا نمی‌دهد).
     */
    public function destroy(Request $request, int $product): JsonResponse
    {
        $deleted = WishlistItem::query()
            ->where('user_id', $request->user()->id)
            ->where('product_id', $product)
            ->delete();

        return response()->json([
            'success' => true,
            'message' => $deleted > 0
                ? 'محصول از علاقه‌مندی‌ها حذف شد.'
                : 'این محصول در علاقه‌مندی‌ها نبود.',
            'data' => [
                'product_id' => $product,
                'is_wishlisted' => false,
            ],
        ]);
    }
}
