<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * آیتم‌های «نوار اطلاع‌رسانی» بالای هدر فروشگاه.
 *
 * نوار یک ردیف باریک در تمام عرض صفحه است که برای اطلاع‌رسانی تخفیف‌ها و
 * تبلیغات استفاده می‌شود. هر آیتم می‌تواند متن، تصویر (شامل GIF/WebP متحرک)
 * یا ویدیوی کوتاه باشد؛ اگر چند آیتم فعال ثبت شود، در سایت با فاصلهٔ زمانی
 * مشخص جابه‌جا می‌شوند. تنظیمات ظاهری نوار (ارتفاع دسکتاپ/موبایل، رنگ‌ها،
 * اندازهٔ متن، سرعت و نوع انیمیشن) در جدول store_settings نگهداری می‌شود.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('announcement_bar_items', function (Blueprint $table) {
            $table->id();

            /** text | image | video */
            $table->string('type', 20)->default('text');

            /** متن اطلاع‌رسانی (برای آیتم متنی الزامی است). */
            $table->string('text', 500)->nullable();

            /** مسیر فایل تصویر/ویدیو (برای آیتم تصویری و ویدیویی). */
            $table->string('image', 2048)->nullable();

            /** لینک مقصد (مثلاً صفحهٔ تخفیف‌ها یا آدرس بیرونی). */
            $table->string('link', 2048)->nullable();

            $table->boolean('open_in_new_tab')->default(false);
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->timestamps();

            $table->index(['is_active', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('announcement_bar_items');
    }
};
