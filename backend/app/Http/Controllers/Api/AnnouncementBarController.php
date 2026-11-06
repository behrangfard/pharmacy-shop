<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AnnouncementBarItem;
use App\Models\StoreSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;

/**
 * نوار اطلاع‌رسانی بالای هدر فروشگاه (اطلاع‌رسانی تخفیف‌ها و تبلیغات).
 *
 * تنظیمات ظاهری نوار در جدول store_settings است و از همان کش تنظیمات عمومی
 * خوانده می‌شود؛ آیتم‌ها (متن/تصویر/ویدیو) در جدول announcement_bar_items
 * هستند و مثل بنرها در کش ذخیره می‌شوند.
 *
 * نکتهٔ مهم (همان درس بنرها): در کش باید «آرایه» ذخیره شود، نه Collection
 * eloquent؛ در غیر این صورت مقدار بازیابی‌شده در درایورهای file/database به
 * __PHP_Incomplete_Class تبدیل می‌شود و پاسخ JSON خالی برمی‌گردد. بازهٔ نمایش
 * هر آیتم هم در هر درخواست روی دادهٔ کش‌شده اعمال می‌شود تا شروع/پایان
 * اطلاع‌رسانی بدون انتظار برای انقضای کش دقیق باشد.
 */
class AnnouncementBarController extends Controller
{
    /** کلید کش آیتم‌های نوار؛ با هر تغییر در پنل مدیران پاک می‌شود. */
    public const STOREFRONT_CACHE_KEY = 'storefront.announcement-bar.v1';

    /** محدودهٔ مجاز ارتفاع نوار (پیکسل). */
    public const HEIGHT_MIN = 24;

    public const HEIGHT_MAX = 120;

    /** محدودهٔ مجاز اندازهٔ متن (پیکسل). */
    public const FONT_SIZE_MIN = 9;

    public const FONT_SIZE_MAX = 24;

    /** محدودهٔ مجاز فاصلهٔ تعویض آیتم‌ها (ثانیه). */
    public const INTERVAL_MIN = 2;

    public const INTERVAL_MAX = 60;

    /** حالت‌های مجاز انیمیشن تعویض آیتم. */
    public const ANIMATIONS = ['fade', 'slide', 'none'];

    /**
     * نوار اطلاع‌رسانی برای فروشگاه.
     */
    public function index(): JsonResponse
    {
        $items = Cache::remember(
            self::STOREFRONT_CACHE_KEY,
            now()->addMinutes(5),
            fn (): array => AnnouncementBarItem::query()
                ->orderBy('sort_order')
                ->orderBy('id')
                ->get()
                ->toArray()
        );

        return response()->json([
            'success' => true,
            'data' => array_merge(
                self::resolveSettings(),
                ['items' => $this->visibleItems($items)]
            ),
        ]);
    }

    /**
     * تنظیمات ظاهری نوار با مقادیر پیش‌فرض و بازهٔ مجاز.
     *
     * این متد هم برای سایت و هم برای فرم پنل مدیران استفاده می‌شود تا هر دو
     * طرف همیشه یک شکل داده بگیرند.
     *
     * @return array<string, mixed>
     */
    public static function resolveSettings(): array
    {
        $settings = StoreSetting::publicSettings();

        return [
            'enabled' => self::toBool($settings['announcement_bar_enabled'] ?? '0'),
            'height' => self::clamp(
                (int) ($settings['announcement_bar_height'] ?? '44'),
                self::HEIGHT_MIN,
                self::HEIGHT_MAX
            ),
            'mobile_height' => self::clamp(
                (int) ($settings['announcement_bar_mobile_height'] ?? '40'),
                self::HEIGHT_MIN,
                self::HEIGHT_MAX
            ),
            'background_color' => self::toColor(
                $settings['announcement_bar_bg_color'] ?? '',
                StoreSetting::DEFAULTS['announcement_bar_bg_color']
            ),
            'text_color' => self::toColor(
                $settings['announcement_bar_text_color'] ?? '',
                StoreSetting::DEFAULTS['announcement_bar_text_color']
            ),
            'font_size' => self::clamp(
                (int) ($settings['announcement_bar_font_size'] ?? '13'),
                self::FONT_SIZE_MIN,
                self::FONT_SIZE_MAX
            ),
            'interval' => self::clamp(
                (int) ($settings['announcement_bar_interval'] ?? '6'),
                self::INTERVAL_MIN,
                self::INTERVAL_MAX
            ),
            'animation' => in_array(
                $settings['announcement_bar_animation'] ?? '',
                self::ANIMATIONS,
                true
            )
                ? $settings['announcement_bar_animation']
                : 'fade',
        ];
    }

    /**
     * فقط آیتم‌های قابل نمایش، با فیلدهای مورد نیاز سایت (پاسخ سبک‌تر).
     *
     * @param  array<int, array<string, mixed>>  $items
     * @return array<int, array<string, mixed>>
     */
    private function visibleItems(array $items): array
    {
        $now = Carbon::now();
        $visible = [];

        foreach ($items as $item) {
            if (! ($item['is_active'] ?? false)) {
                continue;
            }

            $startsAt = $item['starts_at'] ?? null;

            if ($startsAt !== null && Carbon::parse($startsAt)->isAfter($now)) {
                continue;
            }

            $endsAt = $item['ends_at'] ?? null;

            if ($endsAt !== null && Carbon::parse($endsAt)->isBefore($now)) {
                continue;
            }

            $type = in_array($item['type'] ?? '', AnnouncementBarItem::TYPES, true)
                ? $item['type']
                : AnnouncementBarItem::TYPE_TEXT;

            $visible[] = [
                'id' => (int) $item['id'],
                'type' => $type,
                'text' => $item['text'] ?? null,
                'image' => $item['image'] ?? null,
                'link' => $item['link'] ?? null,
                'open_in_new_tab' => (bool) ($item['open_in_new_tab'] ?? false),
            ];
        }

        return $visible;
    }

    private static function clamp(int $value, int $min, int $max): int
    {
        return min(max($value, $min), $max);
    }

    private static function toBool(string|bool|null $value): bool
    {
        return filter_var((string) $value, FILTER_VALIDATE_BOOLEAN);
    }

    private static function toColor(?string $value, string $fallback): string
    {
        $color = trim((string) $value);

        return preg_match('/^#[0-9a-fA-F]{6}$/', $color) === 1 ? $color : $fallback;
    }
}
