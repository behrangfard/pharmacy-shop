<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ShippingMethod;
use App\Models\StoreSetting;
use Illuminate\Http\JsonResponse;

/**
 * صفحهٔ عمومی «روش‌های ارسال و اطلاعات ارسال» (مسیر سایت: /shipping-info).
 *
 * محتوای متنی از تنظیمات فروشگاه می‌آید (پنل مدیریت ← ارسال و حمل‌ونقل ←
 * تب «صفحهٔ ارسال») و فهرست روش‌ها از روش‌های فعال جدول shipping_methods
 * ساخته می‌شود؛ بنابراین هر تغییر در هزینه/زمان تحویل همان‌جا روی این صفحه
 * هم دیده می‌شود.
 */
class ShippingInfoController extends Controller
{
    public function show(): JsonResponse
    {
        $settings = StoreSetting::publicSettings();
        $page = StoreSetting::shippingPage();

        $methods = ShippingMethod::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(fn (ShippingMethod $method) => [
                'id' => $method->id,
                'name' => $method->name,
                'carrier' => $method->carrier,
                'description' => $method->description,
                'base_cost' => (float) $method->base_cost,
                'cost_per_kg' => (float) $method->cost_per_kg,
                'free_over_amount' => $method->free_over_amount === null
                    ? null
                    : (float) $method->free_over_amount,
                'min_days' => $method->min_days,
                'max_days' => $method->max_days,
                'delivery' => $method->deliveryEstimate(),
                'is_express' => $method->is_express,
            ])
            ->values();

        return response()->json([
            'success' => true,
            'data' => [
                'title' => $page['title'],
                'intro' => $page['intro'],
                'notes' => $page['notes'],
                'content' => $page['content'],
                'show_costs' => $page['show_costs'],
                'methods' => $methods,
                'free_shipping' => [
                    'enabled' => filter_var(
                        (string) ($settings['free_shipping_enabled'] ?? '0'),
                        FILTER_VALIDATE_BOOLEAN
                    ),
                    'threshold' => (float) ($settings['free_shipping_threshold'] ?? 0),
                ],
                'shipping_note' => (string) ($settings['shipping_note'] ?? ''),
                'support_note' => (string) ($settings['support_note'] ?? ''),
                'store_phone' => (string) ($settings['store_phone'] ?? ''),
                'store_working_hours' => (string) ($settings['store_working_hours'] ?? ''),
            ],
        ]);
    }
}
