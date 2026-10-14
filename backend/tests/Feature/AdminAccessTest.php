<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\ProductImage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminAccessTest extends TestCase
{
    use RefreshDatabase;

    private function adminEndpoints(
        int $productId,
        int $imageId = 999999
    ): array {
        return [
            ['GET', '/api/v1/admin/dashboard'],
            ['GET', '/api/v1/admin/orders'],
            ['GET', '/api/v1/admin/orders/ORD-ACCESS-TEST-001'],
            ['PATCH', '/api/v1/admin/orders/ORD-ACCESS-TEST-001/status'],

            ['GET', '/api/v1/admin/products'],
            ['POST', '/api/v1/admin/products'],
            ['GET', "/api/v1/admin/products/{$productId}"],
            ['PUT', "/api/v1/admin/products/{$productId}"],
            ['DELETE', "/api/v1/admin/products/{$productId}"],
            ['PATCH', "/api/v1/admin/products/{$productId}/status"],

            ['POST', "/api/v1/admin/products/{$productId}/images"],
            ['PATCH', "/api/v1/admin/products/{$productId}/images/reorder"],
            ['DELETE', "/api/v1/admin/products/{$productId}/images/{$imageId}"],
            ['PATCH', "/api/v1/admin/products/{$productId}/images/{$imageId}/primary"],
        ];
    }

    public function test_regular_user_cannot_access_any_admin_endpoint(): void
    {
        $user = User::factory()->create([
            'role' => 'customer',
        ]);

        $now = now();

        $categoryId = DB::table('categories')->insertGetId([
            'parent_id' => null,
            'name' => 'Access Test Category',
            'slug' => 'access-test-category',
            'description' => null,
            'image' => null,
            'is_active' => true,
            'sort_order' => 0,
            'meta_title' => null,
            'meta_description' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $product = Product::query()->create([
            'category_id' => $categoryId,
            'brand_id' => null,
            'name' => 'Access Test Product',
            'slug' => 'access-test-product',
            'sku' => 'ACCESS-TEST-SKU',
            'price' => 100000,
            'compare_price' => null,
            'discount_percent' => 0,
            'stock' => 10,
            'thumbnail' => null,
            'is_active' => true,
            'is_featured' => false,
            'is_new' => false,
        ]);

        $image = ProductImage::query()->create([
            'product_id' => $product->id,
            'path' => 'product-images/' . $product->id . '/access-test.webp',
            'alt' => 'Access test image',
            'sort_order' => 0,
            'is_primary' => true,
        ]);

        Sanctum::actingAs($user);

        foreach ($this->adminEndpoints($product->id, $image->id) as [$method, $uri]) {
            $response = $this->json($method, $uri);

            $this->assertSame(
                403,
                $response->status(),
                "Failed endpoint: {$method} {$uri}"
            );
        }
    }

    public function test_guest_cannot_access_any_admin_endpoint(): void
    {
        foreach ($this->adminEndpoints(999999) as [$method, $uri]) {
            $response = $this->json($method, $uri);

            $this->assertSame(
                401,
                $response->status(),
                "Failed endpoint: {$method} {$uri}"
            );
        }
    }
}
