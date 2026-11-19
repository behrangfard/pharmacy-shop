<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * کارمزد سفارش «پرداخت در محل» (COD).
 *
 * مبلغ کارمزد فقط در لحظهٔ ثبت سفارش COD از `config('payment.cod_fee')`
 * محاسبه و در همین ستون ذخیره می‌شود تا فاکتور و گزارش‌های بعدی حتی با تغییر
 * تنظیمات، عدد تاریخی درست را نشان دهند.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('orders', 'cod_fee')) {
            return;
        }

        Schema::table('orders', function (Blueprint $table) {
            $table->decimal('cod_fee', 12, 2)
                ->default(0)
                ->after('tax_amount');
        });
    }

    public function down(): void
    {
        /*
         * گارد `hasColumn`: اگر ستون با این مایگریشن ساخته نشده باشد (مثلاً
         * up() به‌خاطر وجود ستون زودتر return کرده)، حذف آن خطا می‌دهد.
         */
        if (! Schema::hasColumn('orders', 'cod_fee')) {
            return;
        }

        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('cod_fee');
        });
    }
};
