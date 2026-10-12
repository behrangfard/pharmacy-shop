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

class OrderPaymentTest extends TestCase
{
    use RefreshDatabase;

    public function test_repeated_payment_does_not_change_stock_or_pay_twice(): void
    {
        $user = User::factory()->create([
            'role' => 'user',
        ]);

        $category = Category::query()->create([
            'name' => 'Payment Test Category',
            'slug' => 'payment-test-category',
            'is_active' => true,
            'sort_order' => 0,
        ]);

        $product = Product::query()->create([
            'category_id' => $category->id,
            'name' => 'Payment Test Product',
            'slug' => 'payment-test-product',
            'sku' => 'PAYMENT-TEST-001',
            'price' => 100000,
            'stock' => 9,
            'is_active' => true,
        ]);

        $order = Order::query()->create([
            'user_id' => $user->id,
            'order_number' => 'ORD-PAYMENT-TEST-001',
            'subtotal' => 100000,
            'shipping_cost' => 0,
            'discount' => 0,
            'tax_percent' => 0,
            'tax_amount' => 0,
            'total' => 100000,
            'status' => 'pending',
            'payment_status' => 'unpaid',
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
            'quantity' => 1,
            'unit_price' => 100000,
            'total_price' => 100000,
        ]);

        Sanctum::actingAs($user);

        $url = '/api/v1/orders/' . $order->order_number . '/pay';

        $firstResponse = $this->postJson($url);

        $firstResponse->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'payment_status' => 'paid',
            'status' => 'processing',
        ]);

        $stockAfterFirstPayment = $product->fresh()->stock;

        $secondResponse = $this->postJson($url);

        $secondResponse->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'payment_status' => 'paid',
            'status' => 'processing',
        ]);

        $this->assertSame(
            $stockAfterFirstPayment,
            $product->fresh()->stock
        );

        $this->assertSame(
            1,
            Order::query()
                ->where('order_number', 'ORD-PAYMENT-TEST-001')
                ->count()
        );
    }
}
