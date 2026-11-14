<?php

namespace App\Console\Commands;

use App\Services\Content\LegalPageInstaller;
use Illuminate\Console\Command;

/**
 * نصب صفحات رسمی/اعتماد فروشگاه.
 *
 * این صفحات پیش‌نیاز عملی اینماد و درگاه پرداخت‌اند و از فوتر سایت در
 * دسترس قرار می‌گیرند. متن آن‌ها با متغیرهای تنظیمات فروشگاه نوشته شده
 * (مثل {{store_phone}}) و هنگام نمایش با مقدار واقعی جایگزین می‌شود.
 */
class InstallLegalPages extends Command
{
    protected $signature = 'pages:legal
                            {--force : بازنویسی متن صفحاتی که قبلاً ساخته شده‌اند}';

    protected $description = 'ساخت/به‌روزرسانی صفحات رسمی فروشگاه (درباره ما، تماس، قوانین، حریم خصوصی، شرایط مرجوعی)';

    public function handle(LegalPageInstaller $installer): int
    {
        $force = (bool) $this->option('force');
        $counts = $installer->install($force);

        $this->info(
            "ساخته‌شده: {$counts['created']} | به‌روزرسانی‌شده: {$counts['updated']} | دست‌نخورده: {$counts['skipped']}"
        );

        if ($counts['skipped'] > 0 && ! $force) {
            $this->line(
                'صفحات موجود بازنویسی نشدند. برای اعمال دوبارهٔ متن پیش‌فرض از --force استفاده کنید.'
            );
        }

        $this->line('این صفحات در فوتر سایت نمایش داده می‌شوند (مسیر /pages/{slug}).');

        return self::SUCCESS;
    }
}
