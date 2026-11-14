<?php

namespace App\Services\Accounting;

use App\Models\Cheque;
use App\Models\Expense;
use App\Models\Order;
use App\Models\Product;
use App\Models\PurchaseInvoice;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * گزارش سود دوره‌ای فروشگاه.
 *
 * محاسبه‌ها ساده و شفاف‌اند:
 *  - درآمد کالا = جمع اقلام سفارش‌های پرداخت‌شده و لغو‌نشده منهای تخفیف‌ها
 *  - بهای تمام‌شده = جمع (تعداد × بهای تمام‌شدهٔ لحظهٔ فروش)
 *  - سود ناخالص = درآمد کالا − بهای تمام‌شده
 *  - سود خالص = سود ناخالص + کرایهٔ دریافتی از مشتری − باربری خرید − هزینه‌های دوره
 *  (مالیات تنها از مشتری دریافت و به حساب مربوطه منتقل می‌شود و در سود نمی‌آید.)
 */
class ProfitReportService
{
    private const CANCELLED_STATUSES = ['cancelled', 'canceled'];

    /**
     * @return array<string, mixed>
     */
    public function build(Carbon $from, Carbon $to): array
    {
        $fromDate = $from->copy()->startOfDay();
        $toDate = $to->copy()->endOfDay();
        $fromDay = $fromDate->toDateString();
        $toDay = $toDate->toDateString();

        $sales = Order::query()
            ->where('payment_status', 'paid')
            ->whereNotIn('status', self::CANCELLED_STATUSES)
            ->whereBetween('created_at', [$fromDate, $toDate])
            ->selectRaw('COUNT(*) as orders_count')
            ->selectRaw('COALESCE(SUM(subtotal), 0) as subtotal')
            ->selectRaw('COALESCE(SUM(discount), 0) as discount')
            ->selectRaw('COALESCE(SUM(coupon_discount), 0) as coupon_discount')
            ->selectRaw('COALESCE(SUM(shipping_cost), 0) as shipping_cost')
            ->selectRaw('COALESCE(SUM(tax_amount), 0) as tax_amount')
            ->selectRaw('COALESCE(SUM(total), 0) as total_collected')
            ->first();

        $cogs = (float) DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->leftJoin('products', 'products.id', '=', 'order_items.product_id')
            ->where('orders.payment_status', 'paid')
            ->whereNotIn('orders.status', self::CANCELLED_STATUSES)
            ->whereBetween('orders.created_at', [$fromDate, $toDate])
            ->selectRaw(
                'COALESCE(SUM(order_items.quantity * COALESCE(order_items.cost_price, products.cost_price, 0)), 0) as value'
            )
            ->value('value');

        $purchases = PurchaseInvoice::query()
            ->whereDate('issued_at', '>=', $fromDay)
            ->whereDate('issued_at', '<=', $toDay)
            ->selectRaw('COUNT(*) as invoices_count')
            ->selectRaw('COALESCE(SUM(total), 0) as total')
            ->selectRaw('COALESCE(SUM(shipping_cost), 0) as shipping_cost')
            ->selectRaw('COALESCE(SUM(CASE WHEN total > paid_amount THEN total - paid_amount ELSE 0 END), 0) as remaining')
            ->first();

        $expenses = Expense::query()
            ->whereDate('spent_at', '>=', $fromDay)
            ->whereDate('spent_at', '<=', $toDay)
            ->selectRaw('COALESCE(SUM(amount), 0) as total')
            ->first();

        $expensesByCategory = Expense::query()
            ->whereDate('spent_at', '>=', $fromDay)
            ->whereDate('spent_at', '<=', $toDay)
            ->selectRaw('category, COALESCE(SUM(amount), 0) as total')
            ->groupBy('category')
            ->pluck('total', 'category');

        $revenueGoods = round(max(
            (float) $sales->subtotal - (float) $sales->discount - (float) $sales->coupon_discount,
            0
        ), 2);

        $gross = round($revenueGoods - (float) $cogs, 2);
        $net = round(
            $gross
            + (float) $sales->shipping_cost
            - (float) $purchases->shipping_cost
            - (float) $expenses->total,
            2
        );

        return [
            'period' => [
                'from' => $fromDay,
                'to' => $toDay,
            ],
            'sales' => [
                'orders_count' => (int) $sales->orders_count,
                'revenue' => $revenueGoods,
                'discount' => round((float) $sales->discount + (float) $sales->coupon_discount, 2),
                'shipping_income' => round((float) $sales->shipping_cost, 2),
                'tax' => round((float) $sales->tax_amount, 2),
                'total_collected' => round((float) $sales->total_collected, 2),
            ],
            'costs' => [
                'cogs' => round((float) $cogs, 2),
                'purchase_total' => round((float) $purchases->total, 2),
                'purchase_shipping' => round((float) $purchases->shipping_cost, 2),
                'purchase_remaining' => round((float) $purchases->remaining, 2),
                'purchases_count' => (int) $purchases->invoices_count,
                'expenses' => round((float) $expenses->total, 2),
                'expenses_by_category' => $expensesByCategory
                    ->map(fn ($total, $key) => [
                        'key' => $key,
                        'label' => Expense::CATEGORIES[$key] ?? $key,
                        'total' => round((float) $total, 2),
                    ])
                    ->values()
                    ->all(),
            ],
            'profit' => [
                'gross' => $gross,
                'net' => $net,
                'gross_margin' => $revenueGoods > 0 ? round($gross / $revenueGoods * 100, 1) : 0.0,
            ],
            'monthly' => $this->monthly($fromDate, $toDate),
            'top_products' => $this->topProducts($fromDate, $toDate),
        ];
    }

    /**
     * خلاصهٔ صفحهٔ حسابداری: سود ماه جاری، ارزش انبار، بدهی تأمین‌کنندگان و چک‌ها.
     *
     * @return array<string, mixed>
     */
    public function overview(): array
    {
        $now = Carbon::now();

        $current = $this->build($now->copy()->startOfMonth(), $now->copy()->endOfMonth());

        $previousMonth = $now->copy()->subMonthNoOverflow();
        $previous = $this->build(
            $previousMonth->copy()->startOfMonth(),
            $previousMonth->copy()->endOfMonth()
        );

        $inventoryValue = (float) Product::query()
            ->selectRaw('COALESCE(SUM(stock * COALESCE(cost_price, 0)), 0) as value')
            ->value('value');

        $supplierDebt = (float) PurchaseInvoice::query()
            ->selectRaw(
                'COALESCE(SUM(CASE WHEN total > paid_amount THEN total - paid_amount ELSE 0 END), 0) as value'
            )
            ->value('value');

        $today = $now->copy()->startOfDay();

        $cheques = [
            'paid_pending' => round((float) Cheque::query()
                ->pending()
                ->where('direction', Cheque::DIRECTION_PAID)
                ->sum('amount'), 2),
            'received_pending' => round((float) Cheque::query()
                ->pending()
                ->where('direction', Cheque::DIRECTION_RECEIVED)
                ->sum('amount'), 2),
            'overdue_count' => Cheque::query()
                ->pending()
                ->whereDate('due_date', '<', $today->toDateString())
                ->count(),
            'upcoming' => Cheque::query()
                ->pending()
                ->whereDate('due_date', '<=', $today->copy()->addDays(14)->toDateString())
                ->orderBy('due_date')
                ->limit(8)
                ->get()
                ->map(fn (Cheque $cheque) => [
                    'id' => $cheque->id,
                    'direction' => $cheque->direction,
                    'amount' => round((float) $cheque->amount, 2),
                    'due_date' => $cheque->due_date?->toDateString(),
                    'party_name' => $cheque->party_name,
                    'bank_name' => $cheque->bank_name,
                    'status' => $cheque->status,
                    'is_overdue' => $cheque->due_date !== null
                        && $cheque->due_date->lt($today),
                ])
                ->values()
                ->all(),
        ];

        return [
            'current' => $current,
            'previous' => [
                'sales' => $previous['sales'],
                'profit' => $previous['profit'],
            ],
            'inventory_value' => round($inventoryValue, 2),
            'supplier_debt' => round($supplierDebt, 2),
            'cheques' => $cheques,
            'recent_invoices' => PurchaseInvoice::query()
                ->with('supplier:id,name')
                ->latest('issued_at')
                ->latest('id')
                ->limit(5)
                ->get()
                ->map(fn (PurchaseInvoice $invoice) => [
                    'id' => $invoice->id,
                    'invoice_number' => $invoice->invoice_number,
                    'issued_at' => $invoice->issued_at?->toDateString(),
                    'supplier' => $invoice->supplier?->name,
                    'total' => round((float) $invoice->total, 2),
                    'paid_amount' => round((float) $invoice->paid_amount, 2),
                    'remaining' => $invoice->remaining,
                    'payment_status' => $invoice->payment_status,
                ])
                ->values()
                ->all(),
            'series' => $this->build(
                $now->copy()->subMonths(5)->startOfMonth(),
                $now->copy()->endOfMonth()
            )['monthly'],
        ];
    }

    /**
     * گزارش ماه‌به‌ماه برای بازهٔ انتخاب‌شده (حداکثر ۲۴ ماه).
     *
     * @return list<array<string, mixed>>
     */
    private function monthly(Carbon $from, Carbon $to): array
    {
        $start = $from->copy()->startOfMonth();
        $end = $to->copy()->startOfMonth();
        $limit = 0;
        $buckets = [];

        $cursor = $start->copy();

        while ($cursor <= $end && $limit < 24) {
            $buckets[$cursor->format('Y-m')] = [
                'month' => $cursor->format('Y-m'),
                'orders_count' => 0,
                'revenue' => 0.0,
                'cogs' => 0.0,
                'shipping_income' => 0.0,
                'purchase_shipping' => 0.0,
                'expenses' => 0.0,
                'gross' => 0.0,
                'net' => 0.0,
            ];

            $cursor->addMonth();
            $limit++;
        }

        $salesByMonth = Order::query()
            ->where('payment_status', 'paid')
            ->whereNotIn('status', self::CANCELLED_STATUSES)
            ->whereBetween('created_at', [$from, $to])
            ->selectRaw('SUBSTR(created_at, 1, 7) as month')
            ->selectRaw('COUNT(*) as orders_count')
            ->selectRaw('COALESCE(SUM(subtotal - discount - coupon_discount), 0) as revenue')
            ->selectRaw('COALESCE(SUM(shipping_cost), 0) as shipping_income')
            ->groupBy('month')
            ->get();

        foreach ($salesByMonth as $row) {
            $month = (string) $row->month;

            if (! isset($buckets[$month])) {
                continue;
            }

            $buckets[$month]['orders_count'] = (int) $row->orders_count;
            $buckets[$month]['revenue'] = round((float) $row->revenue, 2);
            $buckets[$month]['shipping_income'] = round((float) $row->shipping_income, 2);
        }

        $cogsByMonth = DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->leftJoin('products', 'products.id', '=', 'order_items.product_id')
            ->where('orders.payment_status', 'paid')
            ->whereNotIn('orders.status', self::CANCELLED_STATUSES)
            ->whereBetween('orders.created_at', [$from, $to])
            ->selectRaw('SUBSTR(orders.created_at, 1, 7) as month')
            ->selectRaw(
                'COALESCE(SUM(order_items.quantity * COALESCE(order_items.cost_price, products.cost_price, 0)), 0) as cogs'
            )
            ->groupBy('month')
            ->get();

        foreach ($cogsByMonth as $row) {
            $month = (string) $row->month;

            if (isset($buckets[$month])) {
                $buckets[$month]['cogs'] = round((float) $row->cogs, 2);
            }
        }

        $purchaseByMonth = PurchaseInvoice::query()
            ->whereDate('issued_at', '>=', $from->toDateString())
            ->whereDate('issued_at', '<=', $to->toDateString())
            ->selectRaw('SUBSTR(issued_at, 1, 7) as month')
            ->selectRaw('COALESCE(SUM(shipping_cost), 0) as shipping')
            ->groupBy('month')
            ->get();

        foreach ($purchaseByMonth as $row) {
            $month = (string) $row->month;

            if (isset($buckets[$month])) {
                $buckets[$month]['purchase_shipping'] = round((float) $row->shipping, 2);
            }
        }

        $expensesByMonth = Expense::query()
            ->whereDate('spent_at', '>=', $from->toDateString())
            ->whereDate('spent_at', '<=', $to->toDateString())
            ->selectRaw('SUBSTR(spent_at, 1, 7) as month')
            ->selectRaw('COALESCE(SUM(amount), 0) as total')
            ->groupBy('month')
            ->get();

        foreach ($expensesByMonth as $row) {
            $month = (string) $row->month;

            if (isset($buckets[$month])) {
                $buckets[$month]['expenses'] = round((float) $row->total, 2);
            }
        }

        foreach ($buckets as $month => $bucket) {
            $gross = round($bucket['revenue'] - $bucket['cogs'], 2);

            $buckets[$month]['gross'] = $gross;
            $buckets[$month]['net'] = round(
                $gross + $bucket['shipping_income'] - $bucket['purchase_shipping'] - $bucket['expenses'],
                2
            );
        }

        return array_values($buckets);
    }

    /**
     * پرفروش‌ترین محصولات بازه (بر اساس مبلغ فروش).
     *
     * @return list<array<string, mixed>>
     */
    private function topProducts(Carbon $from, Carbon $to): array
    {
        return DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->leftJoin('products', 'products.id', '=', 'order_items.product_id')
            ->where('orders.payment_status', 'paid')
            ->whereNotIn('orders.status', self::CANCELLED_STATUSES)
            ->whereBetween('orders.created_at', [$from, $to])
            ->selectRaw('order_items.product_name as name')
            ->selectRaw('COALESCE(SUM(order_items.quantity), 0) as quantity')
            ->selectRaw('COALESCE(SUM(order_items.total_price), 0) as revenue')
            ->selectRaw(
                'COALESCE(SUM(order_items.quantity * COALESCE(order_items.cost_price, products.cost_price, 0)), 0) as cost'
            )
            ->groupBy('order_items.product_name')
            ->orderByDesc('revenue')
            ->limit(6)
            ->get()
            ->map(fn ($row) => [
                'name' => (string) $row->name,
                'quantity' => (int) $row->quantity,
                'revenue' => round((float) $row->revenue, 2),
                'profit' => round((float) $row->revenue - (float) $row->cost, 2),
            ])
            ->all();
    }
}
