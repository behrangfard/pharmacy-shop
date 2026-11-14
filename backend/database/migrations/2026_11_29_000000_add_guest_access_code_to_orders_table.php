<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * «کد پیگیری مهمان»: رمز کوتاه هر سفارش مهمان برای بازیابی دسترسی.
 *
 * هویت مهمان در localStorage مرورگر نگه داشته می‌شود؛ اگر مرورگر عوض شود یا
 * داده‌هایش پاک شود، مشتری با «شماره سفارش + کد پیگیری» دوباره به فاکتور و
 * امکان لغو سفارش خودش می‌رسد. سفارش‌های کاربران ثبت‌شده این کد را ندارند
 * (NULL) چون با ورود به حساب، همان سفارش در پنل کاربری دیده می‌شود.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('orders', 'guest_access_code')) {
            return;
        }

        Schema::table('orders', function (Blueprint $table) {
            $table->string('guest_access_code', 12)
                ->nullable()
                ->unique()
                ->after('guest_token');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropUnique(['guest_access_code']);
            $table->dropColumn('guest_access_code');
        });
    }
};
