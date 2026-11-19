<?php

namespace App\Services\Orders;

use App\Models\Order;
use App\Models\Product;

/**
 * نگه‌داری شمارندهٔ فروش محصولات (`products.sales_count`).
 *
 * چرا این سرویس وجود دارد: مرتب‌سازی «پرفروش‌ترین» در `ProductController` روی
 * همین ستون انجام می‌شود و پنل هم آن را در آمار علاقه‌مندی‌ها نشان می‌دهد؛ اگر
 * با ثبت سفارش تغییر نکند، عدد نمایش‌داده‌شده فقط بازماندهٔ دادهٔ اولیه است.
 *
 * قواعد:
 * - `record()` در همان تراکنشِ ثبت سفارش صدا زده می‌شود، بنابراین اگر ثبت
 *   سفارش شکست بخورد شمارنده هم برنمی‌گردد.
 * - `revert()` در همهٔ مسیرهایی که سفارش لغو می‌شود (لغو مشتری، لغو مدیر و
 *   کامند `orders:release-abandoned`) و همان‌جا که موجودی آزاد می‌شود صدا زده
 *   می‌شود. آن مسیرها با `stock_restored_at` تضمین می‌کنند هر سفارش فقط یک‌بار
 *   بازگردانده شود، پس شمارنده دوبار کم نمی‌شود.
 * - مرجوعی/بازپرداخت موجودی را برنمی‌گرداند؛ پس شمارندهٔ فروش هم تغییر نمی‌کند
 *   تا با رفتار فعلی انبار هم‌راستا بماند.
 * - کاهش با شرط `sales_count >= quantity` انجام می‌شود تا عدد هیچ‌وقت منفی نشود
 *   (مثلاً وقتی شمارندهٔ قدیمی با دادهٔ واقعی هم‌خوان نبوده است). برای هم‌خوان
 *   کردن دادهٔ قدیمی از `php artisan products:sync-sales-count` استفاده کنید.
 */
class OrderSalesService
{
    /**
     * افزودن تعداد اقلام سفارش به شمارندهٔ فروش محصولات.
     */
    public function record(Order $order): void
    {
        foreach ($this->quantitiesByProduct($order) as $productId => $quantity) {
            Product::query()
                ->whereKey($productId)
                ->increment('sales_count', $quantity);
        }
    }

    /**
     * کم‌کردن تعداد اقلام سفارشِ لغوشده از شمارندهٔ فروش.
     */
    public function revert(Order $order): void
    {
        foreach ($this->quantitiesByProduct($order) as $productId => $quantity) {
            Product::query()
                ->whereKey($productId)
                ->where('sales_count', '>=', $quantity)
                ->decrement('sales_count', $quantity);
        }
    }

    /**
     * جمع تعداد هر محصول در اقلام سفارش (چند سطر با یک محصول، یک عدد می‌شود).
     *
     * محصولات حذف‌شده (`product_id` خالی) نادیده گرفته می‌شوند تا تاریخچهٔ
     * سفارش بدون محصول هم قابل لغو بماند.
     *
     * @return array<int, int>
     */
    private function quantitiesByProduct(Order $order): array
    {
        return $order->items()
            ->whereNotNull('product_id')
            ->get(['product_id', 'quantity'])
            ->groupBy('product_id')
            ->map(fn ($items): int => (int) $items->sum('quantity'))
            ->all();
    }
}
