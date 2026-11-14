<?php

namespace Tests\Feature;

use App\Models\Story;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * استوری‌های صفحهٔ اول فروشگاه: مدیریت از پنل و نمایش عمومی.
 */
class StoryTest extends TestCase
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

    public function test_admin_can_create_story_and_public_endpoint_refreshes(): void
    {
        $this->admin();

        // کش عمومی را پر می‌کنیم تا پاک شدن آن بعد از ایجاد بررسی شود.
        $this->getJson('/api/v1/stories')->assertOk()->assertJsonCount(0, 'data');

        $this->postJson('/api/v1/admin/stories', [
            'title' => 'بهداشتی',
            'cover_image' => 'stories/cover.jpg',
            'slides' => [
                [
                    'image' => 'stories/health-1.jpg',
                    'caption' => 'جدیدترین محصولات بهداشتی',
                    'link' => '/products?category=health',
                ],
                [
                    'image' => 'stories/health-2.jpg',
                ],
            ],
            'sort_order' => 1,
            'is_active' => true,
        ])
            ->assertCreated()
            ->assertJsonPath('data.title', 'بهداشتی');

        $this->getJson('/api/v1/stories')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'بهداشتی')
            ->assertJsonPath('data.0.cover_image', 'stories/cover.jpg')
            ->assertJsonPath('data.0.slides.0.caption', 'جدیدترین محصولات بهداشتی')
            ->assertJsonPath('data.0.slides.0.link', '/products?category=health')
            ->assertJsonPath('data.0.slides.1.caption', null);
    }

    public function test_public_stories_exclude_inactive_and_imageless_slides(): void
    {
        Story::query()->create([
            'title' => 'فعال',
            'cover_image' => 'stories/active.jpg',
            'slides' => [
                ['image' => 'stories/a.jpg', 'caption' => 'اول'],
                ['image' => '', 'caption' => 'بدون تصویر'],
            ],
            'sort_order' => 2,
            'is_active' => true,
        ]);

        Story::query()->create([
            'title' => 'غیرفعال',
            'cover_image' => 'stories/inactive.jpg',
            'slides' => [['image' => 'stories/b.jpg']],
            'sort_order' => 1,
            'is_active' => false,
        ]);

        // استوری بدون اسلاید تصویری نباید روی سایت رندر شود.
        Story::query()->create([
            'title' => 'بدون اسلاید',
            'slides' => [],
            'sort_order' => 3,
            'is_active' => true,
        ]);

        $this->getJson('/api/v1/stories')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'فعال')
            ->assertJsonCount(1, 'data.0.slides');
    }

    public function test_cover_image_falls_back_to_first_slide(): void
    {
        Story::query()->create([
            'title' => 'بدون کاور',
            'cover_image' => null,
            'slides' => [['image' => 'stories/first.jpg']],
            'is_active' => true,
        ]);

        $this->getJson('/api/v1/stories')
            ->assertOk()
            ->assertJsonPath('data.0.cover_image', 'stories/first.jpg');
    }

    public function test_admin_can_update_status_and_delete_story(): void
    {
        $this->admin();

        $story = Story::query()->create([
            'title' => 'زمستونه',
            'cover_image' => 'stories/winter.jpg',
            'slides' => [['image' => 'stories/winter-1.jpg']],
            'is_active' => true,
        ]);

        $this->putJson("/api/v1/admin/stories/{$story->id}", [
            'title' => 'زمستونه',
            'cover_image' => 'stories/winter.jpg',
            'slides' => [['image' => 'stories/winter-1.jpg', 'caption' => 'کالکشن تازه']],
            'sort_order' => 0,
            'is_active' => true,
        ])
            ->assertOk()
            ->assertJsonPath('data.slides.0.caption', 'کالکشن تازه');

        $this->patchJson("/api/v1/admin/stories/{$story->id}/status", [
            'is_active' => false,
        ])
            ->assertOk()
            ->assertJsonPath('data.is_active', false);

        $this->getJson('/api/v1/stories')->assertOk()->assertJsonCount(0, 'data');

        $this->deleteJson("/api/v1/admin/stories/{$story->id}")
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('stories', ['id' => $story->id]);
    }

    public function test_admin_can_upload_story_image(): void
    {
        Storage::fake('public');

        $this->admin();

        // افزونهٔ GD روی این محیط نصب نیست؛ یک PNG واقعی کوچک می‌سازیم.
        $binary = base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8AAAwAB/wF+9MxKAAAAAElFTkSuQmCC'
        );

        $tempPath = tempnam(sys_get_temp_dir(), 'story').'.png';
        file_put_contents($tempPath, $binary);

        try {
            $upload = new UploadedFile($tempPath, 'story.png', 'image/png', null, true);

            $response = $this->postJson('/api/v1/admin/stories/image', [
                'image' => $upload,
            ]);
        } finally {
            @unlink($tempPath);
        }

        $response->assertCreated()->assertJsonPath('success', true);

        $path = $response->json('data.path');

        $this->assertStringStartsWith('stories/', $path);
        Storage::disk('public')->assertExists($path);
    }

    public function test_story_requires_at_least_one_slide_with_image(): void
    {
        $this->admin();

        $this->postJson('/api/v1/admin/stories', [
            'title' => 'ناقص',
            'slides' => [],
        ])->assertStatus(422)->assertJsonValidationErrors('slides');

        $this->postJson('/api/v1/admin/stories', [
            'title' => 'بدون تصویر',
            'slides' => [['image' => '', 'caption' => 'متن']],
        ])->assertStatus(422)->assertJsonValidationErrors('slides.0.image');
    }

    public function test_guest_cannot_manage_stories(): void
    {
        $this->postJson('/api/v1/admin/stories', [
            'title' => 'غیرمجاز',
            'slides' => [['image' => 'stories/x.jpg']],
        ])->assertUnauthorized();
    }
}
