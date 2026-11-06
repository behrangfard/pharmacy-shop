<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class WishlistTest extends TestCase
{
    use RefreshDatabase;

    private function createProduct(
        array $attributes = [],
        string $slug = 'wishlist-test-product'
    ): int {
        $unique = uniqid();

        $categoryId = DB::table('categories')->insertGetId([
            'name' => 'دسته تست',
            'slug' => 'wishlist-test-category-' . $unique,
            'is_active' => true,
            'sort_order' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return DB::table('products')->insertGetId(array_merge([
            'category_id' => $categoryId,
            'name' => 'محصول علاقه‌مندی',
            'slug' => $slug,
            'sku' => 'WISHLIST-TEST-' . strtoupper($unique),
            'description' => 'توضیحات محصول تست علاقه‌مندی',
            'price' => 250000,
            'stock' => 10,
            'is_active' => true,
            'is_featured' => false,
            'is_new' => false,
            'views_count' => 0,
            'sales_count' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ], $attributes));
    }

    private function customer(): User
    {
        return User::factory()->create([
            'role' => 'customer',
        ]);
    }

    public function test_guest_cannot_use_wishlist(): void
    {
        $this->getJson('/api/v1/wishlist')->assertUnauthorized();
        $this->postJson('/api/v1/wishlist', ['product_id' => 1])
            ->assertUnauthorized();
        $this->deleteJson('/api/v1/wishlist/1')->assertUnauthorized();
    }

    public function test_customer_can_add_product_to_wishlist(): void
    {
        $customer = $this->customer();
        $productId = $this->createProduct();

        $response = $this->actingAs($customer)
            ->postJson('/api/v1/wishlist', ['product_id' => $productId]);

        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.is_wishlisted', true)
            ->assertJsonPath('data.product_id', $productId);

        $this->assertDatabaseHas('wishlist_items', [
            'user_id' => $customer->id,
            'product_id' => $productId,
        ]);
    }

    public function test_adding_same_product_twice_keeps_single_row(): void
    {
        $customer = $this->customer();
        $productId = $this->createProduct();

        $this->actingAs($customer)
            ->postJson('/api/v1/wishlist', ['product_id' => $productId])
            ->assertCreated();

        $this->actingAs($customer)
            ->postJson('/api/v1/wishlist', ['product_id' => $productId])
            ->assertOk()
            ->assertJsonPath('data.is_wishlisted', true);

        $this->assertSame(
            1,
            DB::table('wishlist_items')
                ->where('user_id', $customer->id)
                ->where('product_id', $productId)
                ->count()
        );
    }

    public function test_inactive_product_cannot_be_added(): void
    {
        $customer = $this->customer();
        $productId = $this->createProduct([
            'slug' => 'wishlist-inactive-product',
            'is_active' => false,
        ]);

        $this->actingAs($customer)
            ->postJson('/api/v1/wishlist', ['product_id' => $productId])
            ->assertStatus(422)
            ->assertJsonValidationErrors('product_id');

        $this->assertDatabaseCount('wishlist_items', 0);
    }

    public function test_unknown_product_is_rejected(): void
    {
        $customer = $this->customer();

        $this->actingAs($customer)
            ->postJson('/api/v1/wishlist', ['product_id' => 999999])
            ->assertStatus(422)
            ->assertJsonValidationErrors('product_id');
    }

    public function test_customer_sees_only_own_active_wishlist_items(): void
    {
        $customer = $this->customer();
        $otherCustomer = $this->customer();

        $activeProductId = $this->createProduct();
        $inactiveProductId = $this->createProduct([
            'slug' => 'wishlist-inactive-listing',
            'is_active' => false,
        ]);

        DB::table('wishlist_items')->insert([
            [
                'user_id' => $customer->id,
                'product_id' => $activeProductId,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            // محصول غیرفعال نباید در فهرست برگردد.
            [
                'user_id' => $customer->id,
                'product_id' => $inactiveProductId,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            // علاقه‌مندی کاربر دیگر هم نباید دیده شود.
            [
                'user_id' => $otherCustomer->id,
                'product_id' => $activeProductId,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        $response = $this->actingAs($customer)->getJson('/api/v1/wishlist');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.total', 1)
            ->assertJsonPath('data.product_ids', [$activeProductId])
            ->assertJsonPath('data.items.0.product.id', $activeProductId)
            ->assertJsonPath('data.items.0.product.slug', 'wishlist-test-product');
    }

    public function test_customer_can_remove_product_from_wishlist(): void
    {
        $customer = $this->customer();
        $productId = $this->createProduct();

        $this->actingAs($customer)
            ->postJson('/api/v1/wishlist', ['product_id' => $productId])
            ->assertCreated();

        $this->actingAs($customer)
            ->deleteJson("/api/v1/wishlist/{$productId}")
            ->assertOk()
            ->assertJsonPath('data.is_wishlisted', false);

        $this->assertDatabaseMissing('wishlist_items', [
            'user_id' => $customer->id,
            'product_id' => $productId,
        ]);

        // حذف دوباره نباید خطا بدهد.
        $this->actingAs($customer)
            ->deleteJson("/api/v1/wishlist/{$productId}")
            ->assertOk()
            ->assertJsonPath('success', true);
    }
}
