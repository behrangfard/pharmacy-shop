<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StoreSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * مدیریت هدر و فوتر سایت از پنل مدیران.
 *
 * مقادیر در جدول store_settings با پیشوند header_ و footer_ ذخیره می‌شوند و
 * از مسیر عمومی /header-footer در اختیار فرانت‌اند قرار می‌گیرند.
 */
class HeaderFooterController extends Controller
{
    /** لینک‌های سریع فوتر: بیشینهٔ تعداد مجاز. */
    private const QUICK_LINKS_MAX = 12;

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

            StoreSetting::setValue($key, $this->normalize($value));
        }

        StoreSetting::forgetCache();

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
}
