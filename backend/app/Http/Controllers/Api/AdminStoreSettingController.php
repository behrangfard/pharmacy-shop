<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StoreSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminStoreSettingController extends Controller
{
    /**
     * نمایش همه تنظیمات فروشگاه برای فرم پنل مدیران.
     */
    public function index(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => StoreSetting::allSettings(),
        ]);
    }

    /**
     * ذخیره تنظیمات فروشگاه.
     */
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'store_name' => ['required', 'string', 'max:120'],
            'store_slogan' => ['nullable', 'string', 'max:255'],
            'store_phone' => ['nullable', 'string', 'max:30'],
            'store_mobile' => ['nullable', 'string', 'max:30'],
            'store_email' => ['nullable', 'email', 'max:120'],
            'store_address' => ['nullable', 'string', 'max:255'],
            'store_working_hours' => ['nullable', 'string', 'max:120'],
            'store_instagram' => ['nullable', 'string', 'max:255'],
            'store_telegram' => ['nullable', 'string', 'max:255'],
            'store_whatsapp' => ['nullable', 'string', 'max:255'],
            'support_note' => ['nullable', 'string', 'max:255'],
            'shipping_note' => ['nullable', 'string', 'max:500'],
            'return_policy_days' => ['nullable', 'integer', 'min:0', 'max:90'],
            'vat_enabled' => ['required', 'boolean'],
            'vat_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'shipping_cost' => ['nullable', 'numeric', 'min:0'],
            'free_shipping_enabled' => ['required', 'boolean'],
            'free_shipping_threshold' => ['nullable', 'numeric', 'min:0'],
        ]);

        foreach ($validated as $key => $value) {
            StoreSetting::setValue($key, $this->normalize($value));
        }

        StoreSetting::forgetCache();

        return response()->json([
            'success' => true,
            'message' => 'تنظیمات فروشگاه با موفقیت ذخیره شد.',
            'data' => StoreSetting::allSettings(),
        ]);
    }

    private function normalize(mixed $value): string
    {
        if (is_bool($value)) {
            return $value ? '1' : '0';
        }

        return $value === null ? '' : (string) $value;
    }
}
