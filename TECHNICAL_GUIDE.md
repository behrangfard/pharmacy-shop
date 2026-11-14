# راهنمای فنی جامع پروژه «بهرنگ شاپ»

> **نسخهٔ سند:** 1.11
> **تاریخ:** ۲۳ آبان ۱۴۰۵ / 2026-11-14
> **مخاطب:** توسعه‌دهندهٔ جدید، بازبین خارجی، دستیار هوش مصنوعی
> **دامنه:** کل مونوریپو (`backend/` + `frontend/`)

این سند تصویر فنیِ *واقعیِ* کد در تاریخ بالا است و از روی خودِ کد استخراج شده است
(فهرست مسیرها، مایگریشن‌ها، مدل‌ها، پیکربندی‌ها و ساختار پوشه‌ها).

> ⚠️ **این فایل هیچ رمز، توکن، کلید API یا مقدار `.env` واقعی ندارد.**
> فقط *نام* متغیرها آمده است. برای اشتراک‌گذاری با ابزارهای هوش مصنوعی یا
> افراد بیرونی، همین فایل + کد پروژه کافی است و نیازی به ارسال `.env` نیست.

> 🔁 **قانون نگهداری (اجباری):** این سند باید *هم‌زمان با کد* به‌روز بماند، نه
> بعداً. در پایان هر تغییری که در جدول زیر آمده، همان بخش و آمار مربوطه را
> اصلاح کن و نسخه/تاریخ بالای فایل و ردیف تاریخچهٔ پایان سند را بالا ببر:
>
> | اگر این تغییر کرد | این بخش‌ها به‌روز شوند |
> |---|---|
> | مسیر، پیشوند، میدلویر یا گروه ادمین در `routes/api.php` | ۸ (API) + ۱۲ (نقشهٔ تغییر) |
> | مایگریشن، جدول، ستون یا مدل | ۷ (مدل داده) + آمار بخش ۲ |
> | نسخهٔ Laravel/React/Vite/Tailwind یا پکیج اصلی | ۲ (شناسنامهٔ فنی) + تاریخ نسخه |
> | نقش، مجوز یا مدل احراز هویت | ۶ (ماتریس مجوزها) + ۱۲ |
> | متغیر/درایور env یا پیکربندی (`config/*`) | ۵ (جدول env) + ۱۱ (یکپارچگی‌ها) |
> | قاعدهٔ کسب‌وکار (سفارش، ارسال، تخفیف، پاپ‌آپ، پیام‌رسانی) | ۹ (قواعد دامنه) |
> | فایل، پوشه، Context یا سرویس جدید فرانت | ۴ (نقشهٔ پوشه‌ها) + ۱۰ (فرانت‌اند) |
> | دستور artisan/npm جدید یا تغییر جریان build | ۵ (دستورات) + ۱۶ |
> | بدهی فنی عمدی/موکول‌شده | ۱۴ (بدهی فنی) |
>
> اگر تغییری در کد انجام نشد و فقط تصمیم گرفته شد، در `Start.txt` ثبت کن.
> شمارهٔ نسخه و آمار بخش ۲ را با دستورهای انتهای بخش ۱۶ بازتولید کن.

---

## فهرست

۱. خلاصهٔ یک‌صفحه‌ای
۲. شناسنامهٔ فنی
۳. معماری کلی
۴. نقشهٔ پوشه‌ها
۵. راه‌اندازی محیط توسعه و دستورات
۶. احراز هویت و مجوزها
۷. مدل داده
۸. API
۹. قواعد دامنه (منطق کسب‌وکار)
۱۰. فرانت‌اند
۱۱. یکپارچگی‌های بیرونی، صف و زمان‌بندی
۱۲. نقشهٔ «کجا چه چیزی را عوض کنم»
۱۳. قراردادها و قواعد تغییر
۱۴. بدهی فنی و ریسک‌ها
۱۵. چک‌لیست تحویل به هوش مصنوعی دیگر
۱۶. نگهداری سند

---

## ۱) خلاصهٔ یک‌صفحه‌ای

«بهرنگ شاپ» یک فروشگاه اینترنتی پوشاک زیر است با معماری **جدا‌شدهٔ SPA + API**:

- **بک‌اند:** Laravel 13 (PHP 8.4 در محیط توسعه) با احراز هویت **Sanctum Bearer Token**
  و ۲۴۵ مسیر API؛ ۱۸۵ مسیر آن مخصوص پنل مدیریت است.
- **فرانت‌اند:** React 19 + TypeScript + Vite + Tailwind CSS 4 (بدون Next.js)،
  راست‌به‌چپ و فارسی، شامل فروشگاه عمومی و پنل مدیریت در همان SPA.
- **داده:** MySQL در محیط توسعه (پیش‌فرض `.env.example` روی SQLite است)،
  ۶۸ مایگریشن، ۴۲ مدل، ۵۶ کنترلر.
- **پرداخت:** دو روش: **پرداخت آزمایشی (demo)** در محیط local (در `production`
  به‌صورت سخت‌گیرانه غیرفعال می‌شود) و **پرداخت در محل (COD)** که مستقل از
  درگاه است و وجه هنگام تحویل دریافت/ثبت می‌شود.
- **پنل مدیریت:** ۴ نقش (`super_admin`, `product_manager`, `order_manager`, `support`)
  و ۱۷ مجوز صفحه‌محور؛ هم API و هم منو/مسیرهای فرانت با همان مجوزها محدود می‌شوند.
- **قابلیت‌های فروشگاه:** دسته‌بندی/برند/سایز/رنگ/پک، فیلتر فست‌محور، سبد خرید
  مهمان (localStorage)، علاقه‌مندی (مهمان + انتقال به حساب)، سفارش با
  Idempotency-Key، کد تخفیف، مرجوعی، حمل‌ونقل چندلایه، مقالات، صفحات ثابت،
  بنر/اسلایدر، نوار اطلاع‌رسانی، استوری، پاپ‌آپ کمپینی، نشان اعتماد،
  پیام‌رسانی (پیامک/تلگرام/بله/واتساپ)، چت پشتیبانی، حسابداری و انبار.
- **PWA:** manifest + service worker دستی (`public/sw.js`) با نسخهٔ کش
  خودکار در هر build + صفحهٔ آفلاین.
- **تست:** ۳۹۲ تست PHPUnit در ۵۵ فایل (فقط بک‌اند). فرانت‌اند تست واحد ندارد
  و ESLint هم پیکربندی نشده است؛ تنها گارد فرانت `tsc --noEmit` و build است.
- **مستندات موجود:** `AGENTS.md` (قواعد اجباری کار برای هر دستیار/توسعه‌دهنده)،
  `SITE_GUIDE.md` (راهنمای فارسی خودِ سایت برای کاربر/مدیر) و `Start.txt`
  (تاریخچهٔ کارها). این فایل، سند فنی برای تحویل به توسعه‌دهنده یا هوش مصنوعی است.

---

## ۲) شناسنامهٔ فنی

| مورد | مقدار |
|---|---|
| نوع پروژه | مونوریپو: `backend` (Laravel API) + `frontend` (React SPA) |
| فریم‌ورک بک‌اند | Laravel Framework **13.31.0** (`composer.json`: `^13.17`) |
| نسخهٔ PHP | ۸.۴.۲۵ در محیط فعلی؛ نیازمندی پروژه `^8.3` |
| بسته‌های اصلی بک‌اند | `laravel/sanctum ^4.0`، `laravel/tinker ^3.0` |
| بسته‌های dev بک‌اند | PHPUnit `^12.5`، Pint، Pail، Collision، Faker، Mockery، `laravel/pao` |
| فریم‌ورک فرانت | React **19.3**، React DOM 19.3 |
| مسیریابی فرانت | `react-router-dom` **7.18** (BrowserRouter + lazy routes) |
| بیلد فرانت | Vite **8.3** + `@vitejs/plugin-react` 6.1 |
| زبان فرانت | TypeScript **7.0** (`tsc --noEmit` در script `typecheck`) |
| استایل | Tailwind CSS **4.3** با پلاگین رسمی Vite (بدون config کلاسیک) |
| کتابخانه‌های UI | `lucide-react` (آیکون)، `leaflet` 1.9 (نقشهٔ انتخاب آدرس)، فونت `@fontsource/vazirmatn` |
| کلاینت HTTP | Axios 1.20 با دو نمونهٔ جدا (`api` و `adminApi`) |
| پایگاه داده | MySQL (`pharmacy_shop`) در `.env` و `.env.example` |
| درایورهای پیش‌فرض | `CACHE_STORE=database`، `QUEUE_CONNECTION=database`، `SESSION_DRIVER=database`، `FILESYSTEM_DISK=local` |
| احراز هویت | Sanctum Personal Access Token (Bearer)؛ بین‌دامنه‌ای با کوکی نیست (`supports_credentials=false`) |
| پورت‌ها | API: `8000`، توسعهٔ فرانت: `5173`، پیش‌نمایش build: `4173` |
| زبان رابط کاربری | فارسی و RTL؛ هیچ لایهٔ i18n وجود ندارد (متن‌ها inline هستند) |
| تاریخ شمسی | `backend/app/Support/JalaliDate.php` و `frontend/src/utils/jalali.ts` |
| تعداد مسیرها | ۲۴۹ (۲۶ گروه) — ۱۸۵ مسیر زیر `/api/v1/admin` |
| تعداد مایگریشن‌ها | ۷۱ |
| تعداد مدل‌ها | ۴۲ |
| تعداد کنترلرها (پوشهٔ Api) | ۵۸ |
| تست‌ها | ۶۱ فایل Feature (+۱ Unit)، ۴۴۷ متد تست و ۲۳۰۸ assertion |
| حجم کد فرانت | `frontend/src`: ۱۵۲ فایل، حدود ۸۵٬۲۰۰ خط (شامل ~۶٬۴۰۰ خط `index.css`) |
| حجم کد بک‌اند | `backend/app`: ۱۳۷ فایل، حدود ۲۰٬۹۰۰ خط |

> نسخه‌های بالا از `composer.json` / `package.json` و `php artisan --version`
> گرفته شده‌اند؛ اگر این سند قدیمی شد، همان دو فایل منبع حقیقت هستند.

---

## ۳) معماری کلی

```text
┌──────────────────────────────────────────────────────────────────────┐
│                          مرورگر کاربر / مدیر                          │
│  React SPA (Vite build) — RTL, فارسی, PWA                            │
│  Contexts: Auth / AdminAuth / Cart / Wishlist                        │
│  localStorage: token, cart, wishlist, کش محتوا, تم, وضعیت popup      │
└───────────────┬──────────────────────────────────────────────────────┘
                │ HTTPS + JSON (Axios)
                │ Authorization: Bearer <sanctum token>
                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        Laravel 13 — API                              │
│  routes/api.php  (prefix: /api/v1)                                   │
│  middleware: auth:sanctum → admin → admin.permission:<key>           │
│  Controllers (Api/*)  →  Models (Eloquent)  →  MySQL                 │
│  Services: Messaging / Shipping / Accounting / Products / Orders / Support    │
│  Support: AdminRole، OrderStatus، JalaliDate، BannerText، Spreadsheet│
│  Cache: database (فست فیلتر ۶۰ ثانیه، تنظیمات فروشگاه ۱۰ دقیقه)       │
└──────┬───────────────┬────────────────┬───────────────┬──────────────┘
       │               │                │               │
       ▼               ▼                ▼               ▼
  storage/app/    Queue (database)   Scheduler      پیام‌رسان‌ها
  public/*        jobs table        birthday:…      SMS / Telegram /
  (تصاویر)        (ارسال پیام)      orders:release  Bale / WhatsApp
```

**جریان‌های کلیدی**

- **خرید:** سبد مهمان در `localStorage` → Checkout (نیازمند ورود) →
  `POST /api/v1/orders` با هدر `Idempotency-Key` (UUID) و `payment_method`
  (`online`/`cod`) → سفارش آنلاین `pending/unpaid` → `POST /api/v1/orders/{orderNumber}/pay`
  (demo) → `processing/paid`؛ سفارش COD همان ابتدا `processing/unpaid` است و
  ادمین بعد از دریافت وجه آن را `paid` می‌کند.
- **محتوا:** مدیر از پنل → API ادمین → دیتابیس + پاک‌سازی کش مربوطه →
  فرانت با کش کوتاه‌مدت localStorage/حافظه محتوا را تازه می‌کند.
- **پشتیبانی:** ویجت چت عمومی → `support_conversations` با توکن مهمان →
  پنل ادمین (`/admin/support`) با polling؛ پیام‌های پیام‌رسان از webhook
  امضاشده وارد همان گفتگو می‌شوند.

---

## ۴) نقشهٔ پوشه‌ها

### بک‌اند (`backend/`)

| مسیر | محتوا |
|---|---|
| `app/Http/Controllers/Api/` | ۵۶ کنترلر؛ کنترلرهای عمومی (`ProductController`, `OrderController`, `AuthController`, …) و ادمین (`Admin*Controller`) در همین پوشه‌اند |
| `app/Http/Middleware/` | `AdminMiddleware` (بررسی نقش مدیر) و `EnsureAdminPermission` (بررسی مجوز صفحه‌ای) |
| `app/Models/` | ۴۲ مدل Eloquent (بدون Repository؛ منطق در کنترلرها/مدل‌ها) |
| `app/Services/` | `Messaging/` (درایورهای SMS/تلگرام/واتساپ/بله + قالب‌ها)، `Shipping/` (استعلام و قوانین ارسال)، `Accounting/`، `Products/`، `Notifications/`، `Orders/` (`OrderStockService`: بازگرداندن موجودی)، `Support/` |
| `app/Support/` | کلاس‌های کمکی دامنه: `AdminRole`، `OrderStatus`، `PaymentMethod`، `LegalPages` (متن و جایگزینی متغیر صفحات رسمی)، `JalaliDate`، `BannerText`، `SupportChannels`، `Spreadsheet/` (خواندن/نوشتن CSV-Excel برای ایمپورت محصول) |
| `app/Console/Commands/` | `birthday:greetings` (تبریک تولد)، `orders:release-abandoned` (لغو خودکار سفارش پرداخت‌نشده)، `pages:legal` (نصب صفحات رسمی سایت) و `catalog:hide-legacy` (مخفی‌سازی کاتالوگ قدیمی با `--restore`) |
| `routes/api.php` | تمام مسیرهای API با `prefix('v1')` |
| `routes/web.php` | مسیر ریشهٔ ساده (`/`) |
| `routes/console.php` | زمان‌بندی: `birthday:greetings` هر ۱۵ دقیقه و `orders:release-abandoned` هر ۱۰ دقیقه، هر دو با `withoutOverlapping` |
| `bootstrap/app.php` | ثبت alias میدلویرها (`admin`, `admin.permission`) و پاسخ JSON برای `api/*` |
| `config/payment.php` | منطق demo/disabled پرداخت + سقف مبلغ COD (`cod_max_total`) |
| `config/cors.php` | دامنه‌های مجاز از `CORS_ALLOWED_ORIGINS` |
| `database/migrations/` | ۷۰ مایگریشن |
| `database/seeders/` | `AdminUserSeeder`، `StoreSeeder`، `LegalPagesSeeder`، `DatabaseSeeder` |
| `tests/Feature/` | ۶۰ فایل تست (۴۲۸ تست) + ۱ تست واحد — پوشش اصلی: محصولات، سفارش‌ها، مهمان و دسترسی مهمان، رهگیری، بازیابی رمز، ادمین، محتوا، پشتیبانی |
| `storage/app/public/` | `banners/`، `banner-fonts/`، `product-images/`، `products/`، `stories/` و پوشه‌های ساخته‌شده در زمان آپلود |
| `public/` | `index.php`، `storage` (symlink)، `robots.txt`، `favicon.ico`؛ پوشهٔ باقی‌ماندهٔ `storage-old/` |

### فرانت‌اند (`frontend/`)

| مسیر | محتوا |
|---|---|
| `src/App.tsx` | تعریف همهٔ مسیرها؛ همهٔ صفحه‌ها با `lazy()` و `Suspense` |
| `src/pages/` | ۴۹ صفحه: ۲۱ صفحهٔ فروشگاه (از جمله `ForgotPassword`, `ResetPassword`, `TrackOrder`) + ۲۸ صفحهٔ ادمین (از جمله `AdminDashboard`, `AdminProductForm`, `AdminShipping`, `InvoiceView`) |
| `src/components/` | ۴۴ کامپوننت عمومی + پوشهٔ `accounting/` (۷ فایل) |
| `src/context/` | `AuthContext`, `AdminAuthContext`, `CartContext`, `WishlistContext` |
| `src/hooks/` | `useStoreSettings`, `useHeaderFooter`, `useSitePages`, `useBannerFonts`, `useStories`, `useTrustBadges`, `usePageMeta`, `useRecentlyViewed` |
| `src/services/` | لایهٔ تماس با API (axios) — `api.ts`، `productFilters.ts`، `popups.ts`، `support.ts`، `wishlist.ts`، … |
| `src/utils/` | `storageKeys.ts` (کلیدهای localStorage + مهاجرت از کلیدهای قدیمی)، `theme.ts`، `seo.ts`، `structuredData.ts`، `price.ts`، `jalali.ts`، `adminPermissions.ts`، `adminNavItems.ts`، `images.ts`، `banner*.ts`، `supportChat.ts` |
| `src/index.css` | ۶٬۴۲۲ خط: توکن‌های طراحی، تم‌ها، کلاس‌های عمومی و استایل‌های سراسری |
| `public/` | `manifest.webmanifest`، `sw.js`، `offline.html`، `icons/`، `images/` |
| `scripts/` | `generate-sitemap.mjs` (در `npm run build`) و `generate-pwa-icons.mjs` |
| `vite.config.ts` | پلاگین Tailwind، پلاگین نسخه‌دهی خودکار `sw.js`، پورت ۵۱۷۳/۴۱۷۳ و `host: true` برای تست روی موبایل |

### مستندات ریشه

| فایل | کاربرد |
|---|---|
| `AGENTS.md` | قواعد اجباری کار در مخزن (برای دستیارهای هوش مصنوعی و توسعه‌دهنده) |
| `SITE_GUIDE.md` | راهنمای فارسی رفتار سایت و پنل (برای مدیر فروشگاه) |
| `Start.txt` | تاریخچهٔ تغییرات و تصمیم‌های اجرایی |
| `TECHNICAL_GUIDE.md` | همین سند (فنی، مخصوص تحویل/بازبینی) |

---

## ۵) راه‌اندازی محیط توسعه و دستورات

### پیش‌نیازها

- PHP **8.3+** با افزونه‌های استاندارد Laravel (PDO، mbstring، openssl، …)
- Composer 2
- Node.js 20+ و npm
- MySQL 8 (یا SQLite برای راه‌اندازی سریع)

### راه‌اندازی از صفر

```bash
# بک‌اند
cd backend
composer install
cp .env.example .env          # در ویندوز: copy .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan storage:link
php artisan serve             # http://localhost:8000

# فرانت‌اند (ترمینال دوم)
cd frontend
npm install
npm run dev                   # http://localhost:5173
```

- `php artisan migrate --seed` دادهٔ اولیه را می‌سازد؛ `AdminUserSeeder` فقط وقتی
  حساب مدیر می‌سازد که `ADMIN_PASSWORD` تنظیم شده باشد (در `production` الزامی است).
- `StoreSeeder` دسته‌بندی/برند/محصولات نمونه و تنظیمات پیش‌فرض فروشگاه را می‌سازد.
- `php artisan storage:link` برای نمایش تصاویر آپلودی از `/storage/...` لازم است.

### متغیرهای محیطی (فقط نام‌ها، بدون مقدار)

| گروه | کلیدها |
|---|---|
| برنامه | `APP_NAME`, `APP_ENV`, `APP_KEY`, `APP_DEBUG`, `APP_URL`, `FRONTEND_URL` (آدرس SPA برای لینک بازیابی رمز)، `APP_LOCALE`, `APP_FALLBACK_LOCALE` |
| دیتابیس | `DB_CONNECTION`, `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` |
| زیرساخت | `SESSION_DRIVER`, `SESSION_LIFETIME`, `CACHE_STORE`, `QUEUE_CONNECTION`, `FILESYSTEM_DISK`, `BROADCAST_CONNECTION` |
| CORS | `CORS_ALLOWED_ORIGINS` (پیش‌فرض: `http://localhost:5173,http://localhost:4173`) |
| پرداخت | `PAYMENT_MODE` (`demo`/`disabled`), `PAYMENT_DEMO_ENABLED`, `COD_MAX_TOTAL` (سقف مبلغ سفارش پرداخت در محل به تومان؛ ۰ = بدون سقف) |
| مدیر اولیه | `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` |
| پیام‌رسانی | `MESSAGING_TIMEOUT`, `MESSAGING_AUDIENCE_LIMIT` |
| پیامک | `SMS_ENABLED`, `SMS_DRIVER` (`kavenegar`/`smsir`/`custom`), `SMS_API_KEY`, `SMS_SENDER`, `SMS_BASE_URL`, `SMS_DEFAULT_RECIPIENT` |
| تلگرام | `TELEGRAM_ENABLED`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_SUPPORT_LINK` |
| واتساپ | `WHATSAPP_ENABLED`, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TEMPLATE_NAME`, `WHATSAPP_TEMPLATE_LANGUAGE`, `WHATSAPP_DEFAULT_RECIPIENT`, `WHATSAPP_SUPPORT_NUMBER`, `WHATSAPP_SUPPORT_LINK` |
| بله | `BALE_ENABLED`, `BALE_BOT_TOKEN`, `BALE_CHAT_ID`, `BALE_BOT_USERNAME`, `BALE_SUPPORT_LINK` |
| چت پشتیبانی | `SUPPORT_CHAT_ENABLED`, `SUPPORT_POLL_SECONDS` (پیش‌فرض ۵), `SUPPORT_WEBHOOK_SECRET` |
| فرانت | `VITE_API_URL` (پیش‌فرض کد: `http://127.0.0.1:8000/api/v1`) |

> **آدرس API در فرانت:** `frontend/src/utils/apiOrigin.ts` مقدار `VITE_API_URL` را
> می‌خواند و اگر صفحه با IP شبکهٔ محلی باز شده باشد، به‌طور خودکار نام میزبان
> را با میزبان صفحه هم‌تراز می‌کند. برای تست روی موبایل نیازی به تغییر `.env` نیست.

### دستورات پرکاربرد

| دستور | محل | کار |
|---|---|---|
| `npm run dev` | `frontend` | سرور توسعهٔ Vite (پورت ۵۱۷۳، روی شبکه هم باز) |
| `npm run build` | `frontend` | `vite build` + تولید sitemap در `dist/` |
| `npm run typecheck` | `frontend` | `tsc --noEmit` |
| `npm run preview` | `frontend` | پیش‌نمایش build روی ۴۱۷۳ |
| `npm run sitemap` | `frontend` | فقط تولید sitemap |
| `npm run icons` | `frontend` | تولید آیکون‌های PWA |
| `php artisan test` | `backend` | اجرای ۳۸۲ تست PHPUnit |
| `php artisan migrate` | `backend` | اجرای مایگریشن‌ها |
| `php artisan db:seed` | `backend` | اجرای سیدرها |
| `php artisan storage:link` | `backend` | لینک عمومی storage |
| `php artisan cache:clear` | `backend` | پاک‌سازی کش (بعد از تغییر محتوا در برخی بخش‌ها لازم است) |
| `php artisan schedule:run` | `backend` | اجرای زمان‌بندی (کرون: هر دقیقه) |
| `php artisan queue:work` | `backend` | پردازش صف (در صورت فعال بودن صف پیام‌ها) |
| `php artisan birthday:greetings [--date=YYYY-MM-DD] [--force] [--dry-run]` | `backend` | اجرای دستی/آزمایشی تبریک تولد |
| `php artisan orders:release-abandoned [--minutes=60] [--limit=200] [--dry-run]` | `backend` | لغو دستی سفارش‌های پرداخت‌نشدهٔ قدیمی و آزادسازی موجودی |
| `php artisan catalog:hide-legacy [--restore]` | `backend` | مخفی/بازگردانی کاتالوگ قدیمی |
| `php artisan pages:legal [--force]` | `backend` | ساخت صفحات رسمی/اعتماد (درباره ما، تماس، قوانین، حریم خصوصی، مرجوعی)؛ `--force` متن پیش‌فرض را بازنویسی می‌کند |
| `php artisan route:list` | `backend` | فهرست کامل ۲۴۹ مسیر |

### پیشنهاد تنظیمات production

```bash
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
# کرون هر دقیقه:
* * * * * cd /path/to/backend && php artisan schedule:run >> /dev/null 2>&1
```

- `PAYMENT_MODE` و `PAYMENT_DEMO_ENABLED` در production نادیده گرفته می‌شوند و
  پرداخت همیشه `disabled` است (`config/payment.php`).
- `COD_MAX_TOTAL` سقف مبلغ سفارش «پرداخت در محل» است؛ خالی/۰ یعنی بدون سقف.
  همین عدد در `GET /store-settings` هم برگردانده می‌شود و چک‌اوت گزینهٔ COD را
  برای مبالغ بیشتر غیرفعال می‌کند (اعتبارسنجی نهایی سمت سرور).
- `CORS_ALLOWED_ORIGINS` باید دامنهٔ واقعی فرانت را داشته باشد.
- `APP_DEBUG=false` و `APP_ENV=production` الزامی است.

---

## ۶) احراز هویت و مجوزها

### مدل احراز هویت

- تنها روش ورود: `POST /api/v1/auth/register` و `POST /api/v1/auth/login`
  (ایمیل + رمز). خروجی: `{ message, user, token }`.
- توکن‌ها از نوع **Sanctum Personal Access Token** با نام `behrang-shop` هستند و
  فرانت آن را در هدر `Authorization: Bearer <token>` می‌فرستد.
- `sanctum.expiration = null` است؛ یعنی توکن‌ها **منقضی نمی‌شوند** تا زمانی که
  کاربر خارج شود یا رمزش را عوض کند (تغییر رمز همهٔ توکن‌ها را حذف می‌کند).
- ورود ادمین از همان endpoint انجام می‌شود؛ تفاوت در `role = admin` کاربر است.
  فرانت توکن ادمین را جداگانه در `behrang-shop-admin-token` نگه می‌دارد تا
  نشست مشتری و مدیر با هم قاطی نشود (`services/api.ts`).
- پاسخ `user` شامل `admin_role`، `admin_role_label` و آرایهٔ `permissions` است
  (منبع نهایی مجوز همیشه پاسخ سرور است).
- `POST /auth/logout` فقط توکن جاری را حذف می‌کند.
- **بازیابی رمز عبور:** `POST /auth/forgot-password` توکن یک‌بارمصرف می‌سازد و
  با نوتیفیکیشن فارسی `App\Notifications\ResetPasswordNotification` لینک را به
  ایمیل می‌فرستد؛ `POST /auth/reset-password` رمز جدید را ثبت و همهٔ توکن‌های
  قبلی را حذف می‌کند. توکن‌ها در `password_reset_tokens` هستند و انقضای
  پیش‌فرض ۶۰ دقیقه است. پاسخ forgot برای ایمیل موجود و ناموجود یکسان است تا
  شمارش حساب ممکن نباشد. لینک ایمیل از `FRONTEND_URL` ساخته می‌شود.
- شمارهٔ موبایل با `App\Services\Messaging\Support\PhoneNumber` نرمال می‌شود و
  الگوی اعتبارسنجی آن `^09\d{9}$` است.

### میدلویرها

| نام | کلاس | کار |
|---|---|---|
| `auth:sanctum` | Sanctum | کاربر لاگین‌شده را الزام می‌کند؛ در `api/*` پاسخ 401 JSON است |
| `admin` | `AdminMiddleware` | نقش `admin` را الزام می‌کند (403 در غیر این صورت) |
| `admin.permission:<key>` | `EnsureAdminPermission` | مجوز صفحه‌ای مشخص را الزام می‌کند |

ثبت aliasها در `backend/bootstrap/app.php` انجام شده است. **محدودیت نرخ
سراسری روی گروه `api` وجود ندارد** (`throttleApi()` صدا زده نشده است)، اما
دو limiter اختصاصی در `AppServiceProvider::boot()` تعریف و روی مسیرهای حساس
اعمال می‌شود:

| limiter | مسیرها | سقف |
|---|---|---|
| `auth` | `POST /auth/register`، `POST /auth/login`، `POST /auth/forgot-password`، `POST /auth/reset-password` | ۱۵ درخواست در دقیقه به ازای هر IP |
| `orders` | `POST /orders` | ۲۰ درخواست در دقیقه به ازای هر کاربر (یا IP برای مهمان) |
| `throttle:10,1` | `POST /orders/track` و `POST /orders/recover` | ۱۰ درخواست در دقیقه به ازای هر IP |

پاسخ هر دو limiter، `429` با پیام فارسی و `success: false` است
(`AppServiceProvider::configureRateLimiters`). جدای از آن،
`AuthController::login` تلاش‌های **ناموفق** را برای هر ترکیب ایمیل + IP
می‌شمارد: پنج تلاش ناموفق، پنجرهٔ ۱۵ دقیقه‌ای می‌سازد و پاسخ‌ها `429` با
`retry_after` می‌شوند؛ ورود موفق شمارنده را صفر می‌کند (تست:
`tests/Feature/LoginThrottleTest.php`). مسیرهای پشتیبانی throttle صریح خود را
دارند: `throttle:20,1` (ایجاد/بستن گفتگو)، `throttle:60,1` (ارسال پیام) و
`throttle:120,1` (خواندن گفتگو). CAPTCHA هنوز وجود ندارد (بدهی فنی ۱۳).

### نقش‌ها و مجوزها

نقش‌ها و ماتریس مجوز در `backend/app/Support/AdminRole.php` و آینهٔ فرانت در
`frontend/src/utils/adminPermissions.ts` تعریف شده‌اند. **این دو باید همیشه
هم‌خوان بمانند.**

| مجوز | مدیر ارشد | مدیر محصولات | مدیر سفارش‌ها | پشتیبانی |
|---|:---:|:---:|:---:|:---:|
| `dashboard.view` | ✅ | ✅ | ✅ | ✅ |
| `products.manage` | ✅ | ✅ | — | — |
| `categories.manage` | ✅ | ✅ | — | — |
| `brands.manage` | ✅ | ✅ | — | — |
| `banners.manage` | ✅ | ✅ | — | — |
| `articles.manage` | ✅ | ✅ | — | — |
| `pages.manage` | ✅ | ✅ | — | — |
| `reviews.manage` | ✅ | ✅ | — | — |
| `orders.manage` | ✅ | — | ✅ | ✅ |
| `returns.manage` | ✅ | — | ✅ | ✅ |
| `coupons.manage` | ✅ | — | ✅ | — |
| `customers.manage` | ✅ | — | ✅ | ✅ |
| `messaging.manage` | ✅ | — | — | ✅ |
| `accounting.manage` | ✅ | — | ✅ | — |
| `reports.view` | ✅ | — | ✅ | — |
| `settings.manage` | ✅ | — | — | — |
| `admins.manage` | ✅ | — | — | — |

نکات مهم:

- نقش خالی (`admin_role = null`) برای مدیران قدیمی به‌معنای **مدیر ارشد** است.
- در پنل، بخش‌های «نوار اطلاع‌رسانی»، «استوری‌ها» و «پاپ‌آپ‌ها» با مجوز
  `banners.manage` و بخش‌های «هدر و فوتر» و «نمادها و مجوزها» با
  `settings.manage` محافظت می‌شوند (طبق `App.tsx`).
- صفحهٔ `/admin/login` عمومی است؛ بقیهٔ `/admin/*` پشت `AdminRoute` +
  `AdminPermissionGuard` هستند. مسیر ناشناختهٔ `/admin/*` به `/admin` هدایت می‌شود.

### مدل تهدید و نکات امنیتی

- توکن‌ها بدون انقضا در `localStorage` ذخیره می‌شوند → ریسک XSS به‌طور کامل
  پوشش داده نمی‌شود (هیچ CSP مشخصی در فرانت تعریف نشده است).
- ثبت‌نام/ورود **rate limit (۱۵ درخواست در دقیقه per IP) و قفل حساب (۵ تلاش
  ناموفق در ۱۵ دقیقه) دارند**، ولی CAPTCHA ندارند. ستون `email_verified_at` وجود
  دارد ولی در ثبت‌نام هرگز پر نمی‌شود و هیچ مسیر/میدلویری آن را الزام نمی‌کند
  (تأیید ایمیل عملاً وجود ندارد).
- وب‌هوک پیام‌رسان‌ها با `SUPPORT_WEBHOOK_SECRET` در مسیر محافظت می‌شود؛
  اگر این مقدار خالی باشد دریافت پیام غیرفعال است.
- تمام پاسخ‌های خطای احراز هویت در `api/*` به‌صورت JSON برمی‌گردند
  (`shouldRenderJsonWhen` در `bootstrap/app.php`).

---

## ۷) مدل داده

۶۷ مایگریشن و ۴۲ مدل. جدول‌ها را می‌توان به شش حوزه تقسیم کرد.

### ۷.۱ کاتالوگ و محصول

| جدول | نکات کلیدی |
|---|---|
| `categories` | درختی (`parent_id`)، `slug`، `is_active`، `sort_order` |
| `brands` | `slug`، `is_active`، `sort_order` |
| `products` | `category_id` (الزامی، `restrictOnDelete`)، `brand_id` (nullable)، `name`، `slug`، `sku`، `price`، `compare_price`، `discount_percent`، `stock`، `weight`، `thumbnail`، `is_active/is_featured/is_new`، `views_count`، `sales_count`، `is_taxable`، `cost_price`، `is_returnable`، `meta_title/meta_description` |
| `product_images` | چند تصویر برای هر محصول + تصویر اصلی |
| `product_variants` | تنوع‌ها؛ فیلد `size` برای فیلتر سایز و `is_active` |
| `product_colors` | پالت رنگ محصول، `is_active`، `sort_order` |
| `product_pack_items` | اقلام «پک» (چند‌تایی) با رنگ‌های انتخابی |
| `product_reviews` | امتیاز، متن، `status` (تأییدشده/در انتظار)، پاسخ مدیر |
| `product_size_guides` | راهنمای سایز اختصاصی هر محصول (`is_enabled` + محتوا) |
| `wishlist_items` | علاقه‌مندی کاربران (یکتا به‌ازای user+product) |

**قاعدهٔ قیمت مؤثر:** `price - ROUND(price * discount_percent / 100, 0)`.
همین عبارت در فیلتر قیمت، مرتب‌سازی و کارت محصول استفاده می‌شود
(`ProductController::EFFECTIVE_PRICE_SQL`).

### ۷.۲ فروش و سفارش

| جدول | نکات کلیدی |
|---|---|
| `orders` | `user_id` (**nullable** برای سفارش مهمان)، `guest_token` (UUID مرورگر مهمان + یکتایی با `idempotency_key`)، `guest_access_code` (کد پیگیری ۸ کاراکتری یکتا برای بازیابی دسترسی مهمان؛ در پاسخ‌های عادی مخفی است)، `order_number` یکتا، `subtotal/shipping_cost/discount/total`، `status`، `payment_status`، `payment_method` (`online`/`cod`)، `paid_at`، اطلاعات گیرنده، `notes`، فیلدهای مالیات، `stock_restored_at`، `idempotency_key`، `sales_channel` (پیش‌فرض `other`)، فیلدهای کد تخفیف و حمل‌ونقل |
| `order_items` | محصول، تنوع، رنگ، تعداد، قیمت واحد، `cost_price`، اطلاعات پک |
| `coupons` | `code` یکتا، `type` (`percent`/`fixed`)، `value`، `min_order_total`، `max_discount`، `usage_limit`/`used_count`، `starts_at`/`expires_at`، `is_active` |
| `return_requests` | درخواست مرجوعی با وضعیت و دلیل |
| `addresses` | دفترچهٔ آدرس کاربر + پرچم پیش‌فرض |
| `shipping_methods` | روش‌های ارسال (پست/پیک/…) + فعال/غیرفعال |
| `shipping_zones` | استان/شهر/منطقه + هزینهٔ اختصاصی + امکان ارسال اکسپرس |
| `shipping_rules` | `type`: `fixed` / `free_over_amount` / `weight_based` / `zone_based`، `threshold_amount`، `amount`، `cost_per_kg`، `priority` |
| `shipments` / `shipment_events` | مرسوله و تاریخچهٔ رهگیری/رویدادها |

**وضعیت‌های سفارش** (`App\Support\OrderStatus`):
`pending` (در انتظار پرداخت) → `processing` → `shipped` → `delivered` و `cancelled`.
`payment_status` حداقل `unpaid` و `paid` را دارد. وضعیت‌های قابل اعلان:
`processing`، `shipped`، `delivered`، `cancelled`.

**روش پرداخت** (`App\Support\PaymentMethod`): `online` (درگاه/demo) و `cod`
(پرداخت در محل). سفارش COD بدون انتظار برای درگاه ساخته می‌شود و از ابتدا
`processing/unpaid` است تا موجودی آزاد نشود؛ `paid_at` زمان ثبت پرداخت را
نگه می‌دارد.

### ۷.۳ محتوا و ظاهر فروشگاه

| جدول | نکات کلیدی |
|---|---|
| `banners` | بنر/اسلایدر + تصویر موبایل + لایه‌های متنی |
| `banner_sections` | موقعیت/چیدمان اسلایدر، تنظیمات اندازه، گردی گوشه، انیمیشن |
| `banner_fonts` | فونت‌های آپلودی برای لایه‌های متنی بنر |
| `announcement_bar_items` | آیتم‌های نوار بالای هدر (متن/تصویر/ویدیو) + تنظیمات نمایش |
| `articles` | مقاله با `slug`، خلاصه، محتوا، کاور، دسته، نویسنده، `is_published` + `published_at`، زمان مطالعه |
| `pages` | صفحات ثابت (درباره ما، قوانین، …) با `slug` و وضعیت انتشار |
| `stories` | استوری‌های صفحهٔ اول + تصویر و لینک |
| `popups` | کمپین پاپ‌آپ: محتوا (عنوان/توضیح/تصویر/CTA/کد تخفیف)، ظاهر (`theme`, `layout`, `image_position`)، هدف‌گیری (`display_pages`, `devices`)، زمان‌بندی (`starts_at`, `ends_at`, `countdown_to`)، قواعد نمایش (`delay_seconds`, `auto_close_seconds`, `frequency`, `close_on_backdrop`, `show_close`)، `is_active`, `sort_order` |
| `trust_badges` | نمادها و مجوزها (اینماد، ساماندهی، …) برای فوتر |
| `store_settings` | تنظیمات کلید/مقدار فروشگاه (تماس، مالیات، ارسال، هدر/فوتر، صفحهٔ ارسال، …) — `StoreSetting::DEFAULTS` منبع پیش‌فرض‌هاست |

**مقادیر مجاز پاپ‌آپ** (`App\Models\Popup`):
صفحه‌ها `home|products|product|cart|checkout`؛ تم `light|dark|brand`؛
چیدمان `center|bottom|corner`؛ تصویر `top|side`؛ دستگاه `all|desktop|mobile`؛
تکرار `always|session|daily|weekly|once`.

### ۷.۴ پیام‌رسانی و پشتیبانی

| جدول | نکات کلیدی |
|---|---|
| `outbound_messages` | تاریخچهٔ پیام‌های ارسالی (کانال، گیرنده، وضعیت، خطا) |
| `messaging_contacts` | مخاطبان پیام‌رسانی + گروه/برچسب، ایمپورت گروهی |
| `support_conversations` / `support_messages` | گفتگوی چت پشتیبانی با توکن مهمان، وضعیت باز/بسته، کانال |
| `birthday_greetings` | ثبت تبریک‌های تولد ارسال‌شده (برای جلوگیری از ارسال تکراری) |

### ۷.۵ حسابداری و انبار

| جدول | نکات کلیدی |
|---|---|
| `suppliers` | تأمین‌کنندگان |
| `purchase_invoices` / `purchase_invoice_items` | فاکتور خرید + اقلام + وضعیت پرداخت |
| `expenses` | هزینه‌ها |
| `cheques` | چک‌ها + وضعیت (دریافت/خرج/برگشتی) |

### ۷.۶ پلتفرم

| جدول | نکات کلیدی |
|---|---|
| `users` | `role` (`customer`/`admin`)، `admin_role`، `phone`، `birth_date`، `birthday_greeting_opt_out` |
| `personal_access_tokens` | توکن‌های Sanctum |
| `password_reset_tokens` | توکن‌های هش‌شدهٔ بازیابی رمز عبور (یک‌بارمصرف، انقضای ۶۰ دقیقه) |
| `admin_notifications` | اعلان‌های درون‌پنل (سفارش جدید، …) |
| `cache`, `jobs`, `sessions` | زیرساخت Laravel (کش دیتابیسی، صف، نشست) |

---

## ۸) API

- **پیشوند:** `/api/v1` (در `routes/api.php` با `Route::prefix('v1')`).
- **سلامت:** `GET /up` (خارج از پیشوند API).
- **فرمت:** JSON؛ هدر `Accept: application/json` از فرانت همیشه ارسال می‌شود.
- **CORS:** فقط دامنه‌های `CORS_ALLOWED_ORIGINS`؛ کوکی/credentials پشتیبانی نمی‌شود.

### ۸.۱ قراردادهای پاسخ

قالب پاسخ کاملاً یکدست نیست و فرانت هر دو حالت را نرمال می‌کند:

| حالت | نمونه |
|---|---|
| موفق با پیام | `{ "success": true, "message": "...", "data": {...} }` |
| موفق بدون پیام | `{ "success": true, "data": [...] }` یا فقط `{ "data": [...] }` |
| خطای اعتبارسنجی | `422` + `{ "message": "...", "errors": { "field": ["..."] } }` |
| خطای احراز هویت | `401` + `{ "message": "Unauthenticated." }` |
| نبود مجوز | `403` + پیام فارسی |
| پیدا نشدن | `404` |
| محدودیت نرخ | `429` |

- پیام‌های خطا **فارسی** هستند و فرانت معمولاً همان را نمایش می‌دهد.
- فهرست محصولات صفحه‌بندی دارد: `per_page` پیش‌فرض **۱۲** و حداکثر **۴۸**.
- عملیات تغییردهندهٔ محتوا معمولاً `{ success, message, data }` برمی‌گرداند؛
  بعضی اکشن‌های ساده فقط `success/message`.

### ۸.۲ مسیرهای عمومی (فروشگاه)

| متد و مسیر | کار |
|---|---|
| `POST /auth/register`, `POST /auth/login` | ثبت‌نام / ورود (خروجی: user + token) |
| `POST /auth/forgot-password`, `POST /auth/reset-password` | بازیابی رمز عبور با توکن ایمیل (پاسخ forgot همیشه عمومی است) |
| `POST /orders` | ثبت سفارش کاربر یا مهمان — مهمان باید `X-Guest-Token` بفرستد و فقط `cod` مجاز است |
| `POST /orders/track` | رهگیری عمومی سفارش با «شماره سفارش + شماره تماس» |
| `POST /orders/recover` | بازیابی دسترسی مهمان در مرورگر جدید با «شماره سفارش + کد پیگیری»؛ شناسهٔ مرورگر قبلی برمی‌گردد |
| `GET /orders/{orderNumber}`, `POST /orders/{orderNumber}/cancel` | جزئیات/فاکتور و لغو سفارش برای صاحب سفارش: کاربر (Bearer) یا مهمان (`X-Guest-Token`)؛ بدون هویت `401` |
| `GET /products` | فهرست محصولات با فیلتر و صفحه‌بندی |
| `GET /products/featured` | محصولات ویژه |
| `GET /products/newest` | جدیدترین محصولات |
| `GET /products/filters` | گزینه‌ها و شمار هر فست (دسته/برند/سایز/بازهٔ قیمت) |
| `GET /products/{slug}` | جزئیات محصول + افزایش `views_count` |
| `GET /products/{slug}/reviews` | نظرات تأییدشده |
| `POST /products/{slug}/reviews` | ثبت نظر (نیازمند ورود) |
| `GET /categories`, `GET /categories/{slug}` | دسته‌بندی‌ها (درختی) |
| `GET /brands`, `GET /brands/{slug}` | برندها |
| `GET /banners` | بنرهای فعال + تنظیمات بخش‌ها |
| `GET /banner-fonts`, `GET /banner-fonts/{id}/file` | فونت‌های بنر و فایل فونت |
| `GET /announcement-bar` | آیتم‌های نوار اطلاع‌رسانی |
| `GET /stories` | استوری‌های صفحهٔ اول |
| `GET /popups` | پاپ‌آپ‌های فعالِ داخل بازهٔ زمانی |
| `GET /articles`, `GET /articles/{slug}` | مقالات منتشرشده |
| `GET /pages`, `GET /pages/{slug}` | صفحات ثابت |
| `GET /trust-badges` | نشان‌های اعتماد |
| `GET /header-footer` | متن/لینک‌های هدر و فوتر |
| `GET /store-settings`, `GET /store-settings/tax` | تنظیمات عمومی و مالیات (شامل `cod_max_total`) |
| `GET /shipping-info` | محتوای صفحهٔ روش‌های ارسال |
| `POST /coupons/check` | اعتبارسنجی کد تخفیف (برای مهمان، فیلد اختیاری `phone` مبنای سقف شخصی است) |
| `GET /support/config` | تنظیمات ویجت چت |
| `POST /support/conversations` | شروع گفتگو (توکن مهمان) |
| `GET /support/conversations/{token}` | خواندن گفتگو |
| `POST /support/conversations/{token}/messages` | ارسال پیام |
| `POST /support/conversations/{token}/close` | بستن گفتگو |
| `GET /support/webhooks/{secret}/whatsapp` | تأیید webhook واتساپ |
| `POST /support/webhooks/{secret}/{channel}` | دریافت پیام از `telegram` / `bale` / `whatsapp` |

**پارامترهای `GET /products`** (از `ProductController`):

| پارامتر | توضیح |
|---|---|
| `search` | جست‌وجو در نام، SKU و توضیح کوتاه با نرمال‌سازی فارسی (ی/ك/نیم‌فاصله) |
| `category` | اسلاگ دسته؛ دستهٔ والد زیردسته‌ها را هم شامل می‌شود |
| `brand` | یک یا چند اسلاگ با کاما: `brand=a,b` |
| `size` | یک یا چند سایز با کاما (نرمال‌سازی می‌شود) |
| `min_price`, `max_price` | روی قیمت **پس از تخفیف** |
| `in_stock` | فقط موجود |
| `discount_only` | فقط تخفیف‌دار |
| `featured` | فقط ویژه |
| `new` یا `is_new` | فقط جدید |
| `sort` | `latest` (پیش‌فرض) / `price_asc` / `price_desc` / `popular` / `discount` |
| `per_page`, `page` | صفحه‌بندی (۱۲ پیش‌فرض، ۴۸ حداکثر) |

**مسیرهای نیازمند ورود (فروشگاه):**

| متد و مسیر | کار |
|---|---|
| `GET /auth/me`, `PUT /auth/profile`, `PUT /auth/password`, `POST /auth/logout` | حساب کاربر |
| `GET/POST /addresses`، `PUT/DELETE /addresses/{id}`، `PATCH /addresses/{id}/default` | دفترچهٔ آدرس |
| `GET/POST /wishlist`، `DELETE /wishlist/{product}` | علاقه‌مندی |
| `GET /orders` | فهرست سفارش‌های حساب کاربر (مشاهده/لغو تک‌سفارش برای مهمان هم باز است) |
| `POST /orders/{orderNumber}/pay` | پرداخت آزمایشی (local) — برای سفارش COD `422` |
| `DELETE /orders/{orderNumber}` | حذف سفارش لغوشده توسط صاحب حساب |
| `POST /orders/{orderNumber}/returns`, `GET /returns` | مرجوعی |

### ۸.۳ مسیرهای پنل مدیریت (`/api/v1/admin/*`)

همه پشت `auth:sanctum` + `admin` هستند و هر گروه علاوه بر آن
`admin.permission:<key>` مخصوص خود را دارد.

| گروه | تعداد مسیر | کنترلر | نمونهٔ کار |
|---|:--:|---|---|
| `dashboard` | ۲ | `AdminController` | آمار کلی + روند فروش |
| `products` | ۱۳ | `AdminProductController`, `AdminProductImageController`, `AdminProductImportController` | CRUD، تصاویر/ترتیب/اصلی، تغییر وضعیت، ایمپورت گروهی و دانلود قالب |
| `categories` | ۶ | `AdminCategoryController` | CRUD + وضعیت |
| `brands` | ۶ | `AdminBrandController` | CRUD + وضعیت |
| `orders` | ۵ | `AdminOrderController` | فهرست/جزئیات، تغییر وضعیت، اطلاعات ارسال، ثبت دریافت وجه COD |
| `returns` | ۲ | `AdminReturnRequestController` | فهرست + تغییر وضعیت |
| `coupons` | ۵ | `AdminCouponController` | CRUD + وضعیت |
| `customers` | ۴ | `AdminCustomerController` | فهرست/جزئیات/ساخت/حذف |
| `wishlist` | ۴ | `AdminWishlistController` | آمار علاقه‌مندی و مشتریان |
| `reviews` | ۳ | `AdminProductReviewController` | فهرست، تأیید/رد، پاسخ |
| `banners` | ۷ + ۱ (`banner-appearance`) | `AdminBannerController` | CRUD بنر، آپلود تصویر، ترتیب، وضعیت، ظاهر کلی |
| `banner-sections` | ۲ | `AdminBannerSectionController` | خواندن/به‌روزرسانی چیدمان هر موقعیت |
| `banner-fonts` | ۴ | `AdminBannerFontController` | فهرست/آپلود/حذف/وضعیت فونت |
| `announcement-bar` | ۷ | `AdminAnnouncementBarController` | آیتم‌ها + رسانه + تنظیمات |
| `stories` | ۶ | `AdminStoryController` | CRUD + آپلود تصویر + وضعیت |
| `popups` | ۶ | `AdminPopupController` | CRUD + آپلود تصویر + وضعیت |
| `pages` | ۶ | `AdminPageController` | CRUD + وضعیت |
| `articles` | ۷ | `AdminArticleController` | CRUD + کاور + وضعیت |
| `trust-badges` | ۶ | `AdminTrustBadgeController` | CRUD + تصویر + وضعیت |
| `header-footer` | ۲ | `HeaderFooterController` | خواندن/ذخیرهٔ تنظیمات |
| `settings` | ۲ | `AdminStoreSettingController` | خواندن/ذخیرهٔ `store_settings` |
| `shipping` | ۲۷ | `AdminShippingController` | روش‌ها، مناطق، قوانین، مرسوله‌ها، استعلام هزینه، صفحهٔ ارسال، تاریخچه |
| `accounting` | ۲۲ | `AdminAccountingController`, `AdminSupplierController`, `AdminPurchaseInvoiceController`, `AdminExpenseController`, `AdminChequeController` | نمای کلی، گزارش، تأمین‌کننده، فاکتور خرید، هزینه، چک |
| `messaging` | ۱۷ | `AdminMessagingController`, `AdminMessagingContactController` | ارسال پیام، تنظیمات، قالب وضعیت سفارش، تبریک تولد، مخاطبان/گروه‌ها/ایمپورت |
| `support` | ۵ | `AdminSupportController` | گفتگوها، پاسخ، تغییر وضعیت، آمار |
| `notifications` | ۳ | `AdminNotificationController` | فهرست، خواندن یکی/همه |
| `admins` | ۴ | `AdminUserController` | مدیریت مدیران و نقش‌ها (نیازمند `admins.manage`) |
| `reports` | ۱ | `AdminReportController` | گزارش فروش |

> فهرست دقیق و کامل مسیرها با `php artisan route:list` یا فایل
> `routes/api.php` قابل مشاهده است. در این سند فقط گروه‌بندی و مسئولیت‌ها آمده
> تا حجم سند برای ارسال به هوش مصنوعی معقول بماند.

### ۸.۴ نکات مهم API

- **ایمپورت محصول:** `GET /admin/products/import/template` قالب CSV/Excel
  می‌دهد و `POST /admin/products/import` فایل را می‌خواند
  (`app/Support/Spreadsheet/`).
- **آپلود تصویر:** هر بخش endpoint جدا دارد (`/banners/image`، `/popups/image`،
  `/stories/image`، `/articles/cover`، `/trust-badges/image`،
  `/products/{id}/images`، `/products/size-guide-image`). فایل‌ها در دیسک
  `public` ذخیره و از `/storage/...` سرو می‌شوند.
- **سفارش:** هدر `Idempotency-Key` با UUID **الزامی** است؛ درخواست تکراری همان
  سفارش قبلی را برمی‌گرداند. تکرار دقیق یک ترکیب (محصول + تنوع + رنگ + پک) در
  دو ردیف، `422` می‌دهد.
- **پرداخت:** `POST /orders/{orderNumber}/pay` فقط وقتی
  `config('payment.mode') === 'demo'` و `APP_ENV !== production` باشد کار می‌کند؛
  در غیر این صورت `403`.
- **فست فیلتر:** `GET /products/filters` پاسخ را ۶۰ ثانیه در کش دیتابیسی
  نگه می‌دارد (کلید بر اساس query string). فرانت هم ۲ دقیقه کش حافظه‌ای +
  ادغام درخواست‌های هم‌زمان دارد (`services/productFilters.ts`).

---

## ۹) قواعد دامنه (منطق کسب‌وکار)

### ۹.۱ سفارش، پرداخت، موجودی

- **ثبت سفارش برای مهمان هم باز است.** اگر توکن Sanctum باشد سفارش به حساب
  وصل می‌شود؛ در غیر این صورت هدر `X-Guest-Token` (UUID پایدار مرورگر) الزامی
  است و سفارش فقط با `payment_method = cod` پذیرفته می‌شود (`online` → `422`).
  برای کاربر Idempotency با `(user_id, idempotency_key)` و برای مهمان با
  `(guest_token, idempotency_key)` سنجیده می‌شود. چک‌اوت مهمان در فرانت، روش
  «پرداخت در محل» را قفل می‌کند و پس از ثبت به صفحهٔ رهگیری می‌رود.
- **دسترسی مهمان به سفارش خودش:** همان `X-Guest-Token` برای
  `GET /orders/{orderNumber}` (جزئیات و فاکتور) و
  `POST /orders/{orderNumber}/cancel` هم معتبر است (`OrderController@show/cancel`
  با `findOwnedOrder`). مالکیت با `guest_token` سنجیده می‌شود و بدون هویت پاسخ
  `401` است؛ لغو مهمان فقط برای سفارش `unpaid` و ارسال‌نشده مجاز است و موجودی
  از همان `OrderStockService` برمی‌گردد. مرجوعی و پرداخت آنلاین هنوز فقط برای
  حساب کاربر است.
- هدر `Idempotency-Key` (UUID) الزامی است. اگر همان هویت (کاربر یا مرورگر مهمان)
  با همان کلید قبلاً سفارش داده باشد، پاسخ **همان سفارش** برمی‌گردد (نه سفارش جدید).
- هر ردیف سفارش: `product_id`، `variant_id` (اختیاری)، `quantity`،
  `color_name` (اختیاری) و `pack_colors` (حداکثر ۱۲ رنگ).
- تکرار دقیق یک ترکیب (محصول + تنوع + رنگ + پک) در دو ردیف → خطای `422`.
- در تراکنش ثبت سفارش، موجودی **کم می‌شود**: اگر تنوع انتخاب شده باشد از
  `product_variants.stock`، وگرنه از `products.stock`
  (`OrderController` خطوط ~۳۱۵–۳۲۰).
- با لغو سفارش، موجودی **برمی‌گردد** و `stock_restored_at` ثبت می‌شود تا
  بازگردانی دوباره تکرار نشود. این منطق فقط در
  `App\Services\Orders\OrderStockService` است و هم مسیر لغو مشتری
  (`POST /orders/{orderNumber}/cancel`) و هم کامند زیر از آن استفاده می‌کنند.
- با لغو/بازپرداخت/آزادسازی سفارش رهاشده، سهمیهٔ کوپن هم برگردانده می‌شود:
  `App\Services\Orders\OrderCouponService::release()` در همان تراکنش
  `used_count` را یک واحد کم می‌کند (با شرط مثبت‌بودن، تا منفی نشود).
- **آزادسازی خودکار:** کامند `orders:release-abandoned` هر ۱۰ دقیقه سفارش‌های
  `pending/unpaid` با `stock_restored_at = null` که از مهلت (پیش‌فرض ۶۰ دقیقه)
  قدیمی‌ترند را `cancelled` می‌کند و موجودی را آزاد می‌کند. اگر مهلت وسط پرداخت
  تمام شود سفارش لغو می‌شود؛ پس `--minutes` باید از حداکثر زمان اقامت در درگاه
  بیشتر باشد. مهلت در `routes/console.php` قابل تغییر است
  (تست: `tests/Feature/OrderAbandonedReleaseTest.php`). سفارش‌های
  `payment_method = cod` صریحاً از این کامند مستثنا هستند.
- مبالغ سفارش: `subtotal` از اقلام، `discount` از کد تخفیف، `shipping_cost`
  از قواعد ارسال، مالیات بر اساس تنظیمات فروشگاه و `is_taxable` محصول، و
  `total` نهایی — همه در سمت سرور محاسبه می‌شوند (قیمت فرانت اعتماد نمی‌شود).
- **پرداخت آنلاین:** فقط آزمایشی. با `POST /orders/{orderNumber}/pay` وضعیت به
  `payment_status = paid`، `paid_at = now` و `status = processing` تغییر می‌کند.
  در production این مسیر همیشه `403` می‌دهد.
- **رهگیری عمومی:** `POST /orders/track` با «شماره سفارش + شماره تماس» وضعیت،
  اقلام، مبالغ، اطلاعات مرسوله و رویدادهای آن را برمی‌گرداند. شماره تماس در پاسخ
  ماسک می‌شود (`0912***0000`) و این مسیر هیچ تغییری روی سفارش نمی‌دهد
  (throttle: ۱۰ درخواست در دقیقه به ازای IP).
- **کد پیگیری مهمان:** سفارش مهمان کد ۸ کاراکتری یکتا
  (`guest_access_code`، بدون کاراکترهای مبهم I/O/0/1) می‌گیرد که فقط در پاسخ
  ثبت سفارش (و تکرار Idempotency) برگردانده می‌شود و در جزئیات/فاکتور/پنل
  مخفی است (`$hidden` در مدل). با `POST /orders/recover` و
  «شماره سفارش + کد پیگیری» (throttle ۱۰ در دقیقه به ازای IP، مقایسهٔ
  `hash_equals`، پاسخ یکسان برای هر خطا) همان شناسهٔ مرورگر قبلی برگردانده
  می‌شود تا فاکتور و لغو سفارش در مرورگر جدید هم کار کند. سفارش کاربر
  ثبت‌شده کد ندارد و سفارش‌های مهمانِ پیش از مایگریشن این ستون قابل بازیابی
  نیستند (تست: `tests/Feature/GuestOrderRecoveryTest.php`).
- **پرداخت در محل (COD):** سفارش با `payment_method = cod` مستقیماً با
  `status = processing` و `payment_status = unpaid` ساخته می‌شود؛ `pay()` برای
  آن `422` می‌دهد. ادمین می‌تواند بدون تسویه اولیه وضعیت را تا `delivered`
  ببرد و بعد از دریافت وجه با `PATCH /admin/orders/{orderNumber}/payment`
  (`payment_status = paid`) آن را تسویه کند؛ بازگشت به `unpaid` هم برای اصلاح
  خطا مجاز است. تغییر دستی پرداخت سفارش آنلاین `422` می‌گیرد تا آمار فروش
  دستکاری‌نشدنی بماند.
- **سقف مبلغ COD:** `config('payment.cod_max_total')` (از `COD_MAX_TOTAL`)
  بیشترین مبلغ مجاز سفارش پرداخت در محل است؛ ۰ یعنی بدون سقف. بررسی بعد از
  محاسبهٔ نهایی `total` و داخل تراکنش ثبت سفارش انجام می‌شود، پس با رد شدن،
  موجودی و `used_count` کوپن هم برمی‌گردند. همین عدد در `GET /store-settings`
  برگردانده می‌شود و چک‌اوت گزینهٔ COD را غیرفعال و علت را نشان می‌دهد.
- `sales_channel` پیش‌فرض `other` است (برای تفکیک کانال فروش).

> ⚠️ **نکتهٔ مهم برای بازبین:** `products.sales_count` با ثبت سفارش به‌طور
> خودکار زیاد نمی‌شود؛ فقط از داده/سیدر می‌آید و در پنل هم قابل ویرایش نیست
> (تست `AdminProductValidationTest`). مرتب‌سازی «پرفروش‌ترین» به همین ستون
> وابسته است. اگر «پرفروش» باید واقعی باشد، این یک شکاف عملکردی است.

### ۹.۲ کد تخفیف

- انواع: `percent` (درصدی) و `fixed` (مبلغ ثابت).
- شرایط: `min_order_total`، سقف تخفیف `max_discount` (برای درصدی)،
  `usage_limit`/`used_count`، بازهٔ `starts_at`/`expires_at` و `is_active`.
- **سقف هر کاربر (`per_user_limit`):** جدا از سقف کل. مقدار خالی = بدون
  محدودیت شخصی. برای کاربر، شمارش از سفارش‌های همان `user_id` با همان
  `coupon_code` انجام می‌شود (`Coupon::perUserUsageError`). تصمیم نهایی داخل
  تراکنش ثبت سفارش گرفته می‌شود؛ `POST /coupons/check` هم در صورت وجود توکن،
  همین خطا را پیش از ثبت اعلام می‌کند.
- **سفارش مهمان و `per_user_limit`:** مهمان حساب کاربری ندارد، پس سهمیه به
  شمارهٔ تماس سفارش بسته می‌شود (`Coupon::perPhoneUsageError`)؛ مقایسه روی
  شمارهٔ نرمال‌شده است تا ارقام فارسی/لاتین و قالب‌های `+98`/`09` یک هویت
  حساب شوند. `POST /coupons/check` برای مهمان فیلد اختیاری `phone` را
  می‌پذیرد و همان خطا را زودتر برمی‌گرداند. سفارش‌های `cancelled`/`refunded`
  (چه کاربر و چه مهمان) در شمارش نمی‌آیند تا با لغو، سهمیه آزاد شود. شمارش
  مهمان بین سفارش‌های همان `coupon_code` انجام می‌شود؛ اگر تعداد سفارش‌های
  مهمان زیاد شد، ذخیرهٔ ستون شمارهٔ نرمال‌شده توصیه می‌شود.
- اعتبارسنجی عمومی: `POST /coupons/check` (بدون نیاز به ورود).
- اعمال نهایی و افزایش `used_count` در تراکنش ثبت سفارش انجام می‌شود. کاهش آن
  هنگام لغو مشتری، لغو ادمین، آزادسازی خودکار سفارش رهاشده و بازپرداخت مرجوعی
  از `App\Services\Orders\OrderCouponService` انجام می‌شود تا سقف کل زودتر از
  واقعیت پر نشود (تست‌های `CouponPerUserLimitTest`, `OrderAbandonedReleaseTest`,
  `CodOrderTest`, `ReturnRequestTest`).

### ۹.۳ حمل‌ونقل

سه لایهٔ مستقل:

1. **روش ارسال** (`shipping_methods`): پست، پیک، … (فعال/غیرفعال).
2. **منطقه** (`shipping_zones`): استان/شهر/منطقه + هزینهٔ اختصاصی + پرچم ارسال اکسپرس.
3. **قانون** (`shipping_rules`) با `priority` (عدد بزرگ‌تر = اولویت بالاتر):
   - `fixed`: مبلغ ثابت
   - `free_over_amount`: رایگان بالای `threshold_amount`
   - `weight_based`: `cost_per_kg` × وزن
   - `zone_based`: بر اساس منطقه

استعلام هزینه در پنل: `POST /admin/shipping/quote`. صفحهٔ عمومی
`/shipping-info` از `store_settings` + روش‌های فعال ساخته می‌شود.
مرسوله‌ها (`shipments`) و رویدادهایشان (`shipment_events`) جدا از سفارش
نگه‌داری می‌شوند و امکان اطلاع‌رسانی (`/notify`) دارند.

### ۹.۴ مرجوعی

- مشتری برای سفارش خود درخواست مرجوعی ثبت می‌کند
  (`POST /orders/{orderNumber}/returns`) و فهرست را با `GET /returns` می‌بیند.
- مدیر وضعیت را با `PATCH /admin/returns/{id}/status` عوض می‌کند.
- `products.is_returnable` و `return_policy_days` (پیش‌فرض ۷ روز) در
  تنظیمات فروشگاه، سیاست مرجوعی را مشخص می‌کنند.

### ۹.۵ حسابداری و انبار

- **فاکتور خرید** موجودی را **زیاد** می‌کند و `cost_price` محصول را به‌روز
  می‌رساند (`PurchaseInvoiceService`). ویرایش فاکتور، اختلاف موجودی را
  اعمال می‌کند و حذف فاکتور موجودی را برمی‌گرداند.
- هزینه‌ها (`expenses`) و چک‌ها (`cheques` با وضعیت‌هایی مثل `cleared`) در
  گزارش حساب‌داری و نمای کلی لحاظ می‌شوند.
- گزارش فروش: `GET /admin/reports/sales` و `GET /admin/accounting/report`.

### ۹.۶ محتوا، پاپ‌آپ و استوری

- **پاپ‌آپ:** سرور فقط پاپ‌آپ‌های `is_active` داخل بازهٔ `starts_at/ends_at`
  را برمی‌گرداند. تصمیم «الان نشان بده یا نه» سمت مرورگر است:
  تأخیر، بستن خودکار، دستگاه، صفحهٔ هدف و قاعدهٔ تکرار
  (`always|session|daily|weekly|once`) با کلیدهای
  `behrang-shop-popups-seen` و `behrang-shop-popups-session` مدیریت می‌شود.
- **تنظیمات فروشگاه:** کش ۱۰ دقیقه‌ای (`StoreSetting::CACHE_KEY`). بعد از
  تغییر تنظیمات از پنل، کنترلر کش را پاک می‌کند؛ در صورت تغییر دستی دیتابیس
  `php artisan cache:clear` لازم است.
- **بنر و اسلایدر:** تنظیمات هر موقعیت در `banner_sections` (اندازه، گردی
  گوشه ۰–۴۸px، انیمیشن) و لایه‌های متنی با فونت‌های آپلودی
  (`banner_fonts`) ذخیره می‌شود.
- **استوری:** نمایش در نوار بالای صفحهٔ اول؛ «دیده‌شده» در
  `behrang-shop-stories-seen` نگه‌داری می‌شود.
- **نشان اعتماد:** در فوتر و صفحه‌های محتوایی نمایش داده می‌شود.
- **مقالات:** فقط `is_published = true` و (`published_at` خالی یا `<= اکنون`).
- **کاتالوگ قدیمی:** `php artisan catalog:hide-legacy` محصولات/دسته‌های قدیمی
  را غیرفعال می‌کند و با `--restore` برمی‌گرداند.
- **صفحات رسمی/اعتماد:** `php artisan pages:legal` پنج صفحهٔ `about`,
  `contact`, `terms`, `privacy`, `returns` را می‌سازد (منتشر + نمایش در فوتر).
  متن‌ها در `App\Support\LegalPages` نگه‌داری می‌شوند و متغیرهایی مثل
  `{{store_name}}`/`{{store_phone}}`/`{{return_policy_days}}` هنگام نمایش در
  `PageController` با تنظیمات فعلی فروشگاه جایگزین می‌شوند. صفحات موجود
  بازنویسی نمی‌شوند مگر با `--force` (تست: `LegalPagesTest`).

### ۹.۷ پیام‌رسانی، پشتیبانی و تولد

- **کانال‌ها:** پیامک (درایورهای `kavenegar`/`smsir`/`custom`)، تلگرام،
  واتساپ Cloud API و بله. فعال‌سازی هر کانال با کلید `*_ENABLED` و توکن
  مربوطه در `.env` انجام می‌شود.
- **محدودیت‌ها:** `MESSAGING_TIMEOUT` (پیش‌فرض ۱۵ ثانیه) و
  `MESSAGING_AUDIENCE_LIMIT` (پیش‌فرض ۳۰۰ گیرنده در هر ارسال انبوه).
- **گزارش ارسال:** هر ارسال در `outbound_messages` با وضعیت/خطا ثبت می‌شود؛
  پنل `/admin/messaging` تاریخچه و امکان حذف پیام را دارد.
- **قالب وضعیت سفارش:** در تنظیمات پیام‌رسانی قابل ویرایش است و با تغییر
  وضعیت سفارش (در صورت فعال بودن) ارسال می‌شود. تست
  `OrderStatusSmsTest` این مسیر را پوشش می‌دهد.
- **چت پشتیبانی:** مهمان بدون حساب با «توکن گفتگو» چت می‌کند
  (`behrang-shop-support-conversation`). ویجت هر
  `SUPPORT_POLL_SECONDS` (پیش‌فرض ۵) پیام‌ها را می‌خواند. مدیر در
  `/admin/support` پاسخ می‌دهد. پیام‌های تلگرام/بله/واتساپ از
  `/support/webhooks/{secret}/{channel}` وارد همین گفتگوها می‌شوند.
- **تبریک تولد:** تاریخ تولد اختیاری در پروفایل + گزینهٔ انصراف
  (`birthday_greeting_opt_out`). دستور `birthday:greetings` هر ۱۵ دقیقه اجرا
  می‌شود، تطبیق تاریخ با **تقویم شمسی** انجام می‌شود، ساعت ارسال و متن از
  تنظیمات پنل خوانده می‌شود و از ارسال تکراری جلوگیری می‌کند. گزینه‌های
  `--date=YYYY-MM-DD`، `--force` و `--dry-run` (فقط نمایش گیرندگان) برای
  اجرای دستی/تست وجود دارد.

---

## ۱۰) فرانت‌اند

### ۱۰.۱ مسیرها

**فروشگاه (عمومی):**

| مسیر | صفحه |
|---|---|
| `/` | خانه (بنر، دسته‌ها، استوری، محصولات ویژه/جدید، مقالات) |
| `/products` | فهرست محصولات + فیلتر آکاردئونی + مرتب‌سازی + صفحه‌بندی |
| `/product/:slug` | جزئیات محصول (گالری، رنگ، سایز، پک، نظرات، راهنمای سایز) |
| `/size-guide`, `/shipping-info` | راهنمای سایز و روش‌های ارسال |
| `/articles`, `/articles/:slug` | مقالات |
| `/pages/:slug` | صفحات ثابت |
| `/cart`, `/wishlist` | سبد خرید و علاقه‌مندی |
| `/checkout`, `/payment/:orderNumber` | تسویه (انتخاب پرداخت آنلاین/در محل) و پرداخت آنلاین |
| `/login`, `/register` | ورود/ثبت‌نام |
| `/forgot-password`, `/reset-password/:token` | فرم فراموشی رمز و تعیین رمز جدید (لینک ایمیل) |
| `/track-order` | رهگیری عمومی سفارش (شماره سفارش + تلفن، بدون ورود) |
| `/account`, `/account/orders/:orderNumber` | حساب کاربری و جزئیات سفارش |
| `/account/orders/:orderNumber/invoice` | فاکتور/رسید چاپی مشتری (چاپ مرورگر → Save as PDF؛ بدون هدر/فوتر سایت) |
| `*` | صفحهٔ ۴۰۴ با جست‌وجو |

**پنل مدیریت:** `/admin/login` عمومی؛ بقیه زیر `/admin` با `AdminLayout`:

`/admin` (نمای کلی)، `products`, `products/create`, `products/:id/edit`,
`categories`, `brands`, `orders`, `returns`, `coupons`, `customers`,
`customers/:customerId`, `wishlist`, `admins`, `messaging`, `support`,
`accounting`, `shipping`, `content`, `banners`, `announcement-bar`,
`trust-badges`, `stories`, `popups`, `header-footer`, `articles`,
`reports`, `settings`, `reviews`.

همهٔ صفحه‌ها `lazy()` هستند و `Suspense` یک fallback سادهٔ «در حال بارگذاری
صفحه...» دارد. خطاهای رندر با `RouteErrorBoundary` گرفته می‌شوند.

### ۱۰.۲ وضعیت و کش سمت کلاینت

| Context | مسئولیت |
|---|---|
| `AuthContext` | توکن/کاربر مشتری، ورود، خروج، به‌روزرسانی پروفایل |
| `AdminAuthContext` | توکن/کاربر مدیر + `permissions` |
| `CartContext` | سبد خرید در `localStorage` (`behrang-shop-cart`) و محاسبات نمایشی |
| `WishlistContext` | علاقه‌مندی مهمان در localStorage و همگام‌سازی با سرور بعد از ورود |

**کلیدهای localStorage** (همه در `utils/storageKeys.ts` با پیشوند
`behrang-shop-` و مهاجرت خودکار از `pharmacy-shop-*`):
توکن/کاربر مشتری و مدیر، سبد خرید، علاقه‌مندی، کش دسته‌ها/برندها/تنظیمات/
هدر‌فوتر/نوار اطلاع‌رسانی/نشان‌ها/استوری‌ها/صفحات/پاپ‌آپ‌ها، وضعیت دیده‌شدن
استوری و پاپ‌آپ، توکن چت پشتیبانی، چیدمان سایدبار و داشبورد ادمین، تم،
تاریخچهٔ جست‌وجو، بازدیدهای اخیر و وضعیت بستن پیشنهاد PWA.

**الگوی کش محتوا:** هر hook (مثل `useStoreSettings` یا `useHeaderFooter`)
ابتدا مقدار کش‌شده را نشان می‌دهد و در پس‌زمینه تازه‌سازی می‌کند؛ به همین دلیل
تغییرات پنل ممکن است با کمی تأخیر دیده شوند.

### ۱۰.۳ UI و طراحی

- طراحی RTL با فونت وزیرمتن (بستهٔ `@fontsource/vazirmatn`).
- تم‌ها: **sage** (پیش‌فرض) و **ocean** با متغیرهای CSS در `index.css`؛
  انتخاب کاربر در `behrang-shop-storefront-theme` ذخیره و با `initTheme()`
  در `main.tsx` اعمال می‌شود.
- برای جلوگیری از فلش سفید قبل از بارگذاری CSS، در `index.html` یک استایل
  inline برای `background-color` تعریف شده است.
- اعداد و مبالغ با `utils/price.ts` و تاریخ‌ها با `utils/jalali.ts` قالب‌بندی
  می‌شوند (اعداد فارسی، جداکنندهٔ هزارگان).
- کامپوننت‌های مشترک: `Button`, `ProductCard`, `QuickViewModal`,
  `RichTextContent`, `JalaliDatePicker`, `AddressMapPicker` (Leaflet)،
  `SupportWidget`, `StorefrontPopup`, `StoryStrip/StoryViewer`,
  `AnnouncementBar`, `HeaderSearch`, `ThemeSwitcher`, `InstallPwaPrompt`.
- **بارگذاری:** صفحه‌های اصلی skeleton دارند (مقالات، جزئیات مقاله، دسته‌ها،
  جست‌وجوی هدر، گالری محصول، اطلاعات ارسال) و شبکهٔ محصولات `/products` هم
  با ۱۲ کارت اسکلتی (`animate-pulse`) و `aria-busy` نمایش داده می‌شود؛
  صفحه‌های بعدی صفحه‌بندی فقط محو می‌شوند تا ارتفاع نپرد.

### ۱۰.۴ PWA، سئو و متادیتا

- `manifest.webmanifest` با نام، آیکون‌ها، `display: standalone` و
  `background_color` هم‌راستا با پس‌زمینهٔ سایت.
- `public/sw.js` کش نسخه‌دار است و پلاگین `serviceWorkerVersion` در
  `vite.config.ts` در هر build مقدار `VERSION` را از هش فایل‌های
  `dist/assets` بازنویسی می‌کند.
- `offline.html` برای حالت آفلاین.
- سئو: `usePageMeta` (عنوان/توضیح/canonical)، `utils/seo.ts`،
  `utils/structuredData.ts` (JSON-LD محصول/مقاله) و تولید sitemap در
  `npm run build`.

---

## ۱۱) یکپارچگی‌های بیرونی، صف و زمان‌بندی

| یکپارچگی | نحوهٔ اتصال | نکات |
|---|---|---|
| پیامک | `SMS_DRIVER` + `SMS_API_KEY` | سه درایور: کاوه‌نگار، SMS.ir، سرویس سفارشی (`SMS_BASE_URL`) |
| تلگرام | `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` | ارسال پیام و دریافت پیام پشتیبانی از webhook |
| بله | `BALE_BOT_TOKEN` + `BALE_CHAT_ID` | مشابه تلگرام |
| واتساپ | Cloud API با `WHATSAPP_TOKEN` و `WHATSAPP_PHONE_NUMBER_ID` | ارسال با template؛ webhook با secret |
| چت پشتیبانی | endpointهای `/support/*` | polling؛ نیازی به WebSocket نیست |
| نقشه | Leaflet + کاشی‌های OSM | فقط در `AddressMapPicker` |
| ایمیل | `MAIL_MAILER` (پیش‌فرض `log`) + `FRONTEND_URL` | فقط ایمیل بازیابی رمز عبور ارسال می‌شود؛ برای تحویل واقعی در production باید SMTP تنظیم شود |

- **صف:** `QUEUE_CONNECTION=database`. اگر ارسال پیام‌ها به صف سپرده شود،
  `php artisan queue:work` باید روی سرور اجرا شود؛ در غیر این صورت پیام‌ها
  در جدول `jobs` می‌مانند.
- **زمان‌بندی:** دو تسک ثبت‌شده است: `birthday:greetings` (هر ۱۵ دقیقه) و
  `orders:release-abandoned` (هر ۱۰ دقیقه؛ فقط سفارش‌های آنلاین پرداخت‌نشده —
  COD مستثناست). کرون سرور باید `php artisan schedule:run` را هر دقیقه اجرا کند.
- **وب‌هوک‌ها:** مسیر امنیتی آن‌ها `SUPPORT_WEBHOOK_SECRET` است؛ اگر خالی
  باشد، دریافت پیام از پیام‌رسان‌ها غیرفعال می‌شود. پیشنهاد می‌شود مقدار
  طولانی و تصادفی استفاده شود و مسیر در پنل پیام‌رسان با HTTPS ثبت شود.

---

## ۱۲) نقشهٔ «کجا چه چیزی را عوض کنم»

| اگر می‌خواهی … | فایل/پوشهٔ مرجع |
|---|---|
| ظاهر کلی، رنگ‌ها، فاصله‌ها، تم | `frontend/src/index.css` + `frontend/src/utils/theme.ts` |
| فیلتر صفحهٔ محصولات | `frontend/src/components/ProductFilterPanel.tsx` + `frontend/src/pages/Products.tsx` + `backend/app/Http/Controllers/Api/ProductController.php` |
| منطق ثبت سفارش/موجودی/کد تخفیف | `backend/app/Http/Controllers/Api/OrderController.php` + `Services/Orders/OrderStockService.php`, `OrderCouponService.php` |
| بازیابی رمز عبور | `PasswordResetController` + `App\Notifications\ResetPasswordNotification` + `pages/ForgotPassword.tsx`, `ResetPassword.tsx` + `config('app.frontend_url')` |
| سفارش مهمان، رهگیری، دسترسی و بازیابی مهمان | `OrderController@store/show/cancel` (`X-Guest-Token` + `findOwnedOrder`) + `OrderTrackingController` (`track`/`recoverAccess`) + `App\Support\GuestAccessCode` + `pages/TrackOrder.tsx` (کد پیگیری + بازیابی دسترسی), `InvoiceView.tsx`, `Checkout.tsx` + هدر خودکار مهمان در `services/api.ts` |
| روش‌های پرداخت، سقف COD و تسویهٔ COD | `backend/app/Support/PaymentMethod.php` + `config/payment.php` (`cod_max_total`) + `OrderController` + `AdminOrderController@updatePaymentStatus` + `frontend/src/pages/Checkout.tsx`, `Payment.tsx`, `OrderDetail.tsx`, `AdminOrders.tsx` + `services/storeSettings.ts` |
| وضعیت‌ها و برچسب‌های سفارش | `backend/app/Support/OrderStatus.php` |
| نقش‌ها و مجوزهای مدیر | `backend/app/Support/AdminRole.php` + `frontend/src/utils/adminPermissions.ts` |
| منوی سایدبار ادمین | `frontend/src/utils/adminNavItems.ts` + `components/AdminLayout.tsx` |
| پاپ‌آپ‌ها | `backend/app/Models/Popup.php` + `AdminPopupController` + `frontend/src/components/StorefrontPopup.tsx` + `pages/AdminPopups.tsx` |
| بنر/اسلایدر و فونت‌ها | `AdminBannerController`, `AdminBannerSectionController`, `components/AdminBanner*`, `components/Banner*` |
| نوار اطلاع‌رسانی | `AnnouncementBarController` + `components/AnnouncementBar.tsx` |
| استوری‌ها | `StoryController` + `components/StoryStrip.tsx`, `StoryViewer.tsx` |
| مقالات و صفحات | `ArticleController`, `PageController` + `pages/Articles.tsx`, `ArticleDetail.tsx`, `PageView.tsx` |
| تنظیمات فروشگاه (تماس/مالیات/ارسال) | `backend/app/Models/StoreSetting.php` + `AdminStoreSettingController` |
| روش‌ها/مناطق/قوانین ارسال | `AdminShippingController` + `app/Services/Shipping/` + `pages/AdminShipping.tsx` |
| حسابداری، فاکتور خرید، هزینه، چک | `app/Services/Accounting/` + `Admin*Controller` + `pages/AdminAccounting.tsx` |
| پیام‌رسانی و قالب‌ها | `app/Services/Messaging/` + `AdminMessagingController` + `pages/AdminMessaging.tsx` |
| چت پشتیبانی | `SupportController` + `AdminSupportController` + `components/SupportWidget.tsx` + `utils/supportChat.ts` |
| آدرسی که فرانت به API می‌زند | `frontend/src/utils/apiOrigin.ts` |
| کلیدهای localStorage | `frontend/src/utils/storageKeys.ts` |
| PWA (manifest/sw/آفلاین) | `frontend/public/manifest.webmanifest`, `sw.js`, `offline.html` + `vite.config.ts` |
| سئو و JSON-LD | `frontend/src/utils/seo.ts`, `structuredData.ts`, `hooks/usePageMeta.ts` |
| تست‌های بک‌اند | `backend/tests/Feature/` (الگو: `RefreshDatabase` + `Sanctum::actingAs`) |

---

## ۱۳) قراردادها و قواعد تغییر

این‌ها «قواعد نانوشتهٔ» کد هستند؛ رعایتشان باعث می‌شود تغییرات با بقیهٔ پروژه
هم‌خوان بماند.

### کدنویسی

- **کامنت‌ها فارسی و توضیح‌دهندهٔ «چرا»** هستند، نه «چه». این سبک را حفظ کنید.
- بک‌اند: منطق پیچیده در `app/Services/*` یا `app/Support/*`؛ کنترلرها
  اعتبارسنجی + هماهنگی + پاسخ JSON انجام می‌دهند.
- فرانت: هر domaine یک فایل سرویس در `src/services/`؛ هر قابلیت مشترک یک hook
  در `src/hooks/`؛ کامپوننت‌های عمومی در `src/components/`.
- تابع‌هایی که در آرایهٔ وابستگی `useEffect`/`useCallback` می‌آیند (مثل
  `success`/`error` در `useFlash` کامپوننت‌های حسابداری) باید با `useCallback`
  هویت ثابت داشته باشند؛ تعریف inline آن‌ها در بدنهٔ کامپوننت باعث اجرای
  بی‌پایان افکت و حلقهٔ درخواست به API می‌شود.
- نام‌گذاری: دیتابیس/JSON با `snake_case`، کد TypeScript با `camelCase`،
  کامپوننت‌ها `PascalCase`.
- پاسخ API: همیشه `success`/`message`/`data` (یا `data` تنها) — از تغییر
  ناگهانی شکل پاسخ بدون به‌روزرسانی همهٔ سرویس‌های فرانت خودداری کنید.

### دیتابیس و API

- هر تغییر schema با **مایگریشن جدید** (نه ویرایش مایگریشن قبلی).
- مسیرهای API نسخه‌دار هستند (`/api/v1`)؛ تغییر شکننده = نسخهٔ جدید.
- `AdminRole.php` و `adminPermissions.ts` باید هم‌زمان تغییر کنند.
- کلیدهای `storageKeys.ts` و مسیرهای API، قرارداد با کاربران فعلی هستند؛
  تغییرشان نیازمند مهاجرت/پشتیبانی از حالت قبل است.
- `OrderStatus::LABELS` منبع برچسب‌های فارسی است؛ برچسب جدید را جای دیگری
  hard-code نکنید.
- سفارش مهمان را بدون `X-Guest-Token` معتبر نپذیرید و پاسخ رهگیری عمومی را
  محدود نگه دارید (بدون شماره تماس کامل، بدون امکان تغییر سفارش).

### کیفیت

- قبل از تحویل: `php artisan test` + `npm run typecheck` + `npm run build`.
- برای هر قابلیت ادمین، یک تست Feature جدید در `backend/tests/Feature/`
  با الگوی موجود اضافه کنید.
- فرانت تست ندارد؛ بنابراین تغییرات UI باید دستی در سه اندازه (موبایل،
  تبلت، دسکتاپ) و در هر دو تم `sage`/`ocean` بررسی شوند.
- پکیج جدید فقط در صورت ضرورت و با هماهنگی (پروژه عمداً سبک نگه داشته شده).

---

## ۱۴) بدهی فنی و ریسک‌ها

| # | مورد | توضیح | پیشنهاد |
|---|---|---|---|
| ۱ | فایل‌های بسیار بزرگ | `index.css` (~۶٬۴۰۰ خط)، `AdminShipping` (~۴٬۴۰۰)، `AdminProductForm` (~۳٬۴۰۰)، `AdminDashboard` (~۲٬۶۰۰)، `AdminOrders` (~۲٬۶۰۰)، `ProductDetail` (~۲٬۴۰۰) | شکستن به کامپوننت/هوک و فایل‌های CSS ماژولار |
| ۲ | نبود تست فرانت و لینت | فقط `tsc` و build | افزودن Vitest + Testing Library و ESLint/Prettier |
| ۳ | `sales_count` واقعی نیست | با سفارش افزایش نمی‌یابد؛ «پرفروش» گمراه‌کننده است | افزایش در ثبت/تحویل سفارش یا محاسبهٔ زنده از `order_items` |
| ۴ | توکن بدون انقضا | `sanctum.expiration = null` + نگه‌داری در localStorage | تعیین انقضا/refresh و بررسی CSP |
| ۵ | تصاویر روی دیسک محلی | بدون CDN/بهینه‌سازی؛ دو پوشهٔ قدیمی `products/` و `product-images/` و باقی‌ماندهٔ `public/storage-old/` | یکپارچه‌سازی مسیرها + بهینه‌سازی/WebP + پاک‌سازی |
| ۶ | کش دستی | فراموشی `cache:clear` بعد از تغییر دستی داده، تا ۱۰ دقیقه محتوای کهنه نشان می‌دهد | پاک‌سازی خودکار در مدل‌ها (observer) |
| ۷ | بدون درگاه واقعی | پرداخت آنلاین فقط demo است (در production بسته) و COD دستی تسویه می‌شود | اتصال درگاه واقعی؛ سقف مبلغ COD در ۱.۱۰ اضافه شد، اما هزینهٔ اضافی COD ندارد |
| ۸ | بدون i18n | متن‌های فارسی در JSX/کنترلرها تکرار شده‌اند | استخراج فرهنگ لغت در صورت نیاز به چند‌زبانه |
| ۹ | اسکرول صفحهٔ محصولات | پس از بازطراحی فیلتر، لایه‌های اسکرول داخلی حذف شدند و فقط `max-h` سایدبار به‌عنوان محافظ باقی مانده | بررسی دوره‌ای در ارتفاع‌های کم |
| ۱۰ | لودر شبکهٔ محصولات | **انجام شد (۱.۹):** ۱۲ کارت اسکلتی با `animate-pulse` و `aria-busy` جای `Loader2` در `/products` | — |
| ۱۱ | تاریخچهٔ موجودی | جدول ledger برای تغییرات موجودی وجود ندارد؛ فقط عدد `stock` به‌روز می‌شود | افزودن `stock_movements` برای رهگیری |
| ۱۲ | ناسازگاری نمونهٔ env | **انجام شد (۱.۱۰):** `.env.example` روی MySQL (`pharmacy_shop`) هم‌راستا شد و `COD_MAX_TOTAL` اضافه شد | — |
| ۱۳ | بدون CAPTCHA در احراز هویت | rate limit (۱۵/دقیقه per IP) و قفل حساب (۵ تلاش ناموفق/۱۵ دقیقه) اضافه شده؛ هنوز CAPTCHA یا محافظت لایهٔ CDN نیست | افزودن CAPTCHA فقط در صورت مشاهدهٔ حملهٔ واقعی |
| ۱۴ | محدودیت‌های سفارش مهمان | مهمان با شناسهٔ مرورگر سفارش خودش را می‌بیند، فاکتور می‌گیرد و سفارش پرداخت‌نشده را لغو می‌کند؛ مرجوعی و پرداخت آنلاین همچنان فقط برای حساب کاربر است. بازیابی دسترسی با پاک‌شدن `localStorage` حل شد (**۱.۱۱**): `POST /orders/recover` با «شماره سفارش + کد پیگیری» شناسهٔ مرورگر قبلی را برمی‌گرداند | هدایت مهمان به ساخت حساب (نردبان ثبت‌نام پس از سفارش) در صورت نیاز |

موارد بالا «باگ» نیستند؛ نقطه‌های تصمیم برای ادامهٔ کار هستند. اگر بازبین
خارجی روی یکی از آن‌ها تمرکز کرد، ابتدا با مالک پروژه هماهنگ شود.

---

## ۱۵) چک‌لیست تحویل به هوش مصنوعی دیگر

اگر می‌خواهید این پروژه را به دستیار هوش مصنوعی دیگری بسپارید، این بسته را
بدهید:

1. **کل مخزن** (یا حداقل `backend/app`, `backend/routes`, `backend/database`,
   `frontend/src`) + همین فایل.
2. **`.env` را نفرستید.** فقط `backend/.env.example` را بفرستید.
3. اگر فقط یک بخش مدنظر است، فایل‌های مرتبط از جدول بخش ۱۲ را ضمیمه کنید.

### متن پیشنهادی برای شروع گفتگو

```text
این یک فروشگاه اینترنتی فارسی/RTL با Laravel 13 (API، Sanctum) و
React 19 + TypeScript + Vite + Tailwind 4 (SPA) است.
فایل TECHNICAL_GUIDE.md را کامل بخوان و به‌عنوان مرجع اصلی در نظر بگیر.

قواعد کار:
- هیچ فایل .env یا مقدار محرمانه‌ای درخواست نکن.
- قبل از تغییر، فایل‌های مرتبط را بخوان و الگوی موجود را حفظ کن.
- کامنت‌های فارسی و ساختار پاسخ API و کلیدهای localStorage را نشکن.
- بک‌اند: migration جدید بساز، تست Feature اضافه کن، php artisan test را اجرا کن.
- فرانت: npm run typecheck و npm run build را اجرا کن.
- تغییرات را کوچک و قابل بازبینی نگه دار و در پایان خلاصه بده.

وظیفهٔ من: <توضیح دقیق قابلیت/باگ>
```

### کارهایی که بدون هماهنگی انجام نشود

- حذف/تغییر نام جدول‌ها، ستون‌ها یا مسیرهای API موجود.
- تغییر `AdminRole`/`adminPermissions` به‌تنهایی (باید هم‌زمان باشند).
- افزودن وابستگی سنگین یا جایگزینی Vite/Tailwind/React Router.
- تغییر فرمت پاسخ‌های عمومی API بدون به‌روزرسانی فرانت.
- پاک کردن `storage/`، `public/storage-old/` یا migrationهای اجراشده.
- تغییر تنظیمات پرداخت برای فعال‌کردن دمو در production (در کد مسدود است).

---

## ۱۶) نگهداری سند

### چه زمانی به‌روزرسانی شود؟

- افزودن/حذف مسیر API یا تغییر prefix
- افزودن مایگریشن/جدول جدید
- تغییر نسخهٔ Laravel/React/Vite/Tailwind یا پکیج‌های اصلی
- تغییر مدل احراز هویت/مجوزها
- تغییر متغیرهای محیطی یا درایورها
- تغییر ساختار پوشه‌های اصلی

### دستورهای بازتولید آمار

```powershell
# --- بک‌اند (از داخل backend) ---
cd backend
php artisan --version
php artisan route:list --json | php -r "echo count(json_decode(stream_get_contents(STDIN), true));"
(Get-ChildItem database/migrations -File -Filter *.php).Count
(Get-ChildItem app/Models -Recurse -File -Filter *.php).Count
(Get-ChildItem app/Http/Controllers/Api -File -Filter *.php).Count
(Get-ChildItem tests -Recurse -File -Filter *Test.php).Count
php artisan test

# --- فرانت (از داخل frontend) ---
cd ..\frontend
npx tsc --noEmit
npm run build
(Get-ChildItem src -Recurse -File -Include *.ts,*.tsx).Count
node -p "require('./package.json').dependencies.react"
```

### چک‌لیست پایان هر تغییر

1. گارد مربوطه سبز شد؟ بک‌اند: `php artisan test` — فرانت: `npx tsc --noEmit` و `npm run build`.
2. جدول همگام‌سازی بالای سند را چک کردی و بخش(های) مربوطه را ویرایش کردی؟
3. آمار بخش ۲ (مسیر/مایگریشن/مدل/کنترلر/تست و نسخه‌ها) هنوز درست است؟
4. env یا `config/*` عوض شد؟ بخش ۵ و ۱۱ و `backend/.env.example` هم به‌روز شد؟
5. نقش/مجوز جدید؟ هم `AdminRole.php` هم `adminPermissions.ts` و بخش ۶؟
6. نسخه و تاریخ بالای فایل + جدول تاریخچهٔ پایین به‌روز شد؟
7. تصمیم غیرکدی یا بدهی فنی جدید در `Start.txt` / بخش ۱۴ ثبت شد؟

### تاریخچهٔ نسخه‌های سند

| نسخه | تاریخ | تغییر |
|---|---|---|
| 1.0 | 2026-11-13 | نسخهٔ اولیه: معماری، داده، API، دامنه، فرانت، بدهی فنی |
| 1.1 | 2026-11-13 | افزودن قانون اجباری نگهداری سند، `AGENTS.md` و دستورهای PowerShell بازتولید آمار |
| 1.2 | 2026-11-13 | اصلاح ادعای نادرست throttle (هیچ محدودیت سراسری نیست) + افزودن بدهی فنی ۱۳ |
| 1.3 | 2026-11-13 | آزادسازی خودکار سفارش رهاشده (`orders:release-abandoned` + `OrderStockService`)، rate limit احراز هویت/ثبت سفارش و قفل حساب، به‌روزرسانی آمار تست |
| 1.4 | 2026-11-13 | افزودن پرداخت در محل (COD): ستون‌های `payment_method`/`paid_at`، ثبت سفارش COD با `processing/unpaid`، رد پرداخت آنلاین برای COD، ثبت دریافت وجه توسط ادمین، به‌روزرسانی آمار |
| 1.5 | 2026-11-13 | سقف استفادهٔ هر کاربر برای کوپن (`per_user_limit`)، صفحات رسمی/اعتماد با `pages:legal` و متغیرهای تنظیمات، فاکتور/رسید چاپی مشتری (`InvoiceView`) و کد کالا/تاریخ پرداخت در فاکتور پنل |
| 1.5.1 | 2026-11-13 | رفع حلقهٔ درخواست در حسابداری: پایدارکردن `success`/`error` در `useFlash` (وابستگی `useCallback`)، بارگذاری اولیهٔ یک‌بارهٔ خلاصه و تفکیک حالت «در حال به‌روزرسانی» دکمه |
| 1.6 | 2026-11-13 | بازیابی رمز عبور (`forgot/reset-password` + ایمیل فارسی)، سفارش مهمان (nullable شدن `orders.user_id`، `guest_token`، فقط COD)، رهگیری عمومی سفارش (`POST /orders/track` + صفحهٔ `/track-order`) و به‌روزرسانی آمار |
| 1.7 | 2026-11-14 | دسترسی مهمان به سفارش خودش: عمومی‌شدن `GET /orders/{orderNumber}` و `POST /orders/{orderNumber}/cancel` با `X-Guest-Token`، فاکتور و دکمهٔ لغو در `/track-order`، هدر خودکار مهمان در Axios و افزودن `GuestOrderAccessTest` (۴۲۴ تست) |
| 1.8 | 2026-11-14 | اعمال `per_user_limit` برای سفارش مهمان بر پایهٔ شمارهٔ تماس نرمال‌شده (`Coupon::perPhoneUsageError`)، پذیرش `phone` در `POST /coupons/check` و ارسال آن از چک‌اوت؛ افزودن ۵ تست (۴۲۹ تست) |
| 1.9 | 2026-11-14 | اسکلت لودینگ شبکهٔ محصولات `/products`: ۱۲ کارت `animate-pulse` با `aria-busy`/`sr-only` جای `Loader2`؛ بستن بدهی فنی ۱۰ |
| 1.10 | 2026-11-14 | آزادسازی سهمیهٔ کوپن با لغو/بازپرداخت (`OrderCouponService` + تست‌ها)، سقف مبلغ COD از `COD_MAX_TOTAL`/`cod_max_total` با نمایش در چک‌اوت، هم‌راستا شدن `.env.example` با MySQL و بستن بدهی فنی ۱۲ (۴۳۶ تست) |
| 1.11 | 2026-11-14 | «کد پیگیری مهمان»: ستون `orders.guest_access_code`، تولید کد در ثبت سفارش مهمان، مسیر عمومی `POST /orders/recover` (شماره سفارش + کد) برای بازیابی دسترسی در مرورگر جدید، نمایش/کپی کد و فرم بازیابی در `/track-order` و بستن بخش «بازیابی دسترسی» بدهی فنی ۱۴ (۴۴۷ تست) |

---

> این سند جای «خواندن کد» را نمی‌گیرد؛ نقشهٔ راه است. برای جزئیات هر بخش،
> فایل‌های اشاره‌شده منبع حقیقت هستند.
