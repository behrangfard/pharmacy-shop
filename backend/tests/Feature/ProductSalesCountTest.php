<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * شمارندهٔ فروش محصولات (`products.sales_count`).
 *
 * مرتب‌سازی «پرفروش‌ترین» و ستون فروش در آمار علاقه‌مندی‌ها به همین عدد وابسته
 * است؛ این تست‌ها تضمین می‌کنند با ثبت سفارش بالا برود و با هر مسیر لغو
 * (مشتری، مدیر، آزادسازی خودکار) دقیقاً یک‌بار برگردد و منفی نشود.
 */
class ProductSalesCountTest extends TestCase
{
    use RefreshDatabase;

    private function createProduct(int $stock = 10, int $salesCount = 0): Product
    {
        $category = Category::query()->create([
            'name' => 'Sales Count Category',
            'slug' => 'sales-count-'.Str::random(8),
            'is_active' => true,
            'sort_order' => 0,
        ]);

        return Product::query()->create([
            'category_id' => $category->id,
            'name' => 'Sales Count Product',
            'slug' => 'sales-count-product-'.Str::random(8),
            'sku' => 'SALES-'.Str::random(6),
            'price' => 100000,
            'stock' => $stock,
            'discount_percent' => 0,
            'is_active' => true,
            'sales_count' => $salesCount,
        ]);
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function placeOrder(
        User $user,
        Product $product,
        int $quantity = 1,
        ?ProductVariant $variant = null,
        array $overrides = []
    ): TestResponse {
        Sanctum::actingAs($user);

        $item = [
            'product_id' => $product->id,
            'quantity' => $quantity,
        ];

        if ($variant !== null) {
            $item['variant_id'] = $variant->id;
        }

        return $this->withHeader('Idempotency-Key', (string) Str::uuid())
            ->postJson('/api/v1/orders', array_merge([
                'recipient_name' => 'Test User',
                'phone' => '09120000000',
                'address' => 'Test address',
                'postal_code' => '1234567890',
                'notes' => null,
                'payment_method' => 'cod',
                'items' => [$item],
            ], $overrides));
    }

    private function createManualOrder(
        Product $product,
        string $orderNumber,
        string $status = 'pending',
        int $quantity = 1
    ): Order {
        $order = Order::query()->create([
            'order_number' => $orderNumber,
            'subtotal' => 100000 * $quantity,
            'shipping_cost' => 0,
            'discount' => 0,
            'tax_percent' => 0,
            'tax_amount' => 0,
            'total' => 100000 * $quantity,
            'status' => $status,
            'payment_status' => $status === 'delivered' ? 'paid' : 'unpaid',
            'payment_method' => 'online',
            'recipient_name' => 'Test User',
            'phone' => '09120000000',
            'address' => 'Test address',
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

    public function test_placing_order_increases_product_sales_count(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        $product = $this->createProduct(stock: 10);

        $this->assertSame(0, (int) $product->fresh()->sales_count);

        $response = $this->placeOrder($user, $product, quantity: 2);

        $response->assertCreated()->assertJsonPath('success', true);

        $this->assertSame(2, (int) $product->fresh()->sales_count);
        $this->assertSame(8, (int) $product->fresh()->stock);
    }

    public function test_placing_variant_order_increases_parent_product_sales_count(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        $product = $this->createProduct(stock: 10);

        $variant = ProductVariant::query()->create([
            'product_id' => $product->id,
            'name' => 'بستهٔ دوعددی',
            'sku' => 'SALES-VAR-'.Str::random(6),
            'price' => 100000,
            'stock' => 5,
            'is_active' => true,
        ]);

        $response = $this->placeOrder(
            $user,
            $product,
            quantity: 3,
            variant: $variant
        );

        $response->assertCreated();

        // شمارنده روی محصول اصلی است، نه تنوع.
        $this->assertSame(3, (int) $product->fresh()->sales_count);
        $this->assertSame(2, (int) $variant->fresh()->stock);
    }

    public function test_customer_cancellation_reverts_sales_count(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        $product = $this->createProduct(stock: 10);

        $this->placeOrder($user, $product, quantity: 2)->assertCreated();

        $orderNumber = Order::query()->latest('id')->value('order_number');

        $this->assertSame(2, (int) $product->fresh()->sales_count);

        $this->postJson('/api/v1/orders/'.$orderNumber.'/cancel')
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertSame(0, (int) $product->fresh()->sales_count);
        $this->assertSame(10, (int) $product->fresh()->stock);
    }

    public function test_admin_cancellation_reverts_sales_count(): void
    {
        $customer = User::factory()->create(['role' => 'user']);
        $admin = User::factory()->create(['role' => 'admin']);
        $product = $this->createProduct(stock: 10);

        $response = $this->placeOrder($customer, $product, quantity: 2);
        $response->assertCreated();

        $orderNumber = (string) $response->json('data.order_number');

        $this->assertSame(2, (int) $product->fresh()->sales_count);

        Sanctum::actingAs($admin);

        $this->patchJson(
            '/api/v1/admin/orders/'.$orderNumber.'/status',
            ['status' => 'cancelled']
        )->assertOk()
            ->assertJsonPath('success', true);

        $this->assertSame(0, (int) $product->fresh()->sales_count);
        $this->assertSame(10, (int) $product->fresh()->stock);
    }

    public function test_abandoned_order_release_reverts_sales_count(): void
    {
        $product = $this->createProduct(stock: 8, salesCount: 2);

        $order = $this->createManualOrder(
            $product,
            'ORD-SALES-ABANDON-001',
            status: 'pending',
            quantity: 2
        );

        // سفارش باید از مهلت پیش‌فرض کامند (۶۰ دقیقه) قدیمی‌تر باشد.
        $order->forceFill(['created_at' => now()->subHours(2)])->save();

        $this->artisan('orders:release-abandoned')->assertSuccessful();

        $order->refresh();

        $this->assertSame('cancelled', $order->status);
        $this->assertNotNull($order->stock_restored_at);
        $this->assertSame(0, (int) $product->fresh()->sales_count);
        $this->assertSame(10, (int) $product->fresh()->stock);
    }

    public function test_sales_count_never_below_zero(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        $product = $this->createProduct(stock: 5, salesCount: 0);

        $order = $this->createManualOrder(
            $product,
            'ORD-SALES-NEGATIVE-001',
            quantity: 2
        );

        $order->forceFill(['user_id' => $user->id])->save();

        Sanctum::actingAs($user);

        $this->postJson('/api/v1/orders/'.$order->order_number.'/cancel')
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertSame(0, (int) $product->fresh()->sales_count);
    }

    public function test_sync_command_rebuilds_sales_count_from_orders(): void
    {
        $product = $this->createProduct(stock: 20, salesCount: 99);

        $this->createManualOrder(
            $product,
            'ORD-SALES-SYNC-001',
            status: 'delivered',
            quantity: 2
        );

        $this->createManualOrder(
            $product,
            'ORD-SALES-SYNC-002',
            status: 'cancelled',
            quantity: 5
        );

        // dry-run نباید چیزی را تغییر بدهد.
        $this->artisan('products:sync-sales-count', ['--dry-run' => true])
            ->assertSuccessful();

        $this->assertSame(99, (int) $product->fresh()->sales_count);

        $this->artisan('products:sync-sales-count')->assertSuccessful();

        // فقط سفارش لغونشده شمرده می‌شود: ۲ عدد.
        $this->assertSame(2, (int) $product->fresh()->sales_count);
    }
}
