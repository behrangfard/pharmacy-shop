<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * هزینه‌های فروشگاه (باربری ارسال، بسته‌بندی، تبلیغات و ...).
 *
 * این هزینه‌ها در گزارش سود دوره‌ای از سود ناخالص کم می‌شوند.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('expenses')) {
            return;
        }

        Schema::create('expenses', function (Blueprint $table) {
            $table->id();

            $table->string('title');
            // shipping | packaging | marketing | software | tax | other
            $table->string('category', 30)->default('other');

            $table->decimal('amount', 15, 2)->default(0);
            $table->date('spent_at');

            $table->foreignId('supplier_id')
                ->nullable()
                ->constrained('suppliers')
                ->nullOnDelete();

            $table->text('note')->nullable();

            $table->foreignId('created_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamps();

            $table->index('spent_at');
            $table->index('category');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expenses');
    }
};
