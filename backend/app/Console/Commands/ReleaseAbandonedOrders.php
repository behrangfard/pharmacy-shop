<?php

namespace App\Console\Commands;

use App\Models\Order;
use App\Services\Orders\OrderCouponService;
use App\Services\Orders\OrderStockService;
use App\Support\OrderStatus;
use App\Support\PaymentMethod;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * لغو خودکار سفارش‌هایی که در مهلت مقرر پرداخت نشده‌اند.
 *
 * چرا لازم است: موجودی در لحظهٔ ثبت سفارش کم می‌شود. اگر مشتری به درگاه
 * برود و برنگردد، آن کالا برای همیشه از دسترس بقیه خارج می‌ماند. این کامند
 * بعد از گذشت مهلت (پیش‌فرض ۶۰ دقیقه) سفارش را لغو و موجودی را آزاد می‌کند.
 *
 * در routes/console.php هر ۱۰ دقیقه اجرا می‌شود. مقادیر قابل تنظیم:
 *   php artisan orders:release-abandoned --minutes=30 --limit=500
 *   php artisan orders:release-abandoned --dry-run
 */
class ReleaseAbandonedOrders extends Command
{
    protected $signature = 'orders:release-abandoned
                            {--minutes=60 : مهلت پرداخت به دقیقه}
                            {--limit=200 : حداکثر تعداد سفارش در هر اجرا}
                            {--dry-run : فقط نمایش سفارش‌های واجد شرایط، بدون لغو}';

    protected $description = 'لغو خودکار سفارش‌های پرداخت‌نشده و بازگرداندن موجودی آن‌ها';

    public function handle(OrderStockService $stock, OrderCouponService $coupons): int
    {
        $minutes = max((int) $this->option('minutes'), 1);
        $limit = max((int) $this->option('limit'), 1);
        $deadline = now()->subMinutes($minutes);

        $ids = Order::query()
            ->where('status', OrderStatus::PENDING)
            ->where('payment_status', 'unpaid')
            /*
             * سفارش پرداخت در محل منتظر درگاه نمی‌ماند؛ وجه هنگام تحویل
             * دریافت می‌شود و هرگز نباید به‌خاطر سپری‌شدن זמן لغو شود.
             */
            ->where('payment_method', '!=', PaymentMethod::COD)
            ->whereNull('stock_restored_at')
            ->where('created_at', '<=', $deadline)
            ->orderBy('id')
            ->limit($limit)
            ->pluck('id');

        if ($ids->isEmpty()) {
            $this->info('سفارش رهاشده‌ای برای لغو پیدا نشد.');

            return self::SUCCESS;
        }

        if ($this->option('dry-run')) {
            $this->info(sprintf(
                '%d سفارش واجد شرایط لغو هستند (مهلت %d دقیقه):',
                $ids->count(),
                $minutes
            ));

            Order::query()
                ->whereKey($ids->all())
                ->orderBy('id')
                ->get(['id', 'order_number', 'total', 'created_at'])
                ->each(function (Order $order): void {
                    $this->line(sprintf(
                        ' - %s | %s تومان | %s',
                        $order->order_number,
                        number_format((float) $order->total),
                        optional($order->created_at)?->format('Y-m-d H:i')
                    ));
                });

            return self::SUCCESS;
        }

        $released = 0;
        $skipped = 0;

        foreach ($ids as $id) {
            $done = DB::transaction(function () use ($id, $deadline, $stock, $coupons): bool {
                $order = Order::query()
                    ->whereKey($id)
                    ->lockForUpdate()
                    ->first();

                if (! $order) {
                    return false;
                }

                // ممکن است بین انتخاب و اجرا، مشتری پرداخت کرده باشد.
                if ($order->status !== OrderStatus::PENDING
                    || $order->payment_status !== 'unpaid'
                    || $order->payment_method === PaymentMethod::COD
                    || $order->stock_restored_at !== null) {
                    return false;
                }

                if ($order->created_at !== null && $order->created_at->greaterThan($deadline)) {
                    return false;
                }

                $stock->restore($order);

                $order->status = OrderStatus::CANCELLED;
                $order->save();

                // سهمیهٔ کوپن سفارش رهاشده هم باید آزاد شود.
                $coupons->release($order);

                return true;
            }, 3);

            $done ? $released++ : $skipped++;
        }

        $this->info(sprintf(
            '%d سفارش لغو و موجودی آن آزاد شد؛ %d مورد رد شد.',
            $released,
            $skipped
        ));

        return self::SUCCESS;
    }
}
