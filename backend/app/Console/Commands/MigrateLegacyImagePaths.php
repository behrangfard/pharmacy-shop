<?php

namespace App\Console\Commands;

use App\Models\Banner;
use App\Models\Product;
use App\Models\ProductImage;
use App\Support\StorefrontCache;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;

/**
 * گزارش یکپارچه‌سازی مسیر تصاویر محصول (بدهی ۵).
 *
 * پیشینه: در نسخه‌های قدیمی، تصاویر در `storage/app/public/products/`
 * ذخیره می‌شدند؛ الان همه‌چیز در `product-images/{product_id}/` است و
 * `backend/public/storage-old/` هم بازماندهٔ یک جابه‌جایی قدیمی است.
 *
 * پیش‌فرض فقط «گزارش» است و هیچ چیز را تغییر نمی‌دهد (طبق قاعدهٔ ۷
 * AGENTS.md حذف/جابه‌جایی دادهٔ واقعی بدون هماهنگی ممنوع است). با
 * `--apply` فایل‌های قدیمی به مسیر استاندارد منتقل و مسیرهای دیتابیس
 * به‌روزرسانی می‌شوند؛ هیچ فایلی حذف نمی‌شود.
 *
 *   php artisan images:migrate-legacy            ← فقط گزارش و شمارش
 *   php artisan images:migrate-legacy --apply    ← جابه‌جایی واقعی فایل‌ها
 */
class MigrateLegacyImagePaths extends Command
{
    protected $signature = 'images:migrate-legacy
                            {--apply : جابه‌جایی واقعی فایل‌ها و به‌روزرسانی مسیرها (پیش‌فرض فقط گزارش)}
                            {--limit=10 : حداکثر نمونهٔ مسیر در گزارش}';

    protected $description = 'گزارش و یکپارچه‌سازی مسیرهای قدیمی تصاویر (پوشهٔ products و storage-old)';

    private const LEGACY_PREFIX = 'products/';

    private const TARGET_PREFIX = 'product-images/';

    public function handle(): int
    {
        $limit = max((int) $this->option('limit'), 1);
        $disk = Storage::disk('public');

        $productThumbnailRows = Product::query()
            ->where('thumbnail', 'like', self::LEGACY_PREFIX . '%')
            ->pluck('thumbnail', 'id');

        $productImageRows = ProductImage::query()
            ->where('path', 'like', self::LEGACY_PREFIX . '%')
            ->get(['id', 'product_id', 'path']);

        $bannerRows = Banner::query()
            ->where(function ($query): void {
                $query
                    ->where('image', 'like', self::LEGACY_PREFIX . '%')
                    ->orWhere('mobile_image', 'like', self::LEGACY_PREFIX . '%');
            })
            ->get(['id', 'image', 'mobile_image']);

        $legacyFiles = collect($disk->allFiles(rtrim(self::LEGACY_PREFIX, '/')));

        $storageOldPath = base_path('public/storage-old');
        $storageOldFiles = is_dir($storageOldPath)
            ? collect(File::allFiles($storageOldPath))
            : collect();

        $this->info('گزارش مسیرهای قدیمی تصاویر (بدون هیچ تغییری):');
        $this->line(sprintf(
            ' - ردیف‌های products.thumbnail با مسیر قدیمی: %d',
            $productThumbnailRows->count()
        ));
        $this->line(sprintf(
            ' - ردیف‌های product_images.path با مسیر قدیمی: %d',
            $productImageRows->count()
        ));
        $this->line(sprintf(
            ' - ردیف‌های banners.image / mobile_image با مسیر قدیمی: %d',
            $bannerRows->count()
        ));
        $this->line(sprintf(
            ' - فایل‌های واقعی داخل storage/app/public/products: %d',
            $legacyFiles->count()
        ));

        if ($storageOldFiles->isNotEmpty()) {
            $bytes = $storageOldFiles->sum(
                fn (\SplFileInfo $file): int => $file->getSize()
            );

            $this->line(sprintf(
                ' - backend/public/storage-old: %d فایل (%s) — دست‌نخورده می‌ماند؛ حذف آن نیاز به تأیید شما دارد.',
                $storageOldFiles->count(),
                $this->formatBytes((int) $bytes)
            ));
        } else {
            $this->line(' - backend/public/storage-old: وجود ندارد.');
        }

        foreach ($productImageRows->take($limit) as $row) {
            $this->line(sprintf(
                '   * product_images#%d (محصول %d): %s',
                $row->id,
                $row->product_id,
                $row->path
            ));
        }

        if (
            $productThumbnailRows->count()
            + $productImageRows->count()
            + $bannerRows->count() === 0
        ) {
            $this->info('هیچ مسیر قدیمی‌ای در دیتابیس نیست؛ یکپارچه‌سازی کامل شده است.');

            return self::SUCCESS;
        }

        if (! $this->option('apply')) {
            $this->line('برای جابه‌جایی واقعی فایل‌ها (بدون حذف): php artisan images:migrate-legacy --apply');

            return self::SUCCESS;
        }

        // ادامه: اجرای واقعی جابه‌جایی — در بخش پایین همین فایل.
        return $this->applyMigration($disk, $productThumbnailRows, $productImageRows, $bannerRows);
    }

    /**
     * جابه‌جایی واقعی فایل‌ها و به‌روزرسانی مسیرهای دیتابیس.
     *
     * @param  \Illuminate\Support\Collection<int, int|string>  $productThumbnailRows
     * @param  \Illuminate\Support\Collection<int, \App\Models\ProductImage>  $productImageRows
     * @param  \Illuminate\Support\Collection<int, \App\Models\Banner>  $bannerRows
     */
    private function applyMigration(
        $disk,
        $productThumbnailRows,
        $productImageRows,
        $bannerRows
    ): int {
        $moved = 0;
        $missingFiles = 0;

        foreach ($productImageRows as $row) {
            $result = $this->migrateFile(
                $disk,
                $row->path,
                self::TARGET_PREFIX . $row->product_id . '/' . basename($row->path)
            );

            if ($result === null) {
                $missingFiles++;

                continue;
            }

            ProductImage::query()->where('id', $row->id)->update(['path' => $result]);
            $moved++;
        }

        foreach ($productThumbnailRows as $productId => $thumbnail) {
            $result = $this->migrateFile(
                $disk,
                is_string($thumbnail) ? $thumbnail : null,
                self::TARGET_PREFIX . $productId . '/' . basename((string) $thumbnail)
            );

            if ($result === null) {
                $missingFiles++;

                continue;
            }

            Product::query()->where('id', $productId)->update(['thumbnail' => $result]);
            $moved++;
        }

        foreach ($bannerRows as $banner) {
            foreach (['image', 'mobile_image'] as $column) {
                $path = $banner->{$column};

                if (
                    ! is_string($path)
                    || ! str_starts_with($path, self::LEGACY_PREFIX)
                ) {
                    continue;
                }

                $result = $this->migrateFile($disk, $path, 'banners/' . basename($path));

                if ($result === null) {
                    $missingFiles++;

                    continue;
                }

                Banner::query()->where('id', $banner->id)->update([$column => $result]);
                $moved++;
            }
        }

        if ($moved > 0) {
            StorefrontCache::flushCatalog();
            StorefrontCache::flushBanners();
        }

        $this->info(sprintf(
            '%d مسیر منتقل و به‌روزرسانی شد؛ %d فایل روی دیسک پیدا نشد (مسیرش دست‌نخورده ماند).',
            $moved,
            $missingFiles
        ));

        $leftover = collect($disk->allFiles(rtrim(self::LEGACY_PREFIX, '/')));

        if ($leftover->isNotEmpty()) {
            $this->warn(sprintf(
                'پوشهٔ products هنوز %d فایل دارد (باقی‌مانده‌های بدون ردیف دیتابیس). حذف آن با تأیید شماست.',
                $leftover->count()
            ));
        }

        return self::SUCCESS;
    }

    /**
     * انتقال یک فایل روی دیسک و برگرداندن مسیر جدید.
     *
     * اگر مقصد از قبل وجود داشته باشد، فایل مبدا دست‌نخورده می‌ماند و مسیر
     * قدیمی هم معتبر می‌ماند تا بازبینی دستی شود (هیچ‌چیز از دست نمی‌رود).
     *
     * @param  \Illuminate\Filesystem\FilesystemAdapter  $disk
     * @return string|null مسیر جدید؛ `null` یعنی جابه‌جایی انجام نشد.
     */
    private function migrateFile($disk, ?string $from, string $to): ?string
    {
        $from = is_string($from) ? trim($from) : '';

        if ($from === '' || ! $disk->exists($from)) {
            return null;
        }

        if ($disk->exists($to)) {
            $this->line(sprintf(
                ' - مقصد از قبل موجود بود، جابه‌جا نشد: %s → %s',
                $from,
                $to
            ));

            return null;
        }

        $disk->move($from, $to);

        return $to;
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
