<?php

namespace App\Support\Spreadsheet;

use RuntimeException;
use Symfony\Component\HttpFoundation\Response;

/**
 * ساخت فایل xlsx بدون کتابخانهٔ خارجی.
 *
 * خروجی یک بستهٔ ZIP استاندارد است که Excel، WPS و LibreOffice آن را باز
 * می‌کنند؛ شیت‌ها راست‌به‌چپ ساخته می‌شوند و ردیف سرصفحه ثابت (freeze) است.
 */
class XlsxWriter
{
    /**
     * @param  list<array{name: string, rows: list<list<mixed>>, widths?: list<int>, help?: bool}>  $sheets
     */
    public static function build(array $sheets): string
    {
        if ($sheets === []) {
            throw new RuntimeException('برای ساخت فایل اکسل حداقل یک شیت لازم است.');
        }

        $names = [];
        $files = [];

        $files['[Content_Types].xml'] = self::contentTypes(count($sheets));
        $files['_rels/.rels'] = self::packageRelationships();

        $workbookSheets = '';
        $workbookRelationships = '';

        foreach ($sheets as $index => $sheet) {
            $position = $index + 1;
            $name = self::uniqueSheetName($sheet['name'] ?? 'شیت '.$position, $names);
            $names[] = $name;

            $workbookSheets .= sprintf(
                '<sheet name="%s" sheetId="%d" r:id="rId%d"/>',
                self::escape($name),
                $position,
                $position
            );

            $workbookRelationships .= sprintf(
                '<Relationship Id="rId%d" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet%d.xml"/>',
                $position,
                $position
            );

            $files["xl/worksheets/sheet{$position}.xml"] = self::worksheet(
                $sheet['rows'] ?? [],
                $sheet['widths'] ?? [],
                (bool) ($sheet['help'] ?? false)
            );
        }

        $workbookRelationships .= sprintf(
            '<Relationship Id="rId%d" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>',
            count($sheets) + 1
        );

        $files['xl/workbook.xml'] = self::workbook($workbookSheets);
        $files['xl/_rels/workbook.xml.rels'] = self::relationships($workbookRelationships);
        $files['xl/styles.xml'] = self::styles();

        return ZipWriter::create($files);
    }

    /**
     * @param  list<array{name: string, rows: list<list<mixed>>, widths?: list<int>, help?: bool}>  $sheets
     */
    public static function download(array $sheets, string $filename): Response
    {
        $content = self::build($sheets);

        return response($content, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="'.str_replace('"', '', $filename).'"',
            'Content-Length' => (string) strlen($content),
            'Cache-Control' => 'no-store, no-cache, must-revalidate',
        ]);
    }

    private static function contentTypes(int $sheetCount): string
    {
        $overrides = '';

        for ($position = 1; $position <= $sheetCount; $position++) {
            $overrides .= sprintf(
                '<Override PartName="/xl/worksheets/sheet%d.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>',
                $position
            );
        }

        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            .'<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            .'<Default Extension="xml" ContentType="application/xml"/>'
            .'<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
            .'<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
            .$overrides
            .'</Types>';
    }

    private static function packageRelationships(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            .'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
            .'</Relationships>';
    }

    private static function workbook(string $sheets): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"'
            .' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            .'<sheets>'.$sheets.'</sheets>'
            .'</workbook>';
    }

    private static function relationships(string $items): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            .$items
            .'</Relationships>';
    }

    /**
     * سه سبک: عادی، سرصفحه (پررنگ با پس‌زمینه) و متن چندخطی.
     */
    private static function styles(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            .'<fonts count="2">'
            .'<font><sz val="11"/><name val="Tahoma"/></font>'
            .'<font><b/><sz val="11"/><name val="Tahoma"/></font>'
            .'</fonts>'
            .'<fills count="3">'
            .'<fill><patternFill patternType="none"/></fill>'
            .'<fill><patternFill patternType="gray125"/></fill>'
            .'<fill><patternFill patternType="solid"><fgColor rgb="FFEAF3E4"/><bgColor indexed="64"/></patternFill></fill>'
            .'</fills>'
            .'<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
            .'<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
            .'<cellXfs count="3">'
            .'<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
            .'<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1">'
            .'<alignment horizontal="center" vertical="center" wrapText="1"/></xf>'
            .'<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1">'
            .'<alignment horizontal="right" vertical="top" wrapText="1"/></xf>'
            .'</cellXfs>'
            .'<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
            .'</styleSheet>';
    }

    private static function columnLetter(int $index): string
    {
        $letters = '';
        $index++;

        while ($index > 0) {
            $remainder = ($index - 1) % 26;
            $letters = chr(65 + $remainder).$letters;
            $index = intdiv($index - 1, 26);
        }

        return $letters;
    }

    private static function numberText(int|float $value): string
    {
        if (is_int($value)) {
            return (string) $value;
        }

        $text = rtrim(rtrim(number_format($value, 4, '.', ''), '0'), '.');

        return $text === '' ? '0' : $text;
    }

    private static function escape(string $value): string
    {
        $value = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/u', '', $value) ?? $value;

        return htmlspecialchars($value, ENT_QUOTES | ENT_XML1, 'UTF-8');
    }

    /**
     * @param  list<list<mixed>>  $rows
     * @param  list<int>  $widths
     */
    private static function worksheet(array $rows, array $widths, bool $help): string
    {
        $rows = array_values($rows);
        $maxColumns = 1;

        foreach ($rows as $row) {
            $maxColumns = max($maxColumns, count((array) $row));
        }

        $cols = '';

        for ($index = 0; $index < $maxColumns; $index++) {
            $width = (int) ($widths[$index] ?? 18);
            $cols .= sprintf(
                '<col min="%d" max="%d" width="%d" customWidth="1"/>',
                $index + 1,
                $index + 1,
                max(6, min(120, $width))
            );
        }

        $body = '';

        foreach ($rows as $rowIndex => $row) {
            $rowNumber = $rowIndex + 1;
            $cells = '';

            foreach (array_values((array) $row) as $columnIndex => $value) {
                $reference = self::columnLetter($columnIndex).$rowNumber;
                $style = $rowNumber === 1 ? 1 : ($help ? 2 : 0);
                $styleAttribute = $style > 0 ? ' s="'.$style.'"' : '';

                if (is_int($value) || is_float($value)) {
                    $cells .= sprintf(
                        '<c r="%s"%s><v>%s</v></c>',
                        $reference,
                        $styleAttribute,
                        self::numberText($value)
                    );

                    continue;
                }

                $text = (string) $value;

                if ($text === '') {
                    continue;
                }

                $cells .= sprintf(
                    '<c r="%s" t="inlineStr"%s><is><t xml:space="preserve">%s</t></is></c>',
                    $reference,
                    $styleAttribute,
                    self::escape($text)
                );
            }

            $body .= sprintf('<row r="%d">%s</row>', $rowNumber, $cells);
        }

        $dimension = 'A1:'.self::columnLetter(max(0, $maxColumns - 1)).max(1, count($rows));
        $pane = $help ? '' : '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>';

        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            .'<dimension ref="'.$dimension.'"/>'
            .'<sheetViews><sheetView rightToLeft="1" tabSelected="1" workbookViewId="0">'.$pane.'</sheetView></sheetViews>'
            .'<sheetFormatPr defaultRowHeight="18"/>'
            .'<cols>'.$cols.'</cols>'
            .'<sheetData>'.$body.'</sheetData>'
            .'<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>'
            .'</worksheet>';
    }

    /**
     * نام شیت باید یکتا، حداکثر ۳۱ نویسه و بدون کاراکترهای ممنوع باشد.
     *
     * @param  list<string>  $used
     */
    private static function uniqueSheetName(string $name, array $used): string
    {
        $clean = trim(str_replace(['[', ']', ':', '*', '?', '/', '\\'], ' ', $name));

        if ($clean === '') {
            $clean = 'شیت';
        }

        $clean = mb_substr($clean, 0, 31);
        $candidate = $clean;
        $counter = 2;

        while (in_array($candidate, $used, true)) {
            $suffix = ' ('.$counter.')';
            $candidate = mb_substr($clean, 0, 31 - mb_strlen($suffix)).$suffix;
            $counter++;
        }

        return $candidate;
    }
}
