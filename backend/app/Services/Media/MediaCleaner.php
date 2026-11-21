<?php

namespace App\Services\Media;

use App\Models\Banner;
use Illuminate\Support\Facades\Storage;
use Throwable;

/**
 * پاک‌سازی فایل‌های تصویری که دیگر به هیچ ردیفی ارجاع ندارند.
 *
 * چرا: پیش از این حذف بنر فقط ردیف دیتابیس را پاک می‌کرد و تصویر در
 * `storage/app/public/banners` می‌ماند؛ نتیجه، اشغال بی‌رویهٔ دیسک و انبوه
 * فایل‌های یتیم بود. حذف فایل فقط وقتی انجام می‌شود که هیچ بنر دیگری (حتی
 * ستون تصویر موبایلِ همان بنر) به همان مسیر اشاره نکند تا بنرهای هم‌تصویر
 * نشکنند.
 *
 * مسیرهای بیرون از پوشهٔ `banners` (مثل `/images/hero.png` در فرانت یا نشانی
 * کامل http) هرگز حذف نمی‌شوند؛ مالک آن‌ها این سرویس نیست.
 */
final class MediaCleaner
{
    /** پوشه‌ای که تصاویر آپلودی بنر در آن ذخیره می‌شوند. */
    public const BANNER_DIRECTORY = 'banners';

    /**
     * مسیرهای تصویر یک بنر (یکتا و فقط مسیرهای داخلیِ پوشهٔ بنرها).
     *
     * @return list<string>
     */
    public static function bannerPaths(Banner $banner): array
    {
        $paths = [];

        foreach ([$banner->image, $banner->mobile_image] as $candidate) {
            if (! self::isManagedBannerPath($candidate)) {
                continue;
            }

            $path = self::normalize($candidate);

            if (! in_array($path, $paths, true)) {
                $paths[] = $path;
            }
        }

        return $paths;
    }

    /**
     * مسیر، داخل پوشهٔ بنرها و امن است؟
     * مسیرهای فرانت‌اند (`/images/...`) و نشانی‌های بیرونی «مدیریت‌شده» نیستند.
     */
    public static function isManagedBannerPath(?string $path): bool
    {
        $path = self::normalize($path);

        return $path !== ''
            && str_starts_with($path, self::BANNER_DIRECTORY . '/')
            && ! str_contains($path, '..');
    }

    /** مسیر نرمال‌شده (بدون فاصله/بک‌اسلش/اسلش ابتدایی) برای مقایسه با دیسک. */
    public static function normalize(?string $path): string
    {
        $value = is_string($path) ? trim($path) : '';
        $value = str_replace('\\', '/', $value);

        return ltrim($value, '/');
    }

    /** آیا بنر دیگری (غیر از بنر داده‌شده) از این مسیر استفاده می‌کند؟ */
    public static function isBannerPathUsed(string $path, ?int $ignoreBannerId = null): bool
    {
        $path = self::normalize($path);

        if ($path === '') {
            return false;
        }

        return Banner::query()
            ->when($ignoreBannerId !== null, fn ($query) => $query->whereKeyNot($ignoreBannerId))
            ->where(function ($query) use ($path): void {
                $query->where('image', $path)->orWhere('mobile_image', $path);
            })
            ->exists();
    }

    /**
     * حذف فایل بنر اگر هیچ ردیفی به آن ارجاع ندارد.
     * خروجی: آیا فایل واقعاً از دیسک حذف شد؟
     */
    public static function deleteBannerFile(?string $path, ?int $ignoreBannerId = null): bool
    {
        if (! self::isManagedBannerPath($path)) {
            return false;
        }

        $path = self::normalize($path);

        if (self::isBannerPathUsed($path, $ignoreBannerId)) {
            return false;
        }

        return self::deleteFile($path);
    }

    /**
     * حذف فایل تازه‌آپلودشده‌ای که ذخیره نشد (بستن/انصراف از فرم).
     * همان قید «بدون ارجاع» را دارد تا درخواست دستکاری‌شده نتواند تصویر
     * بنرهای منتشرشده را پاک کند.
     */
    public static function deleteOrphanBannerUpload(?string $path): bool
    {
        return self::deleteBannerFile($path);
    }

    /** حذف امن فایل از دیسک؛ هر خطایی بی‌صدا نادیده گرفته می‌شود. */
    public static function deleteFile(string $path, string $disk = 'public'): bool
    {
        try {
            $storage = Storage::disk($disk);

            if (! $storage->exists($path)) {
                return false;
            }

            return (bool) $storage->delete($path);
        } catch (Throwable) {
            return false;
        }
    }
}
