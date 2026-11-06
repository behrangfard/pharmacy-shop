<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * تصویر نسخهٔ موبایل بنر.
     *
     * بنر «اسلایدر اصلی» در تمام عرض صفحه و با نسبت تصویر خودش (بدون برش)
     * نمایش داده می‌شود؛ تصویر عریض ۱۹۲۰×۶۵۰ روی موبایل خیلی کوتاه و ریز
     * می‌شود. با این ستون می‌توان برای موبایل تصویری با نسبت عمودی/مربع
     * (مثلاً ۷۵۰×۱۰۰۰) ثبت کرد و سایت آن را زیر ۷۶۸ پیکسل نمایش می‌دهد.
     */
    public function up(): void
    {
        Schema::table('banners', function (Blueprint $table) {
            $table->string('mobile_image', 2048)->nullable();
        });

        // بنرهای موجودی که از تصویر آمادهٔ سایت استفاده می‌کنند نسخهٔ موبایل
        // از قبل ساخته‌شده دارند؛ همان را ثبت می‌کنیم تا مدیر در پنل ببیند.
        DB::table('banners')
            ->where('image', '/images/women-sport-hero.png')
            ->whereNull('mobile_image')
            ->update([
                'mobile_image' => '/images/women-sport-hero-mobile.png',
            ]);
    }

    public function down(): void
    {
        Schema::table('banners', function (Blueprint $table) {
            $table->dropColumn('mobile_image');
        });
    }
};
