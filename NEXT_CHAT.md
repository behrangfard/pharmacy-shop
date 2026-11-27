# هندآف — انتقال کار به چت جدید (نسخهٔ ۱.۵۶)

> تاریخ ثبت: 2026-11-27 · وضعیت: تسک ۱.۵۶ (**ویرایش کامل نوار پایین موبایل از پنل + لوگوی فروشگاه در دکمهٔ شناور + قوس وسط نوار**) **کامل شده** و منتظر بازبینی چشمی مدیر است. تسک‌های ۱.۵۵ (دارک‌مود بنرها)، ۱.۵۴ (منوی دسته‌بندی موبایل)، ۱.۵۳ (نوار پایین موبایل + FAB) و ۱.۵۲ (بخش ویژهٔ ۱۸+) هم بسته‌اند.
> جزئیات: انتهای `Start.txt` (تسک ۱.۵۶)، `TECHNICAL_GUIDE.md` (ردیف ۱.۵۶ + §۹.۱۲)، `SITE_GUIDE.md` §۴.

---

## ۰. آخرین تغییر (تسک ۱.۵۶ — 2026-11-27)

سه خواستهٔ مدیر: (۱) وسط نوار پایین = لوگوی فروشگاه، (۲) کل منو از پنل مدیریت ویرایش شود، (۳) دایرهٔ وسط با منحنی از مستطیل نوار جدا شود. نتیجه:

- **تنظیمات در پنل:** بخش «منوی پایین موبایل» در همان صفحهٔ «هدر و فوتر» — بدون صفحهٔ جدید، بدون آیتم سایدبار و بدون مایگریشن (هفت کلید `mobile_nav_*` در `store_settings` و در پاسخ عمومی `GET /header-footer`).
- **دکمهٔ شناور:** لوگوی آپلودی (`POST /admin/header-footer/mobile-logo` → پوشهٔ `mobile-nav` دیسک public، WebP اختیاری) یا آیکن پیش‌فرض؛ رفتار `panel` (پنل «دسترسی سریع») یا `link` (رفتن به نشانی).
- **قوس وسط:** سطح شیشه‌ای `.mobile-nav-surface` با `mask-image` قوس می‌خورد و شعاع قوس از قطر دکمه + حلقهٔ فاصله ساخته می‌شود (`--mobile-nav-fab`/`--mobile-nav-fab-ring` → `--mobile-nav-notch: 34px`)؛ دکمه و قوس هم‌مرکزند و میان‌برها در دو گروه هم‌عرض با جای خالی ثابت ۷۲px چیده می‌شوند. سایه با گرادیان روی `.mobile-nav-shell::before` است (نه `drop-shadow`).
- **تأیید:** `php artisan test --filter=HeaderFooterTest` → **۱۵ پاس (۱۰۷ assertion)** · `npx tsc --noEmit` سبز · `npm run lint` ۰ خطا/۲۲۲ فایل · **تست فرانت اجرا نشد** (بلاکر Vitest/Vite؛ ۴ تست جدید در `MobileBottomNav.test.tsx` نوشته شد).

---

## ۱. آنچه در این تسک انجام شد

- `backend/app/Models/StoreSetting.php`: هفت پیش‌فرض تازه — `mobile_nav_enabled` (`'1'`)، `mobile_nav_items` (JSON چهار ردیف خانه/فروشگاه/علاقه‌مندی/سبد خرید با `label`/`url`/`icon`/`badge`)، `mobile_nav_quick_links` (JSON چهار ردیف: حساب کاربری `/account`، پیگیری سفارش، راهنمای سایز، مقالات)، `mobile_nav_fab_mode` (`panel`)، `mobile_nav_fab_url` (`''`) و `mobile_nav_fab_logo` (`''`).
- `backend/app/Http/Controllers/Api/HeaderFooterController.php`: ثابت‌های `NAV_ICONS`/`NAV_BADGES`/`NAV_FAB_MODES`، اعتبارسنجی و encode/decode دو فهرست JSON، رد حالت `link` بدون نشانی (۴۲۲)، پاک‌سازی مقدار خراب، `uploadMobileLogo` و `deleteReplacedNavLogo`؛ مسیر `POST /admin/header-footer/mobile-logo` در `routes/api.php` زیر همان گروه `admin.permission:settings.manage`.
- `frontend/src/services/headerFooter.ts`: `MOBILE_NAV_ICONS`، انواع `MobileNavItem`/`MobileNavQuickLink`/`MobileNavBadge`/`MobileNavFabMode`، `MOBILE_NAV_ITEMS_MIN/MAX` و `MOBILE_NAV_QUICK_LINKS_MAX` و نرمال‌سازی ردیف‌ها.
- `frontend/src/components/MobileBottomNav.tsx`: خواندن از `useHeaderFooter()`، نقشهٔ `NAV_ICON_COMPONENTS`، `isNavItemActive`، دکمهٔ شناور با لوگو و حالت لینک، بازگشت `null` وقتی نوار خاموش است.
- `frontend/src/pages/AdminHeaderFooter.tsx`: بخش «منوی پایین موبایل» + هندلرها + اعتبارسنجی فرم (ردیف نیمه‌کاره و کمتر از دو میان‌بر رد می‌شود).
- `frontend/src/styles/storefront-extras.css` + `components/Layout.tsx`: `--mobile-nav-fab`/`--mobile-nav-fab-ring`/`--mobile-nav-notch`/`--mobile-nav-slot`، `.mobile-nav-shell` (سایه با گرادیان) و `.mobile-nav-surface` (شیشه + قوس `mask`)، `.mobile-nav-group`، `.mobile-fab-logo` و هم‌گام‌شدن `.mobile-nav-spacer` با تنظیم نوار.

## ۲. تأییدها

- ✅ بک‌اند: `php artisan test --filter=HeaderFooterTest` → **۱۵ پاس / ۱۰۷ assertion** (۶ تست جدید: پیش‌فرض‌های عمومی نوار، ویرایش و تازه‌شدن کش، رد آیکن ناشناخته و کمینهٔ ردیف، حالت link بدون نشانی، آپلود لوگو + پاک‌شدن فایل قبلی، رد فایل غیرتصویری و ۴۰۱ مهمان).
- ✅ فرانت: `npx tsc --noEmit` سبز · `npm run lint` (oxlint) **۰ خطا / ۲۲۲ فایل** · `npm run build` سبز (۲۲۱۴ ماژول).
- ✅ کل تست‌های بک‌اند: `php artisan test` → **۵۸۸ پاس / ۲۹۸۶ assertion** (۵۶ ثانیه).
- ❌ **تست فرانت اجرا نمی‌شود** (بلاکر محیطی Vitest **5.1.0** + Vite **8.3.0**)؛ ۴ تست جدید در `MobileBottomNav.test.tsx` نوشته شد (جمعاً ۱۱ تست نوار) و بعد از رفع بلاکر باید اجرا شوند.
- ⏳ **بازبینی چشمی (مدیر):** نوار در ۳۲۰/۳۷۵/۴۱۴px، قوس وسط و جدا‌شدن دایره، لوگو داخل دکمه، عدم تداخل با فوتر/ویجت‌ها، دارک‌مود و ویرایش منو از پنل.

## ۳. کارهای باقی‌مانده

1. **بلاکر تست فرانت:** نسخهٔ Vitest و Vite را هم‌تراز کنید و `npm run test` را اجرا کنید (۱۱ تست نوار و بقیهٔ تست‌ها).
2. **دیپلوی (انجام‌نشده):** `cd backend; php artisan migrate --force` (مایگریشن ۱.۵۲) + آپلود بک‌اند + `cd frontend; npm run build` روی سرور؛ پوشهٔ `storage/app/public/mobile-nav` باید قابل نوشتن باشد.
3. **پاک‌سازی:** فایل موقت `%TEMP%\d55.txt` و وضعیت دو فایل کامیت‌نشدهٔ `frontend/src/styles/jalali-picker.css` و `frontend/public/images/Untitled-1.jpg` از مدیر پرسیده شود.

## ۴. فایل‌های مهم این تسک

`backend/app/Models/StoreSetting.php` · `backend/app/Http/Controllers/Api/HeaderFooterController.php` · `backend/routes/api.php` · `backend/config/media.php` · `backend/tests/Feature/HeaderFooterTest.php` · `frontend/src/services/headerFooter.ts` · `frontend/src/components/MobileBottomNav.tsx` (+ `MobileBottomNav.test.tsx`) · `frontend/src/components/Layout.tsx` · `frontend/src/pages/AdminHeaderFooter.tsx` · `frontend/src/styles/storefront-extras.css`.

## ۵. دستورهای تأیید

`cd backend; php artisan test --filter=HeaderFooterTest` · `cd frontend; npx tsc --noEmit` · `npm run lint` · `npm run test` (تا رفع بلاکر جر نمی‌شود) · `npm run build`.

## ۶. تصمیم‌های فنی که باید حفظ شوند

- **یک نقطهٔ ذخیره:** میان‌برها، «دسترسی سریع» و لوگوی دکمهٔ شناور فقط در کلیدهای `mobile_nav_*` + `GET /header-footer` + کش `behrang-shop-storefront-header-footer` هستند. صفحهٔ جدید ساخته نشد؛ طبق قاعدهٔ ۶ AGENTS این قابلیت داخل صفحهٔ موجود «هدر و فوتر» است و آیتم سایدبار/گارد تازه نمی‌خواهد.
- **فهرست آیکن مجاز سه‌جا همگام بماند:** `NAV_ICONS` (کنترلر) ↔ `MOBILE_NAV_ICONS` (سرویس فرانت) ↔ `NAV_ICON_COMPONENTS` (کامپوننت).
- **ردیف‌های ثابت:** «جست‌وجو در فروشگاه» (فوکوس روی `HEADER_SEARCH_INPUT_ID`) و «بخش ویژهٔ ۱۸+» عمداً از پنل ویرایش نمی‌شوند.
- **قاعدهٔ `/account`:** در ردیف‌های «دسترسی سریع»، این نشانی برای مهمان به `/login` می‌رود (هم در `MobileBottomNav` و هم در متن راهنمای پنل/`SITE_GUIDE` ثبت شده).
- **قوس وسط و ظاهر شیشه‌ای:** شعاع قوس از خود دکمه ساخته می‌شود (`--mobile-nav-fab` + `--mobile-nav-fab-ring` → `--mobile-nav-notch`) و مرکز دکمه روی خط بالای نوار است؛ جای خالی وسط (`--mobile-nav-slot`) با `flex: 0 0 auto` ثابت است تا تب‌های کنار قوس داخل بریدگی نروند. `backdrop-filter` شیشه روی `.mobile-nav-surface` است و **هیچ والدی نباید `filter`/`mask` بگیرد** (backdrop root → شیشه بی‌اثر)؛ سایهٔ نرم با گرادیان روی `.mobile-nav-shell::before` است.
- **مدیا:** پوشهٔ `mobile-nav` در نقشهٔ `media:prune` نیست (مسیر در *مقدار* `store_settings` است)؛ پاک‌سازی تعویض لوگو در کنترلر انجام می‌شود (بدهی ۱۷ در §۱۴ سند).
- **قواعد نشکن AGENTS:** قیمت/موجودی فقط سرور، Idempotency سفارش، قواعد COD، همگام‌سازی `AdminRole.php` ↔ `adminPermissions.ts`، کلیدهای localStorage از `storageKeys.ts` و به‌روزرسانی همان‌لحظهٔ `TECHNICAL_GUIDE.md`/`Start.txt`.