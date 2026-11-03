<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Messaging Channels (SMS / Telegram / WhatsApp / Bale)
    |--------------------------------------------------------------------------
    |
    | هر کانال وقتی «قابل استفاده» است که هم enabled=true باشد و هم
    | اطلاعات اتصال (توکن/کلید) آن تنظیم شده باشد. پنل مدیریت وضعیت
    | هر کانال را از همین فایل می‌خواند.
    |
    */

    // مهلت هر درخواست HTTP به سرویس بیرونی (ثانیه)
    'timeout' => (int) env('MESSAGING_TIMEOUT', 15),

    // حداکثر تعداد گیرنده در هر ارسال گروهی
    'audience_limit' => (int) env('MESSAGING_AUDIENCE_LIMIT', 300),

    'channels' => [

        'sms' => [
            'label' => 'پیامک',
            'enabled' => (bool) env('SMS_ENABLED', false),
            // kavenegar | smsir | custom
            'driver' => env('SMS_DRIVER', 'kavenegar'),
            'api_key' => env('SMS_API_KEY'),
            'sender' => env('SMS_SENDER'),
            'base_url' => env('SMS_BASE_URL'),
            'default_recipient' => env('SMS_DEFAULT_RECIPIENT'),
        ],

        'telegram' => [
            'label' => 'تلگرام',
            'enabled' => (bool) env('TELEGRAM_ENABLED', false),
            'bot_token' => env('TELEGRAM_BOT_TOKEN'),
            'chat_id' => env('TELEGRAM_CHAT_ID'),
            'api_url' => env('TELEGRAM_API_URL', 'https://api.telegram.org'),
        ],

        'whatsapp' => [
            'label' => 'واتساپ',
            'enabled' => (bool) env('WHATSAPP_ENABLED', false),
            'token' => env('WHATSAPP_TOKEN'),
            'phone_number_id' => env('WHATSAPP_PHONE_NUMBER_ID'),
            'api_url' => env('WHATSAPP_API_URL', 'https://graph.facebook.com/v21.0'),
            'template_name' => env('WHATSAPP_TEMPLATE_NAME'),
            'template_language' => env('WHATSAPP_TEMPLATE_LANGUAGE', 'fa'),
            'default_recipient' => env('WHATSAPP_DEFAULT_RECIPIENT'),
        ],

        'bale' => [
            'label' => 'بله',
            'enabled' => (bool) env('BALE_ENABLED', false),
            'bot_token' => env('BALE_BOT_TOKEN'),
            'chat_id' => env('BALE_CHAT_ID'),
            'api_url' => env('BALE_API_URL', 'https://tapi.bale.ai'),
        ],

    ],
];
