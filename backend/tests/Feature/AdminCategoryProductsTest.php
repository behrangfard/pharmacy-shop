<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminCategoryProductsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_assign_products_to_a_category(): void
    {
        Sanctum::actingAs(
            User::factory()->create(['role' => 'admin'])
        );

        $sourceCategory = $this->createCategory();
        $targetCategory = $this->createCategory();

        $productOne = $this->createProduct($sourceCategory);
        $productTwo = $this->createProduct($sourceCategory);

        $response = $this->postJson(
            '/api/v1/admin/products/assign-category',
            [
                'category_id' => $targetCategory->id,
                'product_ids' => [$productOne->id, $productTwo->id],
            ]
        );

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.moved', 2);

        $this->assertDatabaseHas('products', [
            'id' => $productOne->id,
            'category_id' => $targetCategory->id,
        ]);

        $this->assertDatabaseHas('products', [
            'id' => $productTwo->id,
            'category_id' => $targetCategory->id,
        ]);
    }

    public function test_assign_category_skips_products_already_in_target_category(): void
    {
        Sanctum::actingAs(
            User::factory()->create(['role' => 'admin'])
        );

        $category = $this->createCategory();

        $alreadyThere = $this->createProduct($category);

        $response = $this->postJson(
            '/api/v1/admin/products/assign-category',
            [
                'category_id' => $category->id,
                'product_ids' => [$alreadyThere->id],
            ]
        );

        $response->assertOk()
            ->assertJsonPath('data.moved', 0);
    }

    public function test_assign_category_validates_payload(): void
    {
        Sanctum::actingAs(
            User::factory()->create(['role' => 'admin'])
        );

        $category = $this->createCategory();

        // دسته‌بندی ناموجود
        $this->postJson('/api/v1/admin/products/assign-category', [
            'category_id' => 999999,
            'product_ids' => [1],
        ])->assertStatus(422);

        // فهرست خالی محصولات
        $this->postJson('/api/v1/admin/products/assign-category', [
            'category_id' => $category->id,
            'product_ids' => [],
        ])->assertStatus(422);

        // شناسه‌های تکراری محصول
        $product = $this->createProduct($category);

        $this->postJson('/api/v1/admin/products/assign-category', [
            'category_id' => $category->id,
            'product_ids' => [$product->id, $product->id],
        ])->assertStatus(422);
    }

    public function test_product_list_can_include_products_of_subcategories(): void
    {
        Sanctum::actingAs(
            User::factory()->create(['role' => 'admin'])
        );

        $parent = $this->createCategory();
        $child = $this->createCategory($parent);

        $parentProduct = $this->createProduct($parent);
        $childProduct = $this->createProduct($child);

        $withChildren = $this->getJson(
            '/api/v1/admin/products?category_id='
            . $parent->id
            . '&include_children=1&per_page=100'
        );

        $withChildren->assertOk();

        $withChildrenIds = collect(
            $withChildren->json('data.data')
        )->pluck('id')->all();

        $this->assertContains($parentProduct->id, $withChildrenIds);
        $this->assertContains($childProduct->id, $withChildrenIds);

        $withoutChildren = $this->getJson(
            '/api/v1/admin/products?category_id='
            . $parent->id
            . '&per_page=100'
        );

        $withoutChildrenIds = collect(
            $withoutChildren->json('data.data')
        )->pluck('id')->all();

        $this->assertContains($parentProduct->id, $withoutChildrenIds);
        $this->assertNotContains($childProduct->id, $withoutChildrenIds);
    }

    private function createCategory(?object $parent = null)
    {
        static $counter = 0;
        $counter++;

        $now = now();

        $categoryId = DB::table('categories')->insertGetId([
            'parent_id' => $parent?->id,
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

        return (object) ['id' => $categoryId];
    }

    private function createProduct(object $category): Product
    {
        static $counter = 0;
        $counter++;

        return Product::query()->create([
            'category_id' => $category->id,
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
