<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * مخاطبین پیام‌رسانی (شماره‌هایی که مدیر از فایل اکسل/ورد وارد می‌کند).
 *
 * این مخاطبین مستقل از مشتریان سایت‌اند تا شماره‌های باشگاه مشتریان یا
 * لیست‌های تبلیغاتی هم قابل ارسال باشد.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('messaging_contacts')) {
            return;
        }

        Schema::create('messaging_contacts', function (Blueprint $table) {
            $table->id();

            $table->string('name')->nullable();
            $table->string('phone', 20)->unique();

            // برچسب/گروه برای ارسال به بخشی از لیست (مثلاً «مشتریان VIP»).
            $table->string('group_name')->nullable();

            $table->string('note')->nullable();

            // منبع ورود: manual | xlsx | csv | txt | docx
            $table->string('source', 20)->default('manual');

            $table->boolean('is_active')->default(true);

            $table->foreignId('created_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamps();

            $table->index(['group_name', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('messaging_contacts');
    }
};
