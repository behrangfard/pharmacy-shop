<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\StockMovement;
use App\Services\Inventory\LowStockService;
use App\Services\Inventory\StockLedger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * مدیریت موجودی پنل: فهرست کالاهای رو به اتمام، تنظیم آستانهٔ هشدار،
 * شمارش انبار (stocktake) و ارسال اعلان «موجودی کم».
 *
 * محاسبهٔ «کم بودن موجودی» فقط سمت سرور انجام می‌شود و آستانهٔ پیش‌فرض از
 * `config('inventory.low_stock_threshold')` می‌آید.
 */
class AdminInventoryController extends Controller
{
    /** سقف ردیف‌هایی که برای حالت «رو به اتمام» در حافظه ادغام می‌شوند. */
    private const MERGE_LIMIT = 500;

    public function __construct(
        private readonly StockLedger $ledger,
        private readonly LowStockService $lowStock
    ) {
    }

    /**
     * فهرست اقلام انبار.
     *
     * mode=low (پیش‌فرض): محصولات و تنوع‌های زیر آستانه (مرتب بر اساس موجودی).
     * mode=all: صفحه‌بندی‌شدهٔ همهٔ محصولات یا تنوع‌های یک نوع.
     */
    public function items(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'mode' => ['nullable', Rule::in(['low', 'all'])],
            'kind' => ['nullable', Rule::in(['all', 'product', 'variant'])],
            'search' => ['nullable', 'string', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $mode = $validated['mode'] ?? 'low';
        $kind = $validated['kind'] ?? ($mode === 'all' ? 'product' : 'all');
        $search = trim((string) ($validated['search'] ?? ''));
        $page = (int) ($validated['page'] ?? 1);
        $perPage = (int) ($validated['per_page'] ?? 25);

        $data = $mode === 'all'
            ? $this->allItems($kind, $search, $page, $perPage)
            : $this->lowItems($kind, $search, $page, $perPage);

        return response()->json([
            'success' => true,
            'data' => [
                'mode' => $mode,
                'kind' => $kind,
                'items' => $data['items'],
                'meta' => $data['meta'],
                'summary' => $this->lowStock->summary(),
            ],
        ]);
    }

    /** خلاصهٔ شمارنده‌ها برای کارت‌های بالای صفحه. */
    public function summary(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => ['summary' => $this->lowStock->summary()],
        ]);
    }

    /** ساخت اعلان موجودی کم (با رعایت بازهٔ خنک‌شدن مگر با force). */
    public function notify(Request $request): JsonResponse
    {
        $result = $this->lowStock->notify($request->boolean('force'));

        return response()->json([
            'success' => true,
            'data' => [
                'created' => $result['created'],
                'reason' => $result['reason'],
                'summary' => $result['summary'],
                'notification' => $result['notification']?->only([
                    'id',
                    'title',
                    'body',
                    'url',
                    'created_at',
                ]),
            ],
        ]);
    }

    /**
     * تنظیم/حذف آستانهٔ هشدار یک محصول یا تنوع.
     *
     * مقدار null یعنی «بازگشت به پیش‌فرض» (تنوع: آستانهٔ محصول).
     */
    public function updateThreshold(Request $request, string $kind, int $id): JsonResponse
    {
        $validated = $request->validate([
            'threshold' => ['present', 'nullable', 'integer', 'min:0', 'max:100000'],
        ]);

        if ($kind === 'variant') {
            $variant = ProductVariant::query()->with('product')->find($id);

            abort_if($variant === null, 404, 'تنوع انتخاب‌شده پیدا نشد.');

            $variant->forceFill(['low_stock_threshold' => $validated['threshold']])->save();

            $item = $this->variantRow($variant);
        } else {
            $product = Product::query()->find($id);

            abort_if($product === null, 404, 'محصول انتخاب‌شده پیدا نشد.');

            $product->forceFill(['low_stock_threshold' => $validated['threshold']])->save();

            $item = $this->productRow($product);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'item' => $item,
                'summary' => $this->lowStock->summary(),
            ],
        ]);
    }

    /**
     * ثبت شمارش انبار: موجودی شمارش‌شده جای موجودی فعلی می‌نشیند و اختلاف
     * به‌عنوان گردش موجودی از نوع `stocktake` ثبت می‌شود.
     */
    public function stocktake(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'variant_id' => ['nullable', 'integer', 'exists:product_variants,id'],
            'counted_stock' => ['required', 'integer', 'min:0', 'max:10000000'],
            'note' => ['nullable', 'string', 'max:255'],
        ]);

        $note = trim((string) ($validated['note'] ?? ''));
        $counted = (int) $validated['counted_stock'];

        $result = DB::transaction(function () use ($validated, $counted, $note): array {
            $product = Product::query()->lockForUpdate()->findOrFail($validated['product_id']);
            $variant = null;

            if (! empty($validated['variant_id'])) {
                $variant = ProductVariant::query()->lockForUpdate()->findOrFail($validated['variant_id']);

                if ((int) $variant->product_id !== (int) $product->id) {
                    throw ValidationException::withMessages([
                        'variant_id' => 'این تنوع به محصول انتخاب‌شده تعلق ندارد.',
                    ]);
                }
            }

            $current = (int) ($variant !== null ? $variant->stock : $product->stock);
            $difference = $counted - $current;

            if ($difference !== 0) {
                if ($variant !== null) {
                    $variant->forceFill(['stock' => $counted])->save();
                } else {
                    $product->forceFill(['stock' => $counted])->save();
                }

                $this->ledger->record(
                    (int) $product->id,
                    $variant,
                    $difference,
                    StockMovement::TYPE_STOCKTAKE,
                    $counted,
                    null,
                    null,
                    $note !== '' ? $note : 'شمارش انبار',
                );
            }

            return ['product' => $product, 'variant' => $variant, 'difference' => $difference];
        });

        $variant = $result['variant'];

        if ($variant !== null) {
            $variant->setRelation('product', $result['product']);
            $item = $this->variantRow($variant);
        } else {
            $item = $this->productRow($result['product']);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'item' => $item,
                'difference' => $result['difference'],
                'summary' => $this->lowStock->summary(),
            ],
        ]);
    }

    /**
     * @return array{items: array<int, array<string, mixed>>, meta: array<string, int>}
     */
    private function lowItems(string $kind, string $search, int $page, int $perPage): array
    {
        $threshold = $this->lowStock->threshold();
        $rows = collect();

        if ($kind !== 'variant') {
            $products = Product::query()
                ->where('is_active', true)
                ->whereRaw('stock <= COALESCE(low_stock_threshold, ?)', [$threshold])
                ->when($search !== '', function ($query) use ($search): void {
                    $query->where(function ($inner) use ($search): void {
                        $inner->where('name', 'like', "%{$search}%")
                            ->orWhere('sku', 'like', "%{$search}%");
                    });
                })
                ->orderBy('stock')
                ->orderBy('id')
                ->limit(self::MERGE_LIMIT)
                ->get();

            $rows = $rows->merge(
                $products->map(fn (Product $product): array => $this->productRow($product))
            );
        }

        if ($kind !== 'product') {
            $variants = ProductVariant::query()
                ->join('products', 'products.id', '=', 'product_variants.product_id')
                ->where('products.is_active', true)
                ->where('product_variants.is_active', true)
                ->whereRaw(
                    'product_variants.stock <= COALESCE(product_variants.low_stock_threshold, products.low_stock_threshold, ?)',
                    [$threshold]
                )
                ->when($search !== '', function ($query) use ($search): void {
                    $query->where(function ($inner) use ($search): void {
                        $inner->where('product_variants.name', 'like', "%{$search}%")
                            ->orWhere('product_variants.sku', 'like', "%{$search}%")
                            ->orWhere('products.name', 'like', "%{$search}%");
                    });
                })
                ->select('product_variants.*')
                ->with('product:id,name,slug')
                ->orderBy('product_variants.stock')
                ->orderBy('product_variants.id')
                ->limit(self::MERGE_LIMIT)
                ->get();

            $rows = $rows->merge(
                $variants->map(fn (ProductVariant $variant): array => $this->variantRow($variant))
            );
        }

        $rows = $rows
            ->sortBy([
                ['stock', 'asc'],
                ['shortfall', 'desc'],
                ['name', 'asc'],
            ])
            ->values();

        $total = $rows->count();

        return [
            'items' => $rows->forPage($page, $perPage)->values()->all(),
            'meta' => [
                'current_page' => $page,
                'last_page' => max(1, (int) ceil($total / $perPage)),
                'per_page' => $perPage,
                'total' => $total,
            ],
        ];
    }

    /**
     * @return array{items: array<int, array<string, mixed>>, meta: array<string, int>}
     */
    private function allItems(string $kind, string $search, int $page, int $perPage): array
    {
        if ($kind === 'variant') {
            $paginator = ProductVariant::query()
                ->with('product:id,name,slug')
                ->when($search !== '', function ($query) use ($search): void {
                    $query->where(function ($inner) use ($search): void {
                        $inner->where('name', 'like', "%{$search}%")
                            ->orWhere('sku', 'like', "%{$search}%");
                    });
                })
                ->orderBy('product_id')
                ->orderBy('id')
                ->paginate($perPage, ['*'], 'page', $page);

            $items = collect($paginator->items())
                ->map(fn (ProductVariant $variant): array => $this->variantRow($variant))
                ->all();
        } else {
            $paginator = Product::query()
                ->when($search !== '', function ($query) use ($search): void {
                    $query->where(function ($inner) use ($search): void {
                        $inner->where('name', 'like', "%{$search}%")
                            ->orWhere('sku', 'like', "%{$search}%");
                    });
                })
                ->orderBy('name')
                ->paginate($perPage, ['*'], 'page', $page);

            $items = collect($paginator->items())
                ->map(fn (Product $product): array => $this->productRow($product))
                ->all();
        }

        return [
            'items' => $items,
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function productRow(Product $product): array
    {
        $stock = (int) $product->stock;
        $threshold = $product->effectiveLowStockThreshold();

        return [
            'kind' => 'product',
            'id' => (int) $product->id,
            'product_id' => (int) $product->id,
            'name' => (string) $product->name,
            'product_name' => null,
            'product_slug' => $product->slug,
            'sku' => $product->sku,
            'stock' => $stock,
            'threshold' => $threshold,
            'low_stock_threshold' => $product->low_stock_threshold !== null
                ? (int) $product->low_stock_threshold
                : null,
            'shortfall' => max(0, $threshold - $stock),
            'is_active' => (bool) $product->is_active,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function variantRow(ProductVariant $variant): array
    {
        $stock = (int) $variant->stock;
        $threshold = $variant->effectiveLowStockThreshold();

        return [
            'kind' => 'variant',
            'id' => (int) $variant->id,
            'product_id' => (int) $variant->product_id,
            'name' => (string) $variant->name,
            'product_name' => $variant->product?->name,
            'product_slug' => $variant->product?->slug,
            'sku' => $variant->sku,
            'stock' => $stock,
            'threshold' => $threshold,
            'low_stock_threshold' => $variant->low_stock_threshold !== null
                ? (int) $variant->low_stock_threshold
                : null,
            'shortfall' => max(0, $threshold - $stock),
            'is_active' => (bool) $variant->is_active,
        ];
    }
}
