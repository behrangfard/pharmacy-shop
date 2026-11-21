<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * موجودی اطلاعاتی یک ترکیب «سایز × رنگ».
 *
 * موجودی رسمی سفارش‌ها روی `Product`/`ProductVariant` است؛ این مدل فقط
 * نشان می‌دهد مدیر برای هر ترکیب سایز و رنگ چه تعدادی ثبت کرده است.
 */
class ProductVariantColor extends Model
{
    protected $fillable = [
        'product_id',
        'variant_id',
        'color_id',
        'stock',
    ];

    protected $casts = [
        'stock' => 'integer',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'variant_id');
    }

    public function color(): BelongsTo
    {
        return $this->belongsTo(ProductColor::class, 'color_id');
    }
}
