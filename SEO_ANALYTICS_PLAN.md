# نقشهٔ راه سئو، آنالیتیکس، گوگل ادز و انبار

این سند پیشنهاد اجرایی است، نه شرح کد فعلی. هدفش این است که بدانیم به ترتیب
چه کاری، با چه فایلی و با چه هزینه‌ای انجام می‌شود. مرجع فنی پروژه همچنان
`TECHNICAL_GUIDE.md` است.

## ۱) وضعیت فعلی (نقطهٔ شروع)

| حوزه | امروز چه داریم |
|---|---|
| سئوی پایه | `frontend/src/hooks/usePageMeta.ts` + `utils/seo.ts` (عنوان/توضیح/canonical/og/twitter/robots) و `utils/structuredData.ts` (Organization، WebSite+Sitelinks Searchbox، Breadcrumb، Product، Article، ItemList) |
| متای پنل | `products/categories/brands.meta_title/meta_description`، `pages.seo_title/seo_description`، `alt` تصویر محصول و `image_alt` بنر |
| sitemap/robots | فقط در `npm run build` (`frontend/scripts/generate-sitemap.mjs`) و وابسته به `VITE_SITE_URL` |
| noindex | پنل، سبد خرید، تسویه، حساب کاربری، جست‌وجو، صفحه‌بندی بعدی |
| آنالیتیکس | **هیچ** (نه GA4، نه GTM، نه Clarity، نه آمار داخلی رویداد) |
| انبار | `stock_movements` + `Services/Inventory/StockLedger`، فاکتور خرید، تأمین‌کننده، گزارش `GET /admin/reports/stock-movements`، کارت «ارزش انبار» در حسابداری |
| پنل | داشبورد فروش (`AdminDashboard` + نمودار روند/کانال)، گزارش‌ها، حسابداری، علاقه‌مندی‌ها |

سه شکاف مهم: (۱) هیچ اندازه‌گیری رفتاری نداریم، (۲) sitemap فقط با build تازه
می‌شود و canonical پارامترهای ردیابی را نگه می‌دارد، (۳) فید محصول برای
Google Merchant/Shopping وجود ندارد.

## ۲) اولویت‌بندی

| # | کار | اثر | هزینه |
|---|---|---|---|
| ۱ | اندازه‌گیری پایه (GA4/GTM + page_view) | پایهٔ همهٔ تصمیم‌های بعدی | یک تسک — **شروع شد** |
| ۲ | رویدادهای فروش (view/add_to_cart/checkout/purchase/refund) + UTM روی سفارش | می‌فهمیم کدام مسیر/کمپین فروش می‌آورد | ۱–۲ تسک |
| ۳ | اصلاح سئوی فنی (sitemap سروری، canonical پارامترها، ۴۰۴ واقعی، Rich result کامل) | رشد ترافیک ارگانیک | ۱–۲ تسک |
| ۴ | فید محصول برای Google Merchant + کانونشن UTM کمپین‌ها | تبلیغات Shopping و Free listings | ۱ تسک |
| ۵ | داشبورد آنالیتیکس داخلی پنل (قیف، منابع، ROAS) | بدون وابستگی به گوگل | ۲–۳ تسک |
| ۶ | انبار: هشدار موجودی، شمارش انبار، پیش‌بینی اتمام | جلوگیری از فروش کالای ناموجود | ۲–۳ تسک |
| ۷ | پیش‌رندر/SSR مسیرهای عمومی | بهترین نتیجهٔ سئو، گران‌ترین | ۳+ تسک، تصمیم معماری |

## ۳) مسیر آنالیتیکس

### فاز ۱.۱ — پایه (انجام شد در همین تسک)
- `frontend/src/utils/analytics.ts`: تنها درگاه رویداد. اگر `VITE_GA4_ID` یا
  `VITE_GTM_ID` خالی باشد **هیچ اسکریپتی دانلود نمی‌شود**؛ با GTM، GA4 از داخل
  کانتینر مدیریت می‌شود (نه بارگذاری مستقیم) تا رویداد دوبار شمرده نشود.
- `frontend/src/components/AnalyticsTracker.tsx` در `App.tsx` داخل
  `BrowserRouter`: `page_view` با هر تغییر مسیر (SPA)، با `send_page_view:false`
  در config تا بازدید اولیه دوبار ثبت نشود؛ مسیرهای `/admin` ثبت نمی‌شوند.

### فاز ۱.۲ — رویدادهای فروش (انجام شد در ۱.۴۸)
مکان‌های دقیق: `ProductCard`/`ProductDetail` (`view_item`، `view_item_list`)،
`context/CartContext` (`add_to_cart`، `remove_from_cart`)، `Checkout`
(`begin_checkout`، `add_shipping_info`، `add_payment_info`)، صفحهٔ موفقیت سفارش
و ثبت سفارش (`purchase`)، و مسیرهای لغو (`refund`).
قاعدهٔ حساس: `transaction_id = order_number` تا GA4 رویداد تکراری را حذف کند؛
سفارش COD هم در لحظهٔ ثبت `purchase` می‌شود و لغو آن `refund` (هم‌راستا با
`OrderStockService`/`OrderCouponService`، بدون تغییر آن‌ها).
`currency`: قیمت‌ها به تومان ذخیره می‌شوند؛ برای GA4 مقدار ریالی با
`currency: "IRR"` فرستاده می‌شود (تبدیل یک‌جا در همان فایل analytics).

**پیاده‌سازی ۱.۴۸:** `view_item_list` از صفحهٔ `/products` (هر لود/صفحه‌بندی) و
`view_item` از `/product/:slug` فرستاده می‌شود؛ `purchase` برای COD در `Checkout`
و برای پرداخت آنلاین در `Payment.tsx` پس از موفقیت پرداخت؛ `refund` در لغو
سفارش `AccountOrders`/`TrackOrder` (بدون مبلغ).

### فاز ۱.۳ — UTM و انتساب سفارش (انجام شد در ۱.۴۸، همراه فاز ۱.۲)
- ستون‌های `orders.utm_source/utm_medium/utm_campaign/utm_content/utm_term` +
  `orders.referrer` (مایگریشن + پر کردن در `OrderController@store`؛ اعتبارسنجی
  سمت سرور و حذف پارامترهای خطرناک).
- نتیجه: در پنل می‌شود گفت «۳۰٪ فروش این ماه از کمپین X» بدون نیاز به GA4.

#### قرارداد نام‌گذاری UTM کمپین (راهنمای تیم)

همهٔ لینک‌های کمپین فقط با **حروف کوچک لاتین و خط تیره** ساخته می‌شوند (بدون
فاصله، حرف بزرگ و کاراکتر فارسی) تا هم گزارش `orders.utm_*` و GA4 یک‌دست
بمانند و هم تجزیهٔ خودکار به هم نریزد:

| پارامتر | مقادیر پیشنهادی | نمونه |
|---|---|---|
| `utm_source` | `instagram`, `telegram`, `bale`, `eitaa`, `google`, `yektanet`, `mediaad`, `adro`, `sms`, `newsletter` | `instagram` |
| `utm_medium` | `social`, `paid-social`, `cpc`, `banner`, `email`, `referral` | `paid-social` |
| `utm_campaign` | «سال-ماه-هدف» با رقم لاتین | `1404-09-cod-launch` |
| `utm_content` | جایگاه یا خلاقیت | `story-1`, `post-carousel` |
| `utm_term` | فقط جست‌وجوی پولی | `kharid-lebas-zir` |

قاعده‌ها:
1. لینک داخلی سایت **هرگز** UTM نمی‌گیرد (انتساب را خراب می‌کند و canonical
   تکراری می‌سازد)؛ UTM فقط روی لینک منتشرشده در کانال بیرونی می‌نشیند.
2. لینک فید Merchant بدون UTM می‌ماند؛ گوگل خودش `gclid`/auto-tagging را
   اضافه می‌کند و UTM دستی گزارش Ads را دوپاره می‌کند.
3. هر کمپین = یک `utm_campaign` جدید؛ مقدار کمپین قبلی بازنویسی نمی‌شود تا
   مقایسهٔ ماه‌به‌ماه ممکن بماند.
4. انتساب با **اولین UTM همان نشست** در `frontend/src/utils/attribution.ts`
   ثبت و در `POST /orders` به سفارش منتقل می‌شود؛ پس لینک کانال باید مستقیم به
   صفحهٔ مقصد (محصول/دسته/لندینگ) برود، نه به صفحهٔ اصلی و بعد کلیک داخلی.

### فاز ۱.۴ — تحلیل داخلی (اختیاری، بعد از ۱.۲)
اگر آمار مستقل از گوگل/AdBlock خواستیم: جدول `analytics_events`
(نشست، `guest_token`، کاربر، رویداد، محصول، مبلغ، UTM) + endpoint
`POST /analytics/events` با throttle و بدون ذخیرهٔ IP، پاک‌سازی خودکار بعد از
۹۰ روز. سپس داشبورد پنل: قیف بازدید→سبد→پرداخت، منابع ترافیک، نرخ رهاسازی
سبد، ROAS هر کمپین. مجوز جدید `analytics.view` باید هم‌زمان در
`AdminRole.php` و `adminPermissions.ts` + `adminNavItems.ts` +
`adminSidebarLayout.ts` + گارد `App.tsx` ثبت شود (قاعدهٔ ۶ فایل AGENTS).

### فاز ۱.۵ — Clarity و رضایت (کوکی)
Clarity برای heatmap (رایگان) فقط اگر با حریم خصوصی سایت هم‌خوان باشد؛ یک
سوییچ سادهٔ «اجازهٔ کوکی تحلیلی» در فوتر + احترام به آن در `analytics.ts`
(کلید در `storageKeys.ts` با پیشوند `behrang-shop-`).

## ۴) مسیر گوگل ادز

1. **Conversion tracking:** همان `purchase`/`begin_checkout` فاز ۱.۲ با `value`،
   `currency` و `transaction_id`؛ در GTM یک تگ Google Ads Conversion روی
   `purchase` ساخته می‌شود (بدون تغییر کد).
2. **Enhanced Conversions:** ارسال ایمیل/تلفن هش‌شده (SHA-256)، بهتر است سمت
   سرور بعد از فاز ۱.۳.
3. **Merchant Center / Shopping:** endpoint
   `GET /feed/google-merchant.xml` (کش‌شده) از محصولات فعال: `id`, `title`,
   `description`, `link`, `image_link`, `price`, `availability`, `brand`,
   `sku`, `condition`, `shipping`, و `identifier_exists: no` برای کالاهای بدون
   GTIN تا فید رد نشود.
   **پیاده‌سازی ۱.۵۰:** `MerchantFeedController` در `routes/web.php` (بیرون از
   `/api/v1`)؛ SKU به `g:mpn` نگاشت می‌شود (فید RSS مشخصهٔ `g:sku` ندارد)،
   قیمت‌ها ریالی می‌روند (تومان×۱۰) و `g:sale_price` برای کالای تخفیف‌دار
   اضافه می‌شود؛ `g:shipping` از تنظیمات ارسال فروشگاه ساخته می‌شود.
4. **Dynamic remarketing:** پارامترهای `ecomm_prodid`/`ecomm_pagetype` روی همان
   رویدادها.
5. **واقعیت مهم:** دسترسی به Google Ads از ایران محدود است (حساب/پرداخت). پس
   ترافیک ارگانیک + شبکه‌های داخلی (یکتانت/مدیااد/ادرو) و اینستاگرام را با
   UTMهای فاز ۱.۳ اندازه بگیریم؛ فید Merchant را هم بسازیم چون برای Free
   listings به کار می‌آید و اگر حساب ادز فعال شد مستقیماً استفاده می‌شود.

## ۵) مسیر سئو (شکاف‌های واقعی)

1. **sitemap سروری:** امروز فقط در build ساخته می‌شود؛ محصول جدید تا build بعدی
   در sitemap نیست. پیشنهاد: کامند `seo:sitemap` + مسیر کش‌شده
   `GET /sitemap.xml` (یا فایل تولیدشده با cron روزانه)، با `lastmod`، image
   sitemap و `sitemap index` در صورت عبور از ۵۰ هزار آدرس.
2. **canonical پارامترها:** `currentPath()` در `seo.ts` کل `search` را نگه
   می‌دارد؛ `?utm_*`, `?gclid`, `?page=` محتوای تکراری می‌سازند. اصلاح: حذف
   پارامترهای ردیابی و canonical خودارجاع صفحه‌بندی (با `noindex,follow` برای
   صفحه‌های بعد، هم‌راستا با قاعدهٔ فعلی).
3. **Rich result کامل‌تر:** `Product` فعلی `Offer` دارد؛ برای Merchant listings
   `shippingDetails` و `hasMerchantReturnPolicy` هم لازم است (از تنظیمات ارسال
   موجود ساخته می‌شود). `FAQPage` فقط با محتوای واقعی.
4. **۴۰۴ واقعی:** SPA برای مسیر ناشناس ۲۰۰ برمی‌گرداند (soft-404). رفع آن
   کانفیگ هاست است، نه کد — نیازمند هماهنگی محیط انتشار.
5. **پیش‌رندر مسیرهای پول‌ساز:** `/`, `/products`, `/category/:slug`,
   `/product/:slug`, `/blog/:slug`, `/pages/:slug`. دو گزینه: `react-snap`
   در build (ساده، ولی با هر تغییر محصول build لازم است) یا سرویس prerender /
   رندر سمت Laravel برای خزنده‌ها. تصمیم معماری می‌خواهد؛ تا آن روز گوگل با
   رندر JS کار را انجام می‌دهد ولی شبکه‌های اجتماعی متن را نمی‌بینند.
6. **الگوی عنوان/توضیح دسته‌ها** (کار محتوایی، بدون کد): «خرید {دسته} —
   {تعداد} محصول» + متن کوتاه اختصاصی پایین صفحهٔ دسته.
7. **پایش:** ثبت در Search Console، ارسال sitemap، بررسی ماهانهٔ Coverage و
   Enhancements (Product/Breadcrumb).

## ۶) مسیر انبار (با آنچه داریم)

1. **هشدار موجودی کم:** **انجام شد (۱.۴۷):** ستون `low_stock_threshold` روی
   محصول/تنوع، `LowStockService`، اعلان `AdminNotification::TYPE_LOW_STOCK`،
   کامند روزانهٔ `inventory:notify-low-stock` و کارت «کالاهای رو به اتمام» و
   میان‌بر «موجودی و انبار» در داشبورد.
2. **شمارش انبار (stocktake):** **انجام شد (۱.۴۷):** `POST /admin/inventory/stocktake`
   + نوع `stocktake` در `stock_movements` + فرم ردیفی در `/admin/inventory`؛
   بدون دست‌زدن به `OrderStockService` (قاعدهٔ ۵). به‌جای مجوز جدای
   `inventory.manage` از `products.manage` استفاده شد تا فهرست مجوزها کوتاه بماند.
3. **پیش‌بینی اتمام:** میانگین فروش ۳۰/۹۰ روز از `order_items` ÷ موجودی =
   «چند روز دیگر تمام می‌شود»؛ ستون جدید در فهرست محصولات پنل.
4. **گزارش گردش موجودی:** فیلتر بازه/نوع/محصول + خروجی اکسل با `XlsxWriter`
   (همان الگوی ایمپورت مخاطبین).
5. **بهای تمام‌شده:** `cost_price` ایستاست؛ برای سود دقیق‌تر، میانگین موزون از
   فاکتورهای خرید (`PurchaseInvoiceService`) در `ProfitReportService`.
6. **انبار چندگانه / بچ و انقضا / بارکد:** فقط اگر واقعاً لازم شد (شعبهٔ دوم،
   اقلام تاریخ‌دار، اسکن در شمارش). برای فروشگاه فعلی اولویت نیست.

## ۷) ترتیب اجرا (هر ردیف = یک تسک/نشست)

| تسک | محتوا | وضعیت |
|---|---|---|
| ۱ | پوستهٔ آنالیتیکس + `page_view` + مستندسازی متغیرها | **انجام شد** |
| ۱.۵ | صفحهٔ «سلامت سئو» + مدیر ریدایرکت ۳۰۱ (ممیزی متا، `redirects`، `_redirects`/`redirects.conf` در build) | **انجام شد** (۱.۴۶) |
| ۲ | رویدادهای فروش GA4 + ستون‌های UTM سفارش (بک‌اند + فرانت + تست) | **انجام شد** (۱.۴۸) |
| ۳ | سئو: canonical پارامترها + sitemap سروری + `shippingDetails` | |
| ۴ | فید Merchant (`/feed/google-merchant.xml`) + راهنمای UTM کمپین | **انجام شد** (۱.۵۰) |
| ۵ | داشبورد آنالیتیکس داخلی پنل (بعد از تصمیم دربارهٔ فاز ۱.۴) | |
| ۶ | انبار: هشدار موجودی + پیش‌بینی اتمام | هشدار موجودی **انجام شد** (۱.۴۷)؛ پیش‌بینی اتمام باقی |
| ۷ | پیش‌رندر مسیرهای عمومی (نیازمند تصمیم معماری/هاست) | |

## ۸) چه چیزی از شما لازم است

- **GA4/GTM:** آیا حساب گوگل آنالیتیکس دارید؟ Measurement ID (`G-…`) یا کانتینر
  (`GTM-…`) — فقط یکی. بدون شناسه، کد فعلی بی‌اثر و بی‌خطر است.
- **Search Console:** دامنه ثبت شود تا sitemap ارسال و خطاها دیده شود.
- **انتشار:** سایت روی هاست استاتیک است یا سرور PHP؟ (برای sitemap سروری،
  ۴۰۴ واقعی و cron). این پاسخ تسک ۳ و ۷ را قطعی می‌کند.
- **ادز:** حساب Google Ads/Merchant فعال دارید یا فعلاً شبکه‌های داخلی؟
- **انبار:** چند انبار دارید؟ اقلام تاریخ‌دار/بچ‌دار هم می‌فروشید؟

## ۹) شاخص‌هایی که بعد از این مسیر اندازه‌پذیر می‌شوند

- نرخ تبدیل (بازدید → سفارش) و نرخ رهاسازی سبد
- درآمد به تفکیک منبع/کمپین (UTM) و ROAS هر کمپین
- پرفروش‌ترین محصول و قیف هر محصول (بازدید → افزودن به سبد → خرید)
- سهم ترافیک ارگانیک و تعداد کلمات کلیدی دارای نمایش (Search Console)
- روزهای باقی‌مانده تا اتمام موجودی هر قلم و فهرست اقلام رو به اتمام

