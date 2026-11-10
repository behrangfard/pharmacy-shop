<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * یک رنگ از پالت رنگ محصول.
 *
 * مشتری در صفحهٔ محصول یکی از این رنگ‌ها را انتخاب می‌کند؛ انتخاب او با
 * نام رنگ در سفارش ذخیره می‌شود تا مستقل از تغییرات بعدی پالت بماند.
 */
class ProductColor extends Model
{
    use HasFactory;

    /** فهرست رنگ‌های پیشنهادی پنل مدیریت (نام و کد رنگ). */
    public const PRESETS = [
        ['name' => 'مشکی', 'hex' => '#111111'],
        ['name' => 'سفید', 'hex' => '#ffffff'],
        ['name' => 'نود', 'hex' => '#e4cdb8'],
        ['name' => 'بژ', 'hex' => '#d9c7a7'],
        ['name' => 'کرم', 'hex' => '#f2e8cf'],
        ['name' => 'خاکستری', 'hex' => '#9ca3af'],
        ['name' => 'سرمه‌ای', 'hex' => '#1e293b'],
        ['name' => 'آبی', 'hex' => '#3b82f6'],
        ['name' => 'قرمز', 'hex' => '#dc2626'],
        ['name' => 'زرشکی', 'hex' => '#7f1d1d'],
        ['name' => 'صورتی', 'hex' => '#f472b6'],
        ['name' => 'هلویی', 'hex' => '#fbbf24'],
        ['name' => 'بنفش', 'hex' => '#8b5cf6'],
        ['name' => 'سبز', 'hex' => '#16a34a'],
        ['name' => 'قهوه‌ای', 'hex' => '#78350f'],
    ];

    protected $fillable = [
        'product_id',
        'name',
        'hex',
        'image',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'sort_order' => 'integer',
        'is_active' => 'boolean',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
