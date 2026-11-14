<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * هزینهٔ فروشگاه (باربری، بسته‌بندی، تبلیغات و ...).
 */
class Expense extends Model
{
    use HasFactory;

    public const CATEGORIES = [
        'shipping' => 'باربری و ارسال',
        'packaging' => 'بسته‌بندی',
        'marketing' => 'تبلیغات و بازاریابی',
        'software' => 'نرم‌افزار و ابزار',
        'tax' => 'مالیات و عوارض',
        'other' => 'سایر',
    ];

    protected $fillable = [
        'title',
        'category',
        'amount',
        'spent_at',
        'supplier_id',
        'note',
        'created_by',
    ];

    protected $casts = [
        'spent_at' => 'date',
        'amount' => 'decimal:2',
    ];

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
