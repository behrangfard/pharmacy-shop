<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\StoreSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminStoreSettingTest extends TestCase
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

    public function test_public_store_settings_return_defaults(): void
    {
        $this->getJson('/api/v1/store-settings')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath(
                'data.store_name',
                StoreSetting::DEFAULTS['store_name']
            )
            ->assertJsonPath('data.vat_enabled', false)
            ->assertJsonPath('data.shipping_cost', 0);
    }

    public function test_admin_can_update_settings_and_public_endpoint_refreshes(): void
    {
        $this->admin();

        // کش را از قبل پر می‌کنیم تا پاک‌شدن آن پس از ویرایش بررسی شود.
        $this->getJson('/api/v1/store-settings')->assertOk();

        $this->putJson('/api/v1/admin/settings', [
            'store_name' => 'فروشگاه تست',
            'store_slogan' => 'شعار تست',
            'store_phone' => '02111111111',
            'store_mobile' => '09121111111',
            'store_email' => 'test@example.com',
            'store_address' => 'تهران، تست',
            'store_working_hours' => 'همه روزه',
            'support_note' => 'پشتیبانی تست',
            'shipping_note' => 'ارسال تست',
            'return_policy_days' => 5,
            'vat_enabled' => true,
            'vat_percent' => 9,
            'shipping_cost' => 50000,
            'free_shipping_enabled' => true,
            'free_shipping_threshold' => 500000,
        ])
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.store_name', 'فروشگاه تست');

        $this->getJson('/api/v1/store-settings')
            ->assertOk()
            ->assertJsonPath('data.store_name', 'فروشگاه تست')
            ->assertJsonPath('data.vat_enabled', true)
            ->assertJsonPath('data.vat_percent', 9)
            ->assertJsonPath('data.shipping_cost', 50000)
            ->assertJsonPath('data.free_shipping_enabled', true)
            ->assertJsonPath('data.free_shipping_threshold', 500000)
            ->assertJsonPath('data.return_policy_days', 5);
    }

    public function test_guest_cannot_update_store_settings(): void
    {
        $this->putJson('/api/v1/admin/settings', [
            'store_name' => 'x',
            'vat_enabled' => false,
            'free_shipping_enabled' => false,
        ])->assertUnauthorized();
    }

    public function test_shipping_cost_and_free_shipping_apply_to_new_orders(): void
    {
        StoreSetting::setValue('shipping_cost', '30000');
        StoreSetting::setValue('free_shipping_enabled', '1');
        StoreSetting::setValue('free_shipping_threshold', '200000');
        StoreSetting::forgetCache();

        $user = User::factory()->create(['role' => 'user']);

        $category = Category::query()->create([
            'name' => 'Shipping Test Category',
            'slug' => 'shipping-test-category',
            'is_active' => true,
            'sort_order' => 0,
        ]);

        $product = Product::query()->create([
            'category_id' => $category->id,
            'name' => 'Shipping Test Product',
            'slug' => 'shipping-test-product',
            'sku' => 'SHIPPING-TEST-001',
            'price' => 50000,
            'stock' => 10,
            'discount_percent' => 0,
            'is_active' => true,
            'is_taxable' => false,
        ]);

        Sanctum::actingAs($user);

        $payload = [
            'recipient_name' => 'Test User',
            'phone' => '09120000000',
            'address' => 'Test address',
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 1,
                ],
            ],
        ];

        $this->withHeader('Idempotency-Key', '550e8400-e29b-41d4-a716-446655441001')
            ->postJson('/api/v1/orders', $payload)
            ->assertCreated()
            ->assertJsonPath('data.shipping_cost', '30000.00')
            ->assertJsonPath('data.total', '80000.00');

        $payload['items'][0]['quantity'] = 4;

        $this->withHeader('Idempotency-Key', '550e8400-e29b-41d4-a716-446655441002')
            ->postJson('/api/v1/orders', $payload)
            ->assertCreated()
            ->assertJsonPath('data.shipping_cost', '0.00')
            ->assertJsonPath('data.total', '200000.00');
    }
}
