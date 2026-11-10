<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * افزودن «انیمیشن هاور» به تنظیمات بخش‌های بنر.
 *
 * مدیر می‌تواند برای هر بخشِ دسکتاپ (بنر بالای صفحه و بنر وسط صفحه) یک انیمیشن
 * انتخاب کند که با بردن نشانگر روی بنر اجرا می‌شود:
 * none | zoom | lift | zoom_lift | shine
 *
 * مقدار پیش‌فرض null است؛ یعنی همان «بدون انیمیشن». بخش چندستونه از قبل روی
 * هاور تصویرش را کمی بزرگ‌نمایی می‌کرد، پس همان رفتار برای آن حفظ می‌شود تا
 * ظاهر فعلی سایت تغییر نکند.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('banner_sections', function (Blueprint $table) {
            // انیمیشن هاور بنرهای همین بخش (null یعنی بدون انیمیشن).
            $table->string('animation', 20)->nullable()->after('radius');
        });

        DB::table('banner_sections')
            ->where('position', 'home_grid')
            ->whereNull('animation')
            ->update(['animation' => 'zoom']);
    }

    public function down(): void
    {
        Schema::table('banner_sections', function (Blueprint $table) {
            $table->dropColumn('animation');
        });
    }
};
