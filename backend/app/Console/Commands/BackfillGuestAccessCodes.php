<?php

namespace App\Console\Commands;

use App\Models\Order;
use App\Support\GuestAccessCode;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * ساخت کد پیگیری برای سفارش‌های مهمانی که پیش از نسخهٔ ۱.۱۱ ثبت شده‌اند.
 *
 * ستون `orders.guest_access_code` بعد از راه‌اندازی فروشگاه اضافه شد؛ سفارش‌های
 * مهمانِ قدیمی‌تر کد ندارند و مشتری در مرورگر جدید نمی‌تواند دسترسی‌اش را
 * بازیابی کند. این کامند برای همان سفارش‌ها کد یکتا می‌سازد. اجرای دوباره
 * بی‌خطر است: فقط سفارش‌های بدون کد بررسی می‌شوند و کد موجود بازنویسی نمی‌شود.
 *
 * نمونه:
 *   php artisan orders:backfill-guest-access-codes --dry-run
 *   php artisan orders:backfill-guest-access-codes --limit=500
 *
 * توجه: کد سمت سرور ذخیره می‌شود و در پاسخ‌های عمومی نمایش داده نمی‌شود؛
 * برای رساندن آن به مشتری باید از پنل سفارش یا پیامک استفاده شود.
 */
class BackfillGuestAccessCodes extends Command
{
    protected $signature = 'orders:backfill-guest-access-codes
                            {--limit=0 : حداکثر تعداد سفارش در هر اجرا (۰ = همه)}
                            {--dry-run : فقط نمایش سفارش‌های بدون کد، بدون ذخیره}';

    protected $description = 'ساخت کد پیگیری برای سفارش‌های مهمان قدیمی که کد پیگیری ندارند';

    public function handle(): int
    {
        $limit = max((int) $this->option('limit'), 0);

        $query = Order::query()
            ->whereNull('user_id')
            ->whereNotNull('guest_token')
            ->whereNull('guest_access_code')
            ->orderBy('id');

        if ($limit > 0) {
            $query->limit($limit);
        }

        $ids = $query->pluck('id');

        if ($ids->isEmpty()) {
            $this->info('همهٔ سفارش‌های مهمان کد پیگیری دارند.');

            return self::SUCCESS;
        }

        if ($this->option('dry-run')) {
            $this->info(sprintf(
                '%d سفارش مهمان بدون کد پیگیری پیدا شد:',
                $ids->count()
            ));

            Order::query()
                ->whereKey($ids->all())
                ->orderBy('id')
                ->get(['id', 'order_number', 'created_at'])
                ->each(function (Order $order): void {
                    $this->line(sprintf(
                        ' - %s | %s',
                        $order->order_number,
                        optional($order->created_at)?->format('Y-m-d H:i')
                    ));
                });

            $this->line('اجرا بدون --dry-run کدها را ذخیره می‌کند.');

            return self::SUCCESS;
        }

        $updated = 0;
        $skipped = 0;

        foreach ($ids as $id) {
            $done = DB::transaction(function () use ($id): bool {
                $order = Order::query()
                    ->whereKey($id)
                    ->lockForUpdate()
                    ->first();

                // ممکن است بین انتخاب و اجرا، سفارش کد گرفته باشد.
                if (
                    ! $order
                    || $order->user_id !== null
                    || $order->guest_token === null
                    || $order->guest_access_code !== null
                ) {
                    return false;
                }

                $order->guest_access_code = $this->uniqueCode();
                $order->save();

                return true;
            }, 3);

            $done ? $updated++ : $skipped++;
        }

        $this->info(sprintf(
            '%d سفارش کد پیگیری گرفت؛ %d مورد رد شد.',
            $updated,
            $skipped
        ));

        $this->line(
            'مشتری با «شماره سفارش + کد پیگیری» از صفحهٔ /track-order دسترسی‌اش را بازیابی می‌کند.'
        );

        return self::SUCCESS;
    }

    /**
     * کد یکتا در کل جدول (ستون unique است).
     */
    private function uniqueCode(): string
    {
        do {
            $code = GuestAccessCode::generate();
        } while (Order::query()->where('guest_access_code', $code)->exists());

        return $code;
    }
}
