<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\ResetPassword as BaseResetPassword;
use Illuminate\Notifications\Messages\MailMessage;

/**
 * ایمیل فارسی بازیابی رمز عبور.
 *
 * لینک ایمیل به صفحهٔ SPA (نه API) اشاره می‌کند تا کاربر فرم تعیین رمز جدید
 * را ببیند. آدرس پایه از `config('app.frontend_url')` خوانده می‌شود.
 */
class ResetPasswordNotification extends BaseResetPassword
{
    public function toMail($notifiable): MailMessage
    {
        $email = (string) $notifiable->getEmailForPasswordReset();

        $url = rtrim((string) config('app.frontend_url'), '/')
            .'/reset-password/'.urlencode($this->token)
            .'?email='.urlencode($email);

        $broker = (string) config('auth.defaults.passwords');
        $expire = (int) config(
            'auth.passwords.'.$broker.'.expire',
            60
        );

        return (new MailMessage())
            ->subject('بازیابی رمز عبور — '.config('app.name'))
            ->greeting('سلام '.$notifiable->name.'!')
            ->line('برای حساب شما در فروشگاه درخواست بازیابی رمز عبور ثبت شده است.')
            ->action('تعیین رمز عبور جدید', $url)
            ->line("این لینک تا {$expire} دقیقه معتبر است و فقط یک بار قابل استفاده است.")
            ->line('اگر این درخواست را شما نداده‌اید، نیازی به اقدام نیست؛ رمز عبور فعلی تغییر نمی‌کند.');
    }
}
