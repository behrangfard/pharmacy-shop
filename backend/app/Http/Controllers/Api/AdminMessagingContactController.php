<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MessagingContact;
use App\Services\Messaging\ContactImportService;
use App\Support\Spreadsheet\ImportText;
use App\Support\Spreadsheet\TabularFile;
use App\Support\Spreadsheet\XlsxWriter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

/**
 * دفترچهٔ مخاطبین پیام‌رسانی: فهرست، افزودن دستی و ورود گروهی از اکسل/ورد.
 *
 * شماره‌ها همیشه به شکل 09xxxxxxxxx ذخیره می‌شوند تا ارسال پیام و حذف
 * تکراری‌ها قابل اتکا باشد.
 */
class AdminMessagingContactController extends Controller
{
    public function __construct(
        private readonly ContactImportService $import
    ) {
    }

    /**
     * فهرست مخاطبین با جست‌وجو و فیلتر گروه.
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:150'],
            'group' => ['nullable', 'string', 'max:255'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = MessagingContact::query()->latest('id');

        if (! empty($validated['search'])) {
            $search = $validated['search'];

            $query->where(function ($inner) use ($search) {
                $inner->where('name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('group_name', 'like', "%{$search}%");
            });
        }

        if (! empty($validated['group'])) {
            $query->where('group_name', $validated['group']);
        }

        return response()->json([
            'success' => true,
            'data' => $query->paginate($validated['per_page'] ?? 20),
        ]);
    }

    /**
     * گروه‌های موجود با تعداد اعضا (برای فیلتر و انتخاب گیرندگان).
     */
    public function groups(): JsonResponse
    {
        $groups = MessagingContact::query()
            ->whereNotNull('group_name')
            ->where('group_name', '!=', '')
            ->selectRaw('group_name, COUNT(*) as total')
            ->groupBy('group_name')
            ->orderBy('group_name')
            ->get()
            ->map(static fn ($row) => [
                'name' => $row->group_name,
                'count' => (int) $row->total,
            ]);

        return response()->json([
            'success' => true,
            'data' => [
                'groups' => $groups,
                'total' => MessagingContact::query()->count(),
                'active' => MessagingContact::query()->where('is_active', true)->count(),
            ],
        ]);
    }

    /**
     * افزودن یک مخاطب به‌صورت دستی.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:50'],
            'group_name' => ['nullable', 'string', 'max:255'],
            'note' => ['nullable', 'string', 'max:255'],
        ]);

        $phone = ImportText::phone($validated['phone']);

        if ($phone === null) {
            throw ValidationException::withMessages([
                'phone' => 'شماره وارد شده معتبر نیست. نمونهٔ درست: 09121234567',
            ]);
        }

        if (MessagingContact::query()->where('phone', $phone)->exists()) {
            throw ValidationException::withMessages([
                'phone' => 'این شماره قبلاً در دفترچهٔ مخاطبین ثبت شده است.',
            ]);
        }

        $contact = MessagingContact::create([
            'name' => $this->nullIfBlank($validated['name'] ?? null),
            'phone' => $phone,
            'group_name' => $this->nullIfBlank($validated['group_name'] ?? null),
            'note' => $this->nullIfBlank($validated['note'] ?? null),
            'source' => 'manual',
            'is_active' => true,
            'created_by' => $request->user()?->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'مخاطب جدید ذخیره شد.',
            'data' => $contact,
        ], 201);
    }

    private function nullIfBlank(?string $value): ?string
    {
        $value = trim((string) $value);

        return $value === '' ? null : $value;
    }

    /**
     * ویرایش نام، گروه یا یادداشت مخاطب.
     */
    public function update(Request $request, MessagingContact $contact): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'phone' => ['sometimes', 'string', 'max:50'],
            'group_name' => ['nullable', 'string', 'max:255'],
            'note' => ['nullable', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        if (array_key_exists('phone', $validated)) {
            $phone = ImportText::phone($validated['phone']);

            if ($phone === null) {
                throw ValidationException::withMessages([
                    'phone' => 'شماره وارد شده معتبر نیست.',
                ]);
            }

            $duplicate = MessagingContact::query()
                ->where('phone', $phone)
                ->whereKeyNot($contact->id)
                ->exists();

            if ($duplicate) {
                throw ValidationException::withMessages([
                    'phone' => 'این شماره برای مخاطب دیگری ثبت شده است.',
                ]);
            }

            $validated['phone'] = $phone;
        }

        $contact->fill($validated);
        $contact->save();

        return response()->json([
            'success' => true,
            'message' => 'اطلاعات مخاطب به‌روزرسانی شد.',
            'data' => $contact->refresh(),
        ]);
    }

    public function destroy(MessagingContact $contact): JsonResponse
    {
        $contact->delete();

        return response()->json([
            'success' => true,
            'message' => 'مخاطب حذف شد.',
        ]);
    }

    /**
     * حذف گروهی بر اساس شناسه‌ها یا کل یک گروه.
     */
    public function bulkDestroy(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ids' => ['nullable', 'array'],
            'ids.*' => ['integer', 'exists:messaging_contacts,id'],
            'group' => ['nullable', 'string', 'max:255'],
        ]);

        if (empty($validated['ids']) && empty($validated['group'])) {
            throw ValidationException::withMessages([
                'ids' => 'برای حذف گروهی، مخاطبین یا نام گروه را مشخص کنید.',
            ]);
        }

        $query = MessagingContact::query();

        if (! empty($validated['ids'])) {
            $query->whereIn('id', $validated['ids']);
        } else {
            $query->where('group_name', $validated['group']);
        }

        $deleted = $query->delete();

        return response()->json([
            'success' => true,
            'message' => $deleted.' مخاطب حذف شد.',
            'data' => ['deleted' => $deleted],
        ]);
    }

    /**
     * قالب اکسل برای وارد کردن شماره‌ها.
     */
    public function template(): Response
    {
        return XlsxWriter::download([
            [
                'name' => 'مخاطبین',
                'widths' => [26, 18, 20, 28],
                'rows' => [
                    ['نام', 'شماره موبایل', 'گروه', 'یادداشت'],
                    ['مریم احمدی', '09121234567', 'مشتریان VIP', 'خریدار محصولات مراقبت پوست'],
                    ['رضا کریمی', '09351234567', 'باشگاه مشتریان', ''],
                ],
            ],
            [
                'name' => 'راهنما',
                'help' => true,
                'widths' => [110],
                'rows' => [
                    ['راهنمای وارد کردن مخاطبین'],
                    ['۱) ستون «شماره موبایل» ضروری است؛ نام، گروه و یادداشت اختیاری‌اند.'],
                    ['۲) شماره‌ها می‌توانند با +98، 0098 یا بدون صفر وارد شوند؛ هنگام ذخیره به 09xxxxxxxxx تبدیل می‌شوند.'],
                    ['۳) ردیف‌های تکراری (هم در فایل و هم در دفترچهٔ مخاطبین) دوباره ثبت نمی‌شوند.'],
                    ['۴) فایل Word (docx) هم پذیرفته می‌شود؛ هر شماره‌ای که در متن باشد استخراج می‌شود و متن کنار شماره به‌عنوان نام ذخیره می‌شود.'],
                    ['۵) اگر فایل سرصفحه نداشته باشد، همهٔ خانه‌ها برای یافتن شماره بررسی می‌شوند.'],
                    ['۶) حداکثر ۲۰۰۰ شماره در هر بار ورود.'],
                    ['۷) با انتخاب «گروه»، همهٔ شماره‌های این فایل در آن گروه قرار می‌گیرند و بعداً می‌توانید پیام را فقط برای همان گروه بفرستید.'],
                ],
            ],
        ], 'messaging-contacts-template.xlsx');
    }

    /**
     * تحلیل و ثبت فایل ورودی مخاطبین (اکسل، CSV، متن یا Word).
     */
    public function import(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'file' => ['required', 'file', 'max:10240'],
            'dry_run' => ['nullable', 'boolean'],
            'group' => ['nullable', 'string', 'max:255'],
            'update_existing' => ['nullable', 'boolean'],
        ], [
            'file.required' => 'فایل مخاطبین را انتخاب کنید.',
            'file.max' => 'حجم فایل نباید بیشتر از ۱۰ مگابایت باشد.',
        ]);

        $file = $request->file('file');

        if ($file === null) {
            throw ValidationException::withMessages(['file' => 'فایل ارسالی معتبر نیست.']);
        }

        $extension = strtolower($file->getClientOriginalExtension());

        if (! TabularFile::isSupported($extension)) {
            throw ValidationException::withMessages([
                'file' => 'فقط فایل xlsx، csv، txt یا docx قابل قبول است.',
            ]);
        }

        $dryRun = $request->boolean('dry_run', true);
        $group = $this->nullIfBlank($validated['group'] ?? null);

        try {
            if ($extension === 'docx') {
                $report = $this->import->processText(
                    TabularFile::docxText($file->getRealPath()),
                    $group,
                    ! $dryRun,
                    $request->user()?->id
                );
            } else {
                $report = $this->import->process(
                    TabularFile::sheets($file->getRealPath(), $extension),
                    $extension,
                    ! $dryRun,
                    $group,
                    $request->user()?->id,
                    $request->boolean('update_existing', true)
                );
            }
        } catch (ValidationException $exception) {
            throw $exception;
        } catch (Throwable $exception) {
            throw ValidationException::withMessages(['file' => $exception->getMessage()]);
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
        if ($summary['total'] === 0) {
            return 'در این فایل هیچ شمارهٔ معتبری پیدا نشد.';
        }

        if ($dryRun) {
            return 'پیش‌نمایش آماده است: '.$summary['create'].' شمارهٔ جدید و '
                .$summary['update'].' به‌روزرسانی، '.$summary['duplicate'].' تکراری.';
        }

        return 'ثبت انجام شد: '.$summary['create'].' شمارهٔ جدید، '
            .$summary['update'].' به‌روزرسانی و '.$summary['duplicate'].' تکراری نادیده گرفته شد.';
    }
}
