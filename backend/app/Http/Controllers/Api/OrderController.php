<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
        ]);

        $user = $request->user();

        $order = DB::transaction(function () use ($validated, $user) {
            $subtotal = 0;
            $discount = 0;
            $orderItems = [];

            foreach ($validated['items'] as $item) {
                $product = Product::query()
                    ->where('id', $item['product_id'])
                    ->where('is_active', true)
                    ->lockForUpdate()
                    ->first();

                if (!$product) {
                    abort(422, 'یکی از محصولات موجود نیست.');
                }

                if ($product->stock < $item['quantity']) {
                    abort(
                        422,
                        "موجودی محصول {$product->name} کافی نیست."
                    );
                }

                $originalUnitPrice = round(
                    (float) $product->price,
                    2
                );

                $quantity = (int) $item['quantity'];

                $discountPercent = min(
                    max(
                        (float) $product->discount_percent,
                        0
                    ),
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

            $total = round(
                $subtotal + $shippingCost - $discount,
                2
            );

            do {
                $orderNumber =
                    'ORD-' .
                    now()->format('Ymd') .
                    '-' .
                    strtoupper(
                        substr(
                            str_shuffle(
                                'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
                            ),
                            0,
                            6
                        )
                    );
            } while (
                Order::where('order_number', $orderNumber)->exists()
            );

            $order = Order::create([
                'user_id' => $user->id,
                'order_number' => $orderNumber,
                'subtotal' => $subtotal,
                'shipping_cost' => $shippingCost,
                'discount' => $discount,
                'total' => $total,
                'status' => 'pending',
                'payment_status' => 'unpaid',
                'recipient_name' => $validated['recipient_name'],
                'phone' => $validated['phone'],
                'address' => $validated['address'],
                'postal_code' => $validated['postal_code'] ?? null,
                'notes' => $validated['notes'] ?? null,
            ]);

            foreach ($orderItems as $item) {
                $order->items()->create($item);
            }

            return $order->load('items.product.images');
        });

        return response()->json([
            'success' => true,
            'message' => 'سفارش با موفقیت ایجاد شد و آماده پرداخت است.',
            'data' => $order,
        ], 201);
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

        $order = Order::query()
            ->where('user_id', $user->id)
            ->where('order_number', $orderNumber)
            ->with('items.product.images')
            ->first();

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'سفارش موردنظر پیدا نشد.',
            ], 404);
        }

        if (
            in_array(
                $order->status,
                ['shipped', 'delivered', 'cancelled']
            )
        ) {
            return response()->json([
                'success' => false,
                'message' => 'این سفارش در حال حاضر قابل لغو نیست.',
            ], 422);
        }

        if ($order->payment_status === 'paid') {
            return response()->json([
                'success' => false,
                'message' => 'سفارش پرداخت‌شده قابل لغو مستقیم نیست.',
            ], 422);
        }

        DB::transaction(function () use ($order) {
            foreach ($order->items as $item) {
                Product::where('id', $item->product_id)
                    ->increment('stock', $item->quantity);
            }

            $order->update([
                'status' => 'cancelled',
                'payment_status' => 'unpaid',
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => 'سفارش با موفقیت لغو شد.',
            'data' => $order
                ->fresh()
                ->load('items.product.images'),
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
        $user = $request->user();

        $order = Order::query()
            ->where('user_id', $user->id)
            ->where('order_number', $orderNumber)
            ->with('items.product.images')
            ->first();

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'سفارش موردنظر پیدا نشد.',
            ], 404);
        }

        if ($order->status === 'cancelled') {
            return response()->json([
                'success' => false,
                'message' => 'این سفارش لغو شده است.',
            ], 422);
        }

        if ($order->payment_status === 'paid') {
            return response()->json([
                'success' => true,
                'message' => 'این سفارش قبلاً پرداخت شده است.',
                'data' => $order,
            ]);
        }

        $order->update([
            'payment_status' => 'paid',
            'status' => 'processing',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'پرداخت با موفقیت انجام شد.',
            'data' => $order
                ->fresh()
                ->load('items.product.images'),
        ]);
    }
}