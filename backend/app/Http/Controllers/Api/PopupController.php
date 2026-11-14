<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Popup;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

/**
 * پاپ‌آپ‌های فعال فروشگاه (نقطهٔ عمومی).
 *
 * پاسخ سبک است و فقط پاپ‌آپ‌های فعالِ داخل بازهٔ زمانی را برمی‌گرداند؛ قاعدهٔ
 * «هر بازدیدکننده چند بار ببیند» و هدف‌گیری صفحه/دستگاه سمت مرورگر اعمال
 * می‌شود تا با یک درخواست، تصمیم‌گیری برای همهٔ ناوبری‌ها ممکن باشد.
 *
 * نکتهٔ کش (همان درس بنرها/استوری‌ها): در کش «آرایه» ذخیره می‌شود، نه Collection
 * eloquent؛ در غیر این صورت در درایورهای file/database مقدار بازیابی‌شده
 * __PHP_Incomplete_Class می‌شود و پاسخ خالی برمی‌گردد.
 */
class PopupController extends Controller
{
    /** کلید کش فهرست پاپ‌آپ‌ها؛ با هر تغییر در پنل مدیران پاک می‌شود. */
    public const STOREFRONT_CACHE_KEY = 'storefront.popups.v1';

    public function index(): JsonResponse
    {
        $popups = Cache::remember(
            self::STOREFRONT_CACHE_KEY,
            now()->addMinutes(5),
            fn (): array => Popup::query()
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->orderBy('id')
                ->get()
                ->toArray()
        );

        return response()->json([
            'success' => true,
            'data' => $this->livePopups($popups),
        ]);
    }

    /**
     * فقط پاپ‌آپ‌های داخل بازهٔ زمانی (شروع‌شده و تمام‌نشده) با فیلدهای
     * نمایشی؛ به‌روزرسانی داینامیک زمان‌ها در هر درخواست انجام می‌شود.
     *
     * @param  array<int, array<string, mixed>>  $popups
     * @return array<int, array<string, mixed>>
     */
    private function livePopups(array $popups): array
    {
        $now = now();
        $live = [];

        foreach ($popups as $popup) {
            $startsAt = $popup['starts_at'] ?? null;
            $endsAt = $popup['ends_at'] ?? null;

            if ($startsAt !== null && $now->lt($startsAt)) {
                continue;
            }

            if ($endsAt !== null && $now->gt($endsAt)) {
                continue;
            }

            $live[] = [
                'id' => (int) ($popup['id'] ?? 0),
                'title' => trim((string) ($popup['title'] ?? '')),
                'badge' => trim((string) ($popup['badge'] ?? '')),
                'description' => trim((string) ($popup['description'] ?? '')),
                'image' => trim((string) ($popup['image'] ?? '')),
                'image_alt' => trim((string) ($popup['image_alt'] ?? '')),
                'theme' => (string) ($popup['theme'] ?? 'light'),
                'layout' => (string) ($popup['layout'] ?? 'center'),
                'image_position' => (string) ($popup['image_position'] ?? 'top'),
                'cta_text' => trim((string) ($popup['cta_text'] ?? '')),
                'cta_link' => trim((string) ($popup['cta_link'] ?? '')),
                'secondary_text' => trim((string) ($popup['secondary_text'] ?? '')),
                'secondary_link' => trim((string) ($popup['secondary_link'] ?? '')),
                'coupon_code' => trim((string) ($popup['coupon_code'] ?? '')),
                'display_pages' => is_array($popup['display_pages'] ?? null)
                    ? array_values($popup['display_pages'])
                    : [],
                'devices' => (string) ($popup['devices'] ?? 'all'),
                'delay_seconds' => (int) ($popup['delay_seconds'] ?? 0),
                'auto_close_seconds' => (int) ($popup['auto_close_seconds'] ?? 0),
                'frequency' => (string) ($popup['frequency'] ?? 'session'),
                'ends_at' => $endsAt,
                'countdown_to' => $popup['countdown_to'] ?? null,
                'close_on_backdrop' => (bool) ($popup['close_on_backdrop'] ?? true),
                'show_close' => (bool) ($popup['show_close'] ?? true),
            ];
        }

        return $live;
    }
}
