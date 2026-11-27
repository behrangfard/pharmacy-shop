<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Article;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Page;
use App\Models\Product;
use App\Models\Redirect;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * بخش «سلامت سئو» در پنل مدیریت.
 *
 * دو کار انجام می‌دهد و عمداً فرم متای تکراری نمی‌سازد:
 *
 * 1. ممیزی متا: بین محصولات، دسته‌بندی‌ها، برندها و صفحه‌های ثابت می‌گردد و
 *    مواردی را نشان می‌دهد که عنوان/توضیح سئو ندارند، بیش از حد بلند هستند
 *    یا عنوانشان تکراری است. هر ردیف `edit_path` همان بخش موجود را برمی‌گرداند.
 * 2. مدیریت ریدایرکت‌های ۳۰۱: وقتی اسلاگ عوض می‌شود، مسیر قدیمی باید به
 *    مسیر جدید برود؛ قاعدهٔ پروژه بدون این جدول تغییر اسلاگ را ممنوع کرده بود.
 *
 * sitemap همچنان در زمان build ساخته می‌شود (سایت SPA روی هاست استاتیک
 * منتشر می‌شود)؛ در پاسخ ممیزی فقط شمارش آدرس‌هایی می‌آید که در آن فایل
 * قرار می‌گیرند، تا مدیر بداند چیزی جا نمانده است.
 */
class AdminSeoController extends Controller
{
    public const REDIRECTS_CACHE_KEY = 'storefront.redirects.index.v1';

    /** سقف پیشنهادی طول عنوان متا (کاراکتر). */
    private const META_TITLE_MAX = 60;

    /** سقف پیشنهادی طول توضیح متا (کاراکتر). */
    private const META_DESCRIPTION_MAX = 160;

    private const AUDIT_PER_PAGE = 50;

    /**
     * گزارش سلامت متا با شمارش خلاصه و ردیف‌های مشکل‌دار.
     */
    public function audit(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => ['nullable', Rule::in(['product', 'category', 'brand', 'page'])],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $selectedType = $validated['type'] ?? null;
        $summary = [];
        $rows = [];

        foreach ($this->auditSources() as $type => $source) {
            $items = ($source['items'])();
            $duplicates = $this->duplicateTitles($items);
            $typeRows = [];

            foreach ($items as $item) {
                $issues = $this->issuesFor($item, $duplicates);

                if ($issues === []) {
                    continue;
                }

                $item['issues'] = $issues;
                $typeRows[] = $item;
            }

            $summary[] = [
                'type' => $type,
                'label' => $source['label'],
                'total' => count($items),
                'with_issues' => count($typeRows),
                'ok_count' => count($items) - count($typeRows),
                'missing_title' => $this->countIssue($typeRows, 'missing_title'),
                'missing_description' => $this->countIssue($typeRows, 'missing_description'),
                'long_title' => $this->countIssue($typeRows, 'long_title'),
                'long_description' => $this->countIssue($typeRows, 'long_description'),
                'duplicate_title' => $this->countIssue($typeRows, 'duplicate_title'),
            ];

            if ($selectedType === null || $selectedType === $type) {
                array_push($rows, ...$typeRows);
            }
        }

        // ردیف‌های مشکل‌دارتر اول می‌آیند تا اولین صفحه مهم‌ترین‌ها را نشان دهد.
        usort($rows, function (array $first, array $second): int {
            $byIssueCount = count($second['issues']) <=> count($first['issues']);

            return $byIssueCount !== 0
                ? $byIssueCount
                : strcmp($first['title'], $second['title']);
        });

        $perPage = (int) ($validated['per_page'] ?? self::AUDIT_PER_PAGE);
        $total = count($rows);
        $lastPage = max(1, (int) ceil($total / $perPage));
        $page = min((int) ($validated['page'] ?? 1), $lastPage);

        return response()->json([
            'success' => true,
            'data' => [
                'thresholds' => [
                    'title_max' => self::META_TITLE_MAX,
                    'description_max' => self::META_DESCRIPTION_MAX,
                ],
                'summary' => $summary,
                'sitemap' => $this->sitemapStatus(),
                'rows' => array_slice($rows, ($page - 1) * $perPage, $perPage),
                'meta' => [
                    'total' => $total,
                    'per_page' => $perPage,
                    'current_page' => $page,
                    'last_page' => $lastPage,
                ],
            ],
        ]);
    }

    /**
     * فهرست ریدایرکت‌ها برای پنل (بدون صفحه‌بندی؛ تعدادشان معمولاً کم است).
     */
    public function index(): JsonResponse
    {
        $redirects = Redirect::query()
            ->orderByDesc('is_active')
            ->orderBy('from_path')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $redirects,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validateRedirect($request);

        $redirect = Redirect::create($validated);

        $this->forgetRedirectsCache();

        return response()->json([
            'success' => true,
            'message' => 'ریدایرکت ثبت شد؛ از این پس مسیر قدیمی به مقصد جدید می‌رود.',
            'data' => $redirect,
        ], 201);
    }

    public function update(Request $request, Redirect $redirect): JsonResponse
    {
        $validated = $this->validateRedirect($request, $redirect);

        $redirect->update($validated);

        $this->forgetRedirectsCache();

        return response()->json([
            'success' => true,
            'message' => 'ریدایرکت ویرایش شد.',
            'data' => $redirect->fresh(),
        ]);
    }

    public function destroy(Redirect $redirect): JsonResponse
    {
        $redirect->delete();

        $this->forgetRedirectsCache();

        return response()->json([
            'success' => true,
            'message' => 'ریدایرکت حذف شد.',
        ]);
    }

    /**
     * اعتبارسنجی و یکدست‌سازی ریدایرکت.
     *
     * @return array{from_path: string, to_path: string, is_active: bool}
     */
    private function validateRedirect(Request $request, ?Redirect $redirect = null): array
    {
        $validated = $request->validate([
            'from_path' => ['required', 'string', 'max:255'],
            'to_path' => ['required', 'string', 'max:2048'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $from = Redirect::normalizePath($validated['from_path']);
        $to = trim($validated['to_path']);
        $isExternal = (bool) preg_match('#^https?://#i', $to);

        if (! $isExternal) {
            $to = Redirect::normalizePath($to);
        }

        if ($from === '/') {
            throw ValidationException::withMessages([
                'from_path' => 'مسیر مبدأ نمی‌تواند صفحهٔ اصلی سایت باشد.',
            ]);
        }

        if (str_contains($from, '://')) {
            throw ValidationException::withMessages([
                'from_path' => 'مسیر مبدأ باید مسیر داخلی سایت باشد (مثل /product/old-slug)، نه نشانی کامل.',
            ]);
        }

        if (! $isExternal && $from === $to) {
            throw ValidationException::withMessages([
                'to_path' => 'مسیر مقصد نباید با مسیر مبدأ یکسان باشد.',
            ]);
        }

        $duplicate = Redirect::query()
            ->where('from_path', $from)
            ->when(
                $redirect !== null,
                fn ($query) => $query->whereKeyNot($redirect->getKey())
            )
            ->exists();

        if ($duplicate) {
            throw ValidationException::withMessages([
                'from_path' => 'برای این مسیر قبلاً ریدایرکت ثبت شده است.',
            ]);
        }

        return [
            'from_path' => $from,
            'to_path' => $to,
            'is_active' => (bool) ($validated['is_active'] ?? true),
        ];
    }

    /**
     * منابع ممیزی متا؛ هر منبع فقط صفحات عمومی و قابل ایندکس را می‌آورد.
     *
     * @return array<string, array{label: string, items: callable(): list<array<string, mixed>>}>
     */
    private function auditSources(): array
    {
        return [
            'product' => [
                'label' => 'محصولات',
                'items' => fn (): array => Product::query()
                    ->where('is_active', true)
                    ->orderBy('name')
                    ->get(['id', 'name', 'slug', 'meta_title', 'meta_description'])
                    ->map(fn (Product $product): array => [
                        'type' => 'product',
                        'id' => $product->id,
                        'title' => (string) $product->name,
                        'slug' => (string) $product->slug,
                        'meta_title' => $product->meta_title,
                        'meta_description' => $product->meta_description,
                        'public_path' => '/product/' . $product->slug,
                        'edit_path' => '/admin/products/' . $product->id . '/edit',
                    ])
                    ->all(),
            ],

            'category' => [
                'label' => 'دسته‌بندی‌ها',
                'items' => fn (): array => Category::query()
                    ->where('is_active', true)
                    ->orderBy('name')
                    ->get(['id', 'name', 'slug', 'meta_title', 'meta_description'])
                    ->map(fn (Category $category): array => [
                        'type' => 'category',
                        'id' => $category->id,
                        'title' => (string) $category->name,
                        'slug' => (string) $category->slug,
                        'meta_title' => $category->meta_title,
                        'meta_description' => $category->meta_description,
                        'public_path' => '/products?category=' . $category->slug,
                        'edit_path' => '/admin/categories',
                    ])
                    ->all(),
            ],

            'brand' => [
                'label' => 'برندها',
                'items' => fn (): array => Brand::query()
                    ->where('is_active', true)
                    ->orderBy('name')
                    ->get(['id', 'name', 'slug', 'meta_title', 'meta_description'])
                    ->map(fn (Brand $brand): array => [
                        'type' => 'brand',
                        'id' => $brand->id,
                        'title' => (string) $brand->name,
                        'slug' => (string) $brand->slug,
                        'meta_title' => $brand->meta_title,
                        'meta_description' => $brand->meta_description,
                        'public_path' => '/products?brand=' . $brand->slug,
                        'edit_path' => '/admin/brands',
                    ])
                    ->all(),
            ],

            'page' => [
                'label' => 'صفحه‌های ثابت',
                'items' => fn (): array => Page::query()
                    ->published()
                    ->orderBy('title')
                    ->get(['id', 'title', 'slug', 'seo_title', 'seo_description'])
                    ->map(fn (Page $page): array => [
                        'type' => 'page',
                        'id' => $page->id,
                        'title' => (string) $page->title,
                        'slug' => (string) $page->slug,
                        'meta_title' => $page->seo_title,
                        'meta_description' => $page->seo_description,
                        'public_path' => '/pages/' . $page->slug,
                        'edit_path' => '/admin/content',
                    ])
                    ->all(),
            ],
        ];
    }

    /**
     * عنوان‌هایی که در یک نوع محتوا بیش از یک بار استفاده شده‌اند.
     *
     * @param  list<array<string, mixed>>  $items
     * @return array<string, int>
     */
    private function duplicateTitles(array $items): array
    {
        $counts = [];

        foreach ($items as $item) {
            $key = $this->titleKey($item['meta_title'] ?? null);

            if ($key === '') {
                continue;
            }

            $counts[$key] = ($counts[$key] ?? 0) + 1;
        }

        return array_filter($counts, fn (int $count): bool => $count > 1);
    }

    private function titleKey(?string $title): string
    {
        $normalized = preg_replace('/\s+/u', ' ', trim((string) $title)) ?? '';

        return mb_strtolower($normalized);
    }

    /**
     * @param  array<string, mixed>  $item
     * @param  array<string, int>  $duplicates
     * @return list<string>
     */
    private function issuesFor(array $item, array $duplicates): array
    {
        $issues = [];
        $title = trim((string) ($item['meta_title'] ?? ''));
        $description = trim((string) ($item['meta_description'] ?? ''));

        if ($title === '') {
            $issues[] = 'missing_title';
        } elseif (mb_strlen($title) > self::META_TITLE_MAX) {
            $issues[] = 'long_title';
        }

        if ($description === '') {
            $issues[] = 'missing_description';
        } elseif (mb_strlen($description) > self::META_DESCRIPTION_MAX) {
            $issues[] = 'long_description';
        }

        $key = $this->titleKey($title);

        if ($key !== '' && isset($duplicates[$key])) {
            $issues[] = 'duplicate_title';
        }

        return $issues;
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     */
    private function countIssue(array $rows, string $issue): int
    {
        return count(array_filter(
            $rows,
            fn (array $row): bool => in_array($issue, $row['issues'], true)
        ));
    }

    /**
     * شمارش آدرس‌هایی که اسکریپت build در sitemap.xml می‌گذارد.
     *
     * @return array<string, mixed>
     */
    private function sitemapStatus(): array
    {
        // کالاهای ویژهٔ ۱۸+ در sitemap نمی‌آیند؛ پس در این شمارش هم نیستند.
        $products = Product::query()
            ->where('is_active', true)
            ->where('is_adult', false)
            ->count();
        $categories = Category::query()->where('is_active', true)->count();
        $articles = Article::query()->published()->count();
        $pages = Page::query()->published()->count();

        // ۴ صفحهٔ ثابت اسکریپت build: خانه، محصولات، مقالات و راهنمای سایز.
        $staticPages = 4;

        return [
            'note' => 'فایل‌های sitemap.xml و robots.txt هنگام build ساخته می‌شوند (npm run build یا npm run sitemap) و به VITE_SITE_URL نیاز دارند.',
            'products' => $products,
            'categories' => $categories,
            'articles' => $articles,
            'pages' => $pages,
            'static_pages' => $staticPages,
            'total' => $products + $categories + $articles + $pages + $staticPages,
        ];
    }

    private function forgetRedirectsCache(): void
    {
        Cache::forget(self::REDIRECTS_CACHE_KEY);
    }
}
