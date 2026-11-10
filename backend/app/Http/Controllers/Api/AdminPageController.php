<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Page;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * مدیریت صفحات ثابت سایت از پنل مدیران.
 *
 * هر صفحه یک متن با نشانه‌گذاری سبک دارد، می‌تواند منتشر یا پیش‌نویس باشد و
 * انتخابی در فوتر سایت نمایش داده شود. اسلاگ و خلاصه در مدل ساخته می‌شوند.
 */
class AdminPageController extends Controller
{
    private const LIST_FIELDS = [
        'id',
        'title',
        'slug',
        'excerpt',
        'is_published',
        'show_in_footer',
        'sort_order',
        'published_at',
        'updated_at',
    ];

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => [
                'nullable',
                Rule::in(['all', 'published', 'draft']),
            ],
            'q' => ['nullable', 'string', 'max:120'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $query = Page::query()
            ->select(self::LIST_FIELDS)
            ->orderBy('sort_order')
            ->orderByDesc('id');

        $status = $validated['status'] ?? 'all';

        if ($status === 'published') {
            $query->published();
        } elseif ($status === 'draft') {
            $query->where('is_published', false);
        }

        if (! empty($validated['q'])) {
            $search = $validated['q'];

            $query->where(function ($subQuery) use ($search) {
                $subQuery
                    ->where('title', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%");
            });
        }

        $pages = $query
            ->paginate($validated['per_page'] ?? 20)
            ->withQueryString();

        return response()->json([
            'success' => true,
            'data' => $pages->items(),
            'meta' => [
                'current_page' => $pages->currentPage(),
                'last_page' => $pages->lastPage(),
                'per_page' => $pages->perPage(),
                'total' => $pages->total(),
            ],
            'stats' => [
                'total' => Page::query()->count(),
                'published' => Page::query()->published()->count(),
                'draft' => Page::query()->where('is_published', false)->count(),
                'footer' => Page::query()
                    ->published()
                    ->where('show_in_footer', true)
                    ->count(),
            ],
        ]);
    }

    public function show(Page $page): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $page,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $page = Page::create($this->validatedData($request, true));

        return response()->json([
            'success' => true,
            'message' => $page->is_published
                ? 'صفحه با موفقیت ثبت و منتشر شد.'
                : 'پیش‌نویس صفحه ذخیره شد.',
            'data' => $page->fresh(),
        ], 201);
    }

    public function update(Request $request, Page $page): JsonResponse
    {
        $page->update($this->validatedData($request));

        return response()->json([
            'success' => true,
            'message' => 'صفحه با موفقیت ویرایش شد.',
            'data' => $page->fresh(),
        ]);
    }

    public function updateStatus(Request $request, Page $page): JsonResponse
    {
        $validated = $request->validate([
            'is_published' => ['required', 'boolean'],
        ]);

        $page->update(['is_published' => $validated['is_published']]);

        return response()->json([
            'success' => true,
            'message' => $validated['is_published']
                ? 'صفحه منتشر شد.'
                : 'صفحه از انتشار خارج شد.',
            'data' => $page->fresh(),
        ]);
    }

    public function destroy(Page $page): JsonResponse
    {
        $page->delete();

        return response()->json([
            'success' => true,
            'message' => 'صفحه حذف شد.',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedData(Request $request, bool $creating = false): array
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:180'],
            'excerpt' => ['nullable', 'string', 'max:500'],
            'content' => ['required', 'string', 'min:10'],
            'is_published' => ['sometimes', 'boolean'],
            'show_in_footer' => ['sometimes', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:9999'],
            'seo_title' => ['nullable', 'string', 'max:255'],
            'seo_description' => ['nullable', 'string', 'max:500'],
            'published_at' => ['nullable', 'date'],
        ]);

        $validated['is_published'] = $request->boolean('is_published');

        if ($creating && ! $request->has('show_in_footer')) {
            $validated['show_in_footer'] = true;
        } else {
            $validated['show_in_footer'] = $request->boolean('show_in_footer');
        }

        $validated['sort_order'] = (int) ($validated['sort_order'] ?? 0);

        return $validated;
    }
}
