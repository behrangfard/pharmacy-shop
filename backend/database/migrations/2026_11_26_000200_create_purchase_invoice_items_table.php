<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * اقلام فاکتور خرید.
 *
 * هر قلم می‌تواند به یک محصول سایت وصل باشد (موجودی افزایش می‌یابد) یا فقط
 * برای ثبت هزینه/کالای متفرقه باشد (بدون اثر روی موجودی).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('purchase_invoice_items')) {
            return;
        }

        Schema::create('purchase_invoice_items', function (Blueprint $table) {
            $table->id();

            $table->foreignId('purchase_invoice_id')
                ->constrained('purchase_invoices')
                ->cascadeOnDelete();

            $table->foreignId('product_id')
                ->nullable()
                ->constrained('products')
                ->nullOnDelete();

            $table->string('title');
            $table->string('sku')->nullable();

            $table->unsignedInteger('quantity')->default(1);
            $table->decimal('unit_cost', 15, 2)->default(0);
            $table->decimal('discount', 15, 2)->default(0);
            $table->decimal('total', 15, 2)->default(0);

            $table->timestamps();

            $table->index('product_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('purchase_invoice_items');
    }
};
