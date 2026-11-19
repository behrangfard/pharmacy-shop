<?php

namespace App\Providers;

use App\Models\AnnouncementBarItem;
use App\Models\Banner;
use App\Models\BannerFont;
use App\Models\BannerSection;
use App\Models\Brand;
use App\Models\Category;
use App\Models\ContactChannel;
use App\Models\Popup;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\StoreSetting;
use App\Models\Story;
use App\Models\TrustBadge;
use App\Observers\StorefrontCacheObserver;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureRateLimiters();
        $this->registerStorefrontCacheObservers();
    }

    /**
     * پاک‌سازی خودکار کش ویترین با تغییر داده‌ها.
     *
     * کنترلرهای پنل هم کش را پاک می‌کنند؛ این observer حالت‌هایی را پوشش می‌دهد
     * که داده بیرون از پنل عوض می‌شود (tinker، سیدر، کامند و سرویس‌های داخلی).
     */
    private function registerStorefrontCacheObservers(): void
    {
        foreach ([
            Product::class,
            ProductVariant::class,
            Category::class,
            Brand::class,
            Banner::class,
            BannerSection::class,
            BannerFont::class,
            AnnouncementBarItem::class,
            Popup::class,
            Story::class,
            TrustBadge::class,
            ContactChannel::class,
            StoreSetting::class,
        ] as $model) {
            $model::observe(StorefrontCacheObserver::class);
        }
    }

    /**
     * محدودیت نرخ مسیرهای حساس.
     *
     * پیش‌فرض فریم‌ورک بدون `throttleApi()` هیچ محدودیتی روی API ندارد؛ این
     * دو محدودیت روی مسیرهای احراز هویت و ثبت سفارش اعمال می‌شوند تا
     * brute-force و اسپم سفارش گرفته شود. قفل حسابِ تلاش‌های ناموفق در
     * `AuthController::login` انجام می‌شود.
     */
    private function configureRateLimiters(): void
    {
        $tooMany = fn (): JsonResponse => response()->json([
            'success' => false,
            'message' => 'تعداد درخواست‌ها بیش از حد مجاز است. لطفاً کمی بعد دوباره تلاش کنید.',
        ], 429);

        RateLimiter::for('auth', function (Request $request) use ($tooMany) {
            return Limit::perMinute(15)
                ->by('auth-ip:'.$request->ip())
                ->response($tooMany);
        });

        RateLimiter::for('orders', function (Request $request) use ($tooMany) {
            // مسیر ثبت سفارش عمومی است؛ کاربر را از گارد Sanctum می‌خوانیم
            // تا سهمیهٔ هر کاربر (نه فقط IP) برای درخواست‌های دارای توکن اعمال شود.
            $identifier = $request->user('sanctum')?->getAuthIdentifier()
                ?? $request->ip();

            return Limit::perMinute(20)
                ->by('orders:'.$identifier)
                ->response($tooMany);
        });
    }
}

