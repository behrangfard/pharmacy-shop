<?php

namespace Tests\Feature;

use App\Models\TrustBadge;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * نشان‌های اعتماد فوتر (اینماد و مجوزها): مدیریت از پنل و نمایش عمومی.
 */
class TrustBadgeTest extends TestCase
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

    public function test_admin_can_create_badge_and_public_endpoint_refreshes(): void
    {
        $this->admin();

        // کش عمومی را پر می‌کنیم تا پاک شدن آن بعد از ایجاد بررسی شود.
        $this->getJson('/api/v1/trust-badges')->assertOk()->assertJsonCount(0, 'data');

        $this->postJson('/api/v1/admin/trust-badges', [
            'title' => 'نماد اعتماد الکترونیکی',
            'image' => 'trust-badges/enamad.png',
            'link' => 'https://trustseal.enamad.ir/?id=123',
            'sort_order' => 1,
            'is_active' => true,
        ])
            ->assertCreated()
            ->assertJsonPath('data.title', 'نماد اعتماد الکترونیکی');

        $this->getJson('/api/v1/trust-badges')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'نماد اعتماد الکترونیکی')
            ->assertJsonPath('data.0.link', 'https://trustseal.enamad.ir/?id=123');
    }

    public function test_public_badges_exclude_inactive_and_imageless_items(): void
    {
        TrustBadge::query()->create([
            'title' => 'فعال',
            'image' => 'trust-badges/active.png',
            'sort_order' => 2,
            'is_active' => true,
        ]);

        TrustBadge::query()->create([
            'title' => 'غیرفعال',
            'image' => 'trust-badges/inactive.png',
            'sort_order' => 1,
            'is_active' => false,
        ]);

        // رکورد نیمه‌کارهٔ بدون تصویر نباید روی سایت رندر شود.
        TrustBadge::query()->create([
            'title' => 'بدون تصویر',
            'image' => '',
            'is_active' => true,
        ]);

        $this->getJson('/api/v1/trust-badges')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'فعال');
    }

    public function test_admin_can_update_status_and_delete_badge(): void
    {
        $this->admin();

        $badge = TrustBadge::query()->create([
            'title' => 'ساماندهی',
            'image' => 'trust-badges/samandehi.png',
            'is_active' => true,
        ]);

        $this->patchJson("/api/v1/admin/trust-badges/{$badge->id}/status", [
            'is_active' => false,
        ])
            ->assertOk()
            ->assertJsonPath('data.is_active', false);

        $this->getJson('/api/v1/trust-badges')->assertOk()->assertJsonCount(0, 'data');

        $this->deleteJson("/api/v1/admin/trust-badges/{$badge->id}")
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('trust_badges', ['id' => $badge->id]);
    }

    public function test_admin_can_upload_badge_image(): void
    {
        Storage::fake('public');

        $this->admin();

        // افزونهٔ GD روی این محیط نصب نیست؛ یک PNG واقعی کوچک می‌سازیم.
        $binary = base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8AAAwAB/wF+9MxKAAAAAElFTkSuQmCC'
        );

        $tempPath = tempnam(sys_get_temp_dir(), 'badge').'.png';
        file_put_contents($tempPath, $binary);

        try {
            $upload = new UploadedFile($tempPath, 'enamad.png', 'image/png', null, true);

            $response = $this->postJson('/api/v1/admin/trust-badges/image', [
                'image' => $upload,
            ]);
        } finally {
            @unlink($tempPath);
        }

        $response->assertCreated()->assertJsonPath('success', true);

        $path = $response->json('data.path');

        $this->assertStringStartsWith('trust-badges/', $path);
        Storage::disk('public')->assertExists($path);
    }

    public function test_guest_cannot_manage_badges(): void
    {
        $this->postJson('/api/v1/admin/trust-badges', [
            'title' => 'غیرمجاز',
            'image' => 'trust-badges/x.png',
        ])->assertUnauthorized();
    }
}
