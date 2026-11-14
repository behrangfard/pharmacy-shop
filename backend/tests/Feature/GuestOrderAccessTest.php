<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * دسترسی مهمان به سفارش خودش.
 *
 * مهمان با همان شناسهٔ پایدار مرورگر (X-Guest-Token) می‌تواند جزئیات/فاکتور
 * سفارش خودش را ببیند و سفارش پرداخت‌نشده را لغو کند؛ هیچ مهمان دیگری به آن
 * سفارش دسترسی ندارد و بدون هویت، پاسخ 401 است.
 */
class GuestOrderAccessTest extends TestCase
{
    use RefreshDatabase;

    private const GUEST_TOKEN = '550e8400-e29b-41d4-a716-446655440201';

    private const OTHER_GUEST_TOKEN = '550e8400-e29b-41d4-a716-446655440202';

    private const IDEMPOTENCY_KEY = '550e8400-e29b-41d4-a716-446655440203';

    private Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        $category = Category::query()->create([
            'name' => 'Guest Access Category',
            'slug' => 'guest-access-category',
            'is_active' => true,
            'sort_order' => 0,
        ]);

        $this->product = Product::query()->create([
            'category_id' => $category->id,
            'name' => 'Guest Access Product',
            'slug' => 'guest-access-product',
            'sku' => 'GUEST-ACCESS-001',
            'price' => 100000,
            'stock' => 5,
            'discount_percent' => 0,
            'is_active' => true,
            'is_taxable' => false,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(): array
    {
        return [
            'recipient_name' => 'مهمان دسترسی',
            'phone' => '09120000000',
            'address' => 'تهران، خیابان تست',
            'postal_code' => '1234567890',
            'notes' => null,
            'payment_method' => 'cod',
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'quantity' => 1,
                ],
            ],
        ];
    }

    private function createGuestOrder(
        string $guestToken = self::GUEST_TOKEN,
        string $idempotencyKey = self::IDEMPOTENCY_KEY
    ): Order {
        $this->withHeaders([
            'Idempotency-Key' => $idempotencyKey,
            'X-Guest-Token' => $guestToken,
        ])
            ->postJson('/api/v1/orders', $this->payload())
            ->assertCreated();

        return Order::query()->latest('id')->firstOrFail();
    }

    public function test_guest_can_view_own_order_with_guest_token(): void
    {
        $order = $this->createGuestOrder();

        $this->withHeaders(['X-Guest-Token' => self::GUEST_TOKEN])
            ->getJson("/api/v1/orders/{$order->order_number}")
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.order_number', $order->order_number);
    }

    public function test_guest_cannot_view_another_guests_order(): void
    {
        $order = $this->createGuestOrder();

        $this->withHeaders(['X-Guest-Token' => self::OTHER_GUEST_TOKEN])
            ->getJson("/api/v1/orders/{$order->order_number}")
            ->assertNotFound()
            ->assertJsonPath('success', false);
    }

    public function test_order_details_require_identity(): void
    {
        $order = $this->createGuestOrder();

        $this->withoutHeader('X-Guest-Token')
            ->getJson("/api/v1/orders/{$order->order_number}")
            ->assertUnauthorized()
            ->assertJsonPath('success', false);
    }

    public function test_guest_can_cancel_own_unpaid_order_and_stock_is_restored(): void
    {
        $order = $this->createGuestOrder();

        $this->assertSame(4, $this->product->fresh()->stock);

        $this->withHeaders(['X-Guest-Token' => self::GUEST_TOKEN])
            ->postJson("/api/v1/orders/{$order->order_number}/cancel")
            ->assertOk()
            ->assertJsonPath('success', true);

        $order->refresh();

        $this->assertSame('cancelled', $order->status);
        $this->assertNotNull($order->stock_restored_at);
        $this->assertSame(5, $this->product->fresh()->stock);
    }

    public function test_guest_cannot_cancel_another_guests_order(): void
    {
        $order = $this->createGuestOrder();

        $this->withHeaders(['X-Guest-Token' => self::OTHER_GUEST_TOKEN])
            ->postJson("/api/v1/orders/{$order->order_number}/cancel")
            ->assertNotFound();

        $this->assertSame('processing', $order->fresh()->status);
        $this->assertSame(4, $this->product->fresh()->stock);
    }

    public function test_guest_cannot_cancel_shipped_order(): void
    {
        $order = $this->createGuestOrder();

        $order->update([
            'status' => 'shipped',
            'shipped_at' => now(),
        ]);

        $this->withHeaders(['X-Guest-Token' => self::GUEST_TOKEN])
            ->postJson("/api/v1/orders/{$order->order_number}/cancel")
            ->assertStatus(422)
            ->assertJsonPath('success', false);

        $this->assertSame('shipped', $order->fresh()->status);
        $this->assertSame(4, $this->product->fresh()->stock);
    }

    public function test_cancel_requires_identity(): void
    {
        $order = $this->createGuestOrder();

        $this->withoutHeader('X-Guest-Token')
            ->postJson("/api/v1/orders/{$order->order_number}/cancel")
            ->assertUnauthorized()
            ->assertJsonPath('success', false);

        $this->assertSame('processing', $order->fresh()->status);
        $this->assertSame(4, $this->product->fresh()->stock);
    }
}
