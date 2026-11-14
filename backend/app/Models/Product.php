<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'category_id',
        'brand_id',
        'name',
        'slug',
        'sku',
        'short_description',
        'description',
        'price',
        'cost_price',
        'compare_price',
        'discount_percent',
        'stock',
        'weight',
        'thumbnail',
        'is_active',
        'is_featured',
        'is_new',
        'is_taxable',
        'is_returnable',
        'views_count',
        'sales_count',
        'meta_title',
        'meta_description',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'cost_price' => 'decimal:2',
        'compare_price' => 'decimal:2',
        'discount_percent' => 'decimal:2',
        'weight' => 'decimal:2',
        'is_active' => 'boolean',
        'is_featured' => 'boolean',
        'is_new' => 'boolean',
        'is_taxable' => 'boolean',
        'is_returnable' => 'boolean',
    ];

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function brand()
    {
        return $this->belongsTo(Brand::class);
    }

    public function images()
    {
        return $this->hasMany(ProductImage::class);
    }

    public function variants()
    {
        return $this->hasMany(ProductVariant::class);
    }

    /**
     * پالت رنگ این محصول (ترتیب نمایش در صفحهٔ محصول).
     */
    public function colors(): HasMany
    {
        return $this->hasMany(ProductColor::class)
            ->orderBy('sort_order')
            ->orderBy('id');
    }

    /**
     * قطعات پک چندعددی این محصول.
     */
    public function packItems(): HasMany
    {
        return $this->hasMany(ProductPackItem::class)
            ->orderBy('sort_order')
            ->orderBy('id');
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(ProductReview::class);
    }

    /**
     * راهنمای سایز اختصاصی همین محصول (اختیاری).
     */
    public function sizeGuide(): HasOne
    {
        return $this->hasOne(ProductSizeGuide::class);
    }

    /**
     * ردیف‌های علاقه‌مندی که این محصول در آن‌ها ذخیره شده است.
     */
    public function wishlistItems(): HasMany
    {
        return $this->hasMany(WishlistItem::class);
    }

    public function getDiscountAmountAttribute()
    {
        return round(
            ((float) $this->price * (float) $this->discount_percent) / 100,
            2
        );
    }

    public function getFinalPriceAttribute()
    {
        return round(
            (float) $this->price - $this->discount_amount,
            2
        );
    }
}