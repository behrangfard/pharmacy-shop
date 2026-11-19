<?php

namespace App\Console\Commands;

use App\Models\AnnouncementBarItem;
use App\Models\Article;
use App\Models\Banner;
use App\Models\Popup;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\Story;
use App\Models\TrustBadge;
use App\Services\Media\WebpConverter;
use App\Support\StorefrontCache;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

/**
 * گزارش/تبدیل تصاویر فروشگاه به WebP.
 *
 * پیش‌فرض فقط «گزارش» است (dry-run): می‌گوید چند فایل قابل تبدیل در هر پوشه
 * هست. با `--apply` واقعاً تبدیل می‌شود و مسیرهای دیتابیس هم به فایل جدید
 * به‌روزشده می‌شوند؛ نسخهٔ اصلی همان‌جا حذف می‌شود و کش ویترین پاک می‌گردد.
 *
 *   php artisan images:webp            ← فقط گزارش
 *   php artisan images:webp --apply    ← تبدیل واقعی
 *
 * تبدیل به افزونهٔ `gd` (با imagewebp) یا `imagick` نیاز دارد؛ در نبود آن‌ها
 * این کامند صریح هشدار می‌دهد و هیچ فایلی تغییر نمی‌کند.
 */
class OptimizeImagesToWebp extends Command
{
    protected $signature = 'images:webp
                            {--apply : تبدیل واقعی فایل‌ها (پیش‌فرض فقط گزارش است)}
                            {--path=* : فقط این پوشه‌ها (مسیر نسبی روی دیسک public)}';

    protected $description = 'تبدیل تصاویر JPG/PNG به WebP و به‌روزرسانی مسیرهای دیتابیس (پیش‌فرض: فقط گزارش)';

    /** جدول/ستون‌هایی که مسیر تصویر را نگه می‌دارند. */
    private const PATH_COLUMNS = [
        'product_images' => ['path'],
        'products' => ['thumbnail'],
        'banners' => ['image', 'mobile_image'],
        'popups' => ['image'],
        'stories' => ['image'],
        'articles' => ['cover'],
        'trust_badges' => ['image'],
        'announcement_bar_items' => ['image'],
        'product_size_guides' => ['measure_image'],
    ];

    public function handle(): int
    {
        if (WebpConverter::driver() === null) {
            $this->warn('هیچ افزونهٔ تصویری برای تبدیل WebP فعال نیست (ext-gd با imagewebp یا ext-imagick).');
            $this->line('فعال‌سازی ext-gd و اجرای دوبارهٔ همین کامند لازم است. هیچ فایلی تغییر نکرد.');

            return self::SUCCESS;
        }

        if (! WebpConverter::isEnabled()) {
            $this->warn('تبدیل WebP با MEDIA_WEBP=false خاموش است. هیچ فایلی تغییر نکرد.');

            return self::SUCCESS;
        }

        $directories = (array) ($this->option('path') ?: config('media.webp.directories', []));
        $disk = Storage::disk('public');

        $candidates = [];

        foreach ($directories as $directory) {
            foreach ($disk->allFiles($directory) as $file) {
                if (WebpConverter::canConvert($file) && $disk->exists($file)) {
                    $candidates[] = $file;
                }
            }
        }

        $totalBytes = 0;

        foreach ($candidates as $file) {
            $totalBytes += (int) $disk->size($file);
        }

        $this->info(sprintf(
            '%d فایل JPG/PNG قابل تبدیل در %d پوشه (%s).',
            count($candidates),
            count($directories),
            $this->formatBytes($totalBytes)
        ));

        foreach ($directories as $directory) {
            $count = count(array_filter(
                $candidates,
                fn (string $file): bool => str_starts_with($file, rtrim($directory, '/') . '/')
            ));

            $this->line(sprintf(' - %s: %d فایل', $directory, $count));
        }

        if (! $this->option('apply')) {
            $this->line('برای تبدیل واقعی: php artisan images:webp --apply');

            return self::SUCCESS;
        }

        $converted = 0;
        $updatedRows = 0;
        $failed = 0;

        foreach ($candidates as $file) {
            $target = WebpConverter::targetPath($file);
            $convertedPath = WebpConverter::convert($file);

            if ($convertedPath !== $file && $disk->exists($target)) {
                $converted++;
                $updatedRows += $this->updateDatabasePaths($file, $target);
            } else {
                $failed++;
            }
        }

        if ($converted > 0) {
            StorefrontCache::flushCatalog();
            StorefrontCache::flushBanners();
            StorefrontCache::flushPopups();
            StorefrontCache::flushStories();
            StorefrontCache::flushTrustBadges();
            StorefrontCache::flushAnnouncementBar();
        }

        $this->info(sprintf(
            '%d فایل به WebP تبدیل شد؛ %d ردیف دیتابیس به‌روزرسانی شد؛ %d مورد ناموفق بود.',
            $converted,
            $updatedRows,
            $failed
        ));

        return self::SUCCESS;
    }

    /** مسیر قدیمی را در همهٔ جدول/ستون‌های شناخته‌شده به مسیر جدید می‌بَرد. */
    private function updateDatabasePaths(string $from, string $to): int
    {
        $updated = 0;

        foreach (self::PATH_COLUMNS as $table => $columns) {
            foreach ($columns as $column) {
                $updated += (int) \Illuminate\Support\Facades\DB::table($table)
                    ->where($column, $from)
                    ->update([$column => $to]);
            }
        }

        return $updated;
    }

    private function formatBytes(int $bytes): string
    {
        if ($bytes >= 1048576) {
            return sprintf('%.1f مگابایت', $bytes / 1048576);
        }

        if ($bytes >= 1024) {
            return sprintf('%.1f کیلوبایت', $bytes / 1024);
        }

        return sprintf('%d بایت', $bytes);
    }
}
