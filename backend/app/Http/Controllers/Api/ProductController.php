<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    /**
     * Normalize Persian and Arabic search text.
     */
    private function normalizeSearch(string $value): string
    {
        $value = str_replace(
            ['ي', 'ى', 'ك', 'ـ'],
            ['ی', 'ی', 'ک', ''],
            $value
        );

        // Remove normal spaces, half-spaces and invisible characters.
        $value = preg_replace(
            '/[\s\x{200C}\x{200D}\x{FEFF}]+/u',
            '',
            $value
        );

        return trim($value ?? '');
    }

    /**
     * Return a normalized SQL expression for a product column.
     */
    private function normalizedColumn(string $column): string
    {
        return "REPLACE(
            REPLACE(
                REPLACE(
                    REPLACE(
                        REPLACE(
                            REPLACE(COALESCE({$column}, ''), '‌', ''),
                            '‍', ''
                        ),
                        ' ', ''
                    ),
                    'ي', 'ی'
                ),
                'ك', 'ک'
            ),
            'ـ', ''
        )";
    }

    /**
     * Public product listing.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Product::query()
            ->where('is_active', true)
            ->with([
                'category',
                'brand',
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

        // Search products with Persian text normalization.
        if ($request->filled('search')) {
            $search = $this->normalizeSearch(
                $request->string('search')->toString()
            );

            if ($search !== '') {
                $searchPattern = "%{$search}%";

                $nameColumn = $this->normalizedColumn('name');
                $skuColumn = $this->normalizedColumn('sku');
                $descriptionColumn = $this->normalizedColumn(
                    'short_description'
                );

                $query->where(function ($q) use (
                    $searchPattern,
                    $nameColumn,
                    $skuColumn,
                    $descriptionColumn
                ) {
                    $q->whereRaw(
                        "{$nameColumn} LIKE ?",
                        [$searchPattern]
                    )
                        ->orWhereRaw(
                            "{$skuColumn} LIKE ?",
                            [$searchPattern]
                        )
                        ->orWhereRaw(
                            "{$descriptionColumn} LIKE ?",
                            [$searchPattern]
                        );
                });
            }
        }

        // Category filter (a parent category also returns its sub-categories).
        if ($request->filled('category')) {
            $categoryValue = $request->string('category')->toString();

            $category = Category::query()
                ->where('slug', $categoryValue)
                ->where('is_active', true)
                ->with(['children' => function ($childQuery) {
                    $childQuery->where('is_active', true);
                }])
                ->first();

            if ($category) {
                $categoryIds = collect([$category->id])
                    ->merge($category->children->pluck('id'))
                    ->all();

                $query->whereIn('category_id', $categoryIds);
            } else {
                $query->whereHas('category', function ($q) use ($categoryValue) {
                    $q->where('slug', $categoryValue);
                });
            }
        }

        // Brand filter.
        if ($request->filled('brand')) {
            $query->whereHas('brand', function ($q) use ($request) {
                $q->where(
                    'slug',
                    $request->string('brand')->toString()
                );
            });
        }

        // Featured products.
        if ($request->boolean('featured')) {
            $query->where('is_featured', true);
        }

        // New products.
        if ($request->boolean('new')) {
            $query->where('is_new', true);
        }

        // Sorting.
        $sort = $request->string('sort', 'latest')->toString();

        match ($sort) {
            'price_asc' => $query->orderBy('price', 'asc'),
            'price_desc' => $query->orderBy('price', 'desc'),
            'popular' => $query->orderByDesc('sales_count'),
            default => $query->orderByDesc('id'),
        };

        // Pagination.
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

    /**
     * Public product details.
     */
    public function show(string $slug): JsonResponse
    {
        $product = Product::query()
            ->where('slug', $slug)
            ->where('is_active', true)
            ->with([
                'category',
                'brand',
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
            ])
            ->firstOrFail();

        $product->increment('views_count');

        return response()->json([
            'success' => true,
            'data' => $product,
        ]);
    }

    /**
     * Featured products.
     */
    public function featured(): JsonResponse
    {
        $products = Product::query()
            ->where('is_active', true)
            ->where('is_featured', true)
            ->with([
                'brand',
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
            ])
            ->orderByDesc('id')
            ->limit(12)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $products,
        ]);
    }

    /**
     * Newest products.
     */
    public function newest(): JsonResponse
    {
        $products = Product::query()
            ->where('is_active', true)
            ->where('is_new', true)
            ->with([
                'brand',
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
            ])
            ->orderByDesc('id')
            ->limit(12)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $products,
        ]);
    }
}
