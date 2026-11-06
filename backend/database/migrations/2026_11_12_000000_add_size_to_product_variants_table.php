<?php

use App\Models\ProductVariant;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * ستون «سایز» برای تنوع‌های محصول.
 *
 * فیلتر سایز در فهرست فروشگاه روی همین ستون اعمال می‌شود. چون تا امروز
 * سایز فقط داخل نام تنوع بود («سایز 75B»)، مقدار ستون برای ردیف‌های
 * موجود از همان نام استخراج می‌شود.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('product_variants', 'size')) {
            Schema::table('product_variants', function (Blueprint $table) {
                $table->string('size', 50)->nullable()->after('name');
                $table->index('size');
            });
        }

        $this->backfillSizes();
    }

    public function down(): void
    {
        if (! Schema::hasColumn('product_variants', 'size')) {
            return;
        }

        Schema::table('product_variants', function (Blueprint $table) {
            $table->dropIndex(['size']);
            $table->dropColumn('size');
        });
    }

    /**
     * سایز تنوع‌های موجود را از نام آن‌ها استخراج می‌کند.
     */
    private function backfillSizes(): void
    {
        DB::table('product_variants')
            ->select('id', 'name')
            ->whereNull('size')
            ->orderBy('id')
            ->chunkById(200, function ($variants): void {
                foreach ($variants as $variant) {
                    $size = ProductVariant::deriveSizeFromName($variant->name);

                    if ($size === null) {
                        continue;
                    }

                    DB::table('product_variants')
                        ->where('id', $variant->id)
                        ->update(['size' => $size]);
                }
            });
    }
};
