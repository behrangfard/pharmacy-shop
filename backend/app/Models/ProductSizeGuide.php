<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * راهنمای سایز اختصاصی یک محصول.
 *
 * این مدل فقط برای همان محصول است و با راهنمای سایز عمومی سایت (که برای همهٔ
 * دسته‌ها یکسان است) تفاوت دارد: جدول اندازه‌ها، مشخصات دوخت، مراحل
 * اندازه‌گیری، تصویر راهنما و نکته‌های هر مدل جداگانه ذخیره می‌شود.
 */
class ProductSizeGuide extends Model
{
    public const UNIT_CM = 'cm';

    public const UNIT_INCH = 'inch';

    public const UNIT_NONE = 'none';

    public const UNITS = [
        self::UNIT_CM,
        self::UNIT_INCH,
        self::UNIT_NONE,
    ];

    protected $fillable = [
        'product_id',
        'is_enabled',
        'title',
        'intro',
        'unit',
        'measure_image',
        'measure_steps',
        'columns',
        'rows',
        'specs',
        'fit_note',
        'note',
        'tips',
    ];

    protected $casts = [
        'is_enabled' => 'boolean',
        'measure_steps' => 'array',
        'columns' => 'array',
        'rows' => 'array',
        'specs' => 'array',
        'tips' => 'array',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * آیا جدول اندازه‌ها (ستون و سطر) ثبت شده است؟
     */
    public function hasChart(): bool
    {
        return count($this->columns ?? []) > 0
            && count($this->rows ?? []) > 0;
    }

    /**
     * آیا هیچ محتوایی برای نمایش وجود دارد؟
     * راهنمای کاملاً خالی در سایت رندر نمی‌شود.
     */
    public function hasContent(): bool
    {
        return $this->hasChart()
            || filled($this->title)
            || filled($this->intro)
            || filled($this->measure_image)
            || filled($this->fit_note)
            || filled($this->note)
            || count($this->measure_steps ?? []) > 0
            || count($this->specs ?? []) > 0
            || count($this->tips ?? []) > 0;
    }

    /**
     * برچسب واحد اندازه‌گیری برای نمایش در جدول.
     */
    public function unitLabel(): string
    {
        return match ($this->unit) {
            self::UNIT_INCH => 'اینچ',
            self::UNIT_NONE => '',
            default => 'سانتی‌متر',
        };
    }
}
