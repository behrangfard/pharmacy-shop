<?php

namespace Database\Seeders;

use App\Services\Content\LegalPageInstaller;
use Illuminate\Database\Seeder;

/**
 * صفحات رسمی سایت (درباره ما، تماس، قوانین، حریم خصوصی، شرایط مرجوعی).
 *
 * صفحات موجود دست نمی‌خورند تا ویرایش‌های مدیر از بین نرود؛ برای بازنویسی
 * از `php artisan pages:legal --force` استفاده کنید.
 */
class LegalPagesSeeder extends Seeder
{
    public function run(): void
    {
        app(LegalPageInstaller::class)->install(false);
    }
}
