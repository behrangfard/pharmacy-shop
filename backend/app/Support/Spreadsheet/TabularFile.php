<?php

namespace App\Support\Spreadsheet;

use RuntimeException;

/**
 * ورودی آپلودی کاربر (xlsx / csv / txt / docx) را به دادهٔ قابل پردازش تبدیل
 * می‌کند؛ همهٔ ورودی‌ها ابتدا با ZipReader یا fgetcsv خوانده می‌شوند.
 */
class TabularFile
{
    /** پسوندهای مجاز برای ورود اطلاعات. */
    public const EXTENSIONS = ['xlsx', 'csv', 'txt', 'docx'];

    /**
     * همهٔ شیت‌های فایل جدولی؛ برای docx یک «شیت» ساخته می‌شود که هر سطر آن
     * یک پاراگراف است (برای استخراج شماره تلفن کاربرد دارد).
     *
     * @return list<array{name: string, rows: array<int, array<int, string>>}>
     */
    public static function sheets(string $path, string $extension): array
    {
        return match (strtolower($extension)) {
            'xlsx' => XlsxReader::fromPath($path)->sheets(),
            'csv', 'txt' => [
                [
                    'name' => 'CSV',
                    'rows' => self::csvRows($path),
                ],
            ],
            'docx' => [
                [
                    'name' => 'Word',
                    'rows' => self::docxRows($path),
                ],
            ],
            default => throw new RuntimeException(
                'قالب فایل پشتیبانی نمی‌شود. فایل را با پسوند xlsx، csv، txt یا docx ارسال کنید.'
            ),
        };
    }

    /**
     * ردیف‌های نخستین شیت.
     *
     * @return array<int, array<int, string>>
     */
    public static function rows(string $path, string $extension): array
    {
        $sheets = self::sheets($path, $extension);

        return $sheets[0]['rows'] ?? [];
    }

    public static function isSupported(string $extension): bool
    {
        return in_array(strtolower($extension), self::EXTENSIONS, true);
    }

    /**
     * محتوای متنی فایل ورد (برای یافتن شماره تلفن‌ها).
     */
    public static function docxText(string $path): string
    {
        return implode("\n", array_column(self::docxRows($path), 0));
    }

    /**
     * @return array<int, array<int, string>>
     */
    private static function csvRows(string $path): array
    {
        $content = @file_get_contents($path);

        if ($content === false || trim($content) === '') {
            throw new RuntimeException('فایل ارسالی خالی است.');
        }

        // فایل‌های ذخیره‌شده با اکسل فارسی معمولاً Windows-1256 هستند.
        if (! mb_check_encoding($content, 'UTF-8')) {
            $converted = @mb_convert_encoding($content, 'UTF-8', 'Windows-1256');

            if (is_string($converted) && $converted !== '') {
                $content = $converted;
            }
        }

        $content = preg_replace('/^\xEF\xBB\xBF/', '', $content) ?? $content;

        $handle = fopen('php://temp', 'r+');

        if ($handle === false) {
            throw new RuntimeException('خواندن فایل ممکن نشد.');
        }

        fwrite($handle, $content);
        rewind($handle);

        $firstLine = (string) (fgets($handle) ?: '');
        rewind($handle);

        $delimiter = self::sniffDelimiter($firstLine);
        $rows = [];
        $lineNumber = 0;

        while (($row = fgetcsv($handle, 0, $delimiter, '"', '')) !== false) {
            $lineNumber++;
            $cells = [];

            foreach ($row as $index => $value) {
                $cells[$index] = trim((string) $value);
            }

            $rows[$lineNumber] = $cells;
        }

        fclose($handle);

        return $rows;
    }

    /**
     * @return array<int, array<int, string>>
     */
    private static function docxRows(string $path): array
    {
        $xml = ZipReader::open($path)->get('word/document.xml');

        if ($xml === null || trim($xml) === '') {
            return [];
        }

        // پایان هر پاراگراف = یک سطر؛ تب‌ها هم جداکنندهٔ ستون در نظر گرفته می‌شوند.
        $xml = str_replace(['</w:p>', '</w:tr>'], ["\n", "\n"], $xml);
        $xml = str_replace(['<w:tab/>', '<w:tab ', '<w:br/>'], ["\t", "\n<w:tab ", "\n"], $xml);

        $text = html_entity_decode(strip_tags($xml), ENT_QUOTES | ENT_XML1, 'UTF-8');
        $lines = preg_split('/\r\n|\r|\n/', $text) ?: [];
        $rows = [];
        $number = 0;

        foreach ($lines as $line) {
            $number++;
            $cells = [];

            foreach (explode("\t", $line) as $index => $cell) {
                $cells[$index] = trim($cell);
            }

            $rows[$number] = $cells;
        }

        return $rows;
    }

    private static function sniffDelimiter(string $line): string
    {
        $candidates = [
            ';' => substr_count($line, ';'),
            "\t" => substr_count($line, "\t"),
            ',' => substr_count($line, ','),
        ];

        arsort($candidates);

        $best = array_key_first($candidates);

        return $candidates[$best] > 0 ? $best : ',';
    }
}
