<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('support_conversations', function (Blueprint $table) {
            $table->id();

            // توکن عمومی گفتگو؛ کلید دسترسی مهمان به گفتگوی خودش است.
            $table->uuid('token')->unique();

            $table->foreignId('user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->string('name', 100)->nullable();
            $table->string('contact', 191)->nullable();
            $table->string('subject', 191)->nullable();

            // web | telegram | whatsapp | bale
            $table->string('channel', 20)->default('web');

            // شناسهٔ گفتگو در پیام‌رسان (chat_id / شمارهٔ واتساپ)
            $table->string('channel_chat_id', 191)->nullable();

            // open | pending | closed
            $table->string('status', 20)->default('open');

            $table->string('last_message_excerpt', 191)->nullable();
            $table->timestamp('last_message_at')->nullable();

            $table->unsignedInteger('admin_unread_count')->default(0);
            $table->unsignedInteger('user_unread_count')->default(0);

            $table->string('ip_address', 45)->nullable();
            $table->timestamp('closed_at')->nullable();

            $table->timestamps();

            $table->index(['status', 'last_message_at']);
            $table->index(['channel', 'channel_chat_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('support_conversations');
    }
};
