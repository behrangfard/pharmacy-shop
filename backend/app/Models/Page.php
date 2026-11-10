<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * صفحهٔ ثابت سایت (درباره ما، تماس با ما، قوانین و ...).
 *
 * محتوای صفحه متن ساده با نشانه‌گذاری سبک است (## سرتیتر، ### زیرتیتر،
 * «- » برای لیست، «> » برای نقل‌قول و **پررنگ**) و در فروشگاه با همان
 * قالب مقاله‌ها رندر می‌شود.
 *
 * انتشار دو شرط دارد: is_published = true و رسیدن published_at. مقدار خالی
 * یعنی انتشار فوری.
 */
class Page extends Model
{
    protected $fillable = [
        'title',
        'slug',
        'excerpt',
        'content',
        'is_published',
        'show_in_footer',
        'sort_order',
        'seo_title',
        'seo_description',
        'published_at',
    ];

    protected $casts = [
        'is_published' => 'boolean',
        'show_in_footer' => 'boolean',
        'sort_order' => 'integer',
        'published_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::saving(function (self $page): void {
            if (blank($page->excerpt)) {
                $page->excerpt = self::makeExcerpt($page->content);
            }

            $page->slug = self::makeSlug(
                (string) ($page->slug ?: $page->title),
                $page->exists ? (int) $page->getKey() : null
            );

            if ($page->is_published && blank($page->published_at)) {
                $page->published_at = now();
            }
        });
    }

    /**
     * صفحه‌هایی که الان باید در فروشگاه دیده شوند.
     */
    public function scopePublished($query)
    {
        return $query
            ->where('is_published', true)
            ->where(function ($subQuery) {
                $subQuery
                    ->whereNull('published_at')
                    ->orWhere('published_at', '<=', now());
            });
    }

    /**
     * ساخت اسلاگ فارسی امن و یکتا (حروف فارسی حفظ می‌شوند).
     */
    public static function makeSlug(string $value, ?int $ignoreId = null): string
    {
        $slug = trim($value);
        $slug = preg_replace('/\s+/u', '-', $slug) ?? '';
        $slug = preg_replace('/[^\p{L}\p{N}\-]+/u', '-', $slug) ?? '';
        $slug = preg_replace('/-+/', '-', $slug) ?? '';
        $slug = mb_strtolower(trim($slug, '-'));
        $slug = mb_substr($slug, 0, 150);

        if ($slug === '') {
            $slug = 'page';
        }

        $base = $slug;
        $suffix = 2;

        while (self::slugExists($slug, $ignoreId)) {
            $slug = $base.'-'.$suffix;
            $suffix++;
        }

        return $slug;
    }

    private static function slugExists(string $slug, ?int $ignoreId): bool
    {
        return self::query()
            ->where('slug', $slug)
            ->when(
                $ignoreId,
                fn ($query) => $query->whereKeyNot($ignoreId)
            )
            ->exists();
    }

    /**
     * خلاصهٔ خودکار از متن صفحه (وقتی خلاصه دستی ثبت نشده باشد).
     */
    public static function makeExcerpt(?string $content, int $length = 180): string
    {
        $text = strip_tags((string) $content);
        $text = str_replace(['**', '###', '##', '#'], '', $text);
        $text = preg_replace('/^\s*[-*>]\s+/mu', '', $text) ?? '';
        $text = preg_replace('/\s+/u', ' ', $text) ?? '';
        $text = trim($text);

        if ($text === '') {
            return '';
        }

        return mb_strlen($text) > $length
            ? mb_substr($text, 0, $length).'…'
            : $text;
    }
}
