<?php

namespace Tests\Feature;

use App\Models\SupportConversation;
use App\Models\User;
use App\Support\AdminRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SupportChatTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // هیچ پیام واقعی به پیام‌رسان‌ها ارسال نشود.
        config([
            'messaging.channels.telegram.enabled' => false,
            'messaging.channels.whatsapp.enabled' => false,
            'messaging.channels.bale.enabled' => false,
        ]);
    }

    private function adminUser(string $role): User
    {
        return User::factory()->create([
            'role' => 'admin',
            'admin_role' => $role,
        ]);
    }

    private function startConversation(): string
    {
        $response = $this->postJson('/api/v1/support/conversations', [
            'name' => 'مهمان تست',
            'contact' => '09120000000',
            'subject' => 'پیگیری سفارش',
            'message' => 'سلام، وضعیت سفارش من چطور است؟',
        ]);

        $response->assertCreated();

        return (string) $response->json('data.token');
    }

    public function test_guest_can_start_a_support_conversation(): void
    {
        $response = $this->postJson('/api/v1/support/conversations', [
            'name' => 'مهمان تست',
            'contact' => '09120000000',
            'subject' => 'پیگیری سفارش',
            'message' => 'سلام، وضعیت سفارش من چطور است؟',
        ]);

        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', SupportConversation::STATUS_OPEN)
            ->assertJsonPath('data.channel', SupportConversation::CHANNEL_WEB)
            ->assertJsonPath('data.messages.0.sender', 'user');

        $token = (string) $response->json('data.token');

        $this->assertTrue(Str::isUuid($token));

        $this->assertDatabaseHas('support_conversations', [
            'token' => $token,
            'channel' => SupportConversation::CHANNEL_WEB,
            'status' => SupportConversation::STATUS_OPEN,
            'admin_unread_count' => 1,
        ]);

        $this->assertDatabaseHas('support_messages', [
            'sender' => 'user',
            'body' => 'سلام، وضعیت سفارش من چطور است؟',
        ]);
    }

    public function test_guest_can_continue_conversation_with_token(): void
    {
        $token = $this->startConversation();

        $this->postJson("/api/v1/support/conversations/{$token}/messages", [
            'message' => 'پیام دوم من',
        ])
            ->assertCreated()
            ->assertJsonPath('data.sender', 'user')
            ->assertJsonPath('data.body', 'پیام دوم من');

        $this->getJson("/api/v1/support/conversations/{$token}")
            ->assertOk()
            ->assertJsonCount(2, 'data.messages')
            ->assertJsonPath('data.messages.1.body', 'پیام دوم من')
            ->assertJsonPath('data.user_unread_count', 0);
    }

    public function test_unknown_conversation_token_returns_not_found(): void
    {
        $this->getJson('/api/v1/support/conversations/' . Str::uuid())
            ->assertStatus(404)
            ->assertJsonPath('success', false);
    }

    public function test_support_admin_can_list_and_reply_to_conversation(): void
    {
        $token = $this->startConversation();

        $admin = $this->adminUser(AdminRole::SUPPORT);
        Sanctum::actingAs($admin);

        $list = $this->getJson('/api/v1/admin/support/conversations')->assertOk();

        $list->assertJsonPath('stats.open', 1)
            ->assertJsonPath('stats.unread', 1);

        $conversationId = (int) $list->json('data.data.0.id');

        $this->getJson("/api/v1/admin/support/conversations/{$conversationId}")
            ->assertOk()
            ->assertJsonCount(1, 'data.messages');

        // خواندن گفتگو توسط مدیر، شمارنده را صفر می‌کند.
        $this->assertDatabaseHas('support_conversations', [
            'id' => $conversationId,
            'admin_unread_count' => 0,
        ]);

        $this->postJson("/api/v1/admin/support/conversations/{$conversationId}/messages", [
            'body' => 'سلام، سفارش شما فردا ارسال می‌شود.',
        ])
            ->assertCreated()
            ->assertJsonPath('data.message.sender', 'admin')
            ->assertJsonPath('data.message.admin.name', $admin->name);

        $this->getJson("/api/v1/support/conversations/{$token}")
            ->assertOk()
            ->assertJsonCount(2, 'data.messages')
            ->assertJsonPath('data.messages.1.sender', 'admin')
            ->assertJsonPath('data.messages.1.admin_name', $admin->name);
    }

    public function test_closed_conversation_rejects_new_user_messages(): void
    {
        $token = $this->startConversation();

        $this->postJson("/api/v1/support/conversations/{$token}/close")
            ->assertOk()
            ->assertJsonPath('data.status', SupportConversation::STATUS_CLOSED);

        $this->postJson("/api/v1/support/conversations/{$token}/messages", [
            'message' => 'پیام بعد از بستن',
        ])
            ->assertStatus(409)
            ->assertJsonPath('success', false);
    }

    public function test_admin_can_change_conversation_status(): void
    {
        $token = $this->startConversation();

        Sanctum::actingAs($this->adminUser(AdminRole::SUPER_ADMIN));

        $conversation = SupportConversation::query()
            ->where('token', $token)
            ->firstOrFail();

        $this->patchJson(
            "/api/v1/admin/support/conversations/{$conversation->id}/status",
            ['status' => SupportConversation::STATUS_PENDING]
        )
            ->assertOk()
            ->assertJsonPath('data.status', SupportConversation::STATUS_PENDING);

        $this->assertDatabaseHas('support_conversations', [
            'id' => $conversation->id,
            'status' => SupportConversation::STATUS_PENDING,
            'closed_at' => null,
        ]);
    }

    public function test_telegram_webhook_requires_secret_and_stores_message(): void
    {
        config(['support.webhook_secret' => 'test-secret']);

        $this->postJson('/api/v1/support/webhooks/wrong-secret/telegram', [])
            ->assertStatus(403);

        $this->postJson('/api/v1/support/webhooks/test-secret/telegram', [
            'update_id' => 10,
            'message' => [
                'message_id' => 5,
                'from' => ['id' => 123, 'first_name' => 'علی'],
                'chat' => ['id' => 123456],
                'text' => 'سلام از تلگرام',
            ],
        ])
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('support_conversations', [
            'channel' => SupportConversation::CHANNEL_TELEGRAM,
            'channel_chat_id' => '123456',
        ]);

        $this->assertDatabaseHas('support_messages', [
            'sender' => 'user',
            'body' => 'سلام از تلگرام',
        ]);
    }

    public function test_product_manager_cannot_access_support_inbox(): void
    {
        Sanctum::actingAs($this->adminUser(AdminRole::PRODUCT_MANAGER));

        $this->getJson('/api/v1/admin/support/conversations')->assertStatus(403);
    }

    public function test_support_config_builds_messenger_links(): void
    {
        config([
            'support.links.telegram' => null,
            'support.bot_usernames.telegram' => '@behrang_support',
            'support.links.bale' => null,
            'support.bot_usernames.bale' => 'behrang_support',
            'support.links.whatsapp' => null,
            'support.whatsapp_number' => '۰۹۱۲۱۲۳۴۵۶۷',
        ]);

        $response = $this->getJson('/api/v1/support/config')->assertOk();

        $channels = collect($response->json('data.channels'))->keyBy('key');

        $this->assertSame('https://t.me/behrang_support', $channels['telegram']['link']);
        $this->assertSame('https://ble.ir/behrang_support', $channels['bale']['link']);
        $this->assertSame('https://wa.me/989121234567', $channels['whatsapp']['link']);
    }
}
