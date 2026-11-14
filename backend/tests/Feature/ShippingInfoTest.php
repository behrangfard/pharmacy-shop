<?php

namespace Tests\Feature;

use App\Models\ShippingMethod;
use App\Models\StoreSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * صفحهٔ «روش‌های ارسال و اطلاعات ارسال»: پیش‌فرض‌های عمومی، فهرست روش‌های
 * فعال، ذخیرهٔ متن از پنل مدیریت (بخش ارسال و حمل‌ونقل) و اعتبارسنجی.
 */
class ShippingInfoTest extends TestCase
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

    public function test_public_page_returns_defaults_and_active_methods(): void
    {
        $this->getJson('/api/v1/shipping-info')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.title', 'روش‌های ارسال و اطلاعات ارسال')
            ->assertJsonPath('data.show_costs', true)
            ->assertJsonCount(4, 'data.notes')
            ->assertJsonCount(5, 'data.methods')
            ->assertJsonPath('data.methods.0.name', 'پست پیشتاز')
            ->assertJsonPath('data.methods.0.base_cost', 60000)
            ->assertJsonPath('data.methods.0.delivery', '2 تا 4 روز کاری')
            ->assertJsonPath('data.free_shipping.enabled', false);
    }

    public function test_inactive_methods_are_hidden_from_public_page(): void
    {
        ShippingMethod::query()
            ->where('code', 'tipax')
            ->update(['is_active' => false]);

        $this->getJson('/api/v1/shipping-info')
            ->assertOk()
            ->assertJsonCount(4, 'data.methods')
            ->assertJsonMissing(['name' => 'تیپاکس']);
    }

    public function test_admin_can_update_page_and_public_endpoint_refreshes(): void
    {
        $this->admin();

        // کش عمومی را پر می‌کنیم تا پاک شدن آن بعد از ذخیره بررسی شود.
        $this->getJson('/api/v1/shipping-info')->assertOk();

        $this->putJson('/api/v1/admin/shipping/page', [
            'title' => 'ارسال و تحویل سفارش‌ها',
            'intro' => 'ارسال سریع و مطمئن به سراسر کشور.',
            'notes' => [
                'بسته‌بندی کاملاً محرمانه است.',
                '   ',
                'کد رهگیری برای شما پیامک می‌شود.',
            ],
            'content' => '## زمان ارسال',
            'show_costs' => false,
        ])
            ->assertOk()
            ->assertJsonPath('data.title', 'ارسال و تحویل سفارش‌ها')
            ->assertJsonPath('data.show_costs', false)
            ->assertJsonCount(2, 'data.notes');

        $this->getJson('/api/v1/shipping-info')
            ->assertOk()
            ->assertJsonPath('data.title', 'ارسال و تحویل سفارش‌ها')
            ->assertJsonPath('data.intro', 'ارسال سریع و مطمئن به سراسر کشور.')
            ->assertJsonPath('data.show_costs', false)
            ->assertJsonCount(2, 'data.notes')
            ->assertJsonPath('data.notes.1', 'کد رهگیری برای شما پیامک می‌شود.')
            ->assertJsonPath('data.content', '## زمان ارسال')
            // روش‌ها مستقل از متن صفحه، از جدول روش‌های ارسال می‌آیند.
            ->assertJsonCount(5, 'data.methods');
    }

    public function test_page_title_is_required(): void
    {
        $this->admin();

        $this->putJson('/api/v1/admin/shipping/page', [
            'title' => '',
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['title']);
    }

    public function test_page_notes_are_limited(): void
    {
        $this->admin();

        $this->putJson('/api/v1/admin/shipping/page', [
            'title' => 'روش‌های ارسال',
            'notes' => array_fill(0, 11, 'نکته'),
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['notes']);
    }
}
