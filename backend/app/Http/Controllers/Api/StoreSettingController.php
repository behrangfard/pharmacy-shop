<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StoreSetting;
use Illuminate\Http\JsonResponse;

class StoreSettingController extends Controller
{
    /**
     * تنظیمات عمومی فروشگاه برای استفاده در سایت (فوتر، هزینه ارسال، مالیات).
     */
    public function index(): JsonResponse
    {
        $settings = StoreSetting::publicSettings();

        return response()->json([
            'success' => true,
            'data' => [
                'store_name' => $settings['store_name'],
                'store_slogan' => $settings['store_slogan'],
                'store_phone' => $settings['store_phone'],
                'store_mobile' => $settings['store_mobile'],
                'store_email' => $settings['store_email'],
                'store_address' => $settings['store_address'],
                'store_working_hours' => $settings['store_working_hours'],
                'store_instagram' => $settings['store_instagram'],
                'store_telegram' => $settings['store_telegram'],
                'store_whatsapp' => $settings['store_whatsapp'],
                'support_note' => $settings['support_note'],
                'shipping_note' => $settings['shipping_note'],
                'return_policy_days' => (int) $settings['return_policy_days'],
                'vat_enabled' => $this->toBool($settings['vat_enabled']),
                'vat_percent' => $this->toPercent($settings['vat_percent']),
                'shipping_cost' => (float) $settings['shipping_cost'],
                'free_shipping_enabled' => $this->toBool(
                    $settings['free_shipping_enabled']
                ),
                'free_shipping_threshold' => (float) $settings['free_shipping_threshold'],
            ],
        ]);
    }

    /**
     * درصد مالیات فعال فروشگاه.
     */
    public function tax(): JsonResponse
    {
        $settings = StoreSetting::publicSettings();

        $vatEnabled = $this->toBool($settings['vat_enabled']);

        return response()->json([
            'success' => true,
            'data' => [
                'vat_enabled' => $vatEnabled,
                'vat_percent' => $vatEnabled
                    ? $this->toPercent($settings['vat_percent'])
                    : 0,
            ],
        ]);
    }

    private function toBool(string|bool|null $value): bool
    {
        return filter_var((string) $value, FILTER_VALIDATE_BOOLEAN);
    }

    private function toPercent(string|float|null $value): float
    {
        return min(max((float) $value, 0), 100);
    }
}

