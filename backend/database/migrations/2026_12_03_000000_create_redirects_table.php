<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ریدایرکت‌های ۳۰۱ صفحات عمومی (بخش «سلامت سئو» در پنل).
 *
 * چرا جدول لازم است: قاعدهٔ پروژه می‌گوید اسلاگ محصول/دسته/برند/صفحه نباید
 * بدون ریدایرکت عوض شود، ولی تا پیش از این هیچ‌جا برای ثبت مقصد قدیمی وجود
 * نداشت؛ بنابراین تغییر اسلاگ یعنی از دست دادن ترافیک و اعتبار آن آدرس.
 *
 * - `from_path` مسیر قدیمی (با «/» شروع، بدون «/» پایانی و بدون کوئری)
 * - `to_path`   مسیر جدید (داخلی یا نشانی کامل بیرونی)
 * - `hits`      چند بار از این ریدایرکت استفاده شده (با هر بار باز شدن مسیر قدیمی)
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('redirects')) {
            return;
        }

        Schema::create('redirects', function (Blueprint $table) {
            $table->id();

            // یکتایی روی خودِ مسیر؛ مسیرهای طولانی‌تر از ۲۵۵ کاراکتر پشتیبانی نمی‌شوند.
            $table->string('from_path')->unique();

            $table->string('to_path', 2048);

            $table->boolean('is_active')->default(true);

            $table->unsignedInteger('hits')->default(0);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('redirects');
    }
};
