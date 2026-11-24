<?php

namespace App\Services\Inventory;

use App\Models\AdminNotification;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Services\Notifications\AdminNotificationService;

/**
 * شمارش و اعلان «موجودی کم».
 *
 * آستانهٔ هر کالا از ستون `low_stock_threshold` خودش و در نبود آن از
 * `config('inventory.low_stock_threshold')` می‌آید؛ تنوع اول آستانهٔ خودش،
 * بعد آستانهٔ محصول و در آخر پیش‌فرض فروشگاه را به ارث می‌برد.
 *
 * فقط کالاها/تنوع‌های فعال شمرده می‌شوند تا کالای غیرفعال زنگولهٔ پنل را
 * پر نکند. اعلان با فاصلهٔ `low_stock_notify_cooldown_hours` تکرار می‌شود و
 * تا وقتی اعلان قبلی خوانده نشده، اعلان تازه ساخته نمی‌شود.
 */
class LowStockService
{
    public function __construct(
        private readonly AdminNotificationService $notifications
    ) {
    }

    /** آستانهٔ پیش‌فرض فروشگاه. */
    public function threshold(): int
    {
        return max(0, (int) config('inventory.low_stock_threshold', 5));
    }

    /**
     * خلاصهٔ وضعیت موجودی کم.
     *
     * `products`/`variants` فقط اقلام «رو به اتمام» (موجودی بین ۱ و آستانه) را
     * می‌شمارند؛ `out_of_stock` اقلام با موجودی صفر یا منفی استو `total` جمع
     * هر دو دسته.
     *
     * @return array{
     *     products: int,
     *     variants: int,
     *     out_of_stock: int,
     *     low_stock: int,
     *     total: int,
     *     threshold: int
     * }
     */
    public function summary(): array
    {
        $threshold = $this->threshold();

        $productsOut = Product::query()
            ->where('is_active', true)
            ->where('stock', '<=', 0)
            ->count();

        $productsLow = Product::query()
            ->where('is_active', true)
            ->where('stock', '>', 0)
            ->whereRaw('stock <= COALESCE(low_stock_threshold, ?)', [$threshold])
            ->count();

        $variants = ProductVariant::query()
            ->join('products', 'products.id', '=', 'product_variants.product_id')
            ->where('products.is_active', true)
            ->where('product_variants.is_active', true);

        $variantsOut = (clone $variants)
            ->where('product_variants.stock', '<=', 0)
            ->count();

        $variantsLow = (clone $variants)
            ->where('product_variants.stock', '>', 0)
            ->whereRaw(
                'product_variants.stock <= COALESCE(product_variants.low_stock_threshold, products.low_stock_threshold, ?)',
                [$threshold]
            )
            ->count();

        return [
            'products' => $productsLow,
            'variants' => $variantsLow,
            'out_of_stock' => $productsOut + $variantsOut,
            'low_stock' => $productsLow + $variantsLow,
            'total' => $productsOut + $variantsOut + $productsLow + $variantsLow,
            'threshold' => $threshold,
        ];
    }

    /**
     * ساخت اعلان موجودی کم با رعایت بازهٔ خنک‌شدن.
     *
     * @return array{
     *     created: bool,
     *     reason: string,
     *     notification: AdminNotification|null,
     *     summary: array<string, int>
     * }
     */
    public function notify(bool $force = false): array
    {
        $summary = $this->summary();

        if ($summary['total'] === 0) {
            return [
                'created' => false,
                'reason' => 'empty',
                'notification' => null,
                'summary' => $summary,
            ];
        }

        $cooldownHours = max(
            1,
            (int) config('inventory.low_stock_notify_cooldown_hours', 24)
        );

        $existing = AdminNotification::query()
            ->where('type', AdminNotification::TYPE_LOW_STOCK)
            ->whereNull('read_at')
            ->where('created_at', '>=', now()->subHours($cooldownHours))
            ->latest('id')
            ->first();

        if ($existing !== null && ! $force) {
            return [
                'created' => false,
                'reason' => 'cooldown',
                'notification' => $existing,
                'summary' => $summary,
            ];
        }

        return [
            'created' => true,
            'reason' => 'created',
            'notification' => $this->notifications->lowStock($summary),
            'summary' => $summary,
        ];
    }
}
