<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * نشان‌های اعتماد و مجوزهای فروشگاه (اینماد، ساماندهی، نمادهای صنفی و ...).
 *
 * این نشان‌ها در فوتر سایت (سمت چپ، پایین صفحه) نمایش داده می‌شوند و از پنل
 * مدیران (/admin/trust-badges) کامل مدیریت می‌شوند: عنوان، تصویر، لینک مقصد،
 * باز شدن در تب جدید، ترتیب نمایش و وضعیت فعال بودن.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('trust_badges', function (Blueprint $table) {
            $table->id();

            /** عنوان کوتاه نشان؛ برای alt تصویر و برچسب زیر آن. */
            $table->string('title', 120);

            /** مسیر تصویر نشان (storage یا مسیر نسبی /images/...). */
            $table->string('image', 2048);

            /** آدرس صفحهٔ مجوز؛ خالی یعنی نشان کلیک‌پذیر نیست. */
            $table->string('link', 2048)->nullable();

            /** باز شدن لینک در تب جدید. */
            $table->boolean('open_in_new_tab')->default(true);

            $table->unsignedInteger('sort_order')->default(0);

            /** نشان غیرفعال در فروشگاه دیده نمی‌شود ولی حذف نمی‌شود. */
            $table->boolean('is_active')->default(true);

            $table->timestamps();

            /** فهرست فروشگاه همیشه با «فعال + ترتیب» خوانده می‌شود. */
            $table->index(['is_active', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('trust_badges');
    }
};
