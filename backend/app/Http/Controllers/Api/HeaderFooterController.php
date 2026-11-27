<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StoreSetting;
use App\Services\Media\MediaCleaner;
use App\Services\Media\WebpConverter;
use App\Support\Media\ImageDimensions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

/**
 * مدیریت هدر و فوتر سایت از پنل مدیران.
 *
 * مقادیر در جدول store_settings با پیشوند header_ و footer_ ذخیره می‌شوند و
 * از مسیر عمومی /header-footer در اختیار فرانت‌اند قرار می‌گیرند. تنظیمات
 * نوار ناوبری پایین موبایل (میان‌برها، ردیف‌های «دسترسی سریع» و لوگوی دکمهٔ
 * شناور) هم با پیشوند mobile_nav_ همین‌جا مدیریت می‌شود تا همهٔ «قاب فروشگاه»
 * یک صفحه، یک کش و یک نقطهٔ ذخیره داشته باشد.
 */
class HeaderFooterController extends Controller
{
    /** لینک‌های سریع فوتر: بیشینهٔ تعداد مجاز. */
    private const QUICK_LINKS_MAX = 12;

    /** میان‌برهای نوار پایین موبایل: کمینه و بیشینهٔ تعداد مجاز. */
    private const NAV_ITEMS_MIN = 2;
    private const NAV_ITEMS_MAX = 4;

    /** ردیف‌های «دسترسی سریع» پنل دکمهٔ شناور: بیشینهٔ تعداد مجاز. */
    private const NAV_QUICK_LINKS_MAX = 6;

    /** پوشهٔ ذخیرهٔ لوگوی دکمهٔ شناور روی دیسک public. */
    private const NAV_LOGO_DIRECTORY = 'mobile-nav';

    /**
     * آیکن‌های مجاز نوار پایین و ردیف‌های «دسترسی سریع».
     * هماهنگ با `MOBILE_NAV_ICONS` در `frontend/src/services/headerFooter.ts`
     * و نقشهٔ آیکن‌ها در `frontend/src/components/MobileBottomNav.tsx`؛ آیکن
     * تازه باید در هر سه جا اضافه شود تا مقدار ناشناخته روی سایت رندر نشود.
     */
    private const NAV_ICONS = [
        'home',
        'store',
        'shopping-cart',
        'shopping-bag',
        'heart',
        'user-round',
        'search',
        'sparkles',
        'truck',
        'tag',
        'ruler',
        'file-text',
        'lock',
        'headset',
        'phone',
        'package-check',
        'ticket-percent',
        'gift',
        'monitor-smartphone',
        'shield-check',
    ];

    /** نشان عددی هر میان‌بر: بدون نشان، تعداد سبد خرید یا علاقه‌مندی. */
    private const NAV_BADGES = ['none', 'cart', 'wishlist'];

    /** رفتار دکمهٔ شناور: بازکردن پنل «دسترسی سریع» یا رفتن به یک نشانی. */
    private const NAV_FAB_MODES = ['panel', 'link'];

    /** ردیف‌های ستون «خدمات مشتریان» فوتر: بیشینهٔ تعداد مجاز. */
    private const SERVICES_MAX = 8;

    /**
     * آیکن‌های مجاز ردیف‌های «خدمات مشتریان».
     * هماهنگ با `FOOTER_SERVICE_ICONS` در
     * `frontend/src/services/headerFooter.ts`؛ هر مقدار تازه باید در هر دو جا
     * اضافه شود تا آیکن ناشناخته روی سایت رندر نشود.
     */
    private const SERVICE_ICONS = [
        'shopping-bag',
        'truck',
        'headset',
        'package-check',
        'phone',
        'mail',
        'map-pin',
        'shield-check',
        'sparkles',
        'heart',
        'credit-card',
        'gift',
        'help-circle',
        'file-text',
        'wallet',
        'rotate-ccw',
    ];

    /** رفتار هر ردیف: متن ساده، بازکردن لینک یا بازکردن چت پشتیبانی. */
    private const SERVICE_ACTIONS = ['none', 'url', 'support'];

    /**
     * نمایش تنظیمات فعلی هدر و فوتر.
     */
    public function show(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->payload(StoreSetting::publicSettings()),
        ]);
    }

    /**
     * ذخیرهٔ تنظیمات هدر و فوتر.
     */
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'header_logo_text' => ['required', 'string', 'max:60'],
            'header_tagline' => ['nullable', 'string', 'max:120'],
            'header_show_search' => ['required', 'boolean'],
            'header_cta_enabled' => ['required', 'boolean'],
            'header_cta_label' => ['nullable', 'string', 'max:40'],
            'header_cta_url' => ['nullable', 'string', 'max:255'],
            'header_cta_new_tab' => ['required', 'boolean'],
            'footer_about_title' => ['nullable', 'string', 'max:80'],
            'footer_about_text' => ['nullable', 'string', 'max:600'],
            'footer_highlight_title' => ['nullable', 'string', 'max:80'],
            'footer_highlight_text' => ['nullable', 'string', 'max:300'],
            'footer_copyright' => ['nullable', 'string', 'max:200'],
            'footer_quick_links' => ['nullable', 'array', 'max:'.self::QUICK_LINKS_MAX],
            'footer_quick_links.*.label' => ['required', 'string', 'max:40'],
            'footer_quick_links.*.url' => ['required', 'string', 'max:255'],
            'footer_services_title' => ['nullable', 'string', 'max:80'],
            'footer_show_contact' => ['sometimes', 'boolean'],
            'footer_services' => ['nullable', 'array', 'max:'.self::SERVICES_MAX],
            'footer_services.*.title' => ['required', 'string', 'max:60'],
            'footer_services.*.description' => ['nullable', 'string', 'max:140'],
            'footer_services.*.icon' => [
                'nullable',
                'string',
                'in:'.implode(',', self::SERVICE_ICONS),
            ],
            'footer_services.*.action' => [
                'nullable',
                'string',
                'in:'.implode(',', self::SERVICE_ACTIONS),
            ],
            'footer_services.*.url' => ['nullable', 'string', 'max:255'],

            /*
             * نوار پایین موبایل: میان‌برها (۲ تا ۴ ردیف)، ردیف‌های «دسترسی
             * سریع» (تا ۶ ردیف) و دکمهٔ شناور (لوگو، حالت و نشانی).
             */
            'mobile_nav_enabled' => ['sometimes', 'boolean'],
            'mobile_nav_items' => [
                'nullable',
                'array',
                'min:'.self::NAV_ITEMS_MIN,
                'max:'.self::NAV_ITEMS_MAX,
            ],
            'mobile_nav_items.*.label' => ['required', 'string', 'max:24'],
            'mobile_nav_items.*.url' => ['required', 'string', 'max:255'],
            'mobile_nav_items.*.icon' => [
                'nullable',
                'string',
                'in:'.implode(',', self::NAV_ICONS),
            ],
            'mobile_nav_items.*.badge' => [
                'nullable',
                'string',
                'in:'.implode(',', self::NAV_BADGES),
            ],
            'mobile_nav_quick_links' => [
                'nullable',
                'array',
                'max:'.self::NAV_QUICK_LINKS_MAX,
            ],
            'mobile_nav_quick_links.*.label' => ['required', 'string', 'max:40'],
            'mobile_nav_quick_links.*.hint' => ['nullable', 'string', 'max:80'],
            'mobile_nav_quick_links.*.url' => ['required', 'string', 'max:255'],
            'mobile_nav_quick_links.*.icon' => [
                'nullable',
                'string',
                'in:'.implode(',', self::NAV_ICONS),
            ],
            'mobile_nav_fab_mode' => [
                'sometimes',
                'string',
                'in:'.implode(',', self::NAV_FAB_MODES),
            ],
            'mobile_nav_fab_url' => ['nullable', 'string', 'max:255'],
            'mobile_nav_fab_logo' => ['nullable', 'string', 'max:2048'],
        ]);

        // ردیف «بازکردن لینک» بدون نشانی بی‌معناست؛ پیام خطا با شمارهٔ ردیف
        // برگردانده می‌شود تا مدیر بداند کدام ردیف را باید کامل کند.
        foreach ($validated['footer_services'] ?? [] as $index => $item) {
            $action = $item['action'] ?? 'none';
            $url = trim((string) ($item['url'] ?? ''));

            if ($action === 'url' && $url === '') {
                throw ValidationException::withMessages([
                    'footer_services.'.$index.'.url' => 'ردیف «'
                        .trim((string) ($item['title'] ?? ''))
                        .'»: برای اقدام «بازکردن لینک»، نشانی لازم است.',
                ]);
            }
        }

        // دکمهٔ شناور در حالت «بازکردن یک نشانی» بدون نشانی بی‌استفاده است.
        if (
            ($validated['mobile_nav_fab_mode'] ?? 'panel') === 'link'
            && trim((string) ($validated['mobile_nav_fab_url'] ?? '')) === ''
        ) {
            throw ValidationException::withMessages([
                'mobile_nav_fab_url' => 'برای حالت «بازکردن یک نشانی»، نشانی دکمهٔ شناور لازم است.',
            ]);
        }

        /*
         * لوگوی قبلی پیش از ذخیره نگه داشته می‌شود تا اگر عوض شد، فایل
         * بی‌استفاده روی دیسک نماند (پوشهٔ mobile-nav در نقشهٔ `media:prune`
         * نیست، چون مسیرش در مقدار `store_settings` ذخیره می‌شود).
         */
        $previousLogo = (string) StoreSetting::getValue(
            'mobile_nav_fab_logo',
            ''
        );

        foreach ($validated as $key => $value) {
            if ($key === 'footer_quick_links') {
                StoreSetting::setValue(
                    $key,
                    $this->encodeLinks($value ?? [])
                );

                continue;
            }

            if ($key === 'footer_services') {
                StoreSetting::setValue(
                    $key,
                    $this->encodeServices($value ?? [])
                );

                continue;
            }

            if ($key === 'mobile_nav_items') {
                StoreSetting::setValue(
                    $key,
                    $this->encodeNavItems($value ?? [])
                );

                continue;
            }

            if ($key === 'mobile_nav_quick_links') {
                StoreSetting::setValue(
                    $key,
                    $this->encodeNavQuickLinks($value ?? [])
                );

                continue;
            }

            StoreSetting::setValue($key, $this->normalize($value));
        }

        StoreSetting::forgetCache();

        $this->deleteReplacedNavLogo(
            $previousLogo,
            (string) StoreSetting::getValue('mobile_nav_fab_logo', '')
        );

        return response()->json([
            'success' => true,
            'message' => 'تنظیمات هدر و فوتر با موفقیت ذخیره شد.',
            'data' => $this->payload(StoreSetting::allSettings()),
        ]);
    }

    /**
     * بار دادهٔ پاسخ؛ همان کلیدهای جدول با تایپ‌های درست.
     *
     * @param array<string, string> $settings
     * @return array<string, mixed>
     */
    private function payload(array $settings): array
    {
        return [
            'store_name' => $settings['store_name'],
            'header_logo_text' => $settings['header_logo_text'],
            'header_tagline' => $settings['header_tagline'],
            'header_show_search' => $this->toBool($settings['header_show_search']),
            'header_cta_enabled' => $this->toBool($settings['header_cta_enabled']),
            'header_cta_label' => $settings['header_cta_label'],
            'header_cta_url' => $settings['header_cta_url'],
            'header_cta_new_tab' => $this->toBool($settings['header_cta_new_tab']),
            'footer_about_title' => $settings['footer_about_title'],
            'footer_about_text' => $settings['footer_about_text'],
            'footer_highlight_title' => $settings['footer_highlight_title'],
            'footer_highlight_text' => $settings['footer_highlight_text'],
            'footer_copyright' => $settings['footer_copyright'],
            'footer_quick_links' => $this->decodeLinks(
                (string) $settings['footer_quick_links']
            ),
            'footer_services_title' => $settings['footer_services_title'] ?? '',
            'footer_services' => $this->decodeServices(
                (string) ($settings['footer_services'] ?? '')
            ),
            'footer_show_contact' => $this->toBool(
                $settings['footer_show_contact'] ?? '1'
            ),
            'mobile_nav_enabled' => $this->toBool(
                $settings['mobile_nav_enabled'] ?? '1'
            ),
            'mobile_nav_items' => $this->decodeNavItems(
                (string) ($settings['mobile_nav_items'] ?? '')
            ),
            'mobile_nav_quick_links' => $this->decodeNavQuickLinks(
                (string) ($settings['mobile_nav_quick_links'] ?? '')
            ),
            'mobile_nav_fab_mode' => in_array(
                $settings['mobile_nav_fab_mode'] ?? 'panel',
                self::NAV_FAB_MODES,
                true
            )
                ? (string) ($settings['mobile_nav_fab_mode'] ?? 'panel')
                : 'panel',
            'mobile_nav_fab_url' => (string) ($settings['mobile_nav_fab_url'] ?? ''),
            'mobile_nav_fab_logo' => (string) ($settings['mobile_nav_fab_logo'] ?? ''),
        ];
    }

    /**
     * رمزگشایی لینک‌های سریع فوتر از JSON؛ ورودی خراب یعنی فهرست خالی.
     *
     * @return list<array{label: string, url: string}>
     */
    private function decodeLinks(string $raw): array
    {
        try {
            $decoded = json_decode($raw, true, 4, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return [];
        }

        if (! is_array($decoded)) {
            return [];
        }

        $links = [];

        foreach ($decoded as $item) {
            if (! is_array($item)) {
                continue;
            }

            $label = trim((string) ($item['label'] ?? ''));
            $url = trim((string) ($item['url'] ?? ''));

            if ($label === '' || $url === '') {
                continue;
            }

            $links[] = ['label' => $label, 'url' => $url];

            if (count($links) >= self::QUICK_LINKS_MAX) {
                break;
            }
        }

        return $links;
    }

    /**
     * ذخیرهٔ فهرست لینک‌ها به‌صورت JSON خوانا (بدون اسلش و یونیکد گریزان).
     *
     * @param array<int, mixed> $links
     */
    private function encodeLinks(array $links): string
    {
        $clean = [];

        foreach ($links as $link) {
            if (! is_array($link)) {
                continue;
            }

            $label = trim((string) ($link['label'] ?? ''));
            $url = trim((string) ($link['url'] ?? ''));

            if ($label === '' || $url === '') {
                continue;
            }

            $clean[] = ['label' => $label, 'url' => $url];

            if (count($clean) >= self::QUICK_LINKS_MAX) {
                break;
            }
        }

        return json_encode(
            $clean,
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
        ) ?: '[]';
    }

    /**
     * رمزگشایی ردیف‌های ستون «خدمات مشتریان» از JSON.
     * هر ردیف بدون عنوان یا با آیکن/اقدام ناشناخته اصلاح یا حذف می‌شود تا
     * خروجی خراب نتواند ظاهر فوتر را به‌هم بریزد.
     *
     * @return list<array{title: string, description: string, icon: string, action: string, url: string}>
     */
    private function decodeServices(string $raw): array
    {
        try {
            $decoded = json_decode($raw, true, 4, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return [];
        }

        if (! is_array($decoded)) {
            return [];
        }

        $items = [];

        foreach ($decoded as $item) {
            if (! is_array($item)) {
                continue;
            }

            $title = trim((string) ($item['title'] ?? ''));

            if ($title === '') {
                continue;
            }

            $icon = (string) ($item['icon'] ?? '');
            $action = (string) ($item['action'] ?? '');

            $items[] = [
                'title' => $title,
                'description' => trim((string) ($item['description'] ?? '')),
                'icon' => in_array($icon, self::SERVICE_ICONS, true)
                    ? $icon
                    : 'sparkles',
                'action' => in_array($action, self::SERVICE_ACTIONS, true)
                    ? $action
                    : 'none',
                'url' => trim((string) ($item['url'] ?? '')),
            ];

            if (count($items) >= self::SERVICES_MAX) {
                break;
            }
        }

        return $items;
    }

    /**
     * ذخیرهٔ ردیف‌های «خدمات مشتریان» به‌صورت JSON خوانا.
     *
     * @param array<int, mixed> $items
     */
    private function encodeServices(array $items): string
    {
        $clean = [];

        foreach ($items as $item) {
            if (! is_array($item)) {
                continue;
            }

            $title = trim((string) ($item['title'] ?? ''));

            if ($title === '') {
                continue;
            }

            $icon = (string) ($item['icon'] ?? '');
            $action = (string) ($item['action'] ?? 'none');

            $clean[] = [
                'title' => $title,
                'description' => trim((string) ($item['description'] ?? '')),
                'icon' => in_array($icon, self::SERVICE_ICONS, true)
                    ? $icon
                    : 'sparkles',
                'action' => in_array($action, self::SERVICE_ACTIONS, true)
                    ? $action
                    : 'none',
                'url' => trim((string) ($item['url'] ?? '')),
            ];

            if (count($clean) >= self::SERVICES_MAX) {
                break;
            }
        }

        return json_encode(
            $clean,
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
        ) ?: '[]';
    }

    private function normalize(mixed $value): string
    {
        if (is_bool($value)) {
            return $value ? '1' : '0';
        }

        return $value === null ? '' : (string) $value;
    }

    private function toBool(string|bool|null $value): bool
    {
        return filter_var((string) $value, FILTER_VALIDATE_BOOLEAN);
    }

    /**
     * بارگذاری لوگوی دکمهٔ شناور نوار پایین موبایل.
     *
     * مثل بقیهٔ آپلودهای پنل، این متد فقط فایل را ذخیره و مسیرش را برمی‌گرداند؛
     * اتصال به تنظیمات با «ذخیره»ی فرم «هدر و فوتر» انجام می‌شود تا فایل‌های
     * بارگذاری‌شدهٔ استفاده‌نشده در تنظیمات نمانند.
     */
    public function uploadMobileLogo(Request $request): JsonResponse
    {
        $request->validate([
            'image' => [
                'required',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:2048',
            ],
        ]);

        $path = $request->file('image')->store(
            self::NAV_LOGO_DIRECTORY,
            'public'
        );

        if (! $path) {
            return response()->json([
                'success' => false,
                'message' => 'بارگذاری لوگوی نوار پایین انجام نشد.',
            ], 500);
        }

        // تبدیل به WebP (اگر افزونهٔ تصویر روی سرور فعال باشد؛ وگرنه بی‌اثر).
        $path = WebpConverter::convert($path);

        $dimensions = ImageDimensions::forPath($path);

        return response()->json([
            'success' => true,
            'message' => 'لوگوی نوار پایین بارگذاری شد.',
            'data' => [
                'path' => $path,
                'url' => Storage::disk('public')->url($path),
                'width' => $dimensions['width'] ?? null,
                'height' => $dimensions['height'] ?? null,
            ],
        ], 201);
    }

    /**
     * حذف فایل لوگوی قبلی نوار پایین وقتی مدیر آن را عوض می‌کند.
     *
     * فقط فایل‌های داخل پوشهٔ `mobile-nav` حذف می‌شوند؛ مسیرهای فرانت‌اند
     * (`/images/...`) و نشانی‌های بیرونی دست‌نخورده می‌مانند (مالک آن‌ها این
     * کنترلر نیست).
     */
    private function deleteReplacedNavLogo(string $previous, string $current): void
    {
        $previous = MediaCleaner::normalize($previous);
        $current = MediaCleaner::normalize($current);

        if ($previous === '' || $previous === $current) {
            return;
        }

        if (! str_starts_with($previous, self::NAV_LOGO_DIRECTORY.'/')) {
            return;
        }

        MediaCleaner::deleteFile($previous);
    }

    /**
     * رمزگشایی میان‌برهای نوار پایین موبایل از JSON.
     *
     * ردیف بدون عنوان یا نشانی حذف، و آیکن/نشان ناشناخته به مقدار امن برگردانده
     * می‌شود تا مقدار خراب نتواند ظاهر نوار را به‌هم بریزد.
     *
     * @return list<array{label: string, url: string, icon: string, badge: string}>
     */
    private function decodeNavItems(string $raw): array
    {
        $items = [];

        foreach ($this->decodeJsonArray($raw) as $item) {
            if (! is_array($item)) {
                continue;
            }

            $label = trim((string) ($item['label'] ?? ''));
            $url = trim((string) ($item['url'] ?? ''));

            if ($label === '' || $url === '') {
                continue;
            }

            $items[] = [
                'label' => $label,
                'url' => $url,
                'icon' => $this->safeNavIcon($item['icon'] ?? null),
                'badge' => $this->safeNavBadge($item['badge'] ?? null),
            ];

            if (count($items) >= self::NAV_ITEMS_MAX) {
                break;
            }
        }

        return $items;
    }

    /**
     * ذخیرهٔ میان‌برهای نوار پایین به‌صورت JSON خوانا.
     *
     * @param array<int, mixed> $items
     */
    private function encodeNavItems(array $items): string
    {
        $clean = [];

        foreach ($items as $item) {
            if (! is_array($item)) {
                continue;
            }

            $label = trim((string) ($item['label'] ?? ''));
            $url = trim((string) ($item['url'] ?? ''));

            if ($label === '' || $url === '') {
                continue;
            }

            $clean[] = [
                'label' => $label,
                'url' => $url,
                'icon' => $this->safeNavIcon($item['icon'] ?? null),
                'badge' => $this->safeNavBadge($item['badge'] ?? null),
            ];

            if (count($clean) >= self::NAV_ITEMS_MAX) {
                break;
            }
        }

        return $this->encodeJsonArray($clean);
    }

    /** آیکن مجاز نوار پایین؛ مقدار ناشناخته یعنی آیکن پیش‌فرض. */
    private function safeNavIcon(mixed $value): string
    {
        $icon = (string) $value;

        return in_array($icon, self::NAV_ICONS, true) ? $icon : 'sparkles';
    }

    /** نشان مجاز میان‌بر؛ مقدار ناشناخته یعنی «بدون نشان». */
    private function safeNavBadge(mixed $value): string
    {
        $badge = (string) $value;

        return in_array($badge, self::NAV_BADGES, true) ? $badge : 'none';
    }

    /**
     * رمزگشایی ردیف‌های «دسترسی سریع» پنل دکمهٔ شناور از JSON.
     *
     * @return list<array{label: string, hint: string, url: string, icon: string}>
     */
    private function decodeNavQuickLinks(string $raw): array
    {
        $links = [];

        foreach ($this->decodeJsonArray($raw) as $item) {
            if (! is_array($item)) {
                continue;
            }

            $label = trim((string) ($item['label'] ?? ''));
            $url = trim((string) ($item['url'] ?? ''));

            if ($label === '' || $url === '') {
                continue;
            }

            $links[] = [
                'label' => $label,
                'hint' => trim((string) ($item['hint'] ?? '')),
                'url' => $url,
                'icon' => $this->safeNavIcon($item['icon'] ?? null),
            ];

            if (count($links) >= self::NAV_QUICK_LINKS_MAX) {
                break;
            }
        }

        return $links;
    }

    /**
     * ذخیرهٔ ردیف‌های «دسترسی سریع» به‌صورت JSON خوانا.
     *
     * @param array<int, mixed> $links
     */
    private function encodeNavQuickLinks(array $links): string
    {
        $clean = [];

        foreach ($links as $link) {
            if (! is_array($link)) {
                continue;
            }

            $label = trim((string) ($link['label'] ?? ''));
            $url = trim((string) ($link['url'] ?? ''));

            if ($label === '' || $url === '') {
                continue;
            }

            $clean[] = [
                'label' => $label,
                'hint' => trim((string) ($link['hint'] ?? '')),
                'url' => $url,
                'icon' => $this->safeNavIcon($link['icon'] ?? null),
            ];

            if (count($clean) >= self::NAV_QUICK_LINKS_MAX) {
                break;
            }
        }

        return $this->encodeJsonArray($clean);
    }

    /**
     * خواندن مقدار JSON ذخیره‌شده؛ ورودی خراب یعنی فهرست خالی.
     *
     * @return array<int, mixed>
     */
    private function decodeJsonArray(string $raw): array
    {
        try {
            $decoded = json_decode($raw, true, 4, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return [];
        }

        return is_array($decoded) ? $decoded : [];
    }

    /**
     * ذخیرهٔ فهرست به‌صورت JSON خوانا (یونیکد و اسلش‌ها گریزان نمی‌شوند).
     *
     * @param array<int, array<string, string>> $rows
     */
    private function encodeJsonArray(array $rows): string
    {
        return json_encode(
            $rows,
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
        ) ?: '[]';
    }
}
