<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AdminProductController extends Controller
{
    /**
     * List products for the admin panel.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Product::query()
            ->with(['category', 'brand', 'images', 'variants']);

        if ($request->filled('search')) {
            $search = trim($request->string('search')->toString());

            $query->where(function ($builder) use ($search) {
                $builder
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%");
            });
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->integer('category_id'));
        }

        if ($request->filled('brand_id')) {
            $query->where('brand_id', $request->integer('brand_id'));
        }

        if ($request->filled('status')) {
            $status = $request->string('status')->toString();

            if ($status === 'active') {
                $query->where('is_active', true);
            } elseif ($status === 'inactive') {
                $query->where('is_active', false);
            }
        }

        $validated = $request->validate([
            'per_page' => [
                'sometimes',
                'required',
                'integer',
                'min:1',
                'max:100',
            ],
        ]);

        $perPage = (int) ($validated['per_page'] ?? 15);

        $products = $query
            ->latest()
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $products,
        ]);
    }

    /**
     * Show a single product for the admin panel.
     */
    public function show(Product $product): JsonResponse
    {
        $product->load([
            'category',
            'brand',
            'images',
            'variants',
        ]);

        return response()->json([
            'success' => true,
            'data' => $product,
        ]);
    }

    /**
     * Create a product.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'category_id' => [
                'required',
                'integer',
                'exists:categories,id',
            ],
            'brand_id' => [
                'nullable',
                'integer',
                'exists:brands,id',
            ],
            'name' => [
                'required',
                'string',
                'max:255',
            ],
            'slug' => [
                'nullable',
                'string',
                'max:255',
                'unique:products,slug',
            ],
            'sku' => [
                'required',
                'string',
                'max:255',
                'unique:products,sku',
            ],
            'short_description' => [
                'nullable',
                'string',
            ],
            'description' => [
                'nullable',
                'string',
            ],
            'price' => [
                'required',
                'numeric',
                'min:0',
            ],
            'compare_price' => [
                'nullable',
                'numeric',
                'min:0',
            ],
            'discount_percent' => [
                'nullable',
                'numeric',
                'min:0',
                'max:100',
            ],
            'stock' => [
                'nullable',
                'integer',
                'min:0',
            ],
            'weight' => [
                'nullable',
                'numeric',
                'min:0',
            ],
            'thumbnail' => [
                'nullable',
                'string',
                'max:255',
            ],
            'is_active' => [
                'sometimes',
                'boolean',
            ],
            'is_featured' => [
                'sometimes',
                'boolean',
            ],
            'is_new' => [
                'sometimes',
                'boolean',
            ],
            'is_taxable' => [
                'sometimes',
                'boolean',
            ],
            'meta_title' => [
                'nullable',
                'string',
                'max:255',
            ],
            'meta_description' => [
                'nullable',
                'string',
            ],
        ]);

        $validated['slug'] = !empty($validated['slug'])
            ? $this->makeUniqueSlug($validated['slug'])
            : $this->makeUniqueSlug($validated['name']);

        $validated['discount_percent'] =
            $validated['discount_percent'] ?? 0;

        $validated['stock'] = $validated['stock'] ?? 0;
        $validated['is_active'] = $validated['is_active'] ?? true;
        $validated['is_featured'] = $validated['is_featured'] ?? false;
        $validated['is_new'] = $validated['is_new'] ?? false;
        $validated['is_taxable'] = $validated['is_taxable'] ?? false;

        $product = Product::create($validated);

        $product->load([
            'category',
            'brand',
            'images',
            'variants',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'محصول با موفقیت ایجاد شد.',
            'data' => $product,
        ], 201);
    }

    /**
     * Update a product.
     */
    public function update(
        Request $request,
        Product $product
    ): JsonResponse {
        $validated = $request->validate([
            'category_id' => [
                'sometimes',
                'required',
                'integer',
                'exists:categories,id',
            ],
            'brand_id' => [
                'sometimes',
                'nullable',
                'integer',
                'exists:brands,id',
            ],
            'name' => [
                'sometimes',
                'required',
                'string',
                'max:255',
            ],
            'slug' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                Rule::unique('products', 'slug')->ignore($product->id),
            ],
            'sku' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                Rule::unique('products', 'sku')->ignore($product->id),
            ],
            'short_description' => [
                'sometimes',
                'nullable',
                'string',
            ],
            'description' => [
                'sometimes',
                'nullable',
                'string',
            ],
            'price' => [
                'sometimes',
                'required',
                'numeric',
                'min:0',
            ],
            'compare_price' => [
                'sometimes',
                'nullable',
                'numeric',
                'min:0',
            ],
            'discount_percent' => [
                'sometimes',
                'numeric',
                'min:0',
                'max:100',
            ],
            'stock' => [
                'sometimes',
                'integer',
                'min:0',
            ],
            'weight' => [
                'sometimes',
                'nullable',
                'numeric',
                'min:0',
            ],
            'thumbnail' => [
                'sometimes',
                'nullable',
                'string',
                'max:255',
            ],
            'is_active' => [
                'sometimes',
                'boolean',
            ],
            'is_featured' => [
                'sometimes',
                'boolean',
            ],
            'is_new' => [
                'sometimes',
                'boolean',
            ],
            'is_taxable' => [
                'sometimes',
                'boolean',
            ],
            'meta_title' => [
                'sometimes',
                'nullable',
                'string',
                'max:255',
            ],
            'meta_description' => [
                'sometimes',
                'nullable',
                'string',
            ],
        ]);

        if (
            array_key_exists('slug', $validated)
            && $validated['slug'] !== $product->slug
        ) {
            $validated['slug'] = $this->makeUniqueSlug(
                $validated['slug'],
                $product->id
            );
        }

        $product->update($validated);

        $product->load([
            'category',
            'brand',
            'images',
            'variants',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'محصول با موفقیت به‌روزرسانی شد.',
            'data' => $product,
        ]);
    }

    /**
     * Update product active status.
     */
    public function updateStatus(
        Request $request,
        Product $product
    ): JsonResponse {
        $validated = $request->validate([
            'is_active' => [
                'required',
                'boolean',
            ],
        ]);

        $product->update([
            'is_active' => $validated['is_active'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'وضعیت محصول با موفقیت به‌روزرسانی شد.',
            'data' => $product->fresh(),
        ]);
    }

    /**
     * Delete a product without damaging order history.
     */
    public function destroy(Product $product): JsonResponse
    {
        // Preserve products referenced by order history.
        if (
            Schema::hasTable('order_items')
            && Schema::hasColumn('order_items', 'product_id')
            && DB::table('order_items')
                ->where('product_id', $product->id)
                ->exists()
        ) {
            return response()->json([
                'success' => false,
                'message' => 'این محصول سابقه سفارش دارد؛ برای حفظ سوابق، آن را غیرفعال کنید.',
            ], 409);
        }

        // Collect image paths belonging to this product only.
        $imagePaths = $product->images()
            ->pluck('path')
            ->filter(
                fn ($path) => is_string($path) && trim($path) !== ''
            )
            ->unique()
            ->values()
            ->all();

        // Delete database records atomically.
        DB::transaction(function () use ($product) {
            $product->images()->delete();
            $product->variants()->delete();
            $product->delete();
        });

        // Delete physical files only after the database transaction succeeds.
        if ($imagePaths !== []) {
            Storage::disk('public')->delete($imagePaths);
        }

        return response()->json([
            'success' => true,
            'message' => 'محصول با موفقیت حذف شد.',
        ]);
    }

    /**
     * Generate a unique slug, including for non-Latin product names.
     */
    private function makeUniqueSlug(
        string $value,
        ?int $ignoreProductId = null
    ): string {
        $baseSlug = Str::slug($value);

        if ($baseSlug === '') {
            $baseSlug = 'product-' . Str::lower(Str::random(8));
        }

        $slug = $baseSlug;
        $counter = 2;

        while (
            Product::query()
                ->where('slug', $slug)
                ->when(
                    $ignoreProductId !== null,
                    fn ($query) => $query->where(
                        'id',
                        '!=',
                        $ignoreProductId
                    )
                )
                ->exists()
        ) {
            $slug = $baseSlug . '-' . $counter;
            $counter++;
        }

        return $slug;
    }
}
