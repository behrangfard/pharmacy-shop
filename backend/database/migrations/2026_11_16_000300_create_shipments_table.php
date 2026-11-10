<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shipments', function (Blueprint $table) {
            $table->id();

            // شمارهٔ مرسوله (مستقل از شمارهٔ سفارش)
            $table->string('shipment_number', 40)->unique();

            $table->foreignId('order_id')
                ->constrained('orders')
                ->cascadeOnDelete();

            $table->foreignId('shipping_method_id')
                ->nullable()
                ->constrained('shipping_methods')
                ->nullOnDelete();

            // وضعیت مرسوله (مستقل از وضعیت سفارش)
            $table->string('status', 40)->default('awaiting_packaging');

            $table->string('carrier', 100)->nullable();

            $table->string('recipient_name', 150);
            $table->string('phone', 30)->nullable();
            $table->string('province', 100)->nullable();
            $table->string('city', 100)->nullable();
            $table->text('address');
            $table->string('postal_code', 20)->nullable();

            $table->string('tracking_code', 80)->nullable();
            $table->decimal('cost', 12, 2)->default(0);

            // وزن واقعی و وزن حجمی بسته (گرم) و تعداد بسته
            $table->unsignedInteger('weight_grams')->nullable();
            $table->unsignedInteger('volumetric_weight_grams')->nullable();
            $table->unsignedSmallInteger('package_count')->default(1);

            $table->text('notes')->nullable();

            // علت تأخیر یا برگشت مرسوله
            $table->string('delay_reason', 255)->nullable();
            $table->string('return_reason', 255)->nullable();

            $table->timestamp('shipped_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('expected_delivery_at')->nullable();

            $table->foreignId('created_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamps();

            $table->index(['status', 'created_at']);
            $table->index('tracking_code');
            $table->index('order_id');
            $table->index('expected_delivery_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shipments');
    }
};
