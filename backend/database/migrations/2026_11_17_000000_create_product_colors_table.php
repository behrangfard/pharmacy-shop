<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * پالت رنگ هر محصول.
 *
 * مشتری در صفحهٔ محصول یکی از این رنگ‌ها را انتخاب می‌کند و انتخاب او
 * همراه با سفارش ذخیره می‌شود. هر رنگ می‌تواند تصویر اختصاصی خودش را
 * داشته باشد تا با انتخاب آن، تصویر اصلی گالری عوض شود.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('product_colors')) {
            return;
        }

        Schema::create('product_colors', function (Blueprint $table) {
            $table->id();

            $table->foreignId('product_id')
                ->constrained()
                ->cascadeOnDelete();

            // نام فارسی رنگ؛ مثلاً «مشکی» یا «سرمه‌ای».
            $table->string('name', 60);

            // کد رنگ برای نمایش سواچ؛ مثلاً #111111.
            $table->string('hex', 9)->nullable();

            // تصویر مخصوص همین رنگ (اختیاری).
            $table->string('image')->nullable();

            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);

            $table->timestamps();

            $table->unique(['product_id', 'name']);
            $table->index(['product_id', 'is_active', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_colors');
    }
};
