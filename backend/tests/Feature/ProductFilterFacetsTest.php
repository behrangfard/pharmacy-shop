<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

/**
 * endpoint گزینه‌های فیلتر فهرست محصولات.
 *
 * شمار هر گروه بدون اعمال همان گروه حساب می‌شود تا گزینه‌های بی‌نتیجه
 * صفر گزارش شوند و بازهٔ قیمت از خود نتایج فعلی بیاید.
 */
class ProductFilterFacetsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // کش پاسخ فیلترها نباید بین تست‌ها نشت کند.
        Cache::flush();
    }

    public function test_brand_counts_ignore_brand_filter_but_respect_others(): void
    {
        $alpha = $this->makeBrand('آلفا', 'alpha');
        $beta = $this->makeBrand('بتا', 'beta');
        $category = $this->makeCategory('دسته', 'cat');

        $this->makeProduct('alpha-in-stock', $category, $alpha, ['stock' => 3]);
        $this->makeProduct('alpha-sold-out', $category, $alpha, ['stock' => 0]);
        $this->makeProduct('beta-in-stock', $category, $beta, ['stock' => 5]);

        $response = $this->getJson('/api/v1/products/filters?in_stock=1');
        $response->assertOk();

        $brands = collect($response->json('data.brands'))->keyBy('slug');

        $this->assertSame(1, $brands['alpha']['count']);
        $this->assertSame(1, $brands['beta']['count']);
        $this->assertSame(2, $response->json('data.total'));

        // با انتخاب یک برند، شمار بقیهٔ برندها صفر نمی‌شود.
        $filtered = $this->getJson(
            '/api/v1/products/filters?in_stock=1&brand=alpha'
        );
        $filtered->assertOk();

        $filteredBrands = collect($filtered->json('data.brands'))->keyBy('slug');

        $this->assertSame(1, $filteredBrands['alpha']['count']);
        $this->assertSame(1, $filteredBrands['beta']['count']);
        $this->assertSame(1, $filtered->json('data.total'));
    }

    public function test_sizes_and_price_range_come_from_effective_price(): void
    {
        $category = $this->makeCategory('دسته', 'cat');

        // ۴۰۰٬۰۰۰ با ۵۰٪ تخفیف → قیمت نهایی ۲۰۰٬۰۰۰
        $bra = $this->makeProduct('bra', $category, null, [
            'price' => 400000,
            'discount_percent' => 50,
            'stock' => 4,
        ]);
        $this->makeVariant($bra, 'سایز 75B', 'BRA-75B');
        $this->makeVariant($bra, 'سایز 80B', 'BRA-80B');

        $set = $this->makeProduct('set', $category, null, [
            'price' => 800000,
            'stock' => 2,
        ]);
        $this->makeVariant($set, 'سایز M', 'SET-M');

        $response = $this->getJson('/api/v1/products/filters');
        $response->assertOk();

        $this->assertEquals(200000.0, $response->json('data.price.min'));
        $this->assertEquals(800000.0, $response->json('data.price.max'));

        $sizes = collect($response->json('data.sizes'))->keyBy('value');

        $this->assertSame(['75B', '80B', 'M'], $sizes->keys()->all());
        $this->assertSame(1, $sizes['75B']['count']);

        // با فیلتر سایز، شمار بقیهٔ سایزها همچنان پر می‌ماند (فیلتر سایز
        // در شمارش خودش اعمال نمی‌شود) اما بازهٔ قیمت به نتایج همان سایز
        // محدود می‌شود.
        $filtered = $this->getJson('/api/v1/products/filters?size=80B');
        $filtered->assertOk()->assertJsonPath('data.total', 1);

        $filteredSizes = collect($filtered->json('data.sizes'))->keyBy('value');

        $this->assertSame(1, $filteredSizes['75B']['count']);
        $this->assertSame(1, $filteredSizes['M']['count']);
        $this->assertEquals(200000.0, $filtered->json('data.price.min'));
        $this->assertEquals(200000.0, $filtered->json('data.price.max'));
    }

    public function test_category_counts_include_child_categories(): void
    {
        $parent = $this->makeCategory('لباس زیر', 'underwear');
        $child = $this->makeCategory('سوتین', 'bra', $parent->id);
        $other = $this->makeCategory('لباس خواب', 'sleepwear');

        $this->makeProduct('child-product', $child);
        $this->makeProduct('parent-product', $parent);

        $response = $this->getJson('/api/v1/products/filters');
        $response->assertOk();

        $categories = collect($response->json('data.categories'))->keyBy('slug');

        // شمار دستهٔ والد شامل زیردسته‌هاست.
        $this->assertSame(2, $categories['underwear']['count']);
        $this->assertSame(0, $categories['sleepwear']['count']);
    }

    private function makeBrand(string $name, string $slug): Brand
    {
        return Brand::query()->create([
            'name' => $name,
            'slug' => $slug,
            'description' => null,
            'logo' => null,
            'is_active' => true,
            'sort_order' => 0,
        ]);
    }

    private function makeCategory(
        string $name,
        string $slug,
        ?int $parentId = null
    ): Category {
        return Category::query()->create([
            'parent_id' => $parentId,
            'name' => $name,
            'slug' => $slug,
            'description' => null,
            'image' => null,
            'is_active' => true,
            'sort_order' => 0,
        ]);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function makeProduct(
        string $slug,
        Category $category,
        ?Brand $brand = null,
        array $attributes = []
    ): Product {
        return Product::query()->create(array_merge([
            'category_id' => $category->id,
            'brand_id' => $brand?->id,
            'name' => 'محصول '.$slug,
            'slug' => $slug,
            'sku' => strtoupper($slug),
            'short_description' => null,
            'description' => null,
            'price' => 100000,
            'compare_price' => null,
            'discount_percent' => 0,
            'stock' => 5,
            'thumbnail' => null,
            'is_active' => true,
            'is_featured' => false,
            'is_new' => false,
            'is_taxable' => false,
        ], $attributes));
    }

    private function makeVariant(
        Product $product,
        string $name,
        string $sku
    ): ProductVariant {
        return ProductVariant::query()->create([
            'product_id' => $product->id,
            'name' => $name,
            'sku' => $sku,
            'price' => null,
            'compare_price' => null,
            'stock' => 5,
            'image' => null,
            'is_active' => true,
        ]);
    }
}
