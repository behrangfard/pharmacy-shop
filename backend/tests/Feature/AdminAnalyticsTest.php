<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\User;
use App\Support\AdminRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * تحلیل کمپین‌ها: فروش به تفکیک منبع، نوع ترافیک، کمپین و ارجاع‌دهنده.
 *
 * دادهٔ گزارش فقط از ستون‌های انتساب سفارش خوانده می‌شود؛ پس تست‌ها مستقیم
 * سفارش می‌سازند و روی تعریف «سفارش معتبر» (بدون لغوشده) و جمع‌شدن مقادیر
 * خالی در ردیف (direct) تمرکز دارند.
 */
class AdminAnalyticsTest extends TestCase
{
    use RefreshDatabase;

    private User $customer;

    private int $orderCounter = 0;

    protected function setUp(): void
    {
        parent::setUp();

        $this->customer = User::factory()->create(['role' => 'user']);
    }

    private function makeAdmin(string $role = AdminRole::SUPER_ADMIN): User
    {
        return User::factory()->create([
            'role' => 'admin',
            'admin_role' => $role,
        ]);
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function makeOrder(array $overrides = []): Order
    {
        $this->orderCounter++;

        return Order::query()->create(array_merge([
            'user_id' => $this->customer->id,
            'order_number' => 'AN-'.$this->orderCounter,
            'subtotal' => 100000,
            'total' => 100000,
            'status' => 'processing',
            'payment_status' => 'paid',
            'recipient_name' => 'مشتری تست',
            'phone' => '09120000000',
            'address' => 'آدرس تست',
        ], $overrides));
    }

    public function test_guest_cannot_access_traffic_analytics(): void
    {
        $this->getJson('/api/v1/admin/analytics/traffic')->assertUnauthorized();
    }

    public function test_customer_cannot_access_traffic_analytics(): void
    {
        Sanctum::actingAs($this->customer);

        $this->getJson('/api/v1/admin/analytics/traffic')->assertForbidden();
    }

    public function test_product_manager_cannot_access_traffic_analytics(): void
    {
        Sanctum::actingAs($this->makeAdmin(AdminRole::PRODUCT_MANAGER));

        $this->getJson('/api/v1/admin/analytics/traffic')
            ->assertForbidden()
            ->assertJsonPath('required_permission', AdminRole::ANALYTICS_VIEW);
    }

    public function test_order_manager_can_access_traffic_analytics(): void
    {
        Sanctum::actingAs($this->makeAdmin(AdminRole::ORDER_MANAGER));

        $this->getJson('/api/v1/admin/analytics/traffic')->assertOk();
    }

    public function test_traffic_analytics_groups_orders_by_attribution(): void
    {
        $this->makeOrder([
            'total' => 200000,
            'utm_source' => 'instagram',
            'utm_medium' => 'social',
            'utm_campaign' => 'yalda',
            'utm_content' => 'story-1',
            'referrer' => 'https://instagram.com/p/abc',
        ]);

        $this->makeOrder([
            'total' => 100000,
            'utm_source' => 'instagram',
            'utm_medium' => 'social',
            'utm_campaign' => 'yalda',
        ]);

        $this->makeOrder([
            'total' => 400000,
            'utm_source' => 'google',
            'utm_medium' => 'cpc',
            'utm_campaign' => 'brand',
        ]);

        $this->makeOrder(['total' => 50000]);

        Sanctum::actingAs($this->makeAdmin());

        $response = $this->getJson('/api/v1/admin/analytics/traffic?days=30');

        $response
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.range.days', 30)
            ->assertJsonPath('data.summary.orders_count', 4)
            ->assertJsonPath('data.summary.utm_orders_count', 3)
            ->assertJsonPath('data.summary.tracked_orders_count', 3)
            ->assertJsonPath('data.summary.direct_orders_count', 1);

        $data = $response->json('data');

        $this->assertEquals(750000.0, $data['summary']['revenue']);
        $this->assertEquals(187500.0, $data['summary']['average_order_total']);
        $this->assertEquals(75.0, $data['summary']['utm_order_share']);
        $this->assertEquals(25.0, $data['summary']['direct_order_share']);

        $this->assertSame(['google', 'instagram', '(direct)'], array_column($data['sources'], 'source'));
        $this->assertSame([1, 2, 1], array_column($data['sources'], 'orders_count'));
        $this->assertEquals(400000.0, $data['sources'][0]['revenue']);
        $this->assertEquals(300000.0, $data['sources'][1]['revenue']);
        $this->assertEquals(53.3, $data['sources'][0]['revenue_share']);
        $this->assertEquals(150000.0, $data['sources'][1]['average_order_total']);

        $this->assertSame(['cpc', 'social', '(direct)'], array_column($data['mediums'], 'medium'));

        $this->assertSame(
            ['google', 'instagram', '(direct)'],
            array_column($data['campaigns'], 'source')
        );
        $this->assertSame(['brand', 'yalda', '(direct)'], array_column($data['campaigns'], 'campaign'));
        $this->assertSame(2, $data['campaigns'][1]['orders_count']);

        $this->assertSame(['(direct)', 'story-1'], array_column($data['contents'], 'content'));
        $this->assertSame(1, $data['contents'][1]['orders_count']);
    }

    public function test_cancelled_and_out_of_range_orders_are_ignored(): void
    {
        $this->makeOrder([
            'total' => 900000,
            'status' => 'cancelled',
            'utm_source' => 'instagram',
        ]);

        $old = $this->makeOrder([
            'total' => 800000,
            'utm_source' => 'google',
        ]);

        $old->forceFill(['created_at' => now()->subDays(60)])->save();

        $this->makeOrder([
            'total' => 120000,
            'utm_source' => 'telegram',
        ]);

        Sanctum::actingAs($this->makeAdmin());

        $data = $this->getJson('/api/v1/admin/analytics/traffic?days=30')
            ->assertOk()
            ->json('data');

        $this->assertSame(1, $data['summary']['orders_count']);
        $this->assertEquals(120000, $data['summary']['revenue']);
        $this->assertSame('telegram', $data['sources'][0]['source']);
    }

    public function test_referrers_are_grouped_by_domain(): void
    {
        $this->makeOrder([
            'total' => 100000,
            'referrer' => 'https://www.google.com/search?q=shop',
        ]);

        $this->makeOrder([
            'total' => 200000,
            'referrer' => 'https://google.com/url?q=shop',
        ]);

        $this->makeOrder([
            'total' => 300000,
            'referrer' => 'instagram.com/p/xyz',
        ]);

        Sanctum::actingAs($this->makeAdmin());

        $data = $this->getJson('/api/v1/admin/analytics/traffic')
            ->assertOk()
            ->json('data');

        $this->assertSame(['google.com', 'instagram.com'], array_column($data['referrers'], 'host'));
        $this->assertSame([2, 1], array_column($data['referrers'], 'orders_count'));
        $this->assertEquals(300000.0, $data['referrers'][0]['revenue']);
        $this->assertEquals(50.0, $data['referrers'][0]['revenue_share']);
    }

    public function test_empty_range_returns_zero_totals(): void
    {
        Sanctum::actingAs($this->makeAdmin());

        $data = $this->getJson('/api/v1/admin/analytics/traffic?days=7')
            ->assertOk()
            ->json('data');

        $this->assertSame(0, $data['summary']['orders_count']);
        $this->assertEquals(0, $data['summary']['revenue']);
        $this->assertEquals(0, $data['summary']['tracked_order_share']);
        $this->assertEquals(0, $data['summary']['direct_order_share']);
        $this->assertSame([], $data['sources']);
        $this->assertSame([], $data['campaigns']);
        $this->assertSame([], $data['referrers']);
    }

    public function test_days_parameter_is_validated(): void
    {
        Sanctum::actingAs($this->makeAdmin());

        $this->getJson('/api/v1/admin/analytics/traffic?days=0')
            ->assertStatus(422)
            ->assertJsonValidationErrors('days');

        $this->getJson('/api/v1/admin/analytics/traffic?days=400')
            ->assertStatus(422)
            ->assertJsonValidationErrors('days');
    }
}
