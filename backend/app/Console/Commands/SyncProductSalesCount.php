<?php

namespace App\Console\Commands;

use App\Models\Product;
use App\Support\OrderStatus;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * بازسازی `products.sales_count` از روی سفارش‌های واقعی.
 *
 * چرا لازم است: پیش از این شمارندهٔ فروش با ثبت سفارش تغییر نمی‌کرد و فقط از
 * سیدر/دادهٔ اولیه می‌آمد؛ پس در سایت‌های نصب‌شده عدد پرفروش‌ها واقعی نیست.
 * از این نسخه به بعد شمارنده خودکار بالا/پایین می‌رود (`OrderSalesService`)،
 * اما دادهٔ قدیمی باید یک‌بار با همین کامند هم‌خوان شود.
 *
 * محاسبه: مجموع `quantity` اقلام سفارش‌هایی که وضعیتشان `cancelled` نیست.
 *
 * ⚠️ این کامند آمار را بازتولید می‌کند (قاعدهٔ ۷ AGENTS.md) و باید با هماهنگی
 * مدیر فروشگاه اجرا شود. اول با `--dry-run` اختلاف‌ها را ببینید:
 *   php artisan products:sync-sales-count --dry-run
 *   php artisan products:sync-sales-count
 */
class SyncProductSalesCount extends Command
{
    protected $signature = 'products:sync-sales-count
                            {--dry-run : فقط نمایش اختلاف شمارنده‌ها، بدون ذخیره}
                            {--chunk=200 : تعداد محصول در هر دسته}';

    protected $description = 'بازسازی شمارندهٔ فروش محصولات از مجموع اقلام سفارش‌های لغونشده';

    public function handle(): int
    {
        $chunk = max((int) $this->option('chunk'), 1);
        $dryRun = (bool) $this->option('dry-run');

        /*
         * وضعیت لغو در داده‌های قدیمی هر دو شکل `cancelled` و `canceled` را
         * دارد؛ هر دو کنار گذاشته می‌شوند تا فروشِ لغوشده دوباره شمرده نشود.
         */
        $totals = DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->whereNotNull('order_items.product_id')
            ->whereNotIn('orders.status', [OrderStatus::CANCELLED, 'canceled'])
            ->groupBy('order_items.product_id')
            ->selectRaw('order_items.product_id as product_id, SUM(order_items.quantity) as total')
            ->pluck('total', 'product_id');

        $checked = 0;
        $changed = 0;

        Product::query()
            ->chunkById($chunk, function ($products) use (
                $totals,
                $dryRun,
                &$checked,
                &$changed
            ): void {
                foreach ($products as $product) {
                    $checked++;

                    $expected = (int) ($totals->get($product->id) ?? 0);

                    if ($expected === (int) $product->sales_count) {
                        continue;
                    }

                    $changed++;

                    if ($dryRun) {
                        $this->line(sprintf(
                            ' - %s (ID %d): %d → %d',
                            $product->name,
                            $product->id,
                            (int) $product->sales_count,
                            $expected
                        ));

                        continue;
                    }

                    Product::query()
                        ->whereKey($product->id)
                        ->update(['sales_count' => $expected]);
                }
            });

        if ($dryRun) {
            $this->info(sprintf(
                '%d محصول بررسی شد؛ %d مورد با دادهٔ سفارش‌ها اختلاف دارد.',
                $checked,
                $changed
            ));

            $this->line('اجرا بدون --dry-run شمارنده‌ها را با دادهٔ سفارش‌ها هم‌خوان می‌کند.');

            return self::SUCCESS;
        }

        $this->info(sprintf(
            '%d محصول بررسی شد؛ %d شمارنده با دادهٔ سفارش‌ها هم‌خوان شد.',
            $checked,
            $changed
        ));

        return self::SUCCESS;
    }
}
