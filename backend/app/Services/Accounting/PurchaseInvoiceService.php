<?php

namespace App\Services\Accounting;

use App\Models\Product;
use App\Models\PurchaseInvoice;
use Illuminate\Support\Facades\DB;

/**
 * ثبت و ویرایش فاکتورهای خرید.
 *
 * قاعده‌ها:
 *  - هر قلم که به یک محصول وصل باشد، موجودی همان محصول را افزایش می‌دهد.
 *  - «بهای تمام‌شده» محصول با آخرین قیمت خرید همان قلم به‌روز می‌شود.
 *  - ویرایش یا حذف فاکتور، تغییرات موجودی را برمی‌گرداند تا موجودی انبار
 *    با فاکتورهای موجود هم‌خوان بماند.
 */
class PurchaseInvoiceService
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data, ?int $userId = null): PurchaseInvoice
    {
        return DB::transaction(function () use ($data, $userId) {
            $items = $this->normalizeItems($data['items'] ?? []);
            $totals = $this->totals($items, $data);

            $invoice = PurchaseInvoice::create([
                'invoice_number' => $this->uniqueNumber($data['invoice_number'] ?? null),
                'supplier_id' => $data['supplier_id'] ?? null,
                'issued_at' => $data['issued_at'],
                'items_total' => $totals['items_total'],
                'discount' => $totals['discount'],
                'shipping_cost' => $totals['shipping_cost'],
                'tax_amount' => $totals['tax_amount'],
                'total' => $totals['total'],
                'paid_amount' => 0,
                'payment_status' => PurchaseInvoice::STATUS_UNPAID,
                'note' => $data['note'] ?? null,
                'created_by' => $userId,
            ]);

            foreach ($items as $item) {
                $invoice->items()->create($item);
            }

            $this->applyStock($items);
            $this->syncPayment($invoice, (float) ($data['paid_amount'] ?? 0));

            return $invoice->refresh()->load('items', 'supplier');
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(PurchaseInvoice $invoice, array $data): PurchaseInvoice
    {
        return DB::transaction(function () use ($invoice, $data) {
            $invoice = PurchaseInvoice::query()
                ->whereKey($invoice->id)
                ->lockForUpdate()
                ->firstOrFail();

            $this->reverseStock($invoice);
            $invoice->items()->delete();

            $items = $this->normalizeItems($data['items'] ?? []);
            $totals = $this->totals($items, $data);

            $invoice->fill([
                'invoice_number' => $this->uniqueNumber($data['invoice_number'] ?? null, $invoice->id),
                'supplier_id' => $data['supplier_id'] ?? null,
                'issued_at' => $data['issued_at'],
                'items_total' => $totals['items_total'],
                'discount' => $totals['discount'],
                'shipping_cost' => $totals['shipping_cost'],
                'tax_amount' => $totals['tax_amount'],
                'total' => $totals['total'],
                'note' => $data['note'] ?? null,
            ]);

            $invoice->save();

            foreach ($items as $item) {
                $invoice->items()->create($item);
            }

            $this->applyStock($items);
            $this->syncPayment($invoice, (float) ($data['paid_amount'] ?? 0));

            return $invoice->refresh()->load('items', 'supplier');
        });
    }

    public function delete(PurchaseInvoice $invoice): void
    {
        DB::transaction(function () use ($invoice) {
            $invoice = PurchaseInvoice::query()
                ->whereKey($invoice->id)
                ->lockForUpdate()
                ->firstOrFail();

            $this->reverseStock($invoice);
            $invoice->items()->delete();
            $invoice->delete();
        });
    }

    /**
     * مبلغ پرداخت‌شده را ثبت و وضعیت پرداخت را از آن استخراج می‌کند.
     */
    public function syncPayment(PurchaseInvoice $invoice, float $paidAmount): PurchaseInvoice
    {
        $total = (float) $invoice->total;
        $paid = round(min(max($paidAmount, 0), $total), 2);

        $status = match (true) {
            $paid <= 0 => PurchaseInvoice::STATUS_UNPAID,
            $paid >= $total => PurchaseInvoice::STATUS_PAID,
            default => PurchaseInvoice::STATUS_PARTIAL,
        };

        $invoice->forceFill([
            'paid_amount' => $paid,
            'payment_status' => $status,
        ])->save();

        return $invoice;
    }

    /**
     * @param  array<int, array<string, mixed>>  $items
     * @return list<array<string, mixed>>
     */
    private function normalizeItems(array $items): array
    {
        $normalized = [];
        $productIds = [];

        foreach ($items as $item) {
            if (isset($item['product_id']) && $item['product_id'] !== null && $item['product_id'] !== '') {
                $productIds[] = (int) $item['product_id'];
            }
        }

        $products = Product::query()
            ->whereIn('id', $productIds)
            ->get(['id', 'name', 'sku'])
            ->keyBy('id');

        foreach ($items as $item) {
            $productId = isset($item['product_id']) && $item['product_id'] !== null && $item['product_id'] !== ''
                ? (int) $item['product_id']
                : null;

            $product = $productId !== null ? $products->get($productId) : null;

            $quantity = max(1, (int) ($item['quantity'] ?? 1));
            $unitCost = max(0, (float) ($item['unit_cost'] ?? 0));
            $discount = max(0, (float) ($item['discount'] ?? 0));

            $title = trim((string) ($item['title'] ?? ''));

            if ($title === '') {
                $title = $product?->name ?? 'کالا';
            }

            $normalized[] = [
                'product_id' => $product?->id,
                'title' => $title,
                'sku' => $product?->sku ?? ($item['sku'] ?? null),
                'quantity' => $quantity,
                'unit_cost' => $unitCost,
                'discount' => $discount,
                'total' => round(max(($quantity * $unitCost) - $discount, 0), 2),
            ];
        }

        return $normalized;
    }

    /**
     * @param  list<array<string, mixed>>  $items
     * @param  array<string, mixed>  $data
     * @return array<string, float>
     */
    private function totals(array $items, array $data): array
    {
        $itemsTotal = 0.0;

        foreach ($items as $item) {
            $itemsTotal += (float) $item['total'];
        }

        $discount = max(0, (float) ($data['discount'] ?? 0));
        $shipping = max(0, (float) ($data['shipping_cost'] ?? 0));
        $tax = max(0, (float) ($data['tax_amount'] ?? 0));

        return [
            'items_total' => round($itemsTotal, 2),
            'discount' => round($discount, 2),
            'shipping_cost' => round($shipping, 2),
            'tax_amount' => round($tax, 2),
            'total' => round(max($itemsTotal - $discount + $shipping + $tax, 0), 2),
        ];
    }

    /**
     * @param  list<array<string, mixed>>  $items
     */
    private function applyStock(array $items): void
    {
        foreach ($items as $item) {
            if (! isset($item['product_id']) || $item['product_id'] === null) {
                continue;
            }

            $product = Product::query()
                ->whereKey($item['product_id'])
                ->lockForUpdate()
                ->first();

            if ($product === null) {
                continue;
            }

            $product->forceFill([
                'stock' => (int) $product->stock + (int) $item['quantity'],
                'cost_price' => (float) $item['unit_cost'],
            ])->save();
        }
    }

    private function reverseStock(PurchaseInvoice $invoice): void
    {
        $invoice->loadMissing('items');

        foreach ($invoice->items as $item) {
            if ($item->product_id === null) {
                continue;
            }

            $product = Product::query()
                ->whereKey($item->product_id)
                ->lockForUpdate()
                ->first();

            if ($product === null) {
                continue;
            }

            $product->forceFill([
                'stock' => max((int) $product->stock - (int) $item->quantity, 0),
            ])->save();
        }
    }

    private function uniqueNumber(?string $number, ?int $ignoreId = null): string
    {
        $candidate = trim((string) $number);

        if ($candidate === '') {
            do {
                $candidate = 'PO-'.now()->format('Ym').'-'.strtoupper(bin2hex(random_bytes(3)));
            } while (
                PurchaseInvoice::query()->where('invoice_number', $candidate)->exists()
            );

            return $candidate;
        }

        $base = $candidate;
        $counter = 1;

        while (
            PurchaseInvoice::query()
                ->where('invoice_number', $candidate)
                ->when($ignoreId, fn ($query) => $query->whereKeyNot($ignoreId))
                ->exists()
        ) {
            $candidate = $base.'-'.$counter;
            $counter++;
        }

        return $candidate;
    }
}
