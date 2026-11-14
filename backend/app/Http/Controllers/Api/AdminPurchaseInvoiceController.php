<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\PurchaseInvoice;
use App\Services\Accounting\PurchaseInvoiceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * فاکتورهای خرید و اقلام آن‌ها.
 *
 * با ثبت فاکتور، موجودی محصولات افزایش می‌یابد و بهای تمام‌شدهٔ آن‌ها
 * به‌روز می‌شود (منطقی که در PurchaseInvoiceService پیاده شده است).
 */
class AdminPurchaseInvoiceController extends Controller
{
    public function __construct(
        private readonly PurchaseInvoiceService $invoices
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:150'],
            'supplier_id' => ['nullable', 'integer'],
            'payment_status' => ['nullable', Rule::in([
                PurchaseInvoice::STATUS_UNPAID,
                PurchaseInvoice::STATUS_PARTIAL,
                PurchaseInvoice::STATUS_PAID,
            ])],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = PurchaseInvoice::query()
            ->with('supplier:id,name')
            ->withCount('items')
            ->latest('issued_at')
            ->latest('id');

        if (! empty($validated['search'])) {
            $search = $validated['search'];

            $query->where(function ($inner) use ($search) {
                $inner->where('invoice_number', 'like', "%{$search}%")
                    ->orWhereHas('supplier', fn ($supplier) => $supplier->where('name', 'like', "%{$search}%"));
            });
        }

        if (! empty($validated['supplier_id'])) {
            $query->where('supplier_id', $validated['supplier_id']);
        }

        if (! empty($validated['payment_status'])) {
            $query->where('payment_status', $validated['payment_status']);
        }

        if (! empty($validated['from'])) {
            $query->whereDate('issued_at', '>=', $validated['from']);
        }

        if (! empty($validated['to'])) {
            $query->whereDate('issued_at', '<=', $validated['to']);
        }

        return response()->json([
            'success' => true,
            'data' => $query->paginate($validated['per_page'] ?? 15),
        ]);
    }

    public function show(PurchaseInvoice $purchaseInvoice): JsonResponse
    {
        $purchaseInvoice->load([
            'supplier:id,name,phone',
            'items.product:id,name,sku,stock,cost_price',
        ]);

        return response()->json([
            'success' => true,
            'data' => $purchaseInvoice,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate($this->rules(), $this->messages());

        $invoice = $this->invoices->create($validated, $request->user()?->id);

        return response()->json([
            'success' => true,
            'message' => 'فاکتور خرید ثبت شد و موجودی محصولات به‌روزرسانی شد.',
            'data' => $invoice,
        ], 201);
    }

    public function update(Request $request, PurchaseInvoice $purchaseInvoice): JsonResponse
    {
        $validated = $request->validate($this->rules(), $this->messages());

        $invoice = $this->invoices->update($purchaseInvoice, $validated);

        return response()->json([
            'success' => true,
            'message' => 'فاکتور خرید ویرایش و موجودی به‌روزرسانی شد.',
            'data' => $invoice,
        ]);
    }

    public function destroy(PurchaseInvoice $purchaseInvoice): JsonResponse
    {
        $this->invoices->delete($purchaseInvoice);

        return response()->json([
            'success' => true,
            'message' => 'فاکتور خرید حذف و موجودی اقلام آن برگشت داده شد.',
        ]);
    }

    /**
     * ثبت/به‌روزرسانی مبلغ پرداخت‌شده به تأمین‌کننده.
     */
    public function payment(Request $request, PurchaseInvoice $purchaseInvoice): JsonResponse
    {
        $validated = $request->validate([
            'paid_amount' => ['required', 'numeric', 'min:0'],
        ]);

        $invoice = $this->invoices->syncPayment(
            $purchaseInvoice,
            (float) $validated['paid_amount']
        );

        return response()->json([
            'success' => true,
            'message' => 'وضعیت پرداخت فاکتور به‌روزرسانی شد.',
            'data' => $invoice->refresh(),
        ]);
    }

    /**
     * جست‌وجوی محصولات برای انتخاب در اقلام فاکتور (بدون نیاز به مجوز محصولات).
     */
    public function products(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:150'],
        ]);

        $query = Product::query()
            ->select(['id', 'name', 'sku', 'stock', 'price', 'cost_price'])
            ->orderBy('name')
            ->limit(30);

        if (! empty($validated['search'])) {
            $search = $validated['search'];

            $query->where(function ($inner) use ($search) {
                $inner->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%");
            });
        }

        return response()->json([
            'success' => true,
            'data' => $query->get(),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(): array
    {
        return [
            'invoice_number' => ['nullable', 'string', 'max:50'],
            'supplier_id' => ['nullable', 'integer', 'exists:suppliers,id'],
            'issued_at' => ['required', 'date'],
            'discount' => ['nullable', 'numeric', 'min:0'],
            'shipping_cost' => ['nullable', 'numeric', 'min:0'],
            'tax_amount' => ['nullable', 'numeric', 'min:0'],
            'paid_amount' => ['nullable', 'numeric', 'min:0'],
            'note' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1', 'max:200'],
            'items.*.product_id' => ['nullable', 'integer', 'exists:products,id'],
            'items.*.title' => ['nullable', 'string', 'max:255'],
            'items.*.sku' => ['nullable', 'string', 'max:255'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:100000'],
            'items.*.unit_cost' => ['required', 'numeric', 'min:0'],
            'items.*.discount' => ['nullable', 'numeric', 'min:0'],
        ];
    }

    /**
     * @return array<string, string>
     */
    private function messages(): array
    {
        return [
            'issued_at.required' => 'تاریخ فاکتور را وارد کنید.',
            'items.required' => 'حداقل یک قلم برای فاکتور لازم است.',
            'items.min' => 'حداقل یک قلم برای فاکتور لازم است.',
            'items.*.quantity.required' => 'تعداد هر قلم را وارد کنید.',
            'items.*.unit_cost.required' => 'قیمت خرید هر قلم را وارد کنید.',
        ];
    }
}
