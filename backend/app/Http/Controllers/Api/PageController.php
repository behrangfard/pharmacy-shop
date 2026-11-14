<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Page;
use App\Models\StoreSetting;
use App\Support\LegalPages;
use Illuminate\Http\JsonResponse;

/**
 * صفحات ثابت سایت برای فروشگاه.
 *
 * فقط صفحات منتشرشده برمی‌گردند؛ صفحات پیش‌نویس یا زمان‌بندی‌شده برای
 * مشتری وجود ندارند. متغیرهای {{...}} متن صفحه (مثل {{store_phone}}) با
 * مقدار واقعی تنظیمات فروشگاه جایگزین می‌شوند تا صفحات قانونی همیشه
 * هم‌خوان با اطلاعات تماس فعلی باشند.
 */
class PageController extends Controller
{
    private const SUMMARY_FIELDS = [
        'id',
        'title',
        'slug',
        'excerpt',
        'show_in_footer',
        'sort_order',
        'updated_at',
    ];

    public function index(): JsonResponse
    {
        $settings = StoreSetting::publicSettings();

        $pages = Page::query()
            ->published()
            ->select(self::SUMMARY_FIELDS)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(fn (Page $page): array => [
                'id' => $page->id,
                'title' => LegalPages::render($page->title, $settings),
                'slug' => $page->slug,
                'excerpt' => $page->excerpt === null
                    ? null
                    : LegalPages::render($page->excerpt, $settings),
                'show_in_footer' => $page->show_in_footer,
                'sort_order' => $page->sort_order,
                'updated_at' => $page->updated_at,
            ]);

        return response()->json([
            'success' => true,
            'data' => $pages,
        ]);
    }

    public function show(string $slug): JsonResponse
    {
        $page = Page::query()
            ->published()
            ->where('slug', $slug)
            ->first();

        if (! $page) {
            return response()->json([
                'success' => false,
                'message' => 'صفحه یافت نشد.',
            ], 404);
        }

        $settings = StoreSetting::publicSettings();

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $page->id,
                'title' => LegalPages::render($page->title, $settings),
                'slug' => $page->slug,
                'excerpt' => $page->excerpt === null
                    ? null
                    : LegalPages::render($page->excerpt, $settings),
                'content' => LegalPages::render($page->content, $settings),
                'seo_title' => $page->seo_title === null
                    ? null
                    : LegalPages::render($page->seo_title, $settings),
                'seo_description' => $page->seo_description === null
                    ? null
                    : LegalPages::render($page->seo_description, $settings),
                'updated_at' => $page->updated_at,
                'published_at' => $page->published_at,
            ],
        ]);
    }
}
