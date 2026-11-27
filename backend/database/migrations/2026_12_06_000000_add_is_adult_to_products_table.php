<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * علامت «محتوای ویژهٔ بزرگسالان (۱۸+)» روی محصول.
 *
 * کالای ۱۸+ فقط در صفحهٔ ویژهٔ `/adult` (پس از تأیید سن) نمایش داده می‌شود و
 * از فهرست/جست‌وجو، صفحهٔ دسته و برند، بخش‌های صفحهٔ اصلی، فید گوگل مرچنت و
 * sitemap بیرون می‌ماند.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->boolean('is_adult')
                ->default(false)
                ->after('is_new');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('is_adult');
        });
    }
};
