<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Article;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

/**
 * مدیریت مقاله‌های فروشگاه از پنل مدیران.
 *
 * انتشار روزانه: مدیر متن را می‌نویسد، تصویر کاور را بارگذاری می‌کند و با
 * «انتشار» مقاله بلافاصله روی سایت می‌آید. ثبت تاریخ در آینده یعنی انتشار
 * زمان‌بندی‌شده.
 */
class AdminArticleController extends Controller
{
    private const LIST_FIELDS = [
        'id',
        'title',
        'slug',
        'excerpt',
        'cover_image',
        'category',
        'author_name',
        'is_published',
        'published_at',
        'reading_minutes',
        'created_at',
        'updated_at',
    ];

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => [
                'nullable',
                Rule::in(['all', 'published', 'scheduled', 'draft']),
            ],
            'q' => ['nullable', 'string', 'max:120'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $query = Article::query()
            ->select(self::LIST_FIELDS)
            ->orderByDesc('created_at')
            ->orderByDesc('id');

        $status = $validated['status'] ?? 'all';

        if ($status === 'published') {
            $query
                ->where('is_published', true)
                ->where(function ($subQuery) {
                    $subQuery
                        ->whereNull('published_at')
                        ->orWhere('published_at', '<=', now());
                });
        } elseif ($status === 'scheduled') {
            $query
                ->where('is_published', true)
                ->where('published_at', '>', now());
        } elseif ($status === 'draft') {
            $query->where('is_published', false);
        }

        if (! empty($validated['q'])) {
            $search = $validated['q'];

            $query->where(function ($subQuery) use ($search) {
                $subQuery
                    ->where('title', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%")
                    ->orWhere('category', 'like', "%{$search}%");
            });
        }

        $articles = $query
            ->paginate($validated['per_page'] ?? 12)
            ->withQueryString();

        return response()->json([
            'success' => true,
            'data' => $articles->items(),
            'meta' => [
                'current_page' => $articles->currentPage(),
                'last_page' => $articles->lastPage(),
                'per_page' => $articles->perPage(),
                'total' => $articles->total(),
            ],
            'stats' => [
                'total' => Article::query()->count(),
                'published' => Article::query()
                    ->where('is_published', true)
                    ->where(function ($subQuery) {
                        $subQuery
                            ->whereNull('published_at')
                            ->orWhere('published_at', '<=', now());
                    })
                    ->count(),
                'draft' => Article::query()
                    ->where('is_published', false)
                    ->count(),
                'today' => Article::query()
                    ->whereDate('created_at', now()->toDateString())
                    ->count(),
            ],
        ]);
    }

    public function show(Article $article): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $article,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $article = Article::create($this->validatedData($request));

        return response()->json([
            'success' => true,
            'message' => $article->is_published
                ? 'مقاله با موفقیت ثبت و منتشر شد.'
                : 'پیش‌نویس مقاله ذخیره شد.',
            'data' => $article->fresh(),
        ], 201);
    }

    public function update(Request $request, Article $article): JsonResponse
    {
        $article->update($this->validatedData($request));

        return response()->json([
            'success' => true,
            'message' => 'مقاله با موفقیت ویرایش شد.',
            'data' => $article->fresh(),
        ]);
    }

    public function updateStatus(Request $request, Article $article): JsonResponse
    {
        $validated = $request->validate([
            'is_published' => ['required', 'boolean'],
        ]);

        $article->update(['is_published' => $validated['is_published']]);

        return response()->json([
            'success' => true,
            'message' => $validated['is_published']
                ? 'مقاله منتشر شد.'
                : 'مقاله از انتشار خارج شد.',
            'data' => $article->fresh(),
        ]);
    }

    public function destroy(Article $article): JsonResponse
    {
        $cover = $article->cover_image;

        $article->delete();

        if ($cover && str_starts_with($cover, 'article-covers/')) {
            Storage::disk('public')->delete($cover);
        }

        return response()->json([
            'success' => true,
            'message' => 'مقاله حذف شد.',
        ]);
    }

    /**
     * بارگذاری تصویر کاور مقاله؛ مسیر ذخیره‌شده در فرم قرار می‌گیرد.
     */
    public function uploadCover(Request $request): JsonResponse
    {
        $request->validate([
            'image' => [
                'required',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:5120',
            ],
        ]);

        $path = $request->file('image')->store('article-covers', 'public');

        if (! $path) {
            return response()->json([
                'success' => false,
                'message' => 'بارگذاری تصویر انجام نشد.',
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'تصویر کاور بارگذاری شد.',
            'data' => [
                'path' => $path,
                'url' => Storage::disk('public')->url($path),
            ],
        ], 201);
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedData(Request $request): array
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:180'],
            'excerpt' => ['nullable', 'string', 'max:500'],
            'content' => ['required', 'string', 'min:20'],
            'cover_image' => ['nullable', 'string', 'max:2048'],
            'category' => ['nullable', 'string', 'max:60'],
            'author_name' => ['nullable', 'string', 'max:120'],
            'is_published' => ['sometimes', 'boolean'],
            'published_at' => ['nullable', 'date'],
        ]);

        $validated['is_published'] = $request->boolean('is_published');
        $validated['author_name'] = filled($validated['author_name'] ?? null)
            ? $validated['author_name']
            : $request->user()?->name;

        return $validated;
    }
}
