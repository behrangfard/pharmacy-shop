<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Banner;
use App\Models\BannerSection;
use App\Models\StoreSetting;
use App\Support\BannerText;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class AdminBannerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'position' => ['nullable', Rule::in(Banner::POSITIONS)],
        ]);

        $banners = Banner::query()
            ->when(
                $validated['position'] ?? null,
                fn ($query, $position) => $query->where('position', $position)
            )
            ->orderBy('sort_order')
            ->orderByDesc('id')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $banners,
        ]);
    }

    /**
     * تنظیمات بخش‌های بنر (چیدمان، عنوان، فعال/غیرفعال) + تعداد بنر هر بخش +
     * ظاهر مشترک همهٔ بنرها (گردی گوشه).
     */
    public function sections(): JsonResponse
    {
        // نصب‌های قدیمی ممکن است ردیف بخش را نداشته باشند؛ اینجا ساخته می‌شود.
        foreach (BannerSection::POSITIONS as $position) {
            BannerSection::forPosition($position);
        }

        $counts = Banner::query()
            ->selectRaw('position, COUNT(*) as aggregate')
            ->groupBy('position')
            ->pluck('aggregate', 'position');

        $sections = BannerSection::query()
            ->whereIn('position', BannerSection::POSITIONS)
            ->orderBy('id')
            ->get()
            ->map(fn (BannerSection $section): array => $this->sectionPayload(
                $section,
                (int) ($counts[$section->position] ?? 0)
            ))
            ->all();

        return response()->json([
            'success' => true,
            'data' => $sections,
            'appearance' => $this->appearancePayload(),
        ]);
    }

    /**
     * ذخیرهٔ ظاهر مشترک بنرها (گردی گوشه).
     * یک مقدار برای همهٔ بنرها: اسلایدر هیرو، بخش چندستونه و نوار بنرها.
     */
    public function updateAppearance(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'radius' => [
                'required',
                'integer',
                'min:'.StoreSetting::BANNER_RADIUS_MIN,
                'max:'.StoreSetting::BANNER_RADIUS_MAX,
            ],
        ]);

        StoreSetting::setValue(StoreSetting::BANNER_RADIUS_KEY, $validated['radius']);
        StoreSetting::forgetCache();

        $this->forgetStorefrontCache();

        return response()->json([
            'success' => true,
            'message' => 'ظاهر بنرها ذخیره شد.',
            'data' => $this->appearancePayload(),
        ]);
    }

    /**
     * شکل یکسان پاسخ «ظاهر بنرها» برای پنل مدیریت.
     */
    private function appearancePayload(): array
    {
        return [
            'radius' => StoreSetting::bannerRadius(),
            'radius_min' => StoreSetting::BANNER_RADIUS_MIN,
            'radius_max' => StoreSetting::BANNER_RADIUS_MAX,
        ];
    }

    /**
     * ذخیرهٔ چیدمان/عنوان یک بخش بنر.
     * position در مسیر می‌آید (مثل home_grid) تا مسیر وابسته به id نباشد.
     */
    public function updateSection(Request $request, string $position): JsonResponse
    {
        if (! in_array($position, BannerSection::POSITIONS, true)) {
            return response()->json([
                'success' => false,
                'message' => 'بخش بنر یافت نشد.',
            ], 404);
        }

        $validated = $request->validate([
            'layout' => ['sometimes', Rule::in(BannerSection::LAYOUTS)],
            'title' => ['nullable', 'string', 'max:255'],
            'subtitle' => ['nullable', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
            // سقف تعداد تصاویر؛ null یا 0 یعنی همه.
            'image_count' => ['nullable', 'integer', 'min:0', 'max:12'],
            // حداکثر ارتفاع هر نما به پیکسل؛ null یا 0 یعنی ارتفاع طبیعی تصویر.
            'height_desktop' => ['nullable', 'integer', 'min:0', 'max:1200'],
            'height_mobile' => ['nullable', 'integer', 'min:0', 'max:1200'],
            // contain = بدون برش و بدون بزرگ‌نمایی | cover = پرکردن کادر با برش.
            'fit' => ['sometimes', Rule::in(BannerSection::FITS)],
            // گردی گوشهٔ مخصوص همین بخش؛ null یعنی پیش‌فرض سراسری سایت.
            'radius' => [
                'nullable',
                'integer',
                'min:'.BannerSection::RADIUS_MIN,
                'max:'.BannerSection::RADIUS_MAX,
            ],
            // انیمیشن هاور بنرهای دسکتاپ (بالا و وسط صفحهٔ اول).
            'animation' => ['sometimes', Rule::in(BannerSection::ANIMATIONS)],
        ]);

        $section = BannerSection::forPosition($position);
        $section->update($validated);

        $this->forgetStorefrontCache();

        return response()->json([
            'success' => true,
            'message' => 'تنظیمات بخش بنر ذخیره شد.',
            'data' => $this->sectionPayload(
                $section->fresh(),
                Banner::query()->where('position', $section->position)->count()
            ),
        ]);
    }

    /**
     * شکل یکسان پاسخ بخش بنر برای پنل مدیریت.
     */
    private function sectionPayload(BannerSection $section, int $bannersCount): array
    {
        return [
            'position' => $section->position,
            'layout' => $section->normalizedLayout(),
            'layouts' => BannerSection::LAYOUTS,
            'slots' => $section->slots(),
            'title' => $section->title,
            'subtitle' => $section->subtitle,
            // تنظیمات ابعاد و تعداد تصاویر (برای اسلایدر هیرو و بخش چندستونه).
            'image_count' => (int) ($section->image_count ?? 0),
            'height_desktop' => (int) ($section->height_desktop ?? 0),
            'height_mobile' => (int) ($section->height_mobile ?? 0),
            'fit' => $section->normalizedFit(),
            'fits' => BannerSection::FITS,
            // گردی گوشهٔ همین بخش + پیش‌فرض سراسری (برای دکمهٔ «پیش‌فرض»).
            'radius' => $section->effectiveRadius(),
            'radius_default' => StoreSetting::bannerRadius(),
            'radius_custom' => $section->radius !== null,
            'radius_min' => BannerSection::RADIUS_MIN,
            'radius_max' => BannerSection::RADIUS_MAX,
            // انیمیشن هاور بنرهای این بخش + فهرست گزینه‌ها برای پنل مدیریت.
            'animation' => $section->normalizedAnimation(),
            'animations' => BannerSection::ANIMATIONS,
            'is_mobile' => $section->isMobile(),
            'is_active' => (bool) $section->is_active,
            'banners_count' => $bannersCount,
        ];
    }

    public function store(Request $request): JsonResponse
    {
        $banner = Banner::create($this->validateBanner($request));

        $this->forgetStorefrontCache();

        return response()->json([
            'success' => true,
            'message' => 'بنر با موفقیت ایجاد شد.',
            'data' => $banner,
        ], 201);
    }

    public function update(Request $request, Banner $banner): JsonResponse
    {
        $banner->update($this->validateBanner($request));

        $this->forgetStorefrontCache();

        return response()->json([
            'success' => true,
            'message' => 'بنر با موفقیت ویرایش شد.',
            'data' => $banner->fresh(),
        ]);
    }

    public function updateStatus(Request $request, Banner $banner): JsonResponse
    {
        $validated = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $banner->update(['is_active' => $validated['is_active']]);

        $this->forgetStorefrontCache();

        return response()->json([
            'success' => true,
            'message' => $validated['is_active']
                ? 'بنر فعال شد.'
                : 'بنر غیرفعال شد.',
            'data' => $banner->fresh(),
        ]);
    }

    /**
     * مرتب‌سازی بنرهای یک بخش (درگ‌ون‌دراپ/دکمه‌های بالا و پایین در پنل).
     *
     * فهرست idها به همان ترتیبی که مدیر می‌خواهد ذخیره می‌شود؛ فقط بنرهای
     * همان بخش جابه‌جا می‌شوند تا امکان جابه‌جایی بین بخش‌ها نباشد.
     */
    public function reorder(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'position' => ['required', Rule::in(Banner::POSITIONS)],
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer', 'distinct'],
        ]);

        $ids = array_map('intval', $validated['ids']);

        $valid = Banner::query()
            ->where('position', $validated['position'])
            ->whereIn('id', $ids)
            ->pluck('id')
            ->all();

        if (count($valid) !== count($ids)) {
            return response()->json([
                'success' => false,
                'message' => 'فهرست بنرها با این بخش هم‌خوانی ندارد.',
            ], 422);
        }

        foreach ($ids as $index => $id) {
            Banner::query()
                ->whereKey($id)
                ->update(['sort_order' => $index + 1]);
        }

        $this->forgetStorefrontCache();

        return response()->json([
            'success' => true,
            'message' => 'ترتیب بنرها ذخیره شد.',
            'data' => Banner::query()
                ->where('position', $validated['position'])
                ->orderBy('sort_order')
                ->orderByDesc('id')
                ->get(),
        ]);
    }

    public function destroy(Banner $banner): JsonResponse
    {
        $banner->delete();

        $this->forgetStorefrontCache();

        return response()->json([
            'success' => true,
            'message' => 'بنر حذف شد.',
        ]);
    }

    /**
     * بارگذاری تصویر بنر؛ مسیر ذخیره‌شده در فرم قرار می‌گیرد.
     */
    public function uploadImage(Request $request): JsonResponse
    {
        $request->validate([
            'image' => [
                'required',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:5120',
            ],
        ]);

        $path = $request->file('image')->store('banners', 'public');

        if (! $path) {
            return response()->json([
                'success' => false,
                'message' => 'بارگذاری تصویر انجام نشد.',
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'تصویر بنر بارگذاری شد.',
            'data' => [
                'path' => $path,
                'url' => Storage::disk('public')->url($path),
            ],
        ], 201);
    }

    private function forgetStorefrontCache(): void
    {
        Cache::forget(BannerController::STOREFRONT_CACHE_KEY);
    }

    /**
     * اعتبارسنجی و نرمال‌سازی داده‌های بنر.
     *
     * لایه‌های متن پیش از ذخیره با App\Support\BannerText محدود می‌شوند تا
     * موقعیت‌ها درصدی، رنگ‌ها هگز و متن‌ها ساده بمانند.
     */
    private function validateBanner(Request $request): array
    {
        $validated = $request->validate([
            'title' => ['nullable', 'string', 'max:255'],
            'subtitle' => ['nullable', 'string', 'max:255'],
            'image' => ['required', 'string', 'max:2048'],
            'mobile_image' => ['nullable', 'string', 'max:2048'],
            'image_alt' => ['nullable', 'string', 'max:255'],
            'text_scrim' => ['nullable', Rule::in(BannerText::SCRIMS)],
            'text_layers' => ['nullable', 'array', 'max:'.BannerText::MAX_LAYERS],
            'text_layers.*.id' => ['nullable', 'string', 'max:40'],
            'text_layers.*.text' => ['nullable', 'string', 'max:'.BannerText::MAX_TEXT_LENGTH],
            'text_layers.*.tag' => ['nullable', 'string', 'max:10'],
            'text_layers.*.align' => ['nullable', 'string', 'max:10'],
            'text_layers.*.shadow' => ['nullable', 'string', 'max:10'],
            'text_layers.*.font_family' => ['nullable', 'string', 'max:60'],
            'text_layers.*.font_weight' => ['nullable', 'integer'],
            'text_layers.*.x' => ['nullable', 'numeric'],
            'text_layers.*.y' => ['nullable', 'numeric'],
            'text_layers.*.x_mobile' => ['nullable', 'numeric'],
            'text_layers.*.y_mobile' => ['nullable', 'numeric'],
            'text_layers.*.width' => ['nullable', 'numeric'],
            'text_layers.*.width_mobile' => ['nullable', 'numeric'],
            'text_layers.*.font_size' => ['nullable', 'numeric'],
            'text_layers.*.font_size_mobile' => ['nullable', 'numeric'],
            'text_layers.*.line_height' => ['nullable', 'numeric'],
            'text_layers.*.letter_spacing' => ['nullable', 'numeric'],
            'text_layers.*.color' => ['nullable', 'string', 'max:20'],
            'text_layers.*.background' => ['nullable', 'string', 'max:20'],
            'text_layers.*.background_opacity' => ['nullable', 'numeric'],
            'text_layers.*.padding_x' => ['nullable', 'numeric'],
            'text_layers.*.padding_y' => ['nullable', 'numeric'],
            'text_layers.*.radius' => ['nullable', 'numeric'],
            'text_layers.*.italic' => ['nullable', 'boolean'],
            'text_layers.*.uppercase' => ['nullable', 'boolean'],
            'link' => ['nullable', 'string', 'max:2048'],
            'button_label' => ['nullable', 'string', 'max:60'],
            'position' => ['required', Rule::in(Banner::POSITIONS)],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
        ]);

        if (array_key_exists('text_layers', $validated)) {
            $validated['text_layers'] = BannerText::normalizeLayers($validated['text_layers']);
        }

        if (array_key_exists('text_scrim', $validated)) {
            $validated['text_scrim'] = BannerText::normalizeScrim($validated['text_scrim']);
        }

        /*
         * بنرهای مخصوص موبایل فقط یک تصویر دارند و در فروشگاه با تصویر موبایل
         * رندر می‌شوند؛ برای همین هر تصویری که ثبت شود در هر دو ستون
         * image و mobile_image ذخیره می‌شود تا پنل و فروشگاه یک تصویر ببینند.
         */
        if (Banner::isMobilePosition($validated['position'] ?? null)) {
            $image = $validated['image'] ?? null;
            $mobileImage = $validated['mobile_image'] ?? null;

            $validated['mobile_image'] = $mobileImage ?: $image;
            $validated['image'] = $image ?: $mobileImage;
        }

        return $validated;
    }
}
