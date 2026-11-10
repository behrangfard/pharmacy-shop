<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * تنظیمات ابعاد و تعداد تصاویر بخش‌های بنر.
     *
     * تا پیش از این فقط «بخش چندستونه» (home_grid) قابل تنظیم بود و چیدمانش
     * تعداد و نسبت تصویر را تعیین می‌کرد. اسلایدر اصلی صفحهٔ اول (home_hero) با
     * کل عرض صفحه رندر می‌شد و تصویر کوچک با بزرگ‌نمایی کل صفحه را می‌گرفت.
     *
     * حالا هر بخش می‌تواند حداکثر ارتفاع هر نما، سقف تعداد تصاویر و نحوهٔ
     * جاگیری تصویر (contain = بدون برش و بدون بزرگ‌نمایی | cover = پرکردن کادر
     * با برش) داشته باشد.
     */
    public function up(): void
    {
        Schema::table('banner_sections', function (Blueprint $table) {
            // سقف تعداد تصویرهای نمایش‌داده‌شده؛ null یا 0 یعنی «همه».
            $table->unsignedSmallInteger('image_count')->nullable()->after('subtitle');

            // حداکثر ارتفاع بنر در هر نما (پیکسل)؛ null یا 0 یعنی ارتفاع طبیعی.
            $table->unsignedSmallInteger('height_desktop')->nullable()->after('image_count');
            $table->unsignedSmallInteger('height_mobile')->nullable()->after('height_desktop');

            // contain | cover
            $table->string('fit', 10)->default('contain')->after('height_mobile');
        });

        /**
         * بخش هیرو از ابتدا وجود دارد تا پنل مدیریت بدون رکورد نماند و رفتار
         * پیش‌فرض (بدون زوم و بدون برش، ارتفاع طبیعی) حفظ شود.
         */
        if (! DB::table('banner_sections')->where('position', 'home_hero')->exists()) {
            DB::table('banner_sections')->insert([
                'position' => 'home_hero',
                'layout' => 'one',
                'title' => null,
                'subtitle' => null,
                'image_count' => null,
                'height_desktop' => null,
                'height_mobile' => null,
                'fit' => 'contain',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        DB::table('banner_sections')->where('position', 'home_hero')->delete();

        Schema::table('banner_sections', function (Blueprint $table) {
            $table->dropColumn(['image_count', 'height_desktop', 'height_mobile', 'fit']);
        });
    }
};
