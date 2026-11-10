<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * یک قطعه از «پک» چندعددی.
 *
 * مثلاً پک سه‌عددی شورت سه قطعه دارد و هر قطعه می‌تواند رنگ جداگانه
 * داشته باشد؛ colors فهرست رنگ‌های مجاز همان قطعه از پالت محصول است.
 */
class ProductPackItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'name',
        'quantity',
        'colors',
        'sort_order',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'colors' => 'array',
        'sort_order' => 'integer',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * رنگ‌های مجاز این قطعه به شکل آرایه‌ای از رشته.
     *
     * @return array<int, string>
     */
    public function colorNames(): array
    {
        return collect($this->colors ?? [])
            ->map(fn ($color): string => trim((string) $color))
            ->filter()
            ->unique()
            ->values()
            ->all();
    }
}
