<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductReview;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProductReviewController extends Controller
{
    public function index(string $slug)
    {
        $product = Product::query()
            ->where('slug', $slug)
            ->where('is_active', true)
            ->firstOrFail();

        $reviews = ProductReview::query()
            ->with('user:id,name')
            ->where('product_id', $product->id)
            ->where('status', 'approved')
            ->latest()
            ->paginate(10);

        $summary = ProductReview::query()
            ->where('product_id', $product->id)
            ->where('status', 'approved')
            ->selectRaw('COUNT(*) as total, AVG(rating) as average_rating')
            ->first();

        return response()->json([
            'success' => true,
            'data' => [
                'reviews' => $reviews,
                'total' => (int) $summary->total,
                'average_rating' => round(
                    (float) ($summary->average_rating ?? 0),
                    1
                ),
            ],
        ]);
    }

    public function store(Request $request, string $slug)
    {
        $validated = $request->validate([
            'order_id' => ['required', 'integer', 'exists:orders,id'],
            'rating' => ['required', 'integer', 'between:1,5'],
            'title' => ['nullable', 'string', 'max:150'],
            'comment' => ['required', 'string', 'min:5', 'max:3000'],
        ]);

        $product = Product::query()
            ->where('slug', $slug)
            ->where('is_active', true)
            ->firstOrFail();

        $review = DB::transaction(function () use (
            $request,
            $validated,
            $product
        ) {
            $order = Order::query()
                ->whereKey($validated['order_id'])
                ->where('user_id', $request->user()->id)
                ->lockForUpdate()
                ->first();

            if (
                ! $order
                || $order->status !== 'delivered'
                || $order->payment_status !== 'paid'
            ) {
                throw ValidationException::withMessages([
                    'order_id' => 'ثبت نظر فقط برای سفارش پرداخت‌شده و تحویل‌شده امکان‌پذیر است.',
                ]);
            }

            $hasPurchasedProduct = $order->items()
                ->where('product_id', $product->id)
                ->exists();

            if (! $hasPurchasedProduct) {
                throw ValidationException::withMessages([
                    'order_id' => 'این محصول در سفارش انتخاب‌شده وجود ندارد.',
                ]);
            }

            $alreadyReviewed = ProductReview::query()
                ->where('order_id', $order->id)
                ->where('product_id', $product->id)
                ->exists();

            if ($alreadyReviewed) {
                throw ValidationException::withMessages([
                    'order_id' => 'برای این محصول در این سفارش قبلاً نظر ثبت کرده‌اید.',
                ]);
            }

            return ProductReview::create([
                'product_id' => $product->id,
                'user_id' => $request->user()->id,
                'order_id' => $order->id,
                'rating' => $validated['rating'],
                'title' => $validated['title'] ?? null,
                'comment' => $validated['comment'],
                'status' => 'pending',
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => 'نظر شما ثبت شد و پس از بررسی نمایش داده می‌شود.',
            'data' => $review,
        ], 201);
    }
}
