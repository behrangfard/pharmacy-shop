<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Services\Media\WebpConverter;
use App\Support\Media\ImageDimensions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AdminBrandController extends Controller
{
    public function index(): JsonResponse
    {
        $brands = Brand::query()
            ->withCount('products')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $brands,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validateBrand($request);

        $validated['slug'] = $this->uniqueSlug(
            $validated['slug'] ?? $validated['name']
        );

        $brand = Brand::create($validated);

        $this->forgetStorefrontCache();

        return response()->json([
            'success' => true,
            'message' => 'برند با موفقیت ایجاد شد.',
            'data' => $brand,
        ], 201);
    }

    public function show(Brand $brand): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $brand->loadCount('products'),
        ]);
    }

    public function update(Request $request, Brand $brand): JsonResponse
    {
        $validated = $this->validateBrand($request, $brand);

        $slugInput = $validated['slug'] ?? $brand->slug;

        if (
            ! isset($validated['slug']) &&
            $validated['name'] !== $brand->name
        ) {
            $slugInput = $validated['name'];
        }

        $validated['slug'] = $this->uniqueSlug($slugInput, $brand->id);

        $brand->update($validated);

        $this->forgetStorefrontCache();

        return response()->json([
            'success' => true,
            'message' => 'برند با موفقیت ویرایش شد.',
            'data' => $brand->fresh()->loadCount('products'),
        ]);
    }

    public function updateStatus(Request $request, Brand $brand): JsonResponse
    {
        $validated = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $brand->update([
            'is_active' => $validated['is_active'],
        ]);

        $this->forgetStorefrontCache();

        return response()->json([
            'success' => true,
            'message' => $validated['is_active']
                ? 'برند فعال شد.'
                : 'برند غیرفعال شد.',
            'data' => $brand->fresh()->loadCount('products'),
        ]);
    }

    public function destroy(Brand $brand): JsonResponse
    {
        if ($brand->products()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'این برند دارای محصول است. ابتدا محصولات آن را جابه‌جا یا حذف کنید.',
            ], 422);
        }

        $brand->delete();

        $this->forgetStorefrontCache();

        return response()->json([
            'success' => true,
            'message' => 'برند حذف شد.',
        ]);
    }

    /**
     * بارگذاری لوگوی برند (بدون نیاز به شناسهٔ برند، تا هنگام ایجاد هم شود).
     * مسیر ذخیره‌شده در فیلد `logo` فرم قرار می‌گیرد.
     */
    public function uploadLogo(Request $request): JsonResponse
    {
        $request->validate([
            'image' => [
                'required',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:2048',
            ],
        ]);

        $path = $request->file('image')->store('brands', 'public');

        if (! $path) {
            return response()->json([
                'success' => false,
                'message' => 'بارگذاری لوگو انجام نشد.',
            ], 500);
        }

        // تبدیل به WebP (اگر افزونهٔ تصویر روی سرور فعال باشد؛ وگرنه بی‌اثر).
        $path = WebpConverter::convert($path);

        $dimensions = ImageDimensions::forPath($path);

        return response()->json([
            'success' => true,
            'message' => 'لوگوی برند بارگذاری شد.',
            'data' => [
                'path' => $path,
                'url' => Storage::disk('public')->url($path),
                'width' => $dimensions['width'] ?? null,
                'height' => $dimensions['height'] ?? null,
            ],
        ], 201);
    }

    private function forgetStorefrontCache(): void
    {
        Cache::forget(BrandController::STOREFRONT_CACHE_KEY);
    }

    private function validateBrand(
        Request $request,
        ?Brand $brand = null
    ): array {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],

            'slug' => [
                'nullable',
                'string',
                'max:255',
                Rule::unique('brands', 'slug')->ignore($brand?->id),
            ],

            'description' => ['nullable', 'string'],
            'logo' => ['nullable', 'string', 'max:2048'],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
            'meta_title' => ['nullable', 'string', 'max:255'],
            'meta_description' => ['nullable', 'string'],
        ]);
    }

    private function uniqueSlug(string $value, ?int $ignoreId = null): string
    {
        $slug = Str::slug($value);

        if ($slug === '') {
            $slug = 'brand-' . Str::lower(Str::random(8));
        }

        $baseSlug = $slug;
        $counter = 2;

        while (
            Brand::query()
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
