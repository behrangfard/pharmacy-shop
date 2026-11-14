<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Payment Configuration
    |--------------------------------------------------------------------------
    |
    | Demo payments are enabled by default only in the local environment.
    | Real payment gateways will be configured separately in the future.
    |
    */

    /*
    | در محیط production پرداخت آزمایشی به‌صورت سخت‌گیرانه غیرفعال
    | می‌شود؛ حتی اگر PAYMENT_DEMO_ENABLED=true تنظیم شده باشد.
    */
    'mode' => env('APP_ENV') === 'production'
        ? 'disabled'
        : env(
            'PAYMENT_MODE',
            env('APP_ENV') === 'local' ? 'demo' : 'disabled'
        ),

    'demo_enabled' => env('APP_ENV') === 'production'
        ? false
        : (bool) env(
            'PAYMENT_DEMO_ENABLED',
            env('APP_ENV') === 'local'
        ),

    /*
    |--------------------------------------------------------------------------
    | سقف سفارش «پرداخت در محل» (تومان)
    |--------------------------------------------------------------------------
    |
    | صفر یعنی بدون سقف. سفارش COD هیچ پرداخت اولیه‌ای ندارد؛ برای جلوگیری از
    | ثبت سفارش‌های بسیار بزرگ بدون تضمین پرداخت، مبلغ نهایی از این سقف بیشتر
    | باشد با خطای 422 رد می‌شود. همین عدد در GET /store-settings هم برگردانده
    | می‌شود تا چک‌اوت گزینهٔ COD را غیرفعال و علت را نشان دهد.
    */
    'cod_max_total' => (int) env('COD_MAX_TOTAL', 0),
];
