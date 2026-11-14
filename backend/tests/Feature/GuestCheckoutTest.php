<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class GuestCheckoutTest extends TestCase
{
    use RefreshDatabase;

    private Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        $category = Category::query()->create([
            'name' => 'Guest Checkout Category',
            'slug' => 'guest-checkout-category',
            'is_active' => true,
            'sort_order' => 0,
        ]);

        $this->product = Product::query()->create([
            'category_id' => $category->id,
            'name' => 'Guest Checkout Product',
            'slug' => 'guest-checkout-product',
            'sku' => 'GUEST-CHECKOUT-001',
            'price' => 100000,
            'stock' => 5,
            'discount_percent' => 0,
            'is_active' => true,
            'is_taxable' => false,
        ]);
    }

    private function payload(string $paymentMethod = 'cod'): array
    {
        return [
            'recipient_name' => 'مهمان تست',
            'phone' => '09120000000',
            'address' => 'تهران، خیابان تست',
            'postal_code' => '1234567890',
            'notes' => null,
            'payment_method' => $paymentMethod,
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'quantity' => 1,
                ],
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    private function headers(
        string $idempotencyKey,
        ?string $guestToken
    ): array {
        $headers = ['Idempotency-Key' => $idempotencyKey];

        if ($guestToken !== null) {
            $headers['X-Guest-Token'] = $guestToken;
        }

        return $headers;
    }

    public function test_guest_can_place_cod_order_without_account(): void
    {
        $guestToken = '550e8400-e29b-41d4-a716-446655440102';

        $this->withHeaders($this->headers(
            '550e8400-e29b-41d4-a716-446655440101',
            $guestToken
        ))
            ->postJson('/api/v1/orders', $this->payload())
            ->assertCreated()
            ->assertJsonPath('success', true);

        $order = Order::query()->firstOrFail();

        $this->assertNull($order->user_id);
        $this->assertSame($guestToken, $order->guest_token);
        $this->assertSame('cod', $order->payment_method);
        $this->assertSame(4, $this->product->fresh()->stock);
    }

    public function test_guest_online_payment_is_rejected(): void
    {
        $this->withHeaders($this->headers(
            '550e8400-e29b-41d4-a716-446655440103',
            '550e8400-e29b-41d4-a716-446655440104'
        ))
            ->postJson('/api/v1/orders', $this->payload('online'))
            ->assertStatus(422)
            ->assertJsonPath('success', false);

        $this->assertDatabaseCount('orders', 0);
        $this->assertSame(5, $this->product->fresh()->stock);
    }

    public function test_guest_order_requires_guest_token(): void
    {
        $this->withHeaders($this->headers(
            '550e8400-e29b-41d4-a716-446655440105',
            null
        ))
            ->postJson('/api/v1/orders', $this->payload())
            ->assertStatus(422)
            ->assertJsonPath('success', false);

        $this->assertDatabaseCount('orders', 0);
    }

    public function test_repeating_guest_request_does_not_duplicate_order(): void
    {
        $headers = $this->headers(
            '550e8400-e29b-41d4-a716-446655440106',
            '550e8400-e29b-41d4-a716-446655440107'
        );

        $this->withHeaders($headers)
            ->postJson('/api/v1/orders', $this->payload())
            ->assertCreated();

        $this->withHeaders($headers)
            ->postJson('/api/v1/orders', $this->payload())
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseCount('orders', 1);
        $this->assertSame(4, $this->product->fresh()->stock);
    }

    public function test_authenticated_user_order_has_no_guest_token(): void
    {
        $user = User::factory()->create(['role' => 'customer']);

        Sanctum::actingAs($user);

        $this->withHeaders($this->headers(
            '550e8400-e29b-41d4-a716-446655440108',
            '550e8400-e29b-41d4-a716-446655440109'
        ))
            ->postJson('/api/v1/orders', $this->payload())
            ->assertCreated();

        $order = Order::query()->firstOrFail();

        $this->assertSame($user->id, $order->user_id);
        $this->assertNull($order->guest_token);
    }
}
