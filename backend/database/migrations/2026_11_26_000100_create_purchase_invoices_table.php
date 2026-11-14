<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * فاکتورهای خرید (ورود کالا).
 *
 * با ثبت هر فاکتور، موجودی محصولات اقلام افزایش می‌یابد و «بهای تمام‌شده»
 * هر محصول با آخرین قیمت خرید به‌روز می‌شود.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('purchase_invoices')) {
            return;
        }

        Schema::create('purchase_invoices', function (Blueprint $table) {
            $table->id();

            $table->string('invoice_number')->unique();

            $table->foreignId('supplier_id')
                ->nullable()
                ->constrained('suppliers')
                ->nullOnDelete();

            // تاریخ فاکتور تأمین‌کننده
            $table->date('issued_at');

            $table->decimal('items_total', 15, 2)->default(0);
            $table->decimal('discount', 15, 2)->default(0);
            // باربری/کرایهٔ حمل کالا از تأمین‌کننده
            $table->decimal('shipping_cost', 15, 2)->default(0);
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('total', 15, 2)->default(0);

            $table->decimal('paid_amount', 15, 2)->default(0);
            // unpaid | partial | paid
            $table->string('payment_status', 20)->default('unpaid');

            $table->text('note')->nullable();

            $table->foreignId('created_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamps();

            $table->index('issued_at');
            $table->index('payment_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('purchase_invoices');
    }
};
