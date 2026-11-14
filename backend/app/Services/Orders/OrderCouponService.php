<?php

namespace App\Services\Orders;

use App\Models\Coupon;
use App\Models\Order;

/**
 * آزادسازی سهمیهٔ کوپن هنگام لغو یا بازپرداخت سفارش.
 *
 * `coupons.used_count` در تراکنش ثبت سفارش یک واحد افزایش می‌یابد تا سقف کل
 * (`usage_limit`) رعایت شود. اگر سفارش بعداً لغو یا بازپرداخت شود، آن سهمیه
 * باید برگردد؛ وگرنه ظرفیت کوپن زودتر از واقعیت تمام می‌شود و مشتری بعدی
 * بی‌دلیل خطا می‌گیرد.
 *
 * این متد باید داخل همان تراکنشی صدا زده شود که وضعیت سفارش را تغییر می‌دهد
 * و هر سفارش فقط یک‌بار به آن می‌رسد (مسیرهای لغو با `stock_restored_at` و
 * مسیر بازپرداخت با تغییر وضعیت `payment_status` محافظت می‌شوند). کاهش با
 * شرط `used_count > 0` انجام می‌شود تا شمارنده هرگز منفی نشود.
 */
class OrderCouponService
{
    public function release(Order $order): bool
    {
        $code = $order->coupon_code;

        if ($code === null || trim((string) $code) === '') {
            return false;
        }

        // سفارش‌هایی که تخفیف کوپن نگرفته‌اند سهمیه‌ای مصرف نکرده‌اند.
        if ((float) $order->coupon_discount <= 0) {
            return false;
        }

        $released = Coupon::query()
            ->where('code', $code)
            ->where('used_count', '>', 0)
            ->decrement('used_count');

        return $released > 0;
    }
}