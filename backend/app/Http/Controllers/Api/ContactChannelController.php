<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ContactChannel;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

/**
 * کانال‌های ارتباطی فروشگاه برای سایت (تلگرام، واتساپ، بله، ایتا، اینستاگرام).
 *
 * پاسخ سبک است (فقط فیلدهای نمایشی) و مثل نشان‌های اعتماد ۱۰ دقیقه کش می‌شود؛
 * با هر تغییر در پنل مدیران کلید کش پاک می‌شود تا لینک تازه بلافاصله دیده شود.
 *
 * نکتهٔ مهم (همان درس بنرها و نشان‌ها): در کش باید «آرایه» ذخیره شود، نه
 * Collection eloquent؛ در غیر این صورت مقدار بازیابی‌شده در درایورهای
 * file/database به __PHP_Incomplete_Class تبدیل می‌شود.
 */
class ContactChannelController extends Controller
{
    /** کلید کش فهرست کانال‌ها؛ با هر تغییر در پنل مدیران پاک می‌شود. */
    public const STOREFRONT_CACHE_KEY = 'storefront.contact-channels.v1';

    public function index(): JsonResponse
    {
        $channels = Cache::remember(
            self::STOREFRONT_CACHE_KEY,
            now()->addMinutes(10),
            fn (): array => ContactChannel::query()
                ->orderBy('sort_order')
                ->orderBy('id')
                ->get()
                ->toArray()
        );

        return response()->json([
            'success' => true,
            'data' => $this->visibleChannels($channels),
        ]);
    }

    /**
     * فقط کانال‌های فعالی که دست‌کم یک لینک دارند.
     *
     * @param  array<int, array<string, mixed>>  $channels
     * @return array<int, array<string, mixed>>
     */
    private function visibleChannels(array $channels): array
    {
        $visible = [];

        foreach ($channels as $channel) {
            if (! ($channel['is_active'] ?? false)) {
                continue;
            }

            $joinUrl = trim((string) ($channel['join_url'] ?? ''));
            $chatUrl = trim((string) ($channel['chat_url'] ?? ''));

            // کانال بدون هیچ لینکی روی سایت رندر نمی‌شود تا دکمهٔ خالی
            // یا آیکن بی‌مقصد نمایش داده نشود.
            if ($joinUrl === '' && $chatUrl === '') {
                continue;
            }

            $visible[] = [
                'key' => (string) ($channel['key'] ?? ''),
                'title' => trim((string) ($channel['title'] ?? '')),
                'description' => trim((string) ($channel['description'] ?? '')),
                'join_url' => $joinUrl === '' ? null : $joinUrl,
                'join_label' => filled($channel['join_label'] ?? null)
                    ? trim((string) $channel['join_label'])
                    : null,
                'chat_url' => $chatUrl === '' ? null : $chatUrl,
                'chat_label' => filled($channel['chat_label'] ?? null)
                    ? trim((string) $channel['chat_label'])
                    : null,
            ];
        }

        return $visible;
    }
}
