<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * مقالهٔ بخش «مقالات» فروشگاه (وبلاگ).
 *
 * انتشار یک مقاله دو شرط دارد: is_published = true و فرارسیدن published_at.
 * اگر published_at خالی بماند، مقاله بلافاصله پس از انتشار نمایش داده می‌شود؛
 * اگر تاریخی در آینده ثبت شود، مقاله در آن زمان (انتشار زمان‌بندی‌شده) روی
 * سایت می‌آید.
 *
 * چند مقدار به‌صورت خودکار محاسبه می‌شوند تا انتشار روزانهٔ پست‌ها ساده باشد:
 * - slug فارسی از عنوان (با تضمین یکتایی)
 * - خلاصه از متن مقاله (وقتی مدیر خلاصه ننوشته باشد)
 * - زمان مطالعهٔ تقریبی بر اساس تعداد کلمات
 */
class Article extends Model
{
    protected $fillable = [
        'title',
        'slug',
        'excerpt',
        'content',
        'cover_image',
        'category',
        'author_name',
        'is_published',
        'published_at',
        'reading_minutes',
    ];

    protected $casts = [
        'is_published' => 'boolean',
        'published_at' => 'datetime',
        'reading_minutes' => 'integer',
    ];

    protected static function booted(): void
    {
        static::saving(function (self $article): void {
            if (
                $article->isDirty('content') ||
                $article->reading_minutes === null
            ) {
                $article->reading_minutes = self::estimateReadingMinutes(
                    $article->content
                );
            }

            if (blank($article->excerpt)) {
                $article->excerpt = self::makeExcerpt($article->content);
            }

            $article->slug = self::makeSlug(
                (string) ($article->slug ?: $article->title),
                $article->exists ? (int) $article->getKey() : null
            );

            if ($article->is_published && blank($article->published_at)) {
                $article->published_at = now();
            }
        });
    }

    /**
     * مقاله‌هایی که الان باید در فروشگاه دیده شوند.
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
            $slug = 'article';
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
     * زمان مطالعهٔ تقریبی: هر ۲۰۰ کلمه یک دقیقه.
     */
    public static function estimateReadingMinutes(?string $content): int
    {
        $text = trim(strip_tags((string) $content));

        if ($text === '') {
            return 1;
        }

        $words = preg_split('/\s+/u', $text, -1, PREG_SPLIT_NO_EMPTY) ?: [];

        return max(1, (int) ceil(count($words) / 200));
    }

    /**
     * خلاصهٔ خودکار از متن مقاله (وقتی خلاصه دستی ثبت نشده باشد).
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
