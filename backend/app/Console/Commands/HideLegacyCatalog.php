<?php

namespace App\Console\Commands;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Builder;

/**
 * مخفی‌کردن کاتالوگ بازمانده (محصولات داروخانه) از دید مشتری.
 *
 * هیچ رکوردی حذف نمی‌شود؛ فقط ستون is_active روی false تنظیم می‌شود تا
 * API عمومی (ProductController / CategoryController / BrandController) آن‌ها
 * را برنگرداند. با گزینه --restore همه رکوردها دوباره فعال می‌شوند.
 */
class HideLegacyCatalog extends Command
{
    /**
     * اسلاگ‌های کاتالوگ لباس زیر؛ باید با StoreSeeder هم‌خوان باشد.
     * (تست HideLegacyCatalogTest این هم‌خوانی را تضمین می‌کند.)
     *
     * @var array<int, string>
     */
    public const CATEGORY_SLUGS = [
        'bra',
        'panties',
        'lingerie-sets',
        'sleepwear',
        'shapewear',
        'bra-seamless',
        'bra-foam',
        'bra-sports',
        'panties-cotton',
        'panties-seamless',
    ];

    /** @var array<int, string> */
    public const BRAND_SLUGS = [
        'behrang',
        'venus',
        'lina',
        'anso',
    ];

    /** @var array<int, string> */
    public const PRODUCT_SLUGS = [
        'venus-seamless-bra',
        'lina-foam-bra',
        'anso-sports-bra',
        'behrang-cotton-panties-pack',
        'anso-seamless-panties',
        'venus-satin-lingerie-set',
        'lina-satin-nightgown',
        'behrang-shapewear-bodysuit',
    ];

    protected $signature = 'catalog:hide-legacy
                            {--restore : همه رکوردها دوباره فعال می‌شوند}';

    protected $description = 'محصولات، دسته‌ها و برندهای غیرلباس‌زیر را از دید مشتری مخفی می‌کند (بدون حذف داده)';

    public function handle(): int
    {
        if ($this->option('restore')) {
            $counts = [
                'محصول' => Product::query()->update(['is_active' => true]),
                'دسته' => Category::query()->update(['is_active' => true]),
                'برند' => Brand::query()->update(['is_active' => true]),
            ];

            $this->report('همه رکوردها دوباره فعال شدند.', $counts);

            return self::SUCCESS;
        }

        $counts = [
            'محصول' => $this->hide(Product::query(), self::PRODUCT_SLUGS),
            'دسته' => $this->hide(Category::query(), self::CATEGORY_SLUGS),
            'برند' => $this->hide(Brand::query(), self::BRAND_SLUGS),
        ];

        $this->report('رکوردهای خارج از کاتالوگ لباس زیر مخفی شدند.', $counts);

        return self::SUCCESS;
    }

    /**
     * @param  array<int, string>  $keepSlugs
     */
    private function hide(Builder $query, array $keepSlugs): int
    {
        return $query
            ->whereNotIn('slug', $keepSlugs)
            ->where('is_active', true)
            ->update(['is_active' => false]);
    }

    /**
     * @param  array<string, int>  $counts
     */
    private function report(string $message, array $counts): void
    {
        $this->info($message);

        foreach ($counts as $label => $count) {
            $this->line("  - {$label}: {$count}");
        }
    }
}
