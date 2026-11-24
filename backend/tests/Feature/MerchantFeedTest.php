<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\StoreSetting;
use App\Support\StorefrontCache;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use SimpleXMLElement;
use Tests\TestCase;

/**
 * فید Google Merchant (`GET /feed/google-merchant.xml`).
 *
 * قاعده‌ها: فقط محصول فعال، قیمت ریالی (تومان×۱۰)، sale_price برای کالای
 * تخفیف‌دار، آدرس‌های مطلق تصویر، mpn از SKU + `identifier_exists=no`،
 * هزینهٔ ارسال از تنظیمات فروشگاه و کش ۳۰ دقیقه‌ای با پاک‌سازی کاتالوگ.
 */
class MerchantFeedTest extends TestCase
{
    use RefreshDatabase;

    private function createCategory(string $name = 'لباس زیر'): Category
    {
        return Category::query()->create([
            'name' => $name,
            'slug' => 'feed-category-'.Str::random(6),
            'is_active' => true,
            'sort_order' => 0,
        ]);
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function createProduct(array $overrides = []): Product
    {
        return Product::query()->create(array_merge([
            'category_id' => $this->createCategory()->id,
            'name' => 'محصول فید',
            'slug' => 'feed-product-'.Str::random(8),
            'sku' => 'FEED-'.Str::random(6),
            'price' => 250000,
            'discount_percent' => 0,
            'stock' => 5,
            'is_active' => true,
        ], $overrides));
    }

    /** متن خام آخرین پاسخ فید (برای بررسی نبودِ عنصر خالی). */
    private string $lastFeed = '';

    /**
     * دریافت و اعتبارسنجی پایهٔ سند فید؛ آیتم‌ها به‌صورت آرایه برگردانده می‌شوند.
     *
     * @return array<int, SimpleXMLElement>
     */
    private function fetchFeed(string $expectedShopNote = ''): array
    {
        $response = $this->get('/feed/google-merchant.xml');

        $response->assertOk();
        $this->assertStringStartsWith(
            'application/xml',
            (string) $response->headers->get('Content-Type')
        );

        $raw = (string) $response->getContent();
        $this->lastFeed = $raw;
        if ($expectedShopNote !== '') {
            $this->assertStringContainsString($expectedShopNote, $raw);
        }

        $xml = simplexml_load_string($raw);
        $this->assertNotFalse($xml, 'پاسخ فید XML معتبر نیست.');
        $this->assertSame('rss', $xml->getName());
        $this->assertSame('2.0', (string) $xml['version']);
        $this->assertSame(
            'http://base.google.com/ns/1.0',
            (string) $xml->getNamespaces(true)['g']
        );

        $items = [];
        foreach ($xml->channel->item as $item) {
            $items[] = $item;
        }

        return $items;
    }

    public function test_feed_exposes_active_product_fields(): void
    {
        $brand = Brand::query()->create([
            'name' => 'برند تست',
            'slug' => 'feed-brand-'.Str::random(6),
            'is_active' => true,
        ]);

        $product = $this->createProduct([
            'brand_id' => $brand->id,
            'name' => 'شلوارک ورزشی',
            'slug' => 'sport-shorts',
            'sku' => 'SH-1001',
            'short_description' => 'خلاصهٔ کوتاه',
            'description' => '<p>توضیح <strong>کامل</strong> محصول</p>',
            'price' => 250000,
            'discount_percent' => 20,
            'stock' => 7,
        ]);

        ProductImage::query()->create([
            'product_id' => $product->id,
            'path' => 'product-images/sh-1001/main.jpg',
            'is_primary' => true,
            'sort_order' => 1,
        ]);

        ProductImage::query()->create([
            'product_id' => $product->id,
            'path' => 'product-images/sh-1001/back.jpg',
            'is_primary' => false,
            'sort_order' => 2,
        ]);

        $items = $this->fetchFeed();
        $this->assertCount(1, $items);

        $g = $items[0]->children('http://base.google.com/ns/1.0');

        $this->assertSame((string) $product->id, (string) $g->id);
        $this->assertSame('شلوارک ورزشی', (string) $g->title);
        $this->assertSame('توضیح کامل محصول', (string) $g->description);

        $frontendUrl = rtrim((string) config('app.frontend_url'), '/');
        $this->assertSame($frontendUrl.'/product/sport-shorts', (string) $g->link);

        $this->assertSame(
            url('storage/product-images/sh-1001/main.jpg'),
            (string) $g->image_link
        );
        $this->assertSame(
            url('storage/product-images/sh-1001/back.jpg'),
            (string) $g->additional_image_link
        );

        // تومان → ریال: ۲۵۰٬۰۰۰ تومان با ۲۰٪ تخفیف.
        $this->assertSame('2500000 IRR', (string) $g->price);
        $this->assertSame('2000000 IRR', (string) $g->sale_price);

        $this->assertSame('in_stock', (string) $g->availability);
        $this->assertSame('برند تست', (string) $g->brand);
        $this->assertSame('SH-1001', (string) $g->mpn);
        $this->assertSame('new', (string) $g->condition);
        $this->assertSame('no', (string) $g->identifier_exists);
        $this->assertSame('لباس زیر', (string) $g->product_type);

        // ارسال پیش‌فرض فروشگاه رایگان/صفر است.
        $this->assertSame('IR', (string) $g->shipping->country);
        $this->assertSame('0 IRR', (string) $g->shipping->price);
    }

    private const G_NAMESPACE = 'http://base.google.com/ns/1.0';

    public function test_feed_skips_inactive_products_and_marks_out_of_stock(): void
    {
        $active = $this->createProduct([
            'slug' => 'active-out-of-stock',
            'stock' => 0,
        ]);

        $this->createProduct([
            'slug' => 'inactive-product',
            'is_active' => false,
        ]);

        $items = $this->fetchFeed();
        $this->assertCount(1, $items, 'محصول غیرفعال نباید در فید بیاید.');

        $g = $items[0]->children(self::G_NAMESPACE);

        $this->assertSame((string) $active->id, (string) $g->id);
        $this->assertSame('out_of_stock', (string) $g->availability);

        // محصول بدون تصویر و بدون تخفیف: عنصر خالی ساخته نمی‌شود.
        $this->assertStringNotContainsString('<g:image_link', $this->lastFeed);
        $this->assertStringNotContainsString('<g:additional_image_link', $this->lastFeed);
        $this->assertStringNotContainsString('<g:sale_price', $this->lastFeed);
    }

    public function test_feed_applies_store_shipping_rules(): void
    {
        StoreSetting::setValue('shipping_cost', '50000');
        StoreSetting::setValue('free_shipping_enabled', '1');
        StoreSetting::setValue('free_shipping_threshold', '300000');

        $cheap = $this->createProduct([
            'slug' => 'cheap-item',
            'price' => 250000,
        ]);

        $expensive = $this->createProduct([
            'slug' => 'expensive-item',
            'price' => 350000,
        ]);

        $items = $this->fetchFeed();
        $this->assertCount(2, $items);

        $byId = [];
        foreach ($items as $item) {
            $g = $item->children(self::G_NAMESPACE);
            $byId[(string) $g->id] = $g;
        }

        $this->assertSame(
            '500000 IRR',
            (string) $byId[(string) $cheap->id]->shipping->price,
            'زیر آستانهٔ ارسال رایگان، هزینهٔ ارسال فروشگاه اعمال می‌شود.'
        );
        $this->assertSame(
            '0 IRR',
            (string) $byId[(string) $expensive->id]->shipping->price,
            'بالای آستانه، ارسال رایگان است.'
        );
    }

    public function test_feed_is_cached_and_refreshed_after_catalog_changes(): void
    {
        $product = $this->createProduct(['name' => 'نام اول']);

        $this->fetchFeed('نام اول');
        $this->assertTrue(Cache::has(StorefrontCache::MERCHANT_FEED_CACHE_KEY));

        // تغییر مستقیم DB بدون رویداد مدل: فید همچنان از کش می‌آید.
        Product::query()->whereKey($product->id)->update(['name' => 'نام دوم']);
        $this->fetchFeed('نام اول');

        // پاک‌سازی کاتالوگ (همان مسیری که Observer صدا می‌زند) فید را بازسازی می‌کند.
        StorefrontCache::flushCatalog();
        $this->fetchFeed('نام دوم');

        // ذخیرهٔ مدل‌محور محصول هم فید را تازه می‌کند.
        $product->refresh()->update(['name' => 'نام سوم']);
        $this->fetchFeed('نام سوم');
    }
}
