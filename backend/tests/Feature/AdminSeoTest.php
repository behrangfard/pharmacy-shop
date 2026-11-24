<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Page;
use App\Models\Product;
use App\Models\Redirect;
use App\Models\User;
use App\Support\AdminRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminSeoTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsAdmin(?string $role = null): User
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'admin_role' => $role ?? AdminRole::SUPER_ADMIN,
        ]);

        Sanctum::actingAs($admin);

        return $admin;
    }

    private function makeProduct(string $name, array $attributes = []): Product
    {
        $category = Category::query()->firstOrCreate(
            ['slug' => 'seo-test-category'],
            ['name' => 'دستهٔ تست سئو', 'is_active' => true, 'sort_order' => 0]
        );

        return Product::query()->create($attributes + [
            'category_id' => $category->id,
            'name' => $name,
            'slug' => 'seo-test-' . uniqid(),
            'sku' => 'SEO-' . uniqid(),
            'price' => 100000,
            'stock' => 5,
            'is_active' => true,
        ]);
    }

    public function test_audit_flags_products_without_meta(): void
    {
        $this->actingAsAdmin();
        $this->makeProduct('پیراهن بدون متا');

        $response = $this->getJson('/api/v1/admin/seo/audit?type=product');

        $response->assertOk()
            ->assertJsonPath('data.thresholds.title_max', 60)
            ->assertJsonPath('data.thresholds.description_max', 160)
            ->assertJsonPath('data.meta.total', 1)
            ->assertJsonPath('data.rows.0.type', 'product')
            ->assertJsonPath('data.rows.0.title', 'پیراهن بدون متا')
            ->assertJsonPath(
                'data.rows.0.issues',
                ['missing_title', 'missing_description']
            )
            ->assertJsonPath('data.rows.0.edit_path', '/admin/products/1/edit');

        $this->assertSame(1, $response->json('data.summary.0.with_issues'));
        $this->assertSame(0, $response->json('data.summary.0.ok_count'));
        $this->assertSame(1, $response->json('data.sitemap.products'));
    }

    public function test_audit_returns_no_rows_for_complete_meta(): void
    {
        $this->actingAsAdmin();

        $this->makeProduct('پیراهن کامل', [
            'meta_title' => 'پیراهن نخی زنانه با قیمت مناسب',
            'meta_description' => str_repeat('توضیح کامل سئو ', 5),
        ]);

        $this->getJson('/api/v1/admin/seo/audit?type=product')
            ->assertOk()
            ->assertJsonPath('data.meta.total', 0)
            ->assertJsonCount(0, 'data.rows')
            ->assertJsonPath('data.summary.0.ok_count', 1);
    }

    public function test_audit_flags_long_and_duplicate_titles(): void
    {
        $this->actingAsAdmin();

        $long = $this->makeProduct('محصول با عنوان بلند', [
            'meta_title' => str_repeat('ا', 61),
            'meta_description' => str_repeat('ب', 161),
        ]);

        $first = $this->makeProduct('محصول اول', [
            'meta_title' => 'عنوان تکراری سئو',
        ]);

        $second = $this->makeProduct('محصول دوم', [
            'meta_title' => 'عنوان تکراری سئو',
        ]);

        $rows = collect(
            $this->getJson('/api/v1/admin/seo/audit?type=product')->json('data.rows')
        );

        $longRow = $rows->firstWhere('title', $long->name);

        $this->assertContains('long_title', $longRow['issues']);
        $this->assertContains('long_description', $longRow['issues']);

        foreach ([$first, $second] as $product) {
            $row = $rows->firstWhere('title', $product->name);

            $this->assertContains('duplicate_title', $row['issues']);
            $this->assertContains('missing_description', $row['issues']);
        }
    }

    public function test_audit_includes_published_pages(): void
    {
        $this->actingAsAdmin();

        Page::query()->create([
            'title' => 'درباره ما',
            'slug' => 'about-us-test',
            'content' => 'متن آزمایشی صفحه',
            'is_published' => true,
        ]);

        $this->getJson('/api/v1/admin/seo/audit?type=page')
            ->assertOk()
            ->assertJsonPath('data.rows.0.type', 'page')
            ->assertJsonPath('data.rows.0.title', 'درباره ما')
            ->assertJsonPath('data.rows.0.public_path', '/pages/about-us-test')
            ->assertJsonPath('data.rows.0.edit_path', '/admin/content');
    }

    public function test_admin_can_create_redirect_with_normalized_paths(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/v1/admin/redirects', [
            'from_path' => 'old-product/?utm=1',
            'to_path' => 'product/new-product',
            'is_active' => true,
        ])
            ->assertCreated()
            ->assertJsonPath('data.from_path', '/old-product')
            ->assertJsonPath('data.to_path', '/product/new-product')
            ->assertJsonPath('data.is_active', true);

        $this->assertDatabaseHas('redirects', [
            'from_path' => '/old-product',
            'hits' => 0,
        ]);
    }

    public function test_redirect_validation_rejects_bad_values(): void
    {
        $this->actingAsAdmin();

        Redirect::query()->create([
            'from_path' => '/old',
            'to_path' => '/new',
        ]);

        $this->postJson('/api/v1/admin/redirects', [
            'from_path' => 'old/',
            'to_path' => '/other',
        ])->assertStatus(422)->assertJsonValidationErrors('from_path');

        $this->postJson('/api/v1/admin/redirects', [
            'from_path' => '/same',
            'to_path' => 'same/',
        ])->assertStatus(422)->assertJsonValidationErrors('to_path');

        $this->postJson('/api/v1/admin/redirects', [
            'from_path' => '/',
            'to_path' => '/home',
        ])->assertStatus(422)->assertJsonValidationErrors('from_path');

        $this->postJson('/api/v1/admin/redirects', [
            'from_path' => 'https://example.com/old',
            'to_path' => '/new',
        ])->assertStatus(422)->assertJsonValidationErrors('from_path');
    }

    public function test_admin_can_update_and_delete_redirect(): void
    {
        $this->actingAsAdmin();

        $redirect = Redirect::query()->create([
            'from_path' => '/old-path',
            'to_path' => '/new-path',
        ]);

        $this->putJson("/api/v1/admin/redirects/{$redirect->id}", [
            'from_path' => '/old-path',
            'to_path' => '/newer-path',
            'is_active' => false,
        ])
            ->assertOk()
            ->assertJsonPath('data.to_path', '/newer-path')
            ->assertJsonPath('data.is_active', false);

        $this->deleteJson("/api/v1/admin/redirects/{$redirect->id}")->assertOk();

        $this->assertDatabaseMissing('redirects', ['id' => $redirect->id]);
    }

    public function test_public_redirects_exclude_inactive_and_cache_refreshes(): void
    {
        Redirect::query()->create([
            'from_path' => '/active',
            'to_path' => '/target',
            'is_active' => true,
        ]);

        Redirect::query()->create([
            'from_path' => '/inactive',
            'to_path' => '/target',
            'is_active' => false,
        ]);

        $this->getJson('/api/v1/seo/redirects')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.from', '/active');

        $this->actingAsAdmin();

        $this->postJson('/api/v1/admin/redirects', [
            'from_path' => '/fresh',
            'to_path' => '/target',
        ])->assertCreated();

        // کش قبلی باید پاک شده باشد و ریدایرکت تازه دیده شود.
        $this->getJson('/api/v1/seo/redirects')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_hit_endpoint_counts_redirect_usage(): void
    {
        $redirect = Redirect::query()->create([
            'from_path' => '/old',
            'to_path' => '/new',
            'is_active' => true,
        ]);

        $this->postJson('/api/v1/seo/redirects/hit', ['path' => 'old/'])
            ->assertOk();

        $this->assertSame(1, $redirect->fresh()->hits);

        $this->postJson('/api/v1/seo/redirects/hit', ['path' => '/missing'])
            ->assertNotFound();
    }

    public function test_seo_panel_requires_permission(): void
    {
        $this->actingAsAdmin(AdminRole::SUPPORT);

        $this->getJson('/api/v1/admin/seo/audit')
            ->assertForbidden()
            ->assertJsonPath('required_permission', AdminRole::SEO_MANAGE);

        $this->getJson('/api/v1/admin/redirects')->assertForbidden();

        $this->postJson('/api/v1/admin/redirects', [
            'from_path' => '/x',
            'to_path' => '/y',
        ])->assertForbidden();
    }

    public function test_product_manager_can_use_seo_panel(): void
    {
        $this->actingAsAdmin(AdminRole::PRODUCT_MANAGER);

        $this->getJson('/api/v1/admin/seo/audit')->assertOk();
        $this->getJson('/api/v1/admin/redirects')->assertOk();
    }

    public function test_guest_cannot_use_seo_admin_routes(): void
    {
        $this->getJson('/api/v1/admin/redirects')->assertUnauthorized();
        $this->getJson('/api/v1/admin/seo/audit')->assertUnauthorized();
    }
}
