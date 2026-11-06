<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Article;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * بخش عمومی «مقالات» فروشگاه.
 *
 * فقط مقاله‌های منتشرشده (و رسیده به زمان انتشار) برگردانده می‌شوند.
 */
class ArticleController extends Controller
{
    private const LIST_FIELDS = [
        'id',
        'title',
        'slug',
        'excerpt',
        'cover_image',
        'category',
        'author_name',
        'published_at',
        'reading_minutes',
    ];

    /**
     * فهرست مقاله‌های منتشرشده با صفحه‌بندی، جست‌وجو و فیلتر دسته.
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'category' => ['nullable', 'string', 'max:60'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:24'],
        ]);

        $query = Article::query()
            ->published()
            ->select(self::LIST_FIELDS)
            ->orderByDesc('published_at')
            ->orderByDesc('id');

        if (! empty($validated['q'])) {
            $search = $validated['q'];

            $query->where(function ($subQuery) use ($search) {
                $subQuery
                    ->where('title', 'like', "%{$search}%")
                    ->orWhere('excerpt', 'like', "%{$search}%");
            });
        }

        if (! empty($validated['category'])) {
            $query->where('category', $validated['category']);
        }

        $articles = $query->paginate($validated['per_page'] ?? 9)->withQueryString();

        return response()->json([
            'success' => true,
            'data' => $articles->items(),
            'meta' => [
                'current_page' => $articles->currentPage(),
                'last_page' => $articles->lastPage(),
                'per_page' => $articles->perPage(),
                'total' => $articles->total(),
            ],
            'categories' => Article::query()
                ->published()
                ->whereNotNull('category')
                ->distinct()
                ->orderBy('category')
                ->pluck('category'),
        ]);
    }

    /**
     * نمایش یک مقاله بر اساس اسلاگ، همراه با مقاله‌های مرتبط.
     */
    public function show(string $slug): JsonResponse
    {
        $article = Article::query()
            ->published()
            ->where('slug', $slug)
            ->first();

        if (! $article) {
            return response()->json([
                'success' => false,
                'message' => 'مقالهٔ موردنظر پیدا نشد.',
            ], 404);
        }

        $related = Article::query()
            ->published()
            ->select(self::LIST_FIELDS)
            ->whereKeyNot($article->id)
            ->when(
                $article->category,
                fn ($query, $category) => $query->where('category', $category)
            )
            ->orderByDesc('published_at')
            ->orderByDesc('id')
            ->limit(3)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $article,
            'related' => $related,
        ]);
    }
}
