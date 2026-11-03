<?php

namespace Tests\Feature;

use App\Models\OutboundMessage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminMessagingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'messaging.timeout' => 5,
            'messaging.audience_limit' => 50,

            'messaging.channels.sms.enabled' => true,
            'messaging.channels.sms.driver' => 'kavenegar',
            'messaging.channels.sms.api_key' => 'sms-test-key',
            'messaging.channels.sms.sender' => '10004346',
            'messaging.channels.sms.base_url' => 'https://api.kavenegar.com',
            'messaging.channels.sms.default_recipient' => '09120000000',

            'messaging.channels.telegram.enabled' => true,
            'messaging.channels.telegram.bot_token' => 'telegram-test-token',
            'messaging.channels.telegram.chat_id' => '-1001234567890',
            'messaging.channels.telegram.api_url' => 'https://api.telegram.org',

            'messaging.channels.whatsapp.enabled' => true,
            'messaging.channels.whatsapp.token' => 'whatsapp-test-token',
            'messaging.channels.whatsapp.phone_number_id' => '1234567890',
            'messaging.channels.whatsapp.api_url' => 'https://graph.facebook.com/v21.0',
            'messaging.channels.whatsapp.template_name' => null,

            'messaging.channels.bale.enabled' => true,
            'messaging.channels.bale.bot_token' => 'bale-test-token',
            'messaging.channels.bale.chat_id' => '987654321',
            'messaging.channels.bale.api_url' => 'https://tapi.bale.ai',
        ]);
    }

    private function admin(): User
    {
        $admin = User::factory()->create(['role' => 'admin']);

        Sanctum::actingAs($admin);

        return $admin;
    }

    private function customer(): User
    {
        return User::factory()->create(['role' => 'customer']);
    }

    public function test_messaging_endpoints_are_protected_by_admin_middleware(): void
    {
        $this->getJson('/api/v1/admin/messaging')->assertStatus(401);

        Sanctum::actingAs($this->customer());

        $this->getJson('/api/v1/admin/messaging')->assertStatus(403);
        $this->getJson('/api/v1/admin/messaging/settings')->assertStatus(403);
        $this->postJson('/api/v1/admin/messaging/send', [
            'channel' => 'sms',
            'body' => 'سلام',
            'recipients' => ['09121234567'],
        ])->assertStatus(403);
    }

    public function test_admin_can_fetch_channels_status(): void
    {
        $this->admin();

        $response = $this->getJson('/api/v1/admin/messaging/settings');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(4, 'data.channels')
            ->assertJsonPath('data.channels.0.key', 'sms')
            ->assertJsonPath('data.channels.0.label', 'پیامک')
            ->assertJsonPath('data.channels.0.available', true)
            ->assertJsonPath('data.channels.1.key', 'telegram')
            ->assertJsonPath('data.channels.2.key', 'whatsapp')
            ->assertJsonPath('data.channels.3.key', 'bale')
            ->assertJsonPath('data.channels.3.available', true)
            ->assertJsonStructure([
                'data' => [
                    'channels' => [['key', 'label', 'enabled', 'configured', 'available', 'recipient_label']],
                    'audiences' => ['order_phones'],
                    'stats' => ['total', 'sent', 'failed', 'today'],
                    'audience_limit',
                ],
            ]);
    }

    public function test_sms_is_sent_through_kavenegar(): void
    {
        $this->admin();

        Http::fake([
            'api.kavenegar.com/*' => Http::response([
                'return' => ['status' => 200, 'message' => 'تایید شد'],
                'entries' => [['messageid' => 88123456, 'status' => 5]],
            ], 200),
        ]);

        $response = $this->postJson('/api/v1/admin/messaging/send', [
            'channel' => 'sms',
            'body' => 'سفارش شما ارسال شد.',
            'audience' => 'custom',
            'recipients' => ['۰۹۱۲۱۲۳۴۵۶۷'],
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.sent', 1)
            ->assertJsonPath('data.failed', 0);

        Http::assertSent(function ($request) {
            return str_contains($request->url(), '/sms-test-key/sms/send.json')
                && $request['receptor'] === '09121234567'
                && $request['sender'] === '10004346'
                && $request['message'] === 'سفارش شما ارسال شد.';
        });

        $message = OutboundMessage::query()->firstOrFail();

        $this->assertSame('sms', $message->channel);
        $this->assertSame('09121234567', $message->recipient);
        $this->assertSame(OutboundMessage::STATUS_SENT, $message->status);
        $this->assertSame('88123456', $message->provider_message_id);
        $this->assertNotNull($message->sent_at);
        $this->assertNotNull($message->sent_by);
    }

    public function test_telegram_message_is_sent_via_bot_api(): void
    {
        $this->admin();

        Http::fake([
            'api.telegram.org/*' => Http::response([
                'ok' => true,
                'result' => ['message_id' => 321],
            ], 200),
        ]);

        $response = $this->postJson('/api/v1/admin/messaging/send', [
            'channel' => 'telegram',
            'body' => 'موجودی محصولات به‌روزرسانی شد.',
            'audience' => 'custom',
            'recipients' => ['-1001234567890'],
        ]);

        $response->assertOk()->assertJsonPath('data.sent', 1);

        Http::assertSent(function ($request) {
            return $request->url() === 'https://api.telegram.org/bottelegram-test-token/sendMessage'
                && $request['chat_id'] === '-1001234567890'
                && $request['text'] === 'موجودی محصولات به‌روزرسانی شد.';
        });

        $this->assertDatabaseHas('outbound_messages', [
            'channel' => 'telegram',
            'recipient' => '-1001234567890',
            'status' => OutboundMessage::STATUS_SENT,
            'provider_message_id' => '321',
        ]);
    }

    public function test_bale_message_is_sent_via_bale_bot_api(): void
    {
        $this->admin();

        Http::fake([
            'tapi.bale.ai/*' => Http::response([
                'ok' => true,
                'result' => ['message_id' => 654],
            ], 200),
        ]);

        $response = $this->postJson('/api/v1/admin/messaging/send', [
            'channel' => 'bale',
            'body' => 'پیام آزمایشی بله',
            'audience' => 'default',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.sent', 1)
            ->assertJsonPath('data.results.0.recipient', '987654321');

        Http::assertSent(function ($request) {
            return $request->url() === 'https://tapi.bale.ai/botbale-test-token/sendMessage'
                && $request['chat_id'] === '987654321';
        });
    }

    public function test_whatsapp_message_is_sent_via_cloud_api(): void
    {
        $this->admin();

        Http::fake([
            'graph.facebook.com/*' => Http::response([
                'messaging_product' => 'whatsapp',
                'messages' => [['id' => 'wamid.HBgM']],
            ], 200),
        ]);

        $response = $this->postJson('/api/v1/admin/messaging/send', [
            'channel' => 'whatsapp',
            'body' => 'سلام از فروشگاه',
            'audience' => 'custom',
            'recipients' => ['09121234567'],
        ]);

        $response->assertOk()->assertJsonPath('data.sent', 1);

        Http::assertSent(function ($request) {
            return $request->url() === 'https://graph.facebook.com/v21.0/1234567890/messages'
                && $request->hasHeader('Authorization', 'Bearer whatsapp-test-token')
                && $request['to'] === '989121234567'
                && $request['type'] === 'text'
                && $request['text']['body'] === 'سلام از فروشگاه';
        });

        $this->assertDatabaseHas('outbound_messages', [
            'channel' => 'whatsapp',
            'provider_message_id' => 'wamid.HBgM',
            'status' => OutboundMessage::STATUS_SENT,
        ]);
    }

    public function test_whatsapp_template_mode_is_used_when_requested(): void
    {
        config(['messaging.channels.whatsapp.template_name' => 'order_update']);

        $this->admin();

        Http::fake([
            'graph.facebook.com/*' => Http::response([
                'messages' => [['id' => 'wamid.TEMPLATE']],
            ], 200),
        ]);

        $this->postJson('/api/v1/admin/messaging/send', [
            'channel' => 'whatsapp',
            'body' => 'کد سفارش ۱۲۳',
            'audience' => 'custom',
            'recipients' => ['09121234567'],
            'as_template' => true,
        ])->assertOk()->assertJsonPath('data.sent', 1);

        Http::assertSent(function ($request) {
            return $request['type'] === 'template'
                && $request['template']['name'] === 'order_update'
                && $request['template']['language']['code'] === 'fa';
        });
    }

    public function test_provider_failure_is_recorded_in_history(): void
    {
        $this->admin();

        Http::fake([
            'api.telegram.org/*' => Http::response([
                'ok' => false,
                'description' => 'Bad Request: chat not found',
            ], 400),
        ]);

        $response = $this->postJson('/api/v1/admin/messaging/send', [
            'channel' => 'telegram',
            'body' => 'پیام تست',
            'audience' => 'custom',
            'recipients' => ['123'],
        ]);

        $response->assertOk()
            ->assertJsonPath('success', false)
            ->assertJsonPath('data.sent', 0)
            ->assertJsonPath('data.failed', 1)
            ->assertJsonPath('data.results.0.error', 'Bad Request: chat not found');

        $message = OutboundMessage::query()->firstOrFail();

        $this->assertSame(OutboundMessage::STATUS_FAILED, $message->status);
        $this->assertSame('Bad Request: chat not found', $message->error);
    }

    public function test_disabled_channel_cannot_be_used(): void
    {
        config(['messaging.channels.bale.enabled' => false]);

        $this->admin();

        Http::fake();

        $this->postJson('/api/v1/admin/messaging/send', [
            'channel' => 'bale',
            'body' => 'پیام تست',
            'audience' => 'custom',
            'recipients' => ['987654321'],
        ])->assertStatus(422)->assertJsonValidationErrors('channel');

        Http::assertNothingSent();
        $this->assertDatabaseCount('outbound_messages', 0);
    }

    public function test_send_requires_body_and_recipients(): void
    {
        $this->admin();

        Http::fake();

        $this->postJson('/api/v1/admin/messaging/send', [
            'channel' => 'sms',
        ])->assertStatus(422)->assertJsonValidationErrors('body');

        $this->postJson('/api/v1/admin/messaging/send', [
            'channel' => 'sms',
            'body' => 'متن پیام',
            'audience' => 'custom',
            'recipients' => [],
        ])->assertStatus(422)->assertJsonValidationErrors('recipients');

        $this->postJson('/api/v1/admin/messaging/send', [
            'channel' => 'unknown',
            'body' => 'متن پیام',
        ])->assertStatus(422)->assertJsonValidationErrors('channel');
    }

    public function test_order_phones_audience_uses_unique_customer_numbers(): void
    {
        $this->admin();

        $customer = $this->customer();

        foreach (['09121110000', '09121110000', '09122220000'] as $index => $phone) {
            DB::table('orders')->insert([
                'user_id' => $customer->id,
                'order_number' => 'MSG-TEST-' . $index . '-' . uniqid(),
                'subtotal' => 100000,
                'shipping_cost' => 0,
                'discount' => 0,
                'total' => 100000,
                'status' => 'delivered',
                'payment_status' => 'paid',
                'recipient_name' => 'مشتری تست',
                'phone' => $phone,
                'address' => 'تهران، خیابان تست',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        Http::fake([
            'api.kavenegar.com/*' => Http::response([
                'return' => ['status' => 200],
                'entries' => [['messageid' => 1]],
            ], 200),
        ]);

        $response = $this->postJson('/api/v1/admin/messaging/send', [
            'channel' => 'sms',
            'body' => 'پیام گروهی برای مشتریان',
            'audience' => 'order_phones',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.total', 2)
            ->assertJsonPath('data.sent', 2);

        $this->assertDatabaseCount('outbound_messages', 2);

        $this->getJson('/api/v1/admin/messaging/settings')
            ->assertOk()
            ->assertJsonPath('data.audiences.order_phones', 2);
    }

    public function test_history_can_be_filtered_and_deleted(): void
    {
        $this->admin();

        $sent = OutboundMessage::query()->create([
            'channel' => 'sms',
            'recipient' => '09121110000',
            'body' => 'پیام موفق',
            'status' => OutboundMessage::STATUS_SENT,
            'sent_at' => now(),
        ]);

        OutboundMessage::query()->create([
            'channel' => 'telegram',
            'recipient' => '123456',
            'body' => 'پیام ناموفق',
            'status' => OutboundMessage::STATUS_FAILED,
            'error' => 'chat not found',
        ]);

        OutboundMessage::query()->create([
            'channel' => 'sms',
            'recipient' => '09122220000',
            'body' => 'پیام ناموفق دوم',
            'status' => OutboundMessage::STATUS_FAILED,
            'error' => 'invalid number',
        ]);

        $this->getJson('/api/v1/admin/messaging?channel=sms')
            ->assertOk()
            ->assertJsonPath('data.total', 2);

        $this->getJson('/api/v1/admin/messaging?status=failed')
            ->assertOk()
            ->assertJsonPath('data.total', 2);

        $this->getJson('/api/v1/admin/messaging?search=09121110000')
            ->assertOk()
            ->assertJsonCount(1, 'data.data')
            ->assertJsonPath('data.data.0.id', $sent->id);

        $this->deleteJson("/api/v1/admin/messaging/{$sent->id}")->assertOk();

        $this->assertDatabaseMissing('outbound_messages', ['id' => $sent->id]);
        $this->assertDatabaseCount('outbound_messages', 2);
    }
}
