<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminProductValidationTest extends TestCase
{
    use RefreshDatabase;

    public function test_product_update_cannot_change_views_or_sales_count(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        Sanctum::actingAs($admin);

        $product = $this->createProduct();

        $product->update([
            'views_count' => 12,
            'sales_count' => 7,
        ]);

        $response = $this->putJson(
            '/api/v1/admin/products/' . $product->id,
            [
                'views_count' => 999999,
                'sales_count' => 999999,
            ]
        );

        $response->assertOk();

        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'views_count' => 12,
            'sales_count' => 7,
        ]);
    }

    public function test_product_list_rejects_invalid_per_page_values(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        Sanctum::actingAs($admin);

        foreach (['abc', '0', '-1'] as $perPage) {
            $response = $this->getJson(
                '/api/v1/admin/products?per_page=' . $perPage
            );

            $response->assertUnprocessable()
                ->assertJsonValidationErrors(['per_page']);
        }
    }

    private function createProduct(): Product
    {
        $now = now();

        $categoryId = DB::table('categories')->insertGetId([
            'parent_id' => null,
            'name' => 'Validation Test Category',
            'slug' => 'validation-test-category',
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
            'name' => 'Validation Test Product',
            'slug' => 'validation-test-product',
            'sku' => 'VALIDATION-TEST-SKU',
            'price' => 100000,
            'compare_price' => null,
            'discount_percent' => 0,
            'stock' => 10,
            'thumbnail' => null,
            'is_active' => true,
            'is_featured' => false,
            'is_new' => false,
            'views_count' => 12,
            'sales_count' => 7,
        ]);
    }
}
