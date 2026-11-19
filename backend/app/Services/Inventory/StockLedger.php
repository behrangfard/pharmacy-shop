<?php

namespace App\Services\Inventory;

use App\Models\Order;
use App\Models\ProductVariant;
use App\Models\PurchaseInvoice;
use App\Models\StockMovement;
use Illuminate\Support\Facades\Auth;

/**
 * ثبت تغییرات موجودی در دفتر «گردش موجودی» (جدول `stock_movements`).
 *
 * محل‌های صدازدن:
 *  - `OrderController@store` (کاهش موجودی با ثبت سفارش)
 *  - `OrderStockService::restore` (بازگردانی موجودی در هر سه مسیر لغو)
 *  - `PurchaseInvoiceService` (افزایش/برگشت موجودی فاکتور خرید)
 *  - `AdminProductController` (ویرایش دستی موجودی محصول/تنوع)
 *  - `ProductImportService` (ایمپورت محصولات)
 *
 * مقدار `quantity` همیشه تغییر خالص است (کاهش منفی، افزایش مثبت) و
 * `stock_after` موجودی همان کالا/تنوع بلافاصله پس از تغییر.
 */
class StockLedger
{
    /**
     * @param  int  $stockAfter  موجودی کالا/تنوع پس از اعمال تغییر
     * @param  int|null  $userId  عامل تغییر؛ پیش‌فرض کاربر احرازشدهٔ Sanctum
     */
    public function record(
        int $productId,
        ?ProductVariant $variant,
        int $quantity,
        string $type,
        int $stockAfter,
        ?Order $order = null,
        ?PurchaseInvoice $purchaseInvoice = null,
        ?string $note = null,
        ?int $userId = null,
    ): ?StockMovement {
        if ($quantity === 0) {
            return null;
        }

        return StockMovement::query()->create([
            'product_id' => $productId,
            'variant_id' => $variant?->id,
            'order_id' => $order?->id,
            'purchase_invoice_id' => $purchaseInvoice?->id,
            'user_id' => $userId ?? Auth::guard('sanctum')->id(),
            'type' => $type,
            'quantity' => $quantity,
            'stock_after' => $stockAfter,
            'note' => $note,
        ]);
    }
}
