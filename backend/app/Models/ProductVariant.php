<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProductVariant extends Model
{
    use HasFactory;

    /** پیشوندهای رایج «سایز» در نام تنوع. */
    private const SIZE_PREFIX_PATTERN = '/^\s*(?:سایز|سايز|size)\s*[:：\-]?\s*/iu';

    protected $fillable = [
        'product_id',
        'name',
        'size',
        'sku',
        'price',
        'compare_price',
        'stock',
        'image',
        'is_active',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'compare_price' => 'decimal:2',
        'stock' => 'integer',
        'is_active' => 'boolean',
    ];

    /**
     * The product this variant belongs to.
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Order items that reference this variant.
     *
     * Keep historical variants in the database and deactivate them instead
     * of deleting them, so order history and inventory restoration remain safe.
     */
    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class, 'variant_id');
    }

    /**
     * سایز را برای مقایسه یکسان می‌کند: ارقام فارسی/عربی به لاتین،
     * حذف پیشوند «سایز/Size»، یکسان‌سازی فاصله‌ها و حروف بزرگ لاتین.
     */
    public static function normalizeSize(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $value = trim($value);

        if ($value === '') {
            return null;
        }

        $value = str_replace(
            ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'],
            ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
            $value
        );

        $value = str_replace(
            ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'],
            ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
            $value
        );

        $value = preg_replace(self::SIZE_PREFIX_PATTERN, '', $value) ?? $value;
        $value = preg_replace('/[\s\x{200C}\x{200D}]+/u', ' ', $value) ?? $value;
        $value = trim($value);

        if ($value === '') {
            return null;
        }

        return mb_strtoupper($value, 'UTF-8');
    }

    /**
     * فهرست سایزها را از پارامتر چنده‌مقداری (size=75B,80B) می‌سازد.
     *
     * @return array<int, string>
     */
    public static function normalizeSizeList(string $value): array
    {
        return collect(explode(',', $value))
            ->map(fn (string $item): ?string => self::normalizeSize($item))
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    /**
     * استخراج سایز از نام تنوع.
     *
     * فقط نام‌هایی که واقعاً سایز هستند پذیرفته می‌شوند: نام‌های با پیشوند
     * «سایز» و نشانه‌های کوتاه رایج (S، M، XL، 75B، 2XL، Free). به این ترتیب
     * تنوع‌هایی مثل «رنگ مشکی» یا «بستهٔ سه‌عددی» به‌اشتباه سایز نمی‌گیرند.
     */
    public static function deriveSizeFromName(?string $name): ?string
    {
        $normalized = self::normalizeSize($name);

        if ($normalized === null) {
            return null;
        }

        if (preg_match(self::SIZE_PREFIX_PATTERN, (string) $name) === 1) {
            return $normalized;
        }

        $sizeToken = '/^(?:[0-9]{1,3}[A-Z]{0,3}|[A-Z]{1,3}|FREE|FREESIZE|ONE SIZE|ONESIZE)$/';

        return preg_match($sizeToken, $normalized) === 1 ? $normalized : null;
    }

    /**
     * اگر سایز وارد نشده باشد از نام تنوع استخراج می‌شود؛ بنابراین فیلتر
     * سایز روی داده‌های قدیمی و ورودی‌های پنل هم بدون کار اضافه کار می‌کند.
     */
    protected static function booted(): void
    {
        static::saving(function (self $variant): void {
            $variant->size = self::normalizeSize($variant->size)
                ?? self::deriveSizeFromName($variant->name);
        });
    }
}
