<?php

namespace Tests\Feature;

use App\Models\Banner;
use App\Models\Page;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * بخش «مدیریت محتوا»: صفحات ثابت سایت و مرتب‌سازی اسلایدر.
 */
class ContentManagementTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        Sanctum::actingAs($admin);

        return $admin;
    }

    public function test_admin_can_create_page_and_public_endpoint_returns_it(): void
    {
        $this->admin();

        $this->postJson('/api/v1/admin/pages', [
            'title' => 'درباره ما',
            'content' => 'فروشگاه ما با هدف ارائه محصولات باکیفیت راه‌اندازی شده است.',
            'is_published' => true,
        ])
            ->assertCreated()
            ->assertJsonPath('data.slug', 'درباره-ما')
            ->assertJsonPath('data.show_in_footer', true);

        $this->getJson('/api/v1/pages')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'درباره ما');

        $this->getJson('/api/v1/pages/درباره-ما')
            ->assertOk()
            ->assertJsonPath('data.title', 'درباره ما');
    }

    public function test_draft_pages_are_hidden_from_storefront(): void
    {
        Page::query()->create([
            'title' => 'قوانین',
            'content' => 'متن پیش‌نویس قوانین فروشگاه.',
            'is_published' => false,
        ]);

        $this->getJson('/api/v1/pages')->assertOk()->assertJsonCount(0, 'data');

        $this->getJson('/api/v1/pages/قوانین')->assertNotFound();
    }

    public function test_admin_can_update_page_status_and_delete_it(): void
    {
        $this->admin();

        $page = Page::query()->create([
            'title' => 'تماس با ما',
            'content' => 'راه‌های ارتباط با پشتیبانی فروشگاه.',
            'is_published' => true,
        ]);

        $this->patchJson("/api/v1/admin/pages/{$page->id}/status", [
            'is_published' => false,
        ])
            ->assertOk()
            ->assertJsonPath('data.is_published', false);

        $this->deleteJson("/api/v1/admin/pages/{$page->id}")
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('pages', ['id' => $page->id]);
    }

    public function test_page_slugs_stay_unique(): void
    {
        $this->admin();

        $payload = [
            'title' => 'قوانین',
            'content' => 'متن اول قوانین فروشگاه.',
            'is_published' => true,
        ];

        $first = $this->postJson('/api/v1/admin/pages', $payload);
        $second = $this->postJson('/api/v1/admin/pages', $payload);

        $first->assertCreated();
        $second->assertCreated();

        $this->assertNotSame(
            $first->json('data.slug'),
            $second->json('data.slug')
        );
    }

    public function test_admin_can_reorder_banners_of_one_section(): void
    {
        $this->admin();

        $first = Banner::query()->create([
            'title' => 'اسلاید اول',
            'image' => 'banners/one.jpg',
            'position' => 'home_hero',
            'sort_order' => 1,
        ]);

        $second = Banner::query()->create([
            'title' => 'اسلاید دوم',
            'image' => 'banners/two.jpg',
            'position' => 'home_hero',
            'sort_order' => 2,
        ]);

        $this->putJson('/api/v1/admin/banners/order', [
            'position' => 'home_hero',
            'ids' => [$second->id, $first->id],
        ])
            ->assertOk()
            ->assertJsonPath('data.0.id', $second->id)
            ->assertJsonPath('data.0.sort_order', 1);

        // بنر یک بخش دیگر نباید در مرتب‌سازی همان بخش پذیرفته شود.
        $other = Banner::query()->create([
            'title' => 'بنر وسط صفحه',
            'image' => 'banners/grid.jpg',
            'position' => 'home_grid',
            'sort_order' => 1,
        ]);

        $this->putJson('/api/v1/admin/banners/order', [
            'position' => 'home_hero',
            'ids' => [$first->id, $other->id],
        ])->assertStatus(422);
    }

    public function test_guest_cannot_manage_pages(): void
    {
        $this->postJson('/api/v1/admin/pages', [
            'title' => 'غیرمجاز',
            'content' => 'این درخواست باید رد شود.',
            'is_published' => true,
        ])->assertUnauthorized();
    }
}
