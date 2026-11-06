<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * فیلترهای فهرست عمومی محصولات:
 *   - برند (تک‌مقداری و چندتایی با brand=a,b)
 *   - محدودهٔ قیمت بر اساس «قیمت نهایی پس از تخفیف»
 *   - فقط محصولات موجود (in_stock)
 *   - فقط محصولات تخفیف‌دار (discount_only)
 * همهٔ این‌ها باید با صفحه‌بندی سمت سرور هم درست کار کنند.
 */
class ProductFilterTest extends TestCase
{
    use RefreshDatabase;

    private int $categoryId;

    protected function setUp(): void
    {
        parent::setUp();

        $this->categoryId = Category::query()->create([
            'parent_id' => null,
            'name' => 'دستهٔ فیلتر',
            'slug' => 'filter-category',
            'description' => null,
            'image' => null,
            'is_active' => true,
            'sort_order' => 0,
        ])->id;
    }

    public function test_brand_filter_accepts_multiple_slugs(): void
    {
        $first = $this->makeBrand('برند اول', 'brand-one');
        $second = $this->makeBrand('برند دوم', 'brand-two');
        $third = $this->makeBrand('برند سوم', 'brand-three');

        $this->makeProduct('p-one', ['brand_id' => $first->id]);
        $this->makeProduct('p-two', ['brand_id' => $second->id]);
        $this->makeProduct('p-three', ['brand_id' => $third->id]);

        $single = $this->getJson('/api/v1/products?brand=brand-one');
        $single->assertOk()->assertJsonPath('data.total', 1);
        $this->assertSame(['p-one'], $this->slugs($single));

        $multiple = $this->getJson(
            '/api/v1/products?brand=brand-one,brand-two'
        );
        $multiple->assertOk()->assertJsonPath('data.total', 2);
        $this->assertEqualsCanonicalizing(
            ['p-one', 'p-two'],
            $this->slugs($multiple)
        );

        // اسلاگ ناموجود نباید خطا بدهد و نباید نتیجه‌ای اضافه کند.
        $unknown = $this->getJson('/api/v1/products?brand=brand-unknown');
        $unknown->assertOk()->assertJsonPath('data.total', 0);
    }

    public function test_price_range_uses_final_price_after_discount(): void
    {
        // ۴۰۰٬۰۰۰ با ۵۰٪ تخفیف → قیمت نهایی ۲۰۰٬۰۰۰
        $this->makeProduct('discounted', [
            'price' => 400000,
            'discount_percent' => 50,
        ]);
        $this->makeProduct('cheap', ['price' => 150000]);
        $this->makeProduct('expensive', ['price' => 800000]);

        $range = $this->getJson(
            '/api/v1/products?min_price=100000&max_price=250000'
        );
        $range->assertOk()->assertJsonPath('data.total', 2);
        $this->assertEqualsCanonicalizing(
            ['discounted', 'cheap'],
            $this->slugs($range)
        );

        // اگر فیلتر روی قیمت قبل از تخفیف بود، محصول تخفیف‌دار بیرون می‌ماند.
        $fromMidPrice = $this->getJson('/api/v1/products?min_price=300000');
        $fromMidPrice->assertOk()->assertJsonPath('data.total', 1);
        $this->assertSame(['expensive'], $this->slugs($fromMidPrice));
    }

    public function test_in_stock_filter_hides_sold_out_products(): void
    {
        $this->makeProduct('in-stock', ['stock' => 3]);
        $this->makeProduct('sold-out', ['stock' => 0]);

        $response = $this->getJson('/api/v1/products?in_stock=1');
        $response->assertOk()->assertJsonPath('data.total', 1);
        $this->assertSame(['in-stock'], $this->slugs($response));
    }

    public function test_discount_only_filter_returns_discounted_products(): void
    {
        $this->makeProduct('full-price', ['price' => 200000]);
        $this->makeProduct('on-sale', [
            'price' => 200000,
            'discount_percent' => 20,
        ]);

        $response = $this->getJson('/api/v1/products?discount_only=1');
        $response->assertOk()->assertJsonPath('data.total', 1);
        $this->assertSame(['on-sale'], $this->slugs($response));
    }

    public function test_inactive_products_are_never_returned_by_filters(): void
    {
        $this->makeProduct('active');
        $this->makeProduct('hidden', [
            'is_active' => false,
            'stock' => 10,
            'discount_percent' => 30,
        ]);

        $response = $this->getJson(
            '/api/v1/products?in_stock=1&discount_only=1'
        );
        $response->assertOk()->assertJsonPath('data.total', 0);
    }

    public function test_filters_combine_with_server_side_pagination(): void
    {
        $brand = $this->makeBrand('برند صفحه‌بندی', 'brand-paging');

        $this->makeProduct('paging-one', [
            'brand_id' => $brand->id,
            'stock' => 2,
        ]);
        $this->makeProduct('paging-two', [
            'brand_id' => $brand->id,
            'stock' => 4,
        ]);
        $this->makeProduct('paging-three', [
            'brand_id' => $brand->id,
            'stock' => 6,
        ]);
        $this->makeProduct('other-brand', ['stock' => 8]);

        $firstPage = $this->getJson(
            '/api/v1/products?brand=brand-paging&per_page=2&page=1'
        );
        $firstPage->assertOk()
            ->assertJsonPath('data.total', 3)
            ->assertJsonPath('data.last_page', 2)
            ->assertJsonPath('data.current_page', 1);
        $this->assertCount(2, $firstPage->json('data.data'));

        $secondPage = $this->getJson(
            '/api/v1/products?brand=brand-paging&per_page=2&page=2'
        );
        $secondPage->assertOk()->assertJsonPath('data.current_page', 2);
        $this->assertCount(1, $secondPage->json('data.data'));
        $this->assertContains('paging-one', $this->slugs($secondPage));
    }

    public function test_price_and_discount_filters_can_be_combined(): void
    {
        // ۵۰۰٬۰۰۰ با ۴۰٪ تخفیف → ۳۰۰٬۰۰۰ و موجود
        $this->makeProduct('deal', [
            'price' => 500000,
            'discount_percent' => 40,
            'stock' => 2,
        ]);
        // همان قیمت و تخفیف، اما ناموجود
        $this->makeProduct('deal-sold-out', [
            'price' => 500000,
            'discount_percent' => 40,
            'stock' => 0,
        ]);
        // تخفیف‌دار اما گران‌تر از سقف محدودهٔ انتخابی
        $this->makeProduct('deal-expensive', [
            'price' => 2000000,
            'discount_percent' => 10,
            'stock' => 5,
        ]);

        $response = $this->getJson(
            '/api/v1/products?discount_only=1&in_stock=1'.
            '&min_price=250000&max_price=350000'
        );

        $response->assertOk()->assertJsonPath('data.total', 1);
        $this->assertSame(['deal'], $this->slugs($response));
    }

    public function test_size_filter_matches_normalized_variant_sizes(): void
    {
        $bra = $this->makeProduct('bra-75', ['price' => 100000]);
        $this->makeVariant($bra, 'سایز 75B', 'BRA-75B');
        $this->makeVariant($bra, 'سایز 80B', 'BRA-80B');

        $sport = $this->makeProduct('sport-bra', ['price' => 120000]);
        $this->makeVariant($sport, 'سایز M', 'SPORT-M');

        // محصول بدون تنوع نباید در فیلتر سایز بیاید.
        $this->makeProduct('no-variant', ['price' => 90000]);

        $exact = $this->getJson('/api/v1/products?size=80B');
        $exact->assertOk()->assertJsonPath('data.total', 1);
        $this->assertSame(['bra-75'], $this->slugs($exact));

        // حروف کوچک، ارقام فارسی و پیشوند «سایز» باید یکی حساب شوند.
        $normalized = $this->getJson(
            '/api/v1/products?size='.urlencode('سایز ۷۵b')
        );
        $normalized->assertOk()->assertJsonPath('data.total', 1);
        $this->assertSame(['bra-75'], $this->slugs($normalized));

        $multiple = $this->getJson('/api/v1/products?size=80B,M');
        $multiple->assertOk()->assertJsonPath('data.total', 2);
        $this->assertEqualsCanonicalizing(
            ['bra-75', 'sport-bra'],
            $this->slugs($multiple)
        );

        // سایز ناموجود نباید خطا بدهد.
        $this->getJson('/api/v1/products?size=XXL')
            ->assertOk()
            ->assertJsonPath('data.total', 0);
    }

    public function test_inactive_variants_are_ignored_by_size_filter(): void
    {
        $product = $this->makeProduct('inactive-variant');
        $this->makeVariant($product, 'سایز L', 'INACT-L', ['is_active' => false]);

        $this->getJson('/api/v1/products?size=L')
            ->assertOk()
            ->assertJsonPath('data.total', 0);
    }

    public function test_new_and_featured_filters_use_is_new_and_is_featured(): void
    {
        $this->makeProduct('fresh', ['is_new' => true]);
        $this->makeProduct('special', ['is_featured' => true]);
        $this->makeProduct('normal');

        $newOnly = $this->getJson('/api/v1/products?new=1');
        $newOnly->assertOk()->assertJsonPath('data.total', 1);
        $this->assertSame(['fresh'], $this->slugs($newOnly));

        // کلید is_new هم به همان نتیجه می‌رسد.
        $this->getJson('/api/v1/products?is_new=1')
            ->assertOk()
            ->assertJsonPath('data.total', 1);

        $featuredOnly = $this->getJson('/api/v1/products?featured=1');
        $featuredOnly->assertOk()->assertJsonPath('data.total', 1);
        $this->assertSame(['special'], $this->slugs($featuredOnly));
    }

    public function test_price_sorting_uses_price_after_discount(): void
    {
        // ۴۰۰٬۰۰۰ با ۵۰٪ تخفیف → ۲۰۰٬۰۰۰ (ارزان‌ترین از نظر قیمت نهایی)
        $this->makeProduct('cheap-after-discount', [
            'price' => 400000,
            'discount_percent' => 50,
        ]);
        $this->makeProduct('mid', ['price' => 300000]);

        $ascending = $this->getJson('/api/v1/products?sort=price_asc');
        $ascending->assertOk();
        $this->assertSame(
            ['cheap-after-discount', 'mid'],
            $this->slugs($ascending)
        );

        $descending = $this->getJson('/api/v1/products?sort=price_desc');
        $descending->assertOk();
        $this->assertSame(
            ['mid', 'cheap-after-discount'],
            $this->slugs($descending)
        );
    }

    public function test_popular_sorting_uses_sales_count(): void
    {
        $this->makeProduct('best-seller', ['sales_count' => 90]);
        $this->makeProduct('rare', ['sales_count' => 2]);

        $popular = $this->getJson('/api/v1/products?sort=popular');
        $popular->assertOk();
        $this->assertSame(['best-seller', 'rare'], $this->slugs($popular));
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

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function makeProduct(
        string $slug,
        array $attributes = []
    ): Product {
        return Product::query()->create(array_merge([
            'category_id' => $this->categoryId,
            'brand_id' => null,
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

    /**
     * تنوع محصول با نام ساختگی؛ سایز در مدل از نام استخراج می‌شود.
     *
     * @param  array<string, mixed>  $attributes
     */
    private function makeVariant(
        Product $product,
        string $name,
        string $sku,
        array $attributes = []
    ): ProductVariant {
        return ProductVariant::query()->create(array_merge([
            'product_id' => $product->id,
            'name' => $name,
            'sku' => $sku,
            'price' => null,
            'compare_price' => null,
            'stock' => 5,
            'image' => null,
            'is_active' => true,
        ], $attributes));
    }

    /**
     * اسلاگ محصولات بازگشتی، به همان ترتیب پاسخ.
     *
     * @return array<int, string>
     */
    private function slugs(TestResponse $response): array
    {
        return collect($response->json('data.data'))
            ->pluck('slug')
            ->all();
    }
}
