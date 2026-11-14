<?php

namespace App\Models;

use App\Services\Messaging\Support\PhoneNumber;
use App\Support\OrderStatus;
use Illuminate\Database\Eloquent\Model;

class Coupon extends Model
{
    public const TYPE_PERCENT = 'percent';
    public const TYPE_FIXED = 'fixed';

    protected $fillable = [
        'code',
        'title',
        'type',
        'value',
        'min_order_total',
        'max_discount',
        'usage_limit',
        'per_user_limit',
        'used_count',
        'starts_at',
        'expires_at',
        'is_active',
    ];

    protected $casts = [
        'value' => 'decimal:2',
        'min_order_total' => 'decimal:2',
        'max_discount' => 'decimal:2',
        'usage_limit' => 'integer',
        'per_user_limit' => 'integer',
        'used_count' => 'integer',
        'starts_at' => 'datetime',
        'expires_at' => 'datetime',
        'is_active' => 'boolean',
    ];

    public static function normalizeCode(string $code): string
    {
        return strtoupper(trim($code));
    }

    /**
     * کد تخفیف فعال و در بازه زمانی را پیدا می‌کند.
     */
    public static function findUsable(?string $code): ?self
    {
        if ($code === null || trim($code) === '') {
            return null;
        }

        return static::query()
            ->where('code', self::normalizeCode($code))
            ->where('is_active', true)
            ->where(function ($query) {
                $query
                    ->whereNull('starts_at')
                    ->orWhere('starts_at', '<=', now());
            })
            ->where(function ($query) {
                $query
                    ->whereNull('expires_at')
                    ->orWhere('expires_at', '>=', now());
            })
            ->first();
    }

    /**
     * دلیل نامعتبر بودن کد برای مبلغ سبد خرید (یا null اگر معتبر باشد).
     */
    public function validationError(float $subtotal): ?string
    {
        if ($this->usage_limit !== null && $this->used_count >= $this->usage_limit) {
            return 'ظرفیت استفاده از این کد تخفیف به پایان رسیده است.';
        }

        if ((float) $this->min_order_total > 0 && $subtotal < (float) $this->min_order_total) {
            $minimum = number_format((float) $this->min_order_total);

            return "این کد تخفیف برای سبد خرید بالای {$minimum} تومان قابل استفاده است.";
        }

        return null;
    }

    /**
     * دلیل رسیدن کاربر به سقف استفادهٔ شخصی (یا null اگر مجاز باشد).
     *
     * سفارش‌های لغوشده و مستردشده شمرده نمی‌شوند تا اگر مشتری سفارشش را لغو
     * کرد، سهمیهٔ او آزاد شود. این بررسی فقط مبنای «نمایش/اعتبارسنجی» است؛
     * تصمیم نهایی داخل تراکنش ثبت سفارش گرفته می‌شود.
     */
    public function perUserUsageError(?int $userId): ?string
    {
        // برای مهمان user_id وجود ندارد؛ محدودیت شمارهٔ تماس را ببینید.
        if ($this->per_user_limit === null || $userId === null) {
            return null;
        }

        $used = Order::query()
            ->where('user_id', $userId)
            ->where('coupon_code', $this->code)
            ->whereNotIn('status', [OrderStatus::CANCELLED, 'refunded'])
            ->count();

        return $this->perUserLimitExceededError($used, 'کاربر');
    }

    /**
     * دلیل رسیدن یک شمارهٔ تماس به سقف استفادهٔ شخصی (یا null اگر مجاز باشد).
     *
     * سفارش مهمان حساب کاربری ندارد؛ برای جلوگیری از استفادهٔ بی‌نهایت همان
     * کد، سهمیه به شمارهٔ تماس سفارش بسته می‌شود. مقایسه روی شکل نرمال‌شده
     * انجام می‌شود (ارقام لاتین، بدون فاصله/خط تیره) تا «۰۹۱۲…» و «0912…» دو
     * هویت جدا حساب نشوند.
     */
    public function perPhoneUsageError(?string $phone): ?string
    {
        if ($this->per_user_limit === null) {
            return null;
        }

        $normalizedPhone = PhoneNumber::normalize($phone);

        if ($normalizedPhone === '') {
            return null;
        }

        /*
         * شماره‌ها ممکن است با ارقام فارسی یا قالب متفاوت ذخیره شده باشند؛
         * مقایسهٔ نهایی در PHP و روی شکل نرمال‌شده انجام می‌شود تا «۰۹۱۲…» و
         * «0912…» یک هویت حساب شوند.
         */
        $used = Order::query()
            ->whereNull('user_id')
            ->where('coupon_code', $this->code)
            ->whereNotIn('status', [OrderStatus::CANCELLED, 'refunded'])
            ->whereNotNull('phone')
            ->pluck('phone')
            ->filter(
                fn ($stored): bool => PhoneNumber::normalize((string) $stored)
                    === $normalizedPhone
            )
            ->count();

        return $this->perUserLimitExceededError($used, 'شماره تماس');
    }

    /**
     * پیام خطای رسیدن به سقف شخصی با توجه به تعداد مجاز.
     */
    private function perUserLimitExceededError(int $used, string $subject): ?string
    {
        if ($used < (int) $this->per_user_limit) {
            return null;
        }

        return (int) $this->per_user_limit === 1
            ? "این کد تخفیف برای هر {$subject} فقط یک بار قابل استفاده است."
            : "این کد تخفیف برای هر {$subject} حداکثر "
                .number_format((int) $this->per_user_limit)
                .' بار قابل استفاده است.';
    }

    /**
     * مبلغ تخفیف این کد برای مبلغ سبد خرید.
     */
    public function calculateDiscount(float $subtotal): float
    {
        if ($subtotal <= 0) {
            return 0.0;
        }

        $discount = $this->type === self::TYPE_FIXED
            ? (float) $this->value
            : $subtotal * (float) $this->value / 100;

        if ($this->max_discount !== null) {
            $discount = min($discount, (float) $this->max_discount);
        }

        return round(min(max($discount, 0), $subtotal), 2);
    }
}
