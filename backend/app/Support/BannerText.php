<?php

namespace App\Support;

/**
 * نرمالسازی لایههای متن بنر.
 *
 * پنل مدیریت لایههای متن را بهصورت JSON میفرستد. این کلاس پیش از ذخیره
 * مقادیر را محدود میکند تا خروجی همیشه قابل رندر و امن باشد:
 *
 * - شمار لایهها حداکثر MAX_LAYERS است تا بنر سنگین نشود.
 * - موقعیتها درصدی و بین ۰ تا ۱۰۰ محدود میشوند.
 * - رنگها فقط هگز (۳ یا ۶ یا ۸ رقم) پذیرفته میشوند تا تزریق CSS ممکن نباشد.
 * - نام فونت فقط حروف و عدد انگلیسی و فاصله و خط تیره است.
 * - متن هر لایه متن ساده است و با React (نه HTML) رندر میشود.
 */
class BannerText
{
    public const MAX_LAYERS = 12;

    public const MAX_TEXT_LENGTH = 300;

    public const TAGS = ['h1', 'h2', 'h3', 'h4', 'p', 'span', 'div'];

    public const ALIGNS = ['right', 'center', 'left', 'justify'];

    public const SHADOWS = ['none', 'soft', 'medium', 'strong'];

    public const SCRIMS = ['none', 'light', 'medium', 'dark'];

    public const WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900];

    /**
     * لایههای خالی حذف میشوند و شناسههای تکراری یکتا میشوند.
     *
     * @return list<array<string, mixed>>|null
     */
    public static function normalizeLayers(mixed $value): ?array
    {
        if (! is_array($value)) {
            return null;
        }

        $layers = [];
        $usedIds = [];

        foreach (array_values($value) as $index => $layer) {
            if (count($layers) >= self::MAX_LAYERS) {
                break;
            }

            if (! is_array($layer)) {
                continue;
            }

            $normalized = self::normalizeLayer($layer, $index);

            if ($normalized === null) {
                continue;
            }

            $id = $normalized['id'];
            $suffix = 2;

            while (isset($usedIds[$id])) {
                $id = $normalized['id'].'-'.$suffix;
                $suffix++;
            }

            $normalized['id'] = $id;
            $usedIds[$id] = true;
            $layers[] = $normalized;
        }

        return $layers === [] ? null : $layers;
    }

    public static function normalizeScrim(mixed $value): string
    {
        return self::enum($value, self::SCRIMS, 'none');
    }

    /**
     * @param array<string, mixed> $layer
     * @return array<string, mixed>|null
     */
    private static function normalizeLayer(array $layer, int $index): ?array
    {
        $text = trim((string) ($layer['text'] ?? ''));

        if ($text === '') {
            return null;
        }

        if (mb_strlen($text) > self::MAX_TEXT_LENGTH) {
            $text = mb_substr($text, 0, self::MAX_TEXT_LENGTH);
        }

        return [
            'id' => self::layerId($layer['id'] ?? null, $index),
            'text' => $text,
            'tag' => self::enum($layer['tag'] ?? null, self::TAGS, 'p'),
            'x' => self::number($layer['x'] ?? null, 0, 100, 6),
            'y' => self::number($layer['y'] ?? null, 0, 100, 30),
            'x_mobile' => self::nullableNumber($layer['x_mobile'] ?? null, 0, 100),
            'y_mobile' => self::nullableNumber($layer['y_mobile'] ?? null, 0, 100),
            'width' => self::number($layer['width'] ?? null, 5, 100, 50),
            'width_mobile' => self::nullableNumber($layer['width_mobile'] ?? null, 5, 100),
            'align' => self::enum($layer['align'] ?? null, self::ALIGNS, 'right'),
            'font_family' => self::fontFamily($layer['font_family'] ?? null),
            'font_size' => self::number($layer['font_size'] ?? null, 8, 160, 32),
            'font_size_mobile' => self::nullableNumber($layer['font_size_mobile'] ?? null, 8, 120),
            'font_weight' => self::weight($layer['font_weight'] ?? null),
            'line_height' => self::number($layer['line_height'] ?? null, 0.8, 3, 1.5, 2),
            'letter_spacing' => self::number($layer['letter_spacing'] ?? null, -5, 20, 0, 2),
            'color' => self::color($layer['color'] ?? null, '#ffffff'),
            'italic' => self::bool($layer['italic'] ?? null),
            'uppercase' => self::bool($layer['uppercase'] ?? null),
            'shadow' => self::enum($layer['shadow'] ?? null, self::SHADOWS, 'soft'),
            'background' => self::color($layer['background'] ?? null, null),
            'background_opacity' => self::number($layer['background_opacity'] ?? null, 0, 1, 1, 2),
            'padding_x' => self::number($layer['padding_x'] ?? null, 0, 80, 0),
            'padding_y' => self::number($layer['padding_y'] ?? null, 0, 80, 0),
            'radius' => self::number($layer['radius'] ?? null, 0, 200, 0),
        ];
    }

    private static function layerId(mixed $value, int $index): string
    {
        $candidate = is_string($value) ? trim($value) : '';

        if (preg_match('/^[A-Za-z0-9_-]{1,40}$/', $candidate) === 1) {
            return $candidate;
        }

        return 'layer-'.($index + 1);
    }

    private static function enum(mixed $value, array $allowed, string $fallback): string
    {
        $candidate = is_string($value) ? strtolower(trim($value)) : '';

        return in_array($candidate, $allowed, true) ? $candidate : $fallback;
    }

    private static function weight(mixed $value): int
    {
        $candidate = is_numeric($value) ? (int) $value : 700;

        return in_array($candidate, self::WEIGHTS, true) ? $candidate : 700;
    }

    private static function number(
        mixed $value,
        float $min,
        float $max,
        float $fallback,
        int $precision = 0
    ): float {
        if (! is_numeric($value)) {
            return $fallback;
        }

        $number = (float) $value;

        if (! is_finite($number)) {
            return $fallback;
        }

        return round(min($max, max($min, $number)), $precision);
    }

    private static function nullableNumber(mixed $value, float $min, float $max): ?float
    {
        if ($value === null || $value === '' || ! is_numeric($value)) {
            return null;
        }

        $number = (float) $value;

        if (! is_finite($number)) {
            return null;
        }

        return round(min($max, max($min, $number)), 2);
    }

    private static function bool(mixed $value): bool
    {
        return filter_var($value, FILTER_VALIDATE_BOOLEAN);
    }

    private static function color(mixed $value, ?string $fallback): ?string
    {
        $candidate = is_string($value) ? trim($value) : '';

        if (preg_match('/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/', $candidate) === 1) {
            return strtolower($candidate);
        }

        return $fallback;
    }

    private static function fontFamily(mixed $value): ?string
    {
        $candidate = is_string($value) ? trim($value) : '';

        if ($candidate === '') {
            return null;
        }

        if (preg_match('/^[A-Za-z0-9 _-]{1,60}$/', $candidate) !== 1) {
            return null;
        }

        return $candidate;
    }
}
