<?php

/*
|--------------------------------------------------------------------------
| تنظیمات انبار و هشدار موجودی
|--------------------------------------------------------------------------
|
| `low_stock_threshold` آستانهٔ پیش‌فرض هشدار است؛ هر کالا/تنوع می‌تواند با
| ستون `low_stock_threshold` خودش آن را بازنویسی کند (۰ = هشدار فقط در
| موجودی صفر). `low_stock_notify_cooldown_hours` فاصلهٔ حداقلی بین دو اعلان
| «موجودی کم» است تا زنگولهٔ پنل پرنشود.
|
*/

return [
    'low_stock_threshold' => max(0, (int) env('INVENTORY_LOW_STOCK_THRESHOLD', 5)),

    'low_stock_notify_cooldown_hours' => max(
        1,
        (int) env('INVENTORY_LOW_STOCK_NOTIFY_COOLDOWN_HOURS', 24)
    ),
];
