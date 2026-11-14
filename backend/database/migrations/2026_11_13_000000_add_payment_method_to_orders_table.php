<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * روش پرداخت سفارش و زمان ثبت پرداخت.
 *
 * سفارش‌های قبلی «online» در نظر گرفته می‌شوند تا رفتار فعلی تغییر نکند.
 * paid_at برای سفارش‌هایی که قبلاً پرداخت شده‌اند با updated_at پر می‌شود
 * تا گزارش‌ها از ابتدا مقدار داشته باشند.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('payment_method', 20)
                ->default('online')
                ->after('payment_status');

            $table->timestamp('paid_at')
                ->nullable()
                ->after('payment_method');

            $table->index('payment_method');
        });

        DB::table('orders')
            ->where('payment_status', 'paid')
            ->whereNull('paid_at')
            ->update([
                'paid_at' => DB::raw('COALESCE(updated_at, created_at)'),
            ]);
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['payment_method']);

            $table->dropColumn([
                'payment_method',
                'paid_at',
            ]);
        });
    }
};
