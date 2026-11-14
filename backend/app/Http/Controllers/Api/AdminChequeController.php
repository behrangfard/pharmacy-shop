<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cheque;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * مدیریت چک‌ها (پرداختی به تأمین‌کننده و دریافتی از مشتری).
 */
class AdminChequeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:150'],
            'direction' => ['nullable', Rule::in([Cheque::DIRECTION_PAID, Cheque::DIRECTION_RECEIVED])],
            'status' => ['nullable', Rule::in(Cheque::STATUSES)],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = Cheque::query()
            ->with('supplier:id,name')
            ->orderBy('due_date')
            ->orderBy('id');

        if (! empty($validated['search'])) {
            $search = $validated['search'];

            $query->where(function ($inner) use ($search) {
                $inner->where('party_name', 'like', "%{$search}%")
                    ->orWhere('serial', 'like', "%{$search}%")
                    ->orWhere('bank_name', 'like', "%{$search}%");
            });
        }

        if (! empty($validated['direction'])) {
            $query->where('direction', $validated['direction']);
        }

        if (! empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        if (! empty($validated['from'])) {
            $query->whereDate('due_date', '>=', $validated['from']);
        }

        if (! empty($validated['to'])) {
            $query->whereDate('due_date', '<=', $validated['to']);
        }

        $totals = (clone $query)
            ->reorder()
            ->selectRaw('COALESCE(SUM(CASE WHEN direction = ? THEN amount ELSE 0 END), 0) as paid', [Cheque::DIRECTION_PAID])
            ->selectRaw('COALESCE(SUM(CASE WHEN direction = ? THEN amount ELSE 0 END), 0) as received', [Cheque::DIRECTION_RECEIVED])
            ->first();

        return response()->json([
            'success' => true,
            'data' => $query->paginate($validated['per_page'] ?? 15),
            'meta' => [
                'paid_total' => round((float) ($totals->paid ?? 0), 2),
                'received_total' => round((float) ($totals->received ?? 0), 2),
                'today' => now()->toDateString(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validated($request);

        $cheque = Cheque::create($this->withClearedAt($validated) + [
            'created_by' => $request->user()?->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'چک ثبت شد.',
            'data' => $cheque->load('supplier:id,name'),
        ], 201);
    }

    public function update(Request $request, Cheque $cheque): JsonResponse
    {
        $validated = $this->validated($request);

        $cheque->update($this->withClearedAt($validated));

        return response()->json([
            'success' => true,
            'message' => 'اطلاعات چک به‌روزرسانی شد.',
            'data' => $cheque->refresh()->load('supplier:id,name'),
        ]);
    }

    /**
     * تغییر سریع وضعیت چک (پاس شد / برگشت خورد / لغو).
     */
    public function status(Request $request, Cheque $cheque): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(Cheque::STATUSES)],
        ]);

        $cheque->update($this->withClearedAt($validated));

        return response()->json([
            'success' => true,
            'message' => 'وضعیت چک تغییر کرد.',
            'data' => $cheque->refresh(),
        ]);
    }

    public function destroy(Cheque $cheque): JsonResponse
    {
        $cheque->delete();

        return response()->json([
            'success' => true,
            'message' => 'چک حذف شد.',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request): array
    {
        return $request->validate([
            'direction' => ['required', Rule::in([Cheque::DIRECTION_PAID, Cheque::DIRECTION_RECEIVED])],
            'amount' => ['required', 'numeric', 'min:0'],
            'due_date' => ['required', 'date'],
            'bank_name' => ['nullable', 'string', 'max:255'],
            'serial' => ['nullable', 'string', 'max:50'],
            'party_name' => ['nullable', 'string', 'max:255'],
            'supplier_id' => ['nullable', 'integer', 'exists:suppliers,id'],
            'status' => ['nullable', Rule::in(Cheque::STATUSES)],
            'note' => ['nullable', 'string'],
        ], [
            'direction.required' => 'نوع چک (دریافتی یا پرداختی) را انتخاب کنید.',
            'amount.required' => 'مبلغ چک را وارد کنید.',
            'due_date.required' => 'تاریخ سررسید چک را وارد کنید.',
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function withClearedAt(array $data): array
    {
        $status = $data['status'] ?? Cheque::STATUS_PENDING;

        $data['status'] = $status;
        $data['cleared_at'] = $status === Cheque::STATUS_CLEARED ? now() : null;

        return $data;
    }
}
