<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * تحلیل منابع ترافیک و کمپین‌ها از روی خود سفارش‌ها.
 *
 * منبع داده فقط ستون‌های انتساب سفارش (`utm_*` و `referrer`) است که هنگام
 * ثبت سفارش ذخیره می‌شوند؛ بنابراین این گزارش به GA4 یا جدول رویداد وابسته
 * نیست و «سفارش و درآمد» را با همان تعریف گزارش فروش (بدون سفارش لغوشده)
 * نشان می‌دهد. چون UTM روی سفارش ذخیره می‌شود، انتساب «اولین تماس» است و
 * سفارشی که بدون UTM ثبت شود در ردیف «(direct)» می‌آید.
 */
class AdminAnalyticsController extends Controller
{
    /** وضعیت‌هایی که در گزارش فروش حساب نمی‌شوند. */
    private const CANCELLED_STATUSES = ['cancelled', 'canceled'];

    /** سقف ردیف هر جدول؛ جمع کل در کارت‌های خلاصه دیده می‌شود. */
    private const MAX_ROWS = 20;

    /** کلید ردیف بدون مقدار (ترافیک مستقیم یا ناشناخته). */
    private const DIRECT_KEY = '(direct)';

    /**
     * فروش به تفکیک منبع، نوع ترافیک، کمپین، محتوا و دامنهٔ ارجاع‌دهنده.
     */
    public function traffic(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'days' => ['nullable', 'integer', 'min:1', 'max:365'],
        ]);

        $days = (int) ($validated['days'] ?? 30);
        $to = now()->endOfDay();
        $from = now()->subDays($days - 1)->startOfDay();

        $base = Order::query()
            ->whereBetween('orders.created_at', [$from, $to])
            ->whereNotIn('status', self::CANCELLED_STATUSES);

        $totals = (clone $base)
            ->selectRaw(
                "COUNT(*) as orders_count,
                 COALESCE(SUM(total), 0) as revenue,
                 COALESCE(SUM(CASE WHEN NULLIF(TRIM(utm_source), '') IS NOT NULL
                     OR NULLIF(TRIM(referrer), '') IS NOT NULL THEN 1 ELSE 0 END), 0) as tracked_orders,
                 COALESCE(SUM(CASE WHEN NULLIF(TRIM(utm_source), '') IS NOT NULL
                     OR NULLIF(TRIM(utm_medium), '') IS NOT NULL
                     OR NULLIF(TRIM(utm_campaign), '') IS NOT NULL THEN 1 ELSE 0 END), 0) as utm_orders"
            )
            ->first();

        $ordersCount = (int) ($totals->orders_count ?? 0);
        $revenue = (float) ($totals->revenue ?? 0);
        $utmOrders = (int) ($totals->utm_orders ?? 0);
        $trackedOrders = (int) ($totals->tracked_orders ?? 0);
        $directOrders = $ordersCount - $trackedOrders;

        return response()->json([
            'success' => true,
            'data' => [
                'range' => [
                    'days' => $days,
                    'from' => $from->toDateString(),
                    'to' => $to->toDateString(),
                ],
                'summary' => [
                    'orders_count' => $ordersCount,
                    'revenue' => round($revenue, 2),
                    'average_order_total' => $ordersCount > 0
                        ? round($revenue / $ordersCount, 2)
                        : 0,
                    'utm_orders_count' => $utmOrders,
                    'utm_order_share' => $this->percent($utmOrders, $ordersCount),
                    'tracked_orders_count' => $trackedOrders,
                    'tracked_order_share' => $this->percent($trackedOrders, $ordersCount),
                    'direct_orders_count' => $directOrders,
                    'direct_order_share' => $this->percent($directOrders, $ordersCount),
                ],
                'sources' => $this->breakdown(clone $base, ['utm_source'], ['source'], $revenue),
                'mediums' => $this->breakdown(clone $base, ['utm_medium'], ['medium'], $revenue),
                'campaigns' => $this->breakdown(
                    clone $base,
                    ['utm_source', 'utm_medium', 'utm_campaign'],
                    ['source', 'medium', 'campaign'],
                    $revenue
                ),
                'contents' => $this->breakdown(clone $base, ['utm_content'], ['content'], $revenue),
                'referrers' => $this->referrers(clone $base, $revenue),
            ],
        ]);
    }

    /**
     * گروه‌بندی سفارش‌ها بر اساس یک یا چند ستون UTM.
     *
     * @param  Builder<Order>  $query
     * @param  list<string>  $columns
     * @param  list<string>  $keys
     * @return list<array<string, int|float|string>>
     */
    private function breakdown(
        Builder $query,
        array $columns,
        array $keys,
        float $totalRevenue
    ): array {
        $rows = $query
            ->selectRaw(
                implode(', ', $columns).',
                 COUNT(*) as orders_count,
                 COALESCE(SUM(total), 0) as revenue'
            )
            ->groupBy($columns)
            ->get();

        $buckets = [];

        foreach ($rows as $row) {
            $values = [];

            foreach ($keys as $index => $key) {
                $values[$key] = $this->normalizeValue($row->{$columns[$index]});
            }

            $bucketKey = implode('|', $values);

            if (! isset($buckets[$bucketKey])) {
                $buckets[$bucketKey] = [
                    'values' => $values,
                    'orders_count' => 0,
                    'revenue' => 0.0,
                ];
            }

            $buckets[$bucketKey]['orders_count'] += (int) $row->orders_count;
            $buckets[$bucketKey]['revenue'] += (float) $row->revenue;
        }

        return $this->sortedRows($buckets, $totalRevenue);
    }

    /**
     * فروش به تفکیک دامنهٔ ارجاع‌دهنده (referrer).
     *
     * @param  Builder<Order>  $query
     * @return list<array<string, int|float|string>>
     */
    private function referrers(Builder $query, float $totalRevenue): array
    {
        $rows = $query
            ->whereNotNull('referrer')
            ->where('referrer', '!=', '')
            ->selectRaw(
                'referrer,
                 COUNT(*) as orders_count,
                 COALESCE(SUM(total), 0) as revenue'
            )
            ->groupBy('referrer')
            ->get();

        $buckets = [];

        foreach ($rows as $row) {
            $host = $this->referrerHost((string) $row->referrer);

            if (! isset($buckets[$host])) {
                $buckets[$host] = [
                    'values' => ['host' => $host],
                    'orders_count' => 0,
                    'revenue' => 0.0,
                ];
            }

            $buckets[$host]['orders_count'] += (int) $row->orders_count;
            $buckets[$host]['revenue'] += (float) $row->revenue;
        }

        return $this->sortedRows($buckets, $totalRevenue);
    }

    /**
     * تبدیل سطل‌ها به ردیف‌های آمادهٔ نمایش (مرتب بر اساس درآمد + سهم درصدی).
     *
     * @param  array<string, array{values: array<string, string>, orders_count: int, revenue: float}>  $buckets
     * @return list<array<string, int|float|string>>
     */
    private function sortedRows(array $buckets, float $totalRevenue): array
    {
        uasort($buckets, fn (array $a, array $b): int => $b['revenue'] <=> $a['revenue']);

        $result = [];

        foreach (array_slice(array_values($buckets), 0, self::MAX_ROWS) as $bucket) {
            $row = $bucket['values'];
            $row['orders_count'] = $bucket['orders_count'];
            $row['revenue'] = round($bucket['revenue'], 2);
            $row['average_order_total'] = $bucket['orders_count'] > 0
                ? round($bucket['revenue'] / $bucket['orders_count'], 2)
                : 0;
            $row['revenue_share'] = $this->percent($bucket['revenue'], $totalRevenue);

            $result[] = $row;
        }

        return $result;
    }

    /** دامنهٔ بدون www از آدرس ارجاع‌دهنده (مثلاً instagram.com). */
    private function referrerHost(string $referrer): string
    {
        $candidate = str_contains($referrer, '://') ? $referrer : 'https://'.$referrer;
        $host = parse_url($candidate, PHP_URL_HOST);

        if (! is_string($host) || $host === '') {
            return self::DIRECT_KEY;
        }

        return strtolower((string) preg_replace('/^www\./', '', $host));
    }

    /** مقدار ستون UTM؛ خالی‌ها در ردیف «(direct)» جمع می‌شوند. */
    private function normalizeValue(?string $value): string
    {
        $trimmed = trim((string) $value);

        return $trimmed === '' ? self::DIRECT_KEY : $trimmed;
    }

    /** سهم درصدی با یک رقم اعشار (صفر وقتی مخرج صفر است). */
    private function percent(float|int $part, float|int $total): float
    {
        if ($total <= 0) {
            return 0.0;
        }

        return round(((float) $part / (float) $total) * 100, 1);
    }
}
