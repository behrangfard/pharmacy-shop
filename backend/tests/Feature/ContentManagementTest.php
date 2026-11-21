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

    public function test_new_banner_is_appended_to_the_end_of_its_section(): void
    {
        $this->admin();

        Banner::query()->create([
            'title' => 'اسلاید موجود',
            'image' => 'banners/existing.jpg',
            'position' => 'home_hero',
            'sort_order' => 3,
        ]);

        // بنر تازه بدون sort_order انتهای همان بخش می‌نشیند، نه ابتدای اسلایدر.
        $this->postJson('/api/v1/admin/banners', [
            'image' => 'banners/new.jpg',
            'position' => 'home_hero',
        ])
            ->assertCreated()
            ->assertJsonPath('data.sort_order', 4);

        // شمارش ترتیب برای هر بخش جداست.
        $this->postJson('/api/v1/admin/banners', [
            'image' => 'banners/grid.jpg',
            'position' => 'home_grid',
        ])
            ->assertCreated()
            ->assertJsonPath('data.sort_order', 1);
    }

    public function test_reorder_keeps_banners_that_were_not_submitted(): void
    {
        $this->admin();

        $first = Banner::query()->create([
            'title' => 'اول',
            'image' => 'banners/one.jpg',
            'position' => 'home_hero',
            'sort_order' => 1,
        ]);

        $second = Banner::query()->create([
            'title' => 'دوم',
            'image' => 'banners/two.jpg',
            'position' => 'home_hero',
            'sort_order' => 2,
        ]);

        $third = Banner::query()->create([
            'title' => 'سوم',
            'image' => 'banners/three.jpg',
            'position' => 'home_hero',
            'sort_order' => 3,
        ]);

        // بنر دوم در فهرست ارسالی نیست؛ نباید حذف یا نادیده گرفته شود.
        $this->putJson('/api/v1/admin/banners/order', [
            'position' => 'home_hero',
            'ids' => [$third->id, $first->id],
        ])
            ->assertOk()
            ->assertJsonPath('data.0.id', $third->id)
            ->assertJsonPath('data.1.id', $first->id)
            ->assertJsonPath('data.2.id', $second->id);

        $this->assertSame(1, $third->fresh()->sort_order);
        $this->assertSame(2, $first->fresh()->sort_order);
        $this->assertSame(3, $second->fresh()->sort_order);
    }

    public function test_admin_banner_list_uses_the_same_order_as_storefront(): void
    {
        $this->admin();

        $older = Banner::query()->create([
            'title' => 'قدیمی‌تر',
            'image' => 'banners/older.jpg',
            'position' => 'home_hero',
            'sort_order' => 5,
            'is_active' => true,
        ]);

        $newer = Banner::query()->create([
            'title' => 'جدیدتر',
            'image' => 'banners/newer.jpg',
            'position' => 'home_hero',
            'sort_order' => 5,
            'is_active' => true,
        ]);

        // در تساوی sort_order هر دو خروجی شناسهٔ صعودی می‌دهند.
        $this->getJson('/api/v1/admin/banners')
            ->assertOk()
            ->assertJsonPath('data.0.id', $older->id)
            ->assertJsonPath('data.1.id', $newer->id);

        $this->getJson('/api/v1/banners')
            ->assertOk()
            ->assertJsonPath('data.0.id', $older->id)
            ->assertJsonPath('data.1.id', $newer->id);
    }
}
