<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StoreSetting;
use Illuminate\Http\JsonResponse;

class StoreSettingController extends Controller
{
    public function tax(): JsonResponse
    {
        $vatEnabled = filter_var(
            (string) StoreSetting::getValue('vat_enabled', '0'),
            FILTER_VALIDATE_BOOLEAN
        );

        $vatPercent = $vatEnabled
            ? min(
                max(
                    (float) StoreSetting::getValue('vat_percent', 10),
                    0
                ),
                100
            )
            : 0;

        return response()->json([
            'success' => true,
            'data' => [
                'vat_enabled' => $vatEnabled,
                'vat_percent' => $vatPercent,
            ],
        ]);
    }
}
