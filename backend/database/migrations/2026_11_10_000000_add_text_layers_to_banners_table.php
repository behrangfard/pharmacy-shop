<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * متن قابل مدیریت روی بنرها (تصویر بدون متن + متن HTML).
     *
     * - image_alt: متن جایگزین تصویر برای موتورهای جستجو و screen reader.
     * - text_scrim: پرده تیره اختیاری پشت متن برای خوانایی روی تصویر.
     * - text_layers: لایههای متن با موقعیت و فونت و رنگ و چیدمان دلخواه (JSON).
     *
     * متنها بهصورت HTML واقعی رندر میشوند (نه داخل تصویر) تا برای سئو
     * قابل خواندن باشند. ساختار هر لایه در App\Support\BannerText نرمال میشود.
     */
    public function up(): void
    {
        Schema::table('banners', function (Blueprint $table) {
            $table->string('image_alt', 255)->nullable()->after('mobile_image');
            $table->string('text_scrim', 20)->nullable()->after('image_alt');
            $table->json('text_layers')->nullable()->after('text_scrim');
        });
    }

    public function down(): void
    {
        Schema::table('banners', function (Blueprint $table) {
            $table->dropColumn(['image_alt', 'text_scrim', 'text_layers']);
        });
    }
};
