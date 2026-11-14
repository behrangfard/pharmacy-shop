<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * بازیابی رمز عبور فراموش‌شده.
 *
 * جریان کار: کاربر ایمیل را می‌فرستد، لینک بازیابی (با توکن یک‌بارمصرف) به
 * ایمیل او ارسال می‌شود و در صفحهٔ فرانت‌اند رمز تازه تعیین می‌کند. توکن‌ها
 * در جدول پیش‌فرض `password_reset_tokens` نگهداری می‌شوند و پس از استفاده
 * یا انقضا معتبر نیستند.
 */
class PasswordResetController extends Controller
{
    /**
     * درخواست ارسال لینک بازیابی.
     *
     * پاسخ برای ایمیل ثبت‌شده و ثبت‌نشده یکسان است تا مشخص نشود کدام ایمیل
     * در فروشگاه حساب دارد (جلوگیری از شمارش حساب‌ها).
     */
    public function forgotPassword(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
        ]);

        $email = Str::lower(trim($validated['email']));

        $payload = [
            'success' => true,
            'message' => 'اگر این ایمیل در فروشگاه ثبت شده باشد، لینک بازیابی رمز عبور برای شما ارسال می‌شود.',
        ];

        $user = User::query()->where('email', $email)->first();

        if ($user === null) {
            return response()->json($payload);
        }

        $token = Password::broker()->createToken($user);

        $user->sendPasswordResetNotification($token);

        /*
         * در محیط توسعه معمولاً MAIL_MAILER=log است و ایمیل واقعی ارسال
         * نمی‌شود؛ فقط در حالت debug لینک برای تست برگردانده می‌شود و در
         * production هرگز در پاسخ قرار نمی‌گیرد.
         */
        if (config('app.debug')) {
            $payload['debug_reset_url'] = $this->resetUrl(
                $token,
                (string) $user->email
            );
        }

        return response()->json($payload);
    }

    /**
     * تعیین رمز عبور جدید با توکن دریافتی از ایمیل.
     */
    public function resetPassword(Request $request)
    {
        $request->merge([
            'email' => Str::lower(
                trim((string) $request->input('email'))
            ),
        ]);

        $validated = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $status = Password::reset(
            $validated,
            function (User $user, string $password): void {
                $user->forceFill([
                    'password' => $password,
                    'remember_token' => Str::random(60),
                ])->save();

                // همهٔ نشست‌های قبلی بسته می‌شوند تا دسترسی قدیمی قطع شود.
                $user->tokens()->delete();

                event(new PasswordReset($user));
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'email' => [$this->statusMessage($status)],
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'رمز عبور با موفقیت تغییر کرد. اکنون می‌توانید وارد شوید.',
        ]);
    }

    /**
     * آدرس صفحهٔ تعیین رمز جدید در SPA.
     */
    private function resetUrl(string $token, string $email): string
    {
        $base = rtrim((string) config('app.frontend_url'), '/');

        return $base
            .'/reset-password/'.urlencode($token)
            .'?email='.urlencode($email);
    }

    /**
     * پیام فارسی متناسب با نتیجهٔ Password broker.
     */
    private function statusMessage(string $status): string
    {
        return match ($status) {
            Password::INVALID_TOKEN => 'لینک بازیابی نامعتبر یا منقضی شده است. لطفاً دوباره درخواست دهید.',
            Password::INVALID_USER => 'کاربری با این ایمیل پیدا نشد.',
            Password::RESET_THROTTLED => 'درخواست‌های زیادی ثبت شده است. لطفاً کمی بعد دوباره تلاش کنید.',
            default => 'بازیابی رمز عبور انجام نشد. لطفاً دوباره تلاش کنید.',
        };
    }
}
