<?php

namespace Tests\Feature;

use App\Models\Banner;
use App\Models\Product;
use App\Models\ProductImage;
use App\Services\Media\WebpConverter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * سئوی تصاویر: ابعاد ذاتی روی مدل‌ها + گزارش یکپارچه‌سازی مسیرهای قدیمی.
 *
 * - Banner/ProductImage هنگام ذخیره width/height را از فایل واقعی می‌خوانند
 *   (App\Support\Media\ImageDimensions) تا کارت/هیرو بدون پرش رندر شود.
 * - کامند images:migrate-legacy پیش‌فرض فقط گزارش است و مسیرها را نمی‌بَرد.
 * - کامند images:webp در نبود افزونهٔ تصویر صریح هشدار می‌دهد.
 */
class ImageMediaTest extends TestCase
{
    use RefreshDatabase;

    /** PNG تک‌پیکسلی ۱×۱ (بدون نیاز به GD برای ساختن). */
    private const PNG_1X1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8AAAwAB/wFQkAAAAABJRU5ErkJggg==';

    protected function setUp(): void
    {
        parent::setUp();

        // دیسک تصاویر در تست ساختگی است تا فایل واقعی در پروژه نوشته نشود.
        Storage::fake('public');
    }

    private function storeTestImage(string $path): void
    {
        Storage::disk('public')->put($path, base64_decode(self::PNG_1X1));
    }

    /** محصول حداقلی با دستهٔ تازه؛ الگوی مشترک تست‌های فروشگاه. */
    private function createProduct(string $slug, ?string $thumbnail = null): Product
    {
        $categoryId = \Illuminate\Support\Facades\DB::table('categories')->insertGetId([
            'parent_id' => null,
            'name' => 'دستهٔ ' . $slug,
            'slug' => 'category-' . $slug,
            'description' => null,
            'image' => null,
            'is_active' => true,
            'sort_order' => 0,
            'meta_title' => null,
            'meta_description' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return Product::query()->create([
            'category_id' => $categoryId,
            'brand_id' => null,
            'name' => 'محصول ' . $slug,
            'slug' => $slug,
            'sku' => strtoupper(str_replace('-', '', $slug)),
            'price' => 10000,
            'compare_price' => null,
            'discount_percent' => 0,
            'stock' => 5,
            'thumbnail' => $thumbnail,
            'is_active' => true,
            'is_featured' => false,
            'is_new' => false,
        ]);
    }

    public function test_banner_image_dimensions_are_filled_from_real_file(): void
    {
        $this->storeTestImage('banners/hero-test.png');

        $banner = Banner::query()->create([
            'title' => 'بنر تست',
            'image' => 'banners/hero-test.png',
            'image_alt' => 'تست سئو',
            'position' => 'home_hero',
            'sort_order' => 1,
            'is_active' => true,
        ]);

        $this->assertSame(1, $banner->image_width);
        $this->assertSame(1, $banner->image_height);

        // تصویر موبایل ثبت نشده → همهٔ ستون‌های موبایل null می‌مانند.
        $this->assertNull($banner->mobile_image_width);
        $this->assertNull($banner->mobile_image_height);
    }

    public function test_banner_with_missing_file_keeps_null_dimensions(): void
    {
        $banner = Banner::query()->create([
            'title' => 'بنر بی‌فایل',
            'image' => 'banners/missing-file.jpg',
            'position' => 'home_hero',
            'is_active' => true,
        ]);

        $this->assertNull($banner->image_width);
        $this->assertNull($banner->image_height);
    }

    public function test_product_image_dimensions_are_filled_from_real_file(): void
    {
        $product = $this->createProduct('test-product');

        $this->storeTestImage('product-images/' . $product->id . '/main.png');

        $image = ProductImage::query()->create([
            'product_id' => $product->id,
            'path' => 'product-images/' . $product->id . '/main.png',
            'alt' => 'تصویر اصلی محصول تست',
            'is_primary' => true,
        ]);

        $this->assertSame(1, $image->width);
        $this->assertSame(1, $image->height);
    }

    public function test_legacy_migration_command_reports_without_changing_anything(): void
    {
        $product = $this->createProduct('old-product', 'products/legacy.jpg');

        $this->artisan('images:migrate-legacy')
            ->expectsOutputToContain('ردیف‌های products.thumbnail با مسیر قدیمی: 1')
            ->assertExitCode(0);

        // dry-run: هیچ چیزی عوض نشده.
        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'thumbnail' => 'products/legacy.jpg',
        ]);
    }

    public function test_legacy_migration_command_moves_files_with_apply(): void
    {
        $product = $this->createProduct('old-product-2', 'products/legacy-move.jpg');

        Storage::disk('public')->put('products/legacy-move.jpg', 'fake-image-bytes');

        $this->artisan('images:migrate-legacy', ['--apply' => true])
            ->assertExitCode(0);

        $product->refresh();

        $this->assertSame(
            'product-images/' . $product->id . '/legacy-move.jpg',
            $product->thumbnail
        );

        Storage::disk('public')->assertExists($product->thumbnail);
    }

    public function test_webp_command_reports_missing_image_driver(): void
    {
        if (WebpConverter::driver() !== null) {
            $this->markTestSkipped('این محیط افزونهٔ تصویر دارد؛ سناریوی «بدون درایور» معنا ندارد.');
        }

        $this->artisan('images:webp')
            ->expectsOutputToContain('هیچ افزونهٔ تصویری برای تبدیل WebP فعال نیست')
            ->assertExitCode(0);
    }
}
