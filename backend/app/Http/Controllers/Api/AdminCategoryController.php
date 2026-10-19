<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AdminCategoryController extends Controller
{
    public function index(): JsonResponse
    {
        $categories = Category::query()
            ->withCount(['products', 'children'])
            ->with('parent:id,name')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $categories,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validateCategory($request);

        $this->validateParent($validated['parent_id'] ?? null);

        $validated['slug'] = $this->uniqueSlug(
            $validated['slug'] ?? $validated['name']
        );

        $category = Category::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'دسته‌بندی با موفقیت ایجاد شد.',
            'data' => $category->load('parent:id,name'),
        ], 201);
    }

    public function show(Category $category): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $category->load('parent:id,name')
                ->loadCount(['products', 'children']),
        ]);
    }

    public function update(
        Request $request,
        Category $category
    ): JsonResponse {
        $validated = $this->validateCategory($request, $category);

        $parentId = $validated['parent_id'] ?? null;

        $this->validateParent($parentId, $category);

        if ($parentId !== null && $this->isDescendantOf($parentId, $category)) {
            throw ValidationException::withMessages([
                'parent_id' => [
                    'نمی‌توان یک زیر‌دسته را به والد خودش تبدیل کرد.',
                ],
            ]);
        }

        $slugInput = $validated['slug'] ?? $category->slug;

        if (
            !isset($validated['slug']) &&
            $validated['name'] !== $category->name
        ) {
            $slugInput = $validated['name'];
        }

        $validated['slug'] = $this->uniqueSlug(
            $slugInput,
            $category->id
        );

        $category->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'دسته‌بندی با موفقیت ویرایش شد.',
            'data' => $category->fresh()
                ->load('parent:id,name')
                ->loadCount(['products', 'children']),
        ]);
    }

    public function updateStatus(
        Request $request,
        Category $category
    ): JsonResponse {
        $validated = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $category->update([
            'is_active' => $validated['is_active'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'وضعیت دسته‌بندی به‌روزرسانی شد.',
            'data' => $category->fresh(),
        ]);
    }

    public function destroy(Category $category): JsonResponse
    {
        $hasProducts = $category->products()->exists();
        $hasChildren = $category->children()->exists();

        if ($hasProducts || $hasChildren) {
            return response()->json([
                'success' => false,
                'message' => 'این دسته‌بندی محصول یا زیر‌دسته دارد و قابل حذف نیست.',
            ], 409);
        }

        $category->delete();

        return response()->json([
            'success' => true,
            'message' => 'دسته‌بندی حذف شد.',
        ]);
    }

    private function validateCategory(
        Request $request,
        ?Category $category = null
    ): array {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],

            'slug' => [
                'nullable',
                'string',
                'max:255',
                Rule::unique('categories', 'slug')
                    ->ignore($category?->id),
            ],

            'parent_id' => [
                'nullable',
                'integer',
                'exists:categories,id',
            ],

            'description' => ['nullable', 'string'],
            'image' => ['nullable', 'string', 'max:2048'],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
            'meta_title' => ['nullable', 'string', 'max:255'],
            'meta_description' => ['nullable', 'string'],
        ]);
    }

    private function validateParent(
        ?int $parentId,
        ?Category $category = null
    ): void {
        if ($parentId === null) {
            return;
        }

        if ($category !== null && $parentId === $category->id) {
            throw ValidationException::withMessages([
                'parent_id' => ['یک دسته‌بندی نمی‌تواند والد خودش باشد.'],
            ]);
        }

        $parent = Category::findOrFail($parentId);

        if ($category !== null && $this->isDescendantOf($parentId, $category)) {
            throw ValidationException::withMessages([
                'parent_id' => [
                    'انتخاب این والد باعث ایجاد چرخه در دسته‌بندی‌ها می‌شود.',
                ],
            ]);
        }

        if ($category !== null && $category->parent_id === $parent->id) {
            return;
        }
    }

    private function isDescendantOf(
        int $candidateId,
        Category $category
    ): bool {
        $current = Category::find($candidateId);

        while ($current !== null) {
            if ($current->id === $category->id) {
                return true;
            }

            $current = $current->parent_id
                ? Category::find($current->parent_id)
                : null;
        }

        return false;
    }

    private function uniqueSlug(
        string $value,
        ?int $ignoreId = null
    ): string {
        $slug = Str::slug($value);

        if ($slug === '') {
            $slug = 'category-' . Str::lower(Str::random(8));
        }

        $baseSlug = $slug;
        $counter = 2;

        while (
            Category::query()
                ->where('slug', $slug)
                ->when(
                    $ignoreId !== null,
                    fn ($query) => $query->where('id', '!=', $ignoreId)
                )
                ->exists()
        ) {
            $slug = $baseSlug . '-' . $counter;
            $counter++;
        }

        return $slug;
    }
}
