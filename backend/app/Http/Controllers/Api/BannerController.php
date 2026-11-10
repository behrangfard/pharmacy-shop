<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Banner;
use App\Models\BannerSection;
use App\Models\StoreSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\Rule;

class BannerController extends Controller
{
    /**
     * کلید کش فهرست بنرهای فروشگاه.
     * با هر تغییر در پنل مدیران (ایجاد/ویرایش/حذف/وضعیت/تنظیمات بخش) پاک
     * می‌شود.
     */
    public const STOREFRONT_CACHE_KEY = 'storefront.banners.index.v8';

    /**
     * بنرهای فروشگاه (با کش ۵ دقیقه‌ای) + تنظیمات بخش‌ها.
     *
     * نکته مهم: در کش باید «آرایه» ذخیره شود، نه Collection eloquent.
     * در درایورهای database/file مقدار بازیابی‌شده به __PHP_Incomplete_Class
     * تبدیل می‌شود و پاسخ JSON به‌جای آرایه یک شیء خالی می‌گردد؛ نتیجه این بود
     * که بنرها فقط بار اول (قبل از کش شدن) نمایش داده می‌شدند و بعد از
     * رفرش صفحه ناپدید می‌شدند.
     *
     * بازهٔ نمایش (starts_at/ends_at) در هر درخواست روی دادهٔ کش‌شده اعمال
     * می‌شود تا شروع/پایان بنر بدون انتظار برای انقضای کش دقیق باشد.
     *
     * بخش‌های بنر (`sections`) هم در همین پاسخ برمی‌گردند تا صفحهٔ اول برای
     * چیدمان بخش چندستونه درخواست جداگانه نفرستد.
     *
     * تنظیمات ظاهری بنرها (`appearance`) هم در همین پاسخ است: گردی گوشهٔ
     * پیش‌فرض بنرها (`radius` به پیکسل). هر بخش بنر گردی گوشه و انیمیشن هاور
     * خودش را در `sections` دارد؛ این مقدار فقط برای بخش‌هایی است که گردی
     * مخصوص ثبت نکرده‌اند (نوار تبلیغاتی و بنر بالای صفحهٔ محصولات). رنگ
     * پس‌زمینه‌ای پشت بنرها وجود ندارد.
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'position' => ['nullable', Rule::in(Banner::POSITIONS)],
        ]);

        $payload = Cache::remember(
            self::STOREFRONT_CACHE_KEY,
            now()->addMinutes(5),
            fn (): array => [
                'banners' => Banner::query()
                    ->orderBy('sort_order')
                    ->orderBy('id')
                    ->get()
                    ->toArray(),
                'sections' => BannerSection::storefrontArray(),
                'appearance' => [
                    'radius' => StoreSetting::bannerRadius(),
                ],
            ]
        );

        $banners = is_array($payload['banners'] ?? null) ? $payload['banners'] : [];

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

        // فقط بخش‌های فعال به فروشگاه می‌رسند؛ بخش خاموش نباید در صفحهٔ اول
        // رندر شود.
        $sections = array_values(array_filter(
            is_array($payload['sections'] ?? null) ? $payload['sections'] : [],
            fn (array $section): bool => (bool) ($section['is_active'] ?? false)
        ));

        return response()->json([
            'success' => true,
            'data' => $visible,
            'sections' => $sections,
            'appearance' => is_array($payload['appearance'] ?? null)
                ? $payload['appearance']
                : ['radius' => StoreSetting::bannerRadius()],
        ]);
    }
}

