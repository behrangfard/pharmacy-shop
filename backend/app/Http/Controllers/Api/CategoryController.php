<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class CategoryController extends Controller
{
    /**
     * کلید کش فهرست دسته‌بندی‌های فروشگاه.
     * با هر تغییر در پنل مدیران (ایجاد/ویرایش/حذف) پاک می‌شود.
     */
    public const STOREFRONT_CACHE_KEY = 'storefront.categories.index.v2';

    public function index(): JsonResponse
    {
        $categories = Cache::remember(
            self::STOREFRONT_CACHE_KEY,
            now()->addMinutes(5),
            function (): array {
                return Category::query()
                    ->where('is_active', true)
                    ->whereNull('parent_id')
                    ->with([
                        'children' => function ($query) {
                            $query
                                ->where('is_active', true)
                                ->orderBy('sort_order')
                                ->orderBy('name');
                        },
                    ])
                    ->orderBy('sort_order')
                    ->orderBy('name')
                    ->get()
                    ->toArray();
            }
        );

        return response()->json([
            'success' => true,
            'data' => $categories,
        ]);
    }

    public function show(string $slug): JsonResponse
    {
        $category = Category::query()
            ->where('slug', $slug)
            ->where('is_active', true)
            ->with([
                'children' => function ($query) {
                    $query
                        ->where('is_active', true)
                        ->orderBy('sort_order')
                        ->orderBy('name');
                },
                'products' => function ($query) {
                    $query
                        ->where('is_active', true)
                        ->with(['brand', 'images'])
                        ->orderByDesc('is_featured')
                        ->orderByDesc('id');
                },
            ])
            ->firstOrFail();

        return response()->json([
            'success' => true,
            'data' => $category,
        ]);
    }
}
