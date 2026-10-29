<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AdminCustomerController extends Controller
{
    /**
     * نمایش فهرست مشتریان برای مدیر.
     */
    public function index(Request $request)
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
            'sort_by' => [
                'nullable',
                'string',
                Rule::in([
                    'name',
                    'email',
                    'created_at',
                    'orders_count',
                    'total_spent',
                ]),
            ],
            'sort_direction' => [
                'nullable',
                'string',
                Rule::in(['asc', 'desc']),
            ],
        ]);

        $search = trim($validated['search'] ?? '');
        $sortBy = $validated['sort_by'] ?? 'created_at';
        $sortDirection = $validated['sort_direction'] ?? 'desc';

        $customers = User::query()
            ->where('role', 'customer')
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($subQuery) use ($search) {
                    $subQuery
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->withCount([
                'orders as orders_count' => function ($query) {
                    $query->where('status', '!=', 'cancelled');
                },
            ])
            ->withSum([
                'orders as total_spent' => function ($query) {
                    $query
                        ->where('payment_status', 'paid')
                        ->where('status', '!=', 'cancelled');
                },
            ], 'total')
            ->when(
                $sortBy === 'orders_count',
                fn ($query) => $query->orderBy('orders_count', $sortDirection)
            )
            ->when(
                $sortBy === 'total_spent',
                fn ($query) => $query->orderBy('total_spent', $sortDirection)
            )
            ->when(
                in_array($sortBy, ['name', 'email', 'created_at'], true),
                fn ($query) => $query->orderBy($sortBy, $sortDirection)
            )
            ->orderBy('id', 'desc')
            ->paginate($validated['per_page'] ?? 10)
            ->withQueryString();

        $summary = [
            'total_customers' => User::query()
                ->where('role', 'customer')
                ->count(),

            'new_customers' => User::query()
                ->where('role', 'customer')
                ->where('created_at', '>=', now()->startOfMonth())
                ->count(),

            'customers_with_orders' => User::query()
                ->where('role', 'customer')
                ->whereHas('orders')
                ->count(),
        ];

        return response()->json([
            'success' => true,
            'data' => $customers,
            'summary' => $summary,
        ]);
    }

    /**
     * نمایش جزئیات مشتری و سفارش‌های او.
     */
    public function show(Request $request, int $customerId)
    {
        $customer = User::query()
            ->where('role', 'customer')
            ->whereKey($customerId)
            ->first();

        if (!$customer) {
            return response()->json([
                'success' => false,
                'message' => 'مشتری موردنظر پیدا نشد.',
            ], 404);
        }

        $validated = $request->validate([
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $orders = Order::query()
            ->where('user_id', $customer->id)
            ->with('items.product.images')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($validated['per_page'] ?? 10)
            ->withQueryString();

        $purchaseSummary = Order::query()
            ->where('user_id', $customer->id)
            ->where('payment_status', 'paid')
            ->where('status', '!=', 'cancelled')
            ->selectRaw('COUNT(*) as paid_orders_count')
            ->selectRaw('COALESCE(SUM(total), 0) as total_spent')
            ->first();

        return response()->json([
            'success' => true,
            'data' => [
                'customer' => $customer,
                'summary' => [
                    'orders_count' => Order::query()
                        ->where('user_id', $customer->id)
                        ->where('status', '!=', 'cancelled')
                        ->count(),

                    'paid_orders_count' => (int) (
                        $purchaseSummary->paid_orders_count ?? 0
                    ),

                    'total_spent' => (float) (
                        $purchaseSummary->total_spent ?? 0
                    ),
                ],
                'orders' => $orders,
            ],
        ]);
    }
/**
 * ثبت مشتری جدید توسط مدیر.
 */
public function store(Request $request)
{
    $validated = $request->validate([
        'name' => ['required', 'string', 'max:255'],
        'email' => ['required', 'email', 'max:255', 'unique:users,email'],
        'password' => ['required', 'string', 'min:8', 'max:128'],
    ], [
        'name.required' => 'وارد کردن نام مشتری الزامی است.',
        'name.max' => 'نام مشتری نباید بیشتر از ۲۵۵ کاراکتر باشد.',
        'email.required' => 'وارد کردن ایمیل الزامی است.',
        'email.email' => 'فرمت ایمیل معتبر نیست.',
        'email.unique' => 'این ایمیل قبلاً ثبت شده است.',
        'password.required' => 'وارد کردن رمز عبور الزامی است.',
        'password.min' => 'رمز عبور باید حداقل ۸ کاراکتر باشد.',
        'password.max' => 'رمز عبور نباید بیشتر از ۱۲۸ کاراکتر باشد.',
    ]);

    $customer = User::create([
        'name' => trim($validated['name']),
        'email' => strtolower(trim($validated['email'])),
        'password' => $validated['password'],
        'role' => 'customer',
    ]);

    return response()->json([
        'success' => true,
        'message' => 'مشتری جدید با موفقیت ثبت شد.',
        'data' => [
            'id' => $customer->id,
            'name' => $customer->name,
            'email' => $customer->email,
            'created_at' => $customer->created_at,
        ],
    ], 201);
}


    /**
     * حذف مشتری بدون سفارش.
     */
    public function destroy(int $customerId)
    {
        try {
            $deleted = DB::transaction(function () use ($customerId) {
                $customer = User::query()
                    ->where('role', 'customer')
                    ->whereKey($customerId)
                    ->lockForUpdate()
                    ->first();

                if (!$customer) {
                    return [
                        'status' => 404,
                        'message' => 'مشتری موردنظر پیدا نشد.',
                    ];
                }

                // هیچ مشتری دارای سفارش، حتی سفارش لغوشده، حذف نمی‌شود.
                if ($customer->orders()->exists()) {
                    return [
                        'status' => 409,
                        'message' => 'این مشتری سابقه سفارش دارد و امکان حذف او وجود ندارد.',
                    ];
                }

                $customer->delete();

                return [
                    'status' => 200,
                    'message' => 'مشتری با موفقیت حذف شد.',
                ];
            });

            return response()->json([
                'success' => $deleted['status'] === 200,
                'message' => $deleted['message'],
            ], $deleted['status']);
        } catch (QueryException $exception) {
            report($exception);

            return response()->json([
                'success' => false,
                'message' => 'حذف مشتری انجام نشد؛ ممکن است اطلاعات دیگری به این حساب وابسته باشد.',
            ], 409);
        }
    }
}
