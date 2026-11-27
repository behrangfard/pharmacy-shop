<?php

namespace Tests\Feature;

use App\Models\StoreSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * متن‌ها و لینک‌های هدر و فوتر + تنظیمات نوار ناوبری پایین موبایل
 * (میان‌برها، «دسترسی سریع» و لوگوی دکمهٔ شناور): پیش‌فرض‌های عمومی، ذخیره از
 * پنل و اعتبارسنجی.
 */
class HeaderFooterTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // هر تست از مقدار تمیز شروع شود تا کش store_settings از تست قبلی نیاید.
        StoreSetting::forgetCache();
    }

    private function admin(): User
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        Sanctum::actingAs($admin);

        return $admin;
    }

    public function test_public_endpoint_returns_defaults(): void
    {
        $this->getJson('/api/v1/header-footer')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.header_logo_text', 'بهرنگ شاپ')
            ->assertJsonPath('data.header_show_search', true)
            ->assertJsonPath('data.header_cta_enabled', false)
            ->assertJsonCount(7, 'data.footer_quick_links')
            ->assertJsonPath('data.footer_quick_links.0.label', 'فروشگاه')
            ->assertJsonPath('data.footer_quick_links.0.url', '/products');
    }

    public function test_admin_can_update_header_and_footer_and_public_endpoint_refreshes(): void
    {
        $this->admin();

        // کش عمومی را پر می‌کنیم تا پاک شدن آن بعد از ذخیره بررسی شود.
        $this->getJson('/api/v1/header-footer')->assertOk();

        $this->putJson('/api/v1/admin/header-footer', [
            'header_logo_text' => 'فروشگاه نمونه',
            'header_tagline' => 'کیفیت و راحتی هر روز',
            'header_show_search' => false,
            'header_cta_enabled' => true,
            'header_cta_label' => 'تخفیف‌های امروز',
            'header_cta_url' => '/products?discount=1',
            'header_cta_new_tab' => false,
            'footer_about_title' => 'داستان ما',
            'footer_about_text' => 'از سال ۱۳۹۰ در کنار شما هستیم.',
            'footer_highlight_title' => 'ارسال سریع',
            'footer_highlight_text' => 'ارسال سفارش‌ها در ۲۴ ساعت.',
            'footer_copyright' => 'تمامی حقوق محفوظ است.',
            'footer_quick_links' => [
                ['label' => 'فروشگاه', 'url' => '/products'],
                ['label' => 'اینستاگرام', 'url' => 'https://instagram.com/example'],
            ],
        ])
            ->assertOk()
            ->assertJsonPath('data.header_logo_text', 'فروشگاه نمونه')
            ->assertJsonPath('data.header_show_search', false)
            ->assertJsonPath('data.footer_about_title', 'داستان ما')
            ->assertJsonCount(2, 'data.footer_quick_links');

        $this->getJson('/api/v1/header-footer')
            ->assertOk()
            ->assertJsonPath('data.header_logo_text', 'فروشگاه نمونه')
            ->assertJsonPath('data.header_tagline', 'کیفیت و راحتی هر روز')
            ->assertJsonPath('data.header_cta_enabled', true)
            ->assertJsonPath('data.footer_copyright', 'تمامی حقوق محفوظ است.')
            ->assertJsonCount(2, 'data.footer_quick_links')
            ->assertJsonPath('data.footer_quick_links.1.url', 'https://instagram.com/example');
    }

    public function test_quick_links_without_url_are_rejected(): void
    {
        $this->admin();

        $this->putJson('/api/v1/admin/header-footer', [
            'header_logo_text' => 'فروشگاه نمونه',
            'header_show_search' => true,
            'header_cta_enabled' => false,
            'header_cta_new_tab' => false,
            'footer_quick_links' => [
                ['label' => 'بدون نشانی', 'url' => ''],
            ],
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['footer_quick_links.0.url']);
    }

    public function test_guest_cannot_update_header_and_footer(): void
    {
        $this->putJson('/api/v1/admin/header-footer', [
            'header_logo_text' => 'دسترسی غیرمجاز',
            'header_show_search' => true,
            'header_cta_enabled' => false,
            'header_cta_new_tab' => false,
        ])->assertUnauthorized();
    }

    public function test_public_endpoint_returns_default_customer_service_rows(): void
    {
        $this->getJson('/api/v1/header-footer')
            ->assertOk()
            ->assertJsonPath('data.footer_services_title', '')
            ->assertJsonPath('data.footer_show_contact', true)
            ->assertJsonCount(4, 'data.footer_services')
            ->assertJsonPath('data.footer_services.0.title', 'راهنمای خرید')
            ->assertJsonPath('data.footer_services.2.action', 'support')
            ->assertJsonPath('data.footer_services.3.url', '/account');
    }

    public function test_admin_can_edit_customer_service_rows_of_footer(): void
    {
        $this->admin();

        $this->getJson('/api/v1/header-footer')->assertOk();

        $this->putJson('/api/v1/admin/header-footer', [
            'header_logo_text' => 'فروشگاه نمونه',
            'header_show_search' => true,
            'header_cta_enabled' => false,
            'header_cta_new_tab' => false,
            'footer_services_title' => 'پشتیبانی و خدمات',
            'footer_show_contact' => false,
            'footer_services' => [
                [
                    'title' => 'سؤالی دارید؟',
                    'description' => 'در چت پاسخ می‌دهیم',
                    'icon' => 'headset',
                    'action' => 'support',
                    'url' => '',
                ],
                [
                    'title' => 'تماس تلفنی',
                    'description' => '',
                    'icon' => 'phone',
                    'action' => 'url',
                    'url' => 'tel:02100000000',
                ],
            ],
        ])
            ->assertOk()
            ->assertJsonPath('data.footer_services_title', 'پشتیبانی و خدمات')
            ->assertJsonPath('data.footer_show_contact', false)
            ->assertJsonCount(2, 'data.footer_services')
            ->assertJsonPath('data.footer_services.0.action', 'support')
            ->assertJsonPath('data.footer_services.1.url', 'tel:02100000000');

        $this->getJson('/api/v1/header-footer')
            ->assertOk()
            ->assertJsonPath('data.footer_services_title', 'پشتیبانی و خدمات')
            ->assertJsonPath('data.footer_show_contact', false)
            ->assertJsonCount(2, 'data.footer_services')
            ->assertJsonPath('data.footer_services.0.icon', 'headset')
            ->assertJsonPath('data.footer_services.1.title', 'تماس تلفنی');
    }

    public function test_customer_service_row_with_link_action_needs_url(): void
    {
        $this->admin();

        $this->putJson('/api/v1/admin/header-footer', [
            'header_logo_text' => 'فروشگاه نمونه',
            'header_show_search' => true,
            'header_cta_enabled' => false,
            'header_cta_new_tab' => false,
            'footer_services' => [
                [
                    'title' => 'بدون نشانی',
                    'description' => '',
                    'icon' => 'truck',
                    'action' => 'url',
                    'url' => '',
                ],
            ],
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['footer_services.0.url']);
    }

    public function test_customer_service_row_with_unknown_icon_is_rejected(): void
    {
        $this->admin();

        $this->putJson('/api/v1/admin/header-footer', [
            'header_logo_text' => 'فروشگاه نمونه',
            'header_show_search' => true,
            'header_cta_enabled' => false,
            'header_cta_new_tab' => false,
            'footer_services' => [
                [
                    'title' => 'آیکن نامعتبر',
                    'description' => '',
                    'icon' => 'not-a-real-icon',
                    'action' => 'none',
                    'url' => '',
                ],
            ],
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['footer_services.0.icon']);
    }

    public function test_public_endpoint_returns_default_mobile_bottom_nav(): void
    {
        $this->getJson('/api/v1/header-footer')
            ->assertOk()
            ->assertJsonPath('data.mobile_nav_enabled', true)
            ->assertJsonPath('data.mobile_nav_fab_mode', 'panel')
            ->assertJsonPath('data.mobile_nav_fab_url', '')
            ->assertJsonPath('data.mobile_nav_fab_logo', '')
            ->assertJsonCount(4, 'data.mobile_nav_items')
            ->assertJsonPath('data.mobile_nav_items.0.label', 'خانه')
            ->assertJsonPath('data.mobile_nav_items.0.url', '/')
            ->assertJsonPath('data.mobile_nav_items.0.icon', 'home')
            ->assertJsonPath('data.mobile_nav_items.2.badge', 'wishlist')
            ->assertJsonPath('data.mobile_nav_items.3.badge', 'cart')
            ->assertJsonCount(4, 'data.mobile_nav_quick_links')
            ->assertJsonPath('data.mobile_nav_quick_links.0.url', '/account')
            ->assertJsonPath('data.mobile_nav_quick_links.0.icon', 'user-round')
            ->assertJsonPath('data.mobile_nav_quick_links.1.url', '/track-order')
            ->assertJsonPath('data.mobile_nav_quick_links.3.icon', 'file-text');
    }

    public function test_admin_can_edit_mobile_bottom_nav_and_public_endpoint_refreshes(): void
    {
        $this->admin();

        // کش عمومی را پر می‌کنیم تا تازه‌شدن آن پس از ذخیره بررسی شود.
        $this->getJson('/api/v1/header-footer')->assertOk();

        $this->putJson('/api/v1/admin/header-footer', [
            'header_logo_text' => 'فروشگاه نمونه',
            'header_show_search' => true,
            'header_cta_enabled' => false,
            'header_cta_new_tab' => false,
            'mobile_nav_enabled' => false,
            'mobile_nav_items' => [
                [
                    'label' => 'خانه',
                    'url' => '/',
                    'icon' => 'home',
                    'badge' => 'none',
                ],
                [
                    'label' => 'پیشنهاد ویژه',
                    'url' => '/products?sort=newest',
                    'icon' => 'ticket-percent',
                    'badge' => 'none',
                ],
                [
                    'label' => 'سبد من',
                    'url' => '/cart',
                    'icon' => 'shopping-cart',
                    'badge' => 'cart',
                ],
            ],
            'mobile_nav_quick_links' => [
                [
                    'label' => 'تماس با ما',
                    'hint' => 'پاسخ در ساعات کاری',
                    'url' => '/contact',
                    'icon' => 'phone',
                ],
            ],
            'mobile_nav_fab_mode' => 'link',
            'mobile_nav_fab_url' => '/products',
            'mobile_nav_fab_logo' => '/images/logo.png',
        ])
            ->assertOk()
            ->assertJsonPath('data.mobile_nav_enabled', false)
            ->assertJsonPath('data.mobile_nav_fab_mode', 'link')
            ->assertJsonPath('data.mobile_nav_fab_url', '/products')
            ->assertJsonPath('data.mobile_nav_fab_logo', '/images/logo.png')
            ->assertJsonCount(3, 'data.mobile_nav_items')
            ->assertJsonPath('data.mobile_nav_items.1.icon', 'ticket-percent')
            ->assertJsonCount(1, 'data.mobile_nav_quick_links')
            ->assertJsonPath(
                'data.mobile_nav_quick_links.0.hint',
                'پاسخ در ساعات کاری'
            );

        $this->getJson('/api/v1/header-footer')
            ->assertOk()
            ->assertJsonPath('data.mobile_nav_enabled', false)
            ->assertJsonPath('data.mobile_nav_fab_url', '/products')
            ->assertJsonCount(3, 'data.mobile_nav_items')
            ->assertJsonPath('data.mobile_nav_items.2.label', 'سبد من')
            ->assertJsonPath('data.mobile_nav_items.2.badge', 'cart')
            ->assertJsonCount(1, 'data.mobile_nav_quick_links');
    }

    public function test_mobile_nav_rejects_unknown_icon_and_too_few_items(): void
    {
        $this->admin();

        $base = [
            'header_logo_text' => 'فروشگاه نمونه',
            'header_show_search' => true,
            'header_cta_enabled' => false,
            'header_cta_new_tab' => false,
        ];

        $this->putJson('/api/v1/admin/header-footer', $base + [
            'mobile_nav_items' => [
                [
                    'label' => 'خانه',
                    'url' => '/',
                    'icon' => 'not-a-real-icon',
                    'badge' => 'none',
                ],
                [
                    'label' => 'فروشگاه',
                    'url' => '/products',
                    'icon' => 'store',
                    'badge' => 'none',
                ],
            ],
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['mobile_nav_items.0.icon']);

        // نوار با یک میان‌بر شکل درستی ندارد؛ سرور کمینه را رد می‌کند.
        $this->putJson('/api/v1/admin/header-footer', $base + [
            'mobile_nav_items' => [
                [
                    'label' => 'خانه',
                    'url' => '/',
                    'icon' => 'home',
                    'badge' => 'none',
                ],
            ],
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['mobile_nav_items']);
    }

    public function test_mobile_nav_fab_link_mode_needs_url(): void
    {
        $this->admin();

        $this->putJson('/api/v1/admin/header-footer', [
            'header_logo_text' => 'فروشگاه نمونه',
            'header_show_search' => true,
            'header_cta_enabled' => false,
            'header_cta_new_tab' => false,
            'mobile_nav_fab_mode' => 'link',
            'mobile_nav_fab_url' => '   ',
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['mobile_nav_fab_url']);
    }

    public function test_mobile_nav_logo_upload_and_replacing_it_deletes_the_old_file(): void
    {
        $this->admin();

        Storage::fake('public');

        // GD روی این محیط نصب نیست؛ از یک PNG واقعی کوچک استفاده می‌شود
        // (قاعدهٔ `image` همچنان هدر فایل را بررسی می‌کند).
        $png = base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
            true
        );

        $first = $this->post(
            '/api/v1/admin/header-footer/mobile-logo',
            ['image' => UploadedFile::fake()->createWithContent('logo.png', $png)],
            ['Accept' => 'application/json']
        )->assertCreated()
            ->assertJsonPath('success', true);

        $firstPath = $first->json('data.path');

        $this->assertIsString($firstPath);
        $this->assertStringStartsWith('mobile-nav/', $firstPath);
        Storage::disk('public')->assertExists($firstPath);
        $this->assertNotEmpty($first->json('data.url'));

        $payload = [
            'header_logo_text' => 'فروشگاه نمونه',
            'header_show_search' => true,
            'header_cta_enabled' => false,
            'header_cta_new_tab' => false,
        ];

        $this->putJson('/api/v1/admin/header-footer', $payload + [
            'mobile_nav_fab_logo' => $firstPath,
        ])
            ->assertOk()
            ->assertJsonPath('data.mobile_nav_fab_logo', $firstPath);

        $second = $this->post(
            '/api/v1/admin/header-footer/mobile-logo',
            ['image' => UploadedFile::fake()->createWithContent('logo-2.png', $png)],
            ['Accept' => 'application/json']
        )->assertCreated();

        $secondPath = $second->json('data.path');

        $this->putJson('/api/v1/admin/header-footer', $payload + [
            'mobile_nav_fab_logo' => $secondPath,
        ])->assertOk();

        // فایل قبلی باید پاک شده باشد (پوشهٔ mobile-nav در نقشهٔ media:prune نیست).
        Storage::disk('public')->assertMissing($firstPath);
        Storage::disk('public')->assertExists($secondPath);
    }

    public function test_mobile_nav_logo_upload_rejects_non_image_files(): void
    {
        $this->admin();

        Storage::fake('public');

        $this->postJson('/api/v1/admin/header-footer/mobile-logo', [
            'image' => UploadedFile::fake()->create(
                'catalog.pdf',
                40,
                'application/pdf'
            ),
        ])->assertStatus(422);
    }

    public function test_guest_cannot_upload_mobile_nav_logo(): void
    {
        $this->postJson('/api/v1/admin/header-footer/mobile-logo', [])
            ->assertUnauthorized();
    }
}
