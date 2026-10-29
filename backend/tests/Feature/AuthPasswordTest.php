<?php

namespace Tests\Feature;
use Illuminate\Support\Facades\Auth;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthPasswordTest extends TestCase
{
    use RefreshDatabase;

    public function test_changing_password_revokes_existing_tokens(): void
    {
        $user = User::factory()->create([
            'password' => 'OldPassword123!',
        ]);

        $token = $user->createToken('password-test')->plainTextToken;

        $response = $this->withToken($token)->putJson(
            '/api/v1/auth/password',
            [
                'current_password' => 'OldPassword123!',
                'password' => 'NewPassword123!',
                'password_confirmation' => 'NewPassword123!',
            ]
        );

        $response->assertOk();

        $this->assertDatabaseMissing('personal_access_tokens', [
            'tokenable_id' => $user->id,
            'token' => hash('sha256', $token),
        ]);

       Auth::forgetGuards();

$this->withToken($token)
    ->getJson('/api/v1/auth/me')
    ->assertUnauthorized();
    }
}
