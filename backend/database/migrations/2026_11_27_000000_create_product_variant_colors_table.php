<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ماتریس «موجودی هر رنگ در هر سایز».
 *
 * این جدول اطلاعاتی است: موجودی رسمی سفارش‌ها همچنان روی محصول و تنوع
 * (`product_variants.stock`) محاسبه می‌شود و این ردیف‌ها فقط برای مدیریت و
 * نمایش در پنل/صفحهٔ محصول استفاده می‌شوند.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_variant_colors', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignId('variant_id')->constrained('product_variants')->cascadeOnDelete();
            $table->foreignId('color_id')->constrained('product_colors')->cascadeOnDelete();
            $table->unsignedInteger('stock')->default(0);
            $table->timestamps();

            $table->unique(['variant_id', 'color_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_variant_colors');
    }
};
