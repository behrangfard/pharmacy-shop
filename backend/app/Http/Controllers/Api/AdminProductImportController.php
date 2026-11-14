<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Products\ProductImportService;
use App\Support\Spreadsheet\TabularFile;
use App\Support\Spreadsheet\XlsxWriter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

/**
 * ورود گروهی محصولات از فایل اکسل / CSV.
 *
 * جریان کار دو مرحله‌ای است: ابتدا فایل با dry_run=1 تحلیل و پیش‌نمایش
 * می‌شود (هیچ تغییری در دیتابیس رخ نمی‌دهد) و سپس با dry_run=0 همان فایل
 * ثبت می‌شود.
 */
class AdminProductImportController extends Controller
{
    public function __construct(
        private readonly ProductImportService $import
    ) {
    }

    /**
     * دانلود قالب خالی اکسل با شیت‌های «محصولات»، «تنوع‌ها» و «راهنما».
     */
    public function template(): Response
    {
        return XlsxWriter::download($this->templateSheets(), 'product-import-template.xlsx');
    }

    /**
     * تحلیل (و در صورت درخواست، ثبت) فایل ارسالی.
     */
    public function import(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'max:10240'],
            'dry_run' => ['nullable', 'boolean'],
            'create_missing' => ['nullable', 'boolean'],
            'update_existing' => ['nullable', 'boolean'],
        ], [
            'file.required' => 'فایل اکسل محصولات را انتخاب کنید.',
            'file.max' => 'حجم فایل نباید بیشتر از ۱۰ مگابایت باشد.',
        ]);

        $file = $request->file('file');

        if ($file === null) {
            throw ValidationException::withMessages([
                'file' => 'فایل ارسالی معتبر نیست.',
            ]);
        }

        $extension = strtolower($file->getClientOriginalExtension());

        if (! in_array($extension, ['xlsx', 'csv', 'txt'], true)) {
            throw ValidationException::withMessages([
                'file' => 'فقط فایل xlsx، csv یا txt قابل قبول است. اگر فایل شما xls قدیمی است، آن را با Excel به xlsx ذخیره کنید.',
            ]);
        }

        $dryRun = $request->boolean('dry_run', true);

        try {
            $sheets = TabularFile::sheets($file->getRealPath(), $extension);

            $report = $this->import->process(
                $sheets,
                ! $dryRun,
                $request->boolean('create_missing', true),
                $request->boolean('update_existing', true)
            );
        } catch (ValidationException $exception) {
            throw $exception;
        } catch (Throwable $exception) {
            throw ValidationException::withMessages([
                'file' => $exception->getMessage(),
            ]);
        }

        $summary = $report['summary'];

        return response()->json([
            'success' => $summary['errors'] === 0,
            'message' => $this->message($summary, $dryRun),
            'data' => $report + ['dry_run' => $dryRun],
        ]);
    }

    /**
     * @param  array<string, int>  $summary
     */
    private function message(array $summary, bool $dryRun): string
    {
        if ($summary['errors'] > 0) {
            return 'این فایل '.$summary['errors'].' ردیف مشکل‌دار دارد؛ تا رفع خطاها چیزی ثبت نمی‌شود.';
        }

        $variants = $summary['variants_create'] + $summary['variants_update'];

        if ($dryRun) {
            return 'پیش‌نمایش آماده است: '.$summary['products_create'].' محصول جدید، '
                .$summary['products_update'].' به‌روزرسانی و '.$variants.' تنوع.';
        }

        return 'ورود محصولات انجام شد: '.$summary['products_create'].' محصول جدید، '
            .$summary['products_update'].' به‌روزرسانی، '.$summary['variants_create']
            .' تنوع جدید و '.$summary['variants_update'].' تنوع به‌روزشده.';
    }

    /**
     * @return list<array{name: string, rows: list<list<mixed>>, widths?: list<int>, help?: bool}>
     */
    private function templateSheets(): array
    {
        $guidelines = [
            'راهنمای ورود گروهی محصولات',
            '۱) ستون‌های شیت «محصولات» را جابه‌جا یا حذف نکنید؛ فقط ردیف‌ها را پر کنید.',
            '۲) ستون‌های ضروری: نام محصول، کد محصول (یکتا)، دسته‌بندی و قیمت.',
            '۳) ردیف‌های نمونه را پاک کنید یا با محصولات واقعی خود جایگزین کنید.',
            '۴) اگر دسته‌بندی یا برند در سایت نباشد، هنگام ثبت به‌صورت خودکار ساخته می‌شود.',
            '۵) محصولات بر اساس «کد محصول» شناخته می‌شوند؛ کد تکراری باعث ساخت محصول تکراری نمی‌شود و همان محصول به‌روزرسانی می‌شود.',
            '۶) ستون‌های «فعال»، «ویژه»، «جدید»، «مشمول مالیات» و «قابل مرجوع» را با بله/خیر پر کنید.',
            '۷) شیت «تنوع‌ها» اختیاری است؛ برای محصولات رنگ/سایزدار استفاده می‌شود و با «کد محصول» به محصول اصلی وصل می‌شود.',
            '۸) قیمت را بدون واحد بنویسید؛ جداکنندهٔ هزارگان هم قبول است. مثال: 185,000',
            '۹) عدد موجودی در هر بار ورود جایگزین موجودی فعلی می‌شود؛ برای افزودن موجودی از فاکتور خرید در بخش حسابداری استفاده کنید.',
            '۱۰) تصویر محصول را با آدرس کامل (https://...) یا مسیر فایل در سایت وارد کنید؛ خالی‌بودن آن مشکلی ندارد.',
            '۱۱) حداکثر ۲۰۰۰ ردیف در هر بار ورود؛ فایل‌های بزرگ‌تر را به چند بخش تقسیم کنید.',
            '۱۲) فایل CSV ذخیره‌شده از اکسل (Save as CSV) هم پذیرفته می‌شود.',
        ];

        return [
            [
                'name' => ProductImportService::SHEET_PRODUCTS,
                'widths' => [32, 16, 18, 16, 14, 18, 12, 10, 12, 30, 40, 24, 9, 9, 9, 14, 13, 24, 30],
                'rows' => [
                    [
                        'نام محصول', 'کد محصول', 'دسته‌بندی', 'برند', 'قیمت',
                        'قیمت قبل از تخفیف', 'درصد تخفیف', 'موجودی', 'وزن (گرم)',
                        'توضیح کوتاه', 'توضیحات', 'آدرس تصویر', 'فعال', 'ویژه',
                        'جدید', 'مشمول مالیات', 'قابل مرجوع', 'عنوان سئو', 'توضیح سئو',
                    ],
                    [
                        'شامپو تقویت‌کنندهٔ مو', 'SH-1001', 'مراقبت از مو', 'نمونه',
                        185000, 220000, 16, 25, 400,
                        'مناسب موی ریزشی و شکننده', 'توضیحات کامل محصول را اینجا بنویسید.',
                        '', 'بله', 'خیر', 'بله', 'خیر', 'بله',
                        'خرید شامپو تقویت‌کنندهٔ مو', 'شامپوی تقویت‌کننده با فرمول ملایم',
                    ],
                    [
                        'کرم ضد آفتاب SPF 50', 'CR-2001', 'مراقبت از پوست', '',
                        320000, '', 0, 12, 50,
                        'محافظت بالا در برابر آفتاب', '', '', 'بله', 'خیر', 'خیر',
                        'بله', 'بله', '', '',
                    ],
                ],
            ],
            [
                'name' => ProductImportService::SHEET_VARIANTS,
                'widths' => [16, 18, 26, 12, 14, 18, 10, 9],
                'rows' => [
                    [
                        'کد محصول', 'کد تنوع', 'نام تنوع', 'سایز', 'قیمت',
                        'قیمت قبل از تخفیف', 'موجودی', 'فعال',
                    ],
                    ['SH-1001', 'SH-1001-400', 'شامپو ۴۰۰ میلی‌لیتر', '400', 185000, 220000, 10, 'بله'],
                ],
            ],
            [
                'name' => 'راهنما',
                'help' => true,
                'widths' => [110],
                'rows' => array_map(static fn (string $line) => [$line], $guidelines),
            ],
        ];
    }
}
