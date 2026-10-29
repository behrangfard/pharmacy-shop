<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OrderCancellationTest extends TestCase
{
    use RefreshDatabase;

    private function createTestProduct(int $stock = 9): Product
    {
        $category = Category::query()->create([
            'name' => 'Cancellation Test Category',
            'slug' => 'cancellation-test-category',
            'is_active' => true,
            'sort_order' => 0,
        ]);

        return Product::query()->create([
            'category_id' => $category->id,
            'name' => 'Cancellation Test Product',
            'slug' => 'cancellation-test-product',
            'sku' => 'CANCEL-TEST-001',
            'price' => 100000,
            'stock' => $stock,
            'discount_percent' => 0,
            'is_active' => true,
        ]);
    }

    private function createTestOrder(
        User $user,
        Product $product,
        string $orderNumber,
        string $paymentStatus = 'unpaid',
        string $status = 'pending',
        int $quantity = 1
    ): Order {
        $order = Order::query()->create([
            'user_id' => $user->id,
            'order_number' => $orderNumber,
            'subtotal' => 100000 * $quantity,
            'shipping_cost' => 0,
            'discount' => 0,
            'tax_percent' => 0,
            'tax_amount' => 0,
            'total' => 100000 * $quantity,
            'status' => $status,
            'payment_status' => $paymentStatus,
            'recipient_name' => 'Test User',
            'phone' => '09120000000',
            'address' => 'Test address',
            'postal_code' => null,
            'notes' => null,
        ]);

        OrderItem::query()->create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'sku' => $product->sku,
            'quantity' => $quantity,
            'unit_price' => 100000,
            'total_price' => 100000 * $quantity,
        ]);

        return $order;
    }

    public function test_cancelling_unpaid_order_restores_stock(): void
    {
        $user = User::factory()->create([
            'role' => 'user',
        ]);

        $product = $this->createTestProduct(stock: 8);

        $order = $this->createTestOrder(
            user: $user,
            product: $product,
            orderNumber: 'ORD-CANCEL-001',
            quantity: 1,
        );

        Sanctum::actingAs($user);

        $response = $this->postJson(
            '/api/v1/orders/' . $order->order_number . '/cancel'
        );

        $response->assertOk()
            ->assertJsonPath('success', true);

        $this->assertSame(9, (int) $product->fresh()->stock);

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'status' => 'cancelled',
        ]);

        $this->assertNotNull(
            $order->fresh()->stock_restored_at
        );
    }

    public function test_repeated_cancellation_does_not_restore_stock_twice(): void
    {
        $user = User::factory()->create([
            'role' => 'user',
        ]);

        $product = $this->createTestProduct(stock: 8);

        $order = $this->createTestOrder(
            user: $user,
            product: $product,
            orderNumber: 'ORD-CANCEL-002',
        );

        Sanctum::actingAs($user);

        $url = '/api/v1/orders/' . $order->order_number . '/cancel';

        $firstResponse = $this->postJson($url);

        $firstResponse->assertOk()
            ->assertJsonPath('success', true);

        $this->assertSame(9, (int) $product->fresh()->stock);

        $secondResponse = $this->postJson($url);

        $secondResponse->assertStatus(422)
            ->assertJsonPath('success', false);

        $this->assertSame(9, (int) $product->fresh()->stock);
    }

    public function test_paid_order_cannot_be_cancelled_by_customer(): void
    {
        $user = User::factory()->create([
            'role' => 'user',
        ]);

        $product = $this->createTestProduct(stock: 8);

        $order = $this->createTestOrder(
            user: $user,
            product: $product,
            orderNumber: 'ORD-CANCEL-003',
            paymentStatus: 'paid',
            status: 'processing',
        );

        Sanctum::actingAs($user);

        $response = $this->postJson(
            '/api/v1/orders/' . $order->order_number . '/cancel'
        );

        $response->assertStatus(422)
            ->assertJsonPath('success', false);

        $this->assertSame(8, (int) $product->fresh()->stock);

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'status' => 'processing',
            'payment_status' => 'paid',
        ]);

        $this->assertNull(
            $order->fresh()->stock_restored_at
        );
    }

    public function test_customer_cannot_cancel_another_users_order(): void
    {
        $owner = User::factory()->create([
            'role' => 'user',
        ]);

        $otherUser = User::factory()->create([
            'role' => 'user',
        ]);

        $product = $this->createTestProduct(stock: 8);

        $order = $this->createTestOrder(
            user: $owner,
            product: $product,
            orderNumber: 'ORD-CANCEL-004',
        );

        Sanctum::actingAs($otherUser);

        $response = $this->postJson(
            '/api/v1/orders/' . $order->order_number . '/cancel'
        );

        $response->assertNotFound();

        $this->assertSame(8, (int) $product->fresh()->stock);

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'user_id' => $owner->id,
            'status' => 'pending',
        ]);
    }
}
