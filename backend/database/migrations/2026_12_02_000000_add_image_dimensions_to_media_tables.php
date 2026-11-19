<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ابعاد ذاتی تصاویر بنر و گالری محصول.
 *
 * چرا: بدون width/height، مرورگر تا بارگذاری تصویر ارتفاع کادر را نمی‌داند و
 * صفحه می‌پرد (CLS). این ستون‌ها هنگام ذخیرهٔ مدل از روی فایل واقعی پر
 * می‌شوند (App\Support\Media\ImageDimensions) و فروشگاه آن‌ها را روی تگ
 * <img> می‌گذارد.
 */
return new class extends Migration
{
    public function up(): void
    {
        /*
         * گارد ستون‌به‌ستون: روی دیتابیسی که این ستون‌ها را از قبل دارد
         * (نصب دستی/بازیابی دامپ) اجرای دوباره نباید با «Duplicate column»
         * بشکند — همان الگوی بقیهٔ مایگریشن‌های افزایشی این پروژه.
         */
        $banners = array_filter([
            'image_width' => ['after' => 'image_alt'],
            'image_height' => ['after' => 'image_width'],
            'mobile_image_width' => ['after' => 'mobile_image'],
            'mobile_image_height' => ['after' => 'mobile_image_width'],
        ], fn (string $column): bool => ! Schema::hasColumn('banners', $column), ARRAY_FILTER_USE_KEY);

        if ($banners !== []) {
            Schema::table('banners', function (Blueprint $table) use ($banners) {
                foreach ($banners as $column => $options) {
                    $table->unsignedSmallInteger($column)
                        ->nullable()
                        ->after($options['after']);
                }
            });
        }

        $productImages = array_filter([
            'width' => ['after' => 'alt'],
            'height' => ['after' => 'width'],
        ], fn (string $column): bool => ! Schema::hasColumn('product_images', $column), ARRAY_FILTER_USE_KEY);

        if ($productImages !== []) {
            Schema::table('product_images', function (Blueprint $table) use ($productImages) {
                foreach ($productImages as $column => $options) {
                    $table->unsignedSmallInteger($column)
                        ->nullable()
                        ->after($options['after']);
                }
            });
        }
    }

    public function down(): void
    {
        foreach ([
            'banners' => ['image_width', 'image_height', 'mobile_image_width', 'mobile_image_height'],
            'product_images' => ['width', 'height'],
        ] as $table => $columns) {
            $existing = array_values(array_filter(
                $columns,
                fn (string $column): bool => Schema::hasColumn($table, $column)
            ));

            if ($existing === []) {
                continue;
            }

            Schema::table($table, function (Blueprint $blueprint) use ($existing) {
                $blueprint->dropColumn($existing);
            });
        }
    }
};
