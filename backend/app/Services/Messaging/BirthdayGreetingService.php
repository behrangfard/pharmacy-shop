<?php

namespace App\Services\Messaging;

use App\Models\BirthdayGreeting;
use App\Models\Order;
use App\Models\OutboundMessage;
use App\Models\StoreSetting;
use App\Models\User;
use App\Services\Messaging\Support\PhoneNumber;
use App\Support\JalaliDate;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use InvalidArgumentException;

/**
 * تبریک تولد خودکار مشتریان.
 *
 * - تنظیمات (فعال بودن، کانال، متن قالب، ساعت ارسال) در جدول store_settings
 *   ذخیره می‌شود تا مدیر بدون دست‌زدن به فایل‌ها آن را تغییر دهد.
 * - تطبیق تولد بر اساس «ماه و روز» تقویم شمسی است، نه میلادی.
 * - هر ارسال در outbound_messages (تاریخچهٔ پیام‌ها) و birthday_greetings
 *   (ضد ارسال تکراری در همان سال شمسی) ثبت می‌شود.
 */
class BirthdayGreetingService
{
    public const SETTING_ENABLED = 'birthday_greeting_enabled';

    public const SETTING_CHANNEL = 'birthday_greeting_channel';

    public const SETTING_TEMPLATE = 'birthday_greeting_template';

    public const SETTING_SEND_TIME = 'birthday_greeting_send_time';

    /** متغیرهای قابل استفاده در متن پیام. */
    public const PLACEHOLDERS = ['{name}', '{first_name}', '{store}', '{date}'];

    public const DEFAULT_TEMPLATE = '{name} عزیز، زادروزت مبارک! 🎂'."\n"
        .'{store} برایت سالی سرشار از سلامتی و شادی آرزو می‌کند.'."\n"
        .'تخفیفات و جشنواره‌های ویژهٔ روز تولد شما در انتظارتان است.';

    public const DEFAULT_SEND_TIME = '10:00';

    /** تعداد روزهای آینده که در پنل به‌عنوان «تولدهای پیش‌رو» نمایش داده می‌شود. */
    public const UPCOMING_DAYS = 7;

    public function __construct(private readonly MessagingManager $messaging)
    {
    }

    /**
     * تنظیمات فعلی تبریک تولد با اعمال مقادیر پیش‌فرض.
     *
     * @return array{enabled: bool, channel: string, template: string, send_time: string}
     */
    public function settings(): array
    {
        $channel = (string) StoreSetting::getValue(
            self::SETTING_CHANNEL,
            OutboundMessage::CHANNEL_SMS
        );

        if (! in_array($channel, OutboundMessage::CHANNELS, true)) {
            $channel = OutboundMessage::CHANNEL_SMS;
        }

        $sendTime = (string) StoreSetting::getValue(
            self::SETTING_SEND_TIME,
            self::DEFAULT_SEND_TIME
        );

        if (! preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $sendTime)) {
            $sendTime = self::DEFAULT_SEND_TIME;
        }

        $template = trim((string) StoreSetting::getValue(
            self::SETTING_TEMPLATE,
            self::DEFAULT_TEMPLATE
        ));

        return [
            'enabled' => filter_var(
                StoreSetting::getValue(self::SETTING_ENABLED, '0'),
                FILTER_VALIDATE_BOOLEAN
            ),
            'channel' => $channel,
            'template' => $template !== '' ? $template : self::DEFAULT_TEMPLATE,
            'send_time' => $sendTime,
        ];
    }

    /**
     * ذخیرهٔ تنظیمات و برگرداندن نسخهٔ نرمال‌شده.
     *
     * @param  array{enabled?: bool, channel?: string, template?: string, send_time?: string}  $data
     * @return array{enabled: bool, channel: string, template: string, send_time: string}
     */
    public function updateSettings(array $data): array
    {
        if (array_key_exists('enabled', $data)) {
            StoreSetting::setValue(self::SETTING_ENABLED, $data['enabled'] ? '1' : '0');
        }

        if (
            array_key_exists('channel', $data)
            && in_array($data['channel'], OutboundMessage::CHANNELS, true)
        ) {
            StoreSetting::setValue(self::SETTING_CHANNEL, (string) $data['channel']);
        }

        if (array_key_exists('template', $data)) {
            StoreSetting::setValue(self::SETTING_TEMPLATE, trim((string) $data['template']));
        }

        if (array_key_exists('send_time', $data)) {
            StoreSetting::setValue(self::SETTING_SEND_TIME, (string) $data['send_time']);
        }

        return $this->settings();
    }

    /**
     * کانال‌های قابل انتخاب برای تبریک تولد.
     *
     * @return list<array{key: string, label: string, available: bool, enabled: bool}>
     */
    public function channelOptions(): array
    {
        $options = [];

        foreach ($this->messaging->channelsStatus() as $channel) {
            $options[] = [
                'key' => (string) $channel['key'],
                'label' => (string) $channel['label'],
                'available' => (bool) $channel['available'],
                'enabled' => (bool) $channel['enabled'],
            ];
        }

        return $options;
    }

    public function storeName(): string
    {
        $name = trim((string) StoreSetting::getValue('store_name', ''));

        return $name !== '' ? $name : 'فروشگاه';
    }

    /**
     * فهرست همهٔ مشتریان دارای تاریخ تولد، با شمارهٔ موبایل قابل استفاده.
     *
     * ترتیب اولویت شماره: شمارهٔ ثبت‌شده در پروفایل ← آخرین شمارهٔ سفارش.
     *
     * @return list<array{
     *     id: int,
     *     name: string,
     *     mobile: string,
     *     mobile_source: string|null,
     *     birth_date: string|null,
     *     jalali: array{jy: int, jm: int, jd: int},
     *     jalali_key: string,
     *     jalali_label: string,
     *     opted_out: bool
     * }>
     */
    public function directory(): array
    {
        $entries = [];

        User::query()
            ->whereNotNull('birth_date')
            ->where('role', 'customer')
            ->orderBy('id')
            ->chunk(500, function (Collection $users) use (&$entries): void {
                /** @var Collection<int, User> $users */
                $missingPhoneIds = $users
                    ->filter(fn (User $user): bool => PhoneNumber::normalize($user->phone) === '')
                    ->pluck('id')
                    ->all();

                $orderPhones = $missingPhoneIds !== []
                    ? $this->latestOrderPhones($missingPhoneIds)
                    : [];

                foreach ($users as $user) {
                    $profilePhone = PhoneNumber::normalize($user->phone);
                    $mobile = $profilePhone !== ''
                        ? $profilePhone
                        : ($orderPhones[$user->id] ?? '');

                    $jalali = JalaliDate::fromDate($user->birth_date);

                    if ($jalali === null) {
                        continue;
                    }

                    $entries[] = [
                        'id' => (int) $user->id,
                        'name' => (string) $user->name,
                        'mobile' => $mobile,
                        'mobile_source' => $profilePhone !== ''
                            ? 'profile'
                            : ($mobile !== '' ? 'order' : null),
                        'birth_date' => $user->birth_date?->format('Y-m-d'),
                        'jalali' => $jalali,
                        'jalali_key' => JalaliDate::key($jalali),
                        'jalali_label' => JalaliDate::label($jalali),
                        'opted_out' => (bool) $user->birthday_greeting_opt_out,
                    ];
                }
            });

        return $entries;
    }

    /**
     * آخرین شمارهٔ تلفن ثبت‌شده در سفارش‌های هر مشتری.
     *
     * @param  list<int>  $userIds
     * @return array<int, string>
     */
    private function latestOrderPhones(array $userIds): array
    {
        return Order::query()
            ->whereIn('user_id', $userIds)
            ->whereNotNull('phone')
            ->where('phone', '!=', '')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get(['user_id', 'phone'])
            ->unique('user_id')
            ->mapWithKeys(fn (Order $order): array => [
                (int) $order->user_id => PhoneNumber::normalize($order->phone),
            ])
            ->filter(fn (string $phone): bool => $phone !== '')
            ->all();
    }

    /**
     * متن قالب را با اطلاعات مشتری پر می‌کند.
     */
    public function render(string $template, User $user, ?Carbon $date = null): string
    {
        $parts = JalaliDate::fromDate($date ?? Carbon::now());
        $pieces = preg_split('/\s+/u', trim((string) $user->name)) ?: [];
        $firstName = $pieces[0] ?? (string) $user->name;

        return str_replace(
            self::PLACEHOLDERS,
            [
                (string) $user->name,
                $firstName,
                $this->storeName(),
                $parts ? JalaliDate::label($parts) : '',
            ],
            $template
        );
    }

    /**
     * پیش‌نمایش قالب با نام یک مشتری نمونه (یا نخستین تولد امروز).
     *
     * @param  array{name?: string}|null  $recipient
     */
    public function preview(string $template, ?array $recipient = null): string
    {
        $user = new User(['name' => $recipient['name'] ?? 'سارا محمدی']);

        return $this->render($template, $user);
    }

    /**
     * داده‌های کامل بخش «تبریک تولد» در پنل مدیریت.
     *
     * @return array<string, mixed>
     */
    public function overview(?Carbon $now = null): array
    {
        $moment = ($now ?? Carbon::now())->copy();
        $settings = $this->settings();
        $directory = $this->directory();
        $todayParts = JalaliDate::fromDate($moment->copy()->startOfDay());
        $todayIso = JalaliDate::iso($todayParts);

        /** @var Collection<int, BirthdayGreeting> $greetings */
        $greetings = BirthdayGreeting::query()
            ->where('jalali_date', $todayIso)
            ->get()
            ->keyBy('user_id');

        $window = [];

        for ($offset = 0; $offset <= self::UPCOMING_DAYS; $offset++) {
            $parts = JalaliDate::fromDate($moment->copy()->startOfDay()->addDays($offset));
            $window[JalaliDate::key($parts)] = $offset;
        }

        $today = [];
        $upcoming = [];

        foreach ($directory as $entry) {
            if (! array_key_exists($entry['jalali_key'], $window)) {
                continue;
            }

            $greeting = $greetings->get($entry['id']);

            $item = [
                'id' => $entry['id'],
                'name' => $entry['name'],
                'mobile' => $entry['mobile'],
                'mobile_source' => $entry['mobile_source'],
                'birth_date' => $entry['birth_date'],
                'jalali_date' => JalaliDate::iso($entry['jalali']),
                'jalali_label' => $entry['jalali_label'],
                'days_until' => $window[$entry['jalali_key']],
                'opted_out' => $entry['opted_out'],
                'status' => $greeting?->status,
                'sent_at' => $greeting?->sent_at?->toIso8601String(),
            ];

            if ($item['days_until'] === 0) {
                $today[] = $item;
            } else {
                $upcoming[] = $item;
            }
        }

        usort(
            $upcoming,
            fn (array $a, array $b): int => [$a['days_until'], $a['name']] <=> [$b['days_until'], $b['name']]
        );

        return [
            'settings' => $settings,
            'channels' => $this->channelOptions(),
            'placeholders' => self::PLACEHOLDERS,
            'default_template' => self::DEFAULT_TEMPLATE,
            'store_name' => $this->storeName(),
            'stats' => [
                'customers' => count($directory),
                'reachable' => count(array_filter(
                    $directory,
                    fn (array $entry): bool => ! $entry['opted_out'] && $entry['mobile'] !== ''
                )),
                'today' => count($today),
                'today_sent' => count(array_filter(
                    $today,
                    fn (array $item): bool => $item['status'] === BirthdayGreeting::STATUS_SENT
                )),
                'upcoming' => count($upcoming),
                'sent_this_year' => BirthdayGreeting::query()
                    ->where('jalali_year', $todayParts['jy'])
                    ->where('status', BirthdayGreeting::STATUS_SENT)
                    ->count(),
            ],
            'today' => $today,
            'upcoming' => $upcoming,
            'preview' => $this->preview($settings['template'], $today[0] ?? null),
            'jalali_today' => JalaliDate::label($todayParts),
        ];
    }

    /**
     * گیرندگان واجد شرایط برای یک تاریخ (تولد همان روز، بدون انصراف و با موبایل).
     *
     * @return list<array{id: int, name: string, mobile: string, mobile_source: string|null, birth_date: string|null, jalali: array{jy: int, jm: int, jd: int}, jalali_key: string, jalali_label: string, opted_out: bool}>
     */
    public function recipientsForDate(Carbon $date): array
    {
        $parts = JalaliDate::fromDate($date->copy()->startOfDay());
        $key = JalaliDate::key($parts);

        return array_values(array_filter(
            $this->directory(),
            fn (array $entry): bool => $entry['jalali_key'] === $key
                && ! $entry['opted_out']
                && $entry['mobile'] !== ''
        ));
    }

    /**
     * آیا برای این تاریخ (شمسی) تلاشی انجام شده است؟
     * حتی تلاش ناموفق هم مانع تکرار خودکار می‌شود تا سرویس پیامک اسپم نشود.
     */
    public function hasRunForDate(Carbon $date): bool
    {
        $parts = JalaliDate::fromDate($date);

        if ($parts === null) {
            return false;
        }

        return BirthdayGreeting::query()
            ->where('jalali_date', JalaliDate::iso($parts))
            ->exists();
    }

    /**
     * شرط اجرای خودکار: فعال باشد، ساعت تنظیم‌شده رسیده باشد و امروز
     * هنوز تلاشی انجام نشده باشد.
     */
    public function shouldRunNow(?Carbon $now = null): bool
    {
        $settings = $this->settings();

        if (! $settings['enabled']) {
            return false;
        }

        $moment = ($now ?? Carbon::now())->copy();
        [$hour, $minute] = array_map('intval', explode(':', $settings['send_time']));

        if (($moment->hour * 60 + $moment->minute) < ($hour * 60 + $minute)) {
            return false;
        }

        return ! $this->hasRunForDate($moment);
    }

    /**
     * ارسال تبریک تولد برای همهٔ مشتریانِ یک تاریخ.
     *
     * @return array<string, mixed>
     *
     * @throws InvalidArgumentException وقتی کانال انتخاب‌شده فعال/تنظیم‌شده نیست.
     */
    public function sendForDate(Carbon $date, ?int $sentBy = null, bool $force = false): array
    {
        $settings = $this->settings();
        $channel = $settings['channel'];

        if (! $this->messaging->isAvailable($channel)) {
            throw new InvalidArgumentException(
                'کانال انتخاب‌شده برای تبریک تولد فعال یا تنظیم نشده است.'
            );
        }

        $target = $date->copy()->startOfDay();
        $parts = JalaliDate::fromDate($target);
        $jalaliDate = JalaliDate::iso($parts);
        $jalaliYear = $parts['jy'];
        $recipients = $this->recipientsForDate($target);

        $alreadySentIds = BirthdayGreeting::query()
            ->whereIn('user_id', array_column($recipients, 'id'))
            ->where('jalali_date', $jalaliDate)
            ->where('status', BirthdayGreeting::STATUS_SENT)
            ->pluck('user_id')
            ->all();

        $sent = 0;
        $failed = 0;
        $skipped = 0;
        $results = [];

        foreach ($recipients as $recipient) {
            if (! $force && in_array($recipient['id'], $alreadySentIds, true)) {
                $skipped++;

                continue;
            }

            $user = User::query()->find($recipient['id']);

            if (! $user) {
                $skipped++;

                continue;
            }

            $body = $this->render($settings['template'], $user, $target);

            $message = $this->messaging->send(
                $channel,
                $recipient['mobile'],
                $body,
                ['source' => 'birthday'],
                $sentBy
            );

            $status = $message->status === OutboundMessage::STATUS_SENT
                ? BirthdayGreeting::STATUS_SENT
                : BirthdayGreeting::STATUS_FAILED;

            $status === BirthdayGreeting::STATUS_SENT ? $sent++ : $failed++;

            BirthdayGreeting::query()->updateOrCreate(
                ['user_id' => $user->id, 'jalali_year' => $jalaliYear],
                [
                    'jalali_date' => $jalaliDate,
                    'channel' => $channel,
                    'recipient' => $recipient['mobile'],
                    'body' => $body,
                    'status' => $status,
                    'provider_message_id' => $message->provider_message_id,
                    'error' => $message->error,
                    'outbound_message_id' => $message->id,
                    'sent_at' => $message->sent_at ?? Carbon::now(),
                ]
            );

            $results[] = [
                'user_id' => $user->id,
                'name' => $user->name,
                'mobile' => $recipient['mobile'],
                'status' => $message->status,
                'error' => $message->error,
            ];
        }

        return [
            'jalali_date' => $jalaliDate,
            'jalali_label' => JalaliDate::label($parts),
            'channel' => $channel,
            'total' => count($recipients),
            'sent' => $sent,
            'failed' => $failed,
            'skipped' => $skipped,
            'results' => $results,
        ];
    }
}
