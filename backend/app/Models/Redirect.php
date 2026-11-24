<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * یک ریدایرکت ۳۰۱ از مسیر قدیمی به مسیر جدید.
 *
 * مسیرها همیشه با `normalizePath` یکدست می‌شوند تا «old-path/»، «/old-path»
 * و «/old-path?utm=1» همه یک ردیف حساب شوند و ریدایرکت تکراری ثبت نشود.
 */
class Redirect extends Model
{
    protected $fillable = [
        'from_path',
        'to_path',
        'is_active',
        'hits',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'hits' => 'integer',
    ];

    /**
     * یکدست‌سازی مسیر برای مقایسه و ذخیره:
     * - فاصله‌های اضافه حذف می‌شوند
     * - بخش کوئری و هش نادیده گرفته می‌شود
     * - مسیر با «/» شروع می‌شود
     * - «/» پایانی حذف می‌شود (به‌جز ریشهٔ سایت)
     */
    public static function normalizePath(string $path): string
    {
        $trimmed = trim($path);
        $withoutQuery = strtok($trimmed, '?#');

        $path = '/' . ltrim($withoutQuery === false ? '' : $withoutQuery, '/');

        if ($path !== '/') {
            $path = rtrim($path, '/');
        }

        return $path === '' ? '/' : $path;
    }
}
