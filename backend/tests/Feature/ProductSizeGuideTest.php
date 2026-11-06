<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * «راهنمای سایز اختصاصی محصول».
 *
 * این راهنما با راهنمای سایز عمومی سایت تفاوت دارد: هر محصول راهنمای خودش را
 * دارد (توضیحات، جدول اندازه‌ها، ابعاد دوخت، مراحل اندازه‌گیری، تصویر و نکته‌ها)
 * و فقط وقتی در صفحهٔ محصول نمایش داده می‌شود که فعال باشد و محتوا داشته باشد.
 */
class ProductSizeGuideTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        Sanctum::actingAs($admin);
    }

    public function test_admin_can_save_size_guide_for_one_product(): void
    {
        $this->admin();

        $product = $this->createProduct();

        $this->putJson("/api/v1/admin/products/{$product->id}", [
            'size_guide' => [
                'is_enabled' => true,
                'title' => 'سایزبندی مدل آنجل',
                'intro' => 'این مدل کشباف است و انعطاف خوبی دارد.',
                'unit' => 'cm',
                'columns' => ['سایز', 'دور سینه', 'دور کمر'],
                'rows' => [
                    ['S', '80 – 86', '60 – 66'],
                    ['M', '86 – 92', '67 – 73'],
                ],
                'specs' => [
                    ['label' => 'قد لباس', 'value' => '75'],
                    ['label' => 'عرض بند', 'value' => '1.5'],
                ],
                'measure_steps' => [
                    [
                        'title' => 'دور سینه',
                        'description' => 'نوار را روی برجسته‌ترین نقطهٔ سینه بگذارید.',
                    ],
                ],
                'fit_note' => 'اگر بین دو سایز هستید، سایز بزرگ‌تر را انتخاب کنید.',
                'note' => 'جنس پارچه کشباف است.',
                'tips' => ['قبل از خرید یک بار اندازه‌گیری کنید.'],
            ],
        ])->assertOk();

        $guide = $product->fresh()->sizeGuide;

        $this->assertNotNull($guide);
        $this->assertTrue($guide->is_enabled);
        $this->assertSame('سایزبندی مدل آنجل', $guide->title);
        $this->assertSame(['سایز', 'دور سینه', 'دور کمر'], $guide->columns);
        $this->assertSame([
            ['S', '80 – 86', '60 – 66'],
            ['M', '86 – 92', '67 – 73'],
        ], $guide->rows);
        $this->assertSame('cm', $guide->unit);
        $this->assertCount(2, $guide->specs);
        $this->assertCount(1, $guide->tips);
        $this->assertTrue($guide->hasChart());
    }

    public function test_size_guide_is_product_specific_and_not_shared(): void
    {
        $this->admin();

        $first = $this->createProduct('guide-first', 'GUIDE-FIRST');
        $second = $this->createProduct('guide-second', 'GUIDE-SECOND');

        $this->putJson("/api/v1/admin/products/{$first->id}", [
            'size_guide' => [
                'columns' => ['سایز', 'دور کمر'],
                'rows' => [['M', '70']],
            ],
        ])->assertOk();

        $this->assertNotNull($first->fresh()->sizeGuide);
        $this->assertNull($second->fresh()->sizeGuide);
    }

    public function test_public_product_detail_returns_size_guide(): void
    {
        $this->admin();

        $product = $this->createProduct();

        $this->putJson("/api/v1/admin/products/{$product->id}", [
            'size_guide' => [
                'title' => 'راهنمای سایز این مدل',
                'columns' => ['سایز', 'دور باسن'],
                'rows' => [['XL', '105 – 112']],
            ],
        ])->assertOk();

        $response = $this->getJson("/api/v1/products/{$product->slug}")
            ->assertOk()
            ->assertJsonPath('data.size_guide.title', 'راهنمای سایز این مدل')
            ->assertJsonPath('data.size_guide.unit', 'cm');

        $this->assertSame(
            [['XL', '105 – 112']],
            $response->json('data.size_guide.rows')
        );
    }

    public function test_disabled_size_guide_is_hidden_from_public_product(): void
    {
        $this->admin();

        $product = $this->createProduct();

        $this->putJson("/api/v1/admin/products/{$product->id}", [
            'size_guide' => [
                'is_enabled' => false,
                'columns' => ['سایز'],
                'rows' => [['L']],
            ],
        ])->assertOk();

        $response = $this->getJson("/api/v1/products/{$product->slug}")->assertOk();

        $this->assertArrayNotHasKey('size_guide', $response->json('data'));
    }

    public function test_empty_size_guide_is_removed(): void
    {
        $this->admin();

        $product = $this->createProduct();

        $this->putJson("/api/v1/admin/products/{$product->id}", [
            'size_guide' => [
                'columns' => ['سایز'],
                'rows' => [['S']],
            ],
        ])->assertOk();

        $this->assertDatabaseHas('product_size_guides', [
            'product_id' => $product->id,
        ]);

        $this->putJson("/api/v1/admin/products/{$product->id}", [
            'size_guide' => [
                'title' => '   ',
                'columns' => [],
                'rows' => [],
                'tips' => [''],
            ],
        ])->assertOk();

        $this->assertDatabaseMissing('product_size_guides', [
            'product_id' => $product->id,
        ]);
    }

    public function test_rows_are_padded_to_match_column_count(): void
    {
        $this->admin();

        $product = $this->createProduct();

        $this->putJson("/api/v1/admin/products/{$product->id}", [
            'size_guide' => [
                'columns' => ['سایز', 'دور سینه', 'دور کمر'],
                'rows' => [
                    ['M', '86 – 92'],
                    ['', '', ''],
                ],
            ],
        ])->assertOk();

        $guide = $product->fresh()->sizeGuide;

        $this->assertSame([['M', '86 – 92', '']], $guide->rows);
    }

    public function test_too_many_columns_are_rejected(): void
    {
        $this->admin();

        $product = $this->createProduct();

        $this->putJson("/api/v1/admin/products/{$product->id}", [
            'size_guide' => [
                'columns' => ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'],
                'rows' => [['1', '2', '3', '4', '5', '6', '7', '8', '9']],
            ],
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('size_guide.columns');
    }

    public function test_size_guide_can_be_created_with_new_product(): void
    {
        $this->admin();

        $categoryId = $this->createCategory();

        $this->postJson('/api/v1/admin/products', [
            'category_id' => $categoryId,
            'name' => 'محصول با راهنمای سایز',
            'sku' => 'GUIDE-NEW-SKU',
            'price' => 250000,
            'stock' => 5,
            'size_guide' => [
                'title' => 'سایزبندی اختصاصی',
                'columns' => ['سایز', 'دور کمر'],
                'rows' => [['S', '60 – 66']],
                'fit_note' => 'این مدل کوچک دوخته شده است.',
            ],
        ])
            ->assertCreated()
            ->assertJsonPath('data.size_guide.title', 'سایزبندی اختصاصی');

        $product = Product::query()
            ->where('sku', 'GUIDE-NEW-SKU')
            ->firstOrFail();

        $this->assertNotNull($product->sizeGuide);
        $this->assertSame(
            'این مدل کوچک دوخته شده است.',
            $product->sizeGuide->fit_note
        );
    }

    public function test_measure_image_can_be_uploaded(): void
    {
        $this->admin();

        Storage::fake('public');

        $response = $this->post('/api/v1/admin/products/size-guide-image', [
            'file' => UploadedFile::fake()->create('measure.jpg', 120, 'image/jpeg'),
        ])->assertCreated();

        $path = $response->json('data.path');

        $this->assertIsString($path);
        $this->assertStringStartsWith('product-size-guides/', $path);
        Storage::disk('public')->assertExists($path);
    }

    public function test_guest_cannot_upload_size_guide_image(): void
    {
        Storage::fake('public');

        $this->post('/api/v1/admin/products/size-guide-image', [
            'file' => UploadedFile::fake()->create('measure.jpg', 120, 'image/jpeg'),
        ])->assertUnauthorized();
    }

    private function createCategory(string $suffix = ''): int
    {
        $now = now();

        $slug = 'size-guide-test-category';

        if ($suffix !== '') {
            $slug .= '-'.strtolower($suffix);
        }

        return DB::table('categories')->insertGetId([
            'parent_id' => null,
            'name' => 'Size Guide Test Category',
            'slug' => $slug,
            'description' => null,
            'image' => null,
            'is_active' => true,
            'sort_order' => 0,
            'meta_title' => null,
            'meta_description' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    private function createProduct(
        string $slug = 'size-guide-test-product',
        string $sku = 'SIZE-GUIDE-TEST-SKU'
    ): Product {
        return Product::query()->create([
            'category_id' => $this->createCategory($slug),
            'brand_id' => null,
            'name' => 'Size Guide Test Product',
            'slug' => $slug,
            'sku' => $sku,
            'price' => 100000,
            'compare_price' => null,
            'discount_percent' => 0,
            'stock' => 10,
            'thumbnail' => null,
            'is_active' => true,
            'is_featured' => false,
            'is_new' => false,
            'is_taxable' => false,
        ]);
    }
}
