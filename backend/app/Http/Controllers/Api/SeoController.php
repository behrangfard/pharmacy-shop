<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Redirect;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

/**
 * مسیرهای عمومی مرتبط با سئو.
 *
 * - `GET /seo/redirects`: نقشهٔ ریدایرکت‌های فعال. هم اسکریپت build
 *   (`generate-sitemap.mjs` برای نوشتن `_redirects`/`redirects.conf`) و هم
 *   RedirectGate سمت مرورگر از همین پاسخ استفاده می‌کنند، تا نسخهٔ دوم
 *   ریدایرکت‌ها ساخته نشود.
 * - `POST /seo/redirects/hit`: شمارندهٔ استفاده؛ برای اینکه معلوم شود کدام
 *   ریدایرکت واقعاً استفاده می‌شود و کدام را می‌توان حذف کرد.
 *
 * پاسخ کش می‌شود؛ هر تغییر ادمین کش را در AdminSeoController پاک می‌کند.
 */
class SeoController extends Controller
{
    public function redirects(): JsonResponse
    {
        $rules = Cache::remember(
            AdminSeoController::REDIRECTS_CACHE_KEY,
            now()->addMinutes(10),
            fn (): array => Redirect::query()
                ->where('is_active', true)
                ->orderBy('from_path')
                ->get(['from_path', 'to_path'])
                ->map(fn (Redirect $redirect): array => [
                    'from' => $redirect->from_path,
                    'to' => $redirect->to_path,
                ])
                ->all()
        );

        return response()->json([
            'success' => true,
            'data' => $rules,
        ]);
    }

    public function hit(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'path' => ['required', 'string', 'max:2048'],
        ]);

        $path = Redirect::normalizePath($validated['path']);

        $updated = Redirect::query()
            ->where('from_path', $path)
            ->where('is_active', true)
            ->increment('hits');

        if ($updated === 0) {
            return response()->json([
                'success' => false,
                'message' => 'برای این مسیر ریدایرکت فعالی ثبت نشده است.',
            ], 404);
        }

        return response()->json([
            'success' => true,
        ]);
    }
}
