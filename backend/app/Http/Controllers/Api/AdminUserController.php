<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * مدیریت حساب‌های مدیر فروشگاه.
 *
 * فقط کاربرانی با نقش admin به این مسیرها دسترسی دارند (middleware admin).
 * مشتریان از این مسیرها قابل مشاهده یا ویرایش نیستند.
 */
class AdminUserController extends Controller
{
    /**
     * فهرست مدیران فروشگاه.
     */
    public function index(Request $request)
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $search = trim($validated['search'] ?? '');

        $admins = User::query()
            ->where('role', 'admin')
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($subQuery) use ($search) {
                    $subQuery
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->orderBy('id')
            ->paginate($validated['per_page'] ?? 10)
            ->withQueryString();

        return response()->json([
            'success' => true,
            'data' => $admins,
            'summary' => [
                'total_admins' => User::query()
                    ->where('role', 'admin')
                    ->count(),

                'current_admin_id' => $request->user()->id,
            ],
        ]);
    }

    /**
     * ثبت مدیر جدید.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'max:128', 'confirmed'],
        ], $this->messages());

        $admin = User::create([
            'name' => trim($validated['name']),
            'email' => strtolower(trim($validated['email'])),
            'password' => $validated['password'],
            'role' => 'admin',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'مدیر جدید با موفقیت ثبت شد.',
            'data' => $this->present($admin),
        ], 201);
    }

    /**
     * ویرایش حساب یک مدیر (از جمله حساب خود مدیر جاری).
     */
    public function update(Request $request, int $adminId)
    {
        $admin = User::query()
            ->where('role', 'admin')
            ->whereKey($adminId)
            ->first();

        if (! $admin) {
            return response()->json([
                'success' => false,
                'message' => 'مدیر موردنظر پیدا نشد.',
            ], 404);
        }

        // رمز خالی یعنی «رمز را تغییر نده».
        if ($request->has('password') && blank($request->input('password'))) {
            $request->merge(['password' => null]);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($admin->id),
            ],
            'password' => ['nullable', 'string', 'min:8', 'max:128', 'confirmed'],
        ], $this->messages());

        $admin->name = trim($validated['name']);
        $admin->email = strtolower(trim($validated['email']));

        $passwordChanged = ! blank($validated['password'] ?? null);

        if ($passwordChanged) {
            // cast «hashed» در مدل User رمز را خودکار هش می‌کند.
            $admin->password = $validated['password'];
        }

        $admin->save();

        // اگر مدیر رمز حساب خودش را عوض کند، نشست‌های دیگرش باطل می‌شوند
        // تا توکن‌های قدیمی معتبر نمانند (نشست جاری باز می‌ماند).
        if ($passwordChanged && $admin->id === $request->user()->id) {
            $currentToken = $request->user()->currentAccessToken();

            $admin->tokens()
                ->when(
                    $currentToken && isset($currentToken->id),
                    fn ($query) => $query->whereKeyNot($currentToken->id)
                )
                ->delete();
        }

        return response()->json([
            'success' => true,
            'message' => 'اطلاعات مدیر با موفقیت به‌روزرسانی شد.',
            'data' => $this->present($admin->refresh()),
        ]);
    }

    /**
     * حذف مدیر (به‌جز حساب خود مدیر جاری و آخرین مدیر باقی‌مانده).
     */
    public function destroy(Request $request, int $adminId)
    {
        if ($adminId === $request->user()->id) {
            return response()->json([
                'success' => false,
                'message' => 'حذف حساب خودتان امکان‌پذیر نیست.',
            ], 409);
        }

        try {
            $result = DB::transaction(function () use ($adminId) {
                $admin = User::query()
                    ->where('role', 'admin')
                    ->whereKey($adminId)
                    ->lockForUpdate()
                    ->first();

                if (! $admin) {
                    return [
                        'status' => 404,
                        'message' => 'مدیر موردنظر پیدا نشد.',
                    ];
                }

                if (
                    User::query()
                        ->where('role', 'admin')
                        ->whereKeyNot($admin->id)
                        ->doesntExist()
                ) {
                    return [
                        'status' => 409,
                        'message' => 'آخرین مدیر فروشگاه قابل حذف نیست.',
                    ];
                }

                // توکن‌های فعال مدیر حذف‌شده هم باطل می‌شوند.
                $admin->tokens()->delete();
                $admin->delete();

                return [
                    'status' => 200,
                    'message' => 'مدیر با موفقیت حذف شد.',
                ];
            });

            return response()->json([
                'success' => $result['status'] === 200,
                'message' => $result['message'],
            ], $result['status']);
        } catch (QueryException $exception) {
            report($exception);

            return response()->json([
                'success' => false,
                'message' => 'حذف مدیر انجام نشد؛ ممکن است اطلاعات دیگری به این حساب وابسته باشد.',
            ], 409);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function present(User $admin): array
    {
        return [
            'id' => $admin->id,
            'name' => $admin->name,
            'email' => $admin->email,
            'role' => $admin->role,
            'created_at' => $admin->created_at,
            'updated_at' => $admin->updated_at,
        ];
    }

    /**
     * @return array<string, string>
     */
    private function messages(): array
    {
        return [
            'name.required' => 'وارد کردن نام مدیر الزامی است.',
            'name.max' => 'نام مدیر نباید بیشتر از ۲۵۵ کاراکتر باشد.',
            'email.required' => 'وارد کردن ایمیل الزامی است.',
            'email.email' => 'فرمت ایمیل معتبر نیست.',
            'email.unique' => 'این ایمیل قبلاً ثبت شده است.',
            'password.required' => 'وارد کردن رمز عبور الزامی است.',
            'password.min' => 'رمز عبور باید حداقل ۸ کاراکتر باشد.',
            'password.max' => 'رمز عبور نباید بیشتر از ۱۲۸ کاراکتر باشد.',
            'password.confirmed' => 'تکرار رمز عبور با رمز عبور یکسان نیست.',
        ];
    }
}
