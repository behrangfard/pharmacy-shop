<?php

namespace Tests\Feature;

use App\Models\Address;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * دفترچهٔ آدرس مشتری.
 *
 * مشتری باید بتواند چند آدرس ثبت کند، یکی را پیش‌فرض کند و آدرس‌های خودش را
 * ویرایش/حذف کند؛ آدرس کاربران دیگر نباید در دسترس باشد.
 */
class AddressTest extends TestCase
{
    use RefreshDatabase;

    private function customer(): User
    {
        $user = User::factory()->create(['role' => 'customer']);

        Sanctum::actingAs($user);

        return $user;
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return array_merge([
            'title' => 'خانه',
            'recipient_name' => 'بهرنگ تست',
            'phone' => '09121234567',
            'province' => 'تهران',
            'city' => 'تهران',
            'address' => 'خیابان ولیعصر، کوچهٔ اول، پلاک ۲',
            'postal_code' => '1234567890',
            'latitude' => 35.6892,
            'longitude' => 51.389,
        ], $overrides);
    }

    public function test_customer_can_create_multiple_addresses_and_first_is_default(): void
    {
        $this->customer();

        $first = $this->postJson('/api/v1/addresses', $this->payload())
            ->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.is_default', true)
            ->json('data');

        $second = $this->postJson('/api/v1/addresses', $this->payload([
            'title' => 'محل کار',
            'city' => 'کرج',
        ]))
            ->assertCreated()
            ->assertJsonPath('data.is_default', false)
            ->json('data');

        $this->assertNotSame($first['id'], $second['id']);

        $this->getJson('/api/v1/addresses')
            ->assertOk()
            ->assertJsonPath('data.total', 2)
            ->assertJsonPath('data.items.0.id', $first['id'])
            ->assertJsonPath('data.items.0.full_address', 'تهران، تهران، خیابان ولیعصر، کوچهٔ اول، پلاک ۲');
    }

    public function test_customer_can_change_default_address(): void
    {
        $this->customer();

        $first = $this->postJson('/api/v1/addresses', $this->payload())
            ->json('data');

        $second = $this->postJson('/api/v1/addresses', $this->payload([
            'title' => 'محل کار',
        ]))
            ->json('data');

        $this->patchJson("/api/v1/addresses/{$second['id']}/default")
            ->assertOk()
            ->assertJsonPath('data.is_default', true);

        $this->assertFalse(Address::query()->findOrFail($first['id'])->is_default);
        $this->assertTrue(Address::query()->findOrFail($second['id'])->is_default);
    }

    public function test_customer_can_update_and_delete_address(): void
    {
        $this->customer();

        $address = $this->postJson('/api/v1/addresses', $this->payload())
            ->json('data');

        $this->putJson("/api/v1/addresses/{$address['id']}", $this->payload([
            'title' => 'دفتر',
            'city' => 'اصفهان',
            'postal_code' => null,
        ]))
            ->assertOk()
            ->assertJsonPath('data.title', 'دفتر')
            ->assertJsonPath('data.city', 'اصفهان')
            ->assertJsonPath('data.postal_code', null);

        $this->deleteJson("/api/v1/addresses/{$address['id']}")
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseCount('addresses', 0);
    }

    public function test_deleting_default_address_promotes_remaining_address(): void
    {
        $this->customer();

        $first = $this->postJson('/api/v1/addresses', $this->payload())
            ->json('data');

        $second = $this->postJson('/api/v1/addresses', $this->payload([
            'title' => 'محل کار',
        ]))
            ->json('data');

        $this->deleteJson("/api/v1/addresses/{$first['id']}")->assertOk();

        $this->assertTrue(Address::query()->findOrFail($second['id'])->is_default);
    }

    public function test_customer_cannot_touch_another_customers_address(): void
    {
        $this->customer();

        $address = $this->postJson('/api/v1/addresses', $this->payload())
            ->json('data');

        $otherUser = User::factory()->create(['role' => 'customer']);

        Sanctum::actingAs($otherUser);

        $this->putJson(
            "/api/v1/addresses/{$address['id']}",
            $this->payload()
        )->assertNotFound();

        $this->deleteJson("/api/v1/addresses/{$address['id']}")
            ->assertNotFound();

        $this->patchJson("/api/v1/addresses/{$address['id']}/default")
            ->assertNotFound();

        $this->getJson('/api/v1/addresses')
            ->assertOk()
            ->assertJsonPath('data.total', 0);
    }

    public function test_address_requires_owner_fields(): void
    {
        $this->customer();

        $this->postJson('/api/v1/addresses', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors([
                'recipient_name',
                'phone',
                'province',
                'city',
                'address',
            ]);
    }

    public function test_guest_cannot_manage_addresses(): void
    {
        $this->getJson('/api/v1/addresses')->assertUnauthorized();

        $this->postJson('/api/v1/addresses', $this->payload())
            ->assertUnauthorized();
    }
}
