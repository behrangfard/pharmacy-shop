<?php

namespace Tests\Feature;

use App\Models\Popup;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * پاپ‌آپ‌های تبلیغاتی: مدیریت از پنل، نمایش عمومی و قواعد زمان‌بندی.
 */
class PopupTest extends TestCase
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

    /**
     * بدنهٔ پایهٔ ساخت پاپ‌آپ؛ هر تست می‌تواند فیلدها را بازنویسی کند.
     *
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return array_merge([
            'title' => 'کد تخفیف ویژه',
            'badge' => 'پیشنهاد امروز',
            'description' => 'با کد زیر ۲۰٪ تخفیف بگیرید.',
            'image' => 'popups/sale.jpg',
            'image_alt' => 'بنر تخفیف',
            'theme' => 'brand',
            'layout' => 'center',
            'image_position' => 'top',
            'cta_text' => 'مشاهده محصولات',
            'cta_link' => '/products',
            'secondary_text' => 'بعداً',
            'secondary_link' => null,
            'coupon_code' => 'SAVE20',
            'display_pages' => ['home', 'products'],
            'devices' => 'all',
            'delay_seconds' => 3,
            'auto_close_seconds' => 0,
            'frequency' => 'session',
            'close_on_backdrop' => true,
            'show_close' => true,
            'is_active' => true,
            'sort_order' => 1,
        ], $overrides);
    }

    public function test_admin_can_create_popup_and_public_endpoint_refreshes(): void
    {
        $this->admin();

        // کش عمومی را پر می‌کنیم تا پاک شدن آن بعد از ایجاد بررسی شود.
        $this->getJson('/api/v1/popups')->assertOk()->assertJsonCount(0, 'data');

        $this->postJson('/api/v1/admin/popups', $this->payload())
            ->assertCreated()
            ->assertJsonPath('data.title', 'کد تخفیف ویژه')
            ->assertJsonPath('data.display_pages.0', 'home');

        $this->getJson('/api/v1/popups')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.coupon_code', 'SAVE20')
            ->assertJsonPath('data.0.delay_seconds', 3)
            ->assertJsonPath('data.0.frequency', 'session')
            ->assertJsonPath('data.0.close_on_backdrop', true);
    }

    public function test_public_popups_exclude_inactive_and_out_of_window_records(): void
    {
        Popup::query()->create([
            'title' => 'داخل بازه',
            'frequency' => 'always',
            'sort_order' => 2,
            'is_active' => true,
        ]);

        Popup::query()->create([
            'title' => 'غیرفعال',
            'frequency' => 'always',
            'sort_order' => 1,
            'is_active' => false,
        ]);

        Popup::query()->create([
            'title' => 'منقضی',
            'frequency' => 'always',
            'sort_order' => 0,
            'ends_at' => now()->subDay(),
            'is_active' => true,
        ]);

        Popup::query()->create([
            'title' => 'آینده',
            'frequency' => 'always',
            'sort_order' => 0,
            'starts_at' => now()->addDay(),
            'is_active' => true,
        ]);

        $this->getJson('/api/v1/popups')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'داخل بازه');
    }

    public function test_public_popups_are_sorted_by_priority(): void
    {
        Popup::query()->create([
            'title' => 'دوم',
            'frequency' => 'always',
            'sort_order' => 20,
            'is_active' => true,
        ]);

        Popup::query()->create([
            'title' => 'اول',
            'frequency' => 'always',
            'sort_order' => 5,
            'is_active' => true,
        ]);

        $this->getJson('/api/v1/popups')
            ->assertOk()
            ->assertJsonPath('data.0.title', 'اول')
            ->assertJsonPath('data.1.title', 'دوم');
    }

    public function test_admin_can_update_toggle_and_delete_popup(): void
    {
        $this->admin();

        $popup = Popup::query()->create([
            'title' => 'قدیمی',
            'frequency' => 'session',
            'is_active' => true,
        ]);

        $this->putJson("/api/v1/admin/popups/{$popup->id}", $this->payload([
            'title' => 'تازه',
            'layout' => 'bottom',
            'image_position' => 'side',
            'frequency' => 'daily',
        ]))
            ->assertOk()
            ->assertJsonPath('data.title', 'تازه')
            ->assertJsonPath('data.layout', 'bottom')
            ->assertJsonPath('data.frequency', 'daily');

        $this->patchJson("/api/v1/admin/popups/{$popup->id}/status", [
            'is_active' => false,
        ])
            ->assertOk()
            ->assertJsonPath('data.is_active', false);

        $this->getJson('/api/v1/popups')->assertOk()->assertJsonCount(0, 'data');

        $this->deleteJson("/api/v1/admin/popups/{$popup->id}")
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('popups', ['id' => $popup->id]);
    }

    public function test_popup_requires_some_content_and_valid_targeting(): void
    {
        $this->admin();

        $this->postJson('/api/v1/admin/popups', $this->payload([
            'title' => '',
            'description' => '',
            'image' => '',
        ]))->assertStatus(422)->assertJsonValidationErrors('title');

        $this->postJson('/api/v1/admin/popups', $this->payload([
            'display_pages' => ['home', 'unknown-page'],
        ]))->assertStatus(422)->assertJsonValidationErrors('display_pages.1');

        $this->postJson('/api/v1/admin/popups', $this->payload([
            'starts_at' => '2026-05-10 10:00:00',
            'ends_at' => '2026-05-01 10:00:00',
        ]))->assertStatus(422)->assertJsonValidationErrors('ends_at');

        $this->postJson('/api/v1/admin/popups', $this->payload([
            'layout' => 'floating',
        ]))->assertStatus(422)->assertJsonValidationErrors('layout');
    }

    public function test_popup_can_be_image_only_and_pages_normalize_to_null(): void
    {
        $this->admin();

        $this->postJson('/api/v1/admin/popups', $this->payload([
            'title' => '',
            'description' => '',
            'display_pages' => [],
        ]))
            ->assertCreated()
            ->assertJsonPath('data.title', null)
            ->assertJsonPath('data.display_pages', null);

        $this->getJson('/api/v1/popups')
            ->assertOk()
            ->assertJsonPath('data.0.display_pages', []);
    }

    public function test_admin_can_upload_popup_image(): void
    {
        Storage::fake('public');

        $this->admin();

        // افزونهٔ GD روی این محیط نصب نیست؛ یک PNG واقعی کوچک می‌سازیم.
        $binary = base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8AAAwAB/wF+9MxKAAAAAElFTkSuQmCC'
        );

        $tempPath = tempnam(sys_get_temp_dir(), 'popup').'.png';
        file_put_contents($tempPath, $binary);

        try {
            $upload = new UploadedFile($tempPath, 'popup.png', 'image/png', null, true);

            $response = $this->postJson('/api/v1/admin/popups/image', [
                'image' => $upload,
            ]);
        } finally {
            @unlink($tempPath);
        }

        $response->assertCreated()->assertJsonPath('success', true);

        $path = $response->json('data.path');

        $this->assertStringStartsWith('popups/', $path);
        Storage::disk('public')->assertExists($path);
    }

    public function test_guest_cannot_manage_popups(): void
    {
        $this->postJson('/api/v1/admin/popups', $this->payload())
            ->assertUnauthorized();
    }
}
