<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\User;
use App\Models\WishlistItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * آمار و گزارش علاقه‌مندی‌های مشتریان برای پنل مدیریت.
 *
 * - overview: کارت‌های آماری، نمودار روند، محصولات/دسته‌های پرطرفدار و
 *   مشتریانی که بیشترین علاقه‌مندی را دارند.
 * - products: فهرست صفحه‌بندی‌شدهٔ محصولات به‌همراه تعداد علاقه‌مندی.
 * - customers: فهرست صفحه‌بندی‌شدهٔ مشتریان به‌همراه تعداد علاقه‌مندی و
 *   آخرین زمان افزودن.
 * - customerItems: اقلام علاقه‌مندی یک مشتری.
 *
 * همهٔ مسیرها با مجوز customers.manage محافظت می‌شوند.
 */
class AdminWishlistController extends Controller
{
    /** ستون‌های سبک محصول برای فهرست‌ها (بدون توضیحات سنگین) */
    private const PRODUCT_COLUMNS = [
        'id',
        'name',
        'slug',
        'price',
        'compare_price',
        'discount_percent',
        'stock',
        'thumbnail',
        'is_active',
        'category_id',
        'sales_count',
    ];

    /**
     * داشبورد آماری علاقه‌مندی‌ها.
     */
    public function overview(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'days' => ['nullable', 'integer', Rule::in([7, 14, 30, 90])],
        ]);

        $days = (int) ($validated['days'] ?? 14);
        $trendStart = Carbon::now()->subDays($days - 1)->startOfDay();
        $weekAgo = Carbon::now()->subDays(7);
        $monthAgo = Carbon::now()->subDays(30);

        $totalItems = WishlistItem::query()->count();

        $customersCount = WishlistItem::query()
            ->distinct()
            ->count('user_id');

        $productsCount = WishlistItem::query()
            ->distinct()
            ->count('product_id');

        $itemsLastWeek = WishlistItem::query()
            ->where('created_at', '>=', $weekAgo)
            ->count();

        $itemsLastMonth = WishlistItem::query()
            ->where('created_at', '>=', $monthAgo)
            ->count();

        $activeCustomers = WishlistItem::query()
            ->where('created_at', '>=', $monthAgo)
            ->distinct()
            ->count('user_id');

        // اقلامی که مشتری بعداً همان محصول را خریده است (تبدیل علاقه‌مندی به خرید)
        $convertedItems = WishlistItem::query()
            ->whereExists(function ($query) {
                $query
                    ->select(DB::raw('1'))
                    ->from('order_items')
                    ->join('orders', 'orders.id', '=', 'order_items.order_id')
                    ->whereColumn('orders.user_id', 'wishlist_items.user_id')
                    ->whereColumn('order_items.product_id', 'wishlist_items.product_id')
                    ->where('orders.status', '!=', 'cancelled');
            })
            ->count();

        $outOfStockProducts = Product::query()
            ->where('stock', '<=', 0)
            ->has('wishlistItems')
            ->count();

        $inactiveProducts = Product::query()
            ->where('is_active', false)
            ->has('wishlistItems')
            ->count();

        $summary = [
            'total_items' => $totalItems,
            'customers_count' => $customersCount,
            'products_count' => $productsCount,
            'items_last_7_days' => $itemsLastWeek,
            'items_last_30_days' => $itemsLastMonth,
            'active_customers_30_days' => $activeCustomers,
            'avg_items_per_customer' => $customersCount > 0
                ? round($totalItems / $customersCount, 1)
                : 0,
            'converted_items' => $convertedItems,
            'conversion_rate' => $totalItems > 0
                ? round(($convertedItems / $totalItems) * 100, 1)
                : 0,
            'out_of_stock_products' => $outOfStockProducts,
            'inactive_products' => $inactiveProducts,
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'summary' => $summary,
                'days' => $days,
                'trend' => $this->trend($trendStart),
                'top_products' => $this->topProducts(),
                'top_categories' => $this->topCategories(),
                'top_customers' => $this->topCustomers(),
                'recent' => $this->recentItems(),
            ],
        ]);
    }

    /**
     * فهرست صفحه‌بندی‌شدهٔ محصولاتی که در علاقه‌مندی‌ها ذخیره شده‌اند.
     */
    public function products(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'category_id' => ['nullable', 'integer', 'min:1'],
            'stock' => ['nullable', Rule::in(['all', 'in_stock', 'out_of_stock'])],
            'sort_by' => [
                'nullable',
                Rule::in(['wishlist_count', 'name', 'price', 'stock', 'sales_count']),
            ],
            'sort_direction' => ['nullable', Rule::in(['asc', 'desc'])],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $search = trim((string) ($validated['search'] ?? ''));
        $stock = $validated['stock'] ?? 'all';
        $sortBy = $validated['sort_by'] ?? 'wishlist_count';
        $sortDirection = $validated['sort_direction'] ?? 'desc';

        $products = Product::query()
            ->select(self::PRODUCT_COLUMNS)
            ->with('category:id,name,slug')
            ->withCount('wishlistItems as wishlist_count')
            ->addSelect([
                'customers_count' => WishlistItem::query()
                    ->selectRaw('COUNT(DISTINCT user_id)')
                    ->whereColumn('wishlist_items.product_id', 'products.id'),
            ])
            ->has('wishlistItems')
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($subQuery) use ($search) {
                    $subQuery
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('slug', 'like', "%{$search}%")
                        ->orWhere('sku', 'like', "%{$search}%");
                });
            })
            ->when(
                ! empty($validated['category_id']),
                fn ($query) => $query->where('category_id', $validated['category_id'])
            )
            ->when($stock === 'in_stock', fn ($query) => $query->where('stock', '>', 0))
            ->when($stock === 'out_of_stock', fn ($query) => $query->where('stock', '<=', 0))
            ->orderBy($sortBy, $sortDirection)
            ->orderBy('id', 'desc')
            ->paginate($validated['per_page'] ?? 15)
            ->withQueryString();

        return response()->json([
            'success' => true,
            'data' => $products,
            'summary' => [
                'products_with_wishlist' => Product::query()->has('wishlistItems')->count(),
                'total_items' => WishlistItem::query()->count(),
            ],
        ]);
    }

    /**
     * فهرست صفحه‌بندی‌شدهٔ مشتریان به‌همراه تعداد و آخرین علاقه‌مندی.
     */
    public function customers(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'only' => ['nullable', Rule::in(['with_wishlist', 'all'])],
            'sort_by' => [
                'nullable',
                Rule::in([
                    'wishlist_count',
                    'last_wishlist_at',
                    'orders_count',
                    'total_spent',
                    'name',
                    'created_at',
                ]),
            ],
            'sort_direction' => ['nullable', Rule::in(['asc', 'desc'])],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $search = trim((string) ($validated['search'] ?? ''));
        $only = $validated['only'] ?? 'with_wishlist';
        $sortBy = $validated['sort_by'] ?? 'wishlist_count';
        $sortDirection = $validated['sort_direction'] ?? 'desc';

        $customers = User::query()
            ->select(['id', 'name', 'email', 'phone', 'created_at'])
            ->where('role', 'customer')
            ->withCount('wishlistItems as wishlist_count')
            ->withMax('wishlistItems as last_wishlist_at', 'created_at')
            ->withCount([
                'orders as orders_count' => function ($query) {
                    $query->where('status', '!=', 'cancelled');
                },
            ])
            ->withSum([
                'orders as total_spent' => function ($query) {
                    $query
                        ->where('payment_status', 'paid')
                        ->where('status', '!=', 'cancelled');
                },
            ], 'total')
            ->when($only === 'with_wishlist', fn ($query) => $query->has('wishlistItems'))
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($subQuery) use ($search) {
                    $subQuery
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%");
                });
            })
            ->orderBy($sortBy, $sortDirection)
            ->orderBy('id', 'desc')
            ->paginate($validated['per_page'] ?? 15)
            ->withQueryString();

        return response()->json([
            'success' => true,
            'data' => $customers,
        ]);
    }

    /**
     * اقلام علاقه‌مندی یک مشتری برای بررسی در پنل.
     */
    public function customerItems(int $customerId): JsonResponse
    {
        $customer = User::query()
            ->where('role', 'customer')
            ->whereKey($customerId)
            ->first();

        if (! $customer) {
            return response()->json([
                'success' => false,
                'message' => 'مشتری موردنظر پیدا نشد.',
            ], 404);
        }

        $items = WishlistItem::query()
            ->where('user_id', $customer->id)
            ->with([
                'product' => function ($query) {
                    $query
                        ->select(self::PRODUCT_COLUMNS)
                        ->with('category:id,name,slug');
                },
            ])
            ->latest()
            ->get()
            ->filter(fn (WishlistItem $item) => $item->product !== null)
            ->values();

        $totalValue = $items->sum(function (WishlistItem $item) {
            $price = (float) $item->product->price;
            $discount = (float) ($item->product->discount_percent ?? 0);

            return $price - (($price * $discount) / 100);
        });

        return response()->json([
            'success' => true,
            'data' => [
                'customer' => [
                    'id' => $customer->id,
                    'name' => $customer->name,
                    'email' => $customer->email,
                    'phone' => $customer->phone,
                    'created_at' => $customer->created_at,
                ],
                'items' => $items
                    ->map(fn (WishlistItem $item) => [
                        'id' => $item->id,
                        'created_at' => $item->created_at,
                        'product' => $item->product,
                    ])
                    ->all(),
                'summary' => [
                    'items_count' => $items->count(),
                    'total_value' => round((float) $totalValue, 2),
                    'last_added_at' => $items->first()?->created_at,
                    'out_of_stock_count' => $items
                        ->filter(fn (WishlistItem $item) => (int) $item->product->stock <= 0)
                        ->count(),
                ],
            ],
        ]);
    }

    /**
     * روند روزانهٔ افزودن به علاقه‌مندی‌ها از تاریخ شروع تا امروز.
     *
     * @return list<array{date: string, count: int}>
     */
    private function trend(Carbon $start): array
    {
        $rows = WishlistItem::query()
            ->where('created_at', '>=', $start)
            ->selectRaw('DATE(created_at) as day, COUNT(*) as total')
            ->groupBy('day')
            ->pluck('total', 'day');

        $series = [];
        $cursor = $start->copy()->startOfDay();
        $today = Carbon::now()->startOfDay();

        while ($cursor->lessThanOrEqualTo($today)) {
            $key = $cursor->toDateString();

            $series[] = [
                'date' => $key,
                'count' => (int) ($rows[$key] ?? 0),
            ];

            $cursor->addDay();
        }

        return $series;
    }

    /**
     * پرطرفدارترین محصولات بر اساس تعداد علاقه‌مندی.
     */
    private function topProducts(): array
    {
        return Product::query()
            ->select(self::PRODUCT_COLUMNS)
            ->with('category:id,name,slug')
            ->withCount('wishlistItems as wishlist_count')
            ->addSelect([
                'customers_count' => WishlistItem::query()
                    ->selectRaw('COUNT(DISTINCT user_id)')
                    ->whereColumn('wishlist_items.product_id', 'products.id'),
            ])
            ->has('wishlistItems')
            ->orderByDesc('wishlist_count')
            ->limit(10)
            ->get()
            ->toArray();
    }

    /**
     * دسته‌بندی‌هایی که بیشترین علاقه‌مندی را دارند.
     */
    private function topCategories(): array
    {
        return WishlistItem::query()
            ->join('products', 'products.id', '=', 'wishlist_items.product_id')
            ->leftJoin('categories', 'categories.id', '=', 'products.category_id')
            ->groupBy('categories.id', 'categories.name')
            ->orderByDesc('items')
            ->limit(6)
            ->get([
                DB::raw('categories.id as category_id'),
                DB::raw("COALESCE(categories.name, 'بدون دسته‌بندی') as name"),
                DB::raw('COUNT(wishlist_items.id) as items'),
                DB::raw('COUNT(DISTINCT wishlist_items.product_id) as products'),
            ])
            ->map(fn ($row) => [
                'category_id' => $row->category_id !== null ? (int) $row->category_id : null,
                'name' => $row->name,
                'items' => (int) $row->items,
                'products' => (int) $row->products,
            ])
            ->all();
    }

    /**
     * مشتریانی که بیشترین محصول را در علاقه‌مندی‌ها ذخیره کرده‌اند.
     */
    private function topCustomers(): array
    {
        return User::query()
            ->select(['id', 'name', 'email', 'phone'])
            ->where('role', 'customer')
            ->withCount('wishlistItems as wishlist_count')
            ->withMax('wishlistItems as last_wishlist_at', 'created_at')
            ->withCount([
                'orders as orders_count' => function ($query) {
                    $query->where('status', '!=', 'cancelled');
                },
            ])
            ->withSum([
                'orders as total_spent' => function ($query) {
                    $query
                        ->where('payment_status', 'paid')
                        ->where('status', '!=', 'cancelled');
                },
            ], 'total')
            ->has('wishlistItems')
            ->orderByDesc('wishlist_count')
            ->limit(8)
            ->get()
            ->toArray();
    }

    /**
     * آخرین اقلام افزوده‌شده به علاقه‌مندی‌ها (برای جریان فعالیت).
     */
    private function recentItems(): array
    {
        return WishlistItem::query()
            ->with([
                'user:id,name,email,phone',
                'product' => function ($query) {
                    $query
                        ->select(self::PRODUCT_COLUMNS)
                        ->with('category:id,name,slug');
                },
            ])
            ->latest()
            ->limit(10)
            ->get()
            ->map(fn (WishlistItem $item) => [
                'id' => $item->id,
                'created_at' => $item->created_at,
                'user' => $item->user,
                'product' => $item->product,
            ])
            ->all();
    }
}
