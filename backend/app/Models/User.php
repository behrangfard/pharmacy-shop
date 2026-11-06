<?php

namespace App\Models;

use App\Support\AdminRole;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'password', 'role', 'admin_role'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(ProductReview::class);
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isCustomer(): bool
    {
        return $this->role === 'customer';
    }

    /**
     * نقش مؤثر مدیریتی؛ مدیر بدون نقش ثبت‌شده «مدیر ارشد» است.
     */
    public function adminRole(): ?string
    {
        if (! $this->isAdmin()) {
            return null;
        }

        return AdminRole::isValid($this->admin_role)
            ? $this->admin_role
            : AdminRole::SUPER_ADMIN;
    }

    public function adminRoleLabel(): ?string
    {
        return AdminRole::label($this->adminRole());
    }

    public function isSuperAdmin(): bool
    {
        return $this->adminRole() === AdminRole::SUPER_ADMIN;
    }

    public function hasAdminPermission(string $permission): bool
    {
        return $this->isAdmin() && AdminRole::has($this->adminRole(), $permission);
    }

    /**
     * @return list<string>
     */
    public function adminPermissions(): array
    {
        return $this->isAdmin()
            ? AdminRole::permissionsFor($this->adminRole())
            : [];
    }

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
}