<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * محدود کردن مسیرهای پنل مدیریت به مجوزهای نقش مدیر.
 *
 * نمونه استفاده در routes/api.php:
 *   Route::middleware('admin.permission:products.manage')
 */
class EnsureAdminPermission
{
    public function handle(
        Request $request,
        Closure $next,
        string ...$permissions
    ): Response {
        $user = $request->user();

        if (! $user || ! $user->isAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'شما دسترسی لازم برای این بخش را ندارید.',
            ], 403);
        }

        foreach ($permissions as $permission) {
            if (! $user->hasAdminPermission($permission)) {
                return response()->json([
                    'success' => false,
                    'message' => 'نقش شما اجازه دسترسی به این بخش را ندارد.',
                    'required_permission' => $permission,
                    'admin_role' => $user->adminRole(),
                ], 403);
            }
        }

        return $next($request);
    }
}
