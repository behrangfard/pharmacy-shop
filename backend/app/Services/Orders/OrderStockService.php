<?php

namespace App\Services\Orders;

use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\StockMovement;
use App\Services\Inventory\StockLedger;

/**
 * بازگرداندن موجودی اقلام یک سفارش به انبار.
 *
 * موجودی هنگام ثبت سفارش در `OrderController@store` کم می‌شود؛ این سرویس همان
 * مقدار را برمی‌گرداند. چون هر دو مسیر (لغو توسط مشتری و لغو خودکار سفارش
 * رهاشده) باید دقیقاً یک رفتار داشته باشند، منطق در یک جا نگه داشته شده است.
 *
 * هر بازگردانی یک ردیف در دفتر «گردش موجودی» (`stock_movements`) ثبت می‌کند
 * تا در گزارش پنل معلوم باشد موجودی به‌خاطر کدام سفارش برگشته است.
 *
 * ⚠️ این متد باید داخل یک تراکنش دیتابیس صدا زده شود، چون از
 * `lockForUpdate()` برای جلوگیری از بازگردانی هم‌زمان استفاده می‌کند.
 * اگر موجودی قبلاً آزاد شده باشد (stock_restored_at پر باشد) کاری نمی‌کند و
 * `false` برمی‌گرداند؛ بنابراین اجرای دوباره بی‌خطر است.
 */
class OrderStockService
{
    public function __construct(private readonly StockLedger $ledger)
    {
    }

    public function restore(Order $order): bool
    {
        if ($order->stock_restored_at !== null) {
            return false;
        }

        foreach ($order->items()->get() as $item) {
            if ($item->variant_id !== null) {
                $variant = ProductVariant::query()
                    ->whereKey($item->variant_id)
                    ->lockForUpdate()
                    ->first();

                if ($variant) {
                    $variant->increment('stock', $item->quantity);

                    $this->ledger->record(
                        (int) $variant->product_id,
                        $variant,
                        (int) $item->quantity,
                        StockMovement::TYPE_ORDER_RESTORED,
                        (int) $variant->stock,
                        $order,
                        null,
                        'بازگردانی موجودی سفارش '.$order->order_number,
                    );

                    continue;
                }
            }

            if ($item->product_id !== null && $item->variant_id === null) {
                $product = Product::query()
                    ->whereKey($item->product_id)
                    ->lockForUpdate()
                    ->first();

                if ($product) {
                    $product->increment('stock', $item->quantity);

                    $this->ledger->record(
                        (int) $product->id,
                        null,
                        (int) $item->quantity,
                        StockMovement::TYPE_ORDER_RESTORED,
                        (int) $product->stock,
                        $order,
                        null,
                        'بازگردانی موجودی سفارش '.$order->order_number,
                    );
                }
            }
        }

        $order->stock_restored_at = now();
        $order->save();

        return true;
    }
}

