<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Support\Spreadsheet\XlsxWriter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminProductImportTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        $admin = User::factory()->create(['role' => 'admin']);

        Sanctum::actingAs($admin);

        return $admin;
    }

    /**
     * @param  list<list<mixed>>  $productRows
     * @param  list<list<mixed>>  $variantRows
     */
    private function spreadsheet(array $productRows, array $variantRows = []): UploadedFile
    {
        $sheets = [
            ['name' => 'محصولات', 'rows' => $productRows],
            ['name' => 'تنوع‌ها', 'rows' => $variantRows],
        ];

        return UploadedFile::fake()->createWithContent(
            'products.xlsx',
            XlsxWriter::build($sheets)
        );
    }

    /**
     * @return list<string>
     */
    private function productHeader(): array
    {
        return [
            'نام محصول', 'کد محصول', 'دسته‌بندی', 'برند', 'قیمت',
            'موجودی', 'فعال', 'ویژه',
        ];
    }

    public function test_template_download_returns_excel_file(): void
    {
        $this->admin();

        $response = $this->get('/api/v1/admin/products/import/template');

        $response->assertOk();
        $response->assertHeader(
            'content-type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );

        $this->assertStringStartsWith('PK', $response->getContent());
    }

    public function test_import_endpoints_are_protected(): void
    {
        $this->getJson('/api/v1/admin/products/import/template')->assertStatus(401);

        Sanctum::actingAs(User::factory()->create(['role' => 'customer']));

        $this->getJson('/api/v1/admin/products/import/template')->assertStatus(403);
        $this->postJson('/api/v1/admin/products/import', [])->assertStatus(403);
    }

    public function test_preview_reports_rows_without_writing_to_database(): void
    {
        $this->admin();

        $file = $this->spreadsheet([
            $this->productHeader(),
            ['شامپو ضد ریزش', 'SH-1001', 'مراقبت از مو', 'نمونه', '185,000', 12, 'بله', 'خیر'],
            ['کرم مرطوب‌کننده', 'CR-2001', 'مراقبت از پوست', '', '۳۲۰۰۰۰', 5, 'بله', 'بله'],
        ]);

        $response = $this->post('/api/v1/admin/products/import', [
            'file' => $file,
            'dry_run' => true,
        ], ['Accept' => 'application/json']);

        $response->assertOk();
        $response->assertJsonPath('data.summary.products_create', 2);
        $response->assertJsonPath('data.summary.errors', 0);
        $response->assertJsonPath('data.dry_run', true);

        $this->assertSame(0, Product::query()->count());
        $this->assertSame(0, Category::query()->count());
    }

    public function test_commit_creates_products_variants_and_missing_category(): void
    {
        $this->admin();

        $file = $this->spreadsheet(
            [
                $this->productHeader(),
                ['شامپو ضد ریزش', 'SH-1001', 'مراقبت از مو', 'نمونه', '185,000', 12, 'بله', 'خیر'],
            ],
            [
                ['کد محصول', 'کد تنوع', 'نام تنوع', 'سایز', 'قیمت', 'موجودی', 'فعال'],
                ['SH-1001', 'SH-1001-400', 'شامپو ۴۰۰ میلی‌لیتر', '400', '195000', 7, 'بله'],
            ]
        );

        $response = $this->post('/api/v1/admin/products/import', [
            'file' => $file,
            'dry_run' => false,
            'create_missing' => true,
        ], ['Accept' => 'application/json']);

        $response->assertOk();
        $response->assertJsonPath('data.summary.products_create', 1);
        $response->assertJsonPath('data.summary.variants_create', 1);
        $response->assertJsonPath('data.summary.errors', 0);

        $product = Product::query()->where('sku', 'SH-1001')->firstOrFail();

        $this->assertSame('شامپو ضد ریزش', $product->name);
        $this->assertEquals(185000, (float) $product->price);
        $this->assertSame(12, (int) $product->stock);
        $this->assertTrue((bool) $product->is_active);
        $this->assertFalse((bool) $product->is_featured);

        $category = Category::query()->where('name', 'مراقبت از مو')->firstOrFail();
        $this->assertSame($category->id, $product->category_id);

        $variant = ProductVariant::query()->where('sku', 'SH-1001-400')->firstOrFail();
        $this->assertSame($product->id, $variant->product_id);
        $this->assertSame('400', $variant->size);
        $this->assertSame(7, (int) $variant->stock);
    }

    public function test_reimport_updates_existing_products_by_sku(): void
    {
        $this->admin();

        $file = fn (string $price) => $this->spreadsheet([
            $this->productHeader(),
            ['شامپو ضد ریزش', 'SH-1001', 'مراقبت از مو', '', $price, 3, 'بله', 'خیر'],
        ]);

        $this->post('/api/v1/admin/products/import', [
            'file' => $file('185000'),
            'dry_run' => false,
        ], ['Accept' => 'application/json'])->assertOk();

        $response = $this->post('/api/v1/admin/products/import', [
            'file' => $file('200000'),
            'dry_run' => false,
        ], ['Accept' => 'application/json']);

        $response->assertOk();
        $response->assertJsonPath('data.summary.products_create', 0);
        $response->assertJsonPath('data.summary.products_update', 1);

        $this->assertSame(1, Product::query()->count());
        $this->assertEquals(200000, (float) Product::query()->firstOrFail()->price);
    }

    public function test_rows_with_errors_block_the_whole_import(): void
    {
        $this->admin();

        $file = $this->spreadsheet([
            $this->productHeader(),
            ['محصول سالم', 'OK-1', 'دستهٔ تست', '', '100000', 1, 'بله', 'خیر'],
            ['محصول بی‌قیمت', 'BAD-1', 'دستهٔ تست', '', '', 1, 'بله', 'خیر'],
            ['بدون کد', '', 'دستهٔ تست', '', '50000', 1, 'بله', 'خیر'],
        ]);

        $response = $this->post('/api/v1/admin/products/import', [
            'file' => $file,
            'dry_run' => false,
        ], ['Accept' => 'application/json']);

        $response->assertOk();
        $response->assertJsonPath('success', false);
        $response->assertJsonPath('data.summary.errors', 2);

        $this->assertSame(0, Product::query()->count());
    }

    public function test_update_existing_can_be_disabled(): void
    {
        $this->admin();

        $file = fn (string $name) => $this->spreadsheet([
            $this->productHeader(),
            [$name, 'SH-1001', 'دستهٔ تست', '', '100000', 1, 'بله', 'خیر'],
        ]);

        $this->post('/api/v1/admin/products/import', [
            'file' => $file('نام اول'),
            'dry_run' => false,
        ], ['Accept' => 'application/json'])->assertOk();

        $response = $this->post('/api/v1/admin/products/import', [
            'file' => $file('نام دوم'),
            'dry_run' => false,
            'update_existing' => false,
        ], ['Accept' => 'application/json']);

        $response->assertJsonPath('data.summary.products_skipped', 1);
        $this->assertSame('نام اول', Product::query()->firstOrFail()->name);
    }
}
