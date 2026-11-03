<?php

namespace Tests\Feature;

use App\Models\Product;
use Database\Seeders\StoreSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class HideLegacyCatalogTest extends TestCase
{
    use RefreshDatabase;

    private function createLegacyProduct(): Product
    {
        $categoryId = DB::table('categories')->insertGetId([
            'name' => 'لوازم پزشکی',
            'slug' => 'medical-supplies',
            'is_active' => true,
            'sort_order' => 9,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('products')->insert([
            'category_id' => $categoryId,
            'name' => 'دستگاه فشار خون دیجیتال',
            'slug' => 'abbott-blood-pressure-monitor',
            'sku' => 'LEGACY-001',
            'price' => 2500000,
            'stock' => 5,
            'is_active' => true,
            'is_featured' => false,
            'is_new' => false,
            'views_count' => 0,
            'sales_count' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return Product::query()->where('slug', 'abbott-blood-pressure-monitor')->firstOrFail();
    }

    public function test_it_hides_records_outside_the_lingerie_catalog(): void
    {
        $this->seed(StoreSeeder::class);

        // اسلاگ محصولاتی که StoreSeeder ساخته است (پیش از افزودن رکورد legacy).
        $catalogSlugs = Product::query()->pluck('slug')->all();

        $legacyProduct = $this->createLegacyProduct();

        $this->artisan('catalog:hide-legacy')->assertSuccessful();

        // محصول داروخانه‌ای مخفی شد اما حذف نشد.
        $this->assertFalse($legacyProduct->fresh()->is_active);
        $this->assertDatabaseHas('products', ['slug' => 'abbott-blood-pressure-monitor']);
        $this->assertFalse(
            (bool) DB::table('categories')->where('slug', 'medical-supplies')->value('is_active')
        );

        // همه محصولات کاتالوگ لباس زیر فعال می‌مانند (هم‌خوانی لیست با StoreSeeder).
        foreach ($catalogSlugs as $slug) {
            $this->assertTrue(
                (bool) Product::query()->where('slug', $slug)->value('is_active'),
                "محصول {$slug} نباید مخفی شود."
            );
        }
    }

    public function test_it_keeps_the_whole_lingerie_catalog_active(): void
    {
        $this->seed(StoreSeeder::class);

        $this->artisan('catalog:hide-legacy')->assertSuccessful();

        $this->assertSame(
            8,
            Product::query()->where('is_active', true)->count(),
            'همه هشت محصول کاتالوگ باید فعال بمانند.'
        );
        $this->assertSame(10, DB::table('categories')->where('is_active', true)->count());
        $this->assertSame(4, DB::table('brands')->where('is_active', true)->count());
    }

    public function test_restore_option_activates_everything_again(): void
    {
        $this->seed(StoreSeeder::class);
        $legacyProduct = $this->createLegacyProduct();

        $this->artisan('catalog:hide-legacy')->assertSuccessful();
        $this->assertFalse($legacyProduct->fresh()->is_active);

        $this->artisan('catalog:hide-legacy', ['--restore' => true])->assertSuccessful();

        $this->assertTrue($legacyProduct->fresh()->is_active);
        $this->assertTrue(
            (bool) DB::table('categories')->where('slug', 'medical-supplies')->value('is_active')
        );
    }
}
