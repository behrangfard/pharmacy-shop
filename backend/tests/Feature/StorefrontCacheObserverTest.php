<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\BannerController;
use App\Http\Controllers\Api\CategoryController;
use App\Models\Category;
use App\Models\Product;
use App\Models\StoreSetting;
use App\Support\StorefrontCache;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * پاک‌سازی خودکار کش ویترین با تغییر مدل‌ها (StorefrontCacheObserver).
 */
class StorefrontCacheObserverTest extends TestCase
{
    use RefreshDatabase;

    private function createCategory(string $name = 'کش تست'): Category
    {
        return Category::query()->create([
            'name' => $name,
            'slug' => 'cache-test-'.Str::random(8),
            'is_active' => true,
            'sort_order' => 0,
        ]);
    }

    private function createProduct(Category $category): Product
    {
        return Product::query()->create([
            'category_id' => $category->id,
            'name' => 'Cache Test Product',
            'slug' => 'cache-test-product-'.Str::random(8),
            'sku' => 'CACHE-TEST-'.Str::random(6),
            'price' => 50000,
            'stock' => 5,
            'discount_percent' => 0,
            'is_active' => true,
        ]);
    }

    private function warmCaches(): string
    {
        Cache::put(
            CategoryController::STOREFRONT_CACHE_KEY,
            [['id' => 1, 'name' => 'کهنه']],
            now()->addMinutes(5)
        );

        return StorefrontCache::productsVersion();
    }

    public function test_saving_a_category_flushes_cache_and_bumps_filter_version(): void
    {
        $category = $this->createCategory();
        $version = $this->warmCaches();

        $category->update(['name' => 'کش تست ویرایش‌شده']);

        $this->assertNull(Cache::get(CategoryController::STOREFRONT_CACHE_KEY));
        $this->assertNotSame($version, StorefrontCache::productsVersion());
    }

    public function test_saving_a_product_flushes_the_catalog_cache(): void
    {
        $product = $this->createProduct($this->createCategory());
        $version = $this->warmCaches();

        $product->update(['stock' => 12]);

        $this->assertNull(Cache::get(CategoryController::STOREFRONT_CACHE_KEY));
        $this->assertNotSame($version, StorefrontCache::productsVersion());
    }

    public function test_view_counter_changes_do_not_flush_the_catalog_cache(): void
    {
        $product = $this->createProduct($this->createCategory());
        $version = $this->warmCaches();

        $product->increment('views_count');

        $this->assertNotNull(Cache::get(CategoryController::STOREFRONT_CACHE_KEY));
        $this->assertSame($version, StorefrontCache::productsVersion());
    }

    public function test_public_categories_endpoint_returns_fresh_data_after_a_save(): void
    {
        // کش قبلی خالی است؛ اگر observer کار نکند، پاسخ عمومی همان کش خالی را
        // برمی‌گرداند و دستهٔ تازه دیده نمی‌شود.
        Cache::put(
            CategoryController::STOREFRONT_CACHE_KEY,
            [],
            now()->addMinutes(5)
        );

        $this->createCategory('دستهٔ تازه');

        $names = collect($this->getJson('/api/v1/categories')->assertOk()->json('data'))
            ->pluck('name');

        $this->assertTrue($names->contains('دستهٔ تازه'));
    }

    public function test_saving_store_settings_flushes_settings_and_banner_caches(): void
    {
        StoreSetting::setValue('store_name', 'قبلی');

        Cache::put(
            StoreSetting::CACHE_KEY,
            ['store_name' => 'قبلی'],
            now()->addMinutes(10)
        );
        Cache::put(
            BannerController::STOREFRONT_CACHE_KEY,
            [['id' => 1]],
            now()->addMinutes(5)
        );

        StoreSetting::setValue('store_name', 'جدید');

        $this->assertNull(Cache::get(StoreSetting::CACHE_KEY));
        $this->assertNull(Cache::get(BannerController::STOREFRONT_CACHE_KEY));
    }
}
