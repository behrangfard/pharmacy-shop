<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        $token = $user->createToken('behrang-shop')->plainTextToken;

        return response()->json([
            'message' => 'ثبت‌نام با موفقیت انجام شد.',
            'user' => $this->presentUser($user),
            'token' => $token,
        ], 201);
    }

    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (
            ! $user ||
            ! Hash::check(
                $validated['password'],
                $user->password
            )
        ) {
            throw ValidationException::withMessages([
                'email' => ['ایمیل یا رمز عبور صحیح نیست.'],
            ]);
        }

        $token = $user->createToken('behrang-shop')->plainTextToken;

        return response()->json([
            'message' => 'ورود با موفقیت انجام شد.',
            'user' => $this->presentUser($user),
            'token' => $token,
        ]);
    }

    public function me(Request $request)
    {
        return response()->json([
            'user' => $this->presentUser($request->user()),
        ]);
    }

    public function update(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'email',
                'max:255',
                'unique:users,email,'.$user->id,
            ],
        ]);

        $user->update([
            'name' => $validated['name'],
            'email' => $validated['email'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'اطلاعات حساب با موفقیت به‌روزرسانی شد.',
            'user' => $this->presentUser($user->fresh()),
        ]);
    }

    public function changePassword(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        if (! Hash::check(
            $validated['current_password'],
            $user->password
        )) {
            throw ValidationException::withMessages([
                'current_password' => [
                    'رمز عبور فعلی صحیح نیست.',
                ],
            ]);
        }

        $user->update([
            'password' => Hash::make($validated['password']),
        ]);

        $user->tokens()->delete();

        return response()->json([
            'success' => true,
            'message' => 'رمز عبور با موفقیت تغییر کرد.',
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'با موفقیت خارج شدید.',
        ]);
    }

    /**
     * اطلاعات کاربر برای فرانت‌اند: نقش مدیریتی و فهرست مجوزها.
     *
     * پنل ادمین منو و مسیرها را بر اساس همین «permissions» محدود می‌کند.
     *
     * @return array<string, mixed>
     */
    private function presentUser(User $user): array
    {
        return array_merge($user->toArray(), [
            'admin_role' => $user->adminRole(),
            'admin_role_label' => $user->adminRoleLabel(),
            'permissions' => $user->adminPermissions(),
        ]);
    }
}
