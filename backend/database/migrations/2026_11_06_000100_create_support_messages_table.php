<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('support_messages', function (Blueprint $table) {
            $table->id();

            $table->foreignId('conversation_id')
                ->constrained('support_conversations')
                ->cascadeOnDelete();

            $table->foreignId('admin_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            // user | admin | system
            $table->string('sender', 20)->default('user');

            $table->text('body');

            // اطلاعات کمکی: صفحهٔ مبدأ، شناسهٔ پیام پیام‌رسان، ...
            $table->json('meta')->nullable();

            $table->timestamps();

            $table->index(['conversation_id', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('support_messages');
    }
};
