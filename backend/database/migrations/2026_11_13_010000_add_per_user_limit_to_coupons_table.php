<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * سقف استفادهٔ هر کاربر برای کد تخفیف.
 *
 * تا قبل از این ستون فقط «usage_limit» (سقف کل) وجود داشت و یک مشتری
 * می‌توانست همان کد را بی‌نهایت بار در سفارش‌های مختلف استفاده کند.
 * مقدار خالی یعنی محدودیتی برای هر کاربر نیست.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('coupons', function (Blueprint $table) {
            $table->unsignedInteger('per_user_limit')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('coupons', function (Blueprint $table) {
            $table->dropColumn('per_user_limit');
        });
    }
};
