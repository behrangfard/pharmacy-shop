<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AdminProductController extends Controller
{
    /**
     * List products.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Product::query()
            ->with(['category', 'brand', 'images']);

        if ($request->filled('search')) {
            $search = trim($request->string('search')->toString());

            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
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

        $validated = $request->validate([
            'status' => [
                'nullable',
                'string',
                Rule::in(['active', 'inactive']),
            ],
            'per_page' => [
                'sometimes',
                'required',
                'integer',
                'min:1',
                'max:100',
            ],
        ]);

        $status = $validated['status'] ?? null;

        if ($status === 'active') {
            $query->where('is_active', true);
        } elseif ($status === 'inactive') {
            $query->where('is_active', false);
        }

        /*
         * مقدار نامعتبر per_page نباید بی‌صدا اصلاح شود؛
         * پاسخ 422 به کلاینت نشان می‌دهد درخواست اشتباه است.
         */
        $perPage = (int) ($validated['per_page'] ?? 15);

        $products = $query->latest()->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $products,
        ]);
    }

    /**
     * Show one product with all variants, including inactive variants.
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
     * Create a product and its variants.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate($this->productRules());

        $variants = $validated['variants'] ?? [];
        unset($validated['variants']);

        // موجودی اختیاری است؛ پیش‌فرض ستون دیتابیس صفر است.
        $validated['stock'] = $validated['stock'] ?? 0;

        $slugInput = trim((string) ($validated['slug'] ?? ''));

        $validated['slug'] = $this->makeUniqueSlug(
            $slugInput !== '' ? $slugInput : $validated['name']
        );

        $product = DB::transaction(function () use ($validated, $variants) {
            $product = Product::create($validated);

            if ($variants !== []) {
                $this->syncVariants($product, $variants);
            }

            return $product;
        });

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
     * Update a product and synchronize variants when the variants key exists.
     */
    public function update(Request $request, Product $product): JsonResponse
    {
        $validated = $request->validate($this->productRules($product));

        $hasVariants = array_key_exists('variants', $validated);
        $variants = $validated['variants'] ?? [];

        unset($validated['variants']);

        if (array_key_exists('slug', $validated)) {
            $slugInput = trim((string) ($validated['slug'] ?? ''));

            if ($slugInput === '') {
                $slugInput = $validated['name'] ?? $product->name;
            }

            $validated['slug'] = $this->makeUniqueSlug(
                $slugInput,
                $product->id
            );
        }

        DB::transaction(function () use (
            $product,
            $validated,
            $variants,
            $hasVariants
        ) {
            $lockedProduct = Product::query()
                ->whereKey($product->id)
                ->lockForUpdate()
                ->firstOrFail();

            $lockedProduct->update($validated);

            if ($hasVariants) {
                $this->syncVariants($lockedProduct, $variants);
            }
        });

        $product->refresh()->load([
            'category',
            'brand',
            'images',
            'variants',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'محصول با موفقیت ویرایش شد.',
            'data' => $product,
        ]);
    }

    /**
     * Update product active status.
     */
    public function updateStatus(Request $request, Product $product): JsonResponse
    {
        $validated = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $product->update([
            'is_active' => $validated['is_active'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'وضعیت محصول به‌روزرسانی شد.',
            'data' => $product->fresh(),
        ]);
    }

    /**
     * Delete a product only when it has never been used in an order.
     */
    public function destroy(Product $product): JsonResponse
    {
        $hasOrders = DB::table('order_items')
            ->where('product_id', $product->id)
            ->exists();

        if ($hasOrders) {
            return response()->json([
                'success' => false,
                'message' => 'این محصول در سفارش‌ها استفاده شده و امکان حذف آن وجود ندارد.',
            ], 409);
        }

        $imagePaths = [];

        foreach ($product->images as $image) {
            if (! empty($image->path)) {
                $imagePaths[] = $image->path;
            }
        }

        if (! empty($product->thumbnail)) {
            $imagePaths[] = $product->thumbnail;
        }

        DB::transaction(function () use ($product) {
            $product->images()->delete();
            $product->variants()->delete();
            $product->delete();
        });

        foreach (array_unique($imagePaths) as $path) {
            $cleanPath = ltrim(str_replace('storage/', '', $path), '/');

            if (Storage::disk('public')->exists($cleanPath)) {
                Storage::disk('public')->delete($cleanPath);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'محصول با موفقیت حذف شد.',
        ]);
    }

    /**
     * Product validation rules.
     */
    private function productRules(?Product $product = null): array
    {
        $isUpdate = $product !== null;

        /*
         * هنگام ویرایش، فیلدهای اصلی اختیاری‌اند تا ویرایش جزئی
         * (مثلاً فقط تغییر وضعیت مالیات) ممکن باشد. اگر فیلدی
         * ارسال شود، همچنان نمی‌تواند خالی باشد.
         */
        $presence = $isUpdate
            ? ['sometimes', 'required']
            : ['required'];

        return [
            'category_id' => [
                ...$presence,
                'integer',
                'exists:categories,id',
            ],

            'brand_id' => [
                'nullable',
                'integer',
                'exists:brands,id',
            ],

            'name' => [
                ...$presence,
                'string',
                'max:255',
            ],

            'slug' => [
                'sometimes',
                'nullable',
                'string',
                'max:255',
            ],

            'sku' => [
                ...$presence,
                'string',
                'max:255',
                Rule::unique('products', 'sku')->ignore($product?->id),
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
                ...$presence,
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
                'sometimes',
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

            'variants' => [
                'sometimes',
                'array',
            ],

            'variants.*.id' => [
                'nullable',
                'integer',
                'distinct',
                'exists:product_variants,id',
            ],

            'variants.*.name' => [
                'required',
                'string',
                'max:255',
            ],

            'variants.*.sku' => [
                'required',
                'string',
                'max:255',
            ],

            'variants.*.price' => [
                'nullable',
                'numeric',
                'min:0',
            ],

            'variants.*.compare_price' => [
                'nullable',
                'numeric',
                'min:0',
            ],

            'variants.*.stock' => [
                'required',
                'integer',
                'min:0',
            ],

            'variants.*.image' => [
                'nullable',
                'string',
                'max:255',
            ],

            'variants.*.is_active' => [
                'sometimes',
                'boolean',
            ],
        ];
    }

    /**
     * Create or update variants without physically deleting omitted records.
     */
    private function syncVariants(Product $product, array $variants): void
    {
        $usedSkus = [];
        $submittedIds = [];

        foreach ($variants as $index => $variantData) {
            $variantId = $variantData['id'] ?? null;
            $variant = null;

            if ($variantId !== null) {
                $variant = $product->variants()
                    ->whereKey($variantId)
                    ->lockForUpdate()
                    ->first();

                if (! $variant) {
                    throw ValidationException::withMessages([
                        "variants.$index.id" => [
                            'این تنوع متعلق به محصول انتخاب‌شده نیست.',
                        ],
                    ]);
                }

                $submittedIds[] = (int) $variant->id;
            }

            $name = trim((string) ($variantData['name'] ?? ''));
            $sku = trim((string) ($variantData['sku'] ?? ''));

            if ($name === '') {
                throw ValidationException::withMessages([
                    "variants.$index.name" => [
                        'نام تنوع الزامی است.',
                    ],
                ]);
            }

            if ($sku === '') {
                throw ValidationException::withMessages([
                    "variants.$index.sku" => [
                        'کد SKU تنوع الزامی است.',
                    ],
                ]);
            }

            if (in_array($sku, $usedSkus, true)) {
                throw ValidationException::withMessages([
                    "variants.$index.sku" => [
                        'کد SKU تنوع‌ها نباید تکراری باشد.',
                    ],
                ]);
            }

            $usedSkus[] = $sku;

            $skuQuery = ProductVariant::query()->where('sku', $sku);

            if ($variant) {
                $skuQuery->whereKeyNot($variant->id);
            }

            if ($skuQuery->exists()) {
                throw ValidationException::withMessages([
                    "variants.$index.sku" => [
                        'این کد SKU قبلاً برای یک تنوع دیگر استفاده شده است.',
                    ],
                ]);
            }

            $data = [
                'name' => $name,
                'sku' => $sku,
                'price' => $variantData['price'] ?? null,
                'compare_price' => $variantData['compare_price'] ?? null,
                'stock' => (int) $variantData['stock'],
                'image' => $variantData['image'] ?? null,
                'is_active' => (bool) ($variantData['is_active'] ?? true),
            ];

            if ($variant) {
                $variant->update($data);
                $savedVariantId = (int) $variant->id;
            } else {
                $createdVariant = $product->variants()->create($data);
                $savedVariantId = (int) $createdVariant->id;
            }

            // Critical: include newly created IDs too, otherwise the cleanup
            // query below would immediately deactivate the variants just added.
            $submittedIds[] = $savedVariantId;
        }

        // Omitted variants are deactivated, never deleted.
        $deactivateQuery = $product->variants();

        if ($submittedIds !== []) {
            $deactivateQuery->whereNotIn('id', array_unique($submittedIds));
        }

        $deactivateQuery->update([
            'is_active' => false,
        ]);
    }

    /**
     * Generate a unique slug.
     */
    private function makeUniqueSlug(string $value, ?int $ignoreId = null): string
    {
        $slug = Str::slug($value);

        if ($slug === '') {
            $slug = 'product';
        }

        $originalSlug = $slug;
        $counter = 1;

        while (
            Product::query()
                ->where('slug', $slug)
                ->when(
                    $ignoreId,
                    fn ($query) => $query->where('id', '!=', $ignoreId)
                )
                ->exists()
        ) {
            $slug = $originalSlug.'-'.$counter;
            $counter++;
        }

        return $slug;
    }
}
