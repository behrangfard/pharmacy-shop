<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Coupon;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminCouponTest extends TestCase
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

    private function createCoupon(array $attributes = []): Coupon
    {
        return Coupon::query()->create(array_merge([
            'code' => 'WELCOME10',
            'type' => Coupon::TYPE_PERCENT,
            'value' => 10,
            'min_order_total' => 0,
            'is_active' => true,
        ], $attributes));
    }

    private function createProduct(): Product
    {
        $category = Category::query()->create([
            'name' => 'Coupon Test Category',
            'slug' => 'coupon-test-category',
            'is_active' => true,
            'sort_order' => 0,
        ]);

        return Product::query()->create([
            'category_id' => $category->id,
            'name' => 'Coupon Test Product',
            'slug' => 'coupon-test-product',
            'sku' => 'COUPON-TEST-001',
            'price' => 100000,
            'stock' => 10,
            'discount_percent' => 0,
            'is_active' => true,
            'is_taxable' => false,
        ]);
    }

    public function test_admin_can_create_coupon_with_normalized_code(): void
    {
        $this->admin();

        $this->postJson('/api/v1/admin/coupons', [
            'code' => ' welcome10 ',
            'title' => 'تخفیف خوش‌آمدگویی',
            'type' => 'percent',
            'value' => 10,
            'min_order_total' => 0,
            'is_active' => true,
        ])
            ->assertCreated()
            ->assertJsonPath('data.code', 'WELCOME10');

        $this->assertDatabaseHas('coupons', [
            'code' => 'WELCOME10',
            'type' => 'percent',
        ]);
    }

    public function test_percent_coupon_cannot_exceed_one_hundred(): void
    {
        $this->admin();

        $this->postJson('/api/v1/admin/coupons', [
            'code' => 'TOO-MUCH',
            'type' => 'percent',
            'value' => 150,
        ])->assertStatus(422);
    }

    public function test_public_check_calculates_discount_with_cap(): void
    {
        $this->createCoupon([
            'type' => Coupon::TYPE_PERCENT,
            'value' => 20,
            'max_discount' => 30000,
        ]);

        $this->postJson('/api/v1/coupons/check', [
            'code' => 'welcome10',
            'subtotal' => 500000,
        ])
            ->assertOk()
            ->assertJsonPath('data.code', 'WELCOME10')
            ->assertJsonPath('data.discount', 30000);
    }

    public function test_expired_coupon_is_rejected(): void
    {
        $this->createCoupon([
            'expires_at' => now()->subDay(),
        ]);

        $this->postJson('/api/v1/coupons/check', [
            'code' => 'WELCOME10',
            'subtotal' => 200000,
        ])
            ->assertStatus(422)
            ->assertJsonPath('success', false);
    }

    public function test_order_applies_coupon_discount_and_increments_usage(): void
    {
        $coupon = $this->createCoupon();
        $product = $this->createProduct();

        $user = User::factory()->create(['role' => 'user']);
        Sanctum::actingAs($user);

        $response = $this
            ->withHeader('Idempotency-Key', '550e8400-e29b-41d4-a716-446655442001')
            ->postJson('/api/v1/orders', [
                'recipient_name' => 'Test User',
                'phone' => '09120000000',
                'address' => 'Test address',
                'coupon_code' => 'welcome10',
                'items' => [
                    [
                        'product_id' => $product->id,
                        'quantity' => 1,
                    ],
                ],
            ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.subtotal', '100000.00')
            ->assertJsonPath('data.discount', '10000.00')
            ->assertJsonPath('data.coupon_code', 'WELCOME10')
            ->assertJsonPath('data.coupon_discount', '10000.00')
            ->assertJsonPath('data.total', '90000.00');

        $this->assertSame(1, $coupon->fresh()->used_count);
    }

    public function test_order_with_invalid_coupon_is_rejected(): void
    {
        $product = $this->createProduct();

        $user = User::factory()->create(['role' => 'user']);
        Sanctum::actingAs($user);

        $this->withHeader('Idempotency-Key', '550e8400-e29b-41d4-a716-446655442002')
            ->postJson('/api/v1/orders', [
                'recipient_name' => 'Test User',
                'phone' => '09120000000',
                'address' => 'Test address',
                'coupon_code' => 'DOES-NOT-EXIST',
                'items' => [
                    [
                        'product_id' => $product->id,
                        'quantity' => 1,
                    ],
                ],
            ])
            ->assertStatus(422);

        $this->assertDatabaseCount('orders', 0);
    }

    public function test_used_coupon_is_deactivated_instead_of_deleted(): void
    {
        $this->admin();

        $coupon = $this->createCoupon(['used_count' => 1]);

        $this->deleteJson("/api/v1/admin/coupons/{$coupon->id}")
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('coupons', [
            'id' => $coupon->id,
            'is_active' => false,
        ]);
    }
}
