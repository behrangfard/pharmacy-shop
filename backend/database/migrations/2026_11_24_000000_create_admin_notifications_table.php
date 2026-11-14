<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * اعلان‌های زنگولهٔ پنل مدیریت.
 *
 * هر رویداد مهم فروشگاه (سفارش جدید، تغییر وضعیت سفارش، پیام پشتیبانی،
 * درخواست مرجوعی) یک ردیف در این جدول می‌سازد و شمارندهٔ زنگولهٔ بالای پنل
 * از تعداد ردیف‌های خوانده‌نشده پر می‌شود.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admin_notifications', function (Blueprint $table) {
            $table->id();
            $table->string('type', 40);
            $table->string('title', 191);
            $table->string('body', 500)->nullable();
            $table->string('url', 191)->nullable();
            $table->json('meta')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index(['read_at', 'created_at']);
            $table->index(['type', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_notifications');
    }
};
