<?php

namespace App\Support\Media;

use Illuminate\Support\Facades\Storage;
use Throwable;

/**
 * ابعاد ذاتی تصاویر ذخیره‌شده روی دیسک.
 *
 * برای رزرو فضای تصویر پیش از بارگذاری (کاهش CLS) لازم است. عمداً از
 * `getimagesize` استفاده می‌شود که به GD/Imagick وابسته نیست؛ بنابراین حتی
 * روی سروری که افزونهٔ تصویر ندارد هم width/height تصاویر هیرو و کارت محصول
 * پر می‌شود.
 */
final class ImageDimensions
{
    /** پسوندهایی که ابعادشان قابل خواندن است. */
    public const READABLE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'];

    /**
     * ابعاد تصویر؛ در نبود فایل، مسیر خارجی یا فایل نامعتبر `null`.
     *
     * @return array{width:int, height:int}|null
     */
    public static function forPath(?string $path, string $disk = 'public'): ?array
    {
        $value = is_string($path) ? trim($path) : '';

        if ($value === '' || preg_match('#^https?://#i', $value) || str_starts_with($value, 'data:')) {
            return null;
        }

        $extension = strtolower(pathinfo($value, PATHINFO_EXTENSION));

        if (! in_array($extension, self::READABLE_EXTENSIONS, true)) {
            return null;
        }

        try {
            $storage = Storage::disk($disk);

            if (! $storage->exists($value)) {
                return null;
            }

            $size = @getimagesize($storage->path($value));

            if (! is_array($size)) {
                return null;
            }

            $width = (int) ($size[0] ?? 0);
            $height = (int) ($size[1] ?? 0);

            if ($width < 1 || $height < 1) {
                return null;
            }

            return ['width' => $width, 'height' => $height];
        } catch (Throwable) {
            return null;
        }
    }
}
