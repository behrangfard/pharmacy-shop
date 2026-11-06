<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Banner;
use App\Support\BannerText;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class AdminBannerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'position' => ['nullable', Rule::in(Banner::POSITIONS)],
        ]);

        $banners = Banner::query()
            ->when(
                $validated['position'] ?? null,
                fn ($query, $position) => $query->where('position', $position)
            )
            ->orderBy('sort_order')
            ->orderByDesc('id')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $banners,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $banner = Banner::create($this->validateBanner($request));

        $this->forgetStorefrontCache();

        return response()->json([
            'success' => true,
            'message' => 'بنر با موفقیت ایجاد شد.',
            'data' => $banner,
        ], 201);
    }

    public function update(Request $request, Banner $banner): JsonResponse
    {
        $banner->update($this->validateBanner($request));

        $this->forgetStorefrontCache();

        return response()->json([
            'success' => true,
            'message' => 'بنر با موفقیت ویرایش شد.',
            'data' => $banner->fresh(),
        ]);
    }

    public function updateStatus(Request $request, Banner $banner): JsonResponse
    {
        $validated = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $banner->update(['is_active' => $validated['is_active']]);

        $this->forgetStorefrontCache();

        return response()->json([
            'success' => true,
            'message' => $validated['is_active']
                ? 'بنر فعال شد.'
                : 'بنر غیرفعال شد.',
            'data' => $banner->fresh(),
        ]);
    }

    public function destroy(Banner $banner): JsonResponse
    {
        $banner->delete();

        $this->forgetStorefrontCache();

        return response()->json([
            'success' => true,
            'message' => 'بنر حذف شد.',
        ]);
    }

    /**
     * بارگذاری تصویر بنر؛ مسیر ذخیره‌شده در فرم قرار می‌گیرد.
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

        $path = $request->file('image')->store('banners', 'public');

        if (! $path) {
            return response()->json([
                'success' => false,
                'message' => 'بارگذاری تصویر انجام نشد.',
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'تصویر بنر بارگذاری شد.',
            'data' => [
                'path' => $path,
                'url' => Storage::disk('public')->url($path),
            ],
        ], 201);
    }

    private function forgetStorefrontCache(): void
    {
        Cache::forget(BannerController::STOREFRONT_CACHE_KEY);
    }

    /**
     * اعتبارسنجی و نرمال‌سازی داده‌های بنر.
     *
     * لایه‌های متن پیش از ذخیره با App\Support\BannerText محدود می‌شوند تا
     * موقعیت‌ها درصدی، رنگ‌ها هگز و متن‌ها ساده بمانند.
     */
    private function validateBanner(Request $request): array
    {
        $validated = $request->validate([
            'title' => ['nullable', 'string', 'max:255'],
            'subtitle' => ['nullable', 'string', 'max:255'],
            'image' => ['required', 'string', 'max:2048'],
            'mobile_image' => ['nullable', 'string', 'max:2048'],
            'image_alt' => ['nullable', 'string', 'max:255'],
            'text_scrim' => ['nullable', Rule::in(BannerText::SCRIMS)],
            'text_layers' => ['nullable', 'array', 'max:'.BannerText::MAX_LAYERS],
            'text_layers.*.id' => ['nullable', 'string', 'max:40'],
            'text_layers.*.text' => ['nullable', 'string', 'max:'.BannerText::MAX_TEXT_LENGTH],
            'text_layers.*.tag' => ['nullable', 'string', 'max:10'],
            'text_layers.*.align' => ['nullable', 'string', 'max:10'],
            'text_layers.*.shadow' => ['nullable', 'string', 'max:10'],
            'text_layers.*.font_family' => ['nullable', 'string', 'max:60'],
            'text_layers.*.font_weight' => ['nullable', 'integer'],
            'text_layers.*.x' => ['nullable', 'numeric'],
            'text_layers.*.y' => ['nullable', 'numeric'],
            'text_layers.*.x_mobile' => ['nullable', 'numeric'],
            'text_layers.*.y_mobile' => ['nullable', 'numeric'],
            'text_layers.*.width' => ['nullable', 'numeric'],
            'text_layers.*.width_mobile' => ['nullable', 'numeric'],
            'text_layers.*.font_size' => ['nullable', 'numeric'],
            'text_layers.*.font_size_mobile' => ['nullable', 'numeric'],
            'text_layers.*.line_height' => ['nullable', 'numeric'],
            'text_layers.*.letter_spacing' => ['nullable', 'numeric'],
            'text_layers.*.color' => ['nullable', 'string', 'max:20'],
            'text_layers.*.background' => ['nullable', 'string', 'max:20'],
            'text_layers.*.background_opacity' => ['nullable', 'numeric'],
            'text_layers.*.padding_x' => ['nullable', 'numeric'],
            'text_layers.*.padding_y' => ['nullable', 'numeric'],
            'text_layers.*.radius' => ['nullable', 'numeric'],
            'text_layers.*.italic' => ['nullable', 'boolean'],
            'text_layers.*.uppercase' => ['nullable', 'boolean'],
            'link' => ['nullable', 'string', 'max:2048'],
            'button_label' => ['nullable', 'string', 'max:60'],
            'position' => ['required', Rule::in(Banner::POSITIONS)],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
        ]);

        if (array_key_exists('text_layers', $validated)) {
            $validated['text_layers'] = BannerText::normalizeLayers($validated['text_layers']);
        }

        if (array_key_exists('text_scrim', $validated)) {
            $validated['text_scrim'] = BannerText::normalizeScrim($validated['text_scrim']);
        }

        return $validated;
    }
}
