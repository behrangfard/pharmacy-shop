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

    'mode' => env(
        'PAYMENT_MODE',
        env('APP_ENV') === 'local' ? 'demo' : 'disabled'
    ),

    'demo_enabled' => env(
        'PAYMENT_DEMO_ENABLED',
        env('APP_ENV') === 'local'
    ),
];
