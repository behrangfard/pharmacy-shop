<?php

namespace App\Support\Spreadsheet;

use RuntimeException;

/**
 * خوانندهٔ سبک فایل‌های ZIP بدون نیاز به افزونهٔ zip.
 *
 * فایل‌های xlsx و docx در واقع یک بستهٔ ZIP هستند؛ چون افزونهٔ zip روی همهٔ
 * سرورها نصب نیست، این کلاس فقط با zlib (gzinflate) و ساختار ZIP کار می‌کند.
 * فایل‌های ورودی کاربر همیشه کوچک‌اند (چند مگابایت) و همان‌جا در حافظه خوانده
 * می‌شوند.
 */
class ZipReader
{
    /** @var array<string, array{method: int, offset: int, compressed: int, size: int}> */
    private array $raw = [];

    /** @var array<string, string> محتوای استخراج‌شده (به‌صورت تنبل) */
    private array $extracted = [];

    /** بایت‌های کامل بسته که ورودی‌ها از آن خوانده می‌شوند. */
    private string $payload = '';

    private function __construct(string $path)
    {
        $data = @file_get_contents($path);

        if ($data === false || $data === '') {
            throw new RuntimeException('فایل انتخاب‌شده خالی است یا خوانده نشد.');
        }

        $this->read($data);
    }

    public static function open(string $path): self
    {
        return new self($path);
    }

    /**
     * @return list<string>
     */
    public function names(): array
    {
        return array_keys($this->raw);
    }

    public function has(string $name): bool
    {
        return array_key_exists($this->normalizeName($name), $this->raw);
    }

    /**
     * محتوای یک ورودی را برمی‌گرداند؛ اگر نبود null.
     */
    public function get(string $name): ?string
    {
        $name = $this->normalizeName($name);

        if (! array_key_exists($name, $this->raw)) {
            return null;
        }

        if (! array_key_exists($name, $this->extracted)) {
            $this->extracted[$name] = $this->decompress($name);
        }

        return $this->extracted[$name];
    }

    private function normalizeName(string $name): string
    {
        return ltrim(str_replace('\\', '/', $name), '/');
    }

    /**
     * فهرست مرکزی (Central Directory) را می‌خواند و آدرس دادهٔ هر ورودی را
     * نگه می‌دارد؛ استخراج محتوا تا زمان درخواست به تعویق می‌افتد.
     */
    private function read(string $data): void
    {
        $eocdPosition = strrpos($data, "PK\x05\x06");

        if ($eocdPosition === false) {
            throw new RuntimeException('فایل ارسالی یک بستهٔ ZIP/XLSX معتبر نیست.');
        }

        $entryCount = $this->unpackShort(substr($data, $eocdPosition + 10, 2));
        $directoryOffset = $this->unpackLong(substr($data, $eocdPosition + 16, 4));
        $pointer = $directoryOffset;
        $length = strlen($data);

        for ($index = 0; $index < $entryCount; $index++) {
            if ($pointer + 46 > $length || substr($data, $pointer, 4) !== "PK\x01\x02") {
                break;
            }

            $method = $this->unpackShort(substr($data, $pointer + 10, 2));
            $compressedSize = $this->unpackLong(substr($data, $pointer + 20, 4));
            $uncompressedSize = $this->unpackLong(substr($data, $pointer + 24, 4));
            $nameLength = $this->unpackShort(substr($data, $pointer + 28, 2));
            $extraLength = $this->unpackShort(substr($data, $pointer + 30, 2));
            $commentLength = $this->unpackShort(substr($data, $pointer + 32, 2));
            $localOffset = $this->unpackLong(substr($data, $pointer + 42, 4));
            $name = substr($data, $pointer + 46, $nameLength);

            $pointer += 46 + $nameLength + $extraLength + $commentLength;

            if ($name === '' || str_ends_with($name, '/')) {
                continue;
            }

            if ($compressedSize === 0xFFFFFFFF || $localOffset === 0xFFFFFFFF) {
                throw new RuntimeException(
                    'فایل اکسل بسیار بزرگ است (ZIP64). لطفاً آن را در چند فایل کوچک‌تر وارد کنید.'
                );
            }

            $localNameLength = $this->unpackShort(substr($data, $localOffset + 26, 2));
            $localExtraLength = $this->unpackShort(substr($data, $localOffset + 28, 2));
            $dataStart = $localOffset + 30 + $localNameLength + $localExtraLength;

            $this->raw[$this->normalizeName($name)] = [
                'method' => $method,
                'offset' => $dataStart,
                'compressed' => $compressedSize,
                'size' => $uncompressedSize,
            ];
        }

        if ($this->raw === []) {
            throw new RuntimeException('هیچ محتوایی داخل فایل ارسالی پیدا نشد.');
        }

        $this->payload = $data;
    }

    private function decompress(string $name): string
    {
        /** @var array{method: int, offset: int, compressed: int, size: int} $entry */
        $entry = $this->raw[$name];

        if ($entry['compressed'] === 0) {
            return '';
        }

        $compressed = substr($this->payload, $entry['offset'], $entry['compressed']);

        if ($entry['method'] === 0) {
            return $compressed;
        }

        if ($entry['method'] !== 8) {
            throw new RuntimeException(
                'روش فشرده‌سازی این فایل پشتیبانی نمی‌شود. فایل را با Excel به‌صورت xlsx ذخیره کنید.'
            );
        }

        $content = @gzinflate($compressed);

        if ($content === false) {
            throw new RuntimeException('محتوای فایل ارسالی قابل خواندن نیست.');
        }

        return $content;
    }

    private function unpackShort(string $bytes): int
    {
        return $bytes === '' ? 0 : (int) unpack('v', $bytes)[1];
    }

    private function unpackLong(string $bytes): int
    {
        return $bytes === '' ? 0 : (int) unpack('V', $bytes)[1];
    }
}
