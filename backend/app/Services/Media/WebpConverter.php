<?php

namespace App\Services\Media;

use Illuminate\Support\Facades\Storage;
use Throwable;

/**
 * تبدیل تصاویر بارگذاری‌شده به WebP.
 *
 * چرا: حجم WebP معمولاً ۲۵ تا ۳۵ درصد کمتر از JPG/PNG است و همان تصویر
 * نمایشی LCP را سریع‌تر می‌آورد. مسیر ذخیره‌شده در دیتابیس همان مسیر فایل
 * تبدیل‌شده است؛ بنابراین فرانت بدون تغییر، WebP سرو می‌کند.
 *
 * محدودیت مهم: تبدیل به یکی از افزونه‌های `gd` (با پشتیبانی
 * `imagewebp`) یا `imagick` نیاز دارد. در محیطی که هیچ‌کدام فعال نیست،
 * فایل اصلی دست‌نخورده می‌ماند و `convert()` همان مسیر ورودی را برمی‌گرداند.
 */
final class WebpConverter
{
    /** پسوندهایی که به WebP تبدیل می‌شوند (GIF متحرک عمداً دست‌نخورده می‌ماند). */
    public const CONVERTIBLE_EXTENSIONS = ['jpg', 'jpeg', 'png'];

    /** افزونهٔ فعلی مورد استفاده؛ `null` یعنی تبدیل ممکن نیست. */
    public static function driver(): ?string
    {
        if (function_exists('imagewebp') && function_exists('imagecreatefromstring')) {
            return 'gd';
        }

        if (extension_loaded('imagick') && class_exists(\Imagick::class)) {
            return 'imagick';
        }

        return null;
    }

    public static function isEnabled(): bool
    {
        return (bool) config('media.webp.enabled', true);
    }

    /**
     * تبدیل در این محیط انجام می‌شود؟
     */
    public static function isSupported(): bool
    {
        return self::isEnabled() && self::driver() !== null;
    }

    /** پسوند فایل قابل تبدیل است؟ */
    public static function canConvert(string $path): bool
    {
        return in_array(
            strtolower(pathinfo($path, PATHINFO_EXTENSION)),
            self::CONVERTIBLE_EXTENSIONS,
            true
        );
    }

    /** مسیر خروجی WebP متناظر با یک مسیر ورودی. */
    public static function targetPath(string $path): string
    {
        $directory = trim(str_replace('\\', '/', dirname($path)), '/.');
        $name = pathinfo($path, PATHINFO_FILENAME) . '.webp';

        return $directory === '' || $directory === '.' ? $name : $directory . '/' . $name;
    }

    /**
     * تبدیل فایل روی دیسک و برگرداندن مسیر نهایی.
     *
     * در هر خطا (فایل نبود، افزونه نبود، خروجی نامعتبر) مسیر اصلی برمی‌گردد و
     * فایل ورودی حذف نمی‌شود؛ بنابراین این متد هرگز بارگذاری را نمی‌شکند.
     */
    public static function convert(string $path, string $disk = 'public'): string
    {
        if (! self::isSupported() || ! self::canConvert($path)) {
            return $path;
        }

        $target = self::targetPath($path);

        if ($target === $path) {
            return $path;
        }

        try {
            $storage = Storage::disk($disk);

            if (! $storage->exists($path)) {
                return $path;
            }

            $contents = $storage->get($path);

            if (! is_string($contents) || $contents === '') {
                return $path;
            }

            $encoded = self::driver() === 'gd'
                ? self::encodeWithGd($contents)
                : self::encodeWithImagick($contents);

            if ($encoded === null) {
                return $path;
            }

            $storage->put($target, $encoded);

            // فقط وقتی فایل خروجی واقعاً نوشته شد، نسخهٔ اصلی حذف می‌شود.
            if ($storage->exists($target)) {
                $storage->delete($path);

                return $target;
            }

            return $path;
        } catch (Throwable) {
            return $path;
        }
    }

    private static function encodeWithGd(string $contents): ?string
    {
        $image = @imagecreatefromstring($contents);

        if ($image === false) {
            return null;
        }

        $maxWidth = max(0, (int) config('media.webp.max_width', 1920));
        $width = imagesx($image);
        $height = imagesy($image);

        if ($maxWidth > 0 && $width > $maxWidth) {
            $scaled = imagescale($image, $maxWidth);

            if ($scaled !== false) {
                imagedestroy($image);
                $image = $scaled;
            }
        }

        if (function_exists('imagepalettetotruecolor')) {
            @imagepalettetotruecolor($image);
        }

        imagealphablending($image, true);
        imagesavealpha($image, true);

        ob_start();
        $ok = @imagewebp($image, null, (int) config('media.webp.quality', 82));
        $encoded = ob_get_clean();

        imagedestroy($image);

        if (! $ok || ! is_string($encoded) || $encoded === '') {
            return null;
        }

        return $encoded;
    }

    private static function encodeWithImagick(string $contents): ?string
    {
        try {
            $image = new \Imagick();
            $image->readImageBlob($contents);

            $maxWidth = max(0, (int) config('media.webp.max_width', 1920));

            if ($maxWidth > 0 && $image->getImageWidth() > $maxWidth) {
                $image->resizeImage($maxWidth, 0, \Imagick::FILTER_LANCZOS, 1);
            }

            $image->setImageFormat('webp');
            $image->setImageCompressionQuality((int) config('media.webp.quality', 82));

            $encoded = $image->getImageBlob();
            $image->clear();

            return is_string($encoded) && $encoded !== '' ? $encoded : null;
        } catch (Throwable) {
            return null;
        }
    }
}
