<?php

namespace Tests\Feature;

use App\Models\Banner;
use App\Models\BannerFont;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * متن‌های مدیریت‌شده روی بنر (تصویر بدون متن + متن HTML) و کتابخانه فونت.
 */
class BannerTextOverlayTest extends TestCase
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
     * @param array<string, mixed> $overrides
     * @return array<string, mixed>
     */
    private function layer(array $overrides = []): array
    {
        return array_merge([
            'id' => 'headline',
            'text' => 'پوست شفاف و سالم',
            'tag' => 'h1',
            'x' => 8,
            'y' => 24,
            'width' => 46,
            'align' => 'right',
            'font_family' => 'Vazirmatn',
            'font_size' => 48,
            'font_weight' => 800,
            'line_height' => 1.4,
            'letter_spacing' => 0,
            'color' => '#123456',
            'shadow' => 'medium',
        ], $overrides);
    }

    public function test_admin_can_save_text_layers_and_public_endpoint_returns_them(): void
    {
        $this->admin();

        $this->postJson('/api/v1/admin/banners', [
            'image' => '/images/women-sport-hero.png',
            'image_alt' => 'بنر اصلی فروشگاه',
            'text_scrim' => 'medium',
            'position' => 'home_hero',
            'is_active' => true,
            'text_layers' => [
                $this->layer(),
                $this->layer([
                    'id' => 'cta',
                    'text' => 'همین حالا سفارش دهید',
                    'tag' => 'p',
                    'x' => 8,
                    'y' => 62,
                    'width' => 32,
                    'font_size' => 20,
                    'font_weight' => 600,
                ]),
            ],
        ])
            ->assertCreated()
            ->assertJsonPath('data.image_alt', 'بنر اصلی فروشگاه')
            ->assertJsonPath('data.text_scrim', 'medium');

        $this->assertDatabaseHas('banners', [
            'image_alt' => 'بنر اصلی فروشگاه',
            'text_scrim' => 'medium',
        ]);

        // متن‌ها HTML واقعی هستند و موتور جستجو آن‌ها را در پاسخ عمومی می‌بیند.
        $this->getJson('/api/v1/banners?position=home_hero')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.image_alt', 'بنر اصلی فروشگاه')
            ->assertJsonPath('data.0.text_scrim', 'medium')
            ->assertJsonPath('data.0.text_layers.0.id', 'headline')
            ->assertJsonPath('data.0.text_layers.0.text', 'پوست شفاف و سالم')
            ->assertJsonPath('data.0.text_layers.0.tag', 'h1')
            ->assertJsonPath('data.0.text_layers.1.id', 'cta')
            ->assertJsonPath('data.0.text_layers.1.text', 'همین حالا سفارش دهید');
    }

    public function test_text_layers_are_normalized_before_saving(): void
    {
        $this->admin();

        $response = $this->postJson('/api/v1/admin/banners', [
            'image' => '/images/women-sport-hero.png',
            'text_scrim' => null,
            'position' => 'home_hero',
            'text_layers' => [
                $this->layer([
                    'x' => 140,
                    'y' => -20,
                    'color' => '#fff;color:red',
                    'align' => 'sideways',
                    'tag' => 'script',
                    'shadow' => 'neon',
                    'font_family' => 'Comic; X',
                    'font_weight' => 950,
                    'onclick' => 'alert(1)',
                ]),
                ['id' => 'headline', 'text' => 'لایه دوم با شناسه تکراری'],
                ['text' => '   '],
            ],
        ]);

        $response->assertCreated()->assertJsonPath('data.text_scrim', 'none');

        $layers = $response->json('data.text_layers');

        $this->assertCount(2, $layers);

        // موقعیت‌ها درصدی و محدود می‌شوند.
        $this->assertEquals(100, $layers[0]['x']);
        $this->assertEquals(0, $layers[0]['y']);

        // رنگ غیر هگز پذیرفته نمی‌شود و به مقدار پیش‌فرض برمی‌گردد.
        $this->assertSame('#ffffff', $layers[0]['color']);
        $this->assertSame('right', $layers[0]['align']);
        $this->assertSame('p', $layers[0]['tag']);
        $this->assertSame('soft', $layers[0]['shadow']);
        $this->assertNull($layers[0]['font_family']);
        $this->assertSame(700, $layers[0]['font_weight']);

        // کلیدهای ناشناخته ذخیره نمی‌شوند.
        $this->assertArrayNotHasKey('onclick', $layers[0]);

        // شناسه تکراری یکتا می‌شود و لایه خالی حذف می‌شود.
        $this->assertSame('headline-2', $layers[1]['id']);

        // مقدار نامعتبر پرده متن به‌جای ذخیره، خطای اعتبارسنجی می‌دهد.
        $this->postJson('/api/v1/admin/banners', [
            'image' => 'banners/scrim.jpg',
            'position' => 'home_hero',
            'text_scrim' => 'green',
        ])->assertStatus(422);
    }

    public function test_updating_with_empty_text_layers_clears_them(): void
    {
        $this->admin();

        $banner = Banner::query()->create([
            'image' => 'banners/hero.jpg',
            'position' => 'home_hero',
            'is_active' => true,
            'text_layers' => [$this->layer()],
        ]);

        $this->assertTrue($banner->fresh()->hasTextLayers());

        $this->putJson("/api/v1/admin/banners/{$banner->id}", [
            'image' => 'banners/hero.jpg',
            'position' => 'home_hero',
            'text_layers' => [],
        ])->assertOk()->assertJsonPath('success', true);

        $this->assertNull($banner->fresh()->text_layers);
        $this->assertFalse($banner->fresh()->hasTextLayers());
    }

    public function test_admin_can_upload_banner_font_file(): void
    {
        Storage::fake('public');

        $this->admin();

        $tempPath = tempnam(sys_get_temp_dir(), 'font').'.woff2';
        file_put_contents($tempPath, 'wOF2-fake-font-bytes');

        try {
            $upload = new UploadedFile($tempPath, 'Vazir-Bold.woff2', 'font/woff2', null, true);

            $response = $this->postJson('/api/v1/admin/banner-fonts', [
                'name' => 'وزیرمتن ضخیم',
                'family' => 'Vazirmatn',
                'weight' => 700,
                'style' => 'normal',
                'file' => $upload,
            ]);
        } finally {
            @unlink($tempPath);
        }

        $response->assertCreated()
            ->assertJsonPath('data.family', 'Vazirmatn')
            ->assertJsonPath('data.source', 'upload')
            ->assertJsonPath('data.format', 'woff2')
            ->assertJsonPath('data.is_stylesheet', false);

        $font = BannerFont::query()->firstOrFail();

        $this->assertSame('upload', $font->source);
        $this->assertSame('woff2', $font->file_format);
        $this->assertSame(700, $font->weight);
        $this->assertStringStartsWith('banner-fonts/', $font->file_path);
        Storage::disk('public')->assertExists($font->file_path);

        // فایل از مسیر API سرو می‌شود تا هدر CORS داشته باشد.
        $response->assertJsonPath('data.file_url', $font->fontFileUrl());
    }

    public function test_admin_can_register_external_font_and_toggle_its_status(): void
    {
        $this->admin();

        $this->postJson('/api/v1/admin/banner-fonts', [
            'source' => 'url',
            'name' => 'وزیرمتن از گوگل فونت',
            'family' => 'Vazirmatn',
            'weight' => 400,
            'external_url' => 'https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400&display=swap',
        ])
            ->assertCreated()
            ->assertJsonPath('data.source', 'url')
            ->assertJsonPath('data.is_stylesheet', true)
            ->assertJsonPath('data.file_url', null);

        $font = BannerFont::query()->firstOrFail();

        $this->getJson('/api/v1/banner-fonts')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.family', 'Vazirmatn');

        $this->patchJson("/api/v1/admin/banner-fonts/{$font->id}/status", [
            'is_active' => false,
        ])
            ->assertOk()
            ->assertJsonPath('data.is_active', false);

        // کش فروشگاه با تغییر وضعیت پاک می‌شود و فونت غیرفعال دیده نمی‌شود.
        $this->getJson('/api/v1/banner-fonts')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_uploaded_font_file_is_served_with_cors_headers(): void
    {
        Storage::fake('public');

        $font = BannerFont::query()->create([
            'name' => 'فونت محلی',
            'family' => 'LocalBannerFont',
            'source' => 'upload',
            'file_path' => 'banner-fonts/local.woff2',
            'file_format' => 'woff2',
            'weight' => 400,
            'style' => 'normal',
            'is_active' => true,
        ]);

        Storage::disk('public')->put('banner-fonts/local.woff2', 'wOF2-bytes');

        $this->get("/api/v1/banner-fonts/{$font->id}/file")
            ->assertOk()
            ->assertHeader('content-type', 'font/woff2')
            ->assertHeader('access-control-allow-origin', '*');

        // فونتی که با نشانی بیرونی ثبت شده فایل محلی ندارد.
        $external = BannerFont::query()->create([
            'name' => 'فونت بیرونی',
            'family' => 'ExternalFont',
            'source' => 'url',
            'external_url' => 'https://example.com/font.woff2',
            'file_format' => 'woff2',
            'weight' => 400,
            'style' => 'normal',
            'is_active' => true,
        ]);

        $this->get("/api/v1/banner-fonts/{$external->id}/file")->assertNotFound();
    }

    public function test_admin_can_delete_banner_font_and_its_file(): void
    {
        Storage::fake('public');

        $this->admin();

        $font = BannerFont::query()->create([
            'name' => 'فونت حذف‌شدنی',
            'family' => 'RemovableFont',
            'source' => 'upload',
            'file_path' => 'banner-fonts/remove.woff2',
            'file_format' => 'woff2',
            'weight' => 400,
            'style' => 'normal',
            'is_active' => true,
        ]);

        Storage::disk('public')->put('banner-fonts/remove.woff2', 'wOF2-bytes');

        $this->deleteJson("/api/v1/admin/banner-fonts/{$font->id}")
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('banner_fonts', ['id' => $font->id]);
        Storage::disk('public')->assertMissing('banner-fonts/remove.woff2');
    }

    public function test_font_upload_rejects_unsupported_file_types(): void
    {
        Storage::fake('public');

        $this->admin();

        $tempPath = tempnam(sys_get_temp_dir(), 'font').'.exe';
        file_put_contents($tempPath, 'MZ-fake');

        try {
            $upload = new UploadedFile($tempPath, 'font.exe', 'application/octet-stream', null, true);

            $this->postJson('/api/v1/admin/banner-fonts', [
                'name' => 'فایل نامعتبر',
                'file' => $upload,
            ])->assertStatus(422);
        } finally {
            @unlink($tempPath);
        }

        $this->assertDatabaseCount('banner_fonts', 0);
    }

    public function test_guest_cannot_manage_banner_fonts(): void
    {
        $this->postJson('/api/v1/admin/banner-fonts', [
            'source' => 'url',
            'name' => 'فونت',
            'family' => 'SomeFont',
            'external_url' => 'https://example.com/font.css',
        ])->assertUnauthorized();
    }
}
