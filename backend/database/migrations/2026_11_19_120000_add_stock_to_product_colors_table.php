<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * موجودی هر رنگ از پالت رنگ محصول.
 *
 * مدیر فروشگاه تعداد موجود هر رنگ را وارد می‌کند تا در فرم محصول معلوم باشد
 * از هر رنگ چند عدد در انبار است. این عدد «اطلاعاتی» است و موجودی رسمی کالا
 * همچنان `products.stock` یا موجودی تنوع‌هاست؛ بنابراین ثبت سفارش و
 * بازگردانی موجودی به این ستون دست نمی‌زنند.
 *
 * مقدار NULL یعنی «ثبت نشده» (رنگ‌های قبلی برای اینکه به‌غلط «۰ موجود»
 * دیده نشوند خالی می‌مانند) و ۰ یعنی «تمام شده».
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('product_colors', 'stock')) {
            return;
        }

        Schema::table('product_colors', function (Blueprint $table) {
            $table->unsignedInteger('stock')
                ->nullable()
                ->after('image');
        });
    }

    public function down(): void
    {
        Schema::table('product_colors', function (Blueprint $table) {
            $table->dropColumn('stock');
        });
    }
};
