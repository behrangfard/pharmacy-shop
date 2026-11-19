<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * دفتر «گردش موجودی» (ledger).
 *
 * تا پیش از این فقط عدد نهایی `products.stock` و `product_variants.stock`
 * نگه‌داری می‌شد و معلوم نبود چه سفارش، فاکتور خرید یا ویرایش دستی موجودی را
 * تغییر داده است. هر ردیف این جدول یک تغییر خالص را ثبت می‌کند:
 *   - `quantity`  تغییر موجودی (کاهش منفی، افزایش مثبت)
 *   - `stock_after` موجودی همان کالا/تنوع بلافاصله پس از تغییر
 *   - `type`      علت تغییر (سفارش، بازگردانی سفارش، خرید، ویرایش دستی، ایمپورت)
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('stock_movements')) {
            return;
        }

        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();

            $table->foreignId('product_id')
                ->constrained('products')
                ->cascadeOnDelete();

            $table->foreignId('variant_id')
                ->nullable()
                ->constrained('product_variants')
                ->nullOnDelete();

            $table->foreignId('order_id')
                ->nullable()
                ->constrained('orders')
                ->nullOnDelete();

            $table->foreignId('purchase_invoice_id')
                ->nullable()
                ->constrained('purchase_invoices')
                ->nullOnDelete();

            /*
             * کاربری که تغییر را انجام داده است (مدیر در ویرایش دستی، مشتری در
             * ثبت سفارش)؛ برای مهمان و عملیات سیستمی NULL می‌ماند.
             */
            $table->foreignId('user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->string('type', 32);

            $table->integer('quantity');

            $table->integer('stock_after');

            $table->string('note')->nullable();

            $table->timestamps();

            $table->index(['product_id', 'variant_id']);
            $table->index(['type', 'created_at']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
    }
};
