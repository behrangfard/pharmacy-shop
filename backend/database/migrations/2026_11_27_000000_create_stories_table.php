<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * استوری‌های صفحهٔ اول فروشگاه (دایره‌های بالای دسته‌بندی‌ها).
 *
 * هر استوری یک «مجموعهٔ اسلاید» است که با کلیک روی تصویر گرد آن، در نمایشگر
 * تمام‌صفحه (مثل استوری اینستاگرام) یکی‌یکی نمایش داده می‌شوند. تصویر گرد،
 * عنوان زیر آن، اسلایدها، ترتیب نمایش و وضعیت فعال بودن همه از پنل مدیران
 * (/admin/stories) مدیریت می‌شوند.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stories', function (Blueprint $table) {
            $table->id();

            /** برچسب کوتاه زیر دایرهٔ استوری (مثلاً «بهداشتی»). */
            $table->string('title', 120);

            /**
             * تصویر دایرهٔ استوری؛ اگر خالی باشد، تصویر اولین اسلاید
             * استفاده می‌شود.
             */
            $table->string('cover_image', 2048)->nullable();

            /**
             * اسلایدها به شکل آرایه‌ای از {image, caption, link}.
             * ساختار ثابت است و در مدل Story به array کست می‌شود.
             */
            $table->json('slides')->nullable();

            $table->unsignedInteger('sort_order')->default(0);

            /** استوری غیرفعال در سایت دیده نمی‌شود ولی حذف نمی‌شود. */
            $table->boolean('is_active')->default(true);

            $table->timestamps();

            /** فهرست فروشگاه همیشه با «فعال + ترتیب» خوانده می‌شود. */
            $table->index(['is_active', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stories');
    }
};
