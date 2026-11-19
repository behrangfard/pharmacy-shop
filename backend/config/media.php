<?php

/**
 * تنظیمات فایل‌های تصویری فروشگاه.
 *
 * `webp` فقط وقتی انجام می‌شود که یکی از افزونه‌های GD یا Imagick روی سرور
 * فعال باشد؛ اگر هیچ‌کدام نبود، فایل اصلی دست‌نخورده می‌ماند و کامند
 * `images:webp` صریحاً هشدار می‌دهد. برای خاموش‌کردن کامل تبدیل،
 * `MEDIA_WEBP=false` بگذارید (تست‌ها هم همین کار را می‌کنند).
 */
return [
    'webp' => [
        'enabled' => (bool) env('MEDIA_WEBP', true),

        /** کیفیت خروجی WebP (۰ تا ۱۰۰). */
        'quality' => (int) env('MEDIA_WEBP_QUALITY', 82),

        /** عرض بیشینهٔ تصویر خروجی؛ صفر یعنی بدون تغییر اندازه. */
        'max_width' => (int) env('MEDIA_WEBP_MAX_WIDTH', 1920),

        /**
         * پوشه‌هایی که کامند `images:webp` روی آن‌ها کار می‌کند
         * (مسیر نسبی روی دیسک `public`).
         */
        'directories' => [
            'product-images',
            'products',
            'banners',
            'popups',
            'stories',
            'article-covers',
            'trust-badges',
            'product-size-guides',
            'announcement-bar',
        ],
    ],
];
