<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Throwable;

class AdminProductImageController extends Controller
{
    /**
     * Upload multiple images for a product.
     */
    public function store(Request $request, Product $product): JsonResponse
    {
        $validated = $request->validate([
            'images' => ['required', 'array', 'min:1', 'max:10'],
            'images.*' => [
                'required',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:5120',
            ],
            'alts' => ['sometimes', 'array'],
            'alts.*' => ['nullable', 'string', 'max:255'],
        ]);

        $files = $request->file('images', []);
        $storedPaths = [];

        try {
            $createdImages = DB::transaction(function () use (
                $product,
                $files,
                $validated,
                &$storedPaths
            ) {
                $hasPrimary = $product->images()
                    ->where('is_primary', true)
                    ->exists();

                $maxSortOrder = (int) $product->images()
                    ->max('sort_order');

                $created = [];

                foreach ($files as $index => $file) {
                    $path = $file->store(
                        'product-images/' . $product->id,
                        'public'
                    );

                    if (!$path) {
                        throw new \RuntimeException(
                            'Image file could not be stored.'
                        );
                    }

                    $storedPaths[] = $path;

                    $isPrimary = !$hasPrimary && $index === 0;

                    $image = $product->images()->create([
                        'path' => $path,
                        'alt' => $validated['alts'][$index] ?? null,
                        'sort_order' => $maxSortOrder + $index + 1,
                        'is_primary' => $isPrimary,
                    ]);

                    if ($isPrimary) {
                        $product->update([
                            'thumbnail' => $path,
                        ]);

                        $hasPrimary = true;
                    }

                    $created[] = $image;
                }

                return $created;
            });
        } catch (Throwable $exception) {
            foreach ($storedPaths as $path) {
                Storage::disk('public')->delete($path);
            }

            throw $exception;
        }

        return response()->json([
            'success' => true,
            'message' => 'تصاویر محصول با موفقیت بارگذاری شدند.',
            'data' => $createdImages,
        ], 201);
    }

    /**
     * Set an image as the primary image of its product.
     */
    public function setPrimary(
        Product $product,
        ProductImage $productImage
    ): JsonResponse {
        $this->ensureImageBelongsToProduct($product, $productImage);

        DB::transaction(function () use ($product, $productImage) {
            $product->images()->update([
                'is_primary' => false,
            ]);

            $productImage->update([
                'is_primary' => true,
            ]);

            $product->update([
                'thumbnail' => $productImage->path,
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => 'تصویر اصلی محصول تغییر کرد.',
            'data' => $productImage->fresh(),
        ]);
    }

    /**
     * Update image display order.
     */
    public function reorder(
        Request $request,
        Product $product
    ): JsonResponse {
        $validated = $request->validate([
            'images' => ['required', 'array', 'min:1'],
            'images.*.id' => ['required', 'integer', 'distinct'],
            'images.*.sort_order' => ['required', 'integer', 'min:0'],
        ]);

        $items = collect($validated['images']);
        $imageIds = $items->pluck('id');

        $existingIds = $product->images()
            ->whereIn('id', $imageIds)
            ->pluck('id');

        if ($existingIds->count() !== $imageIds->count()) {
            throw ValidationException::withMessages([
                'images' => [
                    'یک یا چند تصویر به این محصول تعلق ندارند.',
                ],
            ]);
        }

        DB::transaction(function () use ($product, $items) {
            foreach ($items as $item) {
                $product->images()
                    ->where('id', $item['id'])
                    ->update([
                        'sort_order' => $item['sort_order'],
                    ]);
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'ترتیب تصاویر ذخیره شد.',
            'data' => $product->images()
                ->orderBy('sort_order')
                ->get(),
        ]);
    }

    /**
     * Delete an image from a product.
     */
    public function destroy(
        Product $product,
        ProductImage $productImage
    ): JsonResponse {
        $this->ensureImageBelongsToProduct($product, $productImage);

        $wasPrimary = $productImage->is_primary;
        $path = $productImage->path;

        DB::transaction(function () use ($productImage) {
            $productImage->delete();
        });

        Storage::disk('public')->delete($path);

        if ($wasPrimary) {
            $nextImage = $product->images()
                ->orderBy('sort_order')
                ->orderBy('id')
                ->first();

            DB::transaction(function () use ($product, $nextImage) {
                $product->update([
                    'thumbnail' => $nextImage?->path,
                ]);

                if ($nextImage) {
                    $nextImage->update([
                        'is_primary' => true,
                    ]);
                }
            });
        }

        return response()->json([
            'success' => true,
            'message' => 'تصویر محصول حذف شد.',
        ]);
    }

    /**
     * Prevent changing or deleting another product's image.
     */
    private function ensureImageBelongsToProduct(
        Product $product,
        ProductImage $productImage
    ): void {
        abort_unless(
            (int) $productImage->product_id === (int) $product->id,
            404,
            'تصویر موردنظر برای این محصول نیست.'
        );
    }
}