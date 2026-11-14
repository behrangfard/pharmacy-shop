<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\OutboundMessage;
use App\Models\StoreSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * پیامک خودکار تغییر وضعیت سفارش.
 */
class OrderStatusSmsTest extends TestCase
{
    use RefreshDatabase;

    /** پاسخ ساختگی سرویس پیامک (بدنه و کد وضعیت). */
    private array $smsResponse = [
        ['return' => ['status' => 200], 'entries' => [['messageid' => 98765]]],
        200,
    ];

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'messaging.timeout' => 5,

            'messaging.channels.sms.enabled' => true,
            'messaging.channels.sms.driver' => 'kavenegar',
            'messaging.channels.sms.api_key' => 'sms-test-key',
            'messaging.channels.sms.sender' => '10004346',
            'messaging.channels.sms.base_url' => 'https://api.kavenegar.com',
        ]);

        Http::fake([
            'api.kavenegar.com/*' => fn () => Http::response(
                $this->smsResponse[0],
                $this->smsResponse[1]
            ),
        ]);
    }

    private function admin(): User
    {
        $admin = User::factory()->create(['role' => 'admin']);

        Sanctum::actingAs($admin);

        return $admin;
    }

    private function enableAutomation(
        string $statuses = 'processing,shipped,delivered,cancelled'
    ): void {
        StoreSetting::setValue('order_status_sms_enabled', '1');
        StoreSetting::setValue('order_status_sms_statuses', $statuses);
        StoreSetting::setValue(
            'order_status_sms_template',
            '{name} عزیز، وضعیت سفارش {order} به «{status}» تغییر کرد. کد رهگیری: {tracking}'
        );
    }

    private function createOrder(
        string $status = 'pending',
        string $paymentStatus = 'paid',
        string $phone = '09121112233'
    ): Order {
        return Order::query()->create([
            'user_id' => User::factory()->create(['role' => 'customer'])->id,
            'order_number' => 'ORD-SMS-' . uniqid(),
            'recipient_name' => 'زهرا محمدی',
            'phone' => $phone,
            'address' => 'تهران، خیابان تست',
            'subtotal' => 250000,
            'shipping_cost' => 0,
            'discount' => 0,
            'total' => 250000,
            'status' => $status,
            'payment_status' => $paymentStatus,
        ]);
    }

    public function test_order_status_settings_endpoint_returns_defaults(): void
    {
        $this->admin();

        $response = $this->getJson('/api/v1/admin/messaging/order-status');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.settings.enabled', false)
            ->assertJsonPath('data.settings.statuses', [
                'processing',
                'shipped',
                'delivered',
                'cancelled',
            ])
            ->assertJsonPath('data.sms_available', true)
            ->assertJsonCount(5, 'data.statuses');
    }

    public function test_admin_can_save_order_status_settings(): void
    {
        $this->admin();

        $this->putJson('/api/v1/admin/messaging/order-status', [
            'enabled' => true,
            'statuses' => ['shipped', 'delivered'],
            'template' => 'سلام {name}، سفارش {order} «{status}» شد.',
        ])
            ->assertOk()
            ->assertJsonPath('data.settings.enabled', true)
            ->assertJsonPath('data.settings.statuses', ['shipped', 'delivered']);

        $this->assertDatabaseHas('store_settings', [
            'key' => 'order_status_sms_enabled',
            'value' => '1',
        ]);
    }

    public function test_status_change_sends_sms_to_customer(): void
    {
        $this->admin();
        $this->enableAutomation();

        $order = $this->createOrder();

        $response = $this->patchJson(
            "/api/v1/admin/orders/{$order->order_number}/status",
            ['status' => 'processing']
        );

        $response->assertOk()
            ->assertJsonPath('data.status', 'processing')
            ->assertJsonPath('sms.status', OutboundMessage::STATUS_SENT)
            ->assertJsonPath('sms.recipient', '09121112233');

        $message = OutboundMessage::query()->sole();

        $this->assertSame('sms', $message->channel);
        $this->assertSame('09121112233', $message->recipient);
        $this->assertStringContainsString('زهرا', (string) $message->body);
        $this->assertStringContainsString($order->order_number, (string) $message->body);
        $this->assertStringContainsString('در حال آماده‌سازی', (string) $message->body);
    }

    public function test_no_sms_when_automation_is_disabled(): void
    {
        $this->admin();

        $order = $this->createOrder();

        $this->patchJson(
            "/api/v1/admin/orders/{$order->order_number}/status",
            ['status' => 'processing']
        )
            ->assertOk()
            ->assertJsonPath('sms', null);

        $this->assertDatabaseCount('outbound_messages', 0);
    }

    public function test_no_sms_for_status_outside_selected_list(): void
    {
        $this->admin();
        $this->enableAutomation('shipped');

        $order = $this->createOrder();

        $this->patchJson(
            "/api/v1/admin/orders/{$order->order_number}/status",
            ['status' => 'processing']
        )->assertOk()->assertJsonPath('sms', null);

        $this->assertDatabaseCount('outbound_messages', 0);
    }

    public function test_sms_failure_does_not_block_status_change(): void
    {
        $this->admin();
        $this->enableAutomation();

        $this->smsResponse = [
            ['return' => ['status' => 400, 'message' => 'invalid receptor']],
            200,
        ];

        $order = $this->createOrder();

        $this->patchJson(
            "/api/v1/admin/orders/{$order->order_number}/status",
            ['status' => 'processing']
        )
            ->assertOk()
            ->assertJsonPath('data.status', 'processing')
            ->assertJsonPath('sms.status', OutboundMessage::STATUS_FAILED);

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'status' => 'processing',
        ]);

        $this->assertDatabaseHas('outbound_messages', [
            'status' => OutboundMessage::STATUS_FAILED,
            'recipient' => '09121112233',
        ]);
    }

    public function test_sms_is_skipped_when_order_has_no_phone(): void
    {
        $this->admin();
        $this->enableAutomation();

        $order = $this->createOrder('pending', 'paid', '');

        $this->patchJson(
            "/api/v1/admin/orders/{$order->order_number}/status",
            ['status' => 'processing']
        )->assertOk()->assertJsonPath('sms', null);

        $this->assertDatabaseCount('outbound_messages', 0);
    }

    public function test_order_status_settings_reject_unknown_status(): void
    {
        $this->admin();

        $this->putJson('/api/v1/admin/messaging/order-status', [
            'enabled' => true,
            'statuses' => ['processing', 'refunded'],
            'template' => 'متن نمونه برای پیامک وضعیت سفارش',
        ])->assertStatus(422)->assertJsonValidationErrors('statuses.1');
    }

    public function test_order_status_settings_are_admin_only(): void
    {
        $this->getJson('/api/v1/admin/messaging/order-status')->assertUnauthorized();

        Sanctum::actingAs(User::factory()->create(['role' => 'customer']));

        $this->getJson('/api/v1/admin/messaging/order-status')->assertForbidden();
        $this->putJson('/api/v1/admin/messaging/order-status', [
            'enabled' => true,
            'statuses' => [],
            'template' => 'متن نمونه برای پیامک وضعیت سفارش',
        ])->assertForbidden();
    }
}
