<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * آستانهٔ «موجودی کم» برای هر کالا و هر تنوع.
 *
 * مقدار NULL یعنی «از پیش‌فرض فروشگاه استفاده شود»
 * (`config('inventory.low_stock_threshold')`). تنوعی که آستانهٔ خودش را ندارد
 * اول آستانهٔ محصول و بعد پیش‌فرض فروشگاه را به ارث می‌برد.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->unsignedInteger('low_stock_threshold')
                ->nullable()
                ->after('stock');
        });

        Schema::table('product_variants', function (Blueprint $table) {
            $table->unsignedInteger('low_stock_threshold')
                ->nullable()
                ->after('stock');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('low_stock_threshold');
        });

        Schema::table('product_variants', function (Blueprint $table) {
            $table->dropColumn('low_stock_threshold');
        });
    }
};
