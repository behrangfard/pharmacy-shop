<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Banner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\Rule;

class BannerController extends Controller
{
    /**
     * کلید کش فهرست بنرهای فروشگاه.
     * با هر تغییر در پنل مدیران (ایجاد/ویرایش/حذف/وضعیت) پاک می‌شود.
     */
    public const STOREFRONT_CACHE_KEY = 'storefront.banners.index.v3';

    /**
     * بنرهای فروشگاه (با کش ۵ دقیقه‌ای).
     *
     * نکته مهم: در کش باید «آرایه» ذخیره شود، نه Collection eloquent.
     * در درایورهای database/file مقدار بازیابی‌شده به __PHP_Incomplete_Class
     * تبدیل می‌شود و پاسخ JSON به‌جای آرایه یک شیء خالی می‌گردد؛ نتیجه این بود
     * که بنرها فقط بار اول (قبل از کش شدن) نمایش داده می‌شدند و بعد از
     * رفرش صفحه ناپدید می‌شدند.
     *
     * بازهٔ نمایش (starts_at/ends_at) در هر درخواست روی دادهٔ کش‌شده اعمال
     * می‌شود تا شروع/پایان بنر بدون انتظار برای انقضای کش دقیق باشد.
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'position' => ['nullable', Rule::in(Banner::POSITIONS)],
        ]);

        $banners = Cache::remember(
            self::STOREFRONT_CACHE_KEY,
            now()->addMinutes(5),
            fn (): array => Banner::query()
                ->orderBy('sort_order')
                ->orderBy('id')
                ->get()
                ->toArray()
        );

        $position = $validated['position'] ?? null;
        $now = Carbon::now();

        $visible = array_values(array_filter(
            $banners,
            function (array $banner) use ($position, $now): bool {
                if (! ($banner['is_active'] ?? false)) {
                    return false;
                }

                if ($position !== null && ($banner['position'] ?? null) !== $position) {
                    return false;
                }

                $startsAt = $banner['starts_at'] ?? null;

                if ($startsAt !== null && Carbon::parse($startsAt)->isAfter($now)) {
                    return false;
                }

                $endsAt = $banner['ends_at'] ?? null;

                if ($endsAt !== null && Carbon::parse($endsAt)->isBefore($now)) {
                    return false;
                }

                return true;
            }
        ));

        return response()->json([
            'success' => true,
            'data' => $visible,
        ]);
    }
}
