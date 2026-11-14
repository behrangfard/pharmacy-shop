<?php

namespace App\Services\Messaging;

use App\Models\MessagingContact;
use App\Support\Spreadsheet\ImportText;
use Illuminate\Support\Facades\DB;

/**
 * وارد کردن شماره‌های مشتریان از فایل اکسل/CSV/ورد.
 *
 * هر ردیف می‌تواند شامل نام، شماره، گروه و یادداشت باشد؛ اگر فایل سرصفحه
 * نداشته باشد همهٔ خانه‌ها برای یافتن شماره بررسی می‌شوند. شماره‌ها به شکل
 * استاندارد ایران ذخیره می‌شوند و تکراری‌ها دوباره ساخته نمی‌شوند.
 */
class ContactImportService
{
    public const MAX_ROWS = 2000;

    /** حداکثر تعداد شماره در یک متن (برای جلوگیری از پردازش سنگین). */
    private const MAX_TEXT_MATCHES = 5000;

    /**
     * @var array<string, list<string>>
     */
    private const FIELDS = [
        'phone' => [
            'شماره موبایل', 'موبایل', 'شماره همراه', 'تلفن همراه', 'شماره تماس',
            'تلفن', 'شماره', 'همراه', 'phone', 'mobile', 'number', 'tel',
        ],
        'name' => ['نام و نام خانوادگی', 'نام مشتری', 'نام', 'اسم', 'name', 'full name'],
        'group_name' => ['گروه', 'دسته بندی', 'دسته', 'برچسب', 'گروه مشتری', 'group', 'label', 'tag'],
        'note' => ['یادداشت', 'توضیح', 'note', 'description'],
    ];

    /**
     * تحلیل و (در صورت درخواست) ثبت شماره‌های فایل.
     *
     * @param  list<array{name: string, rows: array<int, array<int, string>>}>  $sheets
     * @return array{summary: array<string, int>, rows: list<array<string, mixed>>}
     */
    public function process(
        array $sheets,
        string $source,
        bool $commit,
        ?string $fallbackGroup = null,
        ?int $userId = null,
        bool $updateExisting = true
    ): array {
        $candidates = [];

        foreach ($sheets as $sheet) {
            foreach ($this->candidatesFromRows($sheet['rows'] ?? [], $fallbackGroup) as $candidate) {
                $candidates[] = $candidate;
            }
        }

        return $this->finalize($candidates, $source, $commit, $userId, $updateExisting);
    }

    /**
     * استخراج شماره‌ها از متن آزاد (فایل ورد یا متن کپی‌شده).
     *
     * @return array{summary: array<string, int>, rows: list<array<string, mixed>>}
     */
    public function processText(
        string $text,
        ?string $fallbackGroup,
        bool $commit,
        ?int $userId = null
    ): array {
        return $this->finalize(
            $this->candidatesFromText($text, $fallbackGroup),
            'docx',
            $commit,
            $userId,
            true
        );
    }

    /**
     * شماره‌های داخل یک متن را پیدا می‌کند (موبایل و تلفن ثابت).
     *
     * @return list<string>
     */
    public function findPhones(string $text): array
    {
        $normalized = ImportText::digits($text);
        $patterns = [
            '/(?:\+?98|0098|0)?9\d{2}[\s\-()]{0,2}\d{3}[\s\-()]{0,2}\d{4}/',
            '/0\d{2,3}[\s\-()]{0,2}\d{3,4}[\s\-()]{0,2}\d{4}/',
        ];

        $found = [];

        foreach ($patterns as $pattern) {
            if (preg_match_all($pattern, $normalized, $matches) > 0) {
                foreach ($matches[0] as $match) {
                    $found[] = $match;
                }
            }
        }

        $found = array_values(array_unique($found));
        usort($found, static fn (string $a, string $b) => strlen($b) <=> strlen($a));

        $unique = [];

        foreach ($found as $match) {
            $duplicate = false;

            foreach ($unique as $kept) {
                if (str_contains($kept, $match)) {
                    $duplicate = true;

                    break;
                }
            }

            if (! $duplicate) {
                $unique[] = $match;
            }
        }

        return $unique;
    }

    /**
     * @param  array<int, array<int, string>>  $rows
     * @return list<array{row: int, phone: string, raw: string, name: string, group: string, note: string}>
     */
    private function candidatesFromRows(array $rows, ?string $fallbackGroup): array
    {
        $map = [];
        $headerIndex = null;

        foreach ($rows as $index => $row) {
            if ($this->rowIsBlank($row)) {
                continue;
            }

            $headerIndex = $index;
            $map = $this->mapHeader($row);

            break;
        }

        $candidates = [];

        foreach ($rows as $index => $row) {
            if ($headerIndex !== null && $index <= $headerIndex) {
                continue;
            }

            if ($this->rowIsBlank($row)) {
                continue;
            }

            if (isset($map['phone'])) {
                $raw = (string) ($row[$map['phone']] ?? '');

                $candidates[] = [
                    'row' => (int) $index,
                    'phone' => ImportText::phone($raw) ?? '',
                    'raw' => ImportText::text($raw),
                    'name' => isset($map['name']) ? ImportText::text($row[$map['name']] ?? '') : '',
                    'group' => isset($map['group_name']) ? ImportText::text($row[$map['group_name']] ?? '') : '',
                    'note' => isset($map['note']) ? ImportText::text($row[$map['note']] ?? '') : '',
                ];

                continue;
            }

            // بدون سرصفحه: هر خانه را برای یافتن شماره بررسی می‌کنیم.
            $found = false;

            foreach ($row as $cell) {
                $phone = ImportText::phone($cell);

                if ($phone === null) {
                    continue;
                }

                $candidates[] = [
                    'row' => (int) $index,
                    'phone' => $phone,
                    'raw' => ImportText::text($cell),
                    'name' => $this->guessName($row, $cell),
                    'group' => '',
                    'note' => '',
                ];

                $found = true;

                break;
            }

            if (! $found) {
                $candidates[] = [
                    'row' => (int) $index,
                    'phone' => '',
                    'raw' => ImportText::text(implode(' ', $row)),
                    'name' => '',
                    'group' => '',
                    'note' => '',
                ];
            }
        }

        return array_map(static function (array $entry) use ($fallbackGroup): array {
            if ($entry['group'] === '') {
                $entry['group'] = trim((string) $fallbackGroup);
            }

            return $entry;
        }, $candidates);
    }

    /**
     * @return list<array{row: int, phone: string, raw: string, name: string, group: string, note: string}>
     */
    private function candidatesFromText(string $text, ?string $fallbackGroup): array
    {
        $lines = preg_split('/\r\n|\r|\n/', $text) ?: [];
        $candidates = [];
        $position = 0;

        foreach ($lines as $index => $line) {
            $trimmed = trim(ImportText::digits($line));

            if ($trimmed === '') {
                continue;
            }

            $matches = $this->findPhones($trimmed);

            if ($matches === []) {
                continue;
            }

            $remaining = str_replace($matches, ' ', $trimmed);
            $remaining = trim(preg_replace('/[\s\-–—:،,|()]+/u', ' ', $remaining) ?? $remaining);

            foreach ($matches as $match) {
                $position++;

                if ($position > self::MAX_TEXT_MATCHES) {
                    break 2;
                }

                $candidates[] = [
                    'row' => $index + 1,
                    'phone' => ImportText::phone($match) ?? '',
                    'raw' => ImportText::text($match),
                    'name' => mb_substr($remaining, 0, 120),
                    'group' => trim((string) $fallbackGroup),
                    'note' => '',
                ];
            }
        }

        return $candidates;
    }

    /**
     * @param  array<int, array{row: int, phone: string, raw: string, name: string, group: string, note: string}>  $candidates
     * @return array{summary: array<string, int>, rows: list<array<string, mixed>>}
     */
    private function finalize(
        array $candidates,
        string $source,
        bool $commit,
        ?int $userId,
        bool $updateExisting
    ): array {
        $existing = MessagingContact::query()->pluck('id', 'phone')->all();
        $seen = [];
        $rows = [];
        $toWrite = [];

        foreach (array_slice($candidates, 0, self::MAX_ROWS) as $candidate) {
            $phone = $candidate['phone'];
            $messages = [];
            $status = 'ok';
            $action = 'create';
            $name = strip_tags((string) ($candidate['name'] ?? ''));
            $group = (string) ($candidate['group'] ?? '');
            $note = (string) ($candidate['note'] ?? '');

            if ($phone === '') {
                $status = 'error';
                $messages[] = $candidate['raw'] === ''
                    ? 'شماره تلفن معتبری در این ردیف پیدا نشد.'
                    : 'شماره «'.$candidate['raw'].'» معتبر نیست.';
            } elseif (isset($seen[$phone])) {
                $status = 'duplicate';
                $messages[] = 'این شماره در ردیف '.$seen[$phone].' همین فایل هم آمده است.';
            } else {
                $seen[$phone] = $candidate['row'];

                if (isset($existing[$phone])) {
                    $action = $updateExisting ? 'update' : 'skip';
                }
            }

            $row = [
                'row' => $candidate['row'],
                'phone' => $phone,
                'raw' => $candidate['raw'] ?? '',
                'name' => $name,
                'group_name' => $group,
                'note' => $note,
                'status' => $status,
                'action' => $action,
                'messages' => $messages,
            ];

            $rows[] = $row;

            if ($status === 'ok' && $action !== 'skip') {
                $toWrite[] = $row;
            }
        }

        $summary = $this->summarize($rows);

        // ردیف‌های نامعتبر مانع ثبت بقیهٔ شماره‌ها نمی‌شوند؛ فقط گزارش می‌شوند.
        if (! $commit) {
            return ['summary' => $summary, 'rows' => $rows];
        }

        DB::transaction(function () use ($toWrite, $source, $userId) {
            foreach ($toWrite as $row) {
                $contact = MessagingContact::query()
                    ->where('phone', $row['phone'])
                    ->lockForUpdate()
                    ->first();

                $payload = [
                    'source' => $source,
                    'is_active' => true,
                ];

                if ($row['name'] !== '') {
                    $payload['name'] = mb_substr($row['name'], 0, 255);
                }

                if ($row['group_name'] !== '') {
                    $payload['group_name'] = mb_substr($row['group_name'], 0, 255);
                }

                if ($row['note'] !== '') {
                    $payload['note'] = mb_substr($row['note'], 0, 255);
                }

                if ($contact === null) {
                    MessagingContact::create($payload + [
                        'phone' => $row['phone'],
                        'created_by' => $userId,
                    ]);
                } else {
                    $contact->fill($payload);
                    $contact->save();
                }
            }
        });

        return ['summary' => $this->summarize($rows), 'rows' => $rows];
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @return array<string, int>
     */
    private function summarize(array $rows): array
    {
        $summary = [
            'total' => count($rows),
            'create' => 0,
            'update' => 0,
            'skipped' => 0,
            'invalid' => 0,
            'duplicate' => 0,
            'errors' => 0,
        ];

        foreach ($rows as $row) {
            if ($row['status'] === 'error') {
                $summary['errors']++;
                $summary['invalid']++;

                continue;
            }

            if ($row['status'] === 'duplicate') {
                $summary['duplicate']++;

                continue;
            }

            if ($row['action'] === 'update') {
                $summary['update']++;
            } elseif ($row['action'] === 'skip') {
                $summary['skipped']++;
            } else {
                $summary['create']++;
            }
        }

        return $summary;
    }

    /**
     * @param  array<int, string>  $row
     * @return array<string, int>
     */
    private function mapHeader(array $row): array
    {
        $aliases = [];

        foreach (self::FIELDS as $field => $names) {
            foreach ($names as $alias) {
                $aliases[ImportText::key($alias)] = $field;
            }
        }

        $map = [];

        foreach ($row as $column => $title) {
            $key = ImportText::key((string) $title);

            if ($key === '' || ! isset($aliases[$key])) {
                continue;
            }

            $field = $aliases[$key];

            if (! isset($map[$field])) {
                $map[$field] = $column;
            }
        }

        return $map;
    }

    /**
     * نام را از خانه‌های غیرشمارهٔ همان ردیف حدس می‌زند.
     *
     * @param  array<int, string>  $row
     */
    private function guessName(array $row, string $phoneCell): string
    {
        foreach ($row as $cell) {
            $value = ImportText::text($cell);

            if ($value === '' || $value === ImportText::text($phoneCell)) {
                continue;
            }

            if (ImportText::phone($value) !== null) {
                continue;
            }

            return mb_substr($value, 0, 120);
        }

        return '';
    }

    /**
     * @param  array<int, string>  $row
     */
    private function rowIsBlank(array $row): bool
    {
        foreach ($row as $value) {
            if (trim((string) $value) !== '') {
                return false;
            }
        }

        return true;
    }
}
