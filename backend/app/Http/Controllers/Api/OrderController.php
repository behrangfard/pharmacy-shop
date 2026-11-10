<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Coupon;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductColor;
use App\Models\ProductPackItem;
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
            'items.*.color_name' => ['nullable', 'string', 'max:60'],
            'items.*.pack_colors' => ['nullable', 'array', 'max:12'],
            'items.*.pack_colors.*.name' => ['required', 'string', 'max:120'],
            'items.*.pack_colors.*.color' => ['required', 'string', 'max:60'],
            'coupon_code' => ['nullable', 'string', 'max:60'],
        ]);

        // جلوگیری از تکرار یک تنوع/رنگ در چند ردیف سفارش
        $uniqueItems = [];

        foreach ($validated['items'] as $item) {
            $key = $this->itemIdentity($item);

            if (isset($uniqueItems[$key])) {
                return response()->json([
                    'success' => false,
                    'message' => 'یک محصول با تنوع و رنگ یکسان نباید در چند ردیف جداگانه ثبت شود.',
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

                    /*
                     * رنگ انتخاب‌شده: برای محصول ساده یک رنگ از پالت رنگ و
                     * برای پک چندعددی، رنگ هر قطعه. انتخاب مشتری همراه با
                     * سفارش ذخیره می‌شود تا تاریخچه دست‌نخورده بماند.
                     */
                    $palette = ProductColor::query()
                        ->where('product_id', $product->id)
                        ->where('is_active', true)
                        ->orderBy('sort_order')
                        ->orderBy('id')
                        ->pluck('name')
                        ->all();

                    $packItems = ProductPackItem::query()
                        ->where('product_id', $product->id)
                        ->orderBy('sort_order')
                        ->orderBy('id')
                        ->get();

                    $colorName = null;
                    $packColors = [];

                    if ($packItems->isNotEmpty()) {
                        $submittedPackColors = collect($item['pack_colors'] ?? [])
                            ->mapWithKeys(fn ($entry): array => [
                                trim((string) ($entry['name'] ?? '')) => trim((string) ($entry['color'] ?? '')),
                            ])
                            ->all();

                        foreach ($packItems as $packItem) {
                            $allowedColors = $packItem->colorNames();

                            // قطعه‌ای که رنگ مجاز ندارد، انتخاب رنگ هم ندارد.
                            if ($allowedColors === []) {
                                continue;
                            }

                            $chosenColor = $submittedPackColors[$packItem->name] ?? '';

                            if ($chosenColor === '') {
                                abort(
                                    422,
                                    "لطفاً رنگ «{$packItem->name}» را در پک {$product->name} انتخاب کنید."
                                );
                            }

                            if (! in_array($chosenColor, $allowedColors, true)) {
                                abort(
                                    422,
                                    "رنگ انتخاب‌شده برای «{$packItem->name}» در پک {$product->name} معتبر نیست."
                                );
                            }

                            $packColors[] = [
                                'name' => $packItem->name,
                                'color' => $chosenColor,
                            ];
                        }
                    } elseif ($palette !== []) {
                        $submittedColor = trim((string) ($item['color_name'] ?? ''));

                        if ($submittedColor === '') {
                            abort(
                                422,
                                "لطفاً رنگ محصول {$product->name} را انتخاب کنید."
                            );
                        }

                        if (! in_array($submittedColor, $palette, true)) {
                            abort(
                                422,
                                "رنگ انتخاب‌شده برای محصول {$product->name} معتبر نیست."
                            );
                        }

                        $colorName = $submittedColor;
                    } elseif (
                        trim((string) ($item['color_name'] ?? '')) !== ''
                        || ! empty($item['pack_colors'])
                    ) {
                        abort(
                            422,
                            "محصول {$product->name} رنگ‌بندی ندارد؛ انتخاب رنگ برای آن معتبر نیست."
                        );
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
                        'color_name' => $colorName,
                        'pack_colors' => $packColors === [] ? null : $packColors,
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

                $couponCode = isset($validated['coupon_code'])
                    ? Coupon::normalizeCode($validated['coupon_code'])
                    : null;

                $couponDiscount = 0.0;
                $appliedCoupon = null;

                if ($couponCode !== null && $couponCode !== '') {
                    $appliedCoupon = Coupon::query()
                        ->where('code', $couponCode)
                        ->lockForUpdate()
                        ->first();

                    if (! $appliedCoupon || ! $appliedCoupon->is_active) {
                        abort(422, 'کد تخفیف معتبر نیست یا منقضی شده است.');
                    }

                    if (
                        $appliedCoupon->starts_at !== null
                        && $appliedCoupon->starts_at->isFuture()
                    ) {
                        abort(422, 'زمان استفاده از این کد تخفیف فرا نرسیده است.');
                    }

                    if (
                        $appliedCoupon->expires_at !== null
                        && $appliedCoupon->expires_at->isPast()
                    ) {
                        abort(422, 'کد تخفیف منقضی شده است.');
                    }

                    $couponSubtotal = round($subtotal - $discount, 2);

                    $couponError = $appliedCoupon->validationError($couponSubtotal);

                    if ($couponError !== null) {
                        abort(422, $couponError);
                    }

                    $couponDiscount = $appliedCoupon->calculateDiscount($couponSubtotal);

                    if ($couponDiscount <= 0) {
                        abort(
                            422,
                            'این کد تخفیف برای سبد خرید فعلی مبلغی کاهش نمی‌دهد.'
                        );
                    }

                    $discount = round($discount + $couponDiscount, 2);

                    $appliedCoupon->increment('used_count');
                }

                $netSubtotal = round($subtotal - $discount, 2);

                $shippingCost = $this->resolveShippingCost($netSubtotal);

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
                    max($taxableAmount - $couponDiscount, 0) + $shippingCost,
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
                    'coupon_code' => $couponDiscount > 0 ? $couponCode : null,
                    'coupon_discount' => $couponDiscount,
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

    /**
     * هزینه ارسال بر اساس تنظیمات فروشگاه و مبلغ نهایی سبد.
     */
    private function resolveShippingCost(float $netSubtotal): float
    {
        $settings = StoreSetting::publicSettings();

        $freeShippingEnabled = filter_var(
            (string) $settings['free_shipping_enabled'],
            FILTER_VALIDATE_BOOLEAN
        );

        $threshold = (float) $settings['free_shipping_threshold'];

        if ($freeShippingEnabled && $threshold > 0 && $netSubtotal >= $threshold) {
            return 0.0;
        }

        return round(max((float) $settings['shipping_cost'], 0), 2);
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
            ->with(
                'items.product.images',
                'items.variant',
                'returnRequest'
            )
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

    /**
     * شناسهٔ یکتای یک قلم سفارش.
     *
     * محصول یکسان با تنوع یا رنگ متفاوت، دو قلم مستقل است؛ اما تکرار دقیق
     * همان ترکیب در دو ردیف پذیرفته نمی‌شود.
     *
     * @param  array<string, mixed>  $item
     */
    private function itemIdentity(array $item): string
    {
        $packSignature = collect($item['pack_colors'] ?? [])
            ->map(fn ($entry): string => trim((string) ($entry['name'] ?? ''))
                .'='.trim((string) ($entry['color'] ?? '')))
            ->sort()
            ->implode('|');

        return implode(':', [
            (string) ($item['product_id'] ?? ''),
            (string) ($item['variant_id'] ?? 'null'),
            trim((string) ($item['color_name'] ?? '')),
            $packSignature,
        ]);
    }
}
