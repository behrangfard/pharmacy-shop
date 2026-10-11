<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\ProductImage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminProductDeleteTest extends TestCase
{
    use RefreshDatabase;

    public function test_product_with_order_history_cannot_be_deleted(): void
    {
        Storage::fake('public');

        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        Sanctum::actingAs($admin);

        $product = $this->createProduct();

        $imagePath = 'product-images/' . $product->id . '/history.webp';

        Storage::disk('public')->put($imagePath, 'test image');

        ProductImage::query()->create([
            'product_id' => $product->id,
            'path' => $imagePath,
            'alt' => 'Test image',
            'sort_order' => 0,
            'is_primary' => true,
        ]);

        $orderId = DB::table('orders')->insertGetId([
            'user_id' => $admin->id,
            'order_number' => 'ORD-DELETE-TEST-001',
            'subtotal' => 100000,
            'shipping_cost' => 0,
            'discount' => 0,
            'total' => 100000,
            'status' => 'pending',
            'payment_status' => 'paid',
            'recipient_name' => 'Test User',
            'phone' => '09120000000',
            'address' => 'Test address',
            'postal_code' => null,
            'notes' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('order_items')->insert([
            'order_id' => $orderId,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'sku' => $product->sku,
            'quantity' => 1,
            'unit_price' => 100000,
            'total_price' => 100000,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $response = $this->deleteJson(
            '/api/v1/admin/products/' . $product->id
        );

        $response->assertStatus(409)
            ->assertJsonPath('success', false);

        $this->assertDatabaseHas('products', [
            'id' => $product->id,
        ]);

        $this->assertDatabaseHas('product_images', [
            'product_id' => $product->id,
            'path' => $imagePath,
        ]);

        Storage::disk('public')->assertExists($imagePath);
    }

    public function test_product_without_order_history_is_deleted_with_its_image_files(): void
    {
        Storage::fake('public');

        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        Sanctum::actingAs($admin);

        $product = $this->createProduct();

        $imagePaths = [
            'product-images/' . $product->id . '/front.webp',
            'product-images/' . $product->id . '/back.webp',
        ];

        foreach ($imagePaths as $index => $imagePath) {
            Storage::disk('public')->put(
                $imagePath,
                'test image ' . $index
            );

            ProductImage::query()->create([
                'product_id' => $product->id,
                'path' => $imagePath,
                'alt' => 'Test image ' . $index,
                'sort_order' => $index,
                'is_primary' => $index === 0,
            ]);
        }

        $response = $this->deleteJson(
            '/api/v1/admin/products/' . $product->id
        );

        $response->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('products', [
            'id' => $product->id,
        ]);

        $this->assertDatabaseMissing('product_images', [
            'product_id' => $product->id,
        ]);

        foreach ($imagePaths as $imagePath) {
            Storage::disk('public')->assertMissing($imagePath);
        }
    }

    public function test_deleting_product_does_not_delete_another_products_images(): void
    {
        Storage::fake('public');

        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        Sanctum::actingAs($admin);

        $productToDelete = $this->createProduct();
        $productToKeep = $this->createProduct();

        $deletedProductImage = 'product-images/'
            . $productToDelete->id
            . '/delete.webp';

        $retainedProductImage = 'product-images/'
            . $productToKeep->id
            . '/keep.webp';

        Storage::disk('public')->put(
            $deletedProductImage,
            'image to delete'
        );

        Storage::disk('public')->put(
            $retainedProductImage,
            'image to keep'
        );

        ProductImage::query()->create([
            'product_id' => $productToDelete->id,
            'path' => $deletedProductImage,
            'alt' => 'Delete this image',
            'sort_order' => 0,
            'is_primary' => true,
        ]);

        ProductImage::query()->create([
            'product_id' => $productToKeep->id,
            'path' => $retainedProductImage,
            'alt' => 'Keep this image',
            'sort_order' => 0,
            'is_primary' => true,
        ]);

        $response = $this->deleteJson(
            '/api/v1/admin/products/' . $productToDelete->id
        );

        $response->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('products', [
            'id' => $productToDelete->id,
        ]);

        $this->assertDatabaseHas('products', [
            'id' => $productToKeep->id,
        ]);

        Storage::disk('public')->assertMissing($deletedProductImage);
        Storage::disk('public')->assertExists($retainedProductImage);
    }

    private function createProduct(): Product
    {
        static $counter = 0;
        $counter++;

        $now = now();

        $categoryId = DB::table('categories')->insertGetId([
            'parent_id' => null,
            'name' => 'Test Category ' . $counter,
            'slug' => 'test-category-' . $counter,
            'description' => null,
            'image' => null,
            'is_active' => true,
            'sort_order' => 0,
            'meta_title' => null,
            'meta_description' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return Product::query()->create([
            'category_id' => $categoryId,
            'brand_id' => null,
            'name' => 'Test Product ' . $counter,
            'slug' => 'test-product-' . $counter,
            'sku' => 'TEST-SKU-' . $counter,
            'price' => 100000,
            'compare_price' => null,
            'discount_percent' => 0,
            'stock' => 10,
            'thumbnail' => null,
            'is_active' => true,
            'is_featured' => false,
            'is_new' => false,
        ]);
    }
}
