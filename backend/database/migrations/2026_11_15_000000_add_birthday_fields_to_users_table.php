<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * اطلاعات لازم برای پیامک تبریک تولد:
     * شمارهٔ موبایل، تاریخ تولد و امکان انصراف مشتری از دریافت پیامک.
     *
     * تاریخ تولد میلادی ذخیره می‌شود، اما تطبیق «روز و ماه تولد» با تقویم
     * شمسی انجام می‌شود (App\Support\JalaliDate).
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone', 20)->nullable()->after('email');
            $table->date('birth_date')->nullable()->after('phone');
            $table->boolean('birthday_greeting_opt_out')->default(false)->after('birth_date');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['phone', 'birth_date', 'birthday_greeting_opt_out']);
        });
    }
};
