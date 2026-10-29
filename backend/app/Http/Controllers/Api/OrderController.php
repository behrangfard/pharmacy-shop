<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\StoreSetting;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class OrderController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'recipient_name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:30'],
            'address' => ['required', 'string'],
            'postal_code' => ['nullable', 'string', 'max:20'],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => [
                'required',
                'integer',
                'distinct',
                'exists:products,id',
            ],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
        ]);

        $user = $request->user();

        $idempotencyKey = $request->header('Idempotency-Key');

        if (
            !is_string($idempotencyKey)
            || !Str::isUuid($idempotencyKey)
        ) {
            return response()->json([
                'success' => false,
                'message' => 'کلید یکتای درخواست معتبر نیست.',
            ], 422);
        }

        $existingOrder = Order::query()
            ->where('user_id', $user->id)
            ->where('idempotency_key', $idempotencyKey)
            ->with('items.product.images')
            ->first();

        if ($existingOrder) {
            return $this->respondWithExistingOrder(
                $existingOrder,
                $validated
            );
        }

        try {
            $order = DB::transaction(function () use (
                $validated,
                $user,
                $idempotencyKey
            ) {
                $subtotal = 0;
                $discount = 0;
                $taxableAmount = 0;
                $orderItems = [];

                foreach ($validated['items'] as $item) {
                    $product = Product::query()
                        ->where('id', $item['product_id'])
                        ->where('is_active', true)
                        ->lockForUpdate()
                        ->first();

                    if (!$product) {
                        abort(422, 'یکی از محصولات موجود نیست یا فعال نیست.');
                    }

                    $quantity = (int) $item['quantity'];

                    if ($product->stock < $quantity) {
                        abort(
                            422,
                            "موجودی محصول {$product->name} کافی نیست."
                        );
                    }

                    $originalUnitPrice = round(
                        (float) $product->price,
                        2
                    );

                    $discountPercent = min(
                        max((float) $product->discount_percent, 0),
                        100
                    );

                    $unitDiscount = round(
                        ($originalUnitPrice * $discountPercent) / 100,
                        2
                    );

                    $finalUnitPrice = round(
                        $originalUnitPrice - $unitDiscount,
                        2
                    );

                    $itemSubtotal = round(
                        $originalUnitPrice * $quantity,
                        2
                    );

                    $itemDiscount = round(
                        $unitDiscount * $quantity,
                        2
                    );

                    $totalPrice = round(
                        $finalUnitPrice * $quantity,
                        2
                    );

                    $subtotal += $itemSubtotal;
                    $discount += $itemDiscount;

                    if ($product->is_taxable) {
                        $taxableAmount += $totalPrice;
                    }

                    $orderItems[] = [
                        'product_id' => $product->id,
                        'product_name' => $product->name,
                        'sku' => $product->sku,
                        'quantity' => $quantity,
                        'unit_price' => $finalUnitPrice,
                        'total_price' => $totalPrice,
                    ];

                    $product->decrement('stock', $quantity);
                }

                $subtotal = round($subtotal, 2);
                $discount = round($discount, 2);

                $shippingCost = 0;

                $vatEnabled = filter_var(
                    (string) StoreSetting::getValue(
                        'vat_enabled',
                        '0'
                    ),
                    FILTER_VALIDATE_BOOLEAN
                );

                $vatPercent = $vatEnabled
                    ? min(
                        max(
                            (float) StoreSetting::getValue(
                                'vat_percent',
                                10
                            ),
                            0
                        ),
                        100
                    )
                    : 0;

                $taxableAmount = round(
                    $taxableAmount + $shippingCost,
                    2
                );

                $taxAmount = round(
                    $taxableAmount * $vatPercent / 100,
                    2
                );

                $total = round(
                    $subtotal
                        - $discount
                        + $shippingCost
                        + $taxAmount,
                    2
                );

                do {
                    $orderNumber = 'ORD-'
                        . now()->format('Ymd')
                        . '-'
                        . strtoupper(Str::random(6));
                } while (
                    Order::where('order_number', $orderNumber)->exists()
                );

                $order = Order::create([
                    'user_id' => $user->id,
                    'idempotency_key' => $idempotencyKey,
                    'order_number' => $orderNumber,
                    'subtotal' => $subtotal,
                    'shipping_cost' => $shippingCost,
                    'discount' => $discount,
                    'tax_percent' => $vatPercent,
                    'tax_amount' => $taxAmount,
                    'total' => $total,
                    'status' => 'pending',
                    'payment_status' => 'unpaid',
                    'recipient_name' => $validated['recipient_name'],
                    'phone' => $validated['phone'],
                    'address' => $validated['address'],
                    'postal_code' => $validated['postal_code'] ?? null,
                    'notes' => $validated['notes'] ?? null,
                    'sales_channel' => 'website',
                ]);

                foreach ($orderItems as $item) {
                    $order->items()->create($item);
                }

                return $order->load('items.product.images');
            }, 3);
        } catch (QueryException $e) {
            /*
             * اگر درخواست هم‌زمان با همین کلید ثبت شده باشد،
             * قید یکتای دیتابیس مانع ثبت سفارش دوم می‌شود.
             * تراکنش ناموفق نیز باید تغییرات موجودی را rollback کند.
             */
            $existingOrder = Order::query()
                ->where('user_id', $user->id)
                ->where('idempotency_key', $idempotencyKey)
                ->with('items.product.images')
                ->first();

            if ($existingOrder) {
                return $this->respondWithExistingOrder(
                    $existingOrder,
                    $validated
                );
            }

            throw $e;
        }

        return response()->json([
            'success' => true,
            'message' => 'سفارش با موفقیت ایجاد شد و آماده پرداخت است.',
            'data' => $order,
        ], 201);
    }

    /**
     * مقایسه اطلاعات درخواست جدید با سفارش ثبت‌شده.
     */
    private function requestMatchesOrder(
        Order $order,
        array $validated
    ): bool {
        $sameDetails =
            $order->recipient_name === $validated['recipient_name']
            && $order->phone === $validated['phone']
            && $order->address === $validated['address']
            && ($order->postal_code ?? null)
                === ($validated['postal_code'] ?? null)
            && ($order->notes ?? null)
                === ($validated['notes'] ?? null);

        if (!$sameDetails) {
            return false;
        }

        $requestedItems = collect($validated['items'])
            ->groupBy(fn ($item) => (int) $item['product_id'])
            ->map(fn ($items) => (int) $items->sum('quantity'))
            ->sortKeys()
            ->all();

        $existingItems = $order->items()
            ->get(['product_id', 'quantity'])
            ->groupBy(fn ($item) => (int) $item->product_id)
            ->map(fn ($items) => (int) $items->sum('quantity'))
            ->sortKeys()
            ->all();

        return $requestedItems === $existingItems;
    }

    /**
     * پاسخ به درخواست تکراری با بررسی تطابق اطلاعات سفارش.
     */
    private function respondWithExistingOrder(
        Order $order,
        array $validated
    ) {
        if (!$this->requestMatchesOrder($order, $validated)) {
            return response()->json([
                'success' => false,
                'message' => 'این کلید قبلاً برای اطلاعات سفارش دیگری استفاده شده است.',
            ], 409);
        }

        return response()->json([
            'success' => true,
            'message' => 'این درخواست قبلاً ثبت شده است.',
            'data' => $order,
        ], 200);
    }

    public function index(Request $request)
    {
        $orders = Order::query()
            ->where('user_id', $request->user()->id)
            ->with('items.product.images')
            ->latest()
            ->get();

        return response()->json([
            'success' => true,
            'data' => $orders,
        ]);
    }

    public function show(Request $request, string $orderNumber)
    {
        $order = Order::query()
            ->where('user_id', $request->user()->id)
            ->where('order_number', $orderNumber)
            ->with('items.product.images')
            ->first();

        if (!$order) {
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

    public function cancel(Request $request, string $orderNumber)
    {
        $user = $request->user();

        $result = DB::transaction(function () use ($user, $orderNumber) {
            $order = Order::query()
                ->where('user_id', $user->id)
                ->where('order_number', $orderNumber)
                ->lockForUpdate()
                ->first();

            if (!$order) {
                return [
                    'error' => 'سفارش موردنظر پیدا نشد.',
                    'status' => 404,
                ];
            }

            if (in_array($order->status, ['cancelled', 'canceled'], true)) {
                return [
                    'error' => 'این سفارش قبلاً لغو شده است.',
                    'status' => 422,
                ];
            }

            if (in_array($order->status, ['shipped', 'delivered'], true)) {
                return [
                    'error' => 'سفارش ارسال‌شده یا تحویل‌شده قابل لغو نیست.',
                    'status' => 422,
                ];
            }

            if ($order->payment_status !== 'unpaid') {
                return [
                    'error' => 'فقط سفارش پرداخت‌نشده از این مسیر قابل لغو است.',
                    'status' => 422,
                ];
            }

            if ($order->stock_restored_at !== null) {
                return [
                    'error' => 'موجودی این سفارش قبلاً بازگردانده شده است.',
                    'status' => 422,
                ];
            }

            $items = $order->items()->get();

            foreach ($items as $item) {
                if ($item->product_id === null) {
                    continue;
                }

                $product = Product::query()
                    ->whereKey($item->product_id)
                    ->lockForUpdate()
                    ->first();

                if ($product) {
                    $product->increment('stock', $item->quantity);
                }
            }

            $order->status = 'cancelled';
            $order->stock_restored_at = now();
            $order->save();

            return [
                'order' => $order->fresh()->load('items.product.images'),
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
            'message' => 'سفارش با موفقیت لغو شد و موجودی آن بررسی و ثبت شد.',
            'data' => $result['order'],
        ]);
    }

    public function destroy(Request $request, string $orderNumber)
    {
        $user = $request->user();

        $order = Order::query()
            ->where('user_id', $user->id)
            ->where('order_number', $orderNumber)
            ->first();

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'سفارش موردنظر پیدا نشد.',
            ], 404);
        }

        if ($order->status !== 'cancelled') {
            return response()->json([
                'success' => false,
                'message' => 'فقط سفارش‌های لغوشده قابل حذف هستند.',
            ], 422);
        }

        DB::transaction(function () use ($order) {
            $order->items()->delete();
            $order->delete();
        });

        return response()->json([
            'success' => true,
            'message' => 'سفارش با موفقیت از لیست سفارش‌ها حذف شد.',
        ]);
    }

    /**
     * پرداخت آزمایشی سفارش
     */
    public function pay(Request $request, string $orderNumber)
    {
        if (
            config('payment.mode') !== 'demo'
            || !config('payment.demo_enabled')
        ) {
            return response()->json([
                'success' => false,
                'message' => 'پرداخت آزمایشی غیرفعال است.',
            ], 403);
        }

        $user = $request->user();

        $result = DB::transaction(function () use ($user, $orderNumber) {
            $order = Order::query()
                ->where('user_id', $user->id)
                ->where('order_number', $orderNumber)
                ->lockForUpdate()
                ->first();

            if (!$order) {
                return [
                    'error' => 'سفارش موردنظر پیدا نشد.',
                    'status' => 404,
                ];
            }

            if (in_array($order->status, ['cancelled', 'canceled'], true)) {
                return [
                    'error' => 'این سفارش لغو شده و امکان پرداخت آن وجود ندارد.',
                    'status' => 422,
                ];
            }

            if ($order->payment_status === 'paid') {
                return [
                    'order' => $order->load('items.product.images'),
                    'already_paid' => true,
                ];
            }

            if ($order->payment_status !== 'unpaid') {
                return [
                    'error' => 'وضعیت پرداخت سفارش اجازه انجام این عملیات را نمی‌دهد.',
                    'status' => 422,
                ];
            }

            $order->update([
                'payment_status' => 'paid',
                'status' => 'processing',
            ]);

            return [
                'order' => $order->fresh()->load('items.product.images'),
                'already_paid' => false,
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
            'message' => $result['already_paid']
                ? 'این سفارش قبلاً پرداخت شده است.'
                : 'پرداخت آزمایشی با موفقیت ثبت شد.',
            'data' => $result['order'],
        ]);
    }
}
