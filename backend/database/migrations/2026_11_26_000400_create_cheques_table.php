<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * چک‌های پرداختی به تأمین‌کنندگان و چک‌های دریافتی از مشتریان.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('cheques')) {
            return;
        }

        Schema::create('cheques', function (Blueprint $table) {
            $table->id();

            // received = چک دریافتی از مشتری، paid = چک پرداختی به تأمین‌کننده
            $table->string('direction', 10)->default('paid');

            $table->decimal('amount', 15, 2)->default(0);
            $table->date('due_date');

            $table->string('bank_name')->nullable();
            $table->string('serial', 50)->nullable();
            $table->string('party_name')->nullable();

            $table->foreignId('supplier_id')
                ->nullable()
                ->constrained('suppliers')
                ->nullOnDelete();

            // pending | cleared | bounced | cancelled
            $table->string('status', 20)->default('pending');
            $table->timestamp('cleared_at')->nullable();

            $table->text('note')->nullable();

            $table->foreignId('created_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamps();

            $table->index('due_date');
            $table->index(['direction', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cheques');
    }
};
