<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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
}
