<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Accounting\ProfitReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/**
 * نمای کلی حسابداری و گزارش سود دوره‌ای.
 */
class AdminAccountingController extends Controller
{
    public function __construct(
        private readonly ProfitReportService $report
    ) {
    }

    /**
     * کارت‌های خلاصه: سود ماه، ارزش انبار، بدهی تأمین‌کنندگان و چک‌ها.
     */
    public function overview(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->report->overview(),
        ]);
    }

    /**
     * گزارش سود بازهٔ دلخواه (پیش‌فرض: ماه جاری).
     */
    public function report(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);

        $from = isset($validated['from'])
            ? Carbon::parse($validated['from'])->startOfDay()
            : now()->startOfMonth();

        $to = isset($validated['to'])
            ? Carbon::parse($validated['to'])->endOfDay()
            : now()->endOfMonth();

        if ($from->greaterThan($to)) {
            [$from, $to] = [$to->copy()->startOfDay(), $from->copy()->endOfDay()];
        }

        // حداکثر یک سال برای جلوگیری از گزارش‌های بسیار سنگین.
        if ($from->diffInDays($to) > 400) {
            $from = $to->copy()->subDays(400);
        }

        return response()->json([
            'success' => true,
            'data' => $this->report->build($from, $to),
        ]);
    }
}
