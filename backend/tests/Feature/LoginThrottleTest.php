<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * تست‌های محدودیت نرخ ورود (قفل حساب پس از تلاش‌های ناموفق) و throttle مسیر auth.
 */
class LoginThrottleTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_locks_after_five_failed_attempts(): void
    {
        User::factory()->create([
            'email' => 'locked@example.com',
            'password' => 'correct-password',
            'role' => 'user',
        ]);

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/auth/login', [
                'email' => 'locked@example.com',
                'password' => 'wrong-password',
            ])->assertStatus(422);
        }

        $this->postJson('/api/v1/auth/login', [
            'email' => 'locked@example.com',
            'password' => 'wrong-password',
        ])->assertStatus(429)
            ->assertJsonPath('success', false);

        // حتی با رمز عبور صحیح هم تا پایان قفل اجازهٔ ورود نیست.
        $this->postJson('/api/v1/auth/login', [
            'email' => 'locked@example.com',
            'password' => 'correct-password',
        ])->assertStatus(429)
            ->assertJsonPath('success', false);
    }

    public function test_successful_login_resets_failed_attempts(): void
    {
        User::factory()->create([
            'email' => 'reset@example.com',
            'password' => 'correct-password',
            'role' => 'user',
        ]);

        for ($i = 0; $i < 4; $i++) {
            $this->postJson('/api/v1/auth/login', [
                'email' => 'reset@example.com',
                'password' => 'wrong-password',
            ])->assertStatus(422);
        }

        $this->postJson('/api/v1/auth/login', [
            'email' => 'reset@example.com',
            'password' => 'correct-password',
        ])->assertOk();

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/auth/login', [
                'email' => 'reset@example.com',
                'password' => 'wrong-password',
            ])->assertStatus(422);
        }

        $this->postJson('/api/v1/auth/login', [
            'email' => 'reset@example.com',
            'password' => 'wrong-password',
        ])->assertStatus(429);
    }

    public function test_auth_route_is_rate_limited_per_ip(): void
    {
        for ($i = 0; $i < 15; $i++) {
            $this->postJson('/api/v1/auth/login', [
                'email' => "flood-{$i}@example.com",
                'password' => 'wrong-password',
            ])->assertStatus(422);
        }

        $this->postJson('/api/v1/auth/login', [
            'email' => 'flood-16@example.com',
            'password' => 'wrong-password',
        ])->assertStatus(429)
            ->assertJsonPath('success', false);
    }
}
