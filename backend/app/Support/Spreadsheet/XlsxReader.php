<?php

namespace App\Support\Spreadsheet;

use DOMDocument;
use DOMElement;
use RuntimeException;

/**
 * خواندن فایل xlsx (Excel 2007+) بدون هیچ کتابخانهٔ خارجی.
 *
 * هر شیت به یک آرایهٔ دوبعدی از رشته‌ها تبدیل می‌شود؛ خانه‌های خالی با رشتهٔ
 * خالی پر می‌شوند تا شمارهٔ ستون‌ها همیشه با سرصفحهٔ همان ستون بخواند.
 */
class XlsxReader
{
    private const RELATIONSHIP_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

    /** @var list<string> */
    private array $sharedStrings = [];

    /** @var array<string, string> نام شیت => مسیر فایل xml داخل بسته */
    private array $sheetPaths = [];

    /** @var list<string> */
    private array $sheetNames = [];

    private function __construct(private readonly ZipReader $zip)
    {
        $this->readSharedStrings();
        $this->readWorkbook();
    }

    public static function fromPath(string $path): self
    {
        return new self(ZipReader::open($path));
    }

    /**
     * نام شیت‌های فایل به همان ترتیبی که در اکسل دیده می‌شوند.
     *
     * @return list<string>
     */
    public function sheetNames(): array
    {
        return $this->sheetNames;
    }

    /**
     * همهٔ شیت‌ها با محتوایشان.
     *
     * @return list<array{name: string, rows: array<int, array<int, string>>}>
     */
    public function sheets(): array
    {
        $sheets = [];

        foreach ($this->sheetNames as $name) {
            $sheets[] = [
                'name' => $name,
                'rows' => $this->readSheet($this->sheetPaths[$name]),
            ];
        }

        return $sheets;
    }

    /**
     * محتوای نخستین شیت.
     *
     * @return array<int, array<int, string>>
     */
    public function firstSheetRows(): array
    {
        $sheets = $this->sheets();

        return $sheets[0]['rows'] ?? [];
    }

    /**
     * ردیف‌های یک شیت بر اساس نام؛ اگر نام نبود نخستین شیت.
     *
     * @return array<int, array<int, string>>
     */
    public function rowsOf(string $name): array
    {
        $needle = ImportText::key($name);

        foreach ($this->sheetNames as $sheetName) {
            if (ImportText::key($sheetName) === $needle) {
                return $this->readSheet($this->sheetPaths[$sheetName]);
            }
        }

        return $this->firstSheetRows();
    }

    private function readSharedStrings(): void
    {
        $document = $this->loadXml('xl/sharedStrings.xml');

        if ($document === null) {
            return;
        }

        foreach ($document->getElementsByTagNameNS('*', 'si') as $item) {
            $text = '';

            foreach ($item->getElementsByTagNameNS('*', 't') as $node) {
                $text .= $node->textContent;
            }

            $this->sharedStrings[] = $text;
        }
    }

    private function readWorkbook(): void
    {
        $document = $this->loadXml('xl/workbook.xml');

        if ($document === null) {
            throw new RuntimeException('فایل اکسل ساختار معتبری ندارد (workbook پیدا نشد).');
        }

        $relationships = $this->readRelationships('xl/_rels/workbook.xml.rels');
        $fallbackIndex = 1;

        foreach ($document->getElementsByTagNameNS('*', 'sheet') as $sheet) {
            if (! $sheet instanceof DOMElement) {
                continue;
            }

            $title = trim($sheet->getAttribute('name'));

            if ($title === '') {
                $title = 'شیت '.$fallbackIndex;
            }

            $relationshipId = $sheet->getAttributeNS(self::RELATIONSHIP_NS, 'id')
                ?: $sheet->getAttribute('r:id');

            $target = $relationshipId !== '' ? ($relationships[$relationshipId] ?? '') : '';

            $this->sheetNames[] = $title;
            $this->sheetPaths[$title] = $this->resolveSheetPath($target, $fallbackIndex);
            $fallbackIndex++;
        }

        if ($this->sheetNames === []) {
            throw new RuntimeException('این فایل هیچ شیتی ندارد.');
        }
    }

    private function resolveSheetPath(string $target, int $index): string
    {
        $target = str_replace('\\', '/', trim($target));

        if ($target === '') {
            return "xl/worksheets/sheet{$index}.xml";
        }

        if (str_starts_with($target, '/')) {
            return ltrim($target, '/');
        }

        $path = str_starts_with($target, 'xl/') ? $target : 'xl/'.$target;
        $segments = [];

        foreach (explode('/', $path) as $segment) {
            if ($segment === '' || $segment === '.') {
                continue;
            }

            if ($segment === '..') {
                array_pop($segments);

                continue;
            }

            $segments[] = $segment;
        }

        return implode('/', $segments);
    }

    /**
     * @return array<string, string> شناسهٔ رابطه => مسیر هدف
     */
    private function readRelationships(string $path): array
    {
        $document = $this->loadXml($path);

        if ($document === null) {
            return [];
        }

        $map = [];

        foreach ($document->getElementsByTagNameNS('*', 'Relationship') as $relationship) {
            if (! $relationship instanceof DOMElement) {
                continue;
            }

            $id = $relationship->getAttribute('Id');

            if ($id !== '') {
                $map[$id] = $relationship->getAttribute('Target');
            }
        }

        return $map;
    }

    /**
     * @return array<int, array<int, string>>
     */
    private function readSheet(string $path): array
    {
        $document = $this->loadXml($path);

        if ($document === null) {
            return [];
        }

        $rows = [];

        foreach ($document->getElementsByTagNameNS('*', 'row') as $rowNode) {
            if (! $rowNode instanceof DOMElement) {
                continue;
            }

            $rowNumber = (int) $rowNode->getAttribute('r');
            $rowNumber = $rowNumber > 0 ? $rowNumber : (count($rows) + 1);

            $cells = [];
            $column = 0;

            foreach ($rowNode->getElementsByTagNameNS('*', 'c') as $cell) {
                if (! $cell instanceof DOMElement) {
                    continue;
                }

                $reference = $cell->getAttribute('r');

                if ($reference !== '') {
                    $column = $this->columnIndex($reference);
                }

                $cells[$column] = $this->cellValue($cell);
                $column++;
            }

            $rows[$rowNumber] = $this->padRow($cells);
        }

        ksort($rows);

        return $rows;
    }

    /**
     * مقدار یک خانه را به رشتهٔ ساده تبدیل می‌کند.
     */
    private function cellValue(DOMElement $cell): string
    {
        $type = $cell->getAttribute('t');
        $value = '';

        foreach ($cell->childNodes as $child) {
            if ($child instanceof DOMElement && $child->localName === 'v') {
                $value = $child->textContent;

                break;
            }
        }

        if ($type === 'inlineStr') {
            $text = '';

            foreach ($cell->childNodes as $child) {
                if ($child instanceof DOMElement && $child->localName === 'is') {
                    foreach ($child->getElementsByTagNameNS('*', 't') as $node) {
                        $text .= $node->textContent;
                    }
                }
            }

            return $text;
        }

        if ($type === 's') {
            return $this->sharedStrings[(int) $value] ?? '';
        }

        if ($type === 'b') {
            return $value === '1' ? '1' : '0';
        }

        return $value;
    }

    /**
     * ارجاع خانه (مثل «BC12») را به شمارهٔ ستون از صفر تبدیل می‌کند.
     */
    private function columnIndex(string $reference): int
    {
        $letters = '';

        foreach (str_split($reference) as $character) {
            if (ctype_alpha($character)) {
                $letters .= strtoupper($character);
            } else {
                break;
            }
        }

        if ($letters === '') {
            return 0;
        }

        $index = 0;

        foreach (str_split($letters) as $character) {
            $index = ($index * 26) + (ord($character) - 64);
        }

        return max(0, $index - 1);
    }

    /**
     * @param  array<int, string>  $cells
     * @return array<int, string>
     */
    private function padRow(array $cells): array
    {
        if ($cells === []) {
            return [];
        }

        $max = max(array_keys($cells));
        $row = [];

        for ($index = 0; $index <= $max; $index++) {
            $row[$index] = trim((string) ($cells[$index] ?? ''));
        }

        return $row;
    }

    private function loadXml(string $path): ?DOMDocument
    {
        $xml = $this->zip->get($path);

        if ($xml === null || trim($xml) === '') {
            return null;
        }

        $document = new DOMDocument();
        $previous = libxml_use_internal_errors(true);
        $loaded = $document->loadXML($xml, LIBXML_NONET | LIBXML_COMPACT);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        return $loaded ? $document : null;
    }
}
