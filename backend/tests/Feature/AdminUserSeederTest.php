<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\AdminUserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminUserSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_user_seeder_creates_a_single_hashed_admin(): void
    {
        config([
            'admin.email' => 'owner@behrang-shop.test',
            'admin.password' => 'Secret!2345',
            'admin.name' => 'مالک فروشگاه',
        ]);

        // اجرای دوباره نباید کاربر تکراری بسازد.
        $this->seed(AdminUserSeeder::class);
        $this->seed(AdminUserSeeder::class);

        $this->assertSame(
            1,
            User::query()->where('email', 'owner@behrang-shop.test')->count()
        );

        $user = User::query()
            ->where('email', 'owner@behrang-shop.test')
            ->firstOrFail();

        $this->assertSame('admin', $user->role);
        $this->assertSame('مالک فروشگاه', $user->name);
        $this->assertTrue($user->isAdmin());
        $this->assertTrue(Hash::check('Secret!2345', $user->password));
    }

    public function test_admin_user_seeder_uses_development_defaults(): void
    {
        config([
            'admin.email' => 'admin@behrang-shop.local',
            'admin.password' => null,
            'admin.name' => 'مدیر فروشگاه',
        ]);

        $this->seed(AdminUserSeeder::class);

        $user = User::query()
            ->where('email', 'admin@behrang-shop.local')
            ->firstOrFail();

        $this->assertSame('admin', $user->role);
        $this->assertTrue(Hash::check('password', $user->password));
    }

    public function test_admin_user_seeder_does_nothing_in_production_without_password(): void
    {
        config([
            'admin.email' => 'owner@behrang-shop.test',
            'admin.password' => null,
        ]);

        $this->app['env'] = 'production';

        // در production دستور db:seed فقط با --force اجرا می‌شود.
        Artisan::call('db:seed', [
            '--class' => AdminUserSeeder::class,
            '--force' => true,
        ]);

        $this->assertSame(0, User::query()->count());
    }
}
