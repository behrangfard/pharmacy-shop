<?php

namespace App\Console\Commands;

use App\Services\Inventory\LowStockService;
use Illuminate\Console\Command;

/**
 * ساخت اعلان «موجودی کم» برای کالاهای زیر آستانه.
 *
 * در routes/console.php روزانه اجرا می‌شود. اگر اعلان خوانده‌نشدهٔ تازه‌ای در
 * بازهٔ `inventory.low_stock_notify_cooldown_hours` وجود داشته باشد، دوباره
 * ساخته نمی‌شود؛ برای ارسال دستی: `php artisan inventory:notify-low-stock --force`.
 */
class NotifyLowStock extends Command
{
    protected $signature = 'inventory:notify-low-stock
                            {--force : حتی با وجود اعلان خوانده‌نشدهٔ تازه، اعلان بساز}';

    protected $description = 'اعلان موجودی کم برای کالاها و تنوع‌های زیر آستانه';

    public function handle(LowStockService $lowStock): int
    {
        $result = $lowStock->notify((bool) $this->option('force'));

        if (! $result['created']) {
            $this->info(
                $result['reason'] === 'empty'
                    ? 'همهٔ کالاها بالای آستانه هستند؛ اعلانی لازم نیست.'
                    : 'اعلان موجودی کم قبلی هنوز خوانده نشده است؛ اعلان جدید ساخته نشد.'
            );

            return self::SUCCESS;
        }

        $summary = $result['summary'];

        $this->info(
            'اعلان موجودی کم ثبت شد: '
            . $summary['total']
            . ' قلم ('
            . $summary['out_of_stock']
            . ' ناموجود)'
        );

        return self::SUCCESS;
    }
}
