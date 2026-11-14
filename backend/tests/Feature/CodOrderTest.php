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

class CodOrderTest extends TestCase
{
    use RefreshDatabase;

    private function createProduct(int $stock = 10): Product
    {
        $category = Category::query()->create([
            'name' => 'COD Test Category',
            'slug' => 'cod-test-'.Str::random(8),
            'is_active' => true,
            'sort_order' => 0,
        ]);

        return Product::query()->create([
            'category_id' => $category->id,
            'name' => 'COD Test Product',
            'slug' => 'cod-test-product-'.Str::random(8),
            'sku' => 'COD-TEST-'.Str::random(6),
            'price' => 100000,
            'stock' => $stock,
            'discount_percent' => 0,
            'is_active' => true,
        ]);
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function placeOrder(
        User $user,
        Product $product,
        array $overrides = [],
        ?string $idempotencyKey = null
    ): TestResponse {
        Sanctum::actingAs($user);

        return $this->withHeader(
            'Idempotency-Key',
            $idempotencyKey ?? (string) Str::uuid()
        )->postJson('/api/v1/orders', array_merge([
            'recipient_name' => 'Test User',
            'phone' => '09120000000',
            'address' => 'Test address',
            'postal_code' => '1234567890',
            'notes' => null,
            'payment_method' => 'cod',
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 1,
                ],
            ],
        ], $overrides));
    }

    public function test_cod_order_is_stored_as_processing_and_reserves_stock(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        $product = $this->createProduct(10);

        $response = $this->placeOrder($user, $product);

        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.payment_method', 'cod')
            ->assertJsonPath('data.status', 'processing')
            ->assertJsonPath('data.payment_status', 'unpaid');

        $order = Order::query()
            ->where('user_id', $user->id)
            ->firstOrFail();

        $this->assertSame('cod', $order->payment_method);
        $this->assertSame('processing', $order->status);
        $this->assertNull($order->paid_at);
        $this->assertSame(9, $product->fresh()->stock);
    }

    public function test_online_payment_is_still_the_default_method(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        $product = $this->createProduct(5);

        $response = $this->placeOrder($user, $product, [
            'payment_method' => null,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.payment_method', 'online')
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.payment_status', 'unpaid');

        $this->assertDatabaseHas('orders', [
            'user_id' => $user->id,
            'payment_method' => 'online',
            'status' => 'pending',
        ]);
    }

    public function test_unknown_payment_method_is_rejected(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        $product = $this->createProduct();

        $response = $this->placeOrder($user, $product, [
            'payment_method' => 'wallet',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors('payment_method');

        $this->assertDatabaseCount('orders', 0);
        $this->assertSame(10, $product->fresh()->stock);
    }

    public function test_cod_order_cannot_be_paid_through_the_demo_gateway(): void
    {
        config([
            'payment.mode' => 'demo',
            'payment.demo_enabled' => true,
        ]);

        $user = User::factory()->create(['role' => 'user']);
        $product = $this->createProduct();

        $this->placeOrder($user, $product)->assertCreated();

        $order = Order::query()
            ->where('user_id', $user->id)
            ->firstOrFail();

        $response = $this->postJson(
            '/api/v1/orders/'.$order->order_number.'/pay'
        );

        $response->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath(
                'message',
                'این سفارش با روش «پرداخت در محل» ثبت شده است و پرداخت آنلاین برای آن امکان‌پذیر نیست.'
            );

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'payment_status' => 'unpaid',
            'status' => 'processing',
        ]);
    }

    public function test_abandoned_release_never_cancels_a_cod_order(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        $product = $this->createProduct(3);

        $this->placeOrder($user, $product)->assertCreated();

        $order = Order::query()
            ->where('user_id', $user->id)
            ->firstOrFail();

        $order->forceFill(['created_at' => now()->subHours(2)])->save();

        $this->artisan('orders:release-abandoned', ['--minutes' => 60])
            ->assertSuccessful();

        $order->refresh();

        $this->assertSame('processing', $order->status);
        $this->assertSame('unpaid', $order->payment_status);
        $this->assertNull($order->stock_restored_at);
        $this->assertSame(2, $product->fresh()->stock);
    }

    public function test_admin_can_record_cash_received_for_a_cod_order(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        $product = $this->createProduct();

        $this->placeOrder($user, $product)->assertCreated();

        $order = Order::query()
            ->where('user_id', $user->id)
            ->firstOrFail();

        $admin = User::factory()->create(['role' => 'admin']);

        Sanctum::actingAs($admin);

        $response = $this->patchJson(
            '/api/v1/admin/orders/'.$order->order_number.'/payment',
            ['payment_status' => 'paid']
        );

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.payment_status', 'paid')
            ->assertJsonPath('data.payment_method', 'cod');

        $order->refresh();

        $this->assertSame('paid', $order->payment_status);
        $this->assertNotNull($order->paid_at);
        $this->assertSame('processing', $order->status);
    }

    public function test_admin_cannot_manually_mark_an_online_order_as_paid(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        $product = $this->createProduct();

        $this->placeOrder($user, $product, [
            'payment_method' => 'online',
        ])->assertCreated();

        $order = Order::query()
            ->where('user_id', $user->id)
            ->firstOrFail();

        $admin = User::factory()->create(['role' => 'admin']);

        Sanctum::actingAs($admin);

        $response = $this->patchJson(
            '/api/v1/admin/orders/'.$order->order_number.'/payment',
            ['payment_status' => 'paid']
        );

        $response->assertStatus(422)
            ->assertJsonPath('success', false);

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'payment_status' => 'unpaid',
            'paid_at' => null,
        ]);
    }

    public function test_admin_can_ship_a_cod_order_before_payment(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        $product = $this->createProduct();

        $this->placeOrder($user, $product)->assertCreated();

        $order = Order::query()
            ->where('user_id', $user->id)
            ->firstOrFail();

        $admin = User::factory()->create(['role' => 'admin']);

        Sanctum::actingAs($admin);

        $response = $this->patchJson(
            '/api/v1/admin/orders/'.$order->order_number.'/status',
            ['status' => 'shipped']
        );

        $response->assertOk()
            ->assertJsonPath('data.status', 'shipped')
            ->assertJsonPath('data.payment_status', 'unpaid');

        $order->refresh();

        $this->assertSame('shipped', $order->status);
        $this->assertSame('unpaid', $order->payment_status);
        $this->assertNotNull($order->shipped_at);
    }

    public function test_idempotency_key_conflicts_when_payment_method_changes(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        $product = $this->createProduct();
        $key = (string) Str::uuid();

        $this->placeOrder($user, $product, [], $key)->assertCreated();

        $conflict = $this->placeOrder($user, $product, [
            'payment_method' => 'online',
        ], $key);

        $conflict->assertStatus(409)
            ->assertJsonPath('success', false);

        $this->assertSame(
            1,
            Order::query()->where('user_id', $user->id)->count()
        );
    }

    public function test_customer_can_cancel_a_cod_order_and_stock_is_restored(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        $product = $this->createProduct(4);

        $this->placeOrder($user, $product)->assertCreated();

        $order = Order::query()
            ->where('user_id', $user->id)
            ->firstOrFail();

        $this->assertSame(3, $product->fresh()->stock);

        $this->postJson('/api/v1/orders/'.$order->order_number.'/cancel')
            ->assertOk()
            ->assertJsonPath('success', true);

        $order->refresh();

        $this->assertSame('cancelled', $order->status);
        $this->assertNotNull($order->stock_restored_at);
        $this->assertSame(4, $product->fresh()->stock);
    }

    public function test_cod_order_above_configured_limit_is_rejected(): void
    {
        config(['payment.cod_max_total' => 50000]);

        $user = User::factory()->create(['role' => 'user']);
        $product = $this->createProduct(4);

        $response = $this->placeOrder($user, $product);

        $response->assertStatus(422)
            ->assertJsonFragment([
                'message' => 'سقف مبلغ سفارش «پرداخت در محل» 50,000 تومان است؛ برای مبالغ بیشتر از پرداخت آنلاین استفاده کنید.',
            ]);

        // رد سفارش باید اثر تراکنش را هم برگرداند: نه سفارشی نه کسر موجودی.
        $this->assertSame(0, Order::query()->count());
        $this->assertSame(4, (int) $product->fresh()->stock);
    }

    public function test_cod_order_at_the_configured_limit_is_allowed(): void
    {
        config(['payment.cod_max_total' => 100000]);

        $user = User::factory()->create(['role' => 'user']);
        $product = $this->createProduct(2);

        $this->placeOrder($user, $product)
            ->assertCreated()
            ->assertJsonPath('data.payment_method', 'cod');
    }

    public function test_online_orders_are_not_limited_by_the_cod_cap(): void
    {
        config(['payment.cod_max_total' => 50000]);

        $user = User::factory()->create(['role' => 'user']);
        $product = $this->createProduct(2);

        $this->placeOrder($user, $product, [
            'payment_method' => 'online',
        ])->assertCreated()
            ->assertJsonPath('data.payment_method', 'online');
    }

    public function test_admin_cancelling_an_order_releases_the_coupon_usage_slot(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        $product = $this->createProduct(4);

        $coupon = Coupon::query()->create([
            'code' => 'ADMIN10',
            'type' => 'fixed',
            'value' => 10000,
            'usage_limit' => 5,
            'used_count' => 1,
            'is_active' => true,
        ]);

        $this->placeOrder($user, $product)->assertCreated();

        $order = Order::query()->where('user_id', $user->id)->firstOrFail();

        $order->forceFill([
            'coupon_code' => $coupon->code,
            'coupon_discount' => 10000,
        ])->save();

        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $this->patchJson(
            '/api/v1/admin/orders/'.$order->order_number.'/status',
            ['status' => 'cancelled']
        )->assertOk();

        $this->assertSame('cancelled', $order->fresh()->status);
        $this->assertSame(0, (int) $coupon->fresh()->used_count);
    }
}
