<?php

namespace App\Support\Spreadsheet;

/**
 * ساخت بستهٔ ZIP بدون افزونهٔ zip (فقط با zlib).
 *
 * برای تولید فایل‌های xlsx/docx و همچنین تست‌هایی که به یک بستهٔ واقعی نیاز
 * دارند استفاده می‌شود.
 */
class ZipWriter
{
    /**
     * @param  array<string, string>  $files  نام ورودی => محتوا
     */
    public static function create(array $files): string
    {
        $local = '';
        $central = '';
        $offset = 0;

        foreach ($files as $name => $content) {
            $crc = crc32($content);
            $size = strlen($content);
            $deflated = gzdeflate($content, 6);
            $useDeflate = is_string($deflated) && strlen($deflated) < $size;
            $data = $useDeflate ? $deflated : $content;
            $method = $useDeflate ? 8 : 0;
            $compressedSize = strlen($data);

            $localHeader = "PK\x03\x04"
                .pack('v', 20)
                .pack('v', 0x0800)
                .pack('v', $method)
                .pack('v', 0)
                .pack('v', 0)
                .pack('V', $crc)
                .pack('V', $compressedSize)
                .pack('V', $size)
                .pack('v', strlen($name))
                .pack('v', 0)
                .$name;

            $central .= "PK\x01\x02"
                .pack('v', 20)
                .pack('v', 20)
                .pack('v', 0x0800)
                .pack('v', $method)
                .pack('v', 0)
                .pack('v', 0)
                .pack('V', $crc)
                .pack('V', $compressedSize)
                .pack('V', $size)
                .pack('v', strlen($name))
                .pack('v', 0)
                .pack('v', 0)
                .pack('v', 0)
                .pack('v', 0)
                .pack('V', 0)
                .pack('V', $offset)
                .$name;

            $local .= $localHeader.$data;
            $offset += strlen($localHeader) + $compressedSize;
        }

        $count = count($files);

        $end = "PK\x05\x06"
            .pack('v', 0)
            .pack('v', 0)
            .pack('v', $count)
            .pack('v', $count)
            .pack('V', strlen($central))
            .pack('V', $offset)
            .pack('v', 0);

        return $local.$central.$end;
    }
}
