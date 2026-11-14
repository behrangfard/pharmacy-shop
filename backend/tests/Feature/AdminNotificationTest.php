<?php

namespace Tests\Feature;

use App\Models\AdminNotification;
use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * زنگولهٔ اعلان پنل مدیریت.
 */
class AdminNotificationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // در این تست‌ها هیچ پیام بیرونی ارسال نشود.
        config([
            'messaging.channels.sms.enabled' => false,
            'messaging.channels.telegram.enabled' => false,
            'messaging.channels.whatsapp.enabled' => false,
            'messaging.channels.bale.enabled' => false,
        ]);
    }

    private function admin(): User
    {
        $admin = User::factory()->create(['role' => 'admin']);

        Sanctum::actingAs($admin);

        return $admin;
    }

    private function createOrder(string $status = 'pending'): Order
    {
        return Order::query()->create([
            'user_id' => User::factory()->create(['role' => 'customer'])->id,
            'order_number' => 'ORD-NOTIFY-' . uniqid(),
            'recipient_name' => 'علی رضایی',
            'phone' => '09121234567',
            'address' => 'تهران',
            'subtotal' => 150000,
            'shipping_cost' => 0,
            'discount' => 0,
            'total' => 150000,
            'status' => $status,
            'payment_status' => 'paid',
        ]);
    }

    public function test_notification_endpoints_are_admin_only(): void
    {
        $this->getJson('/api/v1/admin/notifications')->assertUnauthorized();

        $notification = AdminNotification::create([
            'type' => AdminNotification::TYPE_ORDER,
            'title' => 'سفارش جدید ثبت شد',
        ]);

        Sanctum::actingAs(User::factory()->create(['role' => 'customer']));

        $this->getJson('/api/v1/admin/notifications')->assertForbidden();
        $this->postJson('/api/v1/admin/notifications/read-all')->assertForbidden();
        $this->postJson("/api/v1/admin/notifications/{$notification->id}/read")
            ->assertForbidden();
    }

    public function test_order_status_change_creates_notification(): void
    {
        $this->admin();

        $order = $this->createOrder();

        $this->patchJson(
            "/api/v1/admin/orders/{$order->order_number}/status",
            ['status' => 'processing']
        )->assertOk();

        $this->assertDatabaseHas('admin_notifications', [
            'type' => AdminNotification::TYPE_ORDER_STATUS,
            'read_at' => null,
        ]);

        $response = $this->getJson('/api/v1/admin/notifications');

        $response->assertOk()
            ->assertJsonPath('data.unread_count', 1)
            ->assertJsonCount(1, 'data.items')
            ->assertJsonPath('data.items.0.type', AdminNotification::TYPE_ORDER_STATUS)
            ->assertJsonPath('data.items.0.read', false)
            ->assertJsonPath('data.items.0.url', '/admin/orders');

        $this->assertStringContainsString(
            $order->order_number,
            (string) $response->json('data.items.0.title')
        );
    }

    public function test_marking_notification_as_read_updates_unread_counter(): void
    {
        $this->admin();

        $notification = AdminNotification::create([
            'type' => AdminNotification::TYPE_ORDER,
            'title' => 'سفارش جدید ثبت شد',
            'body' => 'ORD-TEST • 150,000 تومان',
            'url' => '/admin/orders',
        ]);

        $this->postJson("/api/v1/admin/notifications/{$notification->id}/read")
            ->assertOk()
            ->assertJsonPath('data.unread_count', 0)
            ->assertJsonPath('data.item.read', true);

        $this->assertNotNull($notification->fresh()->read_at);

        // خواندن دوباره نباید خطا بدهد و زمان خوانده‌شدن را عوض کند.
        $firstReadAt = $notification->fresh()->read_at;

        $this->postJson("/api/v1/admin/notifications/{$notification->id}/read")
            ->assertOk()
            ->assertJsonPath('data.unread_count', 0);

        $this->assertTrue($firstReadAt->equalTo($notification->fresh()->read_at));
    }

    public function test_mark_all_notifications_as_read(): void
    {
        $this->admin();

        foreach (range(1, 3) as $index) {
            AdminNotification::create([
                'type' => AdminNotification::TYPE_RETURN,
                'title' => "درخواست مرجوعی {$index}",
                'url' => '/admin/returns',
            ]);
        }

        $this->getJson('/api/v1/admin/notifications')
            ->assertOk()
            ->assertJsonPath('data.unread_count', 3);

        $this->postJson('/api/v1/admin/notifications/read-all')
            ->assertOk()
            ->assertJsonPath('data.unread_count', 0)
            ->assertJsonPath('data.updated', 3);

        $this->assertSame(
            0,
            AdminNotification::query()->whereNull('read_at')->count()
        );
    }

    public function test_support_message_creates_notification(): void
    {
        $this->admin();

        $this->postJson('/api/v1/support/conversations', [
            'name' => 'مهمان تست',
            'contact' => '09120000000',
            'message' => 'سلام، درباره سفارشم سؤال داشتم.',
        ])->assertCreated();

        $response = $this->getJson('/api/v1/admin/notifications');

        $response->assertOk()
            ->assertJsonPath('data.unread_count', 1)
            ->assertJsonPath('data.items.0.type', AdminNotification::TYPE_SUPPORT)
            ->assertJsonPath('data.items.0.url', '/admin/support');
    }

    public function test_new_order_creates_notification(): void
    {
        $customer = User::factory()->create(['role' => 'customer']);

        $category = Category::query()->create([
            'name' => 'دستهٔ تست اعلان',
            'slug' => 'notification-test-category',
            'is_active' => true,
            'sort_order' => 0,
        ]);

        $product = Product::query()->create([
            'category_id' => $category->id,
            'name' => 'محصول تست اعلان',
            'slug' => 'notification-test-product',
            'sku' => 'NOTIFY-TEST-001',
            'price' => 100000,
            'stock' => 5,
            'discount_percent' => 0,
            'is_active' => true,
            'is_taxable' => false,
        ]);

        Sanctum::actingAs($customer);

        $this->withHeader('Idempotency-Key', '550e8400-e29b-41d4-a716-446655440777')
            ->postJson('/api/v1/orders', [
                'recipient_name' => 'مشتری تست',
                'phone' => '09120000000',
                'address' => 'تهران',
                'items' => [
                    ['product_id' => $product->id, 'quantity' => 1],
                ],
            ])
            ->assertCreated();

        $notification = AdminNotification::query()
            ->where('type', AdminNotification::TYPE_ORDER)
            ->sole();

        $this->assertSame('/admin/orders', $notification->url);
        $this->assertNull($notification->read_at);
        $this->assertStringContainsString('سفارش جدید', $notification->title);
    }
}
