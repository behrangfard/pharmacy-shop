<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use Database\Seeders\StoreSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StoreSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_store_seeder_builds_the_lingerie_catalog(): void
    {
        $this->seed(StoreSeeder::class);

        $this->assertDatabaseHas('categories', [
            'slug' => 'bra',
            'name' => 'سوتین',
        ]);

        $this->assertDatabaseHas('categories', [
            'slug' => 'panties-seamless',
            'name' => 'شورت بی‌درز',
        ]);

        $this->assertDatabaseHas('brands', [
            'slug' => 'venus',
            'name' => 'ونوس',
        ]);

        $this->assertDatabaseHas('products', [
            'slug' => 'venus-seamless-bra',
            'sku' => 'VNS-BRA-001',
        ]);

        $this->assertDatabaseHas('product_variants', [
            'sku' => 'VNS-BRA-001-75B',
            'name' => 'سایز 75B',
        ]);
    }

    public function test_store_seeder_is_idempotent(): void
    {
        $this->seed(StoreSeeder::class);

        $categories = Category::query()->count();
        $brands = Brand::query()->count();
        $products = Product::query()->count();
        $variants = ProductVariant::query()->count();

        // اجرای دوباره نباید رکورد تکراری بسازد.
        $this->seed(StoreSeeder::class);

        $this->assertSame($categories, Category::query()->count());
        $this->assertSame($brands, Brand::query()->count());
        $this->assertSame($products, Product::query()->count());
        $this->assertSame($variants, ProductVariant::query()->count());

        $this->assertSame(10, $categories);
        $this->assertSame(4, $brands);
        $this->assertSame(8, $products);
        $this->assertSame(23, $variants);
    }
}
