<?php

namespace Tests\Feature;

use App\Models\BirthdayGreeting;
use App\Models\StoreSetting;
use App\Models\User;
use App\Support\JalaliDate;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Throwable;

class BirthdayGreetingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'messaging.timeout' => 5,
            'messaging.audience_limit' => 50,

            'messaging.channels.sms.enabled' => true,
            'messaging.channels.sms.driver' => 'kavenegar',
            'messaging.channels.sms.api_key' => 'sms-test-key',
            'messaging.channels.sms.sender' => '10004346',
            'messaging.channels.sms.base_url' => 'https://api.kavenegar.com',

            'messaging.channels.telegram.enabled' => false,
            'messaging.channels.telegram.bot_token' => null,
            'messaging.channels.telegram.chat_id' => null,
        ]);
    }

    private function admin(): User
    {
        $admin = User::factory()->create(['role' => 'admin']);

        Sanctum::actingAs($admin);

        return $admin;
    }

    /**
     * تاریخ میلادی‌ای که در تقویم شمسی «امروز» تولد حساب می‌شود.
     */
    private function birthDateForToday(): string
    {
        $today = JalaliDate::today();

        foreach (range(1355, 1385) as $year) {
            $gregorian = JalaliDate::toGregorian($year, $today['jm'], $today['jd']);

            try {
                $date = Carbon::create($gregorian['gy'], $gregorian['gm'], $gregorian['gd']);
            } catch (Throwable) {
                continue;
            }

            if ($date === null) {
                continue;
            }

            if (JalaliDate::key(JalaliDate::fromDate($date)) === JalaliDate::key($today)) {
                return $date->format('Y-m-d');
            }
        }

        return Carbon::now()->subYears(30)->format('Y-m-d');
    }

    /**
     * مشتری‌ای که تولدش امروز است.
     */
    private function birthdayCustomer(array $attributes = []): User
    {
        return User::factory()->create(array_merge([
            'role' => 'customer',
            'phone' => '09121234567',
            'birth_date' => $this->birthDateForToday(),
        ], $attributes));
    }

    private function enableBirthday(string $sendTime = '00:00'): void
    {
        StoreSetting::setValue('birthday_greeting_enabled', '1');
        StoreSetting::setValue('birthday_greeting_channel', 'sms');
        StoreSetting::setValue('birthday_greeting_send_time', $sendTime);
    }

    public function test_registration_accepts_optional_mobile_and_birth_date(): void
    {
        $this->postJson('/api/v1/auth/register', [
            'name' => 'سارا محمدی',
            'email' => 'sara@example.com',
            'phone' => '۰۹۱۲۳۴۵۶۷۸۹',
            'birth_date' => '1995-06-14',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])->assertCreated()
            ->assertJsonPath('user.phone', '09123456789')
            ->assertJsonPath('user.birth_date', '1995-06-14');

        $this->assertDatabaseHas('users', [
            'email' => 'sara@example.com',
            'phone' => '09123456789',
            'birth_date' => '1995-06-14',
        ]);
    }

    public function test_mobile_and_birth_date_are_optional_at_registration(): void
    {
        $this->postJson('/api/v1/auth/register', [
            'name' => 'مهمان',
            'email' => 'guest@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])->assertCreated();

        $this->assertDatabaseHas('users', [
            'email' => 'guest@example.com',
            'phone' => null,
            'birth_date' => null,
        ]);
    }

    public function test_birthday_endpoints_are_protected(): void
    {
        $this->getJson('/api/v1/admin/messaging/birthday')->assertStatus(401);

        Sanctum::actingAs(User::factory()->create(['role' => 'customer']));

        $this->getJson('/api/v1/admin/messaging/birthday')->assertStatus(403);
        $this->putJson('/api/v1/admin/messaging/birthday', [])->assertStatus(403);
        $this->postJson('/api/v1/admin/messaging/birthday/send')->assertStatus(403);
    }

    public function test_overview_lists_todays_birthdays_and_default_settings(): void
    {
        $this->admin();
        $customer = $this->birthdayCustomer();

        $response = $this->getJson('/api/v1/admin/messaging/birthday');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.settings.enabled', false)
            ->assertJsonPath('data.settings.channel', 'sms')
            ->assertJsonPath('data.settings.send_time', '10:00')
            ->assertJsonPath('data.stats.today', 1)
            ->assertJsonPath('data.today.0.id', $customer->id)
            ->assertJsonPath('data.today.0.mobile', '09121234567')
            ->assertJsonPath('data.today.0.opted_out', false);

        $this->assertStringContainsString('فروشگاه', $response->json('data.preview'));
    }

    public function test_admin_can_update_birthday_settings(): void
    {
        $this->admin();

        $this->putJson('/api/v1/admin/messaging/birthday', [
            'enabled' => true,
            'channel' => 'sms',
            'template' => '{first_name} جان، تولدت مبارک! — {store}',
            'send_time' => '09:30',
        ])->assertOk()
            ->assertJsonPath('data.settings.enabled', true)
            ->assertJsonPath('data.settings.send_time', '09:30');

        $this->assertDatabaseHas('store_settings', [
            'key' => 'birthday_greeting_enabled',
            'value' => '1',
        ]);

        $this->assertDatabaseHas('store_settings', [
            'key' => 'birthday_greeting_send_time',
            'value' => '09:30',
        ]);

        $this->putJson('/api/v1/admin/messaging/birthday', [
            'enabled' => true,
            'channel' => 'sms',
            'template' => 'کوتاه',
            'send_time' => '25:00',
        ])->assertStatus(422)->assertJsonValidationErrors(['template', 'send_time']);
    }

    public function test_admin_can_send_birthday_greetings_without_duplicates(): void
    {
        $this->admin();
        $this->enableBirthday();
        $customer = $this->birthdayCustomer(['name' => 'سارا محمدی']);

        Http::fake([
            'api.kavenegar.com/*' => Http::response([
                'return' => ['status' => 200],
                'entries' => [['messageid' => 1]],
            ], 200),
        ]);

        $this->postJson('/api/v1/admin/messaging/birthday/send')
            ->assertOk()
            ->assertJsonPath('data.total', 1)
            ->assertJsonPath('data.sent', 1)
            ->assertJsonPath('data.skipped', 0);

        $this->assertDatabaseCount('outbound_messages', 1);
        $this->assertDatabaseHas('birthday_greetings', [
            'user_id' => $customer->id,
            'status' => BirthdayGreeting::STATUS_SENT,
        ]);

        $this->postJson('/api/v1/admin/messaging/birthday/send')
            ->assertOk()
            ->assertJsonPath('data.sent', 0)
            ->assertJsonPath('data.skipped', 1);

        $this->assertDatabaseCount('outbound_messages', 1);

        $this->postJson('/api/v1/admin/messaging/birthday/send', ['force' => true])
            ->assertOk()
            ->assertJsonPath('data.sent', 1);

        $this->assertDatabaseCount('outbound_messages', 2);
        $this->assertDatabaseCount('birthday_greetings', 1);
    }

    public function test_birthday_send_requires_available_channel(): void
    {
        $this->admin();
        $this->enableBirthday();
        StoreSetting::setValue('birthday_greeting_channel', 'telegram');
        $this->birthdayCustomer();

        $this->postJson('/api/v1/admin/messaging/birthday/send')
            ->assertStatus(422)
            ->assertJsonValidationErrors('channel');
    }

    public function test_scheduled_command_respects_toggle_and_send_time(): void
    {
        $this->birthdayCustomer(['phone' => '09121110000']);

        Http::fake([
            'api.kavenegar.com/*' => Http::response([
                'return' => ['status' => 200],
                'entries' => [['messageid' => 2]],
            ], 200),
        ]);

        $this->travelTo(Carbon::now()->setTime(12, 0));

        // غیرفعال
        $this->artisan('birthday:greetings')->assertExitCode(0);
        $this->assertDatabaseCount('outbound_messages', 0);

        // فعال، ولی ساعت تنظیم‌شده نرسیده است
        $this->enableBirthday('23:59');
        $this->artisan('birthday:greetings')->assertExitCode(0);
        $this->assertDatabaseCount('outbound_messages', 0);

        // ساعت رسیده است
        $this->enableBirthday('00:00');
        $this->artisan('birthday:greetings')->assertExitCode(0);
        $this->assertDatabaseCount('outbound_messages', 1);

        // اجرای دوباره در همان روز پیام تکراری نمی‌فرستد
        $this->artisan('birthday:greetings')->assertExitCode(0);
        $this->assertDatabaseCount('outbound_messages', 1);
    }

    public function test_command_skips_opted_out_and_users_without_mobile(): void
    {
        $this->enableBirthday('00:00');

        $active = $this->birthdayCustomer(['phone' => '09121110000']);
        $optedOut = $this->birthdayCustomer([
            'phone' => '09122220000',
            'birthday_greeting_opt_out' => true,
        ]);
        $withoutMobile = $this->birthdayCustomer([
            'phone' => null,
            'birthday_greeting_opt_out' => false,
        ]);

        Http::fake([
            'api.kavenegar.com/*' => Http::response([
                'return' => ['status' => 200],
                'entries' => [['messageid' => 3]],
            ], 200),
        ]);

        $this->travelTo(Carbon::now()->setTime(12, 0));

        $this->artisan('birthday:greetings')->assertExitCode(0);

        $this->assertDatabaseCount('outbound_messages', 1);
        $this->assertDatabaseHas('outbound_messages', ['recipient' => '09121110000']);
        $this->assertDatabaseHas('birthday_greetings', ['user_id' => $active->id]);
        $this->assertDatabaseMissing('birthday_greetings', ['user_id' => $optedOut->id]);
        $this->assertDatabaseMissing('birthday_greetings', ['user_id' => $withoutMobile->id]);
    }

    public function test_mobile_falls_back_to_last_order_phone(): void
    {
        $this->admin();
        $this->enableBirthday();

        $customer = $this->birthdayCustomer(['phone' => null]);

        DB::table('orders')->insert([
            'user_id' => $customer->id,
            'order_number' => 'BDAY-1',
            'subtotal' => 100000,
            'shipping_cost' => 0,
            'discount' => 0,
            'total' => 100000,
            'status' => 'delivered',
            'payment_status' => 'paid',
            'recipient_name' => 'سارا محمدی',
            'phone' => '۰۹۱۲۵۵۵۶۶۶۷',
            'address' => 'تهران',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->getJson('/api/v1/admin/messaging/birthday')
            ->assertOk()
            ->assertJsonPath('data.today.0.mobile', '09125556667')
            ->assertJsonPath('data.today.0.mobile_source', 'order');
    }
}
