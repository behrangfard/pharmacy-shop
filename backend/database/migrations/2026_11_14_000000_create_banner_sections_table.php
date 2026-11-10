<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('banner_sections', function (Blueprint $table) {
            $table->id();

            // home_grid (بخش چندستونهٔ صفحهٔ اول)
            $table->string('position', 40)->unique();

            // one | two | three | three_split | four
            $table->string('layout', 30)->default('two');

            $table->string('title')->nullable();
            $table->string('subtitle')->nullable();

            $table->boolean('is_active')->default(true);

            $table->timestamps();
        });

        /**
         * بخش چندستونهٔ صفحهٔ اول از ابتدا وجود دارد؛ مدیر فقط چیدمان و
         * عنوانش را تنظیم می‌کند. بنرهای این بخش با position=home_grid در
         * جدول banners ثبت می‌شوند.
         */
        DB::table('banner_sections')->insert([
            'position' => 'home_grid',
            'layout' => 'two',
            'title' => null,
            'subtitle' => null,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('banner_sections');
    }
};
