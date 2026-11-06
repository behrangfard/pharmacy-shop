<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TrustBadge;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

/**
 * نشان‌های اعتماد و مجوزهای فروشگاه برای فوتر سایت.
 *
 * پاسخ سبک است (فقط فیلدهای نمایشی) و مثل بنرها در کش نگه داشته می‌شود؛ با هر
 * تغییر در پنل مدیران کلید کش پاک می‌شود تا نشان تازه بلافاصله دیده شود.
 *
 * نکتهٔ مهم (همان درس بنرها): در کش باید «آرایه» ذخیره شود، نه Collection
 * eloquent؛ در غیر این صورت مقدار بازیابی‌شده در درایورهای file/database به
 * __PHP_Incomplete_Class تبدیل می‌شود و پاسخ JSON خالی برمی‌گردد.
 */
class TrustBadgeController extends Controller
{
    /** کلید کش فهرست نشان‌ها؛ با هر تغییر در پنل مدیران پاک می‌شود. */
    public const STOREFRONT_CACHE_KEY = 'storefront.trust-badges.v1';

    public function index(): JsonResponse
    {
        $badges = Cache::remember(
            self::STOREFRONT_CACHE_KEY,
            now()->addMinutes(10),
            fn (): array => TrustBadge::query()
                ->orderBy('sort_order')
                ->orderBy('id')
                ->get()
                ->toArray()
        );

        return response()->json([
            'success' => true,
            'data' => $this->visibleBadges($badges),
        ]);
    }

    /**
     * فقط نشان‌های فعال، با فیلدهایی که فوتر لازم دارد.
     *
     * @param  array<int, array<string, mixed>>  $badges
     * @return array<int, array<string, mixed>>
     */
    private function visibleBadges(array $badges): array
    {
        $visible = [];

        foreach ($badges as $badge) {
            $image = trim((string) ($badge['image'] ?? ''));

            // نشان بدون تصویر در فوتر رندر نمی‌شود؛ رکورد نیمه‌کاره نادیده
            // گرفته می‌شود تا جای خالی یا آیکن شکسته روی سایت نیفتد.
            if (! ($badge['is_active'] ?? false) || $image === '') {
                continue;
            }

            $visible[] = [
                'id' => (int) $badge['id'],
                'title' => trim((string) ($badge['title'] ?? '')),
                'image' => $image,
                'link' => filled($badge['link'] ?? null) ? trim((string) $badge['link']) : null,
                'open_in_new_tab' => (bool) ($badge['open_in_new_tab'] ?? true),
            ];
        }

        return $visible;
    }
}
