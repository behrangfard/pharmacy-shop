<?php

namespace Tests\Feature;

use App\Models\ContactChannel;
use App\Models\User;
use App\Support\AdminRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * کانال‌های ارتباطی فروشگاه: نرمال‌سازی لینک‌ها، نمایش عمومی و دسترسی پنل.
 */
class ContactChannelTest extends TestCase
{
    use RefreshDatabase;

    private function admin(?string $role = null): User
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'admin_role' => $role,
        ]);

        Sanctum::actingAs($admin);

        return $admin;
    }

    private function channel(string $key): ContactChannel
    {
        return ContactChannel::query()->where('key', $key)->firstOrFail();
    }

    public function test_migration_seeds_the_five_store_channels(): void
    {
        $this->assertSame(5, ContactChannel::query()->count());

        foreach (ContactChannel::KEYS as $key) {
            $this->assertDatabaseHas('contact_channels', ['key' => $key]);
        }
    }

    public function test_public_endpoint_hides_channels_that_have_no_links(): void
    {
        // ردیف‌های پیش‌فرض لینک ندارند تا مدیر آن‌ها را پر کند؛ فروشگاه نباید
        // دکمهٔ خالی نمایش دهد.
        $this->getJson('/api/v1/contact-channels')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_admin_update_normalizes_handles_and_public_endpoint_refreshes(): void
    {
        $this->admin();

        // کش عمومی را پر می‌کنیم تا پاک شدن آن بعد از ذخیره بررسی شود.
        $this->getJson('/api/v1/contact-channels')->assertOk()->assertJsonCount(0, 'data');

        $telegram = $this->channel('telegram');

        $this->putJson("/api/v1/admin/channels/{$telegram->id}", [
            'title' => 'کانال تلگرام',
            'description' => 'اخبار و تخفیف‌های فروشگاه',
            'join_url' => '@behrang_channel',
            'join_label' => 'عضویت در کانال',
            'chat_url' => 't.me/behrang_support',
            'chat_label' => '',
            'sort_order' => 10,
            'is_active' => true,
        ])
            ->assertOk()
            ->assertJsonPath('data.join_url', 'https://t.me/behrang_channel')
            ->assertJsonPath('data.chat_url', 'https://t.me/behrang_support')
            ->assertJsonPath('data.chat_label', null);

        $this->getJson('/api/v1/contact-channels')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.key', 'telegram')
            ->assertJsonPath('data.0.title', 'کانال تلگرام')
            ->assertJsonPath('data.0.join_url', 'https://t.me/behrang_channel')
            ->assertJsonPath('data.0.join_label', 'عضویت در کانال')
            ->assertJsonPath('data.0.chat_url', 'https://t.me/behrang_support');
    }

    public function test_whatsapp_number_and_instagram_direct_links_are_normalized(): void
    {
        $this->admin();

        $whatsapp = $this->channel('whatsapp');

        $this->putJson("/api/v1/admin/channels/{$whatsapp->id}", [
            'title' => 'واتس‌اپ فروشگاه',
            'join_url' => 'https://whatsapp.com/channel/0029abcd',
            'chat_url' => '09121234567',
        ])
            ->assertOk()
            ->assertJsonPath('data.join_url', 'https://whatsapp.com/channel/0029abcd')
            ->assertJsonPath('data.chat_url', 'https://wa.me/989121234567');

        $instagram = $this->channel('instagram');

        $this->putJson("/api/v1/admin/channels/{$instagram->id}", [
            'title' => 'اینستاگرام',
            'join_url' => 'behrang.shop',
            'chat_url' => '@behrang.shop',
        ])
            ->assertOk()
            ->assertJsonPath('data.join_url', 'https://instagram.com/behrang.shop')
            ->assertJsonPath('data.chat_url', 'https://ig.me/m/behrang.shop');
    }

    public function test_bale_and_eitaa_handles_use_their_own_bases(): void
    {
        $this->admin();

        $bale = $this->channel('bale');

        $this->putJson("/api/v1/admin/channels/{$bale->id}", [
            'title' => 'بله',
            'join_url' => 'behrangshop',
            'chat_url' => 'https://ble.ir/behrangsupport',
        ])
            ->assertOk()
            ->assertJsonPath('data.join_url', 'https://ble.ir/behrangshop')
            ->assertJsonPath('data.chat_url', 'https://ble.ir/behrangsupport');

        $eitaa = $this->channel('eitaa');

        $this->putJson("/api/v1/admin/channels/{$eitaa->id}", [
            'title' => 'ایتا',
            'join_url' => 'eitaa.com/behrangshop',
        ])
            ->assertOk()
            ->assertJsonPath('data.join_url', 'https://eitaa.com/behrangshop')
            ->assertJsonPath('data.chat_url', null);
    }

    public function test_update_rejects_unrecognized_links(): void
    {
        $this->admin();

        $telegram = $this->channel('telegram');

        $this->putJson("/api/v1/admin/channels/{$telegram->id}", [
            'title' => 'تلگرام',
            'join_url' => 'فروشگاه من',
            'chat_url' => 'پیام بدهید',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['join_url', 'chat_url']);
    }

    public function test_inactive_channel_is_hidden_from_public_endpoint(): void
    {
        $this->admin();

        $telegram = $this->channel('telegram');

        $this->putJson("/api/v1/admin/channels/{$telegram->id}", [
            'title' => 'تلگرام',
            'join_url' => 'behrangshop',
        ])->assertOk();

        $this->getJson('/api/v1/contact-channels')->assertOk()->assertJsonCount(1, 'data');

        $this->patchJson("/api/v1/admin/channels/{$telegram->id}/status", [
            'is_active' => false,
        ])
            ->assertOk()
            ->assertJsonPath('data.is_active', false);

        $this->getJson('/api/v1/contact-channels')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_channels_panel_is_limited_to_channels_permission(): void
    {
        $this->admin(AdminRole::ORDER_MANAGER);

        $this->getJson('/api/v1/admin/channels')
            ->assertForbidden()
            ->assertJsonPath('required_permission', AdminRole::CHANNELS_MANAGE);

        Sanctum::actingAs(User::factory()->create([
            'role' => 'admin',
            'admin_role' => AdminRole::SUPPORT,
        ]));

        $this->getJson('/api/v1/admin/channels')
            ->assertOk()
            ->assertJsonCount(5, 'data');
    }
}
