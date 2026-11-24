<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * انتساب سفارش به کمپین (UTM + ارجاع‌دهنده).
 *
 * با این ستون‌ها هر سفارش می‌گوید از کدام منبع/کمپین آمده است؛ بدون نیاز به
 * GA4 می‌شود گفت «چند درصد فروش این ماه از کمپین X بود». همهٔ مقادیر
 * اختیاری‌اند (NULL = نامشخص) و در `OrderController@store` پاک‌سازی و
 * محدود می‌شوند.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('utm_source', 180)->nullable();
            $table->string('utm_medium', 180)->nullable();
            $table->string('utm_campaign', 180)->nullable();
            $table->string('utm_content', 180)->nullable();
            $table->string('utm_term', 180)->nullable();

            /** آدرس صفحهٔ ارجاع‌دهنده (Referer)؛ فقط متن ساده و کوتاه. */
            $table->string('referrer', 500)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn([
                'utm_source',
                'utm_medium',
                'utm_campaign',
                'utm_content',
                'utm_term',
                'referrer',
            ]);
        });
    }
};
