<?php

namespace Tests\Feature;

use App\Models\Banner;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * کامند `media:prune`: حذف فایل‌های یتیم بدون آسیب به فایل‌های ارجاع‌دار و
 * فایل‌های تازه (برای اینکه آپلود نیمه‌کارهٔ مدیر پاک نشود).
 */
class MediaPruneTest extends TestCase
{
    use RefreshDatabase;

    public function test_dry_run_reports_orphans_without_deleting_them(): void
    {
        Storage::fake('public');

        Storage::disk('public')->put('banners/used.jpg', 'x');
        Storage::disk('public')->put('banners/orphan.jpg', 'x');

        Banner::query()->create([
            'image' => 'banners/used.jpg',
            'position' => 'home_hero',
        ]);

        $this->artisan('media:prune', ['--days' => 0, '--dir' => ['banners']])
            ->assertSuccessful();

        Storage::disk('public')->assertExists('banners/orphan.jpg');
        Storage::disk('public')->assertExists('banners/used.jpg');
    }

    public function test_apply_deletes_only_unreferenced_files(): void
    {
        Storage::fake('public');

        Storage::disk('public')->put('banners/used.jpg', 'x');
        Storage::disk('public')->put('banners/orphan.jpg', 'x');

        Banner::query()->create([
            'image' => 'banners/used.jpg',
            'position' => 'home_hero',
        ]);

        $this->artisan('media:prune', [
            '--apply' => true,
            '--days' => 0,
            '--dir' => ['banners'],
        ])->assertSuccessful();

        Storage::disk('public')->assertMissing('banners/orphan.jpg');
        Storage::disk('public')->assertExists('banners/used.jpg');
    }

    public function test_mobile_image_column_counts_as_a_reference(): void
    {
        Storage::fake('public');

        Storage::disk('public')->put('banners/mobile-only.jpg', 'x');

        Banner::query()->create([
            'image' => 'banners/desktop.jpg',
            'mobile_image' => 'banners/mobile-only.jpg',
            'position' => 'home_hero',
        ]);

        $this->artisan('media:prune', [
            '--apply' => true,
            '--days' => 0,
            '--dir' => ['banners'],
        ])->assertSuccessful();

        Storage::disk('public')->assertExists('banners/mobile-only.jpg');
    }

    public function test_recent_files_are_kept_within_the_default_window(): void
    {
        Storage::fake('public');

        Storage::disk('public')->put('banners/fresh.jpg', 'x');

        $this->artisan('media:prune', ['--apply' => true, '--dir' => ['banners']])
            ->assertSuccessful();

        Storage::disk('public')->assertExists('banners/fresh.jpg');
    }

    public function test_reference_stored_as_absolute_url_is_respected(): void
    {
        Storage::fake('public');

        Storage::disk('public')->put('banners/abs.jpg', 'x');

        // اگر مسیر در دیتابیس با دامنه ذخیره شده باشد، فایل نباید یتیم شمرده شود.
        Banner::query()->create([
            'image' => 'https://shop.test/storage/banners/abs.jpg',
            'position' => 'home_hero',
        ]);

        $this->artisan('media:prune', [
            '--apply' => true,
            '--days' => 0,
            '--dir' => ['banners'],
        ])->assertSuccessful();

        Storage::disk('public')->assertExists('banners/abs.jpg');
    }

    public function test_unknown_directory_is_rejected(): void
    {
        Storage::fake('public');

        $this->artisan('media:prune', ['--dir' => ['not-a-directory']])
            ->assertFailed();
    }
}
