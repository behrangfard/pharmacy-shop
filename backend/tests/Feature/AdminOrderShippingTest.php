<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminOrderShippingTest extends TestCase
{
    use RefreshDatabase;

    private function createOrder(
        User $user,
        string $orderNumber,
        string $status = 'processing',
        string $paymentStatus = 'paid'
    ): Order {
        return Order::query()->create([
            'user_id' => $user->id,
            'order_number' => $orderNumber,
            'subtotal' => 100000,
            'shipping_cost' => 0,
            'discount' => 0,
            'total' => 100000,
            'status' => $status,
            'payment_status' => $paymentStatus,
            'recipient_name' => 'Test User',
            'phone' => '09120000000',
            'address' => 'Test address',
            'postal_code' => null,
            'notes' => null,
        ]);
    }

    public function test_admin_can_store_tracking_information(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $order = $this->createOrder($admin, 'ORD-SHIPPING-TEST-001');

        Sanctum::actingAs($admin);

        $this->patchJson(
            "/api/v1/admin/orders/{$order->order_number}/shipping",
            [
                'shipping_method' => 'پست پیشتاز',
                'tracking_code' => 'TRK-123456',
            ]
        )
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.tracking_code', 'TRK-123456')
            ->assertJsonPath('data.shipping_method', 'پست پیشتاز');

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'tracking_code' => 'TRK-123456',
            'shipping_method' => 'پست پیشتاز',
            'status' => 'processing',
        ]);
    }

    public function test_marking_order_as_shipped_sets_shipped_timestamp(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $order = $this->createOrder($admin, 'ORD-SHIPPING-TEST-002');

        Sanctum::actingAs($admin);

        $this->patchJson(
            "/api/v1/admin/orders/{$order->order_number}/shipping",
            [
                'tracking_code' => 'TRK-999',
                'mark_shipped' => true,
            ]
        )
            ->assertOk()
            ->assertJsonPath('data.status', 'shipped');

        $fresh = $order->fresh();

        $this->assertSame('shipped', $fresh->status);
        $this->assertNotNull($fresh->shipped_at);
    }

    public function test_cancelled_order_cannot_receive_tracking_information(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $order = $this->createOrder(
            $admin,
            'ORD-SHIPPING-TEST-003',
            'cancelled',
            'unpaid'
        );

        Sanctum::actingAs($admin);

        $this->patchJson(
            "/api/v1/admin/orders/{$order->order_number}/shipping",
            ['tracking_code' => 'TRK-000']
        )->assertStatus(422);
    }

    public function test_delivered_status_records_delivered_timestamp(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $order = $this->createOrder($admin, 'ORD-SHIPPING-TEST-004');
        $order->update(['status' => 'shipped', 'shipped_at' => now()]);

        Sanctum::actingAs($admin);

        $this->patchJson(
            "/api/v1/admin/orders/{$order->order_number}/status",
            ['status' => 'delivered']
        )
            ->assertOk()
            ->assertJsonPath('data.status', 'delivered');

        $this->assertNotNull($order->fresh()->delivered_at);
    }

    public function test_guest_cannot_set_tracking_information(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $order = $this->createOrder($admin, 'ORD-SHIPPING-TEST-005');

        $this->patchJson(
            "/api/v1/admin/orders/{$order->order_number}/shipping",
            ['tracking_code' => 'TRK-404']
        )->assertUnauthorized();
    }
}
