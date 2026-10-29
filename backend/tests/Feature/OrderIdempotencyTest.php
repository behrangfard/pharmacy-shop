<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OrderIdempotencyTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Category $category;
    private Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create([
            'role' => 'user',
        ]);

        $this->category = Category::query()->create([
            'name' => 'Idempotency Test Category',
            'slug' => 'idempotency-test-category',
            'is_active' => true,
            'sort_order' => 0,
        ]);

        $this->product = Product::query()->create([
            'category_id' => $this->category->id,
            'name' => 'Idempotency Test Product',
            'slug' => 'idempotency-test-product',
            'sku' => 'IDEMPOTENCY-TEST-001',
            'price' => 100000,
            'stock' => 10,
            'discount_percent' => 0,
            'is_active' => true,
            'is_taxable' => false,
        ]);

        Sanctum::actingAs($this->user);
    }

    private function orderPayload(int $quantity = 1): array
    {
        return [
            'recipient_name' => 'Test User',
            'phone' => '09120000000',
            'address' => 'Test address',
            'postal_code' => '1234567890',
            'notes' => null,
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'quantity' => $quantity,
                ],
            ],
        ];
    }

    public function test_repeating_same_order_request_does_not_decrease_stock_twice(): void
    {
        $key = '550e8400-e29b-41d4-a716-446655440001';
        $payload = $this->orderPayload();

        $firstResponse = $this
            ->withHeader('Idempotency-Key', $key)
            ->postJson('/api/v1/orders', $payload);

        $firstResponse->assertSuccessful();

        $stockAfterFirstRequest = $this->product->fresh()->stock;

        $this->assertSame(9, $stockAfterFirstRequest);
        $this->assertDatabaseCount('orders', 1);

        $secondResponse = $this
            ->withHeader('Idempotency-Key', $key)
            ->postJson('/api/v1/orders', $payload);

        $secondResponse->assertOk()
            ->assertJsonPath('success', true);

        $this->assertSame(
            $stockAfterFirstRequest,
            $this->product->fresh()->stock
        );

        $this->assertDatabaseCount('orders', 1);
    }

    public function test_reusing_same_key_for_different_order_is_rejected(): void
    {
        $key = '550e8400-e29b-41d4-a716-446655440002';

        $firstResponse = $this
            ->withHeader('Idempotency-Key', $key)
            ->postJson('/api/v1/orders', $this->orderPayload(1));

        $firstResponse->assertSuccessful();

        $stockAfterFirstRequest = $this->product->fresh()->stock;

        $secondResponse = $this
            ->withHeader('Idempotency-Key', $key)
            ->postJson('/api/v1/orders', $this->orderPayload(2));

        $secondResponse->assertStatus(409)
            ->assertJsonPath('success', false);

        $this->assertSame(
            $stockAfterFirstRequest,
            $this->product->fresh()->stock
        );

        $this->assertDatabaseCount('orders', 1);
    }

    public function test_insufficient_stock_does_not_create_order_or_change_stock(): void
    {
        $this->product->update([
            'stock' => 1,
        ]);

        $response = $this
            ->withHeader(
                'Idempotency-Key',
                '550e8400-e29b-41d4-a716-446655440003'
            )
            ->postJson('/api/v1/orders', $this->orderPayload(2));

        $response->assertStatus(422);

        $this->assertSame(1, $this->product->fresh()->stock);
        $this->assertDatabaseCount('orders', 0);
    }

    public function test_missing_idempotency_key_is_rejected(): void
    {
        $response = $this->postJson(
            '/api/v1/orders',
            $this->orderPayload()
        );

        $response->assertStatus(422);

        $this->assertSame(10, $this->product->fresh()->stock);
        $this->assertDatabaseCount('orders', 0);
    }
}
