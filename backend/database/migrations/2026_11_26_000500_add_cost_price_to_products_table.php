<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * بهای تمام‌شدهٔ هر محصول (آخرین قیمت خرید از فاکتور خرید).
 *
 * برای محاسبهٔ سود استفاده می‌شود و با هر بار ثبت فاکتور خرید به‌روز می‌شود.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('products', 'cost_price')) {
            return;
        }

        Schema::table('products', function (Blueprint $table) {
            $table->decimal('cost_price', 15, 2)
                ->nullable()
                ->after('price');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('cost_price');
        });
    }
};
