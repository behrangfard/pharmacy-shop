<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminController extends Controller
{
    /**
     * Admin dashboard summary.
     */
    public function dashboard(Request $request): JsonResponse
    {
        $totalProducts = Product::count();
        $activeProducts = Product::where('is_active', true)->count();
        $totalUsers = User::count();
        $totalOrders = Order::count();

        $pendingOrders = Order::where('status', 'pending')->count();
        $processingOrders = Order::where('status', 'processing')->count();
        $completedOrders = Order::where('status', 'delivered')->count();
        $cancelledOrders = Order::whereIn('status', [
            'cancelled',
            'canceled',
        ])->count();

        $paidOrders = Order::where('payment_status', 'paid')->count();
        $unpaidOrders = Order::where('payment_status', 'unpaid')->count();

        // Only paid orders that have not been cancelled count as sales.
        $eligibleSales = Order::query()
            ->where('payment_status', 'paid')
            ->whereNotIn('status', ['cancelled', 'canceled']);

        $totalSales = (clone $eligibleSales)->sum('total');

        // Week runs from Saturday through Friday.
        $now = Carbon::now(config('app.timezone'));

        $currentWeekStart = $now->copy()
            ->startOfWeek(Carbon::SATURDAY)
            ->startOfDay();

        $nextWeekStart = $currentWeekStart->copy()->addWeek();
        $previousWeekStart = $currentWeekStart->copy()->subWeek();

        $currentWeekSales = (clone $eligibleSales)
            ->where('created_at', '>=', $currentWeekStart)
            ->where('created_at', '<', $nextWeekStart)
            ->sum('total');

        $previousWeekSales = (clone $eligibleSales)
            ->where('created_at', '>=', $previousWeekStart)
            ->where('created_at', '<', $currentWeekStart)
            ->sum('total');

        $salesChangePercent = null;

        if ((float) $previousWeekSales > 0) {
            $salesChangePercent = round(
                (
                    ((float) $currentWeekSales - (float) $previousWeekSales)
                    / (float) $previousWeekSales
                ) * 100,
                1
            );
        }

        // Daily sales for the current Saturday-Friday week.
        $weekDays = [
            'شنبه',
            'یکشنبه',
            'دوشنبه',
            'سه‌شنبه',
            'چهارشنبه',
            'پنجشنبه',
            'جمعه',
        ];

        $dailySales = [];

        foreach ($weekDays as $offset => $dayName) {
            $dayStart = $currentWeekStart->copy()->addDays($offset);
            $dayEnd = $dayStart->copy()->addDay();

            $amount = (clone $eligibleSales)
                ->where('created_at', '>=', $dayStart)
                ->where('created_at', '<', $dayEnd)
                ->sum('total');

            $dailySales[] = [
                'date' => $dayStart->toDateString(),
                'day' => $dayName,
                'sales' => (float) $amount,
            ];
        }

        // Sales-channel breakdown based on actual paid sales.
        $channelRows = (clone $eligibleSales)
            ->select(
                'sales_channel',
                DB::raw('COUNT(*) as orders_count'),
                DB::raw('SUM(total) as sales_amount')
            )
            ->groupBy('sales_channel')
            ->get();

        $channelLabels = [
            'website' => 'وب‌سایت',
            'instagram' => 'اینستاگرام',
            'phone' => 'تلفنی',
            'in_person' => 'حضوری',
            'other' => 'سایر',
        ];

        $salesChannels = [];
        $totalChannelSales = (float) $channelRows->sum('sales_amount');

        foreach ($channelRows as $row) {
            $channel = $row->sales_channel;

            // Unknown or empty values are safely grouped under "other".
            if (!is_string($channel) || !isset($channelLabels[$channel])) {
                $channel = 'other';
            }

            if (!isset($salesChannels[$channel])) {
                $salesChannels[$channel] = [
                    'channel' => $channel,
                    'label' => $channelLabels[$channel],
                    'orders' => 0,
                    'sales' => 0.0,
                ];
            }

            $salesChannels[$channel]['orders'] += (int) $row->orders_count;
            $salesChannels[$channel]['sales'] += (float) $row->sales_amount;
        }

        $salesChannels = array_values($salesChannels);

        foreach ($salesChannels as &$channelData) {
            $channelData['sales'] = round($channelData['sales'], 2);
            $channelData['percentage'] = $totalChannelSales > 0
                ? round(($channelData['sales'] / $totalChannelSales) * 100, 1)
                : 0;
        }
        unset($channelData);

        return response()->json([
            'success' => true,
            'data' => [
                'products' => [
                    'total' => $totalProducts,
                    'active' => $activeProducts,
                ],
                'users' => [
                    'total' => $totalUsers,
                ],
                'orders' => [
                    'total' => $totalOrders,
                    'pending' => $pendingOrders,
                    'processing' => $processingOrders,
                    'completed' => $completedOrders,
                    'cancelled' => $cancelledOrders,
                ],
                'payments' => [
                    'paid' => $paidOrders,
                    'unpaid' => $unpaidOrders,
                ],
                'sales' => [
                    'total' => (float) $totalSales,
                    'current_week' => (float) $currentWeekSales,
                    'previous_week' => (float) $previousWeekSales,
                    'change_percent' => $salesChangePercent,
                    'week_starts_at' => $currentWeekStart->toDateString(),
                    'next_week_starts_at' => $nextWeekStart->toDateString(),
                    'daily' => $dailySales,
                    'channels' => $salesChannels,
                ],
            ],
        ]);
    }

    /**
     * روند فروش بازه‌ای برای نمودار «نبض فروشگاه».
     *
     * range: 7d (هفت روز اخیر) | 30d (سی روز اخیر) | 12m (دوازده ماه اخیر)
     */
    public function salesTrend(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'range' => ['nullable', 'string', 'in:7d,30d,12m'],
        ]);

        $range = $validated['range'] ?? '7d';

        // فقط سفارش‌های پرداخت‌شده و لغو‌نشده به‌عنوان فروش محاسبه می‌شوند.
        $eligibleSales = Order::query()
            ->where('payment_status', 'paid')
            ->whereNotIn('status', ['cancelled', 'canceled']);

        $now = Carbon::now(config('app.timezone'));
        $isMonthly = $range === '12m';

        if ($isMonthly) {
            $granularity = 'month';
            $bucketCount = 12;
            $seriesStart = $now->copy()->startOfMonth()->subMonths($bucketCount - 1);
            $seriesEnd = $now->copy()->startOfMonth()->addMonth();
            $previousStart = $seriesStart->copy()->subMonths($bucketCount);
            $previousEnd = $seriesStart->copy();
            // substr هم در MySQL و هم در SQLite تاریخ ذخیره‌شده را به «YYYY-MM» تبدیل می‌کند.
            $bucketExpression = 'substr(created_at, 1, 7)';
        } else {
            $granularity = 'day';
            $bucketCount = $range === '30d' ? 30 : 7;
            $seriesStart = $now->copy()->startOfDay()->subDays($bucketCount - 1);
            $seriesEnd = $now->copy()->startOfDay()->addDay();
            $previousStart = $seriesStart->copy()->subDays($bucketCount);
            $previousEnd = $seriesStart->copy();
            $bucketExpression = 'DATE(created_at)';
        }

        $bucketRows = (clone $eligibleSales)
            ->where('created_at', '>=', $seriesStart)
            ->where('created_at', '<', $seriesEnd)
            ->selectRaw(
                $bucketExpression.' as bucket_key,
                 COUNT(*) as orders_count,
                 COALESCE(SUM(total), 0) as sales_total'
            )
            ->groupBy('bucket_key')
            ->get()
            ->keyBy('bucket_key');

        $points = [];

        for ($index = 0; $index < $bucketCount; $index++) {
            $bucketStart = $isMonthly
                ? $seriesStart->copy()->addMonths($index)
                : $seriesStart->copy()->addDays($index);

            $key = $isMonthly
                ? $bucketStart->format('Y-m')
                : $bucketStart->toDateString();

            $row = $bucketRows->get($key);

            $points[] = [
                'key' => $key,
                'date' => $bucketStart->toDateString(),
                'sales' => round((float) ($row->sales_total ?? 0), 2),
                'orders' => (int) ($row->orders_count ?? 0),
            ];
        }

        $totalSales = 0.0;
        $totalOrders = 0;
        $peakPoint = null;

        foreach ($points as $point) {
            $totalSales += $point['sales'];
            $totalOrders += $point['orders'];

            if ($point['sales'] > 0 && ($peakPoint === null || $point['sales'] > $peakPoint['sales'])) {
                $peakPoint = $point;
            }
        }

        $previousTotalSales = (float) (clone $eligibleSales)
            ->where('created_at', '>=', $previousStart)
            ->where('created_at', '<', $previousEnd)
            ->sum('total');

        $changePercent = null;

        if ($previousTotalSales > 0) {
            $changePercent = round(
                (($totalSales - $previousTotalSales) / $previousTotalSales) * 100,
                1
            );
        }

        return response()->json([
            'success' => true,
            'data' => [
                'range' => $range,
                'granularity' => $granularity,
                'start_date' => $seriesStart->toDateString(),
                'end_date' => $seriesEnd->copy()->subDay()->toDateString(),
                'points' => $points,
                'summary' => [
                    'total_sales' => round($totalSales, 2),
                    'total_orders' => $totalOrders,
                    'previous_total_sales' => round($previousTotalSales, 2),
                    'change_percent' => $changePercent,
                    'average_sales' => round($totalSales / $bucketCount, 2),
                    'average_order' => $totalOrders > 0
                        ? round($totalSales / $totalOrders, 2)
                        : 0,
                    'peak' => $peakPoint,
                ],
            ],
        ]);
    }
}
