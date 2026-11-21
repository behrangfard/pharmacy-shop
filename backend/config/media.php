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

    /*
     * نقشهٔ ارجاع فایل‌ها برای کامند `media:prune`.
     *
     * هر پوشه → جدول‌(ها) و ستون‌هایی که مسیر فایل در آن‌ها ذخیره می‌شود.
     * فایلی که در هیچ‌کدام از این ستون‌ها پیدا نشود «یتیم» است. اگر جدول یا
     * ستونی وجود نداشته باشد، آن پوشه به‌طور کامل نادیده گرفته می‌شود (حذف
     * نکردن، امن‌تر از حذف اشتباه است).
     *
     * عمداً کنار گذاشته شده: `product-size-guides` و `products` و
     * `product-images`، چون مسیر تصویر راهنمای سایز داخل ستون JSON ذخیره
     * می‌شود و با تطابق سادهٔ مسیر قابل سنجش نیست؛ برای این پوشه‌ها از
     * `images:migrate-legacy` و بازبینی دستی استفاده شود.
     */
    'prune' => [
        'directories' => [
            'banners' => [
                ['table' => 'banners', 'columns' => ['image', 'mobile_image']],
            ],
            'article-covers' => [
                ['table' => 'articles', 'columns' => ['cover_image']],
            ],
            'popups' => [
                ['table' => 'popups', 'columns' => ['image']],
            ],
            'stories' => [
                ['table' => 'stories', 'columns' => ['cover_image']],
            ],
            'trust-badges' => [
                ['table' => 'trust_badges', 'columns' => ['image']],
            ],
            'announcement-bar' => [
                ['table' => 'announcement_bar_items', 'columns' => ['image']],
            ],
            'banner-fonts' => [
                ['table' => 'banner_fonts', 'columns' => ['file_path']],
            ],
        ],
    ],
];
