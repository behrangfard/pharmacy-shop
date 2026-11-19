<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\User;
use App\Support\GuestAccessCode;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * کامند orders:backfill-guest-access-codes.
 *
 * ستون `guest_access_code` بعد از راه‌اندازی اضافه شد؛ این تست‌ها مطمئن
 * می‌شوند فقط سفارش‌های مهمانِ بدون کد مقدار می‌گیرند، کد موجود دست‌نخورده
 * می‌ماند، کدها یکتا هستند و کد ساخته‌شده واقعاً برای بازیابی دسترسی کار می‌کند.
 */
class GuestAccessCodeBackfillTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function createGuestOrder(array $attributes = []): Order
    {
        return Order::query()->create(array_merge([
            'user_id' => null,
            'guest_token' => (string) Str::uuid(),
            'order_number' => 'BK-'.Str::upper(Str::random(8)),
            'subtotal' => 100000,
            'shipping_cost' => 0,
            'discount' => 0,
            'coupon_discount' => 0,
            'tax_percent' => 0,
            'tax_amount' => 0,
            'total' => 100000,
            'status' => 'processing',
            'payment_status' => 'unpaid',
            'payment_method' => 'cod',
            'recipient_name' => 'مهمان قدیمی',
            'phone' => '09120000000',
            'address' => 'تهران، خیابان تست',
            'postal_code' => null,
            'notes' => null,
        ], $attributes));
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function createUserOrder(array $attributes = []): Order
    {
        return $this->createGuestOrder(array_merge([
            'user_id' => User::factory()->create(['role' => 'user'])->id,
            'guest_token' => null,
        ], $attributes));
    }

    public function test_command_fills_the_code_for_guest_orders_without_one(): void
    {
        $order = $this->createGuestOrder();

        $this->artisan('orders:backfill-guest-access-codes')->assertSuccessful();

        $order->refresh();

        $this->assertNotNull($order->guest_access_code);
        $this->assertSame(8, strlen($order->guest_access_code));
        $this->assertTrue(GuestAccessCode::isValid($order->guest_access_code));
        // کاراکترهای مبهم نباید در کد باشند.
        $this->assertDoesNotMatchRegularExpression('/[IO01]/', $order->guest_access_code);
    }

    public function test_command_ignores_registered_user_orders(): void
    {
        $order = $this->createUserOrder();

        $this->artisan('orders:backfill-guest-access-codes')->assertSuccessful();

        $this->assertNull($order->refresh()->guest_access_code);
    }

    public function test_command_keeps_an_existing_code(): void
    {
        $order = $this->createGuestOrder(['guest_access_code' => 'ABCD2345']);

        $this->artisan('orders:backfill-guest-access-codes')->assertSuccessful();

        $this->assertSame('ABCD2345', $order->refresh()->guest_access_code);
    }

    public function test_command_is_idempotent(): void
    {
        $order = $this->createGuestOrder();

        $this->artisan('orders:backfill-guest-access-codes')->assertSuccessful();
        $firstCode = $order->refresh()->guest_access_code;

        $this->artisan('orders:backfill-guest-access-codes')->assertSuccessful();

        $this->assertSame($firstCode, $order->refresh()->guest_access_code);
    }

    public function test_command_assigns_a_different_code_to_each_order(): void
    {
        $orders = [
            $this->createGuestOrder(),
            $this->createGuestOrder(),
            $this->createGuestOrder(),
        ];

        $this->artisan('orders:backfill-guest-access-codes')->assertSuccessful();

        $codes = collect($orders)
            ->map(fn (Order $order): ?string => $order->refresh()->guest_access_code);

        $this->assertCount(3, $codes->filter());
        $this->assertCount(3, $codes->unique());
    }

    public function test_dry_run_does_not_save_anything(): void
    {
        $order = $this->createGuestOrder();

        $this->artisan('orders:backfill-guest-access-codes', ['--dry-run' => true])
            ->assertSuccessful();

        $this->assertNull($order->refresh()->guest_access_code);
    }

    public function test_limit_option_processes_only_the_requested_number(): void
    {
        $orders = [
            $this->createGuestOrder(),
            $this->createGuestOrder(),
            $this->createGuestOrder(),
        ];

        $this->artisan('orders:backfill-guest-access-codes', ['--limit' => 2])
            ->assertSuccessful();

        $withCode = collect($orders)
            ->filter(fn (Order $order): bool => $order->refresh()->guest_access_code !== null);

        $this->assertCount(2, $withCode);
    }

    public function test_guest_order_without_browser_token_is_skipped(): void
    {
        $order = $this->createGuestOrder(['guest_token' => null]);

        $this->artisan('orders:backfill-guest-access-codes')->assertSuccessful();

        $this->assertNull($order->refresh()->guest_access_code);
    }

    public function test_backfilled_code_recovers_guest_access(): void
    {
        $order = $this->createGuestOrder([
            'guest_token' => '550e8400-e29b-41d4-a716-446655440901',
        ]);

        $this->artisan('orders:backfill-guest-access-codes')->assertSuccessful();

        $code = $order->refresh()->guest_access_code;

        $this->assertNotNull($code);

        $response = $this->postJson('/api/v1/orders/recover', [
            'order_number' => $order->order_number,
            'access_code' => $code,
        ])->assertOk();

        $this->assertSame(
            '550e8400-e29b-41d4-a716-446655440901',
            $response->json('data.guest_token')
        );
    }

    public function test_command_reports_when_there_is_nothing_to_do(): void
    {
        $this->artisan('orders:backfill-guest-access-codes')
            ->expectsOutput('همهٔ سفارش‌های مهمان کد پیگیری دارند.')
            ->assertSuccessful();
    }
}
