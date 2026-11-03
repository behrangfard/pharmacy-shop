<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * تاریخچهٔ پیام‌های ارسالی از پنل مدیریت (پیامک، تلگرام، واتساپ، بله).
     */
    public function up(): void
    {
        Schema::create('outbound_messages', function (Blueprint $table) {
            $table->id();

            $table->string('channel', 20)->index();
            $table->string('recipient', 191);
            $table->text('body');
            $table->string('status', 20)->default('pending')->index();
            $table->string('provider_message_id', 191)->nullable();
            $table->text('error')->nullable();
            $table->json('meta')->nullable();

            $table->foreignId('sent_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamp('sent_at')->nullable();
            $table->timestamps();

            $table->index(['channel', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('outbound_messages');
    }
};
