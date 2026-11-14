<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Coupon;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * تست‌های آزادسازی خودکار سفارش‌های رهاشده (کامند orders:release-abandoned).
 */
class OrderAbandonedReleaseTest extends TestCase
{
    use RefreshDatabase;

    private function createTestProduct(int $stock = 9): Product
    {
        $category = Category::query()->create([
            'name' => 'Release Test Category',
            'slug' => 'release-test-category-'.Str::random(6),
            'is_active' => true,
            'sort_order' => 0,
        ]);

        return Product::query()->create([
            'category_id' => $category->id,
            'name' => 'Release Test Product',
            'slug' => 'release-test-product-'.Str::random(6),
            'sku' => 'RELEASE-TEST-'.Str::random(6),
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
        int $quantity = 1,
        ?int $ageMinutes = null
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

        if ($ageMinutes !== null) {
            $order->forceFill([
                'created_at' => now()->subMinutes($ageMinutes),
            ])->save();
        }

        return $order;
    }

    public function test_abandoned_pending_order_is_cancelled_and_stock_restored(): void
    {
        $user = User::factory()->create(['role' => 'user']);

        $product = $this->createTestProduct(stock: 8);

        $order = $this->createTestOrder(
            user: $user,
            product: $product,
            orderNumber: 'ORD-RELEASE-001',
            ageMinutes: 90,
        );

        $this->artisan('orders:release-abandoned')
            ->assertSuccessful();

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'status' => 'cancelled',
            'payment_status' => 'unpaid',
        ]);

        $this->assertNotNull($order->fresh()->stock_restored_at);

        $this->assertSame(9, (int) $product->fresh()->stock);
    }

    public function test_releasing_abandoned_order_releases_the_coupon_usage_slot(): void
    {
        $user = User::factory()->create(['role' => 'user']);

        $product = $this->createTestProduct(stock: 8);

        $coupon = Coupon::query()->create([
            'code' => 'RELEASE10',
            'type' => 'fixed',
            'value' => 10000,
            'usage_limit' => 5,
            'used_count' => 1,
            'is_active' => true,
        ]);

        $order = $this->createTestOrder(
            user: $user,
            product: $product,
            orderNumber: 'ORD-RELEASE-010',
            ageMinutes: 90,
        );

        $order->forceFill([
            'coupon_code' => $coupon->code,
            'coupon_discount' => 10000,
            'discount' => 10000,
            'total' => 90000,
        ])->save();

        $this->artisan('orders:release-abandoned')
            ->assertSuccessful();

        $this->assertSame('cancelled', $order->fresh()->status);
        $this->assertSame(0, (int) $coupon->fresh()->used_count);
    }

    public function test_recent_pending_order_is_not_touched(): void
    {
        $user = User::factory()->create(['role' => 'user']);

        $product = $this->createTestProduct(stock: 8);

        $order = $this->createTestOrder(
            user: $user,
            product: $product,
            orderNumber: 'ORD-RELEASE-002',
            ageMinutes: 5,
        );

        $this->artisan('orders:release-abandoned')
            ->assertSuccessful();

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'status' => 'pending',
            'payment_status' => 'unpaid',
        ]);

        $this->assertNull($order->fresh()->stock_restored_at);

        $this->assertSame(8, (int) $product->fresh()->stock);
    }

    public function test_respects_custom_minutes_option(): void
    {
        $user = User::factory()->create(['role' => 'user']);

        $product = $this->createTestProduct(stock: 8);

        $order = $this->createTestOrder(
            user: $user,
            product: $product,
            orderNumber: 'ORD-RELEASE-003',
            ageMinutes: 6,
        );

        $this->artisan('orders:release-abandoned', ['--minutes' => 5])
            ->assertSuccessful();

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'status' => 'cancelled',
        ]);

        $this->assertSame(9, (int) $product->fresh()->stock);
    }

    public function test_paid_and_processing_orders_are_not_released(): void
    {
        $user = User::factory()->create(['role' => 'user']);

        $product = $this->createTestProduct(stock: 8);

        $paidOrder = $this->createTestOrder(
            user: $user,
            product: $product,
            orderNumber: 'ORD-RELEASE-004',
            paymentStatus: 'paid',
            status: 'processing',
            ageMinutes: 120,
        );

        $this->artisan('orders:release-abandoned')
            ->assertSuccessful();

        $this->assertDatabaseHas('orders', [
            'id' => $paidOrder->id,
            'status' => 'processing',
            'payment_status' => 'paid',
        ]);

        $this->assertNull($paidOrder->fresh()->stock_restored_at);

        $this->assertSame(8, (int) $product->fresh()->stock);
    }

    public function test_second_run_does_not_restore_stock_twice(): void
    {
        $user = User::factory()->create(['role' => 'user']);

        $product = $this->createTestProduct(stock: 8);

        $order = $this->createTestOrder(
            user: $user,
            product: $product,
            orderNumber: 'ORD-RELEASE-005',
            ageMinutes: 90,
        );

        $this->artisan('orders:release-abandoned')->assertSuccessful();

        $this->assertSame(9, (int) $product->fresh()->stock);

        $this->artisan('orders:release-abandoned')->assertSuccessful();

        $this->assertSame(9, (int) $product->fresh()->stock);

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'status' => 'cancelled',
        ]);
    }

    public function test_variant_stock_is_restored(): void
    {
        $user = User::factory()->create(['role' => 'user']);

        $product = $this->createTestProduct(stock: 7);

        $variant = ProductVariant::query()->create([
            'product_id' => $product->id,
            'name' => 'بسته‌بندی بزرگ',
            'sku' => 'RELEASE-VAR-'.Str::random(6),
            'price' => 120000,
            'stock' => 4,
            'is_active' => true,
        ]);

        $order = Order::query()->create([
            'user_id' => $user->id,
            'order_number' => 'ORD-RELEASE-006',
            'subtotal' => 120000,
            'shipping_cost' => 0,
            'discount' => 0,
            'tax_percent' => 0,
            'tax_amount' => 0,
            'total' => 120000,
            'status' => 'pending',
            'payment_status' => 'unpaid',
            'recipient_name' => 'Test User',
            'phone' => '09120000000',
            'address' => 'Test address',
        ]);

        OrderItem::query()->create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'variant_id' => $variant->id,
            'product_name' => $product->name,
            'variant_name' => $variant->name,
            'sku' => $variant->sku,
            'quantity' => 2,
            'unit_price' => 120000,
            'total_price' => 240000,
        ]);

        $order->forceFill([
            'created_at' => now()->subMinutes(90),
        ])->save();

        $this->artisan('orders:release-abandoned')
            ->assertSuccessful();

        $this->assertSame(6, (int) $variant->fresh()->stock);

        $this->assertSame(7, (int) $product->fresh()->stock);
    }

    public function test_dry_run_does_not_change_anything(): void
    {
        $user = User::factory()->create(['role' => 'user']);

        $product = $this->createTestProduct(stock: 8);

        $order = $this->createTestOrder(
            user: $user,
            product: $product,
            orderNumber: 'ORD-RELEASE-007',
            ageMinutes: 90,
        );

        $this->artisan('orders:release-abandoned', ['--dry-run' => true])
            ->assertSuccessful();

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'status' => 'pending',
        ]);

        $this->assertNull($order->fresh()->stock_restored_at);

        $this->assertSame(8, (int) $product->fresh()->stock);
    }
}
