<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminAccessTest extends TestCase
{
    use RefreshDatabase;

    private function createTestRecords(): array
    {
        $now = now();

        $categoryId = DB::table('categories')->insertGetId([
            'name' => 'Access Test Category',
            'slug' => 'access-test-category',
            'is_active' => true,
            'sort_order' => 0,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $productId = DB::table('products')->insertGetId([
            'category_id' => $categoryId,
            'name' => 'Access Test Product',
            'slug' => 'access-test-product',
            'sku' => 'ACCESS-TEST-001',
            'price' => 100000,
            'stock' => 10,
            'is_active' => true,
            'is_featured' => false,
            'is_new' => false,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $imageId = DB::table('product_images')->insertGetId([
            'product_id' => $productId,
            'path' => 'products/access-test.jpg',
            'alt' => 'Access test image',
            'sort_order' => 0,
            'is_primary' => true,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return [
            'product_id' => $productId,
            'image_id' => $imageId,
        ];
    }

    private function adminEndpoints(array $records): array
    {
        $productId = $records['product_id'];
        $imageId = $records['image_id'];

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

            ['GET', '/api/v1/admin/admins'],
            ['POST', '/api/v1/admin/admins'],
            ['PUT', '/api/v1/admin/admins/1'],
            ['DELETE', '/api/v1/admin/admins/1'],
        ];
    }

    private function createCustomer(): User
    {
        return new User([
            'name' => 'Access Test Customer',
            'email' => 'access-test-customer@example.com',
            'password' => 'password',
            'role' => 'customer',
        ]);
    }

    public function test_regular_user_cannot_access_any_admin_endpoint(): void
    {
        $records = $this->createTestRecords();

        Sanctum::actingAs($this->createCustomer());

        foreach ($this->adminEndpoints($records) as [$method, $uri]) {
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
        $records = $this->createTestRecords();

        foreach ($this->adminEndpoints($records) as [$method, $uri]) {
            $response = $this->json($method, $uri);

            $this->assertSame(
                401,
                $response->status(),
                "Failed endpoint: {$method} {$uri}"
            );
        }
    }
}
