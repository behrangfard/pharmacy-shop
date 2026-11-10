<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Page;
use Illuminate\Http\JsonResponse;

/**
 * صفحات ثابت سایت برای فروشگاه.
 *
 * فقط صفحات منتشرشده برمی‌گردند؛ صفحات پیش‌نویس یا زمان‌بندی‌شده برای
 * مشتری وجود ندارند.
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
        $pages = Page::query()
            ->published()
            ->select(self::SUMMARY_FIELDS)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

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

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $page->id,
                'title' => $page->title,
                'slug' => $page->slug,
                'excerpt' => $page->excerpt,
                'content' => $page->content,
                'seo_title' => $page->seo_title,
                'seo_description' => $page->seo_description,
                'updated_at' => $page->updated_at,
                'published_at' => $page->published_at,
            ],
        ]);
    }
}
