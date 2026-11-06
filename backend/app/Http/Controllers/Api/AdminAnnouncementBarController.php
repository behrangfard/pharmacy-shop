<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AnnouncementBarItem;
use App\Models\StoreSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * مدیریت «نوار اطلاع‌رسانی» بالای هدر از پنل مدیران.
 *
 * همهٔ جنبه‌های نوار از پنل قابل کنترل است:
 * - ظاهر: فعال/غیرفعال، ارتفاع دسکتاپ و موبایل، رنگ پس‌زمینه و متن، اندازهٔ
 *   متن، فاصلهٔ تعویض آیتم‌ها و نوع انیمیشن
 * - محتوا: متن، تصویر (شامل GIF/WebP متحرک) یا ویدیوی کوتاه، لینک مقصد،
 *   ترتیب نمایش، بازهٔ زمانی و وضعیت فعال بودن
 */
class AdminAnnouncementBarController extends Controller
{
    /**
     * تنظیمات نوار + همهٔ آیتم‌ها (برای فرم پنل).
     */
    public function index(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => [
                'settings' => AnnouncementBarController::resolveSettings(),
                'items' => AnnouncementBarItem::query()
                    ->orderBy('sort_order')
                    ->orderByDesc('id')
                    ->get(),
            ],
        ]);
    }

    /**
     * ذخیرهٔ تنظیمات ظاهری نوار.
     */
    public function updateSettings(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'enabled' => ['required', 'boolean'],
            'height' => [
                'required',
                'integer',
                'min:'.AnnouncementBarController::HEIGHT_MIN,
                'max:'.AnnouncementBarController::HEIGHT_MAX,
            ],
            'mobile_height' => [
                'required',
                'integer',
                'min:'.AnnouncementBarController::HEIGHT_MIN,
                'max:'.AnnouncementBarController::HEIGHT_MAX,
            ],
            'background_color' => ['required', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'text_color' => ['required', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'font_size' => [
                'required',
                'integer',
                'min:'.AnnouncementBarController::FONT_SIZE_MIN,
                'max:'.AnnouncementBarController::FONT_SIZE_MAX,
            ],
            'interval' => [
                'required',
                'integer',
                'min:'.AnnouncementBarController::INTERVAL_MIN,
                'max:'.AnnouncementBarController::INTERVAL_MAX,
            ],
            'animation' => ['required', Rule::in(AnnouncementBarController::ANIMATIONS)],
        ]);

        $this->saveSettings($validated);

        return response()->json([
            'success' => true,
            'message' => 'تنظیمات نوار اطلاع‌رسانی ذخیره شد.',
            'data' => AnnouncementBarController::resolveSettings(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $item = AnnouncementBarItem::create($this->validateItem($request));

        $this->forgetStorefrontCache();

        return response()->json([
            'success' => true,
            'message' => 'اطلاع‌رسانی ایجاد شد.',
            'data' => $item,
        ], 201);
    }

    public function update(Request $request, AnnouncementBarItem $item): JsonResponse
    {
        $item->update($this->validateItem($request));

        $this->forgetStorefrontCache();

        return response()->json([
            'success' => true,
            'message' => 'اطلاع‌رسانی ویرایش شد.',
            'data' => $item->fresh(),
        ]);
    }

    public function updateStatus(Request $request, AnnouncementBarItem $item): JsonResponse
    {
        $validated = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $item->update(['is_active' => $validated['is_active']]);

        $this->forgetStorefrontCache();

        return response()->json([
            'success' => true,
            'message' => $validated['is_active']
                ? 'اطلاع‌رسانی فعال شد.'
                : 'اطلاع‌رسانی غیرفعال شد.',
            'data' => $item->fresh(),
        ]);
    }

    public function destroy(AnnouncementBarItem $item): JsonResponse
    {
        $item->delete();

        $this->forgetStorefrontCache();

        return response()->json([
            'success' => true,
            'message' => 'اطلاع‌رسانی حذف شد.',
        ]);
    }

    /**
     * بارگذاری فایل نوار: تصویر (شامل GIF/WebP متحرک) یا ویدیوی کوتاه.
     * مسیر ذخیره‌شده در فرم قرار می‌گیرد.
     */
    public function uploadMedia(Request $request): JsonResponse
    {
        $request->validate([
            'file' => [
                'required',
                'file',
                'mimes:jpg,jpeg,png,webp,gif,mp4,webm',
                'max:10240',
            ],
        ], [
            'file.mimes' => 'فقط تصویر (JPG، PNG، WebP، GIF) یا ویدیو (MP4، WebM) مجاز است.',
            'file.max' => 'حجم فایل نباید بیشتر از ۱۰ مگابایت باشد.',
        ]);

        $file = $request->file('file');
        $path = $file?->store('announcement-bar', 'public');

        if (! $path) {
            return response()->json([
                'success' => false,
                'message' => 'بارگذاری فایل انجام نشد.',
            ], 500);
        }

        $extension = strtolower(
            $file->getClientOriginalExtension() ?: (string) $file->extension()
        );

        return response()->json([
            'success' => true,
            'message' => 'فایل نوار اطلاع‌رسانی بارگذاری شد.',
            'data' => [
                'path' => $path,
                'url' => Storage::disk('public')->url($path),
                'type' => in_array($extension, ['mp4', 'webm'], true)
                    ? AnnouncementBarItem::TYPE_VIDEO
                    : AnnouncementBarItem::TYPE_IMAGE,
            ],
        ], 201);
    }

    /**
     * @param  array<string, mixed>  $settings
     */
    private function saveSettings(array $settings): void
    {
        StoreSetting::setValue(
            'announcement_bar_enabled',
            $settings['enabled'] ? '1' : '0'
        );

        StoreSetting::setValue('announcement_bar_height', $settings['height']);

        StoreSetting::setValue(
            'announcement_bar_mobile_height',
            $settings['mobile_height']
        );

        StoreSetting::setValue(
            'announcement_bar_bg_color',
            $settings['background_color']
        );

        StoreSetting::setValue(
            'announcement_bar_text_color',
            $settings['text_color']
        );

        StoreSetting::setValue('announcement_bar_font_size', $settings['font_size']);
        StoreSetting::setValue('announcement_bar_interval', $settings['interval']);
        StoreSetting::setValue('announcement_bar_animation', $settings['animation']);

        StoreSetting::forgetCache();
        $this->forgetStorefrontCache();
    }

    private function forgetStorefrontCache(): void
    {
        Cache::forget(AnnouncementBarController::STOREFRONT_CACHE_KEY);
    }

    /**
     * @return array<string, mixed>
     */
    private function validateItem(Request $request): array
    {
        $validated = $request->validate([
            'type' => ['required', Rule::in(AnnouncementBarItem::TYPES)],
            'text' => ['nullable', 'string', 'max:500'],
            'image' => ['nullable', 'string', 'max:2048'],
            'link' => ['nullable', 'string', 'max:2048'],
            'open_in_new_tab' => ['sometimes', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
        ]);

        $type = $validated['type'];
        $text = trim((string) ($validated['text'] ?? ''));
        $image = trim((string) ($validated['image'] ?? ''));

        // آیتم متنی بدون متن و آیتم تصویری/ویدیویی بدون فایل، در سایت قابل
        // نمایش نیست؛ اجازه نمی‌دهیم چنین آیتمی ذخیره شود.
        if ($type === AnnouncementBarItem::TYPE_TEXT && $text === '') {
            throw ValidationException::withMessages([
                'text' => 'متن اطلاع‌رسانی را وارد کنید.',
            ]);
        }

        if ($type !== AnnouncementBarItem::TYPE_TEXT && $image === '') {
            throw ValidationException::withMessages([
                'image' => 'فایل تصویر یا ویدیوی اطلاع‌رسانی را بارگذاری کنید.',
            ]);
        }

        $validated['text'] = $text === '' ? null : $text;
        $validated['image'] = $image === '' ? null : $image;

        return $validated;
    }
}
