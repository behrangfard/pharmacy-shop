<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\BannerController;
use App\Models\Banner;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminBannerTest extends TestCase
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

    public function test_admin_can_create_banner_and_public_endpoint_refreshes(): void
    {
        $this->admin();

        // کش عمومی را خالی/پر می‌کنیم تا رفتار invalidation بررسی شود.
        $this->getJson('/api/v1/banners')->assertOk()->assertJsonCount(0, 'data');

        $this->postJson('/api/v1/admin/banners', [
            'title' => 'حراج پاییزه',
            'image' => 'banners/autumn.jpg',
            'position' => 'home_hero',
            'sort_order' => 1,
            'is_active' => true,
        ])
            ->assertCreated()
            ->assertJsonPath('data.title', 'حراج پاییزه');

        $this->getJson('/api/v1/banners')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'حراج پاییزه');
    }

    public function test_public_banners_exclude_inactive_and_expired_items(): void
    {
        Banner::query()->create([
            'title' => 'فعال',
            'image' => 'banners/active.jpg',
            'position' => 'home_hero',
            'is_active' => true,
        ]);

        Banner::query()->create([
            'title' => 'غیرفعال',
            'image' => 'banners/inactive.jpg',
            'position' => 'home_hero',
            'is_active' => false,
        ]);

        Banner::query()->create([
            'title' => 'منقضی',
            'image' => 'banners/expired.jpg',
            'position' => 'home_hero',
            'is_active' => true,
            'ends_at' => now()->subDay(),
        ]);

        $this->getJson('/api/v1/banners')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'فعال');
    }

    public function test_public_banners_stay_an_array_when_served_from_cache(): void
    {
        Banner::query()->create([
            'title' => 'کش‌شده',
            'image' => 'banners/cached.jpg',
            'position' => 'home_hero',
            'is_active' => true,
        ]);

        // درخواست اول کش را پر می‌کند.
        $this->getJson('/api/v1/banners')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'کش‌شده');

        // مقدار کش باید آرایه باشد؛ اگر Collection مدل ذخیره شود در درایورهای
        // database/file به __PHP_Incomplete_Class تبدیل می‌شد و پاسخ JSON به‌جای
        // آرایه یک شیء برمی‌گرداند (بنرها بعد از رفرش ناپدید می‌شدند).
        $this->assertIsArray(Cache::get(BannerController::STOREFRONT_CACHE_KEY));

        // درخواست دوم از کش خوانده می‌شود و باید همان آرایه را برگرداند.
        $this->getJson('/api/v1/banners')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'کش‌شده');
    }

    public function test_public_banners_respect_start_and_end_window_with_cache(): void
    {
        Banner::query()->create([
            'title' => 'در حال نمایش',
            'image' => 'banners/now.jpg',
            'position' => 'home_hero',
            'is_active' => true,
            'starts_at' => now()->subHour(),
            'ends_at' => now()->addHour(),
        ]);

        Banner::query()->create([
            'title' => 'آینده',
            'image' => 'banners/future.jpg',
            'position' => 'home_hero',
            'is_active' => true,
            'starts_at' => now()->addDay(),
        ]);

        // دو درخواست پشت‌سرهم: دومی از کش خوانده می‌شود و بازهٔ زمانی باید
        // دقیقاً روی دادهٔ کش‌شده اعمال شود.
        foreach ([1, 2] as $attempt) {
            $this->getJson('/api/v1/banners')
                ->assertOk()
                ->assertJsonCount(1, 'data')
                ->assertJsonPath('data.0.title', 'در حال نمایش');
        }
    }

    public function test_banners_can_be_filtered_by_position(): void
    {
        Banner::query()->create([
            'title' => 'هیرو',
            'image' => 'banners/hero.jpg',
            'position' => 'home_hero',
            'is_active' => true,
        ]);

        Banner::query()->create([
            'title' => 'نوار محصولات',
            'image' => 'banners/strip.jpg',
            'position' => 'products_top',
            'is_active' => true,
        ]);

        $this->getJson('/api/v1/banners?position=products_top')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'نوار محصولات');
    }

    public function test_admin_can_update_and_delete_banner(): void
    {
        $this->admin();

        $banner = Banner::query()->create([
            'title' => 'قدیمی',
            'image' => 'banners/old.jpg',
            'position' => 'home_hero',
            'is_active' => true,
        ]);

        $this->putJson("/api/v1/admin/banners/{$banner->id}", [
            'title' => 'جدید',
            'image' => 'banners/new.jpg',
            'position' => 'home_hero',
            'is_active' => true,
        ])
            ->assertOk()
            ->assertJsonPath('data.title', 'جدید');

        $this->deleteJson("/api/v1/admin/banners/{$banner->id}")
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('banners', ['id' => $banner->id]);
    }

    public function test_admin_can_upload_banner_image(): void
    {
        Storage::fake('public');

        $this->admin();

        // افزونهٔ GD روی این محیط نصب نیست؛ به‌جای UploadedFile::fake()->image()
        // یک PNG واقعی کوچک می‌سازیم تا اعتبارسنجی image معتبر بماند.
        $binary = base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8AAAwAB/wF+9MxKAAAAAElFTkSuQmCC'
        );

        $tempPath = tempnam(sys_get_temp_dir(), 'banner').'.png';
        file_put_contents($tempPath, $binary);

        try {
            $upload = new UploadedFile($tempPath, 'banner.png', 'image/png', null, true);

            $response = $this->postJson('/api/v1/admin/banners/image', [
                'image' => $upload,
            ]);
        } finally {
            @unlink($tempPath);
        }

        $response->assertCreated()->assertJsonPath('success', true);

        $path = $response->json('data.path');

        $this->assertStringStartsWith('banners/', $path);
        Storage::disk('public')->assertExists($path);
    }

    public function test_guest_cannot_manage_banners(): void
    {
        $this->postJson('/api/v1/admin/banners', [
            'title' => 'غیرمجاز',
            'image' => 'banners/x.jpg',
            'position' => 'home_hero',
        ])->assertUnauthorized();
    }

    public function test_stored_images_are_served_without_public_symlink(): void
    {
        // روی ویندوز ممکن است symlink «public/storage» ساخته نشود؛ این مسیر
        // تضمین می‌کند تصاویر بنر از storage/app/public سرو شوند.
        $binary = base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8AAAwAB/wF+9MxKAAAAAElFTkSuQmCC'
        );

        $path = 'banners/served-test.png';
        Storage::disk('public')->put($path, $binary);

        try {
            $this->get('/storage/'.$path)
                ->assertOk()
                ->assertHeader('content-type', 'image/png');
        } finally {
            Storage::disk('public')->delete($path);
        }

        $this->get('/storage/banners/does-not-exist.png')->assertNotFound();
    }

    public function test_admin_can_use_site_ready_image_for_banner(): void
    {
        $this->admin();

        // تصاویر آمادهٔ سایت در پوشهٔ public فرانت‌اند هستند و با مسیر نسبی
        // ذخیره می‌شوند؛ نباید به storage بک‌اند محدود شوند.
        $this->postJson('/api/v1/admin/banners', [
            'image' => '/images/women-sport-hero.png',
            'link' => '/products',
            'position' => 'home_hero',
            'is_active' => true,
        ])
            ->assertCreated()
            ->assertJsonPath('data.image', '/images/women-sport-hero.png');

        $this->getJson('/api/v1/banners?position=home_hero')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.image', '/images/women-sport-hero.png')
            ->assertJsonPath('data.0.link', '/products');
    }

    public function test_admin_can_store_mobile_image_for_a_banner(): void
    {
        $this->admin();

        // بنر هیرو در تمام عرض صفحه نمایش داده می‌شود؛ برای موبایل می‌توان
        // تصویری با نسبت عمودی/مربع (مثل ۷۵۰×۱۰۰۰) ثبت کرد.
        $this->postJson('/api/v1/admin/banners', [
            'image' => '/images/women-sport-hero.png',
            'mobile_image' => '/images/women-sport-hero-mobile.png',
            'link' => '/products',
            'position' => 'home_hero',
            'is_active' => true,
        ])
            ->assertCreated()
            ->assertJsonPath('data.image', '/images/women-sport-hero.png')
            ->assertJsonPath('data.mobile_image', '/images/women-sport-hero-mobile.png');

        $this->getJson('/api/v1/banners?position=home_hero')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.image', '/images/women-sport-hero.png')
            ->assertJsonPath('data.0.mobile_image', '/images/women-sport-hero-mobile.png');

        // تصویر موبایل اختیاری است و نبودنش خطا نمی‌دهد.
        $this->postJson('/api/v1/admin/banners', [
            'image' => '/images/women-sport-hero2.png',
            'position' => 'home_hero',
        ])
            ->assertCreated()
            ->assertJsonPath('data.mobile_image', null);
    }
}
