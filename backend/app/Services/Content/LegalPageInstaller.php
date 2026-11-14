<?php

namespace App\Services\Content;

use App\Models\Page;
use App\Support\LegalPages;

/**
 * ساخت/به‌روزرسانی صفحات رسمی فروشگاه.
 *
 * هم کامند `php artisan pages:legal` و هم `LegalPagesSeeder` از همین کلاس
 * استفاده می‌کنند تا رفتار یکسان باشد. به‌صورت پیش‌فرض هیچ صفحهٔ موجودی
 * بازنویسی نمی‌شود؛ چون ممکن است مدیر متن را ویرایش کرده باشد. با
 * «force» متن پیش‌فرض دوباره اعمال می‌شود.
 */
class LegalPageInstaller
{
    /**
     * @return array{created: int, updated: int, skipped: int}
     */
    public function install(bool $force = false): array
    {
        $counts = [
            'created' => 0,
            'updated' => 0,
            'skipped' => 0,
        ];

        foreach (LegalPages::all() as $definition) {
            $payload = [
                'title' => $definition['title'],
                'slug' => $definition['slug'],
                'content' => $definition['content'],
                'seo_title' => $definition['seo_title'],
                'seo_description' => $definition['seo_description'],
                'sort_order' => $definition['sort_order'],
                'is_published' => true,
                'show_in_footer' => true,
            ];

            $page = Page::query()
                ->where('slug', $definition['slug'])
                ->first();

            if ($page === null) {
                Page::query()->create($payload);

                $counts['created']++;

                continue;
            }

            if (! $force) {
                $counts['skipped']++;

                continue;
            }

            $page->fill($payload)->save();

            $counts['updated']++;
        }

        return $counts;
    }
}
