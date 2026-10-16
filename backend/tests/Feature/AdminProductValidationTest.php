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

    public function test_product_update_saves_valid_changes(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        Sanctum::actingAs($admin);

        $product = $this->createProduct();

        $response = $this->putJson(
            '/api/v1/admin/products/' . $product->id,
            [
                'name' => 'Updated Validation Product',
                'price' => 150000,
                'views_count' => 999999,
                'sales_count' => 999999,
            ]
        );

        $response->assertOk();

        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'name' => 'Updated Validation Product',
            'price' => 150000,
            'views_count' => 12,
            'sales_count' => 7,
        ]);
    }

    public function test_product_update_can_enable_taxable_status(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        Sanctum::actingAs($admin);

        $product = $this->createProduct();

        $response = $this->putJson(
            '/api/v1/admin/products/' . $product->id,
            [
                'is_taxable' => true,
            ]
        );

        $response->assertOk();

        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'is_taxable' => true,
        ]);
    }

    public function test_product_update_can_disable_taxable_status(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        Sanctum::actingAs($admin);

        $product = $this->createProduct();

        $product->update([
            'is_taxable' => true,
        ]);

        $response = $this->putJson(
            '/api/v1/admin/products/' . $product->id,
            [
                'is_taxable' => false,
            ]
        );

        $response->assertOk();

        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'is_taxable' => false,
        ]);
       }

    public function test_product_creation_saves_taxable_status_when_enabled(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        Sanctum::actingAs($admin);

        $category = $this->createProduct()->category;

        $response = $this->postJson('/api/v1/admin/products', [
            'category_id' => $category->id,
            'name' => 'Taxable Creation Test Product',
            'sku' => 'TAXABLE-CREATION-TEST-SKU',
            'price' => 100000,
            'is_taxable' => true,
        ]);

        $response->assertCreated();

        $this->assertDatabaseHas('products', [
            'sku' => 'TAXABLE-CREATION-TEST-SKU',
            'is_taxable' => true,
        ]);
    }

    public function test_product_creation_defaults_taxable_status_to_false(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        Sanctum::actingAs($admin);

        $category = $this->createProduct()->category;

        $response = $this->postJson('/api/v1/admin/products', [
            'category_id' => $category->id,
            'name' => 'Non Taxable Creation Test Product',
            'sku' => 'NON-TAXABLE-CREATION-TEST-SKU',
            'price' => 100000,
        ]);

        $response->assertCreated();

        $this->assertDatabaseHas('products', [
            'sku' => 'NON-TAXABLE-CREATION-TEST-SKU',
            'is_taxable' => false,
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
            'is_taxable' => false,
            'views_count' => 12,
            'sales_count' => 7,
        ]);
    }
}
