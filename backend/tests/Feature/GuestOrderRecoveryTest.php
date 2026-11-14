<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * کد پیگیری مهمان.
 *
 * سفارش مهمان به شناسهٔ مرورگر (X-Guest-Token) گره خورده است؛ این تست‌ها
 * مطمئن می‌شوند کد پیگیری هنگام ثبت ساخته و فقط یک‌بار برگردانده می‌شود،
 * با «شماره سفارش + کد» دسترسی در مرورگر جدید بازیابی می‌شود و کد در
 * پاسخ‌های عادی (جزئیات/فاکتور) لو نمی‌رود.
 */
class GuestOrderRecoveryTest extends TestCase
{
    use RefreshDatabase;

    private const GUEST_TOKEN = '550e8400-e29b-41d4-a716-446655440301';

    private const OTHER_GUEST_TOKEN = '550e8400-e29b-41d4-a716-446655440302';

    private Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        $category = Category::query()->create([
            'name' => 'Guest Recovery Category',
            'slug' => 'guest-recovery-category',
            'is_active' => true,
            'sort_order' => 0,
        ]);

        $this->product = Product::query()->create([
            'category_id' => $category->id,
            'name' => 'Guest Recovery Product',
            'slug' => 'guest-recovery-product',
            'sku' => 'GUEST-RECOVERY-001',
            'price' => 100000,
            'stock' => 10,
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
            'recipient_name' => 'مهمان بازیابی',
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

    private function placeGuestOrder(
        string $guestToken = self::GUEST_TOKEN,
        ?string $idempotencyKey = null
    ): TestResponse {
        return $this->withHeaders([
            'Idempotency-Key' => $idempotencyKey ?? (string) Str::uuid(),
            'X-Guest-Token' => $guestToken,
        ])->postJson('/api/v1/orders', $this->payload());
    }

    public function test_guest_order_creation_returns_an_access_code(): void
    {
        $response = $this->placeGuestOrder()->assertCreated();

        $code = $response->json('data.guest_access_code');

        $this->assertIsString($code);
        $this->assertSame(8, strlen($code));
        $this->assertMatchesRegularExpression('/^[A-Z0-9]{8}$/', $code);
        // حروف/ارقام مبهم (I, O, 0, 1) نباید در کد باشند.
        $this->assertDoesNotMatchRegularExpression('/[IO01]/', $code);

        $order = Order::query()->firstOrFail();

        $this->assertSame($code, $order->guest_access_code);
    }

    public function test_registered_user_order_has_no_access_code(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'user']));

        $response = $this->withHeader('Idempotency-Key', (string) Str::uuid())
            ->postJson('/api/v1/orders', $this->payload())
            ->assertCreated();

        $this->assertNull($response->json('data.guest_access_code'));
        $this->assertNull(Order::query()->firstOrFail()->guest_access_code);
    }

    public function test_recover_returns_the_guest_token_for_the_correct_code(): void
    {
        $this->placeGuestOrder()->assertCreated();

        $order = Order::query()->firstOrFail();
        $code = (string) $order->guest_access_code;

        $this->postJson('/api/v1/orders/recover', [
            'order_number' => $order->order_number,
            'access_code' => $code,
        ])
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.guest_token', self::GUEST_TOKEN)
            ->assertJsonPath('data.order_number', $order->order_number)
            ->assertJsonPath('data.status', 'processing');
    }

    public function test_recover_accepts_dashed_and_lowercase_code(): void
    {
        $this->placeGuestOrder()->assertCreated();

        $order = Order::query()->firstOrFail();
        $code = (string) $order->guest_access_code;

        $formatted = strtolower(substr($code, 0, 4).'-'.substr($code, 4));

        $this->postJson('/api/v1/orders/recover', [
            'order_number' => $order->order_number,
            'access_code' => $formatted,
        ])
            ->assertOk()
            ->assertJsonPath('data.guest_token', self::GUEST_TOKEN);
    }

    public function test_recover_rejects_a_wrong_code(): void
    {
        $this->placeGuestOrder()->assertCreated();

        $order = Order::query()->firstOrFail();

        $this->postJson('/api/v1/orders/recover', [
            'order_number' => $order->order_number,
            'access_code' => 'ZZZZZZZZ',
        ])
            ->assertNotFound()
            ->assertJsonPath('success', false)
            ->assertJsonPath(
                'message',
                'شماره سفارش یا کد پیگیری درست نیست.'
            );
    }

    public function test_recover_rejects_unknown_order_number(): void
    {
        $this->postJson('/api/v1/orders/recover', [
            'order_number' => 'ORD-UNKNOWN-000000',
            'access_code' => 'ABCD2345',
        ])
            ->assertNotFound()
            ->assertJsonPath('success', false);
    }

    public function test_recover_rejects_registered_user_orders(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'user']));

        $this->withHeader('Idempotency-Key', (string) Str::uuid())
            ->postJson('/api/v1/orders', $this->payload())
            ->assertCreated();

        $order = Order::query()->firstOrFail();

        $this->postJson('/api/v1/orders/recover', [
            'order_number' => $order->order_number,
            'access_code' => 'ABCD2345',
        ])
            ->assertNotFound()
            ->assertJsonPath('success', false);
    }

    public function test_recovered_token_grants_order_details_access(): void
    {
        $this->placeGuestOrder()->assertCreated();

        $order = Order::query()->firstOrFail();

        $recoveredToken = $this->postJson('/api/v1/orders/recover', [
            'order_number' => $order->order_number,
            'access_code' => (string) $order->guest_access_code,
        ])
            ->assertOk()
            ->json('data.guest_token');

        $this->withHeaders(['X-Guest-Token' => $recoveredToken])
            ->getJson("/api/v1/orders/{$order->order_number}")
            ->assertOk()
            ->assertJsonPath('data.order_number', $order->order_number);
    }

    public function test_access_code_is_not_exposed_in_order_details(): void
    {
        $this->placeGuestOrder()->assertCreated();

        $order = Order::query()->firstOrFail();

        $response = $this->withHeaders(['X-Guest-Token' => self::GUEST_TOKEN])
            ->getJson("/api/v1/orders/{$order->order_number}")
            ->assertOk();

        $this->assertArrayNotHasKey('guest_access_code', $response->json('data'));
    }

    public function test_two_guest_orders_receive_different_codes(): void
    {
        $this->placeGuestOrder(self::GUEST_TOKEN)->assertCreated();
        $this->placeGuestOrder(self::OTHER_GUEST_TOKEN)->assertCreated();

        $codes = Order::query()->pluck('guest_access_code');

        $this->assertCount(2, $codes);
        $this->assertNotSame($codes[0], $codes[1]);
    }

    public function test_idempotent_replay_returns_the_same_code(): void
    {
        $idempotencyKey = (string) Str::uuid();

        $first = $this->placeGuestOrder(self::GUEST_TOKEN, $idempotencyKey)
            ->assertCreated();

        $second = $this->placeGuestOrder(self::GUEST_TOKEN, $idempotencyKey)
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertSame(
            $first->json('data.guest_access_code'),
            $second->json('data.guest_access_code')
        );
        $this->assertDatabaseCount('orders', 1);
    }
}
