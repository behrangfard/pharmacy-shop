<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Story;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

/**
 * استوری‌های صفحهٔ اول فروشگاه.
 *
 * پاسخ سبک است (فقط فیلدهای نمایشی) و مثل نشان‌های اعتماد در کش نگه داشته
 * می‌شود؛ با هر تغییر در پنل مدیران کلید کش پاک می‌شود تا استوری تازه
 * بلافاصله دیده شود.
 *
 * نکتهٔ مهم (همان درس بنرها): در کش باید «آرایه» ذخیره شود، نه Collection
 * eloquent؛ در غیر این صورت مقدار بازیابی‌شده در درایورهای file/database به
 * __PHP_Incomplete_Class تبدیل می‌شود و پاسخ JSON خالی برمی‌گردد.
 */
class StoryController extends Controller
{
    /** کلید کش فهرست استوری‌ها؛ با هر تغییر در پنل مدیران پاک می‌شود. */
    public const STOREFRONT_CACHE_KEY = 'storefront.stories.v1';

    public function index(): JsonResponse
    {
        $stories = Cache::remember(
            self::STOREFRONT_CACHE_KEY,
            now()->addMinutes(10),
            fn (): array => Story::query()
                ->orderBy('sort_order')
                ->orderBy('id')
                ->get()
                ->toArray()
        );

        return response()->json([
            'success' => true,
            'data' => $this->visibleStories($stories),
        ]);
    }

    /**
     * فقط استوری‌های فعال و دارای اسلاید، با فیلدهایی که فرانت‌اند لازم دارد.
     *
     * @param  array<int, array<string, mixed>>  $stories
     * @return array<int, array<string, mixed>>
     */
    private function visibleStories(array $stories): array
    {
        $visible = [];

        foreach ($stories as $story) {
            if (! ($story['is_active'] ?? false)) {
                continue;
            }

            $slides = $this->normalizeSlides($story['slides'] ?? []);

            // استوری بدون اسلاید تصویری در سایت رندر نمی‌شود؛ رکورد نیمه‌کاره
            // نادیده گرفته می‌شود تا دایرهٔ خالی روی صفحه نیفتد.
            if ($slides === []) {
                continue;
            }

            $cover = trim((string) ($story['cover_image'] ?? ''));

            $visible[] = [
                'id' => (int) ($story['id'] ?? 0),
                'title' => trim((string) ($story['title'] ?? '')),
                'cover_image' => $cover === '' ? $slides[0]['image'] : $cover,
                'slides' => $slides,
            ];
        }

        return $visible;
    }

    /**
     * نرمال‌سازی اسلایدها: اسلایدهای بدون تصویر حذف می‌شوند و متن/لینک خالی
     * به null تبدیل می‌شود تا فرانت‌اند شرط ساده‌تری داشته باشد.
     *
     * @param  mixed  $rawSlides
     * @return array<int, array{image: string, caption: string|null, link: string|null}>
     */
    private function normalizeSlides(mixed $rawSlides): array
    {
        if (! is_array($rawSlides)) {
            return [];
        }

        $slides = [];

        foreach ($rawSlides as $slide) {
            if (! is_array($slide)) {
                continue;
            }

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

        return $slides;
    }
}
