<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\AdminRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * نقش‌ها و سطوح دسترسی مدیران فروشگاه.
 */
class AdminPermissionTest extends TestCase
{
    use RefreshDatabase;

    private function makeAdmin(string $email, ?string $role = null): User
    {
        return User::create([
            'name' => 'مدیر تست',
            'email' => $email,
            'password' => 'password',
            'role' => 'admin',
            'admin_role' => $role,
        ]);
    }

    private function makeCustomer(string $email = 'customer@example.com'): User
    {
        return User::create([
            'name' => 'مشتری تست',
            'email' => $email,
            'password' => 'password',
            'role' => 'customer',
        ]);
    }

    /**
     * همه بخش‌های پنل که «مدیر ارشد» باید ببیند.
     */
    private function allAdminSections(): array
    {
        return [
            '/api/v1/admin/dashboard',
            '/api/v1/admin/products',
            '/api/v1/admin/categories',
            '/api/v1/admin/brands',
            '/api/v1/admin/banners',
            '/api/v1/admin/articles',
            '/api/v1/admin/reviews',
            '/api/v1/admin/orders',
            '/api/v1/admin/returns',
            '/api/v1/admin/coupons',
            '/api/v1/admin/customers',
            '/api/v1/admin/messaging',
            '/api/v1/admin/messaging/settings',
            '/api/v1/admin/settings',
            '/api/v1/admin/reports/sales',
            '/api/v1/admin/admins',
        ];
    }

    public function test_super_admin_can_access_every_panel_section(): void
    {
        Sanctum::actingAs($this->makeAdmin('super@example.com', AdminRole::SUPER_ADMIN));

        foreach ($this->allAdminSections() as $uri) {
            $this->assertNotSame(
                403,
                $this->json('GET', $uri)->status(),
                "مدیر ارشد نباید به {$uri} دسترسی نداشته باشد."
            );
        }
    }

    public function test_legacy_admin_without_role_is_treated_as_super_admin(): void
    {
        $admin = $this->makeAdmin('legacy@example.com');

        $this->assertNull($admin->admin_role);
        $this->assertSame(AdminRole::SUPER_ADMIN, $admin->adminRole());
        $this->assertTrue($admin->isSuperAdmin());

        Sanctum::actingAs($admin);

        $this->json('GET', '/api/v1/admin/settings')->assertOk();
        $this->json('GET', '/api/v1/admin/admins')->assertOk();
    }

    public function test_product_manager_cannot_reach_orders_finance_or_settings(): void
    {
        Sanctum::actingAs(
            $this->makeAdmin('products@example.com', AdminRole::PRODUCT_MANAGER)
        );

        $this->json('GET', '/api/v1/admin/products')->assertOk();
        $this->json('GET', '/api/v1/admin/categories')->assertOk();
        $this->json('GET', '/api/v1/admin/brands')->assertOk();
        $this->json('GET', '/api/v1/admin/banners')->assertOk();

        foreach ([
            '/api/v1/admin/orders',
            '/api/v1/admin/coupons',
            '/api/v1/admin/customers',
            '/api/v1/admin/settings',
            '/api/v1/admin/admins',
            '/api/v1/admin/messaging',
            '/api/v1/admin/reports/sales',
        ] as $uri) {
            $this->json('GET', $uri)
                ->assertForbidden()
                ->assertJsonPath('success', false);
        }
    }

    public function test_order_manager_cannot_manage_catalog_or_settings(): void
    {
        Sanctum::actingAs(
            $this->makeAdmin('orders@example.com', AdminRole::ORDER_MANAGER)
        );

        $this->json('GET', '/api/v1/admin/orders')->assertOk();
        $this->json('GET', '/api/v1/admin/coupons')->assertOk();
        $this->json('GET', '/api/v1/admin/returns')->assertOk();
        $this->json('GET', '/api/v1/admin/reports/sales')->assertOk();

        $this->json('GET', '/api/v1/admin/products')->assertForbidden();
        $this->json('GET', '/api/v1/admin/banners')->assertForbidden();
        $this->json('GET', '/api/v1/admin/settings')->assertForbidden();
        $this->json('GET', '/api/v1/admin/admins')->assertForbidden();
    }

    public function test_support_can_help_customers_but_not_touch_catalog(): void
    {
        Sanctum::actingAs($this->makeAdmin('support@example.com', AdminRole::SUPPORT));

        $this->json('GET', '/api/v1/admin/orders')->assertOk();
        $this->json('GET', '/api/v1/admin/customers')->assertOk();
        $this->json('GET', '/api/v1/admin/returns')->assertOk();
        $this->json('GET', '/api/v1/admin/messaging')->assertOk();

        $this->json('GET', '/api/v1/admin/products')->assertForbidden();
        $this->json('GET', '/api/v1/admin/settings')->assertForbidden();
        $this->json('GET', '/api/v1/admin/admins')->assertForbidden();
    }

    public function test_forbidden_response_mentions_required_permission(): void
    {
        Sanctum::actingAs(
            $this->makeAdmin('support2@example.com', AdminRole::SUPPORT)
        );

        $this->json('GET', '/api/v1/admin/settings')
            ->assertForbidden()
            ->assertJsonPath('required_permission', AdminRole::SETTINGS_MANAGE)
            ->assertJsonPath('admin_role', AdminRole::SUPPORT);
    }

    public function test_login_and_me_return_admin_role_and_permissions(): void
    {
        $this->makeAdmin('role@example.com', AdminRole::ORDER_MANAGER);

        $login = $this->json('POST', '/api/v1/auth/login', [
            'email' => 'role@example.com',
            'password' => 'password',
        ]);

        $login->assertOk()
            ->assertJsonPath('user.admin_role', AdminRole::ORDER_MANAGER)
            ->assertJsonPath('user.admin_role_label', 'مدیر سفارش‌ها');

        $permissions = $login->json('user.permissions');

        $this->assertContains(AdminRole::ORDERS_MANAGE, $permissions);
        $this->assertContains(AdminRole::REPORTS_VIEW, $permissions);
        $this->assertNotContains(AdminRole::SETTINGS_MANAGE, $permissions);
        $this->assertNotContains(AdminRole::ADMINS_MANAGE, $permissions);

        Sanctum::actingAs(User::where('email', 'role@example.com')->first());

        $this->json('GET', '/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('user.admin_role', AdminRole::ORDER_MANAGER)
            ->assertJsonPath('user.permissions.0', AdminRole::DASHBOARD_VIEW);
    }

    public function test_customers_have_no_admin_role_or_permissions(): void
    {
        $this->makeCustomer();

        $login = $this->json('POST', '/api/v1/auth/login', [
            'email' => 'customer@example.com',
            'password' => 'password',
        ]);

        $login->assertOk()
            ->assertJsonPath('user.admin_role', null)
            ->assertJsonPath('user.permissions', []);
    }

    public function test_admin_can_be_created_with_explicit_role(): void
    {
        Sanctum::actingAs($this->makeAdmin('super@example.com', AdminRole::SUPER_ADMIN));

        $this->json('POST', '/api/v1/admin/admins', [
            'name' => 'پشتیبان فروشگاه',
            'email' => 'support@example.com',
            'password' => 'secret-password',
            'password_confirmation' => 'secret-password',
            'admin_role' => AdminRole::SUPPORT,
        ])
            ->assertCreated()
            ->assertJsonPath('data.admin_role', AdminRole::SUPPORT)
            ->assertJsonPath('data.admin_role_label', 'پشتیبانی');

        $this->assertDatabaseHas('users', [
            'email' => 'support@example.com',
            'admin_role' => AdminRole::SUPPORT,
        ]);
    }

    public function test_new_admin_without_role_gets_least_privilege(): void
    {
        Sanctum::actingAs($this->makeAdmin('super@example.com', AdminRole::SUPER_ADMIN));

        $this->json('POST', '/api/v1/admin/admins', [
            'name' => 'مدیر بدون نقش',
            'email' => 'no-role@example.com',
            'password' => 'secret-password',
            'password_confirmation' => 'secret-password',
        ])
            ->assertCreated()
            ->assertJsonPath('data.admin_role', AdminRole::SUPPORT);
    }

    public function test_invalid_admin_role_is_rejected(): void
    {
        Sanctum::actingAs($this->makeAdmin('super@example.com', AdminRole::SUPER_ADMIN));

        $this->json('POST', '/api/v1/admin/admins', [
            'name' => 'مدیر نقش نامعتبر',
            'email' => 'invalid-role@example.com',
            'password' => 'secret-password',
            'password_confirmation' => 'secret-password',
            'admin_role' => 'root',
        ])->assertStatus(422)->assertJsonValidationErrors('admin_role');

        $this->assertDatabaseMissing('users', ['email' => 'invalid-role@example.com']);
    }

    public function test_last_super_admin_cannot_be_demoted(): void
    {
        $super = $this->makeAdmin('super@example.com', AdminRole::SUPER_ADMIN);

        Sanctum::actingAs($super);

        $this->json('PUT', "/api/v1/admin/admins/{$super->id}", [
            'name' => $super->name,
            'email' => $super->email,
            'admin_role' => AdminRole::SUPPORT,
        ])->assertStatus(409);

        $this->assertSame(AdminRole::SUPER_ADMIN, $super->refresh()->admin_role);
    }

    public function test_super_admin_can_be_demoted_when_another_one_exists(): void
    {
        $super = $this->makeAdmin('super@example.com', AdminRole::SUPER_ADMIN);
        $this->makeAdmin('second-super@example.com', AdminRole::SUPER_ADMIN);

        Sanctum::actingAs($super);

        $this->json('PUT', "/api/v1/admin/admins/{$super->id}", [
            'name' => $super->name,
            'email' => $super->email,
            'admin_role' => AdminRole::ORDER_MANAGER,
        ])->assertOk();

        $this->assertSame(AdminRole::ORDER_MANAGER, $super->refresh()->admin_role);
    }

    public function test_demoted_admin_loses_access_immediately(): void
    {
        $super = $this->makeAdmin('super@example.com', AdminRole::SUPER_ADMIN);
        $second = $this->makeAdmin('second@example.com', AdminRole::SUPER_ADMIN);

        Sanctum::actingAs($super);

        $this->json('PUT', "/api/v1/admin/admins/{$second->id}", [
            'name' => $second->name,
            'email' => $second->email,
            'admin_role' => AdminRole::SUPPORT,
        ])->assertOk();

        Sanctum::actingAs($second->refresh());

        $this->json('GET', '/api/v1/admin/settings')->assertForbidden();
        $this->json('GET', '/api/v1/admin/orders')->assertOk();
    }

    public function test_permissions_follow_the_role_matrix(): void
    {
        $this->assertTrue(
            AdminRole::has(AdminRole::SUPPORT, AdminRole::ORDERS_MANAGE)
        );

        $this->assertFalse(
            AdminRole::has(AdminRole::SUPPORT, AdminRole::SETTINGS_MANAGE)
        );

        $this->assertSame(
            AdminRole::permissions(),
            AdminRole::permissionsFor(AdminRole::SUPER_ADMIN)
        );

        $this->assertSame([], AdminRole::permissionsFor('unknown'));
        $this->assertNull(AdminRole::label('unknown'));
        $this->assertSame('مدیر محصولات', AdminRole::label(AdminRole::PRODUCT_MANAGER));
    }

    public function test_admins_list_exposes_roles_and_permissions(): void
    {
        Sanctum::actingAs($this->makeAdmin('super@example.com', AdminRole::SUPER_ADMIN));

        $response = $this->json('GET', '/api/v1/admin/admins');

        $response->assertOk()
            ->assertJsonPath('data.data.0.admin_role', AdminRole::SUPER_ADMIN)
            ->assertJsonPath('data.data.0.admin_role_label', 'مدیر ارشد')
            ->assertJsonPath('summary.total_super_admins', 1);

        $this->assertSame(
            AdminRole::roles(),
            array_column($response->json('roles'), 'value')
        );
    }
}
