<?php

use App\Support\AdminRole;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * نقش مدیریتی (super_admin | product_manager | order_manager | support).
     * ستون role همچنان مشخص می‌کند کاربر «مدیر» است یا «مشتری».
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('admin_role', 32)->nullable()->after('role');
        });

        // مدیران فعلی «مدیر ارشد» می‌شوند تا دسترسی کنونی‌شان تغییر نکند.
        DB::table('users')
            ->where('role', 'admin')
            ->whereNull('admin_role')
            ->update(['admin_role' => AdminRole::SUPER_ADMIN]);
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('admin_role');
        });
    }
};
