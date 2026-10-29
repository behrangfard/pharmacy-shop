<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminOrderStatusTest extends TestCase
{
    use RefreshDatabase;

    public function test_unpaid_order_cannot_be_moved_to_processing(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        $order = $this->createTestOrder(
            $admin,
            'ORD-TEST-UNPAID-001',
            'pending',
            'unpaid'
        );

        Sanctum::actingAs($admin);

        $response = $this->patchJson(
            '/api/v1/admin/orders/' . $order->order_number . '/status',
            ['status' => 'processing']
        );

        $response->assertStatus(422);

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'status' => 'pending',
            'payment_status' => 'unpaid',
        ]);
    }

    public function test_unpaid_order_cannot_be_cancelled_from_admin_panel(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        $order = $this->createTestOrder(
            $admin,
            'ORD-TEST-UNPAID-CANCEL-001',
            'pending',
            'unpaid'
        );

        Sanctum::actingAs($admin);

        $response = $this->patchJson(
            '/api/v1/admin/orders/' . $order->order_number . '/status',
            ['status' => 'cancelled']
        );

        $response->assertStatus(422);

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'status' => 'pending',
            'payment_status' => 'unpaid',
        ]);
    }

    public function test_paid_order_can_be_moved_to_processing(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        $order = $this->createTestOrder(
            $admin,
            'ORD-TEST-PAID-001',
            'pending',
            'paid'
        );

        Sanctum::actingAs($admin);

        $response = $this->patchJson(
            '/api/v1/admin/orders/' . $order->order_number . '/status',
            ['status' => 'processing']
        );

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'processing');

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'status' => 'processing',
            'payment_status' => 'paid',
        ]);
    }

    public function test_admin_cannot_mark_order_as_paid_through_status_endpoint(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        $order = $this->createTestOrder(
            $admin,
            'ORD-TEST-FORGED-PAYMENT-001',
            'pending',
            'unpaid'
        );

        Sanctum::actingAs($admin);

        $response = $this->patchJson(
            '/api/v1/admin/orders/' . $order->order_number . '/status',
            [
                'status' => 'processing',
                'payment_status' => 'paid',
            ]
        );

        $response->assertStatus(422);

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'status' => 'pending',
            'payment_status' => 'unpaid',
        ]);
    }

    public function test_regular_user_cannot_access_admin_orders_list(): void
    {
        $user = User::factory()->create([
            'role' => 'user',
        ]);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/v1/admin/orders');

        $response->assertForbidden()
            ->assertJsonPath('success', false);
    }

    public function test_regular_user_cannot_change_order_status(): void
    {
        $user = User::factory()->create([
            'role' => 'user',
        ]);

        $order = $this->createTestOrder(
            $user,
            'ORD-TEST-USER-FORBIDDEN-001',
            'pending',
            'paid'
        );

        Sanctum::actingAs($user);

        $response = $this->patchJson(
            '/api/v1/admin/orders/' . $order->order_number . '/status',
            ['status' => 'processing']
        );

        $response->assertForbidden()
            ->assertJsonPath('success', false);

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'status' => 'pending',
            'payment_status' => 'paid',
        ]);
    }

    public function test_guest_cannot_access_admin_orders_list(): void
    {
        $response = $this->getJson('/api/v1/admin/orders');

        $response->assertUnauthorized();
    }

    public function test_guest_cannot_change_order_status(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        $order = $this->createTestOrder(
            $admin,
            'ORD-TEST-GUEST-FORBIDDEN-001',
            'pending',
            'paid'
        );

        $response = $this->patchJson(
            '/api/v1/admin/orders/' . $order->order_number . '/status',
            ['status' => 'processing']
        );

        $response->assertUnauthorized();

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'status' => 'pending',
            'payment_status' => 'paid',
        ]);
    }

    private function createTestOrder(
        User $user,
        string $orderNumber,
        string $status,
        string $paymentStatus
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
}
