<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shipping_methods', function (Blueprint $table) {
            $table->id();

            $table->string('name', 100);
            $table->string('code', 60)->unique();

            // شرکت حمل‌ونقل (پست، تیپاکس، پیک داخلی فروشگاه و ...)
            $table->string('carrier', 100)->nullable();

            $table->string('description', 255)->nullable();

            // هزینهٔ پایه و هزینهٔ هر کیلوگرم اضافه
            $table->decimal('base_cost', 12, 2)->default(0);
            $table->decimal('cost_per_kg', 12, 2)->default(0);

            // بازهٔ وزنی مجاز (گرم) و زمان تقریبی تحویل (روز)
            $table->unsignedInteger('min_weight_grams')->nullable();
            $table->unsignedInteger('max_weight_grams')->nullable();
            $table->unsignedSmallInteger('min_days')->nullable();
            $table->unsignedSmallInteger('max_days')->nullable();

            // خرید بالاتر از این مبلغ با این روش رایگان می‌شود
            $table->decimal('free_over_amount', 12, 2)->nullable();

            // ارسال فوری (پیک موتوری/ارسال همان‌روز)
            $table->boolean('is_express')->default(false);

            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);

            // محدودهٔ جغرافیایی: خالی = همهٔ مناطق، وگرنه فقط شناسهٔ همین مناطق
            $table->json('zone_ids')->nullable();

            $table->timestamps();

            $table->index(['is_active', 'sort_order']);
        });

        // روش‌های ارسال پیش‌فرض فروشگاه تا پنل از ابتدا قابل استفاده باشد.
        $now = now();

        DB::table('shipping_methods')->insert([
            [
                'name' => 'پست پیشتاز',
                'code' => 'post_peyvast',
                'carrier' => 'پست جمهوری اسلامی',
                'description' => 'ارسال سراسری با تحویل ۲ تا ۴ روز کاری',
                'base_cost' => 60000,
                'cost_per_kg' => 15000,
                'min_days' => 2,
                'max_days' => 4,
                'is_express' => false,
                'is_active' => true,
                'sort_order' => 10,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'name' => 'پست سفارشی',
                'code' => 'post_sefareshi',
                'carrier' => 'پست جمهوری اسلامی',
                'description' => 'ارسال اقتصادی با تحویل ۴ تا ۷ روز کاری',
                'base_cost' => 40000,
                'cost_per_kg' => 9000,
                'min_days' => 4,
                'max_days' => 7,
                'is_express' => false,
                'is_active' => true,
                'sort_order' => 20,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'name' => 'پیک موتوری',
                'code' => 'motor_courier',
                'carrier' => 'پیک اختصاصی فروشگاه',
                'description' => 'ارسال درون‌شهری همان‌روز',
                'base_cost' => 40000,
                'cost_per_kg' => 0,
                'min_days' => 0,
                'max_days' => 1,
                'is_express' => true,
                'is_active' => true,
                'sort_order' => 30,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'name' => 'تیپاکس',
                'code' => 'tipax',
                'carrier' => 'تیپاکس',
                'description' => 'ارسال با شرکت حمل‌ونقل تیپاکس',
                'base_cost' => 90000,
                'cost_per_kg' => 20000,
                'min_days' => 1,
                'max_days' => 3,
                'is_express' => false,
                'is_active' => true,
                'sort_order' => 40,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'name' => 'تحویل حضوری',
                'code' => 'in_store_pickup',
                'carrier' => null,
                'description' => 'دریافت سفارش از فروشگاه',
                'base_cost' => 0,
                'cost_per_kg' => 0,
                'min_days' => 0,
                'max_days' => 0,
                'is_express' => false,
                'is_active' => true,
                'sort_order' => 50,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('shipping_methods');
    }
};
