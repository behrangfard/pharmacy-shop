<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * کتابخانه فونت بنرها.
     *
     * مدیر میتواند فایل فونت (woff2/woff/ttf/otf) را از سیستم خودش بارگذاری
     * کند یا نشانی یک فونت بیرونی (فایل مستقیم یا CSS گوگل فونت) را ثبت کند.
     * فونتهای فعال در فروشگاه بهصورت @font-face تزریق میشوند تا متن لایههای
     * بنر با همان فونت نمایش داده شود.
     */
    public function up(): void
    {
        Schema::create('banner_fonts', function (Blueprint $table) {
            $table->id();

            $table->string('name', 100);
            $table->string('family', 60);

            // upload | url
            $table->string('source', 10)->default('upload');

            $table->string('file_path', 2048)->nullable();
            $table->string('file_format', 10)->nullable();
            $table->string('external_url', 2048)->nullable();

            $table->unsignedSmallInteger('weight')->default(400);

            // normal | italic
            $table->string('style', 10)->default('normal');

            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['is_active', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('banner_fonts');
    }
};
