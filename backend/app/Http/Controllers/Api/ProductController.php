<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Product::query()
            ->where('is_active', true)
            ->with([
                'category',
                'brand',
                'images',
                'variants',
            ]);

        if ($request->filled('search')) {
            $search = trim($request->string('search')->toString());

            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%")
                    ->orWhere('short_description', 'like', "%{$search}%");
            });
        }

        if ($request->filled('category')) {
            $query->whereHas('category', function ($q) use ($request) {
                $q->where('slug', $request->string('category')->toString());
            });
        }

        if ($request->filled('brand')) {
            $query->whereHas('brand', function ($q) use ($request) {
                $q->where('slug', $request->string('brand')->toString());
            });
        }

        if ($request->boolean('featured')) {
            $query->where('is_featured', true);
        }

        if ($request->boolean('new')) {
            $query->where('is_new', true);
        }

        $sort = $request->string('sort', 'latest')->toString();

        match ($sort) {
            'price_asc' => $query->orderBy('price', 'asc'),
            'price_desc' => $query->orderBy('price', 'desc'),
            'popular' => $query->orderByDesc('sales_count'),
            default => $query->orderByDesc('id'),
        };

        $perPage = min(
            max((int) $request->input('per_page', 12), 1),
            48
        );

        $products = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $products,
        ]);
    }

    public function show(string $slug): JsonResponse
    {
        $product = Product::query()
            ->where('slug', $slug)
            ->where('is_active', true)
            ->with([
                'category',
                'brand',
                'images',
                'variants',
            ])
            ->firstOrFail();

        $product->increment('views_count');

        return response()->json([
            'success' => true,
            'data' => $product,
        ]);
    }

    public function featured(): JsonResponse
    {
        $products = Product::query()
            ->where('is_active', true)
            ->where('is_featured', true)
            ->with(['brand', 'images'])
            ->orderByDesc('id')
            ->limit(12)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $products,
        ]);
    }

    public function newest(): JsonResponse
    {
        $products = Product::query()
            ->where('is_active', true)
            ->where('is_new', true)
            ->with(['brand', 'images'])
            ->orderByDesc('id')
            ->limit(12)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $products,
        ]);
    }
}