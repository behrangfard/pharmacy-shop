<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * گردی گوشهٔ مستقل هر بخش بنر + دو بخش مستقل بنر موبایل.
     *
     * تا پیش از این یک گردی گوشهٔ مشترک (`appearance.radius` در store_settings)
     * روی همهٔ بنرها اعمال می‌شد. حالا هر بخش (هیرو، چندستونه، بنر بالای موبایل
     * و بنر وسط موبایل) گردی گوشهٔ خودش را دارد؛ مقدار NULL یعنی «همان پیش‌فرض
     * سایت» تا نصب‌های قدیمی بدون تغییر ظاهر ادامه دهند.
     *
     * دو بخش موبایل هم اینجا ساخته می‌شوند تا پنل مدیریت و فروشگاه بدون رکورد
     * نمانند. بنرهای موبایل کاملاً جدا از بنرهای دسکتاپ‌اند (position جدا).
     */
    public function up(): void
    {
        Schema::table('banner_sections', function (Blueprint $table) {
            // گردی گوشهٔ کادر بنرهای همین بخش (پیکسل)؛ null = پیش‌فرض سایت.
            $table->unsignedSmallInteger('radius')->nullable()->after('fit');
        });

        foreach (['home_mobile_top', 'home_mobile_middle'] as $position) {
            if (DB::table('banner_sections')->where('position', $position)->exists()) {
                continue;
            }

            DB::table('banner_sections')->insert([
                'position' => $position,
                'layout' => 'one',
                'title' => null,
                'subtitle' => null,
                'image_count' => null,
                'height_desktop' => null,
                'height_mobile' => null,
                'fit' => 'contain',
                'radius' => null,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        DB::table('banner_sections')
            ->whereIn('position', ['home_mobile_top', 'home_mobile_middle'])
            ->delete();

        Schema::table('banner_sections', function (Blueprint $table) {
            $table->dropColumn('radius');
        });
    }
};
