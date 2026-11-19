<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * عمر توکن‌های API (Sanctum).
 *
 * توکن مشتری و مدیر در `localStorage` نگه داشته می‌شوند؛ اگر هیچ انقضایی
 * نداشته باشند، توکن لو‌رفته تا ابد معتبر می‌ماند. پیش‌فرض پروژه ۳۰ روز است
 * (`SANCTUM_EXPIRATION`). سمت فرانت، پاسخ ۴۰۱ نشست را پاک می‌کند و پیام
 * «نشست منقضی شده» می‌دهد؛ این تست همان رفتار سرور را تضمین می‌کند.
 */
class TokenExpirationTest extends TestCase
{
    use RefreshDatabase;

    public function test_expiration_is_configured(): void
    {
        // صفر/تهی یعنی «بدون انقضا» و همان بدهی فنی قبلی است.
        $this->assertGreaterThan(
            0,
            (int) config('sanctum.expiration'),
            'sanctum.expiration باید مقدار مثبت داشته باشد.'
        );
    }

    public function test_token_stops_working_after_expiration_window(): void
    {
        $user = User::factory()->create(['role' => 'user']);

        $token = $user->createToken('expiry-test')->plainTextToken;

        /*
         * زمان را یک دقیقه بعد از پایان عمر توکن جلو می‌بریم. درخواست قبلی در
         * همین تست ساخته نمی‌شود تا گارد احراز هویت کاربرِ کش‌شده را برنگرداند.
         */
        $this->travel((int) config('sanctum.expiration') + 1)->minutes();

        $this->withToken($token)
            ->getJson('/api/v1/auth/me')
            ->assertUnauthorized();
    }

    public function test_fresh_token_still_works_inside_expiration_window(): void
    {
        $user = User::factory()->create(['role' => 'user']);

        $token = $user->createToken('fresh-test')->plainTextToken;

        $this->travel((int) config('sanctum.expiration') - 60)->minutes();

        $this->withToken($token)
            ->getJson('/api/v1/auth/me')
            ->assertOk();
    }
}
