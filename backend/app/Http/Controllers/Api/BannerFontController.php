<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BannerFont;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * فونتهای سفارشی بنر برای فروشگاه.
 */
class BannerFontController extends Controller
{
    /**
     * کلید کش فهرست فونتهای فعال فروشگاه.
     * با هر تغییر در پنل مدیران پاک میشود.
     */
    public const STOREFRONT_CACHE_KEY = 'storefront.banner-fonts.index.v1';

    public function index(): JsonResponse
    {
        $fonts = Cache::remember(
            self::STOREFRONT_CACHE_KEY,
            now()->addMinutes(30),
            fn (): array => BannerFont::query()
                ->active()
                ->orderBy('name')
                ->orderBy('id')
                ->get()
                ->map(fn (BannerFont $font): array => $font->toPublicArray())
                ->all()
        );

        return response()->json([
            'success' => true,
            'data' => $fonts,
        ]);
    }

    /**
     * سرو فایل فونت بارگذاریشده.
     *
     * فونتها باید از همین دامنه API خوانده شوند تا هدر CORS داشته باشند.
     * اگر مرورگر فونت را از دامنه دیگر و بدون CORS بخواهد آن را مسدود میکند
     * و متن با فونت پیشفرض نمایش داده میشود.
     */
    public function file(BannerFont $bannerFont): BinaryFileResponse
    {
        abort_unless($bannerFont->source === 'upload' && $bannerFont->file_path, 404);

        $disk = Storage::disk('public');

        abort_unless($disk->exists($bannerFont->file_path), 404);

        $mimeTypes = [
            'woff2' => 'font/woff2',
            'woff' => 'font/woff',
            'ttf' => 'font/ttf',
            'otf' => 'font/otf',
        ];

        $format = strtolower((string) (
            $bannerFont->file_format ?: pathinfo($bannerFont->file_path, PATHINFO_EXTENSION)
        ));

        return response()->file($disk->path($bannerFont->file_path), [
            'Content-Type' => $mimeTypes[$format] ?? 'application/octet-stream',
            'Cache-Control' => 'public, max-age=31536000, immutable',
            'Access-Control-Allow-Origin' => '*',
        ]);
    }
}
