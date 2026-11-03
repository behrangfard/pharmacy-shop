<?php

namespace Database\Seeders;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Database\Seeder;

/**
 * داده‌های نمونه فروشگاه لباس زیر.
 *
 * این seeder به‌صورت idempotent نوشته شده است؛ اجرای مکرر آن
 * رکوردهای تکراری ایجاد نمی‌کند و فقط مقادیر را به‌روزرسانی می‌کند.
 */
class StoreSeeder extends Seeder
{
    public function run(): void
    {
        /*
        |--------------------------------------------------------------------------
        | دسته‌بندی‌های اصلی
        |--------------------------------------------------------------------------
        */

        $bra = $this->category(
            name: 'سوتین',
            slug: 'bra',
            description: 'انواع سوتین زنانه در سایزها و مدل‌های مختلف',
            sortOrder: 1
        );

        $panties = $this->category(
            name: 'شورت زنانه',
            slug: 'panties',
            description: 'شورت‌های نخی، بی‌درز و روزمره',
            sortOrder: 2
        );

        $sets = $this->category(
            name: 'ست لباس زیر',
            slug: 'lingerie-sets',
            description: 'ست‌های هماهنگ سوتین و شورت',
            sortOrder: 3
        );

        $sleepwear = $this->category(
            name: 'لباس خواب',
            slug: 'sleepwear',
            description: 'لباس خواب و ست‌های راحتی',
            sortOrder: 4
        );

        $shapewear = $this->category(
            name: 'گن و فرم‌دهنده',
            slug: 'shapewear',
            description: 'گن، کرست و لباس‌های فرم‌دهنده',
            sortOrder: 5
        );

        /*
        |--------------------------------------------------------------------------
        | زیردسته‌بندی‌ها
        |--------------------------------------------------------------------------
        */

        $braSeamless = $this->category(
            name: 'سوتین بدون درز',
            slug: 'bra-seamless',
            description: 'سوتین‌های بدون درز و مناسب استفاده روزمره',
            sortOrder: 1,
            parentId: $bra->id
        );

        $braFoam = $this->category(
            name: 'سوتین فوم‌دار',
            slug: 'bra-foam',
            description: 'سوتین‌های فوم‌دار با فرم‌دهی طبیعی',
            sortOrder: 2,
            parentId: $bra->id
        );

        $braSports = $this->category(
            name: 'سوتین ورزشی',
            slug: 'bra-sports',
            description: 'سوتین‌های ورزشی با پشتیبانی بالا',
            sortOrder: 3,
            parentId: $bra->id
        );

        $pantiesCotton = $this->category(
            name: 'شورت نخی',
            slug: 'panties-cotton',
            description: 'شورت‌های نخی با تنفس‌پذیری بالا',
            sortOrder: 1,
            parentId: $panties->id
        );

        $pantiesSeamless = $this->category(
            name: 'شورت بی‌درز',
            slug: 'panties-seamless',
            description: 'شورت‌های بی‌درز و نامرئی زیر لباس',
            sortOrder: 2,
            parentId: $panties->id
        );

        /*
        |--------------------------------------------------------------------------
        | برندها
        |--------------------------------------------------------------------------
        */

        $behrang = $this->brand(
            name: 'بهرنگ',
            slug: 'behrang',
            description: 'برند داخلی فروشگاه با تمرکز بر کیفیت پارچه',
            sortOrder: 1
        );

        $venus = $this->brand(
            name: 'ونوس',
            slug: 'venus',
            description: 'طراحی‌های کلاسیک و ساتن',
            sortOrder: 2
        );

        $lina = $this->brand(
            name: 'لینا',
            slug: 'lina',
            description: 'لباس زیر روزمره و راحت',
            sortOrder: 3
        );

        $anso = $this->brand(
            name: 'آنسو',
            slug: 'anso',
            description: 'لباس زیر ورزشی و بی‌درز',
            sortOrder: 4
        );

        /*
        |--------------------------------------------------------------------------
        | محصولات
        |--------------------------------------------------------------------------
        */

        $this->product(
            attributes: [
                'category_id' => $braSeamless->id,
                'brand_id' => $venus->id,
                'name' => 'سوتین بدون درز ونوس',
                'slug' => 'venus-seamless-bra',
                'sku' => 'VNS-BRA-001',
                'short_description' => 'سوتین بدون درز با پارچه نرم و کشسان',
                'description' => 'سوتین بدون درز ونوس برای استفاده روزمره طراحی شده است. بندهای قابل تنظیم و پارچه تنفس‌پذیر، راحتی طولانی‌مدت را فراهم می‌کند.',
                'price' => 1450000,
                'compare_price' => 1850000,
                'discount_percent' => 22,
                'stock' => 40,
                'weight' => 0.120,
                'is_active' => true,
                'is_featured' => true,
                'is_new' => false,
            ],
            variants: [
                ['name' => 'سایز 75B', 'sku' => 'VNS-BRA-001-75B', 'stock' => 12],
                ['name' => 'سایز 80B', 'sku' => 'VNS-BRA-001-80B', 'stock' => 14],
                ['name' => 'سایز 85B', 'sku' => 'VNS-BRA-001-85B', 'stock' => 14],
            ]
        );

        $this->product(
            attributes: [
                'category_id' => $braFoam->id,
                'brand_id' => $lina->id,
                'name' => 'سوتین فوم‌دار لینا',
                'slug' => 'lina-foam-bra',
                'sku' => 'LNA-BRA-002',
                'short_description' => 'سوتین فوم‌دار با فرم‌دهی طبیعی',
                'description' => 'سوتین فوم‌دار لینا با کاپ‌های نرم و بدون فنر، فرم طبیعی و راحتی را همزمان ارائه می‌دهد.',
                'price' => 1690000,
                'compare_price' => null,
                'discount_percent' => 0,
                'stock' => 30,
                'weight' => 0.130,
                'is_active' => true,
                'is_featured' => false,
                'is_new' => true,
            ],
            variants: [
                ['name' => 'سایز 75C', 'sku' => 'LNA-BRA-002-75C', 'stock' => 10],
                ['name' => 'سایز 80C', 'sku' => 'LNA-BRA-002-80C', 'stock' => 10],
                ['name' => 'سایز 85C', 'sku' => 'LNA-BRA-002-85C', 'stock' => 10],
            ]
        );

        $this->product(
            attributes: [
                'category_id' => $braSports->id,
                'brand_id' => $anso->id,
                'name' => 'سوتین ورزشی آنسو',
                'slug' => 'anso-sports-bra',
                'sku' => 'ANS-BRA-003',
                'short_description' => 'سوتین ورزشی با پشتیبانی بالا',
                'description' => 'سوتین ورزشی آنسو با پارچه رطوبت‌گیر و بندهای پهن، مناسب تمرین‌های روزانه و ورزش‌های سبک است.',
                'price' => 890000,
                'compare_price' => 1090000,
                'discount_percent' => 18,
                'stock' => 45,
                'weight' => 0.150,
                'is_active' => true,
                'is_featured' => false,
                'is_new' => true,
            ],
            variants: [
                ['name' => 'سایز S', 'sku' => 'ANS-BRA-003-S', 'stock' => 15],
                ['name' => 'سایز M', 'sku' => 'ANS-BRA-003-M', 'stock' => 15],
                ['name' => 'سایز L', 'sku' => 'ANS-BRA-003-L', 'stock' => 15],
            ]
        );

        $this->product(
            attributes: [
                'category_id' => $pantiesCotton->id,
                'brand_id' => $behrang->id,
                'name' => 'شورت نخی بهرنگ (بسته سه عددی)',
                'slug' => 'behrang-cotton-panties-pack',
                'sku' => 'BHR-PNT-004',
                'short_description' => 'بسته سه عددی شورت نخی با کمر کشی',
                'description' => 'شورت نخی بهرنگ از پنبه خالص تولید شده و برای استفاده روزمره، تنفس‌پذیری و راحتی بالایی دارد. این بسته شامل سه عدد شورت است.',
                'price' => 390000,
                'compare_price' => null,
                'discount_percent' => 0,
                'stock' => 90,
                'weight' => 0.180,
                'is_active' => true,
                'is_featured' => true,
                'is_new' => false,
            ],
            variants: [
                ['name' => 'سایز M', 'sku' => 'BHR-PNT-004-M', 'stock' => 30],
                ['name' => 'سایز L', 'sku' => 'BHR-PNT-004-L', 'stock' => 30],
                ['name' => 'سایز XL', 'sku' => 'BHR-PNT-004-XL', 'stock' => 30],
            ]
        );

        $this->product(
            attributes: [
                'category_id' => $pantiesSeamless->id,
                'brand_id' => $anso->id,
                'name' => 'شورت بی‌درز آنسو',
                'slug' => 'anso-seamless-panties',
                'sku' => 'ANS-PNT-005',
                'short_description' => 'شورت بی‌درز و نامرئی زیر لباس',
                'description' => 'شورت بی‌درز آنسو با لبه‌های چسبان و بدون دوخت، زیر لباس‌های چسبان کاملاً نامرئی است.',
                'price' => 320000,
                'compare_price' => null,
                'discount_percent' => 0,
                'stock' => 75,
                'weight' => 0.090,
                'is_active' => true,
                'is_featured' => false,
                'is_new' => true,
            ],
            variants: [
                ['name' => 'سایز M', 'sku' => 'ANS-PNT-005-M', 'stock' => 40],
                ['name' => 'سایز L', 'sku' => 'ANS-PNT-005-L', 'stock' => 35],
            ]
        );

        $this->product(
            attributes: [
                'category_id' => $sets->id,
                'brand_id' => $venus->id,
                'name' => 'ست لباس زیر ساتن ونوس',
                'slug' => 'venus-satin-lingerie-set',
                'sku' => 'VNS-SET-006',
                'short_description' => 'ست هماهنگ سوتین و شورت ساتن',
                'description' => 'ست لباس زیر ساتن ونوس شامل سوتین و شورت هماهنگ با پارچه ساتن براق و دوخت تمیز است.',
                'price' => 2450000,
                'compare_price' => 2950000,
                'discount_percent' => 17,
                'stock' => 25,
                'weight' => 0.260,
                'is_active' => true,
                'is_featured' => true,
                'is_new' => false,
            ],
            variants: [
                ['name' => 'سایز S', 'sku' => 'VNS-SET-006-S', 'stock' => 8],
                ['name' => 'سایز M', 'sku' => 'VNS-SET-006-M', 'stock' => 9],
                ['name' => 'سایز L', 'sku' => 'VNS-SET-006-L', 'stock' => 8],
            ]
        );

        $this->product(
            attributes: [
                'category_id' => $sleepwear->id,
                'brand_id' => $lina->id,
                'name' => 'لباس خواب ساتن لینا',
                'slug' => 'lina-satin-nightgown',
                'sku' => 'LNA-SLP-007',
                'short_description' => 'لباس خواب ساتن با بند نازک',
                'description' => 'لباس خواب ساتن لینا با پارچه سبک و خنک، مناسب فصل‌های گرم است.',
                'price' => 1980000,
                'compare_price' => null,
                'discount_percent' => 0,
                'stock' => 35,
                'weight' => 0.240,
                'is_active' => true,
                'is_featured' => false,
                'is_new' => true,
            ],
            variants: [
                ['name' => 'سایز S', 'sku' => 'LNA-SLP-007-S', 'stock' => 12],
                ['name' => 'سایز M', 'sku' => 'LNA-SLP-007-M', 'stock' => 11],
                ['name' => 'سایز L', 'sku' => 'LNA-SLP-007-L', 'stock' => 12],
            ]
        );

        $this->product(
            attributes: [
                'category_id' => $shapewear->id,
                'brand_id' => $behrang->id,
                'name' => 'گن فرم‌دهنده بهرنگ',
                'slug' => 'behrang-shapewear-bodysuit',
                'sku' => 'BHR-SHP-008',
                'short_description' => 'گن فرم‌دهنده با کنترل شکم و پهلو',
                'description' => 'گن فرم‌دهنده بهرنگ با دوخت تقویتی، فرم بدن را در ناحیه شکم و پهلو بهبود می‌دهد و زیر لباس دیده نمی‌شود.',
                'price' => 1150000,
                'compare_price' => 1390000,
                'discount_percent' => 17,
                'stock' => 28,
                'weight' => 0.220,
                'is_active' => true,
                'is_featured' => false,
                'is_new' => false,
            ],
            variants: [
                ['name' => 'سایز M', 'sku' => 'BHR-SHP-008-M', 'stock' => 10],
                ['name' => 'سایز L', 'sku' => 'BHR-SHP-008-L', 'stock' => 9],
                ['name' => 'سایز XL', 'sku' => 'BHR-SHP-008-XL', 'stock' => 9],
            ]
        );
    }

    private function category(
        string $name,
        string $slug,
        ?string $description,
        int $sortOrder,
        ?int $parentId = null
    ): Category {
        return Category::updateOrCreate(
            ['slug' => $slug],
            [
                'parent_id' => $parentId,
                'name' => $name,
                'description' => $description,
                'is_active' => true,
                'sort_order' => $sortOrder,
            ]
        );
    }

    private function brand(
        string $name,
        string $slug,
        ?string $description,
        int $sortOrder
    ): Brand {
        return Brand::updateOrCreate(
            ['slug' => $slug],
            [
                'name' => $name,
                'description' => $description,
                'is_active' => true,
                'sort_order' => $sortOrder,
            ]
        );
    }

    /**
     * @param  array<string, mixed>  $attributes
     * @param  array<int, array<string, mixed>>  $variants
     */
    private function product(array $attributes, array $variants = []): void
    {
        $product = Product::updateOrCreate(
            ['slug' => $attributes['slug']],
            $attributes
        );

        foreach ($variants as $variant) {
            ProductVariant::updateOrCreate(
                ['sku' => $variant['sku']],
                array_merge($variant, [
                    'product_id' => $product->id,
                    'is_active' => true,
                ])
            );
        }
    }
}
