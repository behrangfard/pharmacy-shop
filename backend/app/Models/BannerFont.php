<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * فونت سفارشی بنرها.
 *
 * هر فونت یا فایل بارگذاریشده است (دیسک public) یا از نشانی بیرونی خوانده
 * میشود. فایل بارگذاریشده از مسیر API سرو میشود تا هدر CORS داشته باشد.
 * بدون CORS مرورگر بارگذاری فونت از دامنه دیگر را مسدود میکند.
 */
class BannerFont extends Model
{
    public const SOURCES = ['upload', 'url'];

    public const STYLES = ['normal', 'italic'];

    public const WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900];

    public const FORMATS = ['woff2', 'woff', 'ttf', 'otf'];

    protected $fillable = [
        'name',
        'family',
        'source',
        'file_path',
        'file_format',
        'external_url',
        'weight',
        'style',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'weight' => 'integer',
    ];

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function isUpload(): bool
    {
        return $this->source === 'upload';
    }

    /**
     * فرمت فونت از پسوند نشانی بیرونی.
     */
    public static function detectFormat(?string $url): ?string
    {
        if (! $url) {
            return null;
        }

        $path = (string) parse_url($url, PHP_URL_PATH);
        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));

        return in_array($extension, self::FORMATS, true) ? $extension : null;
    }

    /**
     * نشانی فایل فونت بارگذاریشده. از API سرو میشود تا CORS داشته باشد.
     */
    public function fontFileUrl(): ?string
    {
        if (! $this->isUpload() || ! $this->file_path) {
            return null;
        }

        return url('/api/v1/banner-fonts/'.$this->id.'/file');
    }

    /**
     * نشانی بیرونی یک stylesheet است (مثل CSS گوگل فونت) و فایل فونت نیست.
     */
    public function isStylesheet(): bool
    {
        return ! $this->isUpload()
            && $this->external_url !== null
            && self::detectFormat($this->external_url) === null;
    }

    /**
     * @return array<string, mixed>
     */
    public function toPublicArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'family' => $this->family,
            'source' => $this->source,
            'weight' => $this->weight,
            'style' => $this->style,
            'format' => $this->file_format ?: self::detectFormat($this->external_url),
            'file_url' => $this->fontFileUrl(),
            'external_url' => $this->external_url,
            'is_stylesheet' => $this->isStylesheet(),
            'is_active' => (bool) $this->is_active,
        ];
    }
}
