<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('shipping_method', 60)
                ->nullable()
                ->after('postal_code');

            $table->string('tracking_code', 60)
                ->nullable()
                ->after('shipping_method');

            $table->timestamp('shipped_at')
                ->nullable()
                ->after('tracking_code');

            $table->timestamp('delivered_at')
                ->nullable()
                ->after('shipped_at');

            $table->index('tracking_code');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['tracking_code']);

            $table->dropColumn([
                'shipping_method',
                'tracking_code',
                'shipped_at',
                'delivered_at',
            ]);
        });
    }
};
