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

class AdminReportTest extends TestCase
{
    use RefreshDatabase;

    public function test_sales_report_summarizes_orders_and_products(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $user = User::factory()->create(['role' => 'user']);

        $category = Category::query()->create([
            'name' => 'Report Test Category',
            'slug' => 'report-test-category',
            'is_active' => true,
            'sort_order' => 0,
        ]);

        $product = Product::query()->create([
            'category_id' => $category->id,
            'name' => 'Report Test Product',
            'slug' => 'report-test-product',
            'sku' => 'REPORT-TEST-001',
            'price' => 50000,
            'stock' => 3,
            'discount_percent' => 0,
            'is_active' => true,
        ]);

        $paidOrder = Order::query()->create([
            'user_id' => $user->id,
            'order_number' => 'ORD-REPORT-001',
            'subtotal' => 100000,
            'shipping_cost' => 0,
            'discount' => 0,
            'tax_percent' => 0,
            'tax_amount' => 0,
            'total' => 100000,
            'status' => 'delivered',
            'payment_status' => 'paid',
            'recipient_name' => 'Test User',
            'phone' => '09120000000',
            'address' => 'Test address',
        ]);

        OrderItem::query()->create([
            'order_id' => $paidOrder->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'sku' => $product->sku,
            'quantity' => 2,
            'unit_price' => 50000,
            'total_price' => 100000,
        ]);

        $cancelledOrder = Order::query()->create([
            'user_id' => $user->id,
            'order_number' => 'ORD-REPORT-002',
            'subtotal' => 50000,
            'shipping_cost' => 0,
            'discount' => 0,
            'tax_percent' => 0,
            'tax_amount' => 0,
            'total' => 50000,
            'status' => 'cancelled',
            'payment_status' => 'unpaid',
            'recipient_name' => 'Test User',
            'phone' => '09120000000',
            'address' => 'Test address',
        ]);

        OrderItem::query()->create([
            'order_id' => $cancelledOrder->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'sku' => $product->sku,
            'quantity' => 1,
            'unit_price' => 50000,
            'total_price' => 50000,
        ]);

        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/v1/admin/reports/sales?days=30');

        $response
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.summary.orders_count', 2)
            ->assertJsonPath('data.summary.completed_orders', 1)
            ->assertJsonPath('data.summary.revenue', 100000)
            ->assertJsonPath('data.summary.items_sold', 2)
            ->assertJsonPath('data.top_products.0.product_id', $product->id)
            ->assertJsonPath('data.top_products.0.quantity', 2)
            ->assertJsonPath('data.statuses.cancelled', 1);

        $lowStockIds = collect($response->json('data.low_stock_products'))
            ->pluck('id');

        $this->assertTrue($lowStockIds->contains($product->id));
    }

    public function test_guest_cannot_access_sales_report(): void
    {
        $this->getJson('/api/v1/admin/reports/sales')->assertUnauthorized();
    }

    public function test_regular_user_cannot_access_sales_report(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        Sanctum::actingAs($user);

        $this->getJson('/api/v1/admin/reports/sales')->assertForbidden();
    }
}
