<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderTrackingTest extends TestCase
{
    use RefreshDatabase;

    private Order $order;

    protected function setUp(): void
    {
        parent::setUp();

        $category = Category::query()->create([
            'name' => 'Tracking Category',
            'slug' => 'tracking-category',
            'is_active' => true,
            'sort_order' => 0,
        ]);

        $product = Product::query()->create([
            'category_id' => $category->id,
            'name' => 'Tracking Product',
            'slug' => 'tracking-product',
            'sku' => 'TRACK-001',
            'price' => 50000,
            'stock' => 10,
            'discount_percent' => 0,
            'is_active' => true,
            'is_taxable' => false,
        ]);

        $this->order = Order::query()->create([
            'user_id' => null,
            'guest_token' => '550e8400-e29b-41d4-a716-446655440201',
            'idempotency_key' => '550e8400-e29b-41d4-a716-446655440202',
            'order_number' => 'ORD-14050101-ABC123',
            'subtotal' => 100000,
            'shipping_cost' => 0,
            'discount' => 0,
            'coupon_discount' => 0,
            'tax_percent' => 0,
            'tax_amount' => 0,
            'total' => 100000,
            'status' => 'processing',
            'payment_status' => 'unpaid',
            'payment_method' => 'cod',
            'recipient_name' => 'مهمان تست',
            'phone' => '09120000000',
            'address' => 'تهران، خیابان تست',
            'postal_code' => '1234567890',
            'sales_channel' => 'website',
        ]);

        $this->order->items()->create([
            'product_id' => $product->id,
            'product_name' => $product->name,
            'sku' => $product->sku,
            'quantity' => 2,
            'unit_price' => 50000,
            'total_price' => 100000,
        ]);
    }

    public function test_tracking_returns_order_for_matching_phone(): void
    {
        $response = $this->postJson('/api/v1/orders/track', [
            'order_number' => 'ORD-14050101-ABC123',
            'phone' => '09120000000',
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'processing')
            ->assertJsonPath('data.status_label', 'در حال آماده‌سازی')
            ->assertJsonPath('data.phone_masked', '0912***0000')
            ->assertJsonPath('data.payment_method', 'cod')
            ->assertJsonCount(1, 'data.items');
    }

    public function test_tracking_accepts_persian_digits_phone(): void
    {
        $this->postJson('/api/v1/orders/track', [
            'order_number' => 'ORD-14050101-ABC123',
            'phone' => '۰۹۱۲۰۰۰۰۰۰۰',
        ])
            ->assertOk()
            ->assertJsonPath('data.order_number', 'ORD-14050101-ABC123');
    }

    public function test_tracking_rejects_wrong_phone(): void
    {
        $this->postJson('/api/v1/orders/track', [
            'order_number' => 'ORD-14050101-ABC123',
            'phone' => '09121111111',
        ])
            ->assertNotFound()
            ->assertJsonPath('success', false);
    }

    public function test_tracking_rejects_unknown_order_number(): void
    {
        $this->postJson('/api/v1/orders/track', [
            'order_number' => 'ORD-UNKNOWN-000000',
            'phone' => '09120000000',
        ])
            ->assertNotFound()
            ->assertJsonPath('success', false);
    }
}
