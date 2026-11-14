<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * پاپ‌آپ‌های تبلیغاتی فروشگاه.
 *
 * هر پاپ‌آپ یک «کمپین» است: محتوا (عنوان، توضیح، تصویر، دکمه‌ها، کد تخفیف)،
 * ظاهر (تم، جاگذاری، موقعیت تصویر)، هدف‌گیری (صفحه‌ها و دستگاه‌ها)، زمان‌بندی
 * (بازهٔ شروع/پایان + شمارش معکوس) و قواعد نمایش (تأخیر، بستن خودکار و
 * دفعات نمایش برای هر بازدیدکننده). همهٔ این‌ها از پنل مدیریت
 * (/admin/popups) کنترل می‌شود.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('popups', function (Blueprint $table) {
            $table->id();

            /** عنوان اصلی پاپ‌آپ (اختیاری؛ پاپ‌آپ فقط‌تصویری هم مجاز است). */
            $table->string('title', 120)->nullable();

            /** برچسب کوچک بالای عنوان (مثل «پیشنهاد ویژه»). */
            $table->string('badge', 60)->nullable();

            /** متن توضیح پاپ‌آپ. */
            $table->text('description')->nullable();

            /** تصویر پاپ‌آپ (مسیر دیسک public). */
            $table->string('image', 2048)->nullable();

            /** متن جایگزین تصویر برای دسترس‌پذیری و سئو. */
            $table->string('image_alt', 160)->nullable();

            /** تم رنگی: light | dark | brand. */
            $table->string('theme', 16)->default('light');

            /** جاگذاری: center (مودال وسط) | bottom (شیت پایین) | corner (کارت گوشه). */
            $table->string('layout', 16)->default('center');

            /** موقعیت تصویر در دسکتاپ: top (بالا) | side (کنار متن). */
            $table->string('image_position', 12)->default('top');

            /** دکمهٔ اصلی اقدام (متن + لینک). */
            $table->string('cta_text', 40)->nullable();
            $table->string('cta_link', 2048)->nullable();

            /** دکمهٔ دوم کم‌رنگ‌تر (مثلاً «بعداً یادآوری کن»). */
            $table->string('secondary_text', 40)->nullable();
            $table->string('secondary_link', 2048)->nullable();

            /** کد تخفیف اختیاری با دکمهٔ کپی. */
            $table->string('coupon_code', 40)->nullable();

            /**
             * صفحه‌های هدف: home | products | product | cart | checkout.
             * خالی/نال یعنی همهٔ صفحه‌ها.
             */
            $table->json('display_pages')->nullable();

            /** دستگاه هدف: all | desktop | mobile. */
            $table->string('devices', 12)->default('all');

            /** چند ثانیه بعد از بارگذاری صفحه باز شود (۰ یعنی بلافاصله). */
            $table->unsignedSmallInteger('delay_seconds')->default(0);

            /** بستن خودکار پس از چند ثانیه (۰ یعنی غیرفعال). */
            $table->unsignedSmallInteger('auto_close_seconds')->default(0);

            /**
             * قاعدهٔ تکرار برای هر بازدیدکننده:
             * always (همیشه) | session (هر باز新しい) | daily (روزی یک‌بار) |
             * weekly (هفتگی) | once (تا وقتی بسته نشده مرورگر).
             */
            $table->string('frequency', 12)->default('session');

            /** بازهٔ زمانی نمایش کمپین. */
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();

            /** مهلت شمارش معکوس نمایش‌داده‌شده داخل پاپ‌آپ (اختیاری). */
            $table->timestamp('countdown_to')->nullable();

            $table->boolean('close_on_backdrop')->default(true);
            $table->boolean('show_close')->default(true);

            /** پاپ‌آپ غیرفعال در سایت دیده نمی‌شود ولی حذف نمی‌شود. */
            $table->boolean('is_active')->default(true);

            /** اولویت نمایش وقتی چند پاپ‌آپ واجد شرایط هستیم (کوچک‌تر = اول). */
            $table->unsignedInteger('sort_order')->default(0);

            $table->timestamps();

            /** فهرست عمومی همیشه با «فعال + ترتیب» خوانده می‌شود. */
            $table->index(['is_active', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('popups');
    }
};
