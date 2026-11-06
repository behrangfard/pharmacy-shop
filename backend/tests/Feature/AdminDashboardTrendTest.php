<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * نمودار روند فروش «نبض فروشگاه» در پنل مدیریت.
 */
class AdminDashboardTrendTest extends TestCase
{
    use RefreshDatabase;

    private function makeAdmin(): User
    {
        return User::factory()->create(['role' => 'admin']);
    }

    private function makeOrder(
        User $user,
        string $orderNumber,
        float $total,
        ?Carbon $createdAt = null,
        string $status = 'delivered',
        string $paymentStatus = 'paid'
    ): Order {
        $order = Order::query()->create([
            'user_id' => $user->id,
            'order_number' => $orderNumber,
            'subtotal' => $total,
            'shipping_cost' => 0,
            'discount' => 0,
            'tax_percent' => 0,
            'tax_amount' => 0,
            'total' => $total,
            'status' => $status,
            'payment_status' => $paymentStatus,
            'recipient_name' => 'مشتری تست',
            'phone' => '09120000000',
            'address' => 'آدرس تست',
        ]);

        if ($createdAt !== null) {
            $order->forceFill([
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ])->save();

            $order->refresh();
        }

        return $order;
    }

    public function test_sales_trend_returns_seven_day_series_by_default(): void
    {
        $admin = $this->makeAdmin();
        $customer = User::factory()->create(['role' => 'user']);

        $today = Carbon::now(config('app.timezone'))->startOfDay();

        $this->makeOrder($customer, 'TREND-001', 100000, $today->copy()->addHours(10));
        $this->makeOrder($customer, 'TREND-002', 50000, $today->copy()->subDays(2)->addHours(12));
        // سفارش لغوشده و سفارش پرداخت‌نشده نباید در نمودار و جمع فروش بیایند.
        $this->makeOrder($customer, 'TREND-003', 900000, $today, 'cancelled', 'paid');
        $this->makeOrder($customer, 'TREND-004', 700000, $today, 'delivered', 'unpaid');
        // سفارش قدیمی‌تر از بازه هفت‌روزه نباید در نقاط بازه بیاید.
        $this->makeOrder($customer, 'TREND-005', 300000, $today->copy()->subDays(20));

        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/v1/admin/dashboard/sales-trend');

        $response
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.range', '7d')
            ->assertJsonPath('data.granularity', 'day')
            ->assertJsonPath('data.summary.total_sales', 150000)
            ->assertJsonPath('data.summary.total_orders', 2)
            ->assertJsonCount(7, 'data.points');

        $points = collect($response->json('data.points'));

        $this->assertSame($today->toDateString(), $points->last()['date']);
        $this->assertSame(
            100000.0,
            (float) $points->firstWhere('date', $today->toDateString())['sales']
        );
        $this->assertSame(
            50000.0,
            (float) $points->firstWhere('date', $today->copy()->subDays(2)->toDateString())['sales']
        );
        $this->assertSame(0.0, (float) $points->firstWhere('date', $today->copy()->subDays(3)->toDateString())['sales']);
    }

    public function test_sales_trend_supports_thirty_days_and_twelve_months(): void
    {
        Sanctum::actingAs($this->makeAdmin());

        $this->getJson('/api/v1/admin/dashboard/sales-trend?range=30d')
            ->assertOk()
            ->assertJsonPath('data.range', '30d')
            ->assertJsonPath('data.granularity', 'day')
            ->assertJsonCount(30, 'data.points');

        $this->getJson('/api/v1/admin/dashboard/sales-trend?range=12m')
            ->assertOk()
            ->assertJsonPath('data.range', '12m')
            ->assertJsonPath('data.granularity', 'month')
            ->assertJsonCount(12, 'data.points');
    }

    public function test_sales_trend_aggregates_monthly_totals(): void
    {
        $admin = $this->makeAdmin();
        $customer = User::factory()->create(['role' => 'user']);

        $threeMonthsAgo = Carbon::now(config('app.timezone'))
            ->startOfMonth()
            ->subMonthsNoOverflow(3)
            ->addDays(2)
            ->addHours(11);

        $this->makeOrder($customer, 'TREND-MONTH-001', 250000, $threeMonthsAgo);

        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/v1/admin/dashboard/sales-trend?range=12m')->assertOk();

        $points = collect($response->json('data.points'));
        $expectedKey = $threeMonthsAgo->format('Y-m');
        $monthPoint = $points->firstWhere('key', $expectedKey);

        $this->assertNotNull($monthPoint);
        $this->assertSame(250000.0, (float) $monthPoint['sales']);
        $this->assertSame(1, (int) $monthPoint['orders']);
        $this->assertSame(250000.0, (float) $response->json('data.summary.total_sales'));
        $this->assertSame($expectedKey, $response->json('data.summary.peak.key'));
    }

    public function test_sales_trend_compares_with_previous_period(): void
    {
        $admin = $this->makeAdmin();
        $customer = User::factory()->create(['role' => 'user']);

        $today = Carbon::now(config('app.timezone'))->startOfDay();

        // بازه فعلی: ۱۵۰٬۰۰۰ تومان / بازه قبل: ۱۰۰٬۰۰۰ تومان => رشد ۵۰ درصد.
        $this->makeOrder($customer, 'TREND-CMP-001', 150000, $today->copy()->addHours(9));
        $this->makeOrder($customer, 'TREND-CMP-002', 100000, $today->copy()->subDays(9)->addHours(9));

        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/admin/dashboard/sales-trend?range=7d')
            ->assertOk()
            ->assertJsonPath('data.summary.total_sales', 150000)
            ->assertJsonPath('data.summary.previous_total_sales', 100000)
            ->assertJsonPath('data.summary.change_percent', 50);
    }

    public function test_sales_trend_rejects_unknown_range(): void
    {
        Sanctum::actingAs($this->makeAdmin());

        $this->getJson('/api/v1/admin/dashboard/sales-trend?range=90d')
            ->assertStatus(422)
            ->assertJsonValidationErrors('range');
    }

    public function test_guest_cannot_access_sales_trend(): void
    {
        $this->getJson('/api/v1/admin/dashboard/sales-trend')->assertUnauthorized();
    }

    public function test_regular_user_cannot_access_sales_trend(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'user']));

        $this->getJson('/api/v1/admin/dashboard/sales-trend')->assertForbidden();
    }
}
