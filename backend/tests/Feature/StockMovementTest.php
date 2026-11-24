<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\User;
use App\Services\Inventory\StockLedger;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * دفتر «گردش موجودی»: ثبت ردیف با ثبت/لغو سفارش و گزارش پنل.
 */
class StockMovementTest extends TestCase
{
    use RefreshDatabase;

    private function createProduct(int $stock = 5): Product
    {
        $category = Category::query()->create([
            'name' => 'Stock Test Category',
            'slug' => 'stock-test-'.Str::random(8),
            'is_active' => true,
            'sort_order' => 0,
        ]);

        return Product::query()->create([
            'category_id' => $category->id,
            'name' => 'Stock Test Product',
            'slug' => 'stock-test-product-'.Str::random(8),
            'sku' => 'STOCK-TEST-'.Str::random(6),
            'price' => 100000,
            'stock' => $stock,
            'discount_percent' => 0,
            'is_active' => true,
        ]);
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function placeOrder(
        User $user,
        Product $product,
        int $quantity = 1,
        array $overrides = []
    ): TestResponse {
        Sanctum::actingAs($user);

        return $this->withHeader('Idempotency-Key', (string) Str::uuid())
            ->postJson('/api/v1/orders', array_merge([
                'recipient_name' => 'Stock User',
                'phone' => '09120000000',
                'address' => 'Stock address',
                'postal_code' => '1234567890',
                'notes' => null,
                'payment_method' => 'cod',
                'items' => [
                    [
                        'product_id' => $product->id,
                        'quantity' => $quantity,
                    ],
                ],
            ], $overrides));
    }

    public function test_placing_an_order_records_a_decrease_movement(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        $product = $this->createProduct(5);

        $this->placeOrder($user, $product, 2)->assertCreated();

        $order = Order::query()->where('user_id', $user->id)->firstOrFail();

        $this->assertDatabaseHas('stock_movements', [
            'product_id' => $product->id,
            'variant_id' => null,
            'order_id' => $order->id,
            'user_id' => $user->id,
            'type' => StockMovement::TYPE_ORDER,
            'quantity' => -2,
            'stock_after' => 3,
        ]);
    }

    public function test_cancelling_an_order_records_a_restore_movement(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        $product = $this->createProduct(4);

        $this->placeOrder($user, $product)->assertCreated();

        $order = Order::query()->where('user_id', $user->id)->firstOrFail();

        $this->postJson('/api/v1/orders/'.$order->order_number.'/cancel')
            ->assertOk();

        $restored = StockMovement::query()
            ->where('type', StockMovement::TYPE_ORDER_RESTORED)
            ->firstOrFail();

        $this->assertSame($product->id, (int) $restored->product_id);
        $this->assertSame($order->id, (int) $restored->order_id);
        $this->assertSame(1, $restored->quantity);
        $this->assertSame(4, $restored->stock_after);
        $this->assertSame(2, StockMovement::query()->count());
    }

    public function test_zero_quantity_changes_are_not_recorded(): void
    {
        $product = $this->createProduct();

        $movement = app(StockLedger::class)->record(
            (int) $product->id,
            null,
            0,
            StockMovement::TYPE_MANUAL,
            5,
            null,
            null,
            'بدون تغییر',
        );

        $this->assertNull($movement);
        $this->assertSame(0, StockMovement::query()->count());
    }

    public function test_stock_movements_report_lists_and_summarizes_changes(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $user = User::factory()->create(['role' => 'user']);
        $product = $this->createProduct(4);

        $this->placeOrder($user, $product)->assertCreated();

        $order = Order::query()->where('user_id', $user->id)->firstOrFail();

        $this->postJson('/api/v1/orders/'.$order->order_number.'/cancel')
            ->assertOk();

        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/v1/admin/reports/stock-movements?days=7');

        $response
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.summary.decrease_total', -1)
            ->assertJsonPath('data.summary.increase_total', 1)
            ->assertJsonPath('data.meta.total', 2)
            ->assertJsonPath('data.movements.0.type', StockMovement::TYPE_ORDER_RESTORED)
            ->assertJsonPath('data.movements.0.type_label', 'بازگردانی سفارش')
            ->assertJsonPath('data.movements.0.order_number', $order->order_number)
            ->assertJsonPath('data.movements.0.product.id', $product->id)
            ->assertJsonPath('data.movements.1.type', StockMovement::TYPE_ORDER)
            ->assertJsonPath('data.movements.1.quantity', -1);

        $this->assertCount(7, $response->json('data.types'));
    }

    public function test_stock_movements_report_can_filter_by_type(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $user = User::factory()->create(['role' => 'user']);
        $product = $this->createProduct(4);

        $this->placeOrder($user, $product)->assertCreated();

        $order = Order::query()->where('user_id', $user->id)->firstOrFail();

        $this->postJson('/api/v1/orders/'.$order->order_number.'/cancel')
            ->assertOk();

        Sanctum::actingAs($admin);

        $this->getJson(
            '/api/v1/admin/reports/stock-movements?days=7&type='.StockMovement::TYPE_ORDER
        )->assertOk()
            ->assertJsonPath('data.meta.total', 1)
            ->assertJsonPath('data.movements.0.type', StockMovement::TYPE_ORDER)
            ->assertJsonPath('data.summary.decrease_total', -1)
            ->assertJsonPath('data.summary.increase_total', 0);

        $this->getJson('/api/v1/admin/reports/stock-movements?days=7&type=unknown')
            ->assertStatus(422);
    }
}
