<?php

namespace App\Services\Products;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Support\Spreadsheet\ImportText;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * وارد کردن محصولات از فایل اکسل/CSV.
 *
 * فایل قالبی که «AdminProductImportController@template» می‌سازد شامل شیت
 * «محصولات» و شیت اختیاری «تنوع‌ها» است؛ ستون‌ها با نام فارسی یا انگلیسی
 * شناخته می‌شوند و ردیف‌ها بر اساس کد محصول (SKU) به‌روزرسانی یا ساخته
 * می‌شوند تا ورود دوبارهٔ فایل داده‌ها را تکرار نکند.
 */
class ProductImportService
{
    public const SHEET_PRODUCTS = 'محصولات';

    public const SHEET_VARIANTS = 'تنوع‌ها';

    /** سقف ردیف در هر ورود؛ برای جلوگیری از تمام‌شدن حافظه. */
    public const MAX_ROWS = 2000;

    /**
     * ستون‌های شیت محصول به همراه نام‌های جایگزین (فارسی/انگلیسی).
     *
     * @var array<string, list<string>>
     */
    private const PRODUCT_FIELDS = [
        'name' => ['نام محصول', 'نام', 'عنوان', 'name', 'title'],
        'sku' => ['کد محصول', 'کد کالا', 'شناسه محصول', 'sku', 'code'],
        'category' => ['دسته بندی', 'دسته', 'گروه', 'category'],
        'brand' => ['برند', 'سازنده', 'تولیدکننده', 'brand'],
        'price' => ['قیمت', 'قیمت فروش', 'price'],
        'compare_price' => ['قیمت قبل از تخفیف', 'قیمت اصلی', 'compare price'],
        'discount_percent' => ['درصد تخفیف', 'تخفیف درصدی', 'discount percent'],
        'stock' => ['موجودی', 'تعداد', 'موجودی انبار', 'stock', 'quantity'],
        'weight' => ['وزن', 'وزن گرم', 'weight'],
        'short_description' => ['توضیح کوتاه', 'خلاصه', 'short description'],
        'description' => ['توضیحات', 'شرح', 'توضیح', 'description'],
        'thumbnail' => ['تصویر', 'عکس', 'آدرس تصویر', 'image', 'thumbnail'],
        'is_active' => ['فعال', 'وضعیت', 'is active', 'active'],
        'is_featured' => ['ویژه', 'محصول ویژه', 'is featured', 'featured'],
        'is_new' => ['جدید', 'محصول جدید', 'is new', 'new'],
        'is_taxable' => ['مشمول مالیات', 'مالیات', 'is taxable'],
        'is_returnable' => ['قابل مرجوع', 'قابل برگشت', 'ضمانت بازگشت', 'is returnable'],
        'meta_title' => ['عنوان سئو', 'meta title'],
        'meta_description' => ['توضیح سئو', 'توضیحات سئو', 'meta description'],
    ];

    /**
     * ستون‌های شیت تنوع‌ها.
     *
     * @var array<string, list<string>>
     */
    private const VARIANT_FIELDS = [
        'product_sku' => ['کد محصول', 'کد کالا', 'product sku'],
        'sku' => ['کد تنوع', 'شناسه تنوع', 'variant sku'],
        'name' => ['نام تنوع', 'عنوان تنوع', 'variant name'],
        'size' => ['سایز', 'size'],
        'price' => ['قیمت', 'قیمت فروش', 'price'],
        'compare_price' => ['قیمت قبل از تخفیف', 'قیمت اصلی', 'compare price'],
        'stock' => ['موجودی', 'تعداد', 'stock', 'quantity'],
        'is_active' => ['فعال', 'وضعیت', 'is active', 'active'],
    ];

    private const NUMERIC_FIELDS = [
        'price' => 'min:0',
        'compare_price' => 'min:0',
        'discount_percent' => 'min:0 max:100',
        'stock' => 'min:0',
        'weight' => 'min:0',
    ];

    private const TEXT_FIELDS = [
        'short_description',
        'description',
        'thumbnail',
        'meta_title',
        'meta_description',
    ];

    private const BOOLEAN_FIELDS = [
        'is_active',
        'is_featured',
        'is_new',
        'is_taxable',
        'is_returnable',
    ];

    /**
     * تحلیل و (در صورت درخواست) اعمال فایل ورود محصول.
     *
     * @param  list<array{name: string, rows: array<int, array<int, string>>}>  $sheets
     * @return array{summary: array<string, int>, rows: list<array<string, mixed>>}
     */
    public function process(array $sheets, bool $commit, bool $createMissing, bool $updateExisting): array
    {
        $productSheet = $this->pickSheet($sheets, self::SHEET_PRODUCTS);
        $variantSheet = $this->pickSheet($sheets, self::SHEET_VARIANTS);

        $productRows = $this->collectRows(
            $productSheet['rows'] ?? [],
            self::PRODUCT_FIELDS,
            'product',
            'ستون «کد محصول» یا «نام محصول» در سرصفحه پیدا نشد.'
        );

        $variantRows = $this->collectRows(
            $variantSheet['rows'] ?? [],
            self::VARIANT_FIELDS,
            'variant',
            'شیت «تنوع‌ها» سرصفحهٔ معتبری ندارد و نادیده گرفته شد.'
        );

        $products = $this->analyzeProductRows($productRows, $createMissing, $updateExisting);
        $variants = $this->analyzeVariantRows($variantRows, $updateExisting);

        $summary = $this->summarize($products, $variants, 0, 0);

        $report = [
            'summary' => $summary,
            'rows' => array_values(array_merge($products, $variants)),
        ];

        if (! $commit || $summary['errors'] > 0) {
            return $report;
        }

        $applied = $this->apply($products, $variants, $createMissing);

        $report['summary'] = $applied['summary'];
        $report['rows'] = $applied['rows'];

        return $report;
    }

    /**
     * شیت موردنظر را بر اساس نام (بدون حساسیت به نگارش) پیدا می‌کند.
     *
     * @param  list<array{name: string, rows: array<int, array<int, string>>}>  $sheets
     * @return array{name: string, rows: array<int, array<int, string>>}|null
     */
    private function pickSheet(array $sheets, string $name): ?array
    {
        $needle = ImportText::key($name);

        foreach ($sheets as $sheet) {
            if (ImportText::key($sheet['name'] ?? '') === $needle) {
                return $sheet;
            }
        }

        return null;
    }

    /**
     * سرصفحه را به فیلدهای استاندارد نگاشت و ردیف‌های خام را آماده می‌کند.
     *
     * @param  array<int, array<int, string>>  $rows
     * @param  array<string, list<string>>  $fields
     * @return list<array{row: int, cells: array<string, string>}>
     */
    private function collectRows(array $rows, array $fields, string $kind, string $missingHeaderMessage): array
    {
        $headerRowIndex = null;
        $headerRow = [];

        foreach ($rows as $index => $row) {
            if ($this->rowIsBlank($row)) {
                continue;
            }

            $headerRowIndex = $index;
            $headerRow = $row;

            break;
        }

        if ($headerRowIndex === null) {
            if ($kind === 'variant') {
                return [];
            }

            throw new RuntimeException($missingHeaderMessage);
        }

        $map = $this->mapHeader($headerRow, $fields);

        if ($map === []) {
            if ($kind === 'variant') {
                return [];
            }

            throw new RuntimeException($missingHeaderMessage);
        }

        $parsed = [];

        foreach ($rows as $index => $row) {
            if ($index <= $headerRowIndex || $this->rowIsBlank($row)) {
                continue;
            }

            if (count($parsed) >= self::MAX_ROWS) {
                throw new RuntimeException(
                    'تعداد ردیف‌های فایل بیش از حد مجاز است (حداکثر '.self::MAX_ROWS.' ردیف در هر بار).'
                );
            }

            $cells = [];

            foreach ($map as $column => $field) {
                $value = trim((string) ($row[$column] ?? ''));

                if ($value !== '') {
                    $cells[$field] = $value;
                }
            }

            $parsed[] = [
                'row' => (int) $index,
                'cells' => $cells,
            ];
        }

        return $parsed;
    }

    /**
     * @param  array<int, string>  $headerRow
     * @param  array<string, list<string>>  $fields
     * @return array<int, string> شماره ستون => نام فیلد
     */
    private function mapHeader(array $headerRow, array $fields): array
    {
        // طولانی‌ترین نام‌های جایگزین اول بررسی می‌شوند تا «کد تنوع» قبل از
        // «کد» تطبیق داده شود.
        $aliases = [];

        foreach ($fields as $field => $names) {
            foreach ($names as $alias) {
                $aliases[ImportText::key($alias)] = [$field, mb_strlen($alias)];
            }
        }

        uksort($aliases, static fn ($a, $b) => $aliases[$b][1] <=> $aliases[$a][1]);

        $map = [];
        $used = [];

        foreach ($headerRow as $column => $title) {
            $folded = ImportText::key((string) $title);

            if ($folded === '') {
                continue;
            }

            foreach ($aliases as $alias => [$field, $length]) {
                if ($alias === $folded && ! in_array($field, $used, true)) {
                    $map[$column] = $field;
                    $used[] = $field;

                    break;
                }
            }
        }

        return $map;
    }

    private function rowIsBlank(array $row): bool
    {
        foreach ($row as $value) {
            if (trim((string) $value) !== '') {
                return false;
            }
        }

        return true;
    }

    /**
     * اعتبارسنجی ردیف‌های محصول و تعیین اینکه هر ردیف «ایجاد» است یا «ویرایش».
     *
     * @param  list<array{row: int, cells: array<string, string>}>  $parsed
     * @return list<array<string, mixed>>
     */
    private function analyzeProductRows(array $parsed, bool $createMissing, bool $updateExisting): array
    {
        $categories = $this->categoryMap();
        $brands = $this->brandMap();
        $skus = Product::query()->pluck('id', 'sku');
        $seen = [];
        $rows = [];

        foreach ($parsed as $entry) {
            $cells = $entry['cells'];
            $messages = [];
            $status = 'ok';

            $name = ImportText::text($cells['name'] ?? '');
            $sku = ImportText::text($cells['sku'] ?? '');
            $categoryName = ImportText::text($cells['category'] ?? '');
            $brandName = ImportText::text($cells['brand'] ?? '');

            if ($name === '') {
                $messages[] = 'نام محصول خالی است.';
                $status = 'error';
            }

            if ($sku === '') {
                $messages[] = 'کد محصول (SKU) خالی است.';
                $status = 'error';
            } elseif (isset($seen[$sku])) {
                $messages[] = "کد محصول در ردیف {$seen[$sku]} فایل تکرار شده است.";
                $status = 'error';
            } else {
                $seen[$sku] = $entry['row'];
            }

            $data = [
                'name' => $name,
                'sku' => $sku,
            ];

            foreach (array_keys(self::NUMERIC_FIELDS) as $field) {
                if (! array_key_exists($field, $cells)) {
                    continue;
                }

                $number = ImportText::number($cells[$field]);

                if ($number === null) {
                    $messages[] = 'مقدار ستون «'.$this->fieldLabel($field).'» عدد معتبری نیست.';
                    $status = 'error';

                    continue;
                }

                $data[$field] = $number;
            }

            foreach (self::TEXT_FIELDS as $field) {
                if (array_key_exists($field, $cells)) {
                    $data[$field] = ImportText::text($cells[$field]);
                }
            }

            if (! array_key_exists('price', $data)) {
                $messages[] = 'قیمت محصول خالی یا نامعتبر است.';
                $status = 'error';
            }

            foreach (self::BOOLEAN_FIELDS as $field) {
                if (array_key_exists($field, $cells)) {
                    $data[$field] = ImportText::boolean($cells[$field], true);
                }
            }

            if ($categoryName === '') {
                $messages[] = 'دسته‌بندی خالی است.';
                $status = 'error';
            } elseif (isset($categories[ImportText::key($categoryName)])) {
                $data['category_id'] = $categories[ImportText::key($categoryName)];
            } elseif ($createMissing) {
                $messages[] = "دسته‌بندی «{$categoryName}» جدید ساخته می‌شود.";
            } else {
                $messages[] = "دسته‌بندی «{$categoryName}» پیدا نشد.";
                $status = 'error';
            }

            if ($brandName !== '' && ! isset($brands[ImportText::key($brandName)])) {
                if ($createMissing) {
                    $messages[] = "برند «{$brandName}» جدید ساخته می‌شود.";
                } else {
                    $messages[] = "برند «{$brandName}» پیدا نشد.";
                    $status = 'error';
                }
            } elseif ($brandName !== '') {
                $data['brand_id'] = $brands[ImportText::key($brandName)];
            }

            $existing = $sku !== '' ? ($skus[$sku] ?? null) : null;
            $action = 'create';

            if ($existing !== null) {
                $action = $updateExisting ? 'update' : 'skip';

                if (! $updateExisting) {
                    $messages[] = 'محصول موجود به‌روزرسانی نشد (به‌روزرسانی غیرفعال است).';
                }
            }

            $rows[] = [
                'row' => $entry['row'],
                'kind' => 'product',
                'sku' => $sku,
                'name' => $name,
                'action' => $action,
                'status' => $status,
                'messages' => $messages,
                'data' => $data,
                'category_name' => $categoryName,
                'brand_name' => $brandName,
            ];
        }

        return $rows;
    }

    /**
     * @param  list<array{row: int, cells: array<string, string>}>  $parsed
     * @return list<array<string, mixed>>
     */
    private function analyzeVariantRows(array $parsed, bool $updateExisting): array
    {
        if ($parsed === []) {
            return [];
        }

        $variantSkus = ProductVariant::query()->pluck('id', 'sku');
        $seen = [];
        $rows = [];

        foreach ($parsed as $entry) {
            $cells = $entry['cells'];
            $messages = [];
            $status = 'ok';

            $productSku = ImportText::text($cells['product_sku'] ?? '');
            $sku = ImportText::text($cells['sku'] ?? '');
            $name = ImportText::text($cells['name'] ?? '');
            $size = ImportText::text($cells['size'] ?? '');

            if ($productSku === '') {
                $messages[] = 'کد محصول برای تنوع خالی است.';
                $status = 'error';
            }

            if ($sku === '') {
                $messages[] = 'کد تنوع (SKU) خالی است.';
                $status = 'error';
            } elseif (isset($seen[$sku])) {
                $messages[] = "کد تنوع در ردیف {$seen[$sku]} فایل تکرار شده است.";
                $status = 'error';
            } else {
                $seen[$sku] = $entry['row'];
            }

            if ($name === '' && $size !== '') {
                $name = $size;
                $messages[] = 'نام تنوع از ستون سایز گرفته شد.';
            }

            if ($name === '') {
                $messages[] = 'نام تنوع خالی است.';
                $status = 'error';
            }

            $data = [
                'sku' => $sku,
                'name' => $name,
            ];

            if ($size !== '') {
                $data['size'] = $size;
            }

            foreach (['price', 'compare_price', 'stock'] as $field) {
                if (! array_key_exists($field, $cells)) {
                    continue;
                }

                $number = ImportText::number($cells[$field]);

                if ($number === null) {
                    $messages[] = 'مقدار ستون «'.$this->fieldLabel($field).'» عدد معتبری نیست.';
                    $status = 'error';

                    continue;
                }

                $data[$field] = $number;
            }

            if (array_key_exists('is_active', $cells)) {
                $data['is_active'] = ImportText::boolean($cells['is_active'], true);
            }

            $rows[] = [
                'row' => $entry['row'],
                'kind' => 'variant',
                'sku' => $sku,
                'name' => $name,
                'product_sku' => $productSku,
                'action' => isset($variantSkus[$sku])
                    ? ($updateExisting ? 'update' : 'skip')
                    : 'create',
                'status' => $status,
                'messages' => $messages,
                'data' => $data,
            ];
        }

        return $rows;
    }

    /**
     * @return array<string, int> نام یا شناسهٔ یکتاشدهٔ دسته => شناسه
     */
    private function categoryMap(): array
    {
        $map = [];

        foreach (Category::query()->get(['id', 'name', 'slug']) as $category) {
            $map[ImportText::key($category->name)] = $category->id;
            $map[ImportText::key($category->slug)] = $category->id;
        }

        return $map;
    }

    /**
     * @return array<string, int>
     */
    private function brandMap(): array
    {
        $map = [];

        foreach (Brand::query()->get(['id', 'name', 'slug']) as $brand) {
            $map[ImportText::key($brand->name)] = $brand->id;
            $map[ImportText::key($brand->slug)] = $brand->id;
        }

        return $map;
    }

    /**
     * نوشتن داده‌ها در دیتابیس داخل یک تراکنش.
     *
     * @param  list<array<string, mixed>>  $products
     * @param  list<array<string, mixed>>  $variants
     * @return array{summary: array<string, int>, rows: list<array<string, mixed>>}
     */
    private function apply(array $products, array $variants, bool $createMissing): array
    {
        return DB::transaction(function () use ($products, $variants, $createMissing) {
            $categoryIds = $this->categoryMap();
            $brandIds = $this->brandMap();
            $newCategoryCount = 0;
            $newBrandCount = 0;

            foreach ($products as $index => $row) {
                if ($row['status'] !== 'ok') {
                    continue;
                }

                $categoryKey = ImportText::key((string) $row['category_name']);

                if (! isset($categoryIds[$categoryKey])) {
                    if (! $createMissing) {
                        $products[$index]['status'] = 'error';
                        $products[$index]['messages'][] = 'دسته‌بندی پیدا نشد.';

                        continue;
                    }

                    $category = Category::create([
                        'name' => $row['category_name'],
                        'slug' => $this->uniqueTaxonomySlug(Category::class, (string) $row['category_name'], 'category'),
                        'is_active' => true,
                    ]);

                    $categoryIds[$categoryKey] = $category->id;
                    $products[$index]['messages'][] = "دسته‌بندی «{$row['category_name']}» ساخته شد.";
                    $newCategoryCount++;
                }

                $products[$index]['data']['category_id'] = $categoryIds[$categoryKey];

                $brandName = (string) ($row['brand_name'] ?? '');

                if ($brandName === '') {
                    continue;
                }

                $brandKey = ImportText::key($brandName);

                if (isset($brandIds[$brandKey])) {
                    $products[$index]['data']['brand_id'] = $brandIds[$brandKey];

                    continue;
                }

                if (! $createMissing) {
                    $products[$index]['status'] = 'error';
                    $products[$index]['messages'][] = 'برند پیدا نشد.';

                    continue;
                }

                $brand = Brand::create([
                    'name' => $brandName,
                    'slug' => $this->uniqueTaxonomySlug(Brand::class, $brandName, 'brand'),
                    'is_active' => true,
                ]);

                $brandIds[$brandKey] = $brand->id;
                $products[$index]['data']['brand_id'] = $brand->id;
                $products[$index]['messages'][] = "برند «{$brandName}» ساخته شد.";
                $newBrandCount++;
            }

            foreach ($products as $index => $row) {
                if ($row['status'] !== 'ok' || $row['action'] === 'skip') {
                    continue;
                }

                $data = $row['data'];

                $product = Product::query()
                    ->where('sku', $data['sku'])
                    ->lockForUpdate()
                    ->first();

                if ($product !== null) {
                    $product->fill($data);
                    $product->save();
                    $products[$index]['action'] = 'update';

                    continue;
                }

                $data['slug'] = $this->uniqueProductSlug((string) $data['name']);
                $data['stock'] = $data['stock'] ?? 0;
                $data['is_active'] = $data['is_active'] ?? true;
                $data['is_featured'] = $data['is_featured'] ?? false;
                $data['is_new'] = $data['is_new'] ?? false;
                $data['is_taxable'] = $data['is_taxable'] ?? false;
                $data['is_returnable'] = $data['is_returnable'] ?? true;

                Product::create($data);
                $products[$index]['action'] = 'create';
            }

            $productIds = Product::query()->pluck('id', 'sku');

            foreach ($variants as $index => $row) {
                if ($row['status'] !== 'ok' || $row['action'] === 'skip') {
                    continue;
                }

                $productId = $productIds[$row['product_sku']] ?? null;

                if ($productId === null) {
                    $variants[$index]['status'] = 'error';
                    $variants[$index]['messages'][] = "محصول با کد «{$row['product_sku']}» پیدا نشد.";

                    continue;
                }

                $data = $row['data'];

                $variant = ProductVariant::query()
                    ->where('sku', $data['sku'])
                    ->lockForUpdate()
                    ->first();

                if ($variant !== null) {
                    $variant->fill($data);
                    $variant->save();
                    $variants[$index]['action'] = 'update';

                    continue;
                }

                $data['product_id'] = $productId;
                $data['stock'] = $data['stock'] ?? 0;
                $data['is_active'] = $data['is_active'] ?? true;

                ProductVariant::create($data);
                $variants[$index]['action'] = 'create';
            }

            return [
                'summary' => $this->summarize($products, $variants, $newCategoryCount, $newBrandCount),
                'rows' => array_values(array_merge($products, $variants)),
            ];
        });
    }

    /**
     * @param  list<array<string, mixed>>  $products
     * @param  list<array<string, mixed>>  $variants
     * @return array<string, int>
     */
    private function summarize(array $products, array $variants, int $newCategories, int $newBrands): array
    {
        $summary = [
            'products_total' => count($products),
            'products_create' => 0,
            'products_update' => 0,
            'products_skipped' => 0,
            'products_failed' => 0,
            'variants_total' => count($variants),
            'variants_create' => 0,
            'variants_update' => 0,
            'variants_failed' => 0,
            'new_categories' => $newCategories,
            'new_brands' => $newBrands,
            'errors' => 0,
        ];

        foreach ($products as $row) {
            if ($row['status'] === 'error') {
                $summary['products_failed']++;
                $summary['errors']++;

                continue;
            }

            if ($row['action'] === 'create') {
                $summary['products_create']++;
            } elseif ($row['action'] === 'update') {
                $summary['products_update']++;
            } else {
                $summary['products_skipped']++;
            }
        }

        foreach ($variants as $row) {
            if ($row['status'] === 'error') {
                $summary['variants_failed']++;
                $summary['errors']++;

                continue;
            }

            if ($row['action'] === 'create') {
                $summary['variants_create']++;
            } elseif ($row['action'] === 'update') {
                $summary['variants_update']++;
            }
        }

        return $summary;
    }

    /**
     * برچسب فارسی فیلدها برای پیام خطای ردیف.
     */
    private function fieldLabel(string $field): string
    {
        return match ($field) {
            'price' => 'قیمت',
            'compare_price' => 'قیمت قبل از تخفیف',
            'discount_percent' => 'درصد تخفیف',
            'stock' => 'موجودی',
            'weight' => 'وزن',
            default => $field,
        };
    }

    private function uniqueProductSlug(string $name): string
    {
        $slug = Str::slug($name);

        if ($slug === '') {
            $slug = 'product';
        }

        $base = $slug;
        $counter = 1;

        while (Product::query()->where('slug', $slug)->exists()) {
            $slug = $base.'-'.$counter;
            $counter++;
        }

        return $slug;
    }

    /**
     * @param  class-string<Category|Brand>  $model
     */
    private function uniqueTaxonomySlug(string $model, string $name, string $prefix): string
    {
        $slug = Str::slug($name);

        if ($slug === '') {
            $slug = $prefix.'-'.Str::lower(Str::random(8));
        }

        $base = $slug;
        $counter = 1;

        while ($model::query()->where('slug', $slug)->exists()) {
            $slug = $base.'-'.$counter;
            $counter++;
        }

        return $slug;
    }
}
