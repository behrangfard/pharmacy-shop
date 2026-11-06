<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class BrandController extends Controller
{
    public const STOREFRONT_CACHE_KEY = 'storefront.brands.index.v2';

    public function index(): JsonResponse
    {
        // آرایه کش می‌شود (نه Collection) تا پس از بازیابی از درایور database/file
        // به __PHP_Incomplete_Class تبدیل نشود و JSON همچنان آرایه بماند.
        $brands = Cache::remember(
            self::STOREFRONT_CACHE_KEY,
            now()->addMinutes(5),
            fn (): array => Brand::query()
                ->where('is_active', true)
                ->withCount([
                    'products' => function ($query) {
                        $query->where('is_active', true);
                    }
                ])
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get()
                ->toArray()
        );

        return response()->json([
            'success' => true,
            'data' => $brands,
        ]);
    }

    public function show(string $slug): JsonResponse
    {
        $brand = Brand::query()
            ->where('slug', $slug)
            ->where('is_active', true)
            ->with([
                'products' => function ($query) {
                    $query
                        ->where('is_active', true)
                        ->with(['category', 'images'])
                        ->orderByDesc('is_featured')
                        ->orderByDesc('id');
                },
            ])
            ->firstOrFail();

        return response()->json([
            'success' => true,
            'data' => $brand,
        ]);
    }
}
