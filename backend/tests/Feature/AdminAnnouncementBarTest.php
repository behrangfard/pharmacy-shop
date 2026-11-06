<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\AnnouncementBarController;
use App\Models\AnnouncementBarItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminAnnouncementBarTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        Sanctum::actingAs($admin);

        return $admin;
    }

    public function test_public_announcement_bar_is_disabled_by_default(): void
    {
        $this->getJson('/api/v1/announcement-bar')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.enabled', false)
            ->assertJsonCount(0, 'data.items');
    }

    public function test_admin_can_create_item_and_public_endpoint_refreshes(): void
    {
        $this->admin();

        // کش را از قبل پر می‌کنیم تا پاک‌شدن آن پس از ایجاد بررسی شود.
        $this->getJson('/api/v1/announcement-bar')
            ->assertOk()
            ->assertJsonCount(0, 'data.items');

        $this->postJson('/api/v1/admin/announcement-bar/items', [
            'type' => 'text',
            'text' => 'ارسال رایگان برای خرید بالای ۵۰۰ هزار تومان',
            'link' => '/products',
            'sort_order' => 1,
            'is_active' => true,
        ])
            ->assertCreated()
            ->assertJsonPath('data.text', 'ارسال رایگان برای خرید بالای ۵۰۰ هزار تومان');

        $this->getJson('/api/v1/announcement-bar')
            ->assertOk()
            ->assertJsonCount(1, 'data.items')
            ->assertJsonPath('data.items.0.type', 'text')
            ->assertJsonPath('data.items.0.link', '/products');
    }

    public function test_public_announcement_bar_excludes_inactive_and_expired_items(): void
    {
        AnnouncementBarItem::query()->create([
            'type' => 'text',
            'text' => 'فعال',
            'is_active' => true,
        ]);

        AnnouncementBarItem::query()->create([
            'type' => 'text',
            'text' => 'غیرفعال',
            'is_active' => false,
        ]);

        AnnouncementBarItem::query()->create([
            'type' => 'text',
            'text' => 'منقضی',
            'is_active' => true,
            'ends_at' => now()->subDay(),
        ]);

        AnnouncementBarItem::query()->create([
            'type' => 'text',
            'text' => 'آینده',
            'is_active' => true,
            'starts_at' => now()->addDay(),
        ]);

        $this->getJson('/api/v1/announcement-bar')
            ->assertOk()
            ->assertJsonCount(1, 'data.items')
            ->assertJsonPath('data.items.0.text', 'فعال');
    }

    public function test_public_announcement_bar_stays_an_array_when_served_from_cache(): void
    {
        AnnouncementBarItem::query()->create([
            'type' => 'text',
            'text' => 'کش‌شده',
            'is_active' => true,
        ]);

        $this->getJson('/api/v1/announcement-bar')
            ->assertOk()
            ->assertJsonCount(1, 'data.items');

        // مثل بنرها، مقدار کش باید آرایه باشد تا پس از رفرش، پاسخ JSON
        // به‌جای آرایه شیء خالی برنگردد.
        $this->assertIsArray(Cache::get(AnnouncementBarController::STOREFRONT_CACHE_KEY));

        $this->getJson('/api/v1/announcement-bar')
            ->assertOk()
            ->assertJsonCount(1, 'data.items')
            ->assertJsonPath('data.items.0.text', 'کش‌شده');
    }

    public function test_admin_can_update_bar_settings_and_public_endpoint_refreshes(): void
    {
        $this->admin();

        $this->getJson('/api/v1/announcement-bar')
            ->assertOk()
            ->assertJsonPath('data.height', 44)
            ->assertJsonPath('data.interval', 6);

        $this->putJson('/api/v1/admin/announcement-bar/settings', [
            'enabled' => true,
            'height' => 56,
            'mobile_height' => 48,
            'background_color' => '#123456',
            'text_color' => '#ffffff',
            'font_size' => 15,
            'interval' => 9,
            'animation' => 'slide',
        ])
            ->assertOk()
            ->assertJsonPath('data.enabled', true)
            ->assertJsonPath('data.height', 56)
            ->assertJsonPath('data.animation', 'slide');

        $this->getJson('/api/v1/announcement-bar')
            ->assertOk()
            ->assertJsonPath('data.enabled', true)
            ->assertJsonPath('data.height', 56)
            ->assertJsonPath('data.mobile_height', 48)
            ->assertJsonPath('data.background_color', '#123456')
            ->assertJsonPath('data.text_color', '#ffffff')
            ->assertJsonPath('data.font_size', 15)
            ->assertJsonPath('data.interval', 9)
            ->assertJsonPath('data.animation', 'slide');
    }

    public function test_bar_settings_are_validated(): void
    {
        $this->admin();

        $this->putJson('/api/v1/admin/announcement-bar/settings', [
            'enabled' => true,
            'height' => 500,
            'mobile_height' => 48,
            'background_color' => 'green',
            'text_color' => '#ffffff',
            'font_size' => 15,
            'interval' => 9,
            'animation' => 'explode',
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['height', 'background_color', 'animation']);
    }

    public function test_item_payload_is_validated_against_its_type(): void
    {
        $this->admin();

        // آیتم متنی بدون متن ذخیره نمی‌شود.
        $this->postJson('/api/v1/admin/announcement-bar/items', [
            'type' => 'text',
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['text']);

        // آیتم تصویری بدون فایل هم بی‌معناست.
        $this->postJson('/api/v1/admin/announcement-bar/items', [
            'type' => 'image',
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['image']);
    }

    public function test_admin_can_update_status_and_delete_item(): void
    {
        $this->admin();

        $item = AnnouncementBarItem::query()->create([
            'type' => 'text',
            'text' => 'قابل ویرایش',
            'is_active' => true,
        ]);

        $this->patchJson("/api/v1/admin/announcement-bar/items/{$item->id}/status", [
            'is_active' => false,
        ])
            ->assertOk()
            ->assertJsonPath('data.is_active', false);

        $this->deleteJson("/api/v1/admin/announcement-bar/items/{$item->id}")
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseCount('announcement_bar_items', 0);
    }

    public function test_admin_can_upload_animated_image_for_bar(): void
    {
        $this->admin();
        Storage::fake('public');

        $response = $this->post('/api/v1/admin/announcement-bar/media', [
            'file' => UploadedFile::fake()->create('discount.gif', 40, 'image/gif'),
        ]);

        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.type', 'image');

        $path = $response->json('data.path');

        $this->assertStringStartsWith('announcement-bar/', $path);
        Storage::disk('public')->assertExists($path);
    }

    public function test_guest_cannot_manage_announcement_bar(): void
    {
        $this->postJson('/api/v1/admin/announcement-bar/items', [
            'type' => 'text',
            'text' => 'غیرمجاز',
        ])->assertUnauthorized();
    }
}
