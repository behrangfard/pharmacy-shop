<?php

namespace Tests\Feature;

use App\Models\Article;
use App\Models\User;
use App\Support\AdminRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * بخش «مقالات» فروشگاه و مدیریت آن در پنل.
 */
class ArticleTest extends TestCase
{
    use RefreshDatabase;

    private function actingAdmin(?string $role = null): User
    {
        $admin = User::factory()->create([
            'name' => 'مدیر محتوا',
            'role' => 'admin',
            'admin_role' => $role,
        ]);

        Sanctum::actingAs($admin);

        return $admin;
    }

    public function test_admin_can_publish_article_and_it_appears_on_storefront(): void
    {
        $this->actingAdmin(AdminRole::SUPER_ADMIN);

        $response = $this->postJson('/api/v1/admin/articles', [
            'title' => 'چطور سایز مناسب را انتخاب کنیم؟',
            'content' => 'انتخاب سایز درست، مهم‌ترین قدم برای داشتن یک خرید راحت و بدون دردسر است.',
            'category' => 'راهنمای خرید',
            'is_published' => true,
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.title', 'چطور سایز مناسب را انتخاب کنیم؟')
            ->assertJsonPath('data.is_published', true)
            ->assertJsonPath('data.category', 'راهنمای خرید')
            ->assertJsonPath('data.author_name', 'مدیر محتوا');

        $slug = $response->json('data.slug');

        $this->assertNotEmpty($slug);
        $this->assertStringContainsString('انتخاب', $slug);
        $this->assertGreaterThanOrEqual(1, $response->json('data.reading_minutes'));
        $this->assertNotNull($response->json('data.published_at'));
        $this->assertNotEmpty($response->json('data.excerpt'));
        $this->assertDatabaseHas('articles', [
            'slug' => $slug,
            'is_published' => true,
        ]);

        $this->getJson('/api/v1/articles')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'چطور سایز مناسب را انتخاب کنیم؟')
            ->assertJsonPath('meta.total', 1);

        $this->getJson('/api/v1/articles/'.$slug)
            ->assertOk()
            ->assertJsonPath('data.slug', $slug)
            ->assertJsonPath('data.content', 'انتخاب سایز درست، مهم‌ترین قدم برای داشتن یک خرید راحت و بدون دردسر است.');
    }

    public function test_storefront_hides_drafts_and_scheduled_articles(): void
    {
        Article::query()->create([
            'title' => 'مقالهٔ منتشرشده',
            'content' => 'متن مقالهٔ منتشرشده برای نمایش در فروشگاه.',
            'is_published' => true,
        ]);

        $draft = Article::query()->create([
            'title' => 'پیش‌نویس',
            'content' => 'این متن نباید در فروشگاه دیده شود.',
            'is_published' => false,
        ]);

        $scheduled = Article::query()->create([
            'title' => 'انتشار زمان‌بندی‌شده',
            'content' => 'این مقاله فردا منتشر می‌شود.',
            'is_published' => true,
            'published_at' => now()->addDay(),
        ]);

        $this->getJson('/api/v1/articles')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'مقالهٔ منتشرشده');

        $this->getJson('/api/v1/articles/'.$draft->slug)->assertNotFound();
        $this->getJson('/api/v1/articles/'.$scheduled->slug)->assertNotFound();
    }

    public function test_storefront_can_filter_categories_and_return_related_articles(): void
    {
        $main = Article::query()->create([
            'title' => 'راهنمای جنس پارچه',
            'content' => 'پارچه مناسب برای استفاده روزانه را چطور انتخاب کنیم؟',
            'category' => 'راهنمای خرید',
            'is_published' => true,
        ]);

        Article::query()->create([
            'title' => 'شست‌وشوی لباس زیر',
            'content' => 'نکته‌های نگهداری از لباس زیر برای عمر بیشتر.',
            'category' => 'نگهداری',
            'is_published' => true,
        ]);

        Article::query()->create([
            'title' => 'انتخاب سایز سوتین',
            'content' => 'جدول سایز و نکات اندازه‌گیری.',
            'category' => 'راهنمای خرید',
            'is_published' => true,
        ]);

        $this->getJson('/api/v1/articles?category='.urlencode('راهنمای خرید'))
            ->assertOk()
            ->assertJsonCount(2, 'data');

        $this->getJson('/api/v1/articles/'.$main->slug)
            ->assertOk()
            ->assertJsonCount(1, 'related')
            ->assertJsonPath('related.0.title', 'انتخاب سایز سوتین');
    }

    public function test_duplicate_titles_get_unique_slugs_and_reading_time_is_estimated(): void
    {
        $content = trim(str_repeat('کلمه ', 400));

        $first = Article::query()->create([
            'title' => 'مراقبت از لباس',
            'content' => $content,
        ]);

        $second = Article::query()->create([
            'title' => 'مراقبت از لباس',
            'content' => $content,
        ]);

        $this->assertNotSame($first->slug, $second->slug);
        $this->assertSame($first->slug.'-2', $second->slug);
        $this->assertSame(2, $first->reading_minutes);
        $this->assertNotEmpty($first->excerpt);
    }

    public function test_admin_can_update_toggle_and_delete_article(): void
    {
        $this->actingAdmin(AdminRole::SUPER_ADMIN);

        $article = Article::query()->create([
            'title' => 'عنوان قدیمی',
            'content' => 'متن قدیمی مقاله برای ویرایش شدن.',
            'is_published' => true,
        ]);

        $this->putJson("/api/v1/admin/articles/{$article->id}", [
            'title' => 'عنوان تازه',
            'content' => 'متن تازه مقاله پس از ویرایش توسط مدیر.',
            'is_published' => false,
        ])
            ->assertOk()
            ->assertJsonPath('data.title', 'عنوان تازه')
            ->assertJsonPath('data.is_published', false);

        $this->patchJson("/api/v1/admin/articles/{$article->id}/status", [
            'is_published' => true,
        ])
            ->assertOk()
            ->assertJsonPath('data.is_published', true);

        $this->assertNotNull($article->fresh()->published_at);

        $this->deleteJson("/api/v1/admin/articles/{$article->id}")
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('articles', ['id' => $article->id]);
    }

    public function test_admin_list_filters_by_status_and_returns_stats(): void
    {
        $this->actingAdmin(AdminRole::SUPER_ADMIN);

        Article::query()->create([
            'title' => 'مقالهٔ منتشرشده',
            'content' => 'متن مقالهٔ منتشرشده برای فهرست مدیر.',
            'is_published' => true,
        ]);

        Article::query()->create([
            'title' => 'پیش‌نویس داخلی',
            'content' => 'متن پیش‌نویس که هنوز منتشر نشده است.',
            'is_published' => false,
        ]);

        $this->getJson('/api/v1/admin/articles?status=draft')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'پیش‌نویس داخلی');

        $this->getJson('/api/v1/admin/articles?q='.urlencode('منتشرشده'))
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->getJson('/api/v1/admin/articles')
            ->assertOk()
            ->assertJsonPath('stats.total', 2)
            ->assertJsonPath('stats.published', 1)
            ->assertJsonPath('stats.draft', 1)
            ->assertJsonPath('stats.today', 2);
    }

    public function test_guest_and_unauthorized_roles_cannot_manage_articles(): void
    {
        $this->postJson('/api/v1/admin/articles', [
            'title' => 'بدون مجوز',
            'content' => 'این درخواست باید رد شود چون کاربر مهمان است.',
        ])->assertUnauthorized();

        Sanctum::actingAs(User::factory()->create([
            'role' => 'admin',
            'admin_role' => AdminRole::SUPPORT,
        ]));

        $this->getJson('/api/v1/admin/articles')->assertForbidden();
    }

    public function test_product_manager_can_manage_articles(): void
    {
        $this->actingAdmin(AdminRole::PRODUCT_MANAGER);

        $this->getJson('/api/v1/admin/articles')->assertOk();
        $this->getJson('/api/v1/articles')->assertOk();
    }

    public function test_admin_can_upload_article_cover(): void
    {
        Storage::fake('public');

        $this->actingAdmin(AdminRole::SUPER_ADMIN);

        // افزونهٔ GD روی این محیط نصب نیست؛ به‌جای UploadedFile::fake()->image()
        // یک PNG واقعی کوچک می‌سازیم تا اعتبارسنجی image معتبر بماند.
        $binary = base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8AAAwAB/wF+9MxKAAAAAElFTkSuQmCC'
        );

        $tempPath = tempnam(sys_get_temp_dir(), 'cover').'.png';
        file_put_contents($tempPath, $binary);

        try {
            $upload = new UploadedFile($tempPath, 'cover.png', 'image/png', null, true);

            $response = $this->postJson('/api/v1/admin/articles/cover', [
                'image' => $upload,
            ]);
        } finally {
            @unlink($tempPath);
        }

        $response->assertCreated()->assertJsonPath('success', true);

        $path = $response->json('data.path');

        $this->assertStringStartsWith('article-covers/', $path);
        Storage::disk('public')->assertExists($path);
    }
}
