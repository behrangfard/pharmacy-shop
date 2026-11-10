<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * اجزای «پک» چندعددی.
 *
 * بعضی محصولات (مثل پک سه‌عددی شورت) چند قطعه دارند و هر قطعه می‌تواند
 * رنگ جداگانه‌ای داشته باشد. هر ردیف این جدول یک قطعه از پک است و ستون
 * colors فهرست رنگ‌های مجاز همان قطعه را از پالت رنگ محصول نگه می‌دارد.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('product_pack_items')) {
            return;
        }

        Schema::create('product_pack_items', function (Blueprint $table) {
            $table->id();

            $table->foreignId('product_id')
                ->constrained()
                ->cascadeOnDelete();

            // نام قطعه؛ مثلاً «شورت اول» یا «ست لباس زیر».
            $table->string('name', 120);

            // تعداد این قطعه داخل بسته.
            $table->unsignedSmallInteger('quantity')->default(1);

            // فهرست رنگ‌های مجاز این قطعه (نام رنگ‌های پالت محصول).
            $table->json('colors')->nullable();

            $table->unsignedSmallInteger('sort_order')->default(0);

            $table->timestamps();

            $table->index(['product_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_pack_items');
    }
};
