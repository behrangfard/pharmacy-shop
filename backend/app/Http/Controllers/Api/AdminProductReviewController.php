<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProductReview;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminProductReviewController extends Controller
{
    /**
     * Display product reviews for admin.
     */
    public function index(Request $request)
    {
        $validated = $request->validate([
            'status' => [
                'nullable',
                Rule::in(['pending', 'approved', 'rejected']),
            ],
            'search' => ['nullable', 'string', 'max:150'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = ProductReview::query()
            ->with([
                'product:id,name,slug',
                'user:id,name,email',
                'order:id,order_number',
            ])
            ->latest();

        if (! empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        if (! empty($validated['search'])) {
            $search = $validated['search'];

            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('comment', 'like', "%{$search}%")
                    ->orWhereHas('product', function ($productQuery) use ($search) {
                        $productQuery->where('name', 'like', "%{$search}%");
                    })
                    ->orWhereHas('user', function ($userQuery) use ($search) {
                        $userQuery->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        $reviews = $query->paginate($validated['per_page'] ?? 15);

        return response()->json([
            'success' => true,
            'data' => $reviews,
        ]);
    }

    /**
     * Approve or reject a product review.
     */
    public function updateStatus(Request $request, int $reviewId)
    {
        $validated = $request->validate([
            'status' => [
                'required',
                Rule::in(['approved', 'rejected']),
            ],
        ]);

        $review = ProductReview::findOrFail($reviewId);

        $review->status = $validated['status'];
        $review->approved_at = $validated['status'] === 'approved'
            ? now()
            : null;

        $review->save();

        return response()->json([
            'success' => true,
            'message' => $review->status === 'approved'
                ? 'نظر با موفقیت تأیید شد.'
                : 'نظر رد شد.',
            'data' => $review->load([
                'product:id,name,slug',
                'user:id,name,email',
                'order:id,order_number',
            ]),
        ]);
    }

    /**
     * Reply to a product review.
     */
    public function reply(Request $request, int $reviewId)
    {
        $validated = $request->validate([
            'admin_reply' => ['required', 'string', 'min:2', 'max:3000'],
        ]);

        $review = ProductReview::findOrFail($reviewId);

        $review->admin_reply = $validated['admin_reply'];
        $review->replied_at = now();
        $review->save();

        return response()->json([
            'success' => true,
            'message' => 'پاسخ مدیر با موفقیت ثبت شد.',
            'data' => $review->load([
                'product:id,name,slug',
                'user:id,name,email',
                'order:id,order_number',
            ]),
        ]);
    }
}
