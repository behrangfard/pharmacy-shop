<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BannerFont;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

/**
 * مدیریت کتابخانه فونت بنرها (مخصوص پنل مدیران).
 */
class AdminBannerFontController extends Controller
{
    public function index(): JsonResponse
    {
        $fonts = BannerFont::query()
            ->orderBy('name')
            ->orderBy('id')
            ->get()
            ->map(fn (BannerFont $font): array => $font->toPublicArray())
            ->all();

        return response()->json([
            'success' => true,
            'data' => $fonts,
        ]);
    }

    /**
     * افزودن فونت: یا فایل از سیستم مدیر یا نشانی بیرونی.
     */
    public function store(Request $request): JsonResponse
    {
        $source = $request->input('source');

        if (! in_array($source, BannerFont::SOURCES, true)) {
            $source = $request->hasFile('file') ? 'upload' : 'url';
        }

        $familyRules = ['string', 'max:60', 'regex:/^[A-Za-z0-9 _-]+$/'];

        $rules = [
            'name' => ['required', 'string', 'max:100'],
            'family' => $source === 'url'
                ? array_merge(['required'], $familyRules)
                : array_merge(['nullable'], $familyRules),
            'weight' => ['nullable', 'integer', Rule::in(BannerFont::WEIGHTS)],
            'style' => ['nullable', Rule::in(BannerFont::STYLES)],
        ];

        if ($source === 'upload') {
            $rules['file'] = [
                'required',
                'file',
                'max:5120',
                function ($attribute, $value, $fail): void {
                    if (! $value instanceof UploadedFile) {
                        $fail('فایل فونت معتبر نیست.');

                        return;
                    }

                    $extension = strtolower($value->getClientOriginalExtension());

                    if (! in_array($extension, BannerFont::FORMATS, true)) {
                        $fail('فرمت فونت باید یکی از woff2 یا woff یا ttf یا otf باشد.');
                    }
                },
            ];
        } else {
            $rules['external_url'] = ['required', 'string', 'max:2048', 'url'];
        }

        $validated = $request->validate($rules);

        $font = new BannerFont();
        $font->name = trim($validated['name']);
        $font->source = $source;
        $font->weight = (int) ($validated['weight'] ?? 400);
        $font->style = $validated['style'] ?? 'normal';
        $font->is_active = true;
        $font->family = trim((string) ($validated['family'] ?? ''));

        if ($source === 'upload') {
            $file = $validated['file'];
            $path = $file->store('banner-fonts', 'public');

            if (! $path) {
                return response()->json([
                    'success' => false,
                    'message' => 'بارگذاری فایل فونت انجام نشد.',
                ], 500);
            }

            $font->file_path = $path;
            $font->file_format = strtolower($file->getClientOriginalExtension());
        } else {
            $font->external_url = trim($validated['external_url']);
            $font->file_format = BannerFont::detectFormat($font->external_url);
        }

        $font->save();

        if ($font->family === '') {
            $font->family = 'BannerFont'.$font->id;
            $font->save();
        }

        $this->forgetStorefrontCache();

        return response()->json([
            'success' => true,
            'message' => 'فونت بنر ذخیره شد.',
            'data' => $font->fresh()->toPublicArray(),
        ], 201);
    }

    public function updateStatus(Request $request, BannerFont $bannerFont): JsonResponse
    {
        $validated = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $bannerFont->update(['is_active' => $validated['is_active']]);

        $this->forgetStorefrontCache();

        return response()->json([
            'success' => true,
            'message' => $validated['is_active'] ? 'فونت فعال شد.' : 'فونت غیرفعال شد.',
            'data' => $bannerFont->fresh()->toPublicArray(),
        ]);
    }

    public function destroy(BannerFont $bannerFont): JsonResponse
    {
        if ($bannerFont->file_path) {
            Storage::disk('public')->delete($bannerFont->file_path);
        }

        $bannerFont->delete();

        $this->forgetStorefrontCache();

        return response()->json([
            'success' => true,
            'message' => 'فونت حذف شد.',
        ]);
    }

    private function forgetStorefrontCache(): void
    {
        Cache::forget(BannerFontController::STOREFRONT_CACHE_KEY);
    }
}
