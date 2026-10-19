<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminOrderListingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        Sanctum::actingAs($admin);
    }

    public function test_admin_can_list_orders(): void
    {
        $user = User::factory()->create(['role' => 'user']);

        $this->createOrder($user, 'ORD-LIST-001', 'pending', 'unpaid');
        $this->createOrder($user, 'ORD-LIST-002', 'processing', 'paid');

        $this->getJson('/api/v1/admin/orders')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(2, 'data.data');
    }

    public function test_admin_can_filter_orders_by_status(): void
    {
        $user = User::factory()->create(['role' => 'user']);

        $this->createOrder($user, 'ORD-STATUS-001', 'pending', 'unpaid');
        $this->createOrder($user, 'ORD-STATUS-002', 'processing', 'paid');

        $this->getJson('/api/v1/admin/orders?status=processing')
            ->assertOk()
            ->assertJsonCount(1, 'data.data')
            ->assertJsonPath('data.data.0.order_number', 'ORD-STATUS-002');
    }

    public function test_admin_can_filter_orders_by_payment_status(): void
    {
        $user = User::factory()->create(['role' => 'user']);

        $this->createOrder($user, 'ORD-PAYFILTER-001', 'pending', 'unpaid');
        $this->createOrder($user, 'ORD-PAYFILTER-002', 'processing', 'paid');

        $this->getJson('/api/v1/admin/orders?payment_status=paid')
            ->assertOk()
            ->assertJsonCount(1, 'data.data')
            ->assertJsonPath('data.data.0.order_number', 'ORD-PAYFILTER-002');
    }

    public function test_admin_can_search_orders_by_order_number(): void
    {
        $user = User::factory()->create(['role' => 'user']);

        $this->createOrder($user, 'ORD-SEARCH-ALPHA', 'pending', 'unpaid');
        $this->createOrder($user, 'ORD-SEARCH-BETA', 'processing', 'paid');

        $this->getJson('/api/v1/admin/orders?search=ALPHA')
            ->assertOk()
            ->assertJsonCount(1, 'data.data')
            ->assertJsonPath('data.data.0.order_number', 'ORD-SEARCH-ALPHA');
    }

    public function test_admin_can_view_order_details(): void
    {
        $user = User::factory()->create(['role' => 'user']);

        $order = $this->createOrder(
            $user,
            'ORD-DETAIL-001',
            'pending',
            'unpaid'
        );

        $this->getJson('/api/v1/admin/orders/' . $order->order_number)
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.order_number', 'ORD-DETAIL-001')
            ->assertJsonPath('data.status', 'pending');
    }

    public function test_admin_gets_404_for_missing_order_details(): void
    {
        $this->getJson('/api/v1/admin/orders/ORD-DOES-NOT-EXIST')
            ->assertNotFound()
            ->assertJsonPath('success', false);
    }

    public function test_order_list_rejects_invalid_filters(): void
    {
        $this->getJson(
            '/api/v1/admin/orders?status=invalid&payment_status=invalid'
        )->assertUnprocessable()
            ->assertJsonValidationErrors(['status', 'payment_status']);
    }

    private function createOrder(
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
            'recipient_name' => 'Test Recipient',
            'phone' => '09120000000',
            'address' => 'Test address',
            'postal_code' => null,
            'notes' => null,
        ]);
    }
}
