<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\CategoryController;
use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminCategoryTest extends TestCase
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

    private function createCategory(array $attributes = []): Category
    {
        static $counter = 0;
        $counter++;

        return Category::query()->create(array_merge([
            'name' => "Test Category {$counter}",
            'slug' => "test-category-{$counter}",
            'is_active' => true,
            'sort_order' => 0,
        ], $attributes));
    }

    public function test_admin_can_list_categories(): void
    {
        $this->admin();

        $category = $this->createCategory([
            'name' => 'Women',
            'slug' => 'women',
        ]);

        $this->getJson('/api/v1/admin/categories')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonFragment([
                'id' => $category->id,
                'slug' => 'women',
            ]);
    }

    public function test_admin_can_create_category_with_generated_slug(): void
    {
        $this->admin();

        $this->postJson('/api/v1/admin/categories', [
            'name' => 'Sports Wear',
            'is_active' => true,
            'sort_order' => 0,
        ])
            ->assertCreated()
            ->assertJsonPath('data.slug', 'sports-wear');

        $this->assertDatabaseHas('categories', [
            'name' => 'Sports Wear',
            'slug' => 'sports-wear',
        ]);
    }

    public function test_admin_can_update_category(): void
    {
        $this->admin();

        $category = $this->createCategory([
            'name' => 'Old Name',
            'slug' => 'old-name',
        ]);

        $this->putJson("/api/v1/admin/categories/{$category->id}", [
            'name' => 'New Name',
            'is_active' => true,
            'sort_order' => 1,
        ])
            ->assertOk()
            ->assertJsonPath('data.name', 'New Name')
            ->assertJsonPath('data.slug', 'new-name');

        $this->assertDatabaseHas('categories', [
            'id' => $category->id,
            'name' => 'New Name',
            'slug' => 'new-name',
        ]);
    }

    public function test_admin_cannot_delete_category_with_products(): void
{
    $this->admin();

    $category = $this->createCategory();

    Product::query()->create([
        'category_id' => $category->id,
        'name' => 'Test Product',
        'slug' => 'test-product',
        'sku' => 'TEST-SKU-001',
        'price' => 1000,
        'stock' => 5,
        'is_active' => true,
    ]);

    $this->deleteJson("/api/v1/admin/categories/{$category->id}")
        ->assertStatus(409);

    $this->assertDatabaseHas('categories', [
        'id' => $category->id,
    ]);
}
public function test_admin_cannot_set_category_as_its_own_parent(): void
{
    $this->admin();

    $category = $this->createCategory();

    $this->putJson("/api/v1/admin/categories/{$category->id}", [
        'name' => $category->name,
        'parent_id' => $category->id,
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['parent_id']);
}

public function test_admin_cannot_delete_category_with_children(): void
{
    $this->admin();

    $parent = $this->createCategory([
        'name' => 'Parent Category',
        'slug' => 'parent-category',
    ]);

    $child = $this->createCategory([
        'name' => 'Child Category',
        'slug' => 'child-category',
        'parent_id' => $parent->id,
    ]);

    $this->deleteJson("/api/v1/admin/categories/{$parent->id}")
        ->assertStatus(409);

    $this->assertDatabaseHas('categories', [
        'id' => $parent->id,
    ]);

    $this->assertDatabaseHas('categories', [
        'id' => $child->id,
    ]);
}
    public function test_regular_user_cannot_manage_categories(): void
    {
        $user = User::factory()->create([
            'role' => 'user',
        ]);

        Sanctum::actingAs($user);

        $this->getJson('/api/v1/admin/categories')
            ->assertForbidden();
    }

    public function test_storefront_category_cache_is_cleared_after_admin_changes(): void
    {
        $this->admin();

        $category = $this->createCategory([
            'name' => 'Cached Category',
            'slug' => 'cached-category',
        ]);

        Cache::put(
            CategoryController::STOREFRONT_CACHE_KEY,
            [['id' => $category->id, 'name' => 'Cached Category']],
            now()->addMinutes(5)
        );

        $this->assertNotNull(Cache::get(CategoryController::STOREFRONT_CACHE_KEY));

        $this->putJson("/api/v1/admin/categories/{$category->id}", [
            'name' => 'Renamed Category',
            'is_active' => true,
            'sort_order' => 0,
        ])->assertOk();

        $this->assertNull(Cache::get(CategoryController::STOREFRONT_CACHE_KEY));
    }

    public function test_admin_can_upload_category_image(): void
    {
        $this->admin();

        Storage::fake('public');

        // GD روی این محیط نصب نیست؛ از یک PNG واقعی کوچک استفاده می‌شود
        // (قاعدهٔ `image` همچنان هدر فایل را بررسی می‌کند).
        $png = base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
            true
        );

        $response = $this->post(
            '/api/v1/admin/categories/image',
            ['image' => UploadedFile::fake()->createWithContent('category.png', $png)],
            ['Accept' => 'application/json']
        )->assertCreated()
            ->assertJsonPath('success', true);

        $path = $response->json('data.path');

        $this->assertIsString($path);
        $this->assertStringStartsWith('categories/', $path);
        Storage::disk('public')->assertExists($path);
        $this->assertNotEmpty($response->json('data.url'));
    }

    public function test_category_image_upload_rejects_non_image_files(): void
    {
        $this->admin();

        Storage::fake('public');

        $this->postJson('/api/v1/admin/categories/image', [
            'image' => UploadedFile::fake()->create(
                'catalog.pdf',
                40,
                'application/pdf'
            ),
        ])->assertStatus(422);
    }

    public function test_category_image_upload_requires_permission(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'user']));

        $this->postJson('/api/v1/admin/categories/image', [])
            ->assertForbidden();
    }

    public function test_storefront_category_index_exposes_image(): void
    {
        Cache::forget(CategoryController::STOREFRONT_CACHE_KEY);

        $parent = $this->createCategory([
            'name' => 'Parent With Image',
            'slug' => 'parent-with-image',
            'image' => 'categories/parent.webp',
        ]);

        $this->createCategory([
            'name' => 'Child With Image',
            'slug' => 'child-with-image',
            'parent_id' => $parent->id,
            'image' => 'categories/child.webp',
        ]);

        $this->getJson('/api/v1/categories')
            ->assertOk()
            ->assertJsonPath('data.0.slug', 'parent-with-image')
            ->assertJsonPath('data.0.image', 'categories/parent.webp')
            ->assertJsonPath('data.0.children.0.image', 'categories/child.webp');
    }
}