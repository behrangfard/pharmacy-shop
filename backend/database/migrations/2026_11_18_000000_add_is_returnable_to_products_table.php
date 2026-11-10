<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ضمانت بازگشت کالا در سطح هر محصول.
 *
 * بعضی کالاها بنا به دلایل بهداشتی (مثل لباس زیر) مرجوعی ندارند؛ با خاموش
 * کردن این ستون در پنل مدیریت، نشان «ضمانت بازگشت» در صفحهٔ محصول نمایش داده
 * نمی‌شود و به‌جای آن پیام «این کالا مرجوعی ندارد» می‌آید. پیش‌فرض برای
 * محصولات فعلی «دارد» است تا رفتار قبلی فروشگاه تغییر نکند.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('products', 'is_returnable')) {
            return;
        }

        Schema::table('products', function (Blueprint $table) {
            $table->boolean('is_returnable')->default(true)->after('is_taxable');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('is_returnable');
        });
    }
};
