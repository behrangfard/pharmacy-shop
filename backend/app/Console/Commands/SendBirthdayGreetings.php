<?php

namespace App\Console\Commands;

use App\Services\Messaging\BirthdayGreetingService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Throwable;

/**
 * ارسال تبریک تولد به مشتریانی که «امروز» تولدشان است (تقویم شمسی).
 *
 * در routes/console.php هر ۱۵ دقیقه اجرا می‌شود و خودِ کامند بررسی می‌کند که
 * تبریک فعال باشد، ساعت تنظیم‌شده در پنل رسیده باشد و امروز تلاشی انجام
 * نشده باشد؛ بنابراین زمان ارسال از پنل مدیریت قابل تغییر است.
 */
class SendBirthdayGreetings extends Command
{
    protected $signature = 'birthday:greetings
                            {--date= : تاریخ میلادی به شکل YYYY-MM-DD (پیش‌فرض: امروز)}
                            {--force : نادیده گرفتن ساعت تنظیم‌شده و ارسال دوباره}
                            {--dry-run : فقط نمایش گیرندگان، بدون ارسال}';

    protected $description = 'ارسال پیام تبریک تولد به مشتریانی که امروز تولدشان است';

    public function handle(BirthdayGreetingService $birthday): int
    {
        $settings = $birthday->settings();

        if (! $settings['enabled'] && ! $this->option('force')) {
            $this->line('تبریک تولد خودکار غیرفعال است؛ از پنل مدیریت فعال کنید.');

            return self::SUCCESS;
        }

        try {
            $date = $this->option('date')
                ? Carbon::parse((string) $this->option('date'))->startOfDay()
                : Carbon::now()->startOfDay();
        } catch (Throwable) {
            $this->error('تاریخ واردشده معتبر نیست. قالب صحیح: YYYY-MM-DD');

            return self::FAILURE;
        }

        if (! $this->option('force') && ! $birthday->shouldRunNow()) {
            return self::SUCCESS;
        }

        if ($this->option('dry-run')) {
            $recipients = $birthday->recipientsForDate($date);

            $this->info(count($recipients) . ' گیرنده برای این تاریخ پیدا شد.');

            foreach ($recipients as $recipient) {
                $this->line(sprintf(' - %s (%s)', $recipient['name'], $recipient['mobile']));
            }

            return self::SUCCESS;
        }

        try {
            $result = $birthday->sendForDate($date, null, (bool) $this->option('force'));
        } catch (Throwable $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $this->info(sprintf(
            'تبریک تولد %s: %d موفق، %d ناموفق، %d ردشده.',
            $result['jalali_label'],
            $result['sent'],
            $result['failed'],
            $result['skipped']
        ));

        return self::SUCCESS;
    }
}
