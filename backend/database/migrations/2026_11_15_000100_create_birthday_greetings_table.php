<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * ثبت هر تبریک تولد تا از ارسال تکراری در همان سال شمسی جلوگیری شود
     * و تاریخچه/وضعیت ارسال در پنل مدیریت قابل مشاهده باشد.
     */
    public function up(): void
    {
        Schema::create('birthday_greetings', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->unsignedSmallInteger('jalali_year')->index();
            $table->string('jalali_date', 10)->index();
            $table->string('channel', 20)->index();
            $table->string('recipient', 191);
            $table->text('body');
            $table->string('status', 20)->default('pending')->index();
            $table->string('provider_message_id', 191)->nullable();
            $table->text('error')->nullable();

            $table->foreignId('outbound_message_id')
                ->nullable()
                ->constrained('outbound_messages')
                ->nullOnDelete();

            $table->timestamp('sent_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'jalali_year']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('birthday_greetings');
    }
};
