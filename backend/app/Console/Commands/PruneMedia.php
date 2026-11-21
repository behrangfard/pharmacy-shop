<?php

namespace App\Console\Commands;

use App\Services\Media\MediaCleaner;
use Illuminate\Console\Command;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Throwable;

/**
 * پاک‌سازی فایل‌های تصویری یتیم (بدون هیچ ارجاع در دیتابیس).
 *
 * چرا: حذف یک ردیف محتوا (بنر، مقاله، پاپ‌آپ و…) پیش از این فایل تصویر را
 * روی دیسک باقی می‌گذاشت. حالا حذف/تعویض تصویر در کنترلرها فایل را هم پاک
 * می‌کند، ولی فایل‌های آپلودشده‌ای که هرگز ذخیره نشدند (بستن مرورگر، قطع
 * اتصال) و فایل‌های تاریخی نیاز به یک ابزار دوره‌ای دارند.
 *
 * رفتار:
 *   php artisan media:prune                 ← فقط گزارش (بدون حذف)
 *   php artisan media:prune --apply         ← حذف واقعی فایل‌های یتیم
 *   php artisan media:prune --days=7        ← فایل‌های تازه‌تر از ۷ روز دست‌نخورده
 *   php artisan media:prune --dir=banners   ← فقط یک پوشه
 *
 * نقشهٔ «کدام ستون به کدام پوشه ارجاع می‌دهد» در `config/media.php` است؛ اگر
 * جدول/ستونی پیدا نشود، آن پوشه به‌طور کامل بررسی نمی‌شود (حذف‌نکردن امن‌تر
 * از حذف اشتباه است). فایل‌های تازه به‌طور پیش‌فرض یک روز دست‌نخورده می‌مانند
 * تا آپلود نیمه‌کارهٔ مدیر در حال ویرایش پاک نشود.
 */
class PruneMedia extends Command
{
    protected $signature = 'media:prune
        {--apply : حذف واقعی فایل‌های یتیم (پیش‌فرض فقط گزارش)}
        {--days=1 : فایل‌های تازه‌تر از این تعداد روز دست‌نخورده می‌مانند}
        {--dir=* : فقط این پوشه‌ها بررسی شوند}';

    protected $description = 'حذف فایل‌های تصویری یتیم که هیچ ردیفی در دیتابیس به آن‌ها ارجاع ندارد';

    public function handle(): int
    {
        $configured = (array) config('media.prune.directories', []);
        $only = array_values(array_filter(array_map(
            fn ($value): string => trim((string) $value, " \t\n\r\0\x0B/"),
            (array) $this->option('dir')
        )));

        if ($only !== []) {
            $unknown = array_values(array_diff($only, array_keys($configured)));

            if ($unknown !== []) {
                $this->error('پوشهٔ ناشناخته: ' . implode(', ', $unknown));

                return self::FAILURE;
            }

            $configured = array_intersect_key($configured, array_flip($only));
        }

        if ($configured === []) {
            $this->warn('هیچ پوشه‌ای برای بررسی تنظیم نشده است (config/media.php → prune.directories).');

            return self::SUCCESS;
        }

        $days = max(0, (int) $this->option('days'));
        $cutoff = time() - $days * 86400;
        $apply = (bool) $this->option('apply');
        $disk = Storage::disk('public');

        $rows = [];
        $orphansTotal = 0;
        $deletedTotal = 0;
        $skipped = [];

        foreach ($configured as $directory => $references) {
            $directory = trim((string) $directory, '/');
            $resolved = $this->referencedPaths((array) $references);

            // نقشهٔ ناقص (جدول/ستون ناموجود) → این پوشه دست‌نخورده می‌ماند.
            if (! $resolved['safe']) {
                $skipped[] = $directory;

                foreach ($resolved['warnings'] as $warning) {
                    $this->warn($warning);
                }

                continue;
            }

            $files = $disk->allFiles($directory);
            $orphans = [];
            $recent = 0;

            foreach ($files as $file) {
                $normalized = MediaCleaner::normalize($file);

                /*
                 * تطابق مسیر کامل + تطابق نام فایل. اگر مسیر در دیتابیس با
                 * پیشوند دیگری ذخیره شده باشد (نشانی کامل `https://…/storage/…`
                 * یا اسلش ابتدایی)، فایلِ در حال استفاده یتیم شمرده نمی‌شود؛
                 * در ابزار حذف، «نگه‌داشتن» همیشه انتخاب امن‌تر است.
                 */
                if (
                    isset($resolved['paths'][$normalized])
                    || isset($resolved['basenames'][basename($normalized)])
                ) {
                    continue;
                }

                $modified = $this->lastModified($disk, $file);

                if ($modified !== null && $modified > $cutoff) {
                    $recent++;

                    continue;
                }

                $orphans[] = $file;
            }

            $deleted = 0;

            if ($apply) {
                foreach ($orphans as $file) {
                    if (MediaCleaner::deleteFile($file)) {
                        $deleted++;
                    }
                }
            }

            $orphansTotal += count($orphans);
            $deletedTotal += $deleted;

            $rows[] = [
                $directory,
                count($files),
                count($files) - count($orphans) - $recent,
                count($orphans),
                $recent,
                $deleted,
            ];
        }

        $this->table(
            ['پوشه', 'همهٔ فایل‌ها', 'دارای ارجاع', 'یتیم', 'تازه (دست‌نخورده)', 'حذف‌شده'],
            $rows
        );

        if ($skipped !== []) {
            $this->warn('این پوشه‌ها به‌خاطر نقشهٔ ناقص بررسی نشدند: ' . implode(', ', $skipped));
        }

        if ($orphansTotal === 0) {
            $this->info('فایل یتیمی پیدا نشد.');

            return self::SUCCESS;
        }

        if (! $apply) {
            $this->warn(sprintf(
                '%d فایل یتیم پیدا شد. برای حذف: php artisan media:prune --apply',
                $orphansTotal
            ));

            return self::SUCCESS;
        }

        $this->info(sprintf('%d فایل یتیم حذف شد.', $deletedTotal));

        return self::SUCCESS;
    }
    /**
     * همهٔ مسیرهای ارجاع‌داده‌شده در جدول‌های یک پوشه.
     *
     * @param  array<int, array{table?: string, columns?: array<int, string>}>  $references
     * @return array{paths: array<string, true>, basenames: array<string, true>, safe: bool, warnings: list<string>}
     */
    private function referencedPaths(array $references): array
    {
        $paths = [];
        $basenames = [];
        $warnings = [];
        $safe = true;

        foreach ($references as $reference) {
            $table = trim((string) ($reference['table'] ?? ''));
            $columns = array_values(array_filter(array_map(
                'strval',
                (array) ($reference['columns'] ?? [])
            )));

            if ($table === '' || $columns === []) {
                continue;
            }

            if (! Schema::hasTable($table)) {
                $safe = false;
                $warnings[] = "جدول {$table} وجود ندارد؛ پوشهٔ مرتبط با آن بررسی نشد.";

                continue;
            }

            $existing = array_values(array_filter(
                $columns,
                fn (string $column): bool => Schema::hasColumn($table, $column)
            ));

            if ($existing === []) {
                $safe = false;
                $warnings[] = 'ستون‌های ' . implode('/', $columns)
                    . " در جدول {$table} پیدا نشد؛ پوشهٔ مرتبط بررسی نشد.";

                continue;
            }

            foreach (DB::table($table)->select($existing)->cursor() as $row) {
                foreach ($existing as $column) {
                    $value = $row->{$column} ?? null;

                    $path = MediaCleaner::normalize(is_string($value) ? $value : null);

                    if ($path !== '') {
                        $paths[$path] = true;
                        $basenames[basename($path)] = true;
                    }
                }
            }
        }

        return [
            'paths' => $paths,
            'basenames' => $basenames,
            'safe' => $safe,
            'warnings' => $warnings,
        ];
    }

    /** زمان آخرین تغییر فایل؛ در خطا `null` (یعنی سن نامشخص → محافظه‌کارانه). */
    private function lastModified(Filesystem $disk, string $file): ?int
    {
        try {
            return $disk->lastModified($file);
        } catch (Throwable) {
            return null;
        }
    }
}
