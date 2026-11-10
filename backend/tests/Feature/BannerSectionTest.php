<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\BannerController;
use App\Models\Banner;
use App\Models\BannerSection;
use App\Models\StoreSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * بخش‌های بنر صفحهٔ اول (home_grid و home_hero) و ظاهر مشترک بنرها.
 *
 * چیدمان بخش چندستونه، ابعاد/تعداد تصاویر اسلایدر هیرو و گردی گوشهٔ کادر همهٔ
 * بنرها در پنل مدیریت انتخاب می‌شود؛ بنابراین این مقادیر باید در پاسخ عمومی
 * `/banners` (کلیدهای sections و appearance) هم برگردند تا فرانت‌اند بداند
 * چند بنر و با چه ظاهری نمایش دهد.
 */
class BannerSectionTest extends TestCase
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

    public function test_home_grid_section_exists_by_default(): void
    {
        $section = BannerSection::query()->where('position', 'home_grid')->first();

        $this->assertNotNull($section);
        $this->assertSame('two', $section->normalizedLayout());
        $this->assertSame(2, $section->slots());
        $this->assertTrue((bool) $section->is_active);
    }

    public function test_public_banners_response_contains_grid_section(): void
    {
        $this->getJson('/api/v1/banners')
            ->assertOk()
            ->assertJsonPath('sections.0.position', 'home_grid')
            ->assertJsonPath('sections.0.layout', 'two')
            ->assertJsonPath('sections.0.slots', 2)
            ->assertJsonPath('sections.0.is_active', true);
    }

    public function test_admin_can_change_section_layout_and_public_cache_is_forgotten(): void
    {
        $this->admin();

        // کش را با یک درخواست عمومی پر می‌کنیم.
        $this->getJson('/api/v1/banners')
            ->assertOk()
            ->assertJsonPath('sections.0.layout', 'two');

        $this->putJson('/api/v1/admin/banner-sections/home_grid', [
            'layout' => 'three_split',
            'title' => 'پیشنهاد امروز',
            'subtitle' => 'سه انتخاب ویژه',
            'is_active' => true,
        ])
            ->assertOk()
            ->assertJsonPath('data.layout', 'three_split')
            ->assertJsonPath('data.slots', 3)
            ->assertJsonPath('data.title', 'پیشنهاد امروز')
            ->assertJsonPath('data.is_active', true);

        // کش باید پاک شده باشد؛ در غیر این صورت چیدمان قدیمی برمی‌گشت.
        $this->assertNull(Cache::get(BannerController::STOREFRONT_CACHE_KEY));

        $this->getJson('/api/v1/banners')
            ->assertOk()
            ->assertJsonPath('sections.0.layout', 'three_split')
            ->assertJsonPath('sections.0.slots', 3)
            ->assertJsonPath('sections.0.title', 'پیشنهاد امروز');
    }

    public function test_public_response_hides_disabled_section(): void
    {
        $this->admin();

        // هر دو بخش (چندستونه و هیرو) خاموش می‌شوند تا پاسخ عمومی خالی باشد.
        foreach (BannerSection::POSITIONS as $position) {
            $this->putJson("/api/v1/admin/banner-sections/{$position}", [
                'layout' => 'two',
                'is_active' => false,
            ])
                ->assertOk()
                ->assertJsonPath('data.is_active', false);
        }

        $this->getJson('/api/v1/banners')
            ->assertOk()
            ->assertJsonCount(0, 'sections');
    }

    public function test_invalid_layout_is_rejected(): void
    {
        $this->admin();

        $this->putJson('/api/v1/admin/banner-sections/home_grid', [
            'layout' => 'nine_columns',
        ])->assertStatus(422);
    }

    public function test_unknown_section_returns_not_found(): void
    {
        $this->admin();

        $this->putJson('/api/v1/admin/banner-sections/home_footer', [
            'layout' => 'two',
        ])->assertNotFound();
    }

    public function test_admin_can_create_grid_banner_and_section_counts_it(): void
    {
        $this->admin();

        $this->postJson('/api/v1/admin/banners', [
            'image' => 'banners/grid-1.jpg',
            'position' => 'home_grid',
            'sort_order' => 1,
            'is_active' => true,
        ])
            ->assertCreated()
            ->assertJsonPath('data.position', 'home_grid');

        $this->getJson('/api/v1/admin/banner-sections')
            ->assertOk()
            ->assertJsonPath('data.0.position', 'home_grid')
            ->assertJsonPath('data.0.banners_count', 1);

        $this->getJson('/api/v1/banners?position=home_grid')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.image', 'banners/grid-1.jpg');
    }

    public function test_hero_section_exists_by_default_without_size_limits(): void
    {
        $section = BannerSection::forPosition(BannerSection::HERO_POSITION);

        $this->assertSame('home_hero', $section->position);
        $this->assertNull($section->imageLimit());
        $this->assertNull($section->heightFor('desktop'));
        $this->assertNull($section->heightFor('mobile'));
        $this->assertSame('contain', $section->normalizedFit());
        $this->assertTrue((bool) $section->is_active);
    }

    public function test_admin_can_set_hero_size_and_image_count(): void
    {
        $this->admin();

        $this->putJson('/api/v1/admin/banner-sections/home_hero', [
            'image_count' => 3,
            'height_desktop' => 520,
            'height_mobile' => 360,
            'fit' => 'cover',
            'is_active' => true,
        ])
            ->assertOk()
            ->assertJsonPath('data.position', 'home_hero')
            ->assertJsonPath('data.image_count', 3)
            ->assertJsonPath('data.height_desktop', 520)
            ->assertJsonPath('data.height_mobile', 360)
            ->assertJsonPath('data.fit', 'cover');

        $section = BannerSection::forPosition(BannerSection::HERO_POSITION);
        $this->assertSame(3, $section->imageLimit());
        $this->assertSame(520, $section->heightFor('desktop'));
        $this->assertSame(360, $section->heightFor('mobile'));
        $this->assertSame('cover', $section->normalizedFit());
    }

    public function test_public_sections_payload_contains_hero_size_settings(): void
    {
        $this->admin();

        $this->putJson('/api/v1/admin/banner-sections/home_hero', [
            'image_count' => 2,
            'height_desktop' => 480,
            'height_mobile' => 320,
            'fit' => 'contain',
        ])->assertOk();

        $response = $this->getJson('/api/v1/banners')->assertOk();

        $sections = collect($response->json('sections'));
        $hero = $sections->firstWhere('position', 'home_hero');

        $this->assertNotNull($hero);
        $this->assertSame(2, $hero['image_count']);
        $this->assertSame(480, $hero['height_desktop']);
        $this->assertSame(320, $hero['height_mobile']);
        $this->assertSame('contain', $hero['fit']);
        // بخش چندستونه هم همان فیلدها را با مقدار صفر/پیش‌فرض برمی‌گرداند.
        $grid = $sections->firstWhere('position', 'home_grid');
        $this->assertSame(0, $grid['image_count']);
        $this->assertSame('contain', $grid['fit']);
    }

    public function test_invalid_hero_fit_and_height_are_rejected(): void
    {
        $this->admin();

        $this->putJson('/api/v1/admin/banner-sections/home_hero', [
            'fit' => 'zoom',
        ])->assertStatus(422);

        $this->putJson('/api/v1/admin/banner-sections/home_hero', [
            'height_desktop' => 9999,
        ])->assertStatus(422);
    }

    public function test_banner_appearance_defaults_to_rounded_corners(): void
    {
        $this->assertSame(16, StoreSetting::bannerRadius());

        $this->getJson('/api/v1/banners')
            ->assertOk()
            ->assertJsonPath('appearance.radius', 16);

        $this->admin();

        $this->getJson('/api/v1/admin/banner-sections')
            ->assertOk()
            ->assertJsonPath('appearance.radius', 16)
            ->assertJsonPath('appearance.radius_max', StoreSetting::BANNER_RADIUS_MAX);
    }

    public function test_admin_can_change_banner_radius_and_public_payload_is_updated(): void
    {
        $this->admin();

        // کش عمومی را از قبل پر می‌کنیم تا پاک‌شدن آن بعد از ذخیره بررسی شود.
        $this->getJson('/api/v1/banners')
            ->assertOk()
            ->assertJsonPath('appearance.radius', 16);

        $this->putJson('/api/v1/admin/banner-appearance', ['radius' => 4])
            ->assertOk()
            ->assertJsonPath('data.radius', 4);

        $this->assertSame(4, StoreSetting::bannerRadius());

        $this->getJson('/api/v1/banners')
            ->assertOk()
            ->assertJsonPath('appearance.radius', 4);

        // صفر یعنی گوشهٔ تیز و باید ذخیره شود (نه اینکه به پیش‌فرض برگردد).
        $this->putJson('/api/v1/admin/banner-appearance', ['radius' => 0])
            ->assertOk()
            ->assertJsonPath('data.radius', 0);

        $this->assertSame(0, StoreSetting::bannerRadius());
    }

    public function test_invalid_banner_radius_is_rejected(): void
    {
        $this->admin();

        $this->putJson('/api/v1/admin/banner-appearance', ['radius' => -1])
            ->assertStatus(422);

        $this->putJson('/api/v1/admin/banner-appearance', [
            'radius' => StoreSetting::BANNER_RADIUS_MAX + 1,
        ])->assertStatus(422);

        $this->putJson('/api/v1/admin/banner-appearance', [])->assertStatus(422);

        // مقدار نامعتبر نباید تغییر ذخیره‌شده را عوض کند.
        $this->assertSame(16, StoreSetting::bannerRadius());
    }

    public function test_mobile_banner_sections_exist_by_default(): void
    {
        // چهار بخش مستقل: دو بخش دسکتاپ و دو بخش موبایل.
        foreach (BannerSection::POSITIONS as $position) {
            BannerSection::forPosition($position);
        }

        $this->assertSame(
            4,
            BannerSection::query()->whereIn('position', BannerSection::POSITIONS)->count()
        );

        $mobileTop = BannerSection::forPosition(BannerSection::MOBILE_TOP_POSITION);
        $mobileMiddle = BannerSection::forPosition(BannerSection::MOBILE_MIDDLE_POSITION);

        $this->assertTrue($mobileTop->isMobile());
        $this->assertTrue($mobileMiddle->isMobile());
        $this->assertSame('one', $mobileTop->normalizedLayout());
        // بدون مقدار اختصاصی، گردی گوشه همان پیش‌فرض سراسری است.
        $this->assertNull($mobileTop->radius);
        $this->assertSame(StoreSetting::bannerRadius(), $mobileTop->effectiveRadius());
        $this->assertTrue((bool) $mobileTop->is_active);
    }

    public function test_admin_can_set_radius_for_each_section(): void
    {
        $this->admin();

        $this->putJson('/api/v1/admin/banner-sections/home_hero', [
            'radius' => 24,
        ])
            ->assertOk()
            ->assertJsonPath('data.radius', 24)
            ->assertJsonPath('data.radius_custom', true);

        $this->putJson('/api/v1/admin/banner-sections/home_mobile_top', [
            'radius' => 0,
            'height_mobile' => 280,
            'image_count' => 2,
        ])
            ->assertOk()
            ->assertJsonPath('data.radius', 0)
            ->assertJsonPath('data.height_mobile', 280)
            ->assertJsonPath('data.image_count', 2)
            ->assertJsonPath('data.is_mobile', true);

        $sections = collect($this->getJson('/api/v1/banners')->assertOk()->json('sections'));

        $this->assertSame(24, $sections->firstWhere('position', 'home_hero')['radius']);
        $this->assertSame(0, $sections->firstWhere('position', 'home_mobile_top')['radius']);
        // بخشی که گردی اختصاصی ندارد از پیش‌فرض سراسری استفاده می‌کند.
        $this->assertSame(16, $sections->firstWhere('position', 'home_grid')['radius']);
    }

    public function test_global_radius_change_does_not_override_section_radius(): void
    {
        $this->admin();

        $this->putJson('/api/v1/admin/banner-sections/home_grid', [
            'radius' => 8,
        ])->assertOk();

        $this->putJson('/api/v1/admin/banner-appearance', ['radius' => 30])
            ->assertOk();

        $sections = collect($this->getJson('/api/v1/banners')->assertOk()->json('sections'));

        // مقدار اختصاصی بخش دست‌نخورده می‌ماند و بقیه بخش‌ها ۳۰ می‌شوند.
        $this->assertSame(8, $sections->firstWhere('position', 'home_grid')['radius']);
        $this->assertSame(30, $sections->firstWhere('position', 'home_hero')['radius']);
        $this->assertSame(30, $sections->firstWhere('position', 'home_mobile_middle')['radius']);
    }

    public function test_invalid_section_radius_is_rejected(): void
    {
        $this->admin();

        $this->putJson('/api/v1/admin/banner-sections/home_hero', [
            'radius' => BannerSection::RADIUS_MAX + 1,
        ])->assertStatus(422);

        $this->putJson('/api/v1/admin/banner-sections/home_hero', [
            'radius' => -1,
        ])->assertStatus(422);
    }

    public function test_sections_have_hover_animation_setting(): void
    {
        // بخش چندستونه از قبل روی هاور بزرگ‌نمایی می‌کرد؛ همان پیش‌فرض حفظ شده
        // است و بقیه بخش‌ها بدون انیمیشن‌اند تا ظاهر فعلی سایت تغییر نکند.
        $sections = collect($this->getJson('/api/v1/banners')->assertOk()->json('sections'));

        $this->assertSame('zoom', $sections->firstWhere('position', 'home_grid')['animation']);
        $this->assertSame('none', $sections->firstWhere('position', 'home_hero')['animation']);
        $this->assertSame('none', $sections->firstWhere('position', 'home_mobile_top')['animation']);
    }

    public function test_admin_can_set_section_animation(): void
    {
        $this->admin();

        $this->putJson('/api/v1/admin/banner-sections/home_hero', [
            'animation' => 'shine',
        ])
            ->assertOk()
            ->assertJsonPath('data.animation', 'shine')
            ->assertJsonPath('data.animations', BannerSection::ANIMATIONS);

        $this->putJson('/api/v1/admin/banner-sections/home_grid', [
            'animation' => 'zoom_lift',
        ])->assertOk();

        $sections = collect($this->getJson('/api/v1/banners')->assertOk()->json('sections'));

        $this->assertSame('shine', $sections->firstWhere('position', 'home_hero')['animation']);
        $this->assertSame('zoom_lift', $sections->firstWhere('position', 'home_grid')['animation']);
        // بخش‌های دیگر دست‌نخورده می‌مانند.
        $this->assertSame('none', $sections->firstWhere('position', 'home_mobile_top')['animation']);
    }

    public function test_invalid_section_animation_is_rejected(): void
    {
        $this->admin();

        $this->putJson('/api/v1/admin/banner-sections/home_hero', [
            'animation' => 'spin',
        ])->assertStatus(422);
    }

    public function test_mobile_banner_uses_one_image_for_both_columns(): void
    {
        $this->admin();

        $this->postJson('/api/v1/admin/banners', [
            'image' => 'banners/mobile-top.jpg',
            'position' => 'home_mobile_top',
            'sort_order' => 1,
            'is_active' => true,
        ])
            ->assertCreated()
            ->assertJsonPath('data.position', 'home_mobile_top')
            // تصویر موبایل از همان تصویر پر می‌شود تا در موبایل رندر شود.
            ->assertJsonPath('data.mobile_image', 'banners/mobile-top.jpg');

        $this->getJson('/api/v1/banners?position=home_mobile_top')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.mobile_image', 'banners/mobile-top.jpg');
    }

    public function test_guest_cannot_read_or_change_banner_sections(): void

    {
        $this->getJson('/api/v1/admin/banner-sections')->assertUnauthorized();

        $this->putJson('/api/v1/admin/banner-sections/home_grid', [
            'layout' => 'two',
        ])->assertUnauthorized();

        $this->putJson('/api/v1/admin/banner-appearance', [
            'radius' => 12,
        ])->assertUnauthorized();
    }
}
