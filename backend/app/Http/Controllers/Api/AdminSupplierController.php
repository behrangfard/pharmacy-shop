<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * مدیریت تأمین‌کنندگان (فروشندگانی که از آن‌ها جنس خریداری می‌شود).
 */
class AdminSupplierController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:150'],
        ]);

        $query = Supplier::query()
            ->withCount('invoices')
            ->withSum('invoices as invoices_total', 'total')
            ->withSum('invoices as invoices_paid', 'paid_amount')
            ->orderBy('name');

        if (! empty($validated['search'])) {
            $search = $validated['search'];

            $query->where(function ($inner) use ($search) {
                $inner->where('name', 'like', "%{$search}%")
                    ->orWhere('contact_name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $suppliers = $query->get()->map(fn (Supplier $supplier) => [
            'id' => $supplier->id,
            'name' => $supplier->name,
            'contact_name' => $supplier->contact_name,
            'phone' => $supplier->phone,
            'address' => $supplier->address,
            'note' => $supplier->note,
            'is_active' => $supplier->is_active,
            'invoices_count' => (int) $supplier->invoices_count,
            'invoices_total' => round((float) ($supplier->invoices_total ?? 0), 2),
            'balance' => round(
                (float) ($supplier->invoices_total ?? 0) - (float) ($supplier->invoices_paid ?? 0),
                2
            ),
        ]);

        return response()->json([
            'success' => true,
            'data' => $suppliers,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validated($request);

        $supplier = Supplier::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'تأمین‌کننده ذخیره شد.',
            'data' => $supplier,
        ], 201);
    }

    public function update(Request $request, Supplier $supplier): JsonResponse
    {
        $supplier->update($this->validated($request));

        return response()->json([
            'success' => true,
            'message' => 'اطلاعات تأمین‌کننده به‌روزرسانی شد.',
            'data' => $supplier->refresh(),
        ]);
    }

    public function destroy(Supplier $supplier): JsonResponse
    {
        $hasRecords = $supplier->invoices()->exists()
            || $supplier->expenses()->exists()
            || $supplier->cheques()->exists();

        if ($hasRecords) {
            throw ValidationException::withMessages([
                'supplier' => 'این تأمین‌کننده سابقهٔ فاکتور/هزینه/چک دارد؛ برای حذف، ابتدا آن‌ها را جابه‌جا کنید یا تأمین‌کننده را غیرفعال کنید.',
            ]);
        }

        $supplier->delete();

        return response()->json([
            'success' => true,
            'message' => 'تأمین‌کننده حذف شد.',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'contact_name' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'address' => ['nullable', 'string', 'max:255'],
            'note' => ['nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
        ], [
            'name.required' => 'نام تأمین‌کننده را وارد کنید.',
        ]);
    }
}
