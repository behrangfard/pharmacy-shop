<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AdminOrderController extends Controller
{
    /**
     * نمایش فهرست سفارش‌ها برای مدیر
     */
    public function index(Request $request)
    {
        $validated = $request->validate([
            'status' => [
                'nullable',
                'string',
                Rule::in([
                    'pending',
                    'processing',
                    'shipped',
                    'delivered',
                    'cancelled',
                ]),
            ],
            'payment_status' => [
                'nullable',
                'string',
                Rule::in([
                    'unpaid',
                    'paid',
                    'failed',
                    'refunded',
                ]),
            ],
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'sort_by' => [
                'nullable',
                'string',
                Rule::in([
                    'order_number',
                    'recipient_name',
                    'total',
                    'status',
                    'payment_status',
                    'created_at',
                ]),
            ],
            'sort_direction' => [
                'nullable',
                'string',
                Rule::in(['asc', 'desc']),
            ],
        ]);

        $sortColumns = [
            'order_number' => 'order_number',
            'recipient_name' => 'recipient_name',
            'total' => 'total',
            'status' => 'status',
            'payment_status' => 'payment_status',
            'created_at' => 'created_at',
        ];

        $sortBy = $validated['sort_by'] ?? 'created_at';
        $sortDirection = $validated['sort_direction'] ?? 'desc';

        $sortColumn = $sortColumns[$sortBy];

        $orders = Order::query()
            ->with([
                'items.product.images',
                'items.variant',
                'user',
            ])
            ->when(
                $validated['status'] ?? null,
                fn ($query, $status) => $query->where('status', $status)
            )
            ->when(
                $validated['payment_status'] ?? null,
                fn ($query, $paymentStatus) => $query->where(
                    'payment_status',
                    $paymentStatus
                )
            )
            ->when(
                isset($validated['search'])
                    && trim($validated['search']) !== '',
                function ($query) use ($validated) {
                    $search = trim($validated['search']);

                    $query->where(function ($subQuery) use ($search) {
                        $subQuery
                            ->where('order_number', 'like', "%{$search}%")
                            ->orWhere('recipient_name', 'like', "%{$search}%")
                            ->orWhere('phone', 'like', "%{$search}%")
                            ->orWhereHas('user', function ($userQuery) use ($search) {
                                $userQuery
                                    ->where('name', 'like', "%{$search}%")
                                    ->orWhere('email', 'like', "%{$search}%");
                            });
                    });
                }
            )
            ->orderBy($sortColumn, $sortDirection)
            ->orderBy('id', 'desc')
            ->paginate($validated['per_page'] ?? 15)
            ->withQueryString();

        return response()->json([
            'success' => true,
            'data' => $orders,
        ]);
    }

    /**
     * نمایش جزئیات یک سفارش برای مدیر
     */
    public function show(string $orderNumber)
    {
        $order = Order::query()
            ->with([
                'items.product.images',
                'items.variant',
                'user',
            ])
            ->where('order_number', $orderNumber)
            ->first();

        if (! $order) {
            return response()->json([
                'success' => false,
                'message' => 'سفارش موردنظر پیدا نشد.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $order,
        ]);
    }

    /**
     * تغییر وضعیت سفارش توسط مدیر
     */
    public function updateStatus(Request $request, string $orderNumber)
    {
        $validated = $request->validate([
            'status' => [
                'required',
                'string',
                Rule::in([
                    'pending',
                    'processing',
                    'shipped',
                    'delivered',
                    'cancelled',
                ]),
            ],
        ]);

        $result = DB::transaction(function () use ($orderNumber, $validated) {
            $order = Order::query()
                ->where('order_number', $orderNumber)
                ->lockForUpdate()
                ->first();

            if (! $order) {
                return [
                    'error' => 'سفارش موردنظر پیدا نشد.',
                    'status' => 404,
                ];
            }

            $currentStatus = $order->status;
            $newStatus = $validated['status'];

            if ($currentStatus === $newStatus) {
                return [
                    'order' => $order->fresh()->load([
                        'items.product.images',
                        'items.variant',
                        'user',
                    ]),
                ];
            }

            if ($currentStatus === 'cancelled') {
                return [
                    'error' => 'سفارش لغوشده قابل فعال‌سازی مجدد نیست.',
                    'status' => 422,
                ];
            }

            if ($currentStatus === 'delivered') {
                return [
                    'error' => 'وضعیت سفارش تحویل‌شده قابل تغییر نیست.',
                    'status' => 422,
                ];
            }

            if (
                $newStatus === 'cancelled'
                && $currentStatus === 'shipped'
            ) {
                return [
                    'error' => 'سفارش ارسال‌شده از این مسیر قابل لغو نیست.',
                    'status' => 422,
                ];
            }

            if (
                in_array(
                    $newStatus,
                    ['processing', 'shipped', 'delivered'],
                    true
                )
                && $order->payment_status !== 'paid'
            ) {
                return [
                    'error' => 'برای انتخاب این وضعیت، سفارش باید پرداخت شده باشد.',
                    'status' => 422,
                ];
            }

            /*
             * لغو سفارش پرداخت‌شده از این مسیر مجاز نیست؛
             * زیرا ابتدا باید فرایند بازپرداخت انجام شود.
             */
            if (
                $newStatus === 'cancelled'
                && $order->payment_status === 'paid'
            ) {
                return [
                    'error' => 'لغو سفارش پرداخت‌شده از این مسیر امکان‌پذیر نیست.',
                    'status' => 422,
                ];
            }

            /*
             * لغو سفارش پرداخت‌نشده توسط مدیر مجاز است.
             * قبل از تغییر وضعیت، موجودی اقلام سفارش بررسی و بازگردانده می‌شود.
             */
            if ($newStatus === 'cancelled') {
                if ($order->stock_restored_at !== null) {
                    return [
                        'error' => 'موجودی این سفارش قبلاً بازگردانده شده است.',
                        'status' => 422,
                    ];
                }

                $items = $order->items()->get();

                $inventoryRecords = [];

                /*
                 * ابتدا تمام رکوردهای موجودی را قفل و بررسی می‌کنیم.
                 * اگر تنوع سفارش حذف شده باشد، عملیات لغو متوقف می‌شود
                 * تا موجودی محصول اشتباهاً افزایش پیدا نکند.
                 */
                foreach ($items as $item) {
                    if ($item->product_id === null) {
                        continue;
                    }

                    if ($item->variant_id !== null) {
                        $variant = ProductVariant::query()
                            ->whereKey($item->variant_id)
                            ->where('product_id', $item->product_id)
                            ->lockForUpdate()
                            ->first();

                        if (! $variant) {
                            return [
                                'error' => 'تنوع یکی از محصولات این سفارش پیدا نشد. ابتدا اطلاعات موجودی آن را بررسی کنید.',
                                'status' => 409,
                            ];
                        }

                        $inventoryRecords[] = [
                            'model' => $variant,
                            'quantity' => (int) $item->quantity,
                        ];

                        continue;
                    }

                    /*
                     * اگر نام تنوع در سفارش ذخیره شده اما variant_id
                     * خالی است، احتمالاً رکورد تنوع حذف شده است.
                     * در این حالت نباید موجودی محصول اصلی را افزایش دهیم.
                     */
                    if (! empty($item->variant_name)) {
                        return [
                            'error' => 'تنوع ثبت‌شده برای یکی از اقلام سفارش در دسترس نیست. بازگرداندن موجودی به بررسی دستی نیاز دارد.',
                            'status' => 409,
                        ];
                    }

                    $product = Product::query()
                        ->whereKey($item->product_id)
                        ->lockForUpdate()
                        ->first();

                    /*
                     * ممکن است محصول پس از ثبت سفارش حذف شده باشد.
                     */
                    if ($product) {
                        $inventoryRecords[] = [
                            'model' => $product,
                            'quantity' => (int) $item->quantity,
                        ];
                    }
                }

                /*
                 * پس از اعتبارسنجی همه اقلام، موجودی‌ها بازگردانده می‌شوند.
                 */
                foreach ($inventoryRecords as $record) {
                    $record['model']->increment(
                        'stock',
                        $record['quantity']
                    );
                }

                $order->stock_restored_at = now();
                $order->status = 'cancelled';
                $order->save();
            } else {
                $order->status = $newStatus;
                $order->save();
            }

            return [
                'order' => $order->fresh()->load([
                    'items.product.images',
                    'items.variant',
                    'user',
                ]),
            ];
        }, 3);

        if (isset($result['error'])) {
            return response()->json([
                'success' => false,
                'message' => $result['error'],
            ], $result['status']);
        }

        return response()->json([
            'success' => true,
            'message' => 'وضعیت سفارش با موفقیت به‌روزرسانی شد.',
            'data' => $result['order'],
        ]);
    }
}
