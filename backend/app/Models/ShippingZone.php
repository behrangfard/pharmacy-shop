<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * منطقهٔ ارسال: استان، شهر و محدوده (منطقهٔ شهری) با هزینهٔ اختصاصی.
 *
 * رکوردهایی که «شهر» یا «محدوده» آن‌ها خالی است به‌صورت سلسله‌مراتبی
 * اعمال می‌شوند: استان → شهر → محدوده.
 */
class ShippingZone extends Model
{
    protected $fillable = [
        'province',
        'city',
        'area',
        'cost',
        'is_express_available',
        'is_active',
        'note',
    ];

    protected $casts = [
        'cost' => 'decimal:2',
        'is_express_available' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * منطقه‌های مطابق مقصد؛ نتیجه از خاص‌ترین (محدوده) به عام‌ترین (استان)
     * مرتب می‌شود تا اولین مورد، دقیق‌ترین منطقهٔ پوشش باشد.
     */
    public function scopeForDestination($query, ?string $province, ?string $city)
    {
        $province = trim((string) $province);
        $city = trim((string) $city);

        return $query
            ->where(function ($subQuery) use ($province, $city) {
                if ($province === '' && $city === '') {
                    return;
                }

                if ($province !== '') {
                    $subQuery->orWhere('province', $province);
                }

                if ($city !== '') {
                    $subQuery->orWhere(function ($cityQuery) use ($city) {
                        $cityQuery
                            ->where('city', $city)
                            ->orWhereNull('city');
                    });
                }
            })
            ->orderByRaw('CASE WHEN area IS NULL THEN 1 ELSE 0 END')
            ->orderByRaw('CASE WHEN city IS NULL THEN 1 ELSE 0 END')
            ->orderBy('id');
    }

    public function label(): string
    {
        return collect([$this->province, $this->city, $this->area])
            ->filter(fn ($part) => is_string($part) && trim($part) !== '')
            ->implode(' — ');
    }
}
