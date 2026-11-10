<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shipping_rules', function (Blueprint $table) {
            $table->id();

            $table->string('title', 150);

            // fixed | free_over_amount | weight_based | zone_based
            $table->string('type', 40)->default('fixed');

            // خالی = برای همهٔ روش‌های ارسال
            $table->foreignId('shipping_method_id')
                ->nullable()
                ->constrained('shipping_methods')
                ->nullOnDelete();

            $table->string('province', 100)->nullable();
            $table->string('city', 100)->nullable();

            // آستانهٔ مبلغ برای قانون «ارسال رایگان»
            $table->decimal('threshold_amount', 12, 2)->nullable();

            // مبلغ ثابت قانون و هزینهٔ هر کیلوگرم (برای قانون وزنی)
            $table->decimal('amount', 12, 2)->default(0);
            $table->decimal('cost_per_kg', 12, 2)->nullable();

            // عدد بزرگ‌تر = اولویت بالاتر
            $table->unsignedSmallInteger('priority')->default(0);

            $table->boolean('is_active')->default(true);

            $table->string('note', 255)->nullable();

            $table->timestamps();

            $table->index(['is_active', 'priority']);
            $table->index('shipping_method_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shipping_rules');
    }
};
