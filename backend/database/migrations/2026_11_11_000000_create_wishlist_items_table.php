<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wishlist_items', function (Blueprint $table) {
            $table->id();

            // با حذف کاربر یا محصول، ردیف علاقه‌مندی هم حذف می‌شود تا داده
            // یتیم در انبار علاقه‌مندی‌ها باقی نماند.
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();

            $table->timestamps();

            // هر کاربر هر محصول را فقط یک‌بار می‌تواند ذخیره کند.
            $table->unique(['user_id', 'product_id']);
            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wishlist_items');
    }
};
