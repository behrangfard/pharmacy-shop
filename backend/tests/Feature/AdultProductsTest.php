<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * کالاهای ویژهٔ بزرگسالان (۱۸+).
 *
 * قاعدهٔ محصول: کالایی که `is_adult` دارد فقط در بخش ویژهٔ `/adult`
 * (درخواست با پرچم `adult=1` پس از تأیید سن در مرورگر) دیده می‌شود؛ یعنی از
 * فهرست و جست‌وجوی عمومی، ویترین صفحهٔ اصلی، صفحهٔ دسته و برند، گزینه‌های
 * فیلتر و فید Google Merchant بیرون است.
 */
class AdultProductsTest extends TestCase
{
    use RefreshDatabase;

    private int $categoryId;

    protected function setUp(): void
    {
        parent::setUp();

        $this->categoryId = Category::query()->create([
            'name' => 'دستهٔ ویژهٔ بزرگسالان',
            'slug' => 'adult-category',
            'is_active' => true,
            'sort_order' => 0,
        ])->id;
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function makeProduct(string $slug, array $overrides = []): Product
    {
        return Product::query()->create(array_merge([
            'category_id' => $this->categoryId,
            'name' => 'کالای '.$slug,
            'slug' => $slug,
            'sku' => 'SKU-'.strtoupper($slug),
            'price' => 120000,
            'discount_percent' => 0,
            'stock' => 4,
            'is_active' => true,
            'is_featured' => false,
            'is_new' => false,
            'is_taxable' => false,
        ], $overrides));
    }

    /**
     * اسلاگ کالاهای پاسخ فهرست صفحه‌بندی‌شده.
     *
     * @return array<int, string>
     */
    private function slugs($response): array
    {
        return collect($response->json('data.data'))
            ->pluck('slug')
            ->all();
    }

    public function test_public_listing_hides_adult_products(): void
    {
        $this->makeProduct('normal-item');
        $this->makeProduct('adult-item', ['is_adult' => true]);

        $response = $this->getJson('/api/v1/products');

        $response->assertOk()->assertJsonPath('data.total', 1);
        $this->assertSame(['normal-item'], $this->slugs($response));
    }

    public function test_adult_flag_returns_only_adult_products(): void
    {
        $this->makeProduct('normal-item');
        $this->makeProduct('adult-item', ['is_adult' => true]);

        $response = $this->getJson('/api/v1/products?adult=1');

        $response->assertOk()->assertJsonPath('data.total', 1);
        $this->assertSame(['adult-item'], $this->slugs($response));

        // صفحهٔ جزئیات کالای ۱۸+ باز است تا فرانت‌اند دروازهٔ سنی بگذارد.
        $this->getJson('/api/v1/products/adult-item')
            ->assertOk()
            ->assertJsonPath('data.is_adult', true);
    }

    public function test_search_scope_matches_the_catalog_scope(): void
    {
        $this->makeProduct('secret-adult', ['is_adult' => true]);

        $this->getJson('/api/v1/products?search=secret')
            ->assertOk()
            ->assertJsonPath('data.total', 0);

        $this->getJson('/api/v1/products?search=secret&adult=1')
            ->assertOk()
            ->assertJsonPath('data.total', 1);
    }

    public function test_storefront_rails_exclude_adult_products(): void
    {
        $this->makeProduct('adult-highlight', [
            'is_adult' => true,
            'is_featured' => true,
            'is_new' => true,
        ]);

        $this->getJson('/api/v1/products/featured')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->getJson('/api/v1/products/newest')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_category_page_hides_adult_products(): void
    {
        $this->makeProduct('normal-in-category');
        $this->makeProduct('adult-in-category', ['is_adult' => true]);

        $response = $this->getJson('/api/v1/categories/adult-category');

        $response->assertOk()->assertJsonCount(1, 'data.products');
        $this->assertSame(
            'normal-in-category',
            $response->json('data.products.0.slug')
        );
    }

    public function test_filter_facets_follow_the_adult_scope(): void
    {
        $this->makeProduct('normal-item');
        $this->makeProduct('adult-item', ['is_adult' => true]);

        $this->getJson('/api/v1/products/filters')
            ->assertOk()
            ->assertJsonPath('data.total', 1);

        $this->getJson('/api/v1/products/filters?adult=1')
            ->assertOk()
            ->assertJsonPath('data.total', 1);
    }

    public function test_merchant_feed_skips_adult_products(): void
    {
        $this->makeProduct('feed-normal');
        $this->makeProduct('feed-adult', ['is_adult' => true]);

        $response = $this->get('/feed/google-merchant.xml');

        $response->assertOk();

        $xml = (string) $response->getContent();

        $this->assertStringContainsString('/product/feed-normal', $xml);
        $this->assertStringNotContainsString('/product/feed-adult', $xml);
    }

    public function test_admin_can_flag_a_product_and_filter_the_list(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $product = $this->makeProduct('admin-flagged');

        $this->putJson('/api/v1/admin/products/'.$product->id, [
            'is_adult' => true,
        ])->assertOk();

        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'is_adult' => true,
        ]);

        $this->getJson('/api/v1/admin/products?adult=yes')
            ->assertOk()
            ->assertJsonPath('data.total', 1);

        $this->getJson('/api/v1/admin/products?adult=no')
            ->assertOk()
            ->assertJsonPath('data.total', 0);
    }

    public function test_admin_list_rejects_unknown_adult_filter(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $this->getJson('/api/v1/admin/products?adult=maybe')
            ->assertStatus(422);
    }
}
