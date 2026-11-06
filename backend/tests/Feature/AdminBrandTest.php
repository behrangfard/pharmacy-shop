<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\BrandController;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminBrandTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        Sanctum::actingAs($admin);

        return $admin;
    }

    private function createProduct(Brand $brand): Product
    {
        $category = Category::query()->create([
            'name' => 'Brand Test Category',
            'slug' => 'brand-test-category',
            'is_active' => true,
            'sort_order' => 0,
        ]);

        return Product::query()->create([
            'category_id' => $category->id,
            'brand_id' => $brand->id,
            'name' => 'Brand Test Product',
            'slug' => 'brand-test-product',
            'sku' => 'BRAND-TEST-001',
            'price' => 100000,
            'stock' => 5,
            'is_active' => true,
        ]);
    }

    public function test_admin_can_create_brand_with_generated_slug(): void
    {
        $this->admin();

        $this->postJson('/api/v1/admin/brands', [
            'name' => 'Test Brand',
            'is_active' => true,
            'sort_order' => 1,
        ])
            ->assertCreated()
            ->assertJsonPath('data.slug', 'test-brand');

        $this->assertDatabaseHas('brands', [
            'name' => 'Test Brand',
            'slug' => 'test-brand',
        ]);
    }

    public function test_duplicate_brand_slug_is_made_unique(): void
    {
        $this->admin();

        Brand::query()->create([
            'name' => 'Test Brand',
            'slug' => 'test-brand',
            'is_active' => true,
        ]);

        $this->postJson('/api/v1/admin/brands', [
            'name' => 'Test Brand',
            'is_active' => true,
        ])
            ->assertCreated()
            ->assertJsonPath('data.slug', 'test-brand-2');
    }

    public function test_admin_can_update_brand_and_toggle_status(): void
    {
        $this->admin();

        $brand = Brand::query()->create([
            'name' => 'Old Brand',
            'slug' => 'old-brand',
            'is_active' => true,
        ]);

        $this->putJson("/api/v1/admin/brands/{$brand->id}", [
            'name' => 'New Brand',
            'is_active' => true,
            'sort_order' => 3,
        ])
            ->assertOk()
            ->assertJsonPath('data.name', 'New Brand')
            ->assertJsonPath('data.slug', 'new-brand');

        $this->patchJson("/api/v1/admin/brands/{$brand->id}/status", [
            'is_active' => false,
        ])
            ->assertOk()
            ->assertJsonPath('data.is_active', false);
    }

    public function test_brand_with_products_cannot_be_deleted(): void
    {
        $this->admin();

        $brand = Brand::query()->create([
            'name' => 'Brand With Product',
            'slug' => 'brand-with-product',
            'is_active' => true,
        ]);

        $this->createProduct($brand);

        $this->deleteJson("/api/v1/admin/brands/{$brand->id}")
            ->assertStatus(422)
            ->assertJsonPath('success', false);

        $this->assertDatabaseHas('brands', ['id' => $brand->id]);
    }

    public function test_empty_brand_can_be_deleted(): void
    {
        $this->admin();

        $brand = Brand::query()->create([
            'name' => 'Empty Brand',
            'slug' => 'empty-brand',
            'is_active' => true,
        ]);

        $this->deleteJson("/api/v1/admin/brands/{$brand->id}")
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('brands', ['id' => $brand->id]);
    }

    public function test_public_brands_only_include_active_brands_and_cache_is_cleared(): void
    {
        $this->admin();

        Brand::query()->create([
            'name' => 'Active Brand',
            'slug' => 'active-brand',
            'is_active' => true,
        ]);

        Brand::query()->create([
            'name' => 'Hidden Brand',
            'slug' => 'hidden-brand',
            'is_active' => false,
        ]);

        $this->getJson('/api/v1/brands')
            ->assertOk()
            ->assertJsonFragment(['slug' => 'active-brand'])
            ->assertJsonMissing(['slug' => 'hidden-brand']);

        // پس از ایجاد برند جدید، کش فروشگاه باید پاک شود.
        $this->postJson('/api/v1/admin/brands', [
            'name' => 'New Public Brand',
            'is_active' => true,
        ])->assertCreated();

        $this->getJson('/api/v1/brands')
            ->assertOk()
            ->assertJsonFragment(['slug' => 'new-public-brand']);
    }

    public function test_public_brands_stay_an_array_when_served_from_cache(): void
    {
        Brand::query()->create([
            'name' => 'Cached Brand',
            'slug' => 'cached-brand',
            'is_active' => true,
        ]);

        $this->getJson('/api/v1/brands')
            ->assertOk()
            ->assertJsonPath('data.0.slug', 'cached-brand')
            ->assertJsonPath('data.0.products_count', 0);

        // کش باید آرایه باشد؛ ذخیرهٔ Collection مدل در درایور database/file
        // پاسخ JSON را از آرایه به شیء تبدیل می‌کرد و برندها ناپدید می‌شدند.
        $this->assertIsArray(Cache::get(BrandController::STOREFRONT_CACHE_KEY));

        $this->getJson('/api/v1/brands')
            ->assertOk()
            ->assertJsonPath('data.0.slug', 'cached-brand');
    }
}
