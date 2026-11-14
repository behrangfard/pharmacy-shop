<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ثبت بهای تمام‌شدهٔ هر قلم سفارش در لحظهٔ فروش.
 *
 * با این ستون، سود هر دوره حتی پس از تغییر قیمت خرید محصولات دقیق می‌ماند.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('order_items', 'cost_price')) {
            return;
        }

        Schema::table('order_items', function (Blueprint $table) {
            $table->decimal('cost_price', 15, 2)
                ->nullable()
                ->after('unit_price');
        });
    }

    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn('cost_price');
        });
    }
};
