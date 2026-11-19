<?php

namespace App\Observers;

use App\Models\AnnouncementBarItem;
use App\Models\Banner;
use App\Models\BannerFont;
use App\Models\BannerSection;
use App\Models\Brand;
use App\Models\Category;
use App\Models\ContactChannel;
use App\Models\Popup;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\StoreSetting;
use App\Models\Story;
use App\Models\TrustBadge;
use App\Support\StorefrontCache;
use Illuminate\Database\Eloquent\Model;

/**
 * پاک‌سازی خودکار کش ویترین پس از تغییر مدل‌ها.
 *
 * با این observer حتی اگر داده بیرون از کنترلرهای پنل عوض شود (tinker، سیدر،
 * کامند، سرویس داخلی)، پاسخ عمومی سایت تا انقضای کش کهنه نمی‌ماند.
 *
 * نکته: تغییرهای بی‌اثر روی کش ویترین (`views_count`/`sales_count` محصول) کش
 * را پاک نمی‌کنند تا هر بازدید صفحهٔ محصول باعث دورریختن کش نشود.
 */
class StorefrontCacheObserver
{
    /** فیلدهایی که تغییرشان روی کش ویترین اثری ندارد. */
    private const PRODUCT_IGNORED_FIELDS = ['views_count', 'sales_count', 'updated_at'];

    private const VARIANT_IGNORED_FIELDS = ['updated_at'];

    public function created(Model $model): void
    {
        $this->flushFor($model);
    }

    public function updated(Model $model): void
    {
        if ($model instanceof Product) {
            if ($this->onlyIgnoredFieldsChanged($model, self::PRODUCT_IGNORED_FIELDS)) {
                return;
            }
        }

        if ($model instanceof ProductVariant) {
            if ($this->onlyIgnoredFieldsChanged($model, self::VARIANT_IGNORED_FIELDS)) {
                return;
            }
        }

        $this->flushFor($model);
    }

    public function deleted(Model $model): void
    {
        $this->flushFor($model);
    }

    /**
     * @param  list<string>  $ignored
     */
    private function onlyIgnoredFieldsChanged(Model $model, array $ignored): bool
    {
        $changed = array_keys($model->getChanges());

        return array_diff($changed, $ignored) === [];
    }

    private function flushFor(Model $model): void
    {
        if ($model instanceof Product || $model instanceof ProductVariant) {
            StorefrontCache::flushCatalog();

            return;
        }

        if ($model instanceof Category) {
            StorefrontCache::flushCategories();

            return;
        }

        if ($model instanceof Brand) {
            StorefrontCache::flushBrands();

            return;
        }

        if ($model instanceof Banner || $model instanceof BannerSection) {
            StorefrontCache::flushBanners();

            return;
        }

        if ($model instanceof BannerFont) {
            StorefrontCache::flushBannerFonts();

            return;
        }

        if ($model instanceof AnnouncementBarItem) {
            StorefrontCache::flushAnnouncementBar();

            return;
        }

        if ($model instanceof Popup) {
            StorefrontCache::flushPopups();

            return;
        }

        if ($model instanceof Story) {
            StorefrontCache::flushStories();

            return;
        }

        if ($model instanceof TrustBadge) {
            StorefrontCache::flushTrustBadges();

            return;
        }

        if ($model instanceof ContactChannel) {
            StorefrontCache::flushContactChannels();

            return;
        }

        if ($model instanceof StoreSetting) {
            StorefrontCache::flushSettings();
        }
    }
}
