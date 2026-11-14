<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * هزینه‌های فروشگاه (باربری، بسته‌بندی، تبلیغات و ...).
 */
class AdminExpenseController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:150'],
            'category' => ['nullable', Rule::in(array_keys(Expense::CATEGORIES))],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = Expense::query()
            ->with('supplier:id,name')
            ->latest('spent_at')
            ->latest('id');

        if (! empty($validated['search'])) {
            $search = $validated['search'];

            $query->where(function ($inner) use ($search) {
                $inner->where('title', 'like', "%{$search}%")
                    ->orWhere('note', 'like', "%{$search}%");
            });
        }

        if (! empty($validated['category'])) {
            $query->where('category', $validated['category']);
        }

        if (! empty($validated['from'])) {
            $query->whereDate('spent_at', '>=', $validated['from']);
        }

        if (! empty($validated['to'])) {
            $query->whereDate('spent_at', '<=', $validated['to']);
        }

        $total = (clone $query)->sum('amount');
        $page = $query->paginate($validated['per_page'] ?? 15);

        return response()->json([
            'success' => true,
            'data' => $page,
            'meta' => [
                'total_amount' => round((float) $total, 2),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $expense = Expense::create(
            $this->validated($request) + ['created_by' => $request->user()?->id]
        );

        return response()->json([
            'success' => true,
            'message' => 'هزینه ثبت شد.',
            'data' => $expense->load('supplier:id,name'),
        ], 201);
    }

    public function update(Request $request, Expense $expense): JsonResponse
    {
        $expense->update($this->validated($request));

        return response()->json([
            'success' => true,
            'message' => 'هزینه به‌روزرسانی شد.',
            'data' => $expense->refresh()->load('supplier:id,name'),
        ]);
    }

    public function destroy(Expense $expense): JsonResponse
    {
        $expense->delete();

        return response()->json([
            'success' => true,
            'message' => 'هزینه حذف شد.',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'category' => ['required', Rule::in(array_keys(Expense::CATEGORIES))],
            'amount' => ['required', 'numeric', 'min:0'],
            'spent_at' => ['required', 'date'],
            'supplier_id' => ['nullable', 'integer', 'exists:suppliers,id'],
            'note' => ['nullable', 'string'],
        ], [
            'title.required' => 'عنوان هزینه را وارد کنید.',
            'amount.required' => 'مبلغ هزینه را وارد کنید.',
            'spent_at.required' => 'تاریخ هزینه را وارد کنید.',
        ]);
    }
}
