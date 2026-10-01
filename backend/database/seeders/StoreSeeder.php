<?php

namespace Database\Seeders;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Seeder;

class StoreSeeder extends Seeder
{
    public function run(): void
    {
        /*
        |--------------------------------------------------------------------------
        | Categories
        |--------------------------------------------------------------------------
        */

        $medicine = Category::create([
            'name' => 'دارو و محصولات دارویی',
            'slug' => 'medicine',
            'description' => 'انواع محصولات و اقلام دارویی',
            'is_active' => true,
            'sort_order' => 1,
        ]);

        $medical = Category::create([
            'name' => 'تجهیزات پزشکی',
            'slug' => 'medical-equipment',
            'description' => 'تجهیزات و ابزارهای پزشکی و سلامت',
            'is_active' => true,
            'sort_order' => 2,
        ]);

        $personalCare = Category::create([
            'name' => 'بهداشت و مراقبت شخصی',
            'slug' => 'personal-care',
            'description' => 'محصولات بهداشت و مراقبت شخصی',
            'is_active' => true,
            'sort_order' => 3,
        ]);

        $supplements = Category::create([
            'name' => 'مکمل‌ها',
            'slug' => 'supplements',
            'description' => 'انواع مکمل‌های غذایی و ویتامین‌ها',
            'is_active' => true,
            'sort_order' => 4,
        ]);

        $motherChild = Category::create([
            'name' => 'مادر و کودک',
            'slug' => 'mother-child',
            'description' => 'محصولات مخصوص مادر و کودک',
            'is_active' => true,
            'sort_order' => 5,
        ]);

        /*
        |--------------------------------------------------------------------------
        | Sub Categories
        |--------------------------------------------------------------------------
        */

        Category::create([
            'parent_id' => $medical->id,
            'name' => 'فشارسنج',
            'slug' => 'blood-pressure-monitors',
            'is_active' => true,
            'sort_order' => 1,
        ]);

        Category::create([
            'parent_id' => $medical->id,
            'name' => 'تب‌سنج',
            'slug' => 'thermometers',
            'is_active' => true,
            'sort_order' => 2,
        ]);

        Category::create([
            'parent_id' => $personalCare->id,
            'name' => 'مراقبت از پوست',
            'slug' => 'skin-care',
            'is_active' => true,
            'sort_order' => 1,
        ]);

        Category::create([
            'parent_id' => $personalCare->id,
            'name' => 'مراقبت از دهان و دندان',
            'slug' => 'oral-care',
            'is_active' => true,
            'sort_order' => 2,
        ]);

        /*
        |--------------------------------------------------------------------------
        | Brands
        |--------------------------------------------------------------------------
        */

        $pfizer = Brand::create([
            'name' => 'Pfizer',
            'slug' => 'pfizer',
            'description' => 'برند دارویی و سلامت',
            'is_active' => true,
            'sort_order' => 1,
        ]);

        $bayer = Brand::create([
            'name' => 'Bayer',
            'slug' => 'bayer',
            'description' => 'برند بین‌المللی محصولات سلامت',
            'is_active' => true,
            'sort_order' => 2,
        ]);

        $roche = Brand::create([
            'name' => 'Roche',
            'slug' => 'roche',
            'description' => 'شرکت بین‌المللی حوزه سلامت',
            'is_active' => true,
            'sort_order' => 3,
        ]);

        $novartis = Brand::create([
            'name' => 'Novartis',
            'slug' => 'novartis',
            'description' => 'برند بین‌المللی دارویی',
            'is_active' => true,
            'sort_order' => 4,
        ]);

        $abbott = Brand::create([
            'name' => 'Abbott',
            'slug' => 'abbott',
            'description' => 'برند محصولات پزشکی و سلامت',
            'is_active' => true,
            'sort_order' => 5,
        ]);

        /*
        |--------------------------------------------------------------------------
        | Products
        |--------------------------------------------------------------------------
        */

        Product::create([
            'category_id' => $medical->id,
            'brand_id' => $abbott->id,
            'name' => 'دستگاه فشار خون دیجیتال Abbott',
            'slug' => 'abbott-digital-blood-pressure-monitor',
            'sku' => 'ABB-BP-001',
            'short_description' => 'فشارسنج دیجیتال دقیق و کاربردی',
            'description' => 'دستگاه فشار خون دیجیتال مناسب استفاده خانگی و حرفه‌ای.',
            'price' => 2850000,
            'compare_price' => 3200000,
            'discount_percent' => 20,
            'stock' => 18,
            'weight' => 0.650,
            'is_active' => true,
            'is_featured' => true,
            'is_new' => true,
        ]);

        Product::create([
            'category_id' => $medical->id,
            'brand_id' => $roche->id,
            'name' => 'تب‌سنج دیجیتال Roche',
            'slug' => 'roche-digital-thermometer',
            'sku' => 'ROC-TH-001',
            'short_description' => 'تب‌سنج دیجیتال سریع و دقیق',
            'description' => 'تب‌سنج دیجیتال با نمایش سریع دمای بدن.',
            'price' => 890000,
            'compare_price' => 1050000,
            'stock' => 35,
            'weight' => 0.120,
            'is_active' => true,
            'is_featured' => true,
            'is_new' => true,
        ]);

        Product::create([
            'category_id' => $supplements->id,
            'brand_id' => $pfizer->id,
            'name' => 'مولتی‌ویتامین روزانه Pfizer',
            'slug' => 'pfizer-daily-multivitamin',
            'sku' => 'PFZ-VIT-001',
            'short_description' => 'مکمل مولتی‌ویتامین روزانه',
            'description' => 'مولتی‌ویتامین مناسب استفاده روزانه.',
            'price' => 1250000,
            'compare_price' => 1450000,
            'stock' => 42,
            'weight' => 0.250,
            'is_active' => true,
            'is_featured' => true,
            'is_new' => false,
        ]);

        Product::create([
            'category_id' => $supplements->id,
            'brand_id' => $novartis->id,
            'name' => 'ویتامین D3 Novartis',
            'slug' => 'novartis-vitamin-d3',
            'sku' => 'NOV-D3-001',
            'short_description' => 'مکمل ویتامین D3',
            'description' => 'محصول نمونه برای نمایش فروشگاه.',
            'price' => 680000,
            'compare_price' => 790000,
            'stock' => 56,
            'weight' => 0.100,
            'is_active' => true,
            'is_featured' => false,
            'is_new' => true,
        ]);

        Product::create([
            'category_id' => $personalCare->id,
            'brand_id' => $bayer->id,
            'name' => 'کرم مرطوب‌کننده پوست Bayer',
            'slug' => 'bayer-moisturizing-cream',
            'sku' => 'BAY-SKIN-001',
            'short_description' => 'کرم مرطوب‌کننده مناسب پوست',
            'description' => 'کرم مرطوب‌کننده برای مراقبت روزانه از پوست.',
            'price' => 980000,
            'compare_price' => 1150000,
            'stock' => 27,
            'weight' => 0.200,
            'is_active' => true,
            'is_featured' => true,
            'is_new' => false,
        ]);

        Product::create([
            'category_id' => $personalCare->id,
            'brand_id' => $abbott->id,
            'name' => 'مسواک برقی حرفه‌ای Abbott',
            'slug' => 'abbott-electric-toothbrush',
            'sku' => 'ABB-ORAL-001',
            'short_description' => 'مسواک برقی برای مراقبت بهتر از دندان',
            'description' => 'مسواک برقی مناسب استفاده روزانه.',
            'price' => 2150000,
            'compare_price' => 2500000,
            'stock' => 14,
            'weight' => 0.350,
            'is_active' => true,
            'is_featured' => false,
            'is_new' => true,
        ]);

        Product::create([
            'category_id' => $motherChild->id,
            'brand_id' => $bayer->id,
            'name' => 'شیشه شیر نوزاد Bayer',
            'slug' => 'bayer-baby-bottle',
            'sku' => 'BAY-BABY-001',
            'short_description' => 'شیشه شیر مناسب نوزاد',
            'description' => 'محصول نمونه بخش مادر و کودک.',
            'price' => 520000,
            'compare_price' => 620000,
            'stock' => 31,
            'weight' => 0.180,
            'is_active' => true,
            'is_featured' => false,
            'is_new' => true,
        ]);

        Product::create([
            'category_id' => $medicine->id,
            'brand_id' => $pfizer->id,
            'name' => 'محصول دارویی نمونه Pfizer',
            'slug' => 'pfizer-sample-medicine',
            'sku' => 'PFZ-MED-001',
            'short_description' => 'محصول نمونه برای فروشگاه',
            'description' => 'این محصول صرفاً برای داده آزمایشی فروشگاه ایجاد شده است.',
            'price' => 450000,
            'compare_price' => 500000,
            'stock' => 20,
            'weight' => 0.050,
            'is_active' => true,
            'is_featured' => false,
            'is_new' => false,
        ]);
    }
}