<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shipping_zones', function (Blueprint $table) {
            $table->id();

            $table->string('province', 100);
            $table->string('city', 100)->nullable();
            $table->string('area', 120)->nullable();

            // هزینهٔ ارسال مخصوص این منطقه (خالی = استفاده از تعرفهٔ روش ارسال)
            $table->decimal('cost', 12, 2)->nullable();

            $table->boolean('is_express_available')->default(false);
            $table->boolean('is_active')->default(true);

            $table->string('note', 255)->nullable();

            $table->timestamps();

            $table->index(['province', 'city']);
            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shipping_zones');
    }
};
