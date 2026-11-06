<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * «راهنمای سایز اختصاصی محصول».
 *
 * برخلاف راهنمای سایز عمومی سایت (صفحهٔ /size-guide و مودال عمومی)، این جدول
 * برای هر محصول یک راهنمای مستقل نگه می‌دارد: توضیحات، جدول اندازه‌ها،
 * مشخصات دوخت/ابعاد، مراحل اندازه‌گیری، تصویر راهنما و نکته‌های همان مدل.
 * هر محصول حداکثر یک رکورد دارد (one-to-one) و با حذف محصول پاک می‌شود.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_size_guides', function (Blueprint $table) {
            $table->id();

            $table->foreignId('product_id')
                ->constrained()
                ->cascadeOnDelete()
                ->unique();

            /** اگر خاموش باشد، راهنما در صفحهٔ محصول نمایش داده نمی‌شود. */
            $table->boolean('is_enabled')->default(true);

            /** عنوان دلخواه راهنما (مثلاً «سایزبندی مدل آنجل»). */
            $table->string('title', 150)->nullable();

            /** توضیح کوتاه بالای جدول؛ متن آزاد مدیر. */
            $table->text('intro')->nullable();

            /** واحد اندازه‌ها: cm | inch | none */
            $table->string('unit', 10)->default('cm');

            /** مسیر تصویر «نحوهٔ اندازه‌گیری». */
            $table->string('measure_image', 2048)->nullable();

            /** [{"title": "...", "description": "..."}] */
            $table->json('measure_steps')->nullable();

            /** سرستون‌های جدول سایز؛ مثل ["سایز", "دور سینه", "دور کمر"] */
            $table->json('columns')->nullable();

            /** سطرهای جدول سایز؛ هر سطر هم‌طول ستون‌ها است. */
            $table->json('rows')->nullable();

            /** ابعاد و مشخصات ثابت لباس؛ [{"label": "قد", "value": "75"}] */
            $table->json('specs')->nullable();

            /** توصیه انتخاب سایز (مثلاً «اگر بین دو سایز هستید...»). */
            $table->text('fit_note')->nullable();

            /** یادداشت پایانی (جنس پارچه، نکته شست‌وشو و ...). */
            $table->text('note')->nullable();

            /** نکته‌های کوتاه؛ آرایه‌ای از رشته‌ها. */
            $table->json('tips')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_size_guides');
    }
};
