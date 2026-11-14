<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * سفارش مهمان: کاربر ثبت‌شده اجباری نیست.
     *
     * برای حفظ Idempotency در ثبت سفارش مهمان، شناسهٔ پایدار مرورگر
     * (guest_token) در ستون جدا نگهداری می‌شود؛ یکتایی ترکیب
     * (guest_token, idempotency_key) از ثبت تکراری جلوگیری می‌کند.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->change();

            $table->string('guest_token', 36)
                ->nullable()
                ->after('user_id');

            $table->index('guest_token');
            $table->unique(
                ['guest_token', 'idempotency_key'],
                'orders_guest_idempotency_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropUnique('orders_guest_idempotency_unique');
            $table->dropIndex(['guest_token']);
            $table->dropColumn('guest_token');

            $table->foreignId('user_id')->nullable(false)->change();
        });
    }
};
