<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ContactChannel;
use App\Support\ContactLinks;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\ValidationException;

/**
 * مدیریت کانال‌های ارتباطی فروشگاه (تلگرام، واتساپ، بله، ایتا، اینستاگرام).
 *
 * پنل فقط ردیف‌های ثابت هر پلتفرم را ویرایش می‌کند (ساخت/حذف ردیف لازم نیست)؛
 * لینک‌های واردشده پیش از ذخیره به آدرس کامل https تبدیل می‌شوند تا در سایت
 * نیازی به منطق اضافه نباشد. هر نوشتن، کش عمومی را پاک می‌کند.
 */
class AdminContactChannelController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => ContactChannel::query()
                ->orderBy('sort_order')
                ->orderBy('id')
                ->get(),
        ]);
    }

    public function update(Request $request, ContactChannel $contactChannel): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:80'],
            'description' => ['nullable', 'string', 'max:255'],
            'join_url' => ['nullable', 'string', 'max:2048'],
            'join_label' => ['nullable', 'string', 'max:60'],
            'chat_url' => ['nullable', 'string', 'max:2048'],
            'chat_label' => ['nullable', 'string', 'max:60'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:9999'],
            'is_active' => ['sometimes', 'boolean'],
        ], [
            'title.required' => 'عنوان کانال را وارد کنید.',
            'title.max' => 'عنوان کانال حداکثر ۸۰ نویسه می‌تواند باشد.',
            'description.max' => 'توضیح کانال حداکثر ۲۵۵ نویسه می‌تواند باشد.',
            'join_url.max' => 'لینک عضویت بیش از حد بلند است.',
            'chat_url.max' => 'لینک ارسال پیام بیش از حد بلند است.',
            'join_label.max' => 'برچسب دکمهٔ عضویت حداکثر ۶۰ نویسه می‌تواند باشد.',
            'chat_label.max' => 'برچسب دکمهٔ ارسال پیام حداکثر ۶۰ نویسه می‌تواند باشد.',
            'sort_order.integer' => 'ترتیب نمایش باید عدد باشد.',
            'sort_order.min' => 'ترتیب نمایش نمی‌تواند منفی باشد.',
        ]);

        $joinInput = $validated['join_url'] ?? null;
        $chatInput = $validated['chat_url'] ?? null;

        $joinUrl = ContactLinks::joinUrl($joinInput, $contactChannel->key);
        $chatUrl = ContactLinks::chatUrl($chatInput, $contactChannel->key);

        $errors = [];

        if (filled($joinInput) && $joinUrl === null) {
            $errors['join_url'] = [
                'لینک عضویت قابل تشخیص نیست؛ لینک کامل (https://...) یا نام کاربری/آیدی را وارد کنید.',
            ];
        }

        if (filled($chatInput) && $chatUrl === null) {
            $errors['chat_url'] = [
                'لینک ارسال پیام قابل تشخیص نیست؛ لینک کامل (https://...) یا شماره/نام کاربری را وارد کنید.',
            ];
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        $contactChannel->update([
            'title' => trim($validated['title']),
            'description' => $this->nullableTrim($validated['description'] ?? null),
            'join_url' => $joinUrl,
            'join_label' => $this->nullableTrim($validated['join_label'] ?? null),
            'chat_url' => $chatUrl,
            'chat_label' => $this->nullableTrim($validated['chat_label'] ?? null),
            'sort_order' => (int) ($validated['sort_order'] ?? 0),
            'is_active' => (bool) ($validated['is_active'] ?? $contactChannel->is_active),
        ]);

        Cache::forget(ContactChannelController::STOREFRONT_CACHE_KEY);

        return response()->json([
            'success' => true,
            'message' => 'کانال ارتباطی «' . $contactChannel->title . '» ذخیره شد.',
            'data' => $contactChannel->fresh(),
        ]);
    }

    public function updateStatus(Request $request, ContactChannel $contactChannel): JsonResponse
    {
        $validated = $request->validate([
            'is_active' => ['required', 'boolean'],
        ], [
            'is_active.required' => 'وضعیت کانال را مشخص کنید.',
        ]);

        $contactChannel->update(['is_active' => $validated['is_active']]);

        Cache::forget(ContactChannelController::STOREFRONT_CACHE_KEY);

        return response()->json([
            'success' => true,
            'message' => $validated['is_active']
                ? 'کانال ارتباطی فعال شد.'
                : 'کانال ارتباطی غیرفعال شد.',
            'data' => $contactChannel->fresh(),
        ]);
    }

    private function nullableTrim(?string $value): ?string
    {
        $value = trim((string) $value);

        return $value === '' ? null : $value;
    }
}
