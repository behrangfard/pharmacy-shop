<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $hasVariantId = Schema::hasColumn('order_items', 'variant_id');
        $hasVariantName = Schema::hasColumn('order_items', 'variant_name');

        if ($hasVariantId && $hasVariantName) {
            return;
        }

        Schema::table('order_items', function (Blueprint $table) use (
            $hasVariantId,
            $hasVariantName
        ) {
            if (!$hasVariantId) {
                $table->foreignId('variant_id')
                    ->nullable()
                    ->after('product_id')
                    ->constrained('product_variants')
                    ->restrictOnDelete();
            }

            if (!$hasVariantName) {
                $table->string('variant_name')
                    ->nullable()
                    ->after('product_name');
            }
        });
    }

    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            if (Schema::hasColumn('order_items', 'variant_id')) {
                $table->dropForeign(['variant_id']);
            }
        });

        $columns = array_values(array_filter([
            Schema::hasColumn('order_items', 'variant_id') ? 'variant_id' : null,
            Schema::hasColumn('order_items', 'variant_name') ? 'variant_name' : null,
        ]));

        if ($columns !== []) {
            Schema::table('order_items', function (Blueprint $table) use ($columns) {
                $table->dropColumn($columns);
            });
        }
    }
};
