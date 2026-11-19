<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\StockMovement;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AdminReportController extends Controller
{
    /**
     * گزارش فروش بازه‌ای برای پنل مدیران.
     */
    public function sales(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'days' => ['nullable', 'integer', 'min:1', 'max:365'],
        ]);

        $to = isset($validated['to'])
            ? Carbon::parse($validated['to'])->endOfDay()
            : now()->endOfDay();

        if (isset($validated['from'])) {
            $from = Carbon::parse($validated['from'])->startOfDay();
        } else {
            $days = (int) ($validated['days'] ?? 30);
            $from = $to->copy()->subDays($days - 1)->startOfDay();
        }

        if ($from->greaterThan($to)) {
            [$from, $to] = [
                $to->copy()->startOfDay(),
                $from->copy()->endOfDay(),
            ];
        }

        $cancelledStatuses = ['cancelled', 'canceled'];

        $allOrders = Order::query()
            ->whereBetween('orders.created_at', [$from, $to]);

        $validOrders = (clone $allOrders)
            ->whereNotIn('status', $cancelledStatuses);

        $ordersCount = (clone $allOrders)->count();
        $validOrdersCount = (clone $validOrders)->count();

        $totals = (clone $validOrders)
            ->selectRaw(
                'COALESCE(SUM(total), 0) as revenue,
                 COALESCE(SUM(subtotal), 0) as subtotal_total,
                 COALESCE(SUM(discount), 0) as discount_total,
                 COALESCE(SUM(tax_amount), 0) as tax_total,
                 COALESCE(SUM(shipping_cost), 0) as shipping_total'
            )
            ->first();

        $revenue = (float) ($totals->revenue ?? 0);

        $itemsSold = (int) DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->whereBetween('orders.created_at', [$from, $to])
            ->whereNotIn('orders.status', $cancelledStatuses)
            ->sum('order_items.quantity');

        $daily = (clone $validOrders)
            ->selectRaw(
                'DATE(created_at) as day,
                 COUNT(*) as orders_count,
                 COALESCE(SUM(total), 0) as revenue'
            )
            ->groupBy('day')
            ->orderBy('day')
            ->get()
            ->map(fn ($row) => [
                'date' => $row->day,
                'orders_count' => (int) $row->orders_count,
                'revenue' => (float) $row->revenue,
            ])
            ->values();

        $statuses = (clone $allOrders)
            ->selectRaw('status, COUNT(*) as orders_count')
            ->groupBy('status')
            ->pluck('orders_count', 'status')
            ->map(fn ($count) => (int) $count);

        $topProducts = DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->whereBetween('orders.created_at', [$from, $to])
            ->whereNotIn('orders.status', $cancelledStatuses)
            ->selectRaw(
                'order_items.product_id,
                 order_items.product_name,
                 SUM(order_items.quantity) as quantity,
                 COALESCE(SUM(order_items.total_price), 0) as revenue'
            )
            ->groupBy('order_items.product_id', 'order_items.product_name')
            ->orderByDesc('quantity')
            ->limit(8)
            ->get()
            ->map(fn ($row) => [
                'product_id' => $row->product_id,
                'name' => $row->product_name,
                'quantity' => (int) $row->quantity,
                'revenue' => (float) $row->revenue,
            ]);

        $lowStockProducts = Product::query()
            ->where('is_active', true)
            ->where('stock', '<=', 5)
            ->orderBy('stock')
            ->limit(8)
            ->get(['id', 'name', 'slug', 'stock']);

        $lowStockVariants = ProductVariant::query()
            ->with('product:id,name,slug')
            ->where('stock', '<=', 5)
            ->orderBy('stock')
            ->limit(8)
            ->get(['id', 'product_id', 'name', 'sku', 'stock']);

        return response()->json([
            'success' => true,
            'data' => [
                'range' => [
                    'from' => $from->toDateString(),
                    'to' => $to->toDateString(),
                ],
                'summary' => [
                    'orders_count' => $ordersCount,
                    'completed_orders' => $validOrdersCount,
                    'revenue' => round($revenue, 2),
                    'average_order_total' => $validOrdersCount > 0
                        ? round($revenue / $validOrdersCount, 2)
                        : 0,
                    'subtotal_total' => round((float) ($totals->subtotal_total ?? 0), 2),
                    'discount_total' => round((float) ($totals->discount_total ?? 0), 2),
                    'tax_total' => round((float) ($totals->tax_total ?? 0), 2),
                    'shipping_total' => round((float) ($totals->shipping_total ?? 0), 2),
                    'items_sold' => $itemsSold,
                ],
                'statuses' => $statuses,
                'daily' => $daily,
                'top_products' => $topProducts,
                'low_stock_products' => $lowStockProducts,
                'low_stock_variants' => $lowStockVariants,
            ],
        ]);
    }

    /**
     * گزارش «گردش موجودی» (stock ledger).
     *
     * هر تغییر موجودی با علت آن (ثبت سفارش، بازگردانی سفارش، فاکتور خرید،
     * ویرایش دستی، ایمپورت) به‌ترتیب زمان برمی‌گردد تا مدیر بتواند رد پای
     * کاهش/افزایش موجودی را ببیند.
     */
    public function stockMovements(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'days' => ['nullable', 'integer', 'min:1', 'max:365'],
            'product_id' => ['nullable', 'integer', 'exists:products,id'],
            'variant_id' => ['nullable', 'integer', 'exists:product_variants,id'],
            'type' => ['nullable', 'string', Rule::in(StockMovement::types())],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $days = (int) ($validated['days'] ?? 30);
        $from = now()->subDays($days - 1)->startOfDay();

        $query = StockMovement::query()
            ->with([
                'product:id,name,slug',
                'variant:id,name,sku',
                'order:id,order_number',
                'purchaseInvoice:id,invoice_number',
                'user:id,name',
            ])
            ->where('created_at', '>=', $from);

        if (isset($validated['product_id'])) {
            $query->where('product_id', $validated['product_id']);
        }

        if (isset($validated['variant_id'])) {
            $query->where('variant_id', $validated['variant_id']);
        }

        if (isset($validated['type'])) {
            $query->where('type', $validated['type']);
        }

        $totals = (clone $query)
            ->selectRaw(
                "COALESCE(SUM(CASE WHEN quantity < 0 THEN quantity ELSE 0 END), 0) as decrease,
                 COALESCE(SUM(CASE WHEN quantity > 0 THEN quantity ELSE 0 END), 0) as increase"
            )
            ->first();

        $movements = $query
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate((int) ($validated['per_page'] ?? 30));

        return response()->json([
            'success' => true,
            'data' => [
                'range' => ['days' => $days, 'from' => $from->toDateString()],
                'summary' => [
                    'decrease_total' => (int) ($totals->decrease ?? 0),
                    'increase_total' => (int) ($totals->increase ?? 0),
                ],
                'types' => collect(StockMovement::typeLabels())
                    ->map(fn (string $label, string $value) => [
                        'value' => $value,
                        'label' => $label,
                    ])
                    ->values(),
                'movements' => collect($movements->items())
                    ->map(fn (StockMovement $movement): array => [
                        'id' => (int) $movement->id,
                        'type' => $movement->type,
                        'type_label' => StockMovement::label($movement->type),
                        'quantity' => (int) $movement->quantity,
                        'stock_after' => (int) $movement->stock_after,
                        'note' => $movement->note,
                        'created_at' => $movement->created_at?->toIso8601String(),
                        'product' => $movement->product?->only(['id', 'name', 'slug']),
                        'variant' => $movement->variant?->only(['id', 'name', 'sku']),
                        'order_number' => $movement->order?->order_number,
                        'purchase_invoice_number' => $movement->purchaseInvoice?->invoice_number,
                        'user_name' => $movement->user?->name,
                    ])
                    ->values(),
                'meta' => [
                    'current_page' => $movements->currentPage(),
                    'last_page' => $movements->lastPage(),
                    'per_page' => $movements->perPage(),
                    'total' => $movements->total(),
                ],
            ],
        ]);
    }
}
