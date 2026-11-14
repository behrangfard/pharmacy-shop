<?php

namespace App\Services\Messaging;

use App\Models\Order;
use App\Models\OutboundMessage;
use App\Models\StoreSetting;
use App\Services\Messaging\Support\PhoneNumber;
use App\Support\OrderStatus;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * پیامک خودکار تغییر وضعیت سفارش.
 *
 * مدیر از پنل «پیام‌رسانی» این اطلاع‌رسانی را فعال یا غیرفعال می‌کند،
 * وضعیت‌های مطلوب را انتخاب می‌کند و متن پیام را با متغیرها می‌نویسد.
 * تنظیمات در جدول store_settings ذخیره می‌شود و ارسال از همان کانال پیامک
 * (کاوه‌نگار / SMS.ir / وب‌سرویس دلخواه) انجام می‌گیرد.
 */
class OrderStatusMessenger
{
    public const SETTING_ENABLED = 'order_status_sms_enabled';

    public const SETTING_STATUSES = 'order_status_sms_statuses';

    public const SETTING_TEMPLATE = 'order_status_sms_template';

    /** متغیرهای قابل استفاده در متن پیام. */
    public const PLACEHOLDERS = [
        '{name}',
        '{order}',
        '{status}',
        '{tracking}',
        '{total}',
        '{store}',
    ];

    public const DEFAULT_TEMPLATE = '{name} عزیز، وضعیت سفارش {order} به «{status}» تغییر کرد.'."\n"
        .'برای پیگیری با {store} در تماس باشید.';

    public function __construct(private readonly MessagingManager $messaging)
    {
    }

    /**
     * تنظیمات فعلی با اعمال مقادیر پیش‌فرض.
     *
     * @return array{enabled: bool, statuses: list<string>, template: string}
     */
    public function settings(): array
    {
        $rawStatuses = (string) StoreSetting::getValue(
            self::SETTING_STATUSES,
            implode(',', OrderStatus::NOTIFIABLE)
        );

        $statuses = [];

        foreach (explode(',', $rawStatuses) as $status) {
            $status = trim($status);

            if (
                $status !== ''
                && OrderStatus::exists($status)
                && ! in_array($status, $statuses, true)
            ) {
                $statuses[] = $status;
            }
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
            'statuses' => $statuses,
            'template' => $template !== '' ? $template : self::DEFAULT_TEMPLATE,
        ];
    }

    /**
     * ذخیرهٔ تنظیمات و برگرداندن نسخهٔ نرمال‌شده.
     *
     * @param  array{enabled?: bool, statuses?: array<int, string>, template?: string}  $data
     * @return array{enabled: bool, statuses: list<string>, template: string}
     */
    public function updateSettings(array $data): array
    {
        if (array_key_exists('enabled', $data)) {
            StoreSetting::setValue(self::SETTING_ENABLED, $data['enabled'] ? '1' : '0');
        }

        if (array_key_exists('statuses', $data)) {
            $statuses = array_values(array_filter(
                array_map(static fn ($status) => trim((string) $status), $data['statuses']),
                static fn (string $status) => OrderStatus::exists($status)
            ));

            StoreSetting::setValue(
                self::SETTING_STATUSES,
                implode(',', array_unique($statuses))
            );
        }

        if (array_key_exists('template', $data)) {
            StoreSetting::setValue(self::SETTING_TEMPLATE, trim((string) $data['template']));
        }

        return $this->settings();
    }

    /**
     * اطلاعات کامل بخش «پیامک خودکار وضعیت سفارش» برای پنل مدیریت.
     *
     * @return array<string, mixed>
     */
    public function overview(): array
    {
        return [
            'settings' => $this->settings(),
            'statuses' => array_map(
                static fn (string $status): array => [
                    'key' => $status,
                    'label' => OrderStatus::label($status),
                ],
                OrderStatus::ALL
            ),
            'placeholders' => self::PLACEHOLDERS,
            'default_template' => self::DEFAULT_TEMPLATE,
            'sms_available' => $this->messaging->isAvailable(OutboundMessage::CHANNEL_SMS),
            'store_name' => (string) StoreSetting::getValue('store_name', 'فروشگاه'),
        ];
    }

    /**
     * ارسال پیامک تغییر وضعیت (در صورت فعال بودن و تنظیم بودن شماره).
     *
     * هیچ خطایی به بیرون پرتاب نمی‌شود؛ تغییر وضعیت سفارش نباید به‌خاطر
     * قطعی سرویس پیامک شکست بخورد.
     */
    public function sendFor(
        Order $order,
        string $status,
        ?int $sentBy = null
    ): ?OutboundMessage {
        $settings = $this->settings();

        if (! $settings['enabled'] || ! in_array($status, $settings['statuses'], true)) {
            return null;
        }

        $recipient = PhoneNumber::normalize((string) $order->phone);

        if ($recipient === '' || ! $this->messaging->isAvailable(OutboundMessage::CHANNEL_SMS)) {
            return null;
        }

        try {
            return $this->messaging->send(
                OutboundMessage::CHANNEL_SMS,
                $recipient,
                $this->render($order, $status),
                [
                    'source' => 'order_status',
                    'order_number' => $order->order_number,
                    'status' => $status,
                ],
                $sentBy,
            );
        } catch (Throwable $exception) {
            Log::warning('ارسال پیامک وضعیت سفارش ناموفق بود.', [
                'order_number' => $order->order_number,
                'status' => $status,
                'error' => $exception->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * جایگذاری متغیرها در قالب پیام.
     */
    public function render(
        Order $order,
        string $status,
        ?string $template = null
    ): string {
        $template ??= $this->settings()['template'];

        $replacements = [
            '{name}' => $this->customerName($order),
            '{order}' => (string) $order->order_number,
            '{status}' => OrderStatus::label($status),
            '{tracking}' => trim((string) ($order->tracking_code ?? '')) !== ''
                ? (string) $order->tracking_code
                : '—',
            '{total}' => number_format((float) $order->total) . ' تومان',
            '{store}' => (string) StoreSetting::getValue('store_name', 'فروشگاه'),
        ];

        return trim(strtr($template, $replacements));
    }

    private function customerName(Order $order): string
    {
        $name = trim((string) $order->recipient_name);

        if ($name === '') {
            return 'مشتری گرامی';
        }

        return trim(explode(' ', $name)[0]);
    }
}
