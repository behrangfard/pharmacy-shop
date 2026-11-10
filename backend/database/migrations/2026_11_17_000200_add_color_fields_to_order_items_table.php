<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * رنگ انتخاب‌شدهٔ مشتری در اقلام سفارش.
 *
 * color_name  : رنگ محصول ساده (مثلاً «مشکی»)
 * pack_colors : رنگ هر قطعهٔ پک، به شکل [{name, color}, ...]
 *
 * این اطلاعات در سفارش نگه داشته می‌شود تا حتی اگر رنگ محصول بعداً
 * تغییر کند، تاریخچهٔ سفارش درست بماند.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('order_items', 'color_name')) {
            Schema::table('order_items', function (Blueprint $table) {
                $table->string('color_name', 60)->nullable()->after('variant_name');
            });
        }

        if (! Schema::hasColumn('order_items', 'pack_colors')) {
            Schema::table('order_items', function (Blueprint $table) {
                $table->json('pack_colors')->nullable()->after('color_name');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('order_items', 'pack_colors')) {
            Schema::table('order_items', function (Blueprint $table) {
                $table->dropColumn('pack_colors');
            });
        }

        if (Schema::hasColumn('order_items', 'color_name')) {
            Schema::table('order_items', function (Blueprint $table) {
                $table->dropColumn('color_name');
            });
        }
    }
};
