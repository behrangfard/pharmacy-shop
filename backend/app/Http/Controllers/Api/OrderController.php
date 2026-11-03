<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
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
                'exists:products,id',
            ],
            'items.*.variant_id' => [
                'nullable',
                'integer',
                'exists:product_variants,id',
            ],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
        ]);

        // جلوگیری از تکرار یک تنوع در چند ردیف سفارش
        $uniqueItems = [];

        foreach ($validated['items'] as $item) {
            $key = $item['product_id'].':'.($item['variant_id'] ?? 'null');

            if (isset($uniqueItems[$key])) {
                return response()->json([
                    'success' => false,
                    'message' => 'یک تنوع محصول نباید در چند ردیف جداگانه ثبت شود.',
                ], 422);
            }

            $uniqueItems[$key] = true;
        }

        $user = $request->user();
        $idempotencyKey = $request->header('Idempotency-Key');

        if (! is_string($idempotencyKey) || ! Str::isUuid($idempotencyKey)) {
            return response()->json([
                'success' => false,
                'message' => 'کلید یکتای درخواست معتبر نیست.',
            ], 422);
        }

        $existingOrder = Order::query()
            ->where('user_id', $user->id)
            ->where('idempotency_key', $idempotencyKey)
            ->with('items.product.images', 'items.variant')
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
                        ->whereKey($item['product_id'])
                        ->where('is_active', true)
                        ->lockForUpdate()
                        ->first();

                    if (! $product) {
                        abort(422, 'یکی از محصولات موجود نیست یا فعال نیست.');
                    }

                    $quantity = (int) $item['quantity'];

                    $activeVariants = ProductVariant::query()
                        ->where('product_id', $product->id)
                        ->where('is_active', true)
                        ->exists();

                    $variant = null;

                    if ($activeVariants) {
                        if (empty($item['variant_id'])) {
                            abort(
                                422,
                                "لطفاً تنوع محصول {$product->name} را انتخاب کنید."
                            );
                        }

                        $variant = ProductVariant::query()
                            ->whereKey($item['variant_id'])
                            ->where('product_id', $product->id)
                            ->where('is_active', true)
                            ->lockForUpdate()
                            ->first();

                        if (! $variant) {
                            abort(
                                422,
                                'تنوع انتخاب‌شده معتبر یا فعال نیست.'
                            );
                        }

                        if ($variant->stock < $quantity) {
                            abort(
                                422,
                                "موجودی تنوع {$variant->name} از محصول {$product->name} کافی نیست."
                            );
                        }
                    } else {
                        if (! empty($item['variant_id'])) {
                            abort(
                                422,
                                'این محصول تنوع فعالی ندارد.'
                            );
                        }

                        if ($product->stock < $quantity) {
                            abort(
                                422,
                                "موجودی محصول {$product->name} کافی نیست."
                            );
                        }
                    }

                    $originalUnitPrice = round(
                        (float) (
                            $variant && $variant->price !== null
                                ? $variant->price
                                : $product->price
                        ),
                        2
                    );

                    $discountPercent = min(
                        max((float) $product->discount_percent, 0),
                        100
                    );

                    $unitDiscount = round(
                        $originalUnitPrice * $discountPercent / 100,
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
                        'variant_id' => $variant?->id,
                        'product_name' => $product->name,
                        'variant_name' => $variant?->name,
                        'sku' => $variant?->sku ?? $product->sku,
                        'quantity' => $quantity,
                        'unit_price' => $finalUnitPrice,
                        'total_price' => $totalPrice,
                    ];

                    if ($variant) {
                        $variant->decrement('stock', $quantity);
                    } else {
                        $product->decrement('stock', $quantity);
                    }
                }

                $subtotal = round($subtotal, 2);
                $discount = round($discount, 2);
                $shippingCost = 0;

                $vatEnabled = filter_var(
                    (string) StoreSetting::getValue('vat_enabled', '0'),
                    FILTER_VALIDATE_BOOLEAN
                );

                $vatPercent = $vatEnabled
                    ? min(
                        max(
                            (float) StoreSetting::getValue('vat_percent', 10),
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
                    $subtotal - $discount + $shippingCost + $taxAmount,
                    2
                );

                do {
                    $orderNumber = 'ORD-'
                        .now()->format('Ymd')
                        .'-'
                        .strtoupper(Str::random(6));
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

                foreach ($orderItems as $orderItem) {
                    $order->items()->create($orderItem);
                }

                return $order->load(
                    'items.product.images',
                    'items.variant'
                );
            }, 3);
        } catch (QueryException $e) {
            $existingOrder = Order::query()
                ->where('user_id', $user->id)
                ->where('idempotency_key', $idempotencyKey)
                ->with('items.product.images', 'items.variant')
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

        if (! $sameDetails) {
            return false;
        }

        $requestedItems = collect($validated['items'])
            ->mapWithKeys(function ($item) {
                $key = $item['product_id'].':'
                    .($item['variant_id'] ?? 'null');

                return [$key => (int) $item['quantity']];
            })
            ->sortKeys()
            ->all();

        $existingItems = $order->items()
            ->get(['product_id', 'variant_id', 'quantity'])
            ->mapWithKeys(function ($item) {
                $key = $item->product_id.':'
                    .($item->variant_id ?? 'null');

                return [$key => (int) $item->quantity];
            })
            ->sortKeys()
            ->all();

        return $requestedItems === $existingItems;
    }

    private function respondWithExistingOrder(
        Order $order,
        array $validated
    ) {
        if (! $this->requestMatchesOrder($order, $validated)) {
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
            ->with('items.product.images', 'items.variant')
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
            ->with('items.product.images', 'items.variant')
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

    public function cancel(Request $request, string $orderNumber)
    {
        $user = $request->user();

        $result = DB::transaction(function () use ($user, $orderNumber) {
            $order = Order::query()
                ->where('user_id', $user->id)
                ->where('order_number', $orderNumber)
                ->lockForUpdate()
                ->first();

            if (! $order) {
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
                if ($item->variant_id !== null) {
                    $variant = ProductVariant::query()
                        ->whereKey($item->variant_id)
                        ->lockForUpdate()
                        ->first();

                    if ($variant) {
                        $variant->increment('stock', $item->quantity);

                        continue;
                    }
                }

                if ($item->product_id !== null && $item->variant_id === null) {
                    $product = Product::query()
                        ->whereKey($item->product_id)
                        ->lockForUpdate()
                        ->first();

                    if ($product) {
                        $product->increment('stock', $item->quantity);
                    }
                }
            }

            $order->status = 'cancelled';
            $order->stock_restored_at = now();
            $order->save();

            return [
                'order' => $order->fresh()->load(
                    'items.product.images',
                    'items.variant'
                ),
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
            'message' => 'سفارش با موفقیت لغو شد و موجودی آن بازگردانده شد.',
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

        if (! $order) {
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
        /*
         * لایه دفاعی دوم: حتی اگر پیکربندی اشتباه باشد،
         * پرداخت آزمایشی هرگز در محیط production اجرا نمی‌شود.
         */
        if (
            app()->environment('production')
            || config('payment.mode') !== 'demo'
            || ! config('payment.demo_enabled')
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

            if (! $order) {
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
                    'order' => $order->load(
                        'items.product.images',
                        'items.variant'
                    ),
                    'already_paid' => true,
                ];
            }

            if ($order->payment_status !== 'unpaid') {
                return [
                    'error' => 'وضعیت پرداخت این سفارش قابل پرداخت نیست.',
                    'status' => 422,
                ];
            }

            $order->payment_status = 'paid';
            $order->status = 'processing';
            $order->save();

            return [
                'order' => $order->fresh()->load(
                    'items.product.images',
                    'items.variant'
                ),
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
            'message' => ! empty($result['already_paid'])
                ? 'این سفارش قبلاً پرداخت شده است.'
                : 'پرداخت آزمایشی با موفقیت انجام شد.',
            'data' => $result['order'],
        ]);
    }
}
