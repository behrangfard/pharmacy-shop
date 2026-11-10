<?php

namespace App\Support;

use DateTimeInterface;
use Illuminate\Support\Carbon;
use Throwable;

/**
 * تبدیل و قالب‌بندی تاریخ شمسی (جلالی) — پورت PHP از frontend/src/utils/jalali.ts.
 *
 * تاریخ‌ها در دیتابیس میلادی ذخیره می‌شوند، اما «روز تولد» باید بر اساس تقویم
 * شمسی تطبیق داده شود؛ بنابراین مقایسهٔ ماه و روز تولد مشتریان از همین کلاس
 * انجام می‌شود و نمایش تاریخ تولد در پنل هم شمسی است.
 */
final class JalaliDate
{
    /** @var list<string> */
    public const MONTH_NAMES = [
        'فروردین',
        'اردیبهشت',
        'خرداد',
        'تیر',
        'مرداد',
        'شهریور',
        'مهر',
        'آبان',
        'آذر',
        'دی',
        'بهمن',
        'اسفند',
    ];

    private const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

    /**
     * تاریخ میلادی → شمسی (ماه و روز یک‌پایه هستند).
     *
     * @return array{jy: int, jm: int, jd: int}
     */
    public static function fromGregorian(int $gy, int $gm, int $gd): array
    {
        $daysInMonth = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

        $jy = $gy <= 1600 ? 0 : 979;
        $year = $gy <= 1600 ? $gy - 621 : $gy - 1600;
        $gy2 = $gm > 2 ? $year + 1 : $year;

        $days = 365 * $year
            + intdiv($gy2 + 3, 4)
            - intdiv($gy2 + 99, 100)
            + intdiv($gy2 + 399, 400)
            - 80
            + $gd
            + $daysInMonth[$gm - 1];

        $jy += 33 * intdiv($days, 12053);
        $days %= 12053;

        $jy += 4 * intdiv($days, 1461);
        $days %= 1461;

        if ($days > 365) {
            $jy += intdiv($days - 1, 365);
            $days = ($days - 1) % 365;
        }

        $jm = $days < 186 ? 1 + intdiv($days, 31) : 7 + intdiv($days - 186, 30);
        $jd = 1 + ($days < 186 ? $days % 31 : ($days - 186) % 30);

        return ['jy' => $jy, 'jm' => $jm, 'jd' => $jd];
    }

    /**
     * تاریخ شمسی → میلادی (ماه و روز یک‌پایه هستند).
     *
     * @return array{gy: int, gm: int, gd: int}
     */
    public static function toGregorian(int $jy, int $jm, int $jd): array
    {
        $gy = $jy <= 979 ? 621 : 1600;
        $year = $jy <= 979 ? $jy : $jy - 979;

        $days = 365 * $year
            + intdiv($year, 33) * 8
            + intdiv($year % 33 + 3, 4)
            + 78
            + $jd
            + ($jm < 7 ? ($jm - 1) * 31 : ($jm - 7) * 30 + 186);

        $gy += 400 * intdiv($days, 146097);
        $days %= 146097;

        if ($days > 36524) {
            $days -= 1;
            $gy += 100 * intdiv($days, 36524);
            $days %= 36524;

            if ($days >= 365) {
                $days += 1;
            }
        }

        $gy += 4 * intdiv($days, 1461);
        $days %= 1461;

        if ($days > 365) {
            $gy += intdiv($days - 1, 365);
            $days = ($days - 1) % 365;
        }

        $isLeap = ($gy % 4 === 0 && $gy % 100 !== 0) || $gy % 400 === 0;
        $monthLengths = [
            0,
            31,
            $isLeap ? 29 : 28,
            31,
            30,
            31,
            30,
            31,
            31,
            30,
            31,
            30,
            31,
        ];

        $gd = $days + 1;
        $gm = 1;

        while ($gm < 12 && $gd > $monthLengths[$gm]) {
            $gd -= $monthLengths[$gm];
            $gm += 1;
        }

        return ['gy' => $gy, 'gm' => $gm, 'gd' => $gd];
    }

    /**
     * تاریخ میلادی (Carbon، DateTime یا رشته) → اجزای شمسی؛ ورودی نامعتبر null.
     *
     * @return array{jy: int, jm: int, jd: int}|null
     */
    public static function fromDate(DateTimeInterface|string|null $date): ?array
    {
        if ($date === null || $date === '') {
            return null;
        }

        try {
            $carbon = $date instanceof DateTimeInterface
                ? Carbon::instance($date)
                : Carbon::parse($date);
        } catch (Throwable) {
            return null;
        }

        return self::fromGregorian((int) $carbon->year, (int) $carbon->month, (int) $carbon->day);
    }

    /**
     * اجزای تاریخ امروز (یا تاریخ داده‌شده) در تقویم شمسی.
     *
     * @return array{jy: int, jm: int, jd: int}
     */
    public static function today(?Carbon $now = null): array
    {
        $now ??= Carbon::now();

        return self::fromGregorian((int) $now->year, (int) $now->month, (int) $now->day);
    }

    /**
     * کلید مقایسهٔ تولد: «ماه-روز» شمسی؛ مثلاً ۰۵-۱۲.
     *
     * @param  array{jy: int, jm: int, jd: int}  $parts
     */
    public static function key(array $parts): string
    {
        return sprintf('%02d-%02d', $parts['jm'], $parts['jd']);
    }

    /**
     * تاریخ شمسی به قالب ذخیره‌سازی `YYYY-MM-DD` (با رقم لاتین).
     *
     * @param  array{jy: int, jm: int, jd: int}  $parts
     */
    public static function iso(array $parts): string
    {
        return sprintf('%04d-%02d-%02d', $parts['jy'], $parts['jm'], $parts['jd']);
    }

    /**
     * نمایش خوانای تاریخ شمسی؛ مثلاً «۱۲ مرداد ۱۳۶۵».
     *
     * @param  array{jy: int, jm: int, jd: int}  $parts
     */
    public static function label(array $parts, bool $withYear = true): string
    {
        $month = self::MONTH_NAMES[$parts['jm'] - 1] ?? '';

        $label = self::toPersianDigits($parts['jd']) . ' ' . $month;

        return $withYear ? $label . ' ' . self::toPersianDigits($parts['jy']) : $label;
    }

    public static function monthName(int $jm): string
    {
        return self::MONTH_NAMES[$jm - 1] ?? '';
    }

    /**
     * شمار روزهای یک ماه شمسی (با تبدیل دقیق، بدون تقریب).
     */
    public static function monthLength(int $jy, int $jm): int
    {
        $start = self::toGregorian($jy, $jm, 1);
        $nextJy = $jm === 12 ? $jy + 1 : $jy;
        $nextJm = $jm === 12 ? 1 : $jm + 1;
        $end = self::toGregorian($nextJy, $nextJm, 1);

        $startTime = Carbon::create($start['gy'], $start['gm'], $start['gd'])->startOfDay();
        $endTime = Carbon::create($end['gy'], $end['gm'], $end['gd'])->startOfDay();

        return (int) $startTime->diffInDays($endTime);
    }

    /**
     * ارقام لاتین را به فارسی تبدیل می‌کند.
     */
    public static function toPersianDigits(int|string $value): string
    {
        return str_replace(
            ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
            self::PERSIAN_DIGITS,
            (string) $value
        );
    }
}
