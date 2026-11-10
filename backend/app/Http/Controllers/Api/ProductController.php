<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class ProductController extends Controller
{
    /**
     * قیمت نهایی محصول (پس از تخفیف درصدی) به شکل عبارت SQL.
     *
     * همان محاسبه‌ای است که کارت محصول در فرانت‌اند انجام می‌دهد:
     *   price - round(price * discount_percent / 100, 0)
     * بنابراین هم فیلتر «محدودهٔ قیمت» و هم مرتب‌سازی قیمت با عددی که
     * مشتری روی کارت می‌بیند هم‌خوان است. نام جدول صریح نوشته شده تا این
     * عبارت در کوئری‌های join (شمارش facet ها) بدون ابهام کار کند.
     */
    private const EFFECTIVE_PRICE_SQL =
        'products.price - ROUND(products.price * COALESCE(products.discount_percent, 0) / 100, 0)';

    /** تعداد محصول پیش‌فرض و حداکثر تعداد در هر صفحه. */
    private const DEFAULT_PER_PAGE = 12;

    private const MAX_PER_PAGE = 48;

    /** مدت اعتبار کش گزینه‌های فیلتر (ثانیه). */
    private const FILTER_CACHE_SECONDS = 60;

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
     * عبارت SQL قیمت نهایی، داخل پرانتز برای استفاده در whereRaw/orderByRaw.
     */
    private function effectivePriceExpression(): string
    {
        return '('.self::EFFECTIVE_PRICE_SQL.')';
    }

    /**
     * Public product listing.
     */
    public function index(Request $request): JsonResponse
    {
        $products = $this->listingQuery($request)
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
            ->paginate($this->perPage($request));

        return response()->json([
            'success' => true,
            'data' => $products,
        ]);
    }

    /**
     * گزینه‌های فیلتر فهرست محصولات به‌همراه تعداد نتیجهٔ هر گزینه.
     *
     * برای هر گروه (برند، دسته، سایز) شمارش بدون اعمال همان گروه انجام
     * می‌شود؛ یعنی کاربر می‌بیند با انتخاب هر گزینه چند محصول باقی می‌ماند
     * و گزینه‌های بی‌نتیجه غیرفعال می‌شوند. بازهٔ قیمت هم از خود نتایج
     * محاسبه می‌شود تا میان‌بُرهای قیمت روی کاتالوگ واقعی بیفتند.
     */
    public function filters(Request $request): JsonResponse
    {
        $cacheKey = 'storefront-product-filters:'.md5(
            (string) $request->getQueryString()
        );

        $data = Cache::remember(
            $cacheKey,
            self::FILTER_CACHE_SECONDS,
            fn (): array => $this->buildFiltersPayload($request)
        );

        return response()->json([
            'success' => true,
            'data' => $data,
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
                'sizeGuide',
                'variants' => function ($variantQuery) {
                    $variantQuery
                        ->where('is_active', true)
                        ->orderBy('id');
                },
                /*
                 * پالت رنگ و قطعات پک فقط در حالت فعال به مشتری نشان داده
                 * می‌شوند؛ رنگ یا قطعهٔ غیرفعال در پاسخ نمی‌آید.
                 */
                'colors' => function ($colorQuery) {
                    $colorQuery
                        ->where('is_active', true)
                        ->orderBy('sort_order')
                        ->orderBy('id');
                },
                'packItems',
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

        /*
         * راهنمای سایز اختصاصی محصول فقط وقتی برای مشتری ارسال می‌شود که
         * در پنل فعال باشد و محتوایی داشته باشد؛ وگرنه کلید size_guide
         * اصلاً در پاسخ نمی‌آید و فرانت‌اند به راهنمای عمومی برمی‌گردد.
         */
        if (! $product->sizeGuide?->is_enabled || ! $product->sizeGuide->hasContent()) {
            $product->unsetRelation('sizeGuide');
        }

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

    /**
     * پایهٔ کوئری فهرست محصولات با اعمال فیلترهای درخواست.
     *
     * @param  array<int, string>  $exclude  فیلترهایی که اعمال نمی‌شوند
     *                                       (برای شمارش facet ها لازم است)
     */
    private function listingQuery(
        Request $request,
        array $exclude = [],
        bool $withSort = true
    ): Builder {
        $query = Product::query()->where('products.is_active', true);

        $this->applySearch($query, $request, $exclude);
        $this->applyCategory($query, $request, $exclude);
        $this->applyBrands($query, $request, $exclude);
        $this->applySizes($query, $request, $exclude);
        $this->applyPriceRange($query, $request, $exclude);
        $this->applyAvailability($query, $request, $exclude);
        $this->applyFlags($query, $request, $exclude);

        if ($withSort) {
            $this->applySort($query, $request);
        }

        return $query;
    }

    /**
     * جست‌وجوی متنی با نرمال‌سازی فارسی (نام، SKU و توضیح کوتاه).
     *
     * @param  array<int, string>  $exclude
     */
    private function applySearch(
        Builder $query,
        Request $request,
        array $exclude = []
    ): void {
        if (in_array('search', $exclude, true) || ! $request->filled('search')) {
            return;
        }

        $search = $this->normalizeSearch(
            $request->string('search')->toString()
        );

        if ($search === '') {
            return;
        }

        $searchPattern = "%{$search}%";

        $nameColumn = $this->normalizedColumn('products.name');
        $skuColumn = $this->normalizedColumn('products.sku');
        $descriptionColumn = $this->normalizedColumn(
            'products.short_description'
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

    /**
     * فیلتر دسته‌بندی؛ دستهٔ والد زیردسته‌هایش را هم شامل می‌شود.
     *
     * @param  array<int, string>  $exclude
     */
    private function applyCategory(
        Builder $query,
        Request $request,
        array $exclude = []
    ): void {
        if (
            in_array('category', $exclude, true)
            || ! $request->filled('category')
        ) {
            return;
        }

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

            $query->whereIn('products.category_id', $categoryIds);

            return;
        }

        $query->whereHas('category', function ($q) use ($categoryValue) {
            $q->where('slug', $categoryValue);
        });
    }

    /**
     * فیلتر برند؛ چند برند هم‌زمان: brand=slug-a,slug-b
     * (حالت تک‌مقداری قبلی هم پشتیبانی می‌شود.)
     *
     * @param  array<int, string>  $exclude
     */
    private function applyBrands(
        Builder $query,
        Request $request,
        array $exclude = []
    ): void {
        if (in_array('brand', $exclude, true)) {
            return;
        }

        $brandSlugs = collect(
            explode(',', $request->string('brand')->toString())
        )
            ->map(fn (string $slug): string => trim($slug))
            ->filter()
            ->unique()
            ->values()
            ->all();

        if ($brandSlugs === []) {
            return;
        }

        $query->whereHas('brand', function ($q) use ($brandSlugs) {
            $q->whereIn('slug', $brandSlugs);
        });
    }

    /**
     * فیلتر سایز روی تنوع‌های فعال محصول: size=75B,80B
     *
     * مقدارها با همان قاعدهٔ ذخیره‌سازی نرمال می‌شوند (حروف بزرگ لاتین،
     * ارقام لاتین و بدون پیشوند «سایز») تا «سایز ۸۰B» و «80b» یکی باشند.
     *
     * @param  array<int, string>  $exclude
     */
    private function applySizes(
        Builder $query,
        Request $request,
        array $exclude = []
    ): void {
        if (in_array('size', $exclude, true)) {
            return;
        }

        $sizes = ProductVariant::normalizeSizeList(
            $request->string('size')->toString()
        );

        if ($sizes === []) {
            return;
        }

        $query->whereHas('variants', function ($variantQuery) use ($sizes) {
            $variantQuery
                ->where('is_active', true)
                ->whereIn('size', $sizes);
        });
    }

    /**
     * محدودهٔ قیمت روی قیمت نهایی پس از تخفیف.
     *
     * پارامترها صریحاً به عدد تبدیل می‌شوند؛ در SQLite اگر پارامتر متنی
     * مستقیم با یک عبارت REAL مقایسه شود، مقایسه به‌صورت رشته‌ای انجام
     * می‌شود و نتیجه نادرست می‌دهد.
     *
     * @param  array<int, string>  $exclude
     */
    private function applyPriceRange(
        Builder $query,
        Request $request,
        array $exclude = []
    ): void {
        if (in_array('price', $exclude, true)) {
            return;
        }

        $effectivePrice = $this->effectivePriceExpression();

        if ($request->filled('min_price')) {
            $query->whereRaw(
                "{$effectivePrice} >= CAST(? AS DECIMAL(15,2))",
                [max((float) $request->input('min_price'), 0)]
            );
        }

        if ($request->filled('max_price')) {
            $query->whereRaw(
                "{$effectivePrice} <= CAST(? AS DECIMAL(15,2))",
                [max((float) $request->input('max_price'), 0)]
            );
        }
    }

    /**
     * فقط محصولات موجود و/یا تخفیف‌دار.
     *
     * @param  array<int, string>  $exclude
     */
    private function applyAvailability(
        Builder $query,
        Request $request,
        array $exclude = []
    ): void {
        if (
            ! in_array('stock', $exclude, true)
            && $request->boolean('in_stock')
        ) {
            $query->where('products.stock', '>', 0);
        }

        if (
            ! in_array('discount', $exclude, true)
            && $request->boolean('discount_only')
        ) {
            $query->where('products.discount_percent', '>', 0);
        }
    }

    /**
     * فقط محصولات ویژه یا جدید.
     *
     * @param  array<int, string>  $exclude
     */
    private function applyFlags(
        Builder $query,
        Request $request,
        array $exclude = []
    ): void {
        if (
            ! in_array('featured', $exclude, true)
            && $request->boolean('featured')
        ) {
            $query->where('products.is_featured', true);
        }

        // پارامتر «new» نام تاریخی API است؛ «is_new» هم پذیرفته می‌شود.
        if (
            ! in_array('new', $exclude, true)
            && ($request->boolean('new') || $request->boolean('is_new'))
        ) {
            $query->where('products.is_new', true);
        }
    }

    /**
     * مرتب‌سازی؛ قیمت روی قیمت نهایی پس از تخفیف اعمال می‌شود تا با عددی
     * که روی کارت محصول دیده می‌شود هم‌خوان باشد.
     */
    private function applySort(Builder $query, Request $request): void
    {
        $sort = $request->string('sort', 'latest')->toString();

        $effectivePrice = $this->effectivePriceExpression();

        match ($sort) {
            'price_asc' => $query->orderByRaw("{$effectivePrice} ASC"),
            'price_desc' => $query->orderByRaw("{$effectivePrice} DESC"),
            'popular' => $query->orderByDesc('products.sales_count'),
            'discount' => $query->orderByDesc('products.discount_percent'),
            default => $query->orderByDesc('products.id'),
        };
    }

    /**
     * تعداد محصول در هر صفحه.
     */
    private function perPage(Request $request): int
    {
        return min(
            max(
                (int) $request->input('per_page', self::DEFAULT_PER_PAGE),
                1
            ),
            self::MAX_PER_PAGE
        );
    }

    /**
     * ساختن پاسخ endpoint فیلترها (بدون کش).
     *
     * @return array<string, mixed>
     */
    private function buildFiltersPayload(Request $request): array
    {
        $effectivePrice = $this->effectivePriceExpression();

        $brandCounts = $this->listingQuery($request, ['brand'], false)
            ->whereNotNull('products.brand_id')
            ->selectRaw('products.brand_id as brand_id, COUNT(*) as aggregate')
            ->groupBy('products.brand_id')
            ->pluck('aggregate', 'brand_id');

        $categoryCounts = $this->listingQuery($request, ['category'], false)
            ->selectRaw('products.category_id as category_id, COUNT(*) as aggregate')
            ->groupBy('products.category_id')
            ->pluck('aggregate', 'category_id');

        $sizeCounts = $this->listingQuery($request, ['size'], false)
            ->join(
                'product_variants',
                'product_variants.product_id',
                '=',
                'products.id'
            )
            ->where('product_variants.is_active', true)
            ->whereNotNull('product_variants.size')
            ->selectRaw(
                'product_variants.size as size, COUNT(DISTINCT products.id) as aggregate'
            )
            ->groupBy('product_variants.size')
            ->orderBy('product_variants.size')
            ->pluck('aggregate', 'size');

        $priceRange = $this->listingQuery($request, ['price'], false)
            ->selectRaw(
                "MIN({$effectivePrice}) as min_price, MAX({$effectivePrice}) as max_price"
            )
            ->first();

        $categories = Category::query()
            ->where('is_active', true)
            ->whereNull('parent_id')
            ->with(['children' => function ($childQuery) {
                $childQuery->where('is_active', true);
            }])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get(['id', 'name', 'slug', 'parent_id']);

        return [
            'total' => $this->listingQuery($request, [], false)->count(),
            'price' => [
                'min' => $priceRange?->min_price === null
                    ? null
                    : (float) $priceRange->min_price,
                'max' => $priceRange?->max_price === null
                    ? null
                    : (float) $priceRange->max_price,
            ],
            'brands' => Brand::query()
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get(['id', 'name', 'slug'])
                ->map(fn (Brand $brand): array => [
                    'slug' => $brand->slug,
                    'name' => $brand->name,
                    'count' => (int) ($brandCounts[$brand->id] ?? 0),
                ])
                ->values()
                ->all(),
            'categories' => $categories
                ->map(fn (Category $category): array => [
                    'slug' => $category->slug,
                    'name' => $category->name,
                    'count' => (int) ($categoryCounts[$category->id] ?? 0)
                        + $category->children->sum(
                            fn (Category $child): int => (int) ($categoryCounts[$child->id] ?? 0)
                        ),
                ])
                ->values()
                ->all(),
            'sizes' => collect($sizeCounts)
                ->map(fn ($count, string $size): array => [
                    'value' => $size,
                    'count' => (int) $count,
                ])
                ->values()
                ->all(),
        ];
    }
}
