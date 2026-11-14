<?php

namespace Tests\Feature;

use App\Models\Coupon;
use App\Models\Order;
use App\Models\ReturnRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReturnRequestTest extends TestCase
{
    use RefreshDatabase;

    private function createOrder(
        User $user,
        string $orderNumber,
        string $status = 'delivered',
        string $paymentStatus = 'paid',
        string $phone = '09120000000'
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
            'phone' => $phone,
            'address' => 'Test address',
            'postal_code' => null,
            'notes' => null,
        ]);
    }

    public function test_customer_can_request_return_for_delivered_paid_order(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        $order = $this->createOrder($user, 'ORD-RETURN-001');

        Sanctum::actingAs($user);

        $this->postJson("/api/v1/orders/{$order->order_number}/returns", [
            'reason' => 'سایز نامناسب',
            'description' => 'سایز کوچک بود.',
        ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.reason', 'سایز نامناسب');

        $this->assertDatabaseHas('return_requests', [
            'order_id' => $order->id,
            'user_id' => $user->id,
            'status' => 'pending',
        ]);
    }

    public function test_customer_cannot_submit_duplicate_return_request(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        $order = $this->createOrder($user, 'ORD-RETURN-002');

        ReturnRequest::query()->create([
            'order_id' => $order->id,
            'user_id' => $user->id,
            'status' => 'pending',
            'reason' => 'اولین درخواست',
        ]);

        Sanctum::actingAs($user);

        $this->postJson("/api/v1/orders/{$order->order_number}/returns", [
            'reason' => 'درخواست دوم',
        ])
            ->assertStatus(422)
            ->assertJsonPath('success', false);
    }

    public function test_return_request_requires_delivered_order(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        $order = $this->createOrder($user, 'ORD-RETURN-003', 'processing');

        Sanctum::actingAs($user);

        $this->postJson("/api/v1/orders/{$order->order_number}/returns", [
            'reason' => 'انصراف',
        ])->assertStatus(422);
    }

    public function test_other_users_cannot_request_return_for_order(): void
    {
        $owner = User::factory()->create(['role' => 'user']);
        $other = User::factory()->create(['role' => 'user']);
        $order = $this->createOrder($owner, 'ORD-RETURN-004');

        Sanctum::actingAs($other);

        $this->postJson("/api/v1/orders/{$order->order_number}/returns", [
            'reason' => 'دسترسی غیرمجاز',
        ])->assertNotFound();
    }

    public function test_admin_can_refund_return_request(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $user = User::factory()->create(['role' => 'user']);
        $order = $this->createOrder($user, 'ORD-RETURN-005');

        $returnRequest = ReturnRequest::query()->create([
            'order_id' => $order->id,
            'user_id' => $user->id,
            'status' => 'pending',
            'reason' => 'خرابی محصول',
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/admin/returns')
            ->assertOk()
            ->assertJsonFragment(['id' => $returnRequest->id]);

        $this->patchJson(
            "/api/v1/admin/returns/{$returnRequest->id}/status",
            [
                'status' => 'refunded',
                'admin_note' => 'مبلغ به حساب مشتری بازگشت.',
            ]
        )
            ->assertOk()
            ->assertJsonPath('data.status', 'refunded')
            ->assertJsonPath('data.refund_amount', '100000.00');

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'payment_status' => 'refunded',
        ]);
    }

    public function test_refunding_a_returned_order_releases_the_coupon_usage_slot(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $user = User::factory()->create(['role' => 'user']);
        $order = $this->createOrder($user, 'ORD-RETURN-010');

        $coupon = Coupon::query()->create([
            'code' => 'RETURN10',
            'type' => 'fixed',
            'value' => 10000,
            'usage_limit' => 5,
            'used_count' => 1,
            'is_active' => true,
        ]);

        $order->forceFill([
            'coupon_code' => $coupon->code,
            'coupon_discount' => 10000,
            'discount' => 10000,
        ])->save();

        $returnRequest = ReturnRequest::query()->create([
            'order_id' => $order->id,
            'user_id' => $user->id,
            'status' => 'pending',
            'reason' => 'انصراف از خرید',
        ]);

        Sanctum::actingAs($admin);

        $this->patchJson(
            "/api/v1/admin/returns/{$returnRequest->id}/status",
            ['status' => 'refunded']
        )->assertOk()
            ->assertJsonPath('data.status', 'refunded');

        $this->assertSame(0, (int) $coupon->fresh()->used_count);
    }

    public function test_customer_can_list_own_return_requests(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        $order = $this->createOrder($user, 'ORD-RETURN-006');

        ReturnRequest::query()->create([
            'order_id' => $order->id,
            'user_id' => $user->id,
            'status' => 'approved',
            'reason' => 'تغییر نظر',
        ]);

        Sanctum::actingAs($user);

        $this->getJson('/api/v1/returns')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.status', 'approved');
    }

    public function test_admin_returns_index_exposes_customer_and_order_contact_phone(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $user = User::factory()->create([
            'role' => 'user',
            'name' => 'مریم رضایی',
            'email' => 'maryam.return@example.com',
        ]);

        $order = $this->createOrder(
            $user,
            'ORD-RETURN-007',
            'delivered',
            'paid',
            '09121112233'
        );

        $returnRequest = ReturnRequest::query()->create([
            'order_id' => $order->id,
            'user_id' => $user->id,
            'status' => 'pending',
            'reason' => 'بسته‌بندی آسیب‌دیده',
        ]);

        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/v1/admin/returns')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $returnRequest->id)
            ->assertJsonPath('data.0.user.name', 'مریم رضایی')
            ->assertJsonPath('data.0.user.email', 'maryam.return@example.com')
            ->assertJsonPath('data.0.order.phone', '09121112233');

        // جدول users ستون phone ندارد؛ شماره تماس فقط از سفارش خوانده می‌شود.
        $this->assertArrayNotHasKey('phone', $response->json('data.0.user'));
    }

    public function test_admin_can_search_return_requests_by_contact_phone_and_customer_email(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $firstUser = User::factory()->create([
            'role' => 'user',
            'email' => 'first.return@example.com',
        ]);
        $secondUser = User::factory()->create([
            'role' => 'user',
            'email' => 'second.return@example.com',
        ]);

        $matching = ReturnRequest::query()->create([
            'order_id' => $this->createOrder(
                $firstUser,
                'ORD-RETURN-008',
                'delivered',
                'paid',
                '09355550000'
            )->id,
            'user_id' => $firstUser->id,
            'status' => 'pending',
            'reason' => 'کالای اشتباه ارسال شده',
        ]);

        ReturnRequest::query()->create([
            'order_id' => $this->createOrder(
                $secondUser,
                'ORD-RETURN-009',
                'delivered',
                'paid',
                '09127770000'
            )->id,
            'user_id' => $secondUser->id,
            'status' => 'pending',
            'reason' => 'کالای اشتباه ارسال شده',
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/admin/returns?search=09355550000')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $matching->id);

        $this->getJson('/api/v1/admin/returns?search=first.return@example.com')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $matching->id);
    }
}
