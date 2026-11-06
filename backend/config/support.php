<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Support Chat (چت پشتیبانی فروشگاه)
    |--------------------------------------------------------------------------
    |
    | کاربر می‌تواند از داخل خود صفحهٔ فروشگاه با پشتیبانی گفتگو کند یا از
    | طریق تلگرام، واتساپ و بله ادامهٔ گفتگو را در پیام‌رسان دنبال کند.
    | لینک هر پیام‌رسان به ترتیب از «لینک صریح»، «نام کاربری ربات» و
    | «تنظیمات فروشگاه» خوانده می‌شود.
    |
    */

    // فعال بودن چت درون‌سایتی
    'web_chat_enabled' => (bool) env('SUPPORT_CHAT_ENABLED', true),

    // فاصلهٔ به‌روزرسانی خودکار گفتگو در ویجت (ثانیه)
    'poll_seconds' => (int) env('SUPPORT_POLL_SECONDS', 5),

    // رمز مسیر وب‌هوک پیام‌رسان‌ها؛ خالی بودن یعنی وب‌هوک غیرفعال است.
    'webhook_secret' => env('SUPPORT_WEBHOOK_SECRET'),

    // کانال‌هایی که هنگام ثبت درخواست جدید به مدیران اطلاع می‌دهند.
    'alert_channels' => ['telegram', 'bale', 'whatsapp'],

    // نام کاربری ربات‌ها برای ساخت لینک گفتگو
    'bot_usernames' => [
        'telegram' => env('TELEGRAM_BOT_USERNAME'),
        'bale' => env('BALE_BOT_USERNAME'),
    ],

    // لینک کامل گفتگوی پشتیبانی (اولویت نسبت به نام کاربری ربات)
    'links' => [
        'telegram' => env('TELEGRAM_SUPPORT_LINK'),
        'whatsapp' => env('WHATSAPP_SUPPORT_LINK'),
        'bale' => env('BALE_SUPPORT_LINK'),
    ],

    // شمارهٔ واتساپ پشتیبانی (مثلاً 09121234567)
    'whatsapp_number' => env('WHATSAPP_SUPPORT_NUMBER'),
];
