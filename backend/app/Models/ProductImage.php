<?php

namespace App\Models;

use App\Support\Media\ImageDimensions;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductImage extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'path',
        'alt',
        'sort_order',
        'is_primary',
    ];

    protected $casts = [
        'is_primary' => 'boolean',
        'sort_order' => 'integer',
        'width' => 'integer',
        'height' => 'integer',
    ];

    protected static function booted(): void
    {
        /*
         * ابعاد ذاتی تصویر برای رزرو فضا در کارت محصول (کاهش CLS) و برای
         * نسبت‌های تصویر در صفحهٔ محصول. فایل نبود؟ مقدار null می‌ماند.
         */
        static::saving(function (self $image): void {
            $needsSync = $image->isDirty('path')
                || $image->getAttribute('width') === null
                || $image->getAttribute('height') === null;

            if (! $needsSync) {
                return;
            }

            $dimensions = ImageDimensions::forPath(
                is_string($image->path) ? $image->path : null
            );

            $image->setAttribute('width', $dimensions['width'] ?? null);
            $image->setAttribute('height', $dimensions['height'] ?? null);
        });
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}