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
use App\Services\Notifications\AdminNotificationService;
use App\Services\Orders\OrderCouponService;
use App\Services\Orders\OrderStockService;
use App\Support\GuestAccessCode;
use App\Support\OrderStatus;
use App\Support\PaymentMethod;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Throwable;

class OrderController extends Controller
{
    public function __construct(
        private readonly AdminNotificationService $notifications,
        private readonly OrderStockService $stock,
        private readonly OrderCouponService $coupons
    ) {
    }

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
            'payment_method' => [
                'nullable',
                'string',
                Rule::in(PaymentMethod::ALL),
            ],
        ]);

        $paymentMethod = $validated['payment_method'] ?? PaymentMethod::ONLINE;

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

        /*
         * اگر توکن Sanctum همراه درخواست باشد، سفارش به حساب کاربر وصل
         * می‌شود؛ در غیر این صورت سفارش «مهمان» است. سفارش مهمان فقط با
         * «پرداخت در محل» ثبت می‌شود تا پرداخت و پیگیری آن قابل مدیریت بماند.
         */
        $user = $request->user('sanctum');
        $guestToken = null;

        if ($user === null) {
            $guestToken = $request->header('X-Guest-Token');

            if (! is_string($guestToken) || ! Str::isUuid($guestToken)) {
                return response()->json([
                    'success' => false,
                    'message' => 'شناسهٔ مرورگر برای ثبت سفارش مهمان معتبر نیست.',
                ], 422);
            }

            if ($paymentMethod !== PaymentMethod::COD) {
                return response()->json([
                    'success' => false,
                    'message' => 'سفارش مهمان فقط با روش «پرداخت در محل» ثبت می‌شود. برای پرداخت آنلاین وارد حساب کاربری شوید.',
                ], 422);
            }
        }

        /*
         * کد پیگیری مهمان: اگر localStorage مرورگر پاک شود، مشتری با
         * «شماره سفارش + این کد» دوباره به فاکتور و لغو سفارش خودش می‌رسد.
         * کد فقط در پاسخ ثبت سفارش (و تکرار Idempotency) برگردانده می‌شود.
         */
        $guestAccessCode = $guestToken !== null
            ? $this->newGuestAccessCode()
            : null;

        $idempotencyKey = $request->header('Idempotency-Key');

        if (! is_string($idempotencyKey) || ! Str::isUuid($idempotencyKey)) {
            return response()->json([
                'success' => false,
                'message' => 'کلید یکتای درخواست معتبر نیست.',
            ], 422);
        }

        $existingOrder = $this->findIdempotentOrder(
            $user?->id,
            $guestToken,
            $idempotencyKey
        );

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
                $guestToken,
                $guestAccessCode,
                $idempotencyKey,
                $paymentMethod
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
                        'cost_price' => $product->cost_price !== null
                            ? (float) $product->cost_price
                            : null,
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

                    /*
                     * سقف استفادهٔ هر مشتری: برای کاربر با user_id و برای مهمان
                     * با شمارهٔ تماس سفارش سنجیده می‌شود. سفارش‌های لغوشده در
                     * شمارش نمی‌آیند (Coupon::perUserUsageError/perPhoneUsageError).
                     */
                    $perUserError = $user !== null
                        ? $appliedCoupon->perUserUsageError((int) $user->id)
                        : $appliedCoupon->perPhoneUsageError(
                            (string) $validated['phone']
                        );

                    if ($perUserError !== null) {
                        abort(422, $perUserError);
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

                /*
                 * سقف سفارش «پرداخت در محل»: چون هیچ پرداخت اولیه‌ای انجام
                 * نمی‌شود، مبلغ نهایی بیش از حد مجاز پذیرفته نیست. مقدار صفر
                 * در config یعنی بدون سقف. این بررسی داخل تراکنش است، پس با
                 * رد شدن سفارش، موجودی و سهمیهٔ کوپن هم برمی‌گردد.
                 */
                $codMaxTotal = (float) config('payment.cod_max_total', 0);

                if (
                    $paymentMethod === PaymentMethod::COD
                    && $codMaxTotal > 0
                    && $total > $codMaxTotal
                ) {
                    abort(
                        422,
                        'سقف مبلغ سفارش «پرداخت در محل» '
                        .number_format($codMaxTotal)
                        .' تومان است؛ برای مبالغ بیشتر از پرداخت آنلاین استفاده کنید.'
                    );
                }

                do {
                    $orderNumber = 'ORD-'
                        .now()->format('Ymd')
                        .'-'
                        .strtoupper(Str::random(6));
                } while (
                    Order::where('order_number', $orderNumber)->exists()
                );

                $order = Order::create([
                    'user_id' => $user?->id,
                    'guest_token' => $guestToken,
                    'guest_access_code' => $guestAccessCode,
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
                    'status' => $paymentMethod === PaymentMethod::COD
                        ? OrderStatus::PROCESSING
                        : OrderStatus::PENDING,
                    'payment_status' => 'unpaid',
                    'payment_method' => $paymentMethod,
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
            $existingOrder = $this->findIdempotentOrder(
                $user?->id,
                $guestToken,
                $idempotencyKey
            );

            if ($existingOrder) {
                return $this->respondWithExistingOrder(
                    $existingOrder,
                    $validated
                );
            }

            throw $e;
        }

        // اعلان زنگولهٔ پنل برای سفارش تازه ثبت‌شده (خطای اعلان هرگز ثبت سفارش
        // را خراب نمی‌کند).
        try {
            $this->notifications->orderPlaced($order);
        } catch (Throwable) {
            // بی‌صدا رد می‌شویم؛ سفارش ثبت شده است.
        }

        return response()->json([
            'success' => true,
            'message' => $paymentMethod === PaymentMethod::COD
                ? 'سفارش شما با روش پرداخت در محل ثبت شد؛ مبلغ را هنگام تحویل بپردازید.'
                : 'سفارش با موفقیت ایجاد شد و آماده پرداخت است.',
            'data' => $order->makeVisible('guest_access_code'),
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
                === ($validated['notes'] ?? null)
            /*
             * تغییر روش پرداخت با همان کلید Idempotency، سفارش متفاوتی است
             * و نباید سفارش قبلی را برگرداند.
             */
            && ($order->payment_method ?? PaymentMethod::ONLINE)
                === ($validated['payment_method'] ?? PaymentMethod::ONLINE);

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

    /**
     * یافتن سفارش قبلی با همان کلید Idempotency.
     *
     * برای کاربر ثبت‌شده مالکیت با user_id و برای مهمان با guest_token
     * سنجیده می‌شود؛ مهمان دیگری با همان کلید تصادفی به سفارش دست نمی‌یابد.
     */
    private function findIdempotentOrder(
        ?int $userId,
        ?string $guestToken,
        string $idempotencyKey
    ): ?Order {
        return Order::query()
            ->when(
                $userId !== null,
                fn ($query) => $query->where('user_id', $userId),
                fn ($query) => $query
                    ->whereNull('user_id')
                    ->where('guest_token', $guestToken)
            )
            ->where('idempotency_key', $idempotencyKey)
            ->with('items.product.images', 'items.variant')
            ->first();
    }

    /**
     * کد پیگیری یکتا برای سفارش مهمان.
     *
     * تکرار کد بعید است، اما چون ستون unique است پیش از ذخیره بررسی می‌کنیم
     * تا خطای دیتابیس رخ ندهد.
     */
    private function newGuestAccessCode(): string
    {
        do {
            $code = GuestAccessCode::generate();
        } while (
            Order::query()->where('guest_access_code', $code)->exists()
        );

        return $code;
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
            'data' => $order->makeVisible('guest_access_code'),
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

    /**
     * جزئیات سفارش برای صاحب سفارش.
     *
     * مالکیت با توکن Sanctum (کاربر) یا هدر X-Guest-Token (سفارش مهمان)
     * سنجیده می‌شود؛ مهمان فقط سفارش خودش را می‌بیند و همین پاسخ مبنای
     * صفحهٔ فاکتور است.
     */
    public function show(Request $request, string $orderNumber)
    {
        if (! $this->hasCustomerIdentity($request)) {
            return response()->json([
                'success' => false,
                'message' => 'برای مشاهدهٔ این سفارش باید وارد حساب کاربری شوید یا شناسهٔ مرورگر مهمان ارسال شود.',
            ], 401);
        }

        $order = $this->findOwnedOrder($request, $orderNumber);

        $order?->load(
            'items.product.images',
            'items.variant',
            'returnRequest'
        );

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
     * لغو سفارش توسط مشتری (کاربر یا مهمان با X-Guest-Token).
     *
     * قواعد قبلی دست‌نخورده است: فقط سفارش پرداخت‌نشده، لغونشده و
     * ارسال‌نشده؛ بازگردانی موجودی همچنان از OrderStockService انجام می‌شود.
     */
    public function cancel(Request $request, string $orderNumber)
    {
        if (! $this->hasCustomerIdentity($request)) {
            return response()->json([
                'success' => false,
                'message' => 'برای لغو سفارش باید وارد حساب کاربری شوید یا شناسهٔ مرورگر مهمان ارسال شود.',
            ], 401);
        }

        $result = DB::transaction(function () use ($request, $orderNumber) {
            $order = $this->findOwnedOrder($request, $orderNumber, true);

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

            $this->stock->restore($order);

            $order->status = 'cancelled';
            $order->save();

            /*
             * تخفیف کوپن با لغو سفارش مصرف‌شده نمی‌ماند؛ همان تراکنش سهمیهٔ
             * کوپن را آزاد می‌کند تا سقف کل زودتر از واقعیت پر نشود.
             */
            $this->coupons->release($order);

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

            /*
             * سفارش پرداخت در محل از درگاه آنلاین پرداخت نمی‌شود؛ وجه هنگام
             * تحویل دریافت و توسط مدیر ثبت می‌شود.
             */
            if ($order->payment_method === PaymentMethod::COD) {
                return [
                    'error' => 'این سفارش با روش «پرداخت در محل» ثبت شده است و پرداخت آنلاین برای آن امکان‌پذیر نیست.',
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
            $order->paid_at = now();
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
     * شناسهٔ معتبر مرورگر مهمان از هدر؛ در صورت نبود/نامعتبر بودن null.
     */
    private function guestTokenFrom(Request $request): ?string
    {
        $guestToken = $request->header('X-Guest-Token');

        return is_string($guestToken) && Str::isUuid($guestToken)
            ? $guestToken
            : null;
    }

    /**
     * آیا درخواست هویت مشتری دارد؟ (توکن Sanctum یا شناسهٔ مهمان)
     */
    private function hasCustomerIdentity(Request $request): bool
    {
        return $request->user('sanctum') !== null
            || $this->guestTokenFrom($request) !== null;
    }

    /**
     * یافتن سفارش متعلق به همان کاربر یا همان مرورگر مهمان.
     *
     * برای کاربر با user_id و برای مهمان با (user_id = NULL و guest_token)
     * فیلتر می‌شود تا هیچ سفارشی بین هویت‌ها جابه‌جا نشود.
     */
    private function findOwnedOrder(
        Request $request,
        string $orderNumber,
        bool $lock = false
    ): ?Order {
        $user = $request->user('sanctum');

        $query = Order::query()->where('order_number', $orderNumber);

        if ($user !== null) {
            $query->where('user_id', $user->id);
        } else {
            $guestToken = $this->guestTokenFrom($request);

            if ($guestToken === null) {
                return null;
            }

            $query->whereNull('user_id')->where('guest_token', $guestToken);
        }

        if ($lock) {
            $query->lockForUpdate();
        }

        return $query->first();
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
