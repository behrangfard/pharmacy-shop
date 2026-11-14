<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Story;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

/**
 * مدیریت استوری‌های صفحهٔ اول فروشگاه (دایره‌های بالای دسته‌بندی‌ها).
 *
 * هر استوری یک مجموعه اسلاید تصویری است؛ مدیر می‌تواند تصویر دایره، عنوان
 * زیر آن، اسلایدها (تصویر + متن + لینک)، ترتیب نمایش و وضعیت فعال بودن را
 * تغییر دهد. دسترسی این صفحه با مجوز banners.manage کنترل می‌شود (همان مجوز
 * بنرها و نوار اطلاع‌رسانی، چون محتوای تبلیغاتی صفحهٔ اول است).
 */
class AdminStoryController extends Controller
{
    public function index(): JsonResponse
    {
        $stories = Story::query()
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $stories,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $story = Story::create($this->validateStory($request));

        $this->forgetStorefrontCache();

        return response()->json([
            'success' => true,
            'message' => 'استوری با موفقیت افزوده شد.',
            'data' => $story,
        ], 201);
    }

    public function update(Request $request, Story $story): JsonResponse
    {
        $story->update($this->validateStory($request));

        $this->forgetStorefrontCache();

        return response()->json([
            'success' => true,
            'message' => 'استوری ویرایش شد.',
            'data' => $story->fresh(),
        ]);
    }

    public function updateStatus(Request $request, Story $story): JsonResponse
    {
        $validated = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $story->update(['is_active' => $validated['is_active']]);

        $this->forgetStorefrontCache();

        return response()->json([
            'success' => true,
            'message' => $validated['is_active']
                ? 'استوری فعال شد.'
                : 'استوری غیرفعال شد.',
            'data' => $story->fresh(),
        ]);
    }

    public function destroy(Story $story): JsonResponse
    {
        $story->delete();

        $this->forgetStorefrontCache();

        return response()->json([
            'success' => true,
            'message' => 'استوری حذف شد.',
        ]);
    }

    /**
     * بارگذاری تصویر استوری (دایره یا اسلاید)؛ مسیر ذخیره‌شده در فرم قرار
     * می‌گیرد. اسلایدها تمام‌صفحه نمایش داده می‌شوند، پس سقف حجم بالاتر است.
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

        $path = $request->file('image')->store('stories', 'public');

        if (! $path) {
            return response()->json([
                'success' => false,
                'message' => 'بارگذاری تصویر انجام نشد.',
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'تصویر استوری بارگذاری شد.',
            'data' => [
                'path' => $path,
                'url' => Storage::disk('public')->url($path),
            ],
        ], 201);
    }

    private function forgetStorefrontCache(): void
    {
        Cache::forget(StoryController::STOREFRONT_CACHE_KEY);
    }

    /**
     * اعتبارسنجی و نرمال‌سازی داده‌های استوری.
     *
     * @return array<string, mixed>
     */
    private function validateStory(Request $request): array
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:120'],
            'cover_image' => ['nullable', 'string', 'max:2048'],

            'slides' => ['required', 'array', 'min:1', 'max:30'],
            'slides.*.image' => ['required', 'string', 'max:2048'],
            'slides.*.caption' => ['nullable', 'string', 'max:160'],
            'slides.*.link' => ['nullable', 'string', 'max:2048'],

            'sort_order' => ['nullable', 'integer', 'min:0', 'max:9999'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $slides = [];

        foreach ($validated['slides'] as $slide) {
            $image = trim((string) ($slide['image'] ?? ''));

            if ($image === '') {
                continue;
            }

            $caption = trim((string) ($slide['caption'] ?? ''));
            $link = trim((string) ($slide['link'] ?? ''));

            $slides[] = [
                'image' => $image,
                'caption' => $caption === '' ? null : $caption,
                'link' => $link === '' ? null : $link,
            ];
        }

        if ($slides === []) {
            throw ValidationException::withMessages([
                'slides' => ['حداقل یک اسلاید با تصویر لازم است.'],
            ]);
        }

        $cover = trim((string) ($validated['cover_image'] ?? ''));

        return [
            'title' => trim($validated['title']),
            'cover_image' => $cover === '' ? null : $cover,
            'slides' => $slides,
            'sort_order' => $validated['sort_order'] ?? 0,
            'is_active' => $validated['is_active'] ?? true,
        ];
    }
}
