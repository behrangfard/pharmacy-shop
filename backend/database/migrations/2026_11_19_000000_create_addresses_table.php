<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * دفترچهٔ آدرس مشتریان.
 *
 * هر کاربر می‌تواند چند آدرس (خانه، محل کار، ...) ثبت کند و هنگام تسویه
 * حساب یکی را انتخاب کند؛ یک آدرس می‌تواند پیش‌فرض باشد.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('addresses', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->string('title', 60)->nullable();

            $table->string('recipient_name', 255);
            $table->string('phone', 30);
            $table->string('province', 100);
            $table->string('city', 100);
            $table->text('address');
            $table->string('postal_code', 10)->nullable();

            // مختصات انتخاب‌شده از روی نقشه (اختیاری).
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();

            $table->boolean('is_default')->default(false);

            $table->timestamps();

            $table->index(['user_id', 'is_default']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('addresses');
    }
};
