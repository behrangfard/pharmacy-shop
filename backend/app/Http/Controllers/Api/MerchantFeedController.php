<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\StoreSetting;
use App\Support\StorefrontCache;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use SimpleXMLElement;

/**
 * فید محصولات برای Google Merchant Center / Shopping (Free listings).
 *
 * مسیر عمومی `GET /feed/google-merchant.xml` (بدون پیشوند API) یک سند RSS 2.0
 * با فضای‌نام `g:` می‌دهد؛ گوگل همین آدرس را به‌عنوان منبع فید ثبت می‌کند.
 * قواعد:
 * - فقط محصولات فعال (`is_active = true`) می‌آیند.
 * - قیمت‌ها در فروشگاه تومان ذخیره می‌شوند ولی فید باید واحد ISO 4217 داشته
 *   باشد؛ مثل GA4 (`utils/analytics.ts`) با ضریب ۱۰ به ریال تبدیل می‌شوند.
 * - GTIN نداریم؛ به‌جای آن `g:mpn` از `sku` و `g:identifier_exists=no` می‌آید
 *   تا فید رد نشود.
 * - هزینهٔ ارسال همان قاعدهٔ `OrderController@resolveShippingCost` است.
 * - خروجی ۳۰ دقیقه کش می‌شود و `StorefrontCacheObserver` از طریق
 *   `StorefrontCache::flushCatalog()/flushSettings()` آن را زودتر پاک می‌کند.
 */
class MerchantFeedController extends Controller
{
    /** فضای‌نام مشخصه‌های Google Merchant در RSS 2.0. */
    private const G_NAMESPACE = 'http://base.google.com/ns/1.0';

    /** مدت اعتبار کش فید (ثانیه)؛ تغییر کاتالوگ/تنظیمات زودتر پاکش می‌کند. */
    private const FEED_CACHE_SECONDS = 1800;

    /** سقف طول عنوان و توضیح طبق راهنمای Merchant. */
    private const TITLE_MAX_LENGTH = 150;

    private const DESCRIPTION_MAX_LENGTH = 5000;

    /** حداکثر تصویر اضافی هر آیتم (علاوه بر image_link). */
    private const MAX_ADDITIONAL_IMAGES = 10;

    /** قیمت‌های فروشگاه تومان است؛ فید ریال (IRR) می‌خواهد. */
    private const TOMAN_TO_RIAL = 10;

    /**
     * سند XML فید (کش‌شده روی دیسک/کش پیش‌فرض Laravel).
     */
    public function index(): Response
    {
        $xml = Cache::remember(
            StorefrontCache::MERCHANT_FEED_CACHE_KEY,
            self::FEED_CACHE_SECONDS,
            fn (): string => $this->buildFeed()
        );

        return response($xml, 200)
            ->header('Content-Type', 'application/xml; charset=UTF-8')
            ->header('Cache-Control', 'public, max-age=600');
    }

    /**
     * ساخت کل سند فید از محصولات فعال و تنظیمات فروشگاه.
     */
    private function buildFeed(): string
    {
        $settings = StoreSetting::publicSettings();
        $frontendUrl = rtrim((string) config('app.frontend_url'), '/');

        $storeName = trim((string) ($settings['store_name'] ?? ''));
        if ($storeName === '') {
            $storeName = (string) config('app.name', 'Store');
        }

        $xml = new SimpleXMLElement(
            '<?xml version="1.0" encoding="UTF-8"?>'
            .'<rss version="2.0" xmlns:g="'.self::G_NAMESPACE.'"/>'
        );

        $channel = $xml->addChild('channel');
        $channel->addChild('title', $storeName.' — فید محصولات');
        $channel->addChild('link', $frontendUrl);
        $channel->addChild(
            'description',
            'فید محصولات فعال فروشگاه برای Google Merchant Center / Shopping.'
        );

        $products = Product::query()
            ->where('is_active', true)
            ->with([
                'category',
                'brand',
                'images' => function ($query) {
                    // همان ترتیب کارت محصول در فرانت: تصویر اصلی، بعد sort_order.
                    $query
                        ->orderByDesc('is_primary')
                        ->orderBy('sort_order')
                        ->orderBy('id');
                },
            ])
            ->orderBy('id')
            ->get();

        foreach ($products as $product) {
            $this->addItem($channel, $product, $frontendUrl, $storeName, $settings);
        }

        return (string) $xml->asXML();
    }

    /**
     * یک `<item>` معادل یک محصول در فید.
     *
     * @param  array<string, mixed>  $settings  تنظیمات عمومی فروشگاه
     */
    private function addItem(
        SimpleXMLElement $channel,
        Product $product,
        string $frontendUrl,
        string $storeName,
        array $settings
    ): void {
        $basePrice = (float) $product->price;
        $finalPrice = (float) $product->final_price;

        $item = $channel->addChild('item');

        $this->g($item, 'id', (string) $product->id);
        $this->g($item, 'title', $this->cleanText(
            (string) $product->name,
            self::TITLE_MAX_LENGTH
        ));

        /*
         * توضیح: اول متن کامل، بعد خلاصه و در نهایت نام محصول تا عنصر خالی
         * نماند (گوگل توضیح خالی را رد می‌کند).
         */
        $description = $this->cleanText(
            (string) ($product->description ?: $product->short_description ?: ''),
            self::DESCRIPTION_MAX_LENGTH
        );

        $this->g($item, 'description', $description !== ''
            ? $description
            : $this->cleanText((string) $product->name, self::DESCRIPTION_MAX_LENGTH));

        $this->g($item, 'link', $frontendUrl.'/product/'.$product->slug);

        $imageUrls = $product->images
            ->pluck('path')
            ->map(fn ($path) => $this->absoluteImageUrl((string) $path, $frontendUrl))
            ->filter()
            ->values();

        // همان اولویت صفحهٔ محصول: thumbnail، بعد تصویر is_primary و بعد اولین.
        $mainImage = $this->absoluteImageUrl((string) ($product->thumbnail ?? ''), $frontendUrl)
            ?? $imageUrls->first();

        $this->g($item, 'image_link', $mainImage);

        if ($mainImage !== null) {
            // گوگل تا ۱۰ تصویر اضافی می‌پذیرد؛ هر آدرس یک عنصر جدا.
            $imageUrls
                ->reject(fn (string $url) => $url === $mainImage)
                ->take(self::MAX_ADDITIONAL_IMAGES)
                ->each(fn (string $url) => $this->g($item, 'additional_image_link', $url));
        }

        // قیمت پایه همیشه می‌آید؛ تخفیف به‌صورت sale_price اعلام می‌شود.
        $this->g($item, 'price', $this->money($basePrice));

        if ($finalPrice < $basePrice) {
            $this->g($item, 'sale_price', $this->money($finalPrice));
        }

        $this->g($item, 'availability', $product->stock > 0 ? 'in_stock' : 'out_of_stock');
        // گوگل برای کالاهای بدون GTIN «برند» را اجباری می‌کند؛ بی‌برند = نام فروشگاه.
        $this->g($item, 'brand', (string) ($product->brand?->name ?: $storeName));
        // شناسهٔ کالا همان SKU است؛ GTIN نداریم.
        $this->g($item, 'mpn', (string) $product->sku);
        $this->g($item, 'condition', 'new');
        $this->g($item, 'identifier_exists', 'no');

        if ($product->category?->name) {
            $this->g($item, 'product_type', $this->cleanText(
                (string) $product->category->name,
                self::TITLE_MAX_LENGTH
            ));
        }

        $shipping = $item->addChild('shipping', null, self::G_NAMESPACE);
        $shipping->addChild('g:country', 'IR', self::G_NAMESPACE);
        $this->g($shipping, 'price', $this->money(
            $this->shippingCost($finalPrice, $settings)
        ));
    }

    /**
     * افزودن مشخصهٔ `g:` فقط وقتی مقدار غیرخالی دارد.
     *
     * عنصر خالی در فید Merchant هشدار/خطا می‌سازد؛ به‌همین دلیل فیلدهای
     * اختیاری (sku، تصویر، دسته) در صورت نبود مقدار حذف می‌شوند.
     */
    private function g(SimpleXMLElement $parent, string $name, ?string $value): void
    {
        if ($value === null || trim($value) === '') {
            return;
        }

        $parent->addChild('g:'.$name, $value, self::G_NAMESPACE);
    }

    /**
     * متن ساده و کوتاه‌شده برای فید (حذف HTML، فشرده‌سازی فاصله‌ها).
     */
    private function cleanText(string $value, int $maxLength): string
    {
        $text = html_entity_decode(
            strip_tags($value),
            ENT_QUOTES | ENT_HTML5,
            'UTF-8'
        );

        $text = preg_replace('/\s+/u', ' ', $text) ?? '';
        $text = trim($text);

        return mb_substr($text, 0, $maxLength);
    }

    /**
     * آدرس مطلق تصویر؛ گوگل آدرس نسبی را نمی‌پذیرد.
     *
     * مسیرهای خام در دیسک public بک‌اند هستند (`/storage/...`)، ولی مسیرهایی
     * که با `/` شروع می‌شوند تصاویر آمادهٔ فرانت‌اندند (`/images/...`) و روی
     * دامنهٔ SPA سرو می‌شوند.
     */
    private function absoluteImageUrl(string $path, string $frontendUrl): ?string
    {
        $path = trim($path);

        if ($path === '') {
            return null;
        }

        if (Str::startsWith($path, ['http://', 'https://'])) {
            return $path;
        }

        if (Str::startsWith($path, '/')) {
            return $frontendUrl.$path;
        }

        return url('storage/'.$path);
    }

    /**
     * هزینهٔ ارسال این قلم به تومان؛ همان قاعدهٔ `OrderController`.
     *
     * @param  array<string, mixed>  $settings
     */
    private function shippingCost(float $finalPrice, array $settings): float
    {
        $freeShippingEnabled = filter_var(
            (string) ($settings['free_shipping_enabled'] ?? '0'),
            FILTER_VALIDATE_BOOL
        );
        $threshold = (float) ($settings['free_shipping_threshold'] ?? 0);

        if ($freeShippingEnabled && $threshold > 0 && $finalPrice >= $threshold) {
            return 0.0;
        }

        return round(max((float) ($settings['shipping_cost'] ?? 0), 0), 2);
    }

    /**
     * مبلغ تومانی به رشتهٔ «ریال + واحد» برای فید.
     */
    private function money(float $toman): string
    {
        $rial = (int) round($toman * self::TOMAN_TO_RIAL);

        return $rial.' IRR';
    }
}
