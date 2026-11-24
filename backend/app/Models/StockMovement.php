<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * یک ردیف از دفتر «گردش موجودی».
 *
 * هر تغییر موجودی (سفارش، بازگردانی سفارش، فاکتور خرید، ویرایش دستی، ایمپورت)
 * یک ردیف اینجا می‌سازد تا معلوم باشد موجودی چه زمانی، به چه علت و توسط چه
 * کسی کم یا زیاد شده است.
 */
class StockMovement extends Model
{
    use HasFactory;

    /** کاهش موجودی با ثبت سفارش. */
    public const TYPE_ORDER = 'order';

    /** بازگردانی موجودی با لغو/آزادسازی سفارش. */
    public const TYPE_ORDER_RESTORED = 'order_restored';

    /** افزایش موجودی با فاکتور خرید. */
    public const TYPE_PURCHASE = 'purchase';

    /** برگشت موجودی هنگام ویرایش/حذف فاکتور خرید. */
    public const TYPE_PURCHASE_REVERSED = 'purchase_reversed';

    /** ویرایش دستی موجودی در پنل. */
    public const TYPE_MANUAL = 'manual';

    /** تغییر موجودی با ایمپورت فایل محصولات. */
    public const TYPE_IMPORT = 'import';

    /** اصلاح موجودی با شمارش انبار (stocktake). */
    public const TYPE_STOCKTAKE = 'stocktake';

    protected $fillable = [
        'product_id',
        'variant_id',
        'order_id',
        'purchase_invoice_id',
        'user_id',
        'type',
        'quantity',
        'stock_after',
        'note',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'stock_after' => 'integer',
    ];

    /**
     * برچسب فارسی علت تغییر موجودی.
     *
     * @return array<string, string>
     */
    public static function typeLabels(): array
    {
        return [
            self::TYPE_ORDER => 'ثبت سفارش',
            self::TYPE_ORDER_RESTORED => 'بازگردانی سفارش',
            self::TYPE_PURCHASE => 'فاکتور خرید',
            self::TYPE_PURCHASE_REVERSED => 'برگشت فاکتور خرید',
            self::TYPE_MANUAL => 'ویرایش دستی',
            self::TYPE_IMPORT => 'ایمپورت محصولات',
            self::TYPE_STOCKTAKE => 'شمارش انبار',
        ];
    }

    public static function label(?string $type): ?string
    {
        return $type !== null ? (self::typeLabels()[$type] ?? null) : null;
    }

    /**
     * @return list<string>
     */
    public static function types(): array
    {
        return array_keys(self::typeLabels());
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'variant_id');
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function purchaseInvoice(): BelongsTo
    {
        return $this->belongsTo(PurchaseInvoice::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
