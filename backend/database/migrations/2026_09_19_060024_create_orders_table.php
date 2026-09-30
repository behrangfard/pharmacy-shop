<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                ->constrained('users')
                ->cascadeOnDelete();

            $table->string('order_number')->unique();

            $table->decimal('subtotal', 12, 2);

            $table->decimal('shipping_cost', 12, 2)
                ->default(0);

            $table->decimal('discount', 12, 2)
                ->default(0);

            $table->decimal('total', 12, 2);

            $table->string('status')
                ->default('pending');

            $table->string('payment_status')
                ->default('unpaid');

            $table->string('recipient_name');

            $table->string('phone', 30);

            $table->text('address');

            $table->string('postal_code', 20)
                ->nullable();

            $table->text('notes')
                ->nullable();

            $table->timestamps();

            $table->index('user_id');
            $table->index('status');
            $table->index('payment_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
