# AGENTS.md — قواعد کار در مخزن «بهرنگ شاپ»

این فایل برای هر دستیار هوش مصنوعی یا توسعه‌دهنده‌ای است که روی این پروژه کار
می‌کند. **قبل از تغییر هر فایل، این فایل و `TECHNICAL_GUIDE.md` را بخوان.**

## نقشهٔ سریع

| مسیر | چیست |
|---|---|
| `backend/` | Laravel 13 + Sanctum (PHP نسخهٔ `^8.3`) — سرویس API |
| `backend/routes/api.php` | تنها نقطهٔ ثبت مسیرهای API، با پیشوند `/api/v1` |
| `frontend/` | React 19 + TypeScript + Vite + Tailwind 4 (SPA، بدون Next.js) |
| `TECHNICAL_GUIDE.md` | سند فنی مرجع: معماری، مدل داده، API، قواعد دامنه، بدهی فنی |
| `SITE_GUIDE.md` | راهنمای رفتاری سایت و پنل برای مدیر فروشگاه |
| `Start.txt` | تاریخچهٔ کارها و تصمیم‌ها — هر تغییر مهم را اینجا هم ثبت کن |

> ریشهٔ پروژه یک `package.json` قدیمی/بی‌استفاده هم دارد؛ دستورهای فرانت را
> **داخل `frontend/`** و دستورهای بک‌اند را **داخل `backend/`** اجرا کن.

## دستورهای راستی‌آزمایی

| کار | دستور |
|---|---|
| کل تست‌های بک‌اند | `cd backend; php artisan test` |
| یک تست مشخص | `cd backend; php artisan test --filter=PopupTest` |
| فهرست مسیرهای API | `cd backend; php artisan route:list --path=api` |
| مایگریشن | `cd backend; php artisan migrate` |
| typecheck فرانت (گارد اصلی) | `cd frontend; npx tsc --noEmit` |
| بیلد فرانت | `cd frontend; npm run build` |
| اجرای محلی | `cd backend; php artisan serve` و `cd frontend; npm run dev` |

تست فرانت و ESLint وجود ندارد؛ پس **هر تغییر فرانت باید با `tsc --noEmit` و
`npm run build` تأیید شود** و تغییر بک‌اند با `php artisan test`.

## قواعد نشکن (Non-negotiables)

1. **هیچ رمز، توکن، کلید API یا محتوای `.env` را در چت، سند یا کامیت نگذار.**
   در مستندات فقط *نام* کلیدها مجاز است.
2. تغییر مجوزها **هم‌زمان** در دو فایل: `backend/app/Support/AdminRole.php` و
   `frontend/src/utils/adminPermissions.ts`. یکی بدون دیگری = پنل نیمه‌کاره.
3. کلیدهای `localStorage` همیشه از `frontend/src/utils/storageKeys.ts` با پیشوند
   `behrang-shop-` خوانده شوند (مهاجرت از `pharmacy-shop-*` حفظ شود).
4. قیمت، تخفیف، هزینهٔ ارسال و موجودی **فقط سمت سرور** محاسبه/اعتبارسنجی شوند؛
   عدد ارسالی فرانت هرگز مبنای ذخیره نباشد.
5. ثبت سفارش با هدر `Idempotency-Key` باید idempotent بماند؛ بازگردانی موجودی
   فقط از `App\Services\Orders\OrderStockService` انجام شود و بدون تست تغییر
   نکند (لغو مشتری + کامند `orders:release-abandoned` از همین مسیر استفاده
   می‌کنند).
6. هر قابلیت جدید ادمین: مسیر در `backend/routes/api.php` با
   `admin.permission:<key>` + آیتم سایدبار در `frontend/src/utils/adminNavItems.ts`
   + ثبت چیدمان در `adminSidebarLayout.ts` + گارد در `App.tsx`.
7. عملیات مخرب یا بازتولید آمار/کش (`migrate:fresh`، `cache:clear`، پاک‌کردن
   `sales_count`) بدون هماهنگی اجرا نشود.
8. ساختار پوشه‌ها و نام‌گذاری را با کد موجود هم‌راستا نگه دار (کنترلرهای `Api/`،
   سرویس‌های `Services/`، کامپوننت‌های صفحه‌محور). الگوی جدید نساز.
9. پرداخت دو روش دارد: `online` و `cod` (`App\Support\PaymentMethod`)؛ روش
   پرداخت بخشی از تطابق Idempotency-Key است. سفارش COD با
   `processing/unpaid` ساخته می‌شود، `POST /orders/{orderNumber}/pay` برای آن
   `422` می‌دهد، کامند `orders:release-abandoned` هرگز آن را لغو نمی‌کند و
   تسویه فقط با `PATCH /admin/orders/{orderNumber}/payment` انجام می‌شود.
   سقف مبلغ COD از `config('payment.cod_max_total')`/`COD_MAX_TOTAL` می‌آید
   (۰ = بدون سقف) و بررسی آن داخل تراکنش ثبت سفارش است؛ هر لغو/بازپرداخت هم
   سهمیهٔ کوپن را فقط از `App\Services\Orders\OrderCouponService` آزاد می‌کند.
10. صفحات رسمی/اعتماد (`about/contact/terms/privacy/returns`) با
    `php artisan pages:legal` نصب می‌شوند، متنشان در `App\Support\LegalPages`
    است و متغیرهای `{{store_*}}` هنگام نمایش در `PageController` پر می‌شوند.
    فاکتور مشتری `/account/orders/{orderNumber}/invoice` با چاپ مرورگر (Save as
    PDF) کار می‌کند؛ کتابخانهٔ PDF جدید اضافه نکن. سقف استفادهٔ هر کاربر کوپن
    (`coupons.per_user_limit`) باید هم در ثبت سفارش و هم در `coupons/check`
    رعایت شود؛ برای مهمان مبنای سهمیه شمارهٔ تماس سفارش است
    (`Coupon::perPhoneUsageError`).
11. سفارش مهمان: `orders.user_id` می‌تواند NULL باشد و هویت مهمان با هدر
    `X-Guest-Token` (UUID پایدار در localStorage با کلید `guestToken`) است؛
    مهمان فقط `cod` می‌پذیرد و Idempotency او با
    `(guest_token, idempotency_key)` سنجیده می‌شود. رهگیری عمومی
    `POST /orders/track` فقط با «شماره سفارش + تلفن»، پاسخ محدود و تلفن
    ماسک‌شده است. بازیابی دسترسی مهمان در مرورگر جدید فقط با
    `POST /orders/recover` («شماره سفارش + کد پیگیری»؛ کد در
    `orders.guest_access_code` است، فقط در پاسخ ثبت سفارش برمی‌گردد و در
    بقیهٔ پاسخ‌ها مخفی می‌ماند) انجام می‌شود. همان شناسه برای
    `GET /orders/{orderNumber}` (جزئیات/فاکتور) و
    `POST /orders/{orderNumber}/cancel` (فقط سفارش پرداخت‌نشده و ارسال‌نشده) هم
    معتبر است؛ مالکیت را با `findOwnedOrder` بسنج و بدون هویت `401` بده. لینک
    بازیابی رمز از `FRONTEND_URL` ساخته می‌شود و پاسخ
    `forgot-password` نباید وجود ایمیل را لو بدهد.

## قانون همگام‌سازی سند (مهم)

`TECHNICAL_GUIDE.md` مرجع تحویل پروژه است. هر بار یکی از این‌ها تغییر کرد،
همان لحظه بخش مربوطه را در آن سند به‌روز کن:

| تغییر | بخش سند |
|---|---|
| مسیر/گروه/میدلویر API | ۸ + ۱۲ |
| مایگریشن/جدول/ستون/مدل | ۷ + آمار بخش ۲ |
| نسخهٔ فریم‌ورک یا پکیج اصلی | ۲ + تاریخ نسخه |
| نقش/مجوز/احراز هویت | ۶ + ۱۲ |
| متغیر env یا `config/*` | ۵ + ۱۱ |
| قاعدهٔ کسب‌وکار | ۹ |
| فایل/پوشه/Context فرانت | ۴ + ۱۰ |
| دستور جدید | ۵ + ۱۶ |
| بدهی فنی موکول‌شده | ۱۴ |

جزئیات و دستورهای بازتولید آمار در بخش ۱۶ همان سند آمده است. تصمیم‌هایی که
کد را تغییر نمی‌دهند در `Start.txt` ثبت می‌شوند.

## سبک کار

- پیام‌ها، متن‌های UI و مستندات **فارسی و راست‌به‌چپ**؛ اعداد فارسی در متن،
  اعداد لاتین در کد و نام فیلدها.
- کامیت/گزارش نهایی: چه فایلی، چرا، و چه چیزی تست شد (`tsc`، `build`،
  `artisan test`).
- اگر تصمیمی دو راه داشت و ابهام باقی بود، قبل از پیاده‌سازی کوتاه بپرس؛
  حدس نزن.
