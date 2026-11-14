<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Coupon;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * سقف استفادهٔ هر کاربر از کد تخفیف (per_user_limit).
 *
 * تا قبل از این قاعده، یک مشتری می‌توانست همان کد را در سفارش‌های مختلف
 * بی‌نهایت بار استفاده کند؛ سقف کل (usage_limit) جلوی این کار را نمی‌گرفت.
 */
class CouponPerUserLimitTest extends TestCase
{
    use RefreshDatabase;

    private function createProduct(int $stock = 10): Product
    {
        $category = Category::query()->create([
            'name' => 'Coupon Limit Test Category',
            'slug' => 'coupon-limit-'.Str::random(8),
            'is_active' => true,
            'sort_order' => 0,
        ]);

        return Product::query()->create([
            'category_id' => $category->id,
            'name' => 'Coupon Limit Test Product',
            'slug' => 'coupon-limit-product-'.Str::random(8),
            'sku' => 'CPL-TEST-'.Str::random(6),
            'price' => 100000,
            'stock' => $stock,
            'discount_percent' => 0,
            'is_active' => true,
        ]);
    }

    private function createCoupon(array $overrides = []): Coupon
    {
        return Coupon::query()->create(array_merge([
            'code' => 'LIMIT10',
            'type' => 'percent',
            'value' => 10,
            'min_order_total' => 0,
            'usage_limit' => null,
            'per_user_limit' => 1,
            'is_active' => true,
        ], $overrides));
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function placeOrder(
        User $user,
        Product $product,
        array $overrides = []
    ): TestResponse {
        Sanctum::actingAs($user);

        return $this->withHeader(
            'Idempotency-Key',
            (string) Str::uuid()
        )->postJson('/api/v1/orders', array_merge([
            'recipient_name' => 'Test User',
            'phone' => '09120000000',
            'address' => 'Test address',
            'postal_code' => '1234567890',
            'coupon_code' => 'LIMIT10',
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 1,
                ],
            ],
        ], $overrides));
    }

    public function test_per_user_limit_blocks_second_use_for_same_user(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        $product = $this->createProduct(5);

        $coupon = $this->createCoupon(['per_user_limit' => 1]);

        $this->placeOrder($user, $product)->assertCreated();

        $second = $this->placeOrder($user, $product);

        $second->assertStatus(422)
            ->assertJsonFragment([
                'message' => 'این کد تخفیف برای هر کاربر فقط یک بار قابل استفاده است.',
            ]);

        $this->assertSame(1, Order::query()->where('user_id', $user->id)->count());
        $this->assertSame(1, $coupon->fresh()->used_count);
    }

    public function test_cancelling_an_order_frees_the_coupon_usage_slot(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        $product = $this->createProduct(5);

        $coupon = $this->createCoupon([
            'per_user_limit' => 1,
            'usage_limit' => 2,
        ]);

        $this->placeOrder($user, $product)->assertCreated();
        $this->assertSame(1, $coupon->fresh()->used_count);

        $order = Order::query()->where('user_id', $user->id)->firstOrFail();

        $this->postJson('/api/v1/orders/'.$order->order_number.'/cancel')
            ->assertOk()
            ->assertJsonPath('success', true);

        // لغو سفارش باید شمارندهٔ کل کوپن را هم برگرداند.
        $this->assertSame(0, $coupon->fresh()->used_count);

        // و همان کوپن دوباره برای همان کاربر قابل استفاده است.
        $this->placeOrder($user, $product)->assertCreated();
        $this->assertSame(1, $coupon->fresh()->used_count);
    }

    public function test_other_users_can_still_use_the_coupon(): void
    {
        $firstUser = User::factory()->create(['role' => 'user']);
        $secondUser = User::factory()->create(['role' => 'user']);
        $product = $this->createProduct(5);

        $coupon = $this->createCoupon(['per_user_limit' => 1]);

        $this->placeOrder($firstUser, $product)->assertCreated();
        $this->placeOrder($secondUser, $product)->assertCreated();

        $this->assertSame(2, $coupon->fresh()->used_count);
        $this->assertSame(
            2,
            Order::query()->where('coupon_code', 'LIMIT10')->count()
        );
    }

    public function test_cancelled_orders_free_the_per_user_quota(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        $product = $this->createProduct(5);

        $this->createCoupon(['per_user_limit' => 1]);

        $this->placeOrder($user, $product)->assertCreated();

        $order = Order::query()->where('user_id', $user->id)->firstOrFail();

        $this->postJson('/api/v1/orders/'.$order->order_number.'/cancel')
            ->assertOk();

        $this->placeOrder($user, $product)->assertCreated();

        $this->assertSame(2, Order::query()->where('user_id', $user->id)->count());
    }

    public function test_null_per_user_limit_means_no_personal_cap(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        $product = $this->createProduct(5);

        $this->createCoupon(['per_user_limit' => null]);

        $this->placeOrder($user, $product)->assertCreated();
        $this->placeOrder($user, $product)->assertCreated();

        $this->assertSame(2, Order::query()->where('user_id', $user->id)->count());
    }

    public function test_check_endpoint_rejects_user_that_reached_the_cap(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        $product = $this->createProduct(5);

        $this->createCoupon(['per_user_limit' => 1]);

        $this->placeOrder($user, $product)->assertCreated();

        Sanctum::actingAs($user);

        $this->postJson('/api/v1/coupons/check', [
            'code' => 'LIMIT10',
            'subtotal' => 100000,
        ])->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonFragment([
                'message' => 'این کد تخفیف برای هر کاربر فقط یک بار قابل استفاده است.',
            ]);
    }

    public function test_check_endpoint_still_works_for_guests(): void
    {
        $this->createCoupon(['per_user_limit' => 1]);

        $this->postJson('/api/v1/coupons/check', [
            'code' => 'LIMIT10',
            'subtotal' => 100000,
        ])->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.discount', 10000);
    }

    public function test_admin_can_set_and_validate_per_user_limit(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        Sanctum::actingAs($admin);

        $this->postJson('/api/v1/admin/coupons', [
            'code' => 'PERUSER3',
            'type' => 'percent',
            'value' => 5,
            'per_user_limit' => 3,
        ])->assertCreated()
            ->assertJsonPath('data.per_user_limit', 3);

        $this->postJson('/api/v1/admin/coupons', [
            'code' => 'PERUSER0',
            'type' => 'percent',
            'value' => 5,
            'per_user_limit' => 0,
        ])->assertStatus(422)
            ->assertJsonValidationErrors('per_user_limit');
    }

    /**
     * ثبت سفارش مهمان با شمارهٔ مشخص (بدون توکن Sanctum).
     *
     * @param  array<string, mixed>  $overrides
     */
    private function placeGuestOrder(
        string $phone,
        Product $product,
        array $overrides = []
    ): TestResponse {
        return $this->withHeaders([
            'Idempotency-Key' => (string) Str::uuid(),
            'X-Guest-Token' => (string) Str::uuid(),
        ])->postJson('/api/v1/orders', array_merge([
            'recipient_name' => 'مهمان تست',
            'phone' => $phone,
            'address' => 'تهران، خیابان تست',
            'postal_code' => '1234567890',
            'payment_method' => 'cod',
            'coupon_code' => 'LIMIT10',
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 1,
                ],
            ],
        ], $overrides));
    }

    public function test_guest_phone_blocks_second_use_for_same_number(): void
    {
        $product = $this->createProduct(5);
        $coupon = $this->createCoupon(['per_user_limit' => 1]);

        $this->placeGuestOrder('09121112233', $product)->assertCreated();

        $this->placeGuestOrder('09121112233', $product)
            ->assertStatus(422)
            ->assertJsonFragment([
                'message' => 'این کد تخفیف برای هر شماره تماس فقط یک بار قابل استفاده است.',
            ]);

        $this->assertSame(1, Order::query()->whereNull('user_id')->count());
        $this->assertSame(1, $coupon->fresh()->used_count);
    }

    public function test_guest_with_different_phone_can_use_the_coupon(): void
    {
        $product = $this->createProduct(5);
        $coupon = $this->createCoupon(['per_user_limit' => 1]);

        $this->placeGuestOrder('09121112233', $product)->assertCreated();
        $this->placeGuestOrder('09124445566', $product)->assertCreated();

        $this->assertSame(2, $coupon->fresh()->used_count);
    }

    public function test_guest_phone_cap_matches_persian_digits(): void
    {
        $product = $this->createProduct(5);
        $this->createCoupon(['per_user_limit' => 1]);

        $this->placeGuestOrder('۰۹۱۲۱۱۱۲۲۳۳', $product)->assertCreated();

        $this->placeGuestOrder('09121112233', $product)
            ->assertStatus(422)
            ->assertJsonFragment([
                'message' => 'این کد تخفیف برای هر شماره تماس فقط یک بار قابل استفاده است.',
            ]);
    }

    public function test_guest_check_endpoint_uses_phone_for_the_cap(): void
    {
        $product = $this->createProduct(5);
        $this->createCoupon(['per_user_limit' => 1]);

        $this->placeGuestOrder('09121112233', $product)->assertCreated();

        $this->postJson('/api/v1/coupons/check', [
            'code' => 'LIMIT10',
            'subtotal' => 100000,
            'phone' => '09121112233',
        ])->assertStatus(422)
            ->assertJsonFragment([
                'message' => 'این کد تخفیف برای هر شماره تماس فقط یک بار قابل استفاده است.',
            ]);

        $this->postJson('/api/v1/coupons/check', [
            'code' => 'LIMIT10',
            'subtotal' => 100000,
            'phone' => '09124445566',
        ])->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.discount', 10000);
    }

    public function test_cancelled_guest_order_frees_the_phone_quota(): void
    {
        $product = $this->createProduct(5);
        $this->createCoupon(['per_user_limit' => 1]);

        $this->placeGuestOrder('09121112233', $product)->assertCreated();

        $order = Order::query()->whereNull('user_id')->firstOrFail();

        $this->withHeaders(['X-Guest-Token' => $order->guest_token])
            ->postJson('/api/v1/orders/'.$order->order_number.'/cancel')
            ->assertOk();

        $this->placeGuestOrder('09121112233', $product)->assertCreated();

        $this->assertSame(2, Order::query()->whereNull('user_id')->count());
    }
}

