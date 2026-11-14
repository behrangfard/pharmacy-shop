<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Popup;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * مدیریت پاپ‌آپ‌های تبلیغاتی فروشگاه.
 *
 * مدیر می‌تواند برای هر پاپ‌آپ محتوا (عنوان/برچسب/توضیح/تصویر/دکمه‌ها/کد تخفیف)،
 * ظاهر (تم/جاگذاری/موقعیت تصویر)، هدف‌گیری (صفحه‌ها/دستگاه)، زمان‌بندی
 * (بازهٔ نمایش/شمارش معکوس) و قواعد نمایش (تأخیر/بستن خودکار/تکرار) را تعیین
 * کند. دسترسی این بخش با مجوز banners.manage کنترل می‌شود (همان گروه بنرها و
 * استوری‌ها؛ محتوای تبلیغاتی سایت).
 */
class AdminPopupController extends Controller
{
    public function index(): JsonResponse
    {
        $popups = Popup::query()
            ->orderBy('sort_order')
            ->orderByDesc('id')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $popups,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $popup = Popup::create($this->validatePopup($request));

        $this->forgetStorefrontCache();

        return response()->json([
            'success' => true,
            'message' => 'پاپ‌آپ با موفقیت افزوده شد.',
            'data' => $popup,
        ], 201);
    }

    public function update(Request $request, Popup $popup): JsonResponse
    {
        $popup->update($this->validatePopup($request));

        $this->forgetStorefrontCache();

        return response()->json([
            'success' => true,
            'message' => 'پاپ‌آپ ویرایش شد.',
            'data' => $popup->fresh(),
        ]);
    }

    public function updateStatus(Request $request, Popup $popup): JsonResponse
    {
        $validated = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $popup->update(['is_active' => $validated['is_active']]);

        $this->forgetStorefrontCache();

        return response()->json([
            'success' => true,
            'message' => $validated['is_active']
                ? 'پاپ‌آپ فعال شد.'
                : 'پاپ‌آپ غیرفعال شد.',
            'data' => $popup->fresh(),
        ]);
    }

    public function destroy(Popup $popup): JsonResponse
    {
        $popup->delete();

        $this->forgetStorefrontCache();

        return response()->json([
            'success' => true,
            'message' => 'پاپ‌آپ حذف شد.',
        ]);
    }

    /**
     * بارگذاری تصویر پاپ‌آپ؛ مسیر ذخیره‌شده در فرم قرار می‌گیرد.
     */
    public function uploadImage(Request $request): JsonResponse
    {
        $request->validate([
            'image' => [
                'required',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:5120',
            ],
        ]);

        $path = $request->file('image')->store('popups', 'public');

        if (! $path) {
            return response()->json([
                'success' => false,
                'message' => 'بارگذاری تصویر انجام نشد.',
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'تصویر پاپ‌آپ بارگذاری شد.',
            'data' => [
                'path' => $path,
                'url' => Storage::disk('public')->url($path),
            ],
        ], 201);
    }

    private function forgetStorefrontCache(): void
    {
        Cache::forget(PopupController::STOREFRONT_CACHE_KEY);
    }

    /**
     * اعتبارسنجی و نرمال‌سازی داده‌های پاپ‌آپ.
     *
     * @return array<string, mixed>
     */
    private function validatePopup(Request $request): array
    {
        $validated = $request->validate([
            'title' => ['nullable', 'string', 'max:120'],
            'badge' => ['nullable', 'string', 'max:60'],
            'description' => ['nullable', 'string', 'max:600'],

            'image' => ['nullable', 'string', 'max:2048'],
            'image_alt' => ['nullable', 'string', 'max:160'],

            'theme' => ['required', Rule::in(Popup::THEMES)],
            'layout' => ['required', Rule::in(Popup::LAYOUTS)],
            'image_position' => ['required', Rule::in(Popup::IMAGE_POSITIONS)],

            'cta_text' => ['nullable', 'string', 'max:40'],
            'cta_link' => ['nullable', 'string', 'max:2048'],
            'secondary_text' => ['nullable', 'string', 'max:40'],
            'secondary_link' => ['nullable', 'string', 'max:2048'],

            'coupon_code' => ['nullable', 'string', 'max:40'],

            'display_pages' => ['nullable', 'array'],
            'display_pages.*' => [Rule::in(Popup::DISPLAY_PAGES)],

            'devices' => ['required', Rule::in(Popup::DEVICES)],

            'delay_seconds' => ['required', 'integer', 'between:0,30'],
            'auto_close_seconds' => ['required', 'integer', 'between:0,120'],

            'frequency' => ['required', Rule::in(Popup::FREQUENCIES)],

            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'countdown_to' => ['nullable', 'date'],

            'close_on_backdrop' => ['sometimes', 'boolean'],
            'show_close' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],

            'sort_order' => ['nullable', 'integer', 'min:0', 'max:9999'],
        ]);

        $title = trim((string) ($validated['title'] ?? ''));
        $description = trim((string) ($validated['description'] ?? ''));
        $image = trim((string) ($validated['image'] ?? ''));

        // پاپ‌آپ کاملاً خالی معنا ندارد؛ حداقل یکی از محتواها لازم است.
        if ($title === '' && $description === '' && $image === '') {
            throw ValidationException::withMessages([
                'title' => ['حداقل یکی از عنوان، توضیح یا تصویر لازم است.'],
            ]);
        }

        $pages = array_values(array_filter(
            array_map(
                fn ($page) => trim((string) $page),
                $validated['display_pages'] ?? []
            ),
            fn ($page) => $page !== ''
        ));

        return [
            'title' => $title === '' ? null : $title,
            'badge' => $this->nullableText($validated['badge'] ?? null),
            'description' => $description === '' ? null : $description,
            'image' => $image === '' ? null : $image,
            'image_alt' => $this->nullableText($validated['image_alt'] ?? null),
            'theme' => $validated['theme'],
            'layout' => $validated['layout'],
            'image_position' => $validated['image_position'],
            'cta_text' => $this->nullableText($validated['cta_text'] ?? null),
            'cta_link' => $this->nullableText($validated['cta_link'] ?? null),
            'secondary_text' => $this->nullableText($validated['secondary_text'] ?? null),
            'secondary_link' => $this->nullableText($validated['secondary_link'] ?? null),
            'coupon_code' => $this->nullableText($validated['coupon_code'] ?? null),
            'display_pages' => $pages === [] ? null : $pages,
            'devices' => $validated['devices'],
            'delay_seconds' => $validated['delay_seconds'],
            'auto_close_seconds' => $validated['auto_close_seconds'],
            'frequency' => $validated['frequency'],
            'starts_at' => $validated['starts_at'] ?? null,
            'ends_at' => $validated['ends_at'] ?? null,
            'countdown_to' => $validated['countdown_to'] ?? null,
            'close_on_backdrop' => $validated['close_on_backdrop'] ?? true,
            'show_close' => $validated['show_close'] ?? true,
            'is_active' => $validated['is_active'] ?? true,
            'sort_order' => $validated['sort_order'] ?? 0,
        ];
    }

    /** متن خالی به null تبدیل می‌شود تا «بدون مقدار» صریح ذخیره شود. */
    private function nullableText(?string $value): ?string
    {
        $text = trim((string) $value);

        return $text === '' ? null : $text;
    }
}
