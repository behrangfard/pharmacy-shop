<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminUserManagementTest extends TestCase
{
    use RefreshDatabase;

    private function makeAdmin(string $email = 'admin@behrang-shop.local'): User
    {
        return User::create([
            'name' => 'مدیر اصلی',
            'email' => $email,
            'password' => 'password',
            'role' => 'admin',
        ]);
    }

    public function test_admin_can_list_shop_admins(): void
    {
        $admin = $this->makeAdmin();
        $this->makeAdmin('second-admin@behrang-shop.local');
        $this->makeCustomer('customer@example.com');

        Sanctum::actingAs($admin);

        $response = $this->json('GET', '/api/v1/admin/admins');

        $response->assertOk();
        $response->assertJsonPath('success', true);
        $response->assertJsonPath('summary.total_admins', 2);
        $response->assertJsonPath('summary.current_admin_id', $admin->id);

        $emails = array_column($response->json('data.data'), 'email');

        $this->assertSame(
            ['admin@behrang-shop.local', 'second-admin@behrang-shop.local'],
            $emails
        );
    }

    public function test_admin_can_create_new_admin(): void
    {
        $admin = $this->makeAdmin();

        Sanctum::actingAs($admin);

        $response = $this->json('POST', '/api/v1/admin/admins', [
            'name' => 'مدیر دوم',
            'email' => 'New.Admin@Example.com',
            'password' => 'secret-password',
            'password_confirmation' => 'secret-password',
        ]);

        $response->assertCreated();
        $response->assertJsonPath('data.email', 'new.admin@example.com');

        $created = User::where('email', 'new.admin@example.com')->first();

        $this->assertNotNull($created);
        $this->assertSame('admin', $created->role);
        $this->assertTrue(Hash::check('secret-password', $created->password));

        // مدیر جدید می‌تواند با همین اطلاعات وارد پنل شود.
        $this->json('POST', '/api/v1/auth/login', [
            'email' => 'new.admin@example.com',
            'password' => 'secret-password',
        ])->assertOk()->assertJsonPath('user.role', 'admin');
    }

    public function test_new_admin_email_must_be_unique(): void
    {
        $admin = $this->makeAdmin();
        $this->makeCustomer('taken@example.com');

        Sanctum::actingAs($admin);

        $response = $this->json('POST', '/api/v1/admin/admins', [
            'name' => 'مدیر تکراری',
            'email' => 'taken@example.com',
            'password' => 'secret-password',
            'password_confirmation' => 'secret-password',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('email');
    }

    public function test_creating_admin_requires_confirmed_password(): void
    {
        $admin = $this->makeAdmin();

        Sanctum::actingAs($admin);

        $this->json('POST', '/api/v1/admin/admins', [
            'name' => 'مدیر بدون تکرار رمز',
            'email' => 'no-confirm@example.com',
            'password' => 'secret-password',
        ])->assertStatus(422)->assertJsonValidationErrors('password');

        $this->json('POST', '/api/v1/admin/admins', [
            'name' => 'مدیر با رمز کوتاه',
            'email' => 'short-pass@example.com',
            'password' => '1234',
            'password_confirmation' => '1234',
        ])->assertStatus(422)->assertJsonValidationErrors('password');
    }

    public function test_admin_can_update_own_account(): void
    {
        $admin = $this->makeAdmin();

        Sanctum::actingAs($admin);

        $response = $this->json('PUT', "/api/v1/admin/admins/{$admin->id}", [
            'name' => 'نام تازه مدیر',
            'email' => 'changed-admin@example.com',
            'password' => 'brand-new-password',
            'password_confirmation' => 'brand-new-password',
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.name', 'نام تازه مدیر');
        $response->assertJsonPath('data.email', 'changed-admin@example.com');

        $admin->refresh();

        $this->assertSame('changed-admin@example.com', $admin->email);
        $this->assertSame('admin', $admin->role);
        $this->assertTrue(Hash::check('brand-new-password', $admin->password));

        $this->json('POST', '/api/v1/auth/login', [
            'email' => 'changed-admin@example.com',
            'password' => 'brand-new-password',
        ])->assertOk();
    }

    public function test_updating_admin_without_password_keeps_current_password(): void
    {
        $admin = $this->makeAdmin();
        $oldPasswordHash = $admin->password;

        Sanctum::actingAs($admin);

        $this->json('PUT', "/api/v1/admin/admins/{$admin->id}", [
            'name' => 'فقط نام عوض شد',
            'email' => $admin->email,
            'password' => '',
            'password_confirmation' => '',
        ])->assertOk();

        $admin->refresh();

        $this->assertSame('فقط نام عوض شد', $admin->name);
        $this->assertSame($oldPasswordHash, $admin->password);
        $this->assertTrue(Hash::check('password', $admin->password));
    }

    public function test_admin_cannot_take_another_accounts_email(): void
    {
        $admin = $this->makeAdmin();
        $this->makeCustomer('busy@example.com');

        Sanctum::actingAs($admin);

        $this->json('PUT', "/api/v1/admin/admins/{$admin->id}", [
            'name' => 'مدیر',
            'email' => 'busy@example.com',
        ])->assertStatus(422)->assertJsonValidationErrors('email');

        $this->assertSame(
            'admin@behrang-shop.local',
            $admin->refresh()->email
        );
    }

    public function test_admin_account_routes_reject_customer_accounts(): void
    {
        $admin = $this->makeAdmin();
        $customer = $this->makeCustomer('customer@example.com');

        Sanctum::actingAs($admin);

        $this->json('PUT', "/api/v1/admin/admins/{$customer->id}", [
            'name' => 'تلاش برای ویرایش مشتری',
            'email' => $customer->email,
        ])->assertNotFound();

        $this->assertSame('customer', $customer->refresh()->role);
    }

    public function test_admin_cannot_delete_own_account(): void
    {
        $admin = $this->makeAdmin();

        Sanctum::actingAs($admin);

        $this->json('DELETE', "/api/v1/admin/admins/{$admin->id}")
            ->assertStatus(409);

        $this->assertDatabaseHas('users', [
            'id' => $admin->id,
            'role' => 'admin',
        ]);
    }

    public function test_admin_can_delete_another_admin(): void
    {
        $admin = $this->makeAdmin();
        $secondAdmin = $this->makeAdmin('second-admin@behrang-shop.local');

        Sanctum::actingAs($admin);

        $this->json('DELETE', "/api/v1/admin/admins/{$secondAdmin->id}")
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('users', ['id' => $secondAdmin->id]);
        $this->assertDatabaseHas('users', ['id' => $admin->id]);
    }

    public function test_customer_cannot_manage_shop_admins(): void
    {
        $this->makeAdmin();
        $customer = $this->makeCustomer('customer@example.com');

        Sanctum::actingAs($customer);

        $this->json('GET', '/api/v1/admin/admins')->assertForbidden();

        $this->json('POST', '/api/v1/admin/admins', [
            'name' => 'مدیر قلابی',
            'email' => 'fake-admin@example.com',
            'password' => 'secret-password',
            'password_confirmation' => 'secret-password',
        ])->assertForbidden();

        $this->assertDatabaseMissing('users', [
            'email' => 'fake-admin@example.com',
        ]);
    }

    private function makeCustomer(string $email): User
    {
        return User::create([
            'name' => 'مشتری نمونه',
            'email' => $email,
            'password' => 'password',
            'role' => 'customer',
        ]);
    }
}
