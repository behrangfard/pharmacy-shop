<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * ساخت (یا به‌روزرسانی) حساب مدیر فروشگاه.
 *
 * مقادیر از config/admin.php خوانده می‌شوند که خودش از متغیرهای محیطی
 * ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD تغذیه می‌شود.
 *
 * نکته امنیتی: در محیط production اگر ADMIN_PASSWORD تعریف نشده باشد،
 * هیچ حسابی ساخته نمی‌شود تا رمز پیش‌فرض روی سرور واقعی باقی نماند.
 */
class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $email = (string) config('admin.email');
        $password = config('admin.password');

        if (blank($password)) {
            if (app()->environment('production')) {
                $this->command?->warn(
                    'ADMIN_PASSWORD تعریف نشده است؛ حساب مدیر در production ساخته نشد.'
                );

                return;
            }

            // فقط برای محیط توسعه/آزمایش
            $password = 'password';
        }

        // cast «hashed» در مدل User رمز را به‌صورت خودکار هش می‌کند.
        User::updateOrCreate(
            ['email' => $email],
            [
                'name' => (string) config('admin.name'),
                'password' => $password,
                'role' => 'admin',
            ]
        );

        $this->command?->info("حساب مدیر آماده است: {$email}");
    }
}
